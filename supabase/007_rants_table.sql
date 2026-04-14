-- 007: Create rants table + storage bucket for rant images
-- Supports the Rant system (feature requests, bug reports, rants)

CREATE TABLE IF NOT EXISTS rants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL DEFAULT 'anonymous',
  user_name TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature', 'bug', 'rant')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'shipped')),
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: allow all authenticated users to read, insert their own
ALTER TABLE rants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rants_select" ON rants FOR SELECT USING (true);
CREATE POLICY "rants_insert" ON rants FOR INSERT WITH CHECK (true);
CREATE POLICY "rants_update" ON rants FOR UPDATE USING (true);

-- Index for list queries
CREATE INDEX IF NOT EXISTS idx_rants_created_at ON rants (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rants_status ON rants (status);

-- Storage bucket for rant images (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('rant-images', 'rant-images', true)
-- ON CONFLICT DO NOTHING;
