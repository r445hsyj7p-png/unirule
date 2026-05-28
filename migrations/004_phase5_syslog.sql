-- Phase 5: Syslog receiver settings
-- syslog_enabled=0 means the UDP/TCP listener is NOT started automatically.
-- The user starts it from Integrations → Syslog and the setting is then
-- persisted so the listener restarts automatically on the next server boot.

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('syslog_enabled', '0'),
  ('syslog_port',    '514'),
  ('syslog_proto',   'udp');
