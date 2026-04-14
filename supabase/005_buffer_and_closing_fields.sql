-- 005: Add buffer metadata + closing fields
-- Buffer fields were only stored in localStorage; this persists them to Postgres.

-- Commitments: buffer metadata + closing
ALTER TABLE commitments
  ADD COLUMN IF NOT EXISTS buffer_project TEXT REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS buffer_type TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buffer_stage TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS buffer_duration INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS buffer_outcome TEXT,
  ADD COLUMN IF NOT EXISTS buffer_carry_to DATE,
  ADD COLUMN IF NOT EXISTS buffer_blocked_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS depri_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Commitment items: closing-phase fields
ALTER TABLE commitment_items
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS carry_to DATE,
  ADD COLUMN IF NOT EXISTS weeks_remaining INT,
  ADD COLUMN IF NOT EXISTS carried_from TEXT NOT NULL DEFAULT '';
