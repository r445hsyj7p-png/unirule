-- Phase 3: enriched device registry + policy persistence

-- Enrich known_devices with trust/flag/notes fields
ALTER TABLE known_devices ADD COLUMN trusted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE known_devices ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE known_devices ADD COLUMN notes   TEXT;

-- Policy suggestions and approvals store
CREATE TABLE IF NOT EXISTS policies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT,
  rule_syntax TEXT,
  status      TEXT    NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  severity    TEXT    NOT NULL DEFAULT 'medium',    -- low | medium | high | critical
  effort      TEXT    NOT NULL DEFAULT 'low',       -- low | medium | high
  entity_ids  TEXT,                                 -- JSON array of affected entity IDs
  source      TEXT,                                 -- 'advisor' | 'manual'
  created_at  INTEGER NOT NULL DEFAULT 0,
  updated_at  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
