-- ============================================
-- Per-user approval gating, on top of @noon.com restriction.
--   - Adds people.status ('pending' | 'approved' | 'rejected')
--   - Adds people.is_admin (admins approve/reject from app UI)
--   - Adds people.email + audit fields (approved_at/by, rejected_at/by)
--   - Backfills all existing linked people as 'approved'
--   - Replaces is_noon_user() RLS with has_app_access() (noon + approved)
--   - Allows pending users limited access (read own people row, read squads/roles for onboarding)
-- Run in Supabase SQL Editor.
-- ============================================

-- ── 1. New columns on people ──
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.people(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.people(id);

CREATE INDEX IF NOT EXISTS idx_people_status ON public.people(status);
CREATE INDEX IF NOT EXISTS idx_people_email_lower ON public.people(lower(email));

-- ── 2. Backfill existing users as approved ──
-- Anyone who already has a linked auth_user_id was using the app pre-gating; grandfather them in.
UPDATE public.people
SET status = 'approved',
    approved_at = COALESCE(approved_at, now())
WHERE auth_user_id IS NOT NULL
  AND status = 'pending';

-- ── 3. Helper functions ──

-- Replaces is_noon_user(). Returns true if JWT email is @noon.com AND person is approved.
CREATE OR REPLACE FUNCTION public.has_app_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@noon.com'
    AND EXISTS (
      SELECT 1 FROM public.people p
      WHERE p.auth_user_id = auth.uid()
        AND p.status = 'approved'
    )
$$;

GRANT EXECUTE ON FUNCTION public.has_app_access() TO anon, authenticated;

-- Is the current JWT a @noon.com user (regardless of approval)?
-- Used for INSERT during onboarding and SELECT on squads/roles.
CREATE OR REPLACE FUNCTION public.is_noon_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@noon.com'
$$;

GRANT EXECUTE ON FUNCTION public.is_noon_jwt() TO anon, authenticated;

-- Is the current JWT an admin?
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.auth_user_id = auth.uid()
      AND p.is_admin = true
      AND p.status = 'approved'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated;

-- ── 4. Reset and re-apply RLS policies ──

DO $$
DECLARE
  t text;
  pol record;
  -- Tables that require full app access (approved noon users only)
  full_access_tables text[] := ARRAY[
    'projects', 'weeks',
    'commitments', 'commitment_items', 'project_history',
    'activity_log', 'rants'
  ];
  -- Tables readable by any noon user (for onboarding dropdowns)
  noon_readable_tables text[] := ARRAY['squads', 'roles'];
BEGIN
  -- Drop ALL existing policies on every table we manage
  FOREACH t IN ARRAY full_access_tables || noon_readable_tables || ARRAY['people'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;

  -- Full-access tables: only approved noon users
  FOREACH t IN ARRAY full_access_tables LOOP
    EXECUTE format('CREATE POLICY "app_select" ON public.%I FOR SELECT TO authenticated USING (public.has_app_access())', t);
    EXECUTE format('CREATE POLICY "app_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_app_access())', t);
    EXECUTE format('CREATE POLICY "app_update" ON public.%I FOR UPDATE TO authenticated USING (public.has_app_access()) WITH CHECK (public.has_app_access())', t);
    EXECUTE format('CREATE POLICY "app_delete" ON public.%I FOR DELETE TO authenticated USING (public.has_app_access())', t);
  END LOOP;

  -- Squads/roles: any @noon.com user can READ (onboarding needs this); only admins write
  FOREACH t IN ARRAY noon_readable_tables LOOP
    EXECUTE format('CREATE POLICY "noon_select" ON public.%I FOR SELECT TO authenticated USING (public.is_noon_jwt())', t);
    EXECUTE format('CREATE POLICY "admin_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_app_admin())', t);
    EXECUTE format('CREATE POLICY "admin_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_app_admin()) WITH CHECK (public.is_app_admin())', t);
    EXECUTE format('CREATE POLICY "admin_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_app_admin())', t);
  END LOOP;
END $$;

-- ── 5. people table policies (special — pending users need limited access) ──

-- SELECT: own row OR full app access (so admins/approved users see everyone)
CREATE POLICY "people_select_self_or_approved"
  ON public.people FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.has_app_access());

-- INSERT: noon user creating their own row, must start as pending and non-admin
CREATE POLICY "people_insert_self_pending"
  ON public.people FOR INSERT TO authenticated
  WITH CHECK (
    public.is_noon_jwt()
    AND auth_user_id = auth.uid()
    AND status = 'pending'
    AND is_admin = false
  );

-- UPDATE: admins can update anything
CREATE POLICY "people_update_admin"
  ON public.people FOR UPDATE TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- DELETE: admins only
CREATE POLICY "people_delete_admin"
  ON public.people FOR DELETE TO authenticated
  USING (public.is_app_admin());

-- ── 6. Trigger: prevent self-elevation of status/is_admin via UPDATE ──
-- Even if we ever add a "user can update own row" policy, this trigger keeps
-- status and is_admin admin-only.
CREATE OR REPLACE FUNCTION public.guard_people_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
      OR NEW.rejected_by IS DISTINCT FROM OLD.rejected_by
      OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id)
     AND NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Only admins can change status, is_admin, auth_user_id, or audit fields'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_people_privileged_columns ON public.people;
CREATE TRIGGER guard_people_privileged_columns
  BEFORE UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_people_privileged_columns();

-- ── 7. Drop the old is_noon_user() helper if still around ──
DROP FUNCTION IF EXISTS public.is_noon_user();
