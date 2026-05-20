-- 015: Add priority, complexity, blocker fields to projects;
--      create project_links table; add role to project_members;
--      seed phase_duration_defaults in app_settings.

-- ── New columns on projects ─────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'P2'
    CHECK (priority IN ('P0','P1','P2','P3')),
  ADD COLUMN IF NOT EXISTS complexity TEXT
    CHECK (complexity IN ('S','M','L','XL')),
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phase_duration_overrides JSONB;

CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects (priority);
CREATE INDEX IF NOT EXISTS idx_projects_is_blocked ON projects (is_blocked) WHERE is_blocked = true;

-- ── Project links ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('prd','figma','qa_testcases','custom')),
  label TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_links_project ON project_links (project_id);

ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_links_select" ON project_links
  FOR SELECT USING (true);

CREATE POLICY "project_links_insert" ON project_links
  FOR INSERT WITH CHECK (true);

CREATE POLICY "project_links_update" ON project_links
  FOR UPDATE USING (true);

CREATE POLICY "project_links_delete" ON project_links
  FOR DELETE USING (true);

-- Enable realtime on project_links
ALTER PUBLICATION supabase_realtime ADD TABLE project_links;

-- ── Member roles ────────────────────────────────────────────────
ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'
    CHECK (role IN ('pm','designer','engineer_lead','qa','member','custom'));

-- ── Phase duration defaults ─────────────────────────────────────
INSERT INTO app_settings (key, value)
VALUES (
  'phase_duration_defaults',
  '{"PRD":14,"Design":21,"Dev":28,"QA":14,"Alpha":7,"Beta":14,"GA":null}'
)
ON CONFLICT (key) DO NOTHING;
