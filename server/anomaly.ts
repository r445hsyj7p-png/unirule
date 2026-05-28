/**
 * Anomaly detection & device risk scoring.
 *
 * Three steps, each run every 5 minutes:
 *
 *   1. updateBaselines   — recalculate per-device traffic baselines
 *                          (rolling mean + stddev over the last 7 days of
 *                          client_snapshots).
 *
 *   2. detectAnomalies   — compare each device's latest snapshot to its
 *                          baseline; flag as anomaly when |z| > threshold.
 *
 *   3. updateRiskScores  — reset known_devices.risk_score then re-derive
 *                          it from anomalies detected in the last 24 h.
 */
import { getDb, getSetting, getSettingInt } from './db.js'

// ── Statistical helpers ───────────────────────────────────────────────────────

function meanAndStddev(values: number[]): { mean: number; stddev: number } {
  if (!values.length) return { mean: 0, stddev: 0 }
  const mean     = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return { mean, stddev: Math.sqrt(variance) }
}

// ── Step 1: baseline recalculation ───────────────────────────────────────────

function updateBaselines(db: ReturnType<typeof getDb>): void {
  const cutoff = Date.now() - 7 * 86_400_000

  const macs = db.prepare(
    'SELECT DISTINCT mac FROM client_snapshots WHERE captured_at > ?',
  ).all(cutoff) as Array<{ mac: string }>

  const upsert = db.prepare(`
    INSERT INTO device_baselines (mac, metric, avg, stddev, sample_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(mac, metric) DO UPDATE SET
      avg          = excluded.avg,
      stddev       = excluded.stddev,
      sample_count = excluded.sample_count,
      updated_at   = excluded.updated_at
  `)

  const now = Date.now()

  db.transaction(() => {
    for (const { mac } of macs) {
      const rows = db.prepare(
        'SELECT rx_bytes, tx_bytes FROM client_snapshots WHERE mac = ? AND captured_at > ? ORDER BY captured_at',
      ).all(mac, cutoff) as Array<{ rx_bytes: number; tx_bytes: number }>

      if (rows.length < 3) continue   // too few points for a reliable baseline

      for (const metric of ['rx_bytes', 'tx_bytes'] as const) {
        const { mean, stddev } = meanAndStddev(rows.map(r => r[metric]))
        upsert.run(mac, metric, mean, stddev, rows.length, now)
      }
    }
  })()
}

// ── Step 2: anomaly detection ─────────────────────────────────────────────────

function detectAnomalies(db: ReturnType<typeof getDb>): void {
  if (getSetting('anomaly_enabled', '1') !== '1') return

  const minSamples = getSettingInt('anomaly_min_samples', 10)
  const zThreshold = parseFloat(getSetting('anomaly_z_threshold', '3')) || 3

  // Most-recent snapshot per device (within the last 10 minutes)
  const latestSnaps = db.prepare(`
    SELECT mac, rx_bytes, tx_bytes, captured_at
    FROM client_snapshots
    WHERE captured_at = (
      SELECT MAX(captured_at) FROM client_snapshots cs2 WHERE cs2.mac = client_snapshots.mac
    )
    GROUP BY mac
  `).all() as Array<{ mac: string; rx_bytes: number; tx_bytes: number; captured_at: number }>

  const insertAnomaly = db.prepare(`
    INSERT INTO anomalies
      (detected_at, mac, metric, observed, expected_avg, expected_std, z_score, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const now = Date.now()
  const staleThreshold = 10 * 60_000   // ignore snapshots older than 10 min

  db.transaction(() => {
    for (const snap of latestSnaps) {
      if (now - snap.captured_at > staleThreshold) continue

      for (const metric of ['rx_bytes', 'tx_bytes'] as const) {
        const baseline = db.prepare(
          'SELECT avg, stddev, sample_count FROM device_baselines WHERE mac = ? AND metric = ?',
        ).get(snap.mac, metric) as
          | { avg: number; stddev: number; sample_count: number }
          | undefined

        if (!baseline || baseline.sample_count < minSamples) continue
        // Skip near-constant low-traffic devices where any variation looks like 100σ
        if (baseline.stddev < 1024) continue

        const observed = snap[metric]
        const zScore   = (observed - baseline.avg) / baseline.stddev

        if (Math.abs(zScore) <= zThreshold) continue

        const severity = Math.abs(zScore) > 5 ? 'critical' : Math.abs(zScore) > 4 ? 'high' : 'medium'
        insertAnomaly.run(
          now, snap.mac, metric,
          observed, baseline.avg, baseline.stddev,
          zScore, severity,
        )
      }
    }
  })()
}

// ── Step 3: risk score update ─────────────────────────────────────────────────

function updateRiskScores(db: ReturnType<typeof getDb>): void {
  const cutoff = Date.now() - 24 * 3_600_000

  // Aggregate anomaly contribution per device over the last 24 h
  const rows = db.prepare(`
    SELECT
      mac,
      COUNT(*)  AS total,
      MAX(detected_at) AS last_anomaly,
      SUM(
        CASE severity
          WHEN 'critical' THEN 40
          WHEN 'high'     THEN 20
          ELSE                 10
        END
      ) AS score_contrib
    FROM anomalies
    WHERE detected_at > ?
    GROUP BY mac
  `).all(cutoff) as Array<{
    mac: string; total: number; last_anomaly: number; score_contrib: number
  }>

  const updateDevice = db.prepare(`
    UPDATE known_devices
    SET risk_score = ?, anomaly_count = ?, last_anomaly = ?
    WHERE mac = ?
  `)

  db.transaction(() => {
    // Reset all scores to 0 first so devices with no recent anomalies get cleared
    db.prepare('UPDATE known_devices SET risk_score = 0, anomaly_count = 0').run()

    for (const row of rows) {
      updateDevice.run(
        Math.min(100, row.score_contrib),
        row.total,
        row.last_anomaly,
        row.mac,
      )
    }
  })()
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runAnomalyDetection(): Promise<void> {
  const db = getDb()
  updateBaselines(db)
  detectAnomalies(db)
  updateRiskScores(db)
}

// ── Anomaly query helpers (used by REST handlers) ─────────────────────────────

export interface AnomalyRow {
  id:          number
  detectedAt:  number
  mac:         string
  metric:      string
  observed:    number
  expectedAvg: number
  expectedStd: number
  zScore:      number
  severity:    string
}

export function getRecentAnomalies(limit = 100): AnomalyRow[] {
  return (getDb().prepare(`
    SELECT
      id, detected_at AS detectedAt, mac, metric,
      observed, expected_avg AS expectedAvg, expected_std AS expectedStd,
      z_score AS zScore, severity
    FROM anomalies
    ORDER BY detected_at DESC
    LIMIT ?
  `).all(limit) as AnomalyRow[])
}
