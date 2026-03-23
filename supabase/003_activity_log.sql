-- ============================================
-- FLOW: Activity Log Table
-- Run this in Supabase SQL Editor
-- ============================================

-- 9. ACTIVITY LOG
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL DEFAULT 'anonymous',
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast queries on the logs view
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON activity_log(action);
CREATE INDEX idx_activity_log_user ON activity_log(user_email);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all logs
CREATE POLICY "Allow public read" ON activity_log FOR SELECT USING (true);

-- Allow authenticated users to insert logs
CREATE POLICY "Allow public insert" ON activity_log FOR INSERT WITH CHECK (true);

-- Enable realtime so LogsView gets live updates
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
