-- Events: ingested from UniFi API (deduplicated by unifi_id)
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  unifi_id    TEXT    UNIQUE,
  timestamp   INTEGER NOT NULL,
  level       TEXT    NOT NULL,
  source      TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  device      TEXT    DEFAULT '',
  ip          TEXT    DEFAULT '',
  dst_ip      TEXT    DEFAULT '',
  dst_port    INTEGER,
  proto       TEXT    DEFAULT '',
  raw         TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_level     ON events(level);

-- Periodic client state snapshots
CREATE TABLE IF NOT EXISTS client_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at INTEGER NOT NULL,
  mac         TEXT    NOT NULL,
  name        TEXT,
  ip          TEXT,
  zone        TEXT,
  vlan        INTEGER,
  status      TEXT    NOT NULL,
  rx_bytes    INTEGER DEFAULT 0,
  tx_bytes    INTEGER DEFAULT 0,
  signal      INTEGER,
  oui         TEXT    DEFAULT '',
  category    TEXT    DEFAULT 'unknown'
);
CREATE INDEX IF NOT EXISTS idx_client_snaps_at  ON client_snapshots(captured_at);
CREATE INDEX IF NOT EXISTS idx_client_snaps_mac ON client_snapshots(mac);

-- Periodic device state snapshots
CREATE TABLE IF NOT EXISTS device_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at INTEGER NOT NULL,
  mac         TEXT    NOT NULL,
  name        TEXT,
  ip          TEXT,
  model       TEXT    DEFAULT '',
  type        TEXT    DEFAULT '',
  status      TEXT    NOT NULL,
  clients     INTEGER DEFAULT 0,
  uptime      INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_device_snaps_at ON device_snapshots(captured_at);

-- 1-minute resolution time-series metrics
CREATE TABLE IF NOT EXISTS metrics (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket             INTEGER NOT NULL,
  rx_bytes_per_sec   REAL    DEFAULT 0,
  tx_bytes_per_sec   REAL    DEFAULT 0,
  active_clients     INTEGER DEFAULT 0,
  active_devices     INTEGER DEFAULT 0,
  firewall_rules     INTEGER DEFAULT 0,
  threat_count       INTEGER DEFAULT 0,
  wan_status         TEXT    DEFAULT 'unknown'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_bucket ON metrics(bucket);

-- Audit log for firewall toggle and config changes
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp   INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  action      TEXT    NOT NULL,
  entity_type TEXT    NOT NULL,
  entity_id   TEXT,
  entity_name TEXT,
  old_value   TEXT,
  new_value   TEXT,
  user_ip     TEXT    DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

-- All-time device registry for new-device detection
CREATE TABLE IF NOT EXISTS known_devices (
  mac         TEXT    PRIMARY KEY,
  first_seen  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  name        TEXT    DEFAULT '',
  ip          TEXT    DEFAULT '',
  oui         TEXT    DEFAULT '',
  category    TEXT    DEFAULT 'unknown',
  notified    INTEGER NOT NULL DEFAULT 0
);

-- In-app notifications (new device, threats, etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  type        TEXT    NOT NULL,
  severity    TEXT    NOT NULL DEFAULT 'info',
  title       TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  entity_id   TEXT,
  read        INTEGER NOT NULL DEFAULT 0,
  read_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_notif_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_read       ON notifications(read);

-- Key-value settings store
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT    PRIMARY KEY,
  value      TEXT    NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- Default retention settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('events_retention_days',    '30'),
  ('metrics_retention_days',   '90'),
  ('snapshots_retention_days', '14'),
  ('anonymize_after_days',     '0');
