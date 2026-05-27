-- Phase 4: security policy settings + notification preferences
-- Seeds default values; existing rows are left untouched (INSERT OR IGNORE).

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('sec_default_deny',         '1'),   -- Zero Trust: block all non-allowed connections
  ('sec_lateral_movement',     '1'),   -- Detect anomalous East-West traffic
  ('sec_auto_policy',          '1'),   -- Automatically suggest policy changes
  ('sec_iot_quarantine',       '0'),   -- Auto-isolate suspicious IoT devices

  ('notif_critical_immediate', '1'),   -- Email + Push for severity=critical
  ('notif_daily_digest',       '1'),   -- 08:00 daily digest of open alerts
  ('notif_new_devices',        '0'),   -- Alert on unknown MAC discovery
  ('notif_policy_approvals',   '1');   -- Alert when new policy recommendations arrive
