-- ============================================
-- Restrict Flow to @noon.com accounts only.
-- Two layers of defense:
--   1. Trigger on auth.users: blocks non-noon signups.
--   2. RLS policies: every read/write requires a @noon.com JWT.
-- Run in Supabase SQL Editor.
-- ============================================

-- ── 1. Helper: is the current JWT a @noon.com user? ──
CREATE OR REPLACE FUNCTION public.is_noon_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@noon.com'
$$;

GRANT EXECUTE ON FUNCTION public.is_noon_user() TO anon, authenticated;

-- ── 2. Block non-noon.com signups at the auth layer ──
CREATE OR REPLACE FUNCTION public.enforce_noon_email_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR lower(NEW.email) NOT LIKE '%@noon.com' THEN
    RAISE EXCEPTION 'Flow access is restricted to @noon.com accounts (got: %)', NEW.email
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_noon_email_on_signup ON auth.users;
CREATE TRIGGER enforce_noon_email_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_noon_email_on_signup();

-- ── 3. Drop the wide-open policies from migration 002/003/007 ──
DROP POLICY IF EXISTS "Allow public read"   ON squads;
DROP POLICY IF EXISTS "Allow public insert" ON squads;
DROP POLICY IF EXISTS "Allow public update" ON squads;

DROP POLICY IF EXISTS "Allow public read"   ON roles;
DROP POLICY IF EXISTS "Allow public insert" ON roles;
DROP POLICY IF EXISTS "Allow public update" ON roles;

DROP POLICY IF EXISTS "Allow public read"   ON people;
DROP POLICY IF EXISTS "Allow public insert" ON people;
DROP POLICY IF EXISTS "Allow public update" ON people;

DROP POLICY IF EXISTS "Allow public read"   ON projects;
DROP POLICY IF EXISTS "Allow public insert" ON projects;
DROP POLICY IF EXISTS "Allow public update" ON projects;

DROP POLICY IF EXISTS "Allow public read"   ON weeks;
DROP POLICY IF EXISTS "Allow public insert" ON weeks;
DROP POLICY IF EXISTS "Allow public update" ON weeks;

DROP POLICY IF EXISTS "Allow public read"   ON commitments;
DROP POLICY IF EXISTS "Allow public insert" ON commitments;
DROP POLICY IF EXISTS "Allow public update" ON commitments;
DROP POLICY IF EXISTS "Allow public delete" ON commitments;

DROP POLICY IF EXISTS "Allow public read"   ON commitment_items;
DROP POLICY IF EXISTS "Allow public insert" ON commitment_items;
DROP POLICY IF EXISTS "Allow public update" ON commitment_items;
DROP POLICY IF EXISTS "Allow public delete" ON commitment_items;

DROP POLICY IF EXISTS "Allow public read"   ON project_history;
DROP POLICY IF EXISTS "Allow public insert" ON project_history;

DROP POLICY IF EXISTS "Allow public read"   ON activity_log;
DROP POLICY IF EXISTS "Allow public insert" ON activity_log;

DROP POLICY IF EXISTS "rants_select" ON rants;
DROP POLICY IF EXISTS "rants_insert" ON rants;
DROP POLICY IF EXISTS "rants_update" ON rants;

-- ── 4. Replace with @noon.com-only policies ──
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'squads', 'roles', 'people', 'projects', 'weeks',
    'commitments', 'commitment_items', 'project_history',
    'activity_log', 'rants'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY "noon_select" ON %I FOR SELECT TO authenticated USING (public.is_noon_user())', t
    );
    EXECUTE format(
      'CREATE POLICY "noon_insert" ON %I FOR INSERT TO authenticated WITH CHECK (public.is_noon_user())', t
    );
    EXECUTE format(
      'CREATE POLICY "noon_update" ON %I FOR UPDATE TO authenticated USING (public.is_noon_user()) WITH CHECK (public.is_noon_user())', t
    );
    EXECUTE format(
      'CREATE POLICY "noon_delete" ON %I FOR DELETE TO authenticated USING (public.is_noon_user())', t
    );
  END LOOP;
END $$;
