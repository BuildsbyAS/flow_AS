-- ============================================
-- TEMPORARY RLS policies — allow all reads/writes
-- These will be replaced with proper auth-based
-- policies when we add Google SSO.
-- Run this in Supabase SQL Editor.
-- ============================================

-- Enable RLS on all tables (required for policies to work)
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_history ENABLE ROW LEVEL SECURITY;

-- Allow all reads (SELECT) for all users
CREATE POLICY "Allow public read" ON squads FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON roles FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON people FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON weeks FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON commitments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON commitment_items FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON project_history FOR SELECT USING (true);

-- Allow all writes (INSERT, UPDATE, DELETE) for now
CREATE POLICY "Allow public insert" ON squads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON squads FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON roles FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON people FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON people FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON projects FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON weeks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON weeks FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON commitments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON commitments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON commitments FOR DELETE USING (true);
CREATE POLICY "Allow public insert" ON commitment_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON commitment_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON commitment_items FOR DELETE USING (true);
CREATE POLICY "Allow public insert" ON project_history FOR INSERT WITH CHECK (true);
