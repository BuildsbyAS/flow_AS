-- ============================================
-- FLOW: Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. SQUADS
CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ROLES
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PEOPLE
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PROJECTS
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES people(id),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'PRD',
  ship BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  health TEXT DEFAULT 'on_track',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. WEEKS
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  start_date DATE NOT NULL UNIQUE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'declare',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. COMMITMENTS
CREATE TABLE commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  buffer TEXT,
  deselected INT DEFAULT -1,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id, week_id)
);

-- 7. COMMITMENT ITEMS
CREATE TABLE commitment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  slot INT NOT NULL,
  project_id TEXT REFERENCES projects(id),
  type TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  duration INT,
  outcome TEXT,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PROJECT HISTORY
CREATE TABLE project_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES for fast queries
-- ============================================
CREATE INDEX idx_people_squad ON people(squad_id);
CREATE INDEX idx_people_role ON people(role_id);
CREATE INDEX idx_projects_squad ON projects(squad_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_commitments_person ON commitments(person_id);
CREATE INDEX idx_commitments_week ON commitments(week_id);
CREATE INDEX idx_commitment_items_commitment ON commitment_items(commitment_id);
CREATE INDEX idx_commitment_items_project ON commitment_items(project_id);
CREATE INDEX idx_project_history_project ON project_history(project_id);
CREATE INDEX idx_project_history_week ON project_history(week_id);

-- ============================================
-- AUTO-UPDATE updated_at on changes
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_commitments_updated_at
  BEFORE UPDATE ON commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_commitment_items_updated_at
  BEFORE UPDATE ON commitment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ENABLE REALTIME on key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE commitments;
ALTER PUBLICATION supabase_realtime ADD TABLE commitment_items;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE weeks;
