-- ============================================
-- Sole-owner lockdown.
-- Only ajain@noon.com can:
--   - Approve, reject, or otherwise modify any people row
--   - Modify squads / roles
-- "Admin" via people.is_admin is no longer a permission check anywhere.
-- Run AFTER 012_approval_gating.sql.
-- ============================================

-- ── Owner predicate (hardcoded) ──
CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'ajain@noon.com'
$$;

GRANT EXECUTE ON FUNCTION public.is_app_owner() TO anon, authenticated;

-- ── Tighten the people-row guard trigger: only OWNER can change privileged cols ──
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
     AND NOT public.is_app_owner() THEN
    RAISE EXCEPTION 'Only the app owner can change status, is_admin, auth_user_id, or audit fields'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- ── Replace people UPDATE/DELETE policies with owner-only ──
DROP POLICY IF EXISTS "people_update_admin" ON public.people;
DROP POLICY IF EXISTS "people_delete_admin" ON public.people;

CREATE POLICY "people_update_owner"
  ON public.people FOR UPDATE TO authenticated
  USING (public.is_app_owner())
  WITH CHECK (public.is_app_owner());

CREATE POLICY "people_delete_owner"
  ON public.people FOR DELETE TO authenticated
  USING (public.is_app_owner());

-- ── Replace squads/roles admin-write policies with owner-only ──
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['squads', 'roles'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "admin_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "admin_delete" ON public.%I', t);

    EXECUTE format('CREATE POLICY "owner_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_app_owner())', t);
    EXECUTE format('CREATE POLICY "owner_update" ON public.%I FOR UPDATE TO authenticated USING (public.is_app_owner()) WITH CHECK (public.is_app_owner())', t);
    EXECUTE format('CREATE POLICY "owner_delete" ON public.%I FOR DELETE TO authenticated USING (public.is_app_owner())', t);
  END LOOP;
END $$;

-- ── Bootstrap: ensure ajain@noon.com is approved (in case the row exists but is pending) ──
UPDATE public.people p
SET status = 'approved',
    approved_at = COALESCE(p.approved_at, now()),
    email = COALESCE(p.email, u.email)
FROM auth.users u
WHERE p.auth_user_id = u.id
  AND lower(u.email) = 'ajain@noon.com';
