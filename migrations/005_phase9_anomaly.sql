-- Phase 9: Anomaly detection baselines and device risk scoring

-- Per-device, per-metric rolling baseline (mean + stddev over 7 days)
CREATE TABLE IF NOT EXISTS device_baselines (
  mac          TEXT    NOT NULL,
  metric       TEXT    NOT NULL,  -- 'rx_bytes' | 'tx_bytes'
  avg          REAL    NOT NULL DEFAULT 0,
  stddev       REAL    NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  updated_at   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (mac, metric)
);

-- Individual anomaly events
CREATE TABLE IF NOT EXISTS anomalies (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  detected_at  INTEGER NOT NULL,
  mac          TEXT    NOT NULL,
  metric       TEXT    NOT NULL,
  observed     REAL    NOT NULL,
  expected_avg REAL    NOT NULL,
  expected_std REAL    NOT NULL,
  z_score      REAL    NOT NULL,
  severity     TEXT    NOT NULL DEFAULT 'medium'  -- 'medium'|'high'|'critical'
);

CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_mac         ON anomalies (mac);

-- Risk score columns on known_devices (added as new columns to existing table)
-- SQLite allows ADD COLUMN with a constant DEFAULT on non-empty tables.
ALTER TABLE known_devices ADD COLUMN risk_score    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE known_devices ADD COLUMN anomaly_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE known_devices ADD COLUMN last_anomaly  INTEGER;

-- Anomaly detection feature settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('anomaly_enabled',      '1'),
  ('anomaly_z_threshold',  '3'),   -- z-score threshold (σ) before flagging
  ('anomaly_min_samples',  '10');  -- minimum samples needed before detection starts
