-- ============================================
-- Project members + project comments
--
-- Powers the new Project deep-dive activity timeline.
--   - project_members  : people other than the owner who can post on a project
--   - project_comments : free-form notes from owner/members, soft-deleted
--
-- Authorization model
--   READ:   any approved noon user (visibility is the point — anyone can
--           see what's happening on a project)
--   WRITE:  the project's owner_id, anyone in project_members, the app owner
--   EDIT:   author always; project owner / app owner for moderation
--   DELETE: handled as soft-delete (UPDATE deleted_at) — no hard delete from
--           the app. Hard delete from SQL still works for the app owner.
--
-- Realtime: both tables are added to supabase_realtime so the timeline live-
-- updates without a page refresh.
-- ============================================

-- ── project_members ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  person_id   UUID NOT NULL REFERENCES public.people(id)   ON DELETE CASCADE,
  added_by    UUID REFERENCES public.people(id),
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_person  ON public.project_members(person_id);

-- ── project_comments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.people(id),
  body        TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at   TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project_created
  ON public.project_comments(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_comments_author
  ON public.project_comments(author_id);

-- ── Helper predicates ──────────────────────────────────────────────
-- "Is the caller the people-row owner of this project?"
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects pr
    JOIN public.people p ON p.id = pr.owner_id
    WHERE pr.id = p_project_id
      AND p.auth_user_id = auth.uid()
      AND p.status = 'approved'
  )
$$;

-- "Is the caller listed in project_members for this project?"
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members m
    JOIN public.people p ON p.id = m.person_id
    WHERE m.project_id = p_project_id
      AND p.auth_user_id = auth.uid()
      AND p.status = 'approved'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_project_owner(TEXT)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(TEXT) TO anon, authenticated;

-- ── RLS: project_members ───────────────────────────────────────────
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members FORCE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON public.project_members
  FOR SELECT TO authenticated
  USING (public.has_app_access());

-- Adding/removing members is gated to the project owner and the app owner.
CREATE POLICY "members_insert" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_app_access()
    AND (public.is_project_owner(project_id) OR public.is_app_owner())
  );

CREATE POLICY "members_delete" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    public.has_app_access()
    AND (public.is_project_owner(project_id) OR public.is_app_owner())
  );

-- No UPDATE policy on purpose — members rows are immutable once created.

-- ── RLS: project_comments ──────────────────────────────────────────
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments FORCE ROW LEVEL SECURITY;

CREATE POLICY "comments_select" ON public.project_comments
  FOR SELECT TO authenticated
  USING (public.has_app_access());

-- Only project owner, listed members, or the app owner can post — and the
-- author_id on the row must match the caller's people-row so identity can't
-- be spoofed.
CREATE POLICY "comments_insert" ON public.project_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_app_access()
    AND (
      public.is_project_owner(project_id)
      OR public.is_project_member(project_id)
      OR public.is_app_owner()
    )
    AND author_id = (SELECT id FROM public.people WHERE auth_user_id = auth.uid())
  );

-- Edit / soft-delete: author always, project owner or app owner for moderation.
CREATE POLICY "comments_update" ON public.project_comments
  FOR UPDATE TO authenticated
  USING (
    public.has_app_access()
    AND (
      author_id = (SELECT id FROM public.people WHERE auth_user_id = auth.uid())
      OR public.is_project_owner(project_id)
      OR public.is_app_owner()
    )
  )
  WITH CHECK (
    public.has_app_access()
    AND (
      author_id = (SELECT id FROM public.people WHERE auth_user_id = auth.uid())
      OR public.is_project_owner(project_id)
      OR public.is_app_owner()
    )
  );

-- Hard delete: app owner only (everything else uses soft delete via UPDATE).
CREATE POLICY "comments_delete_owner" ON public.project_comments
  FOR DELETE TO authenticated
  USING (public.is_app_owner());

-- ── Realtime ───────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;

-- ============================================
-- Project freshness: projects.last_activity_at
--
-- A single column kept up-to-date by triggers whenever a comment lands
-- or an activity_log entry tagged to a project lands. Powers the
-- "Updated 3d ago" stamp + stale-project flagging on the Projects view
-- without a per-render aggregate query.
-- ============================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.touch_project_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid TEXT;
  ts  TIMESTAMPTZ;
BEGIN
  ts := COALESCE(NEW.created_at, now());

  IF TG_TABLE_NAME = 'project_comments' THEN
    -- Skip if the row is being soft-deleted by the same UPDATE — we don't
    -- want a deletion to bump the freshness stamp.
    IF TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      RETURN NEW;
    END IF;
    pid := NEW.project_id;
  ELSIF TG_TABLE_NAME = 'activity_log' AND NEW.entity_type = 'project' THEN
    pid := NEW.entity_id;
  ELSE
    RETURN NEW;
  END IF;

  IF pid IS NOT NULL THEN
    UPDATE public.projects
       SET last_activity_at = GREATEST(COALESCE(last_activity_at, 'epoch'::timestamptz), ts)
     WHERE id = pid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_comments_touch ON public.project_comments;
CREATE TRIGGER project_comments_touch
  AFTER INSERT OR UPDATE ON public.project_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_project_last_activity();

DROP TRIGGER IF EXISTS activity_log_touch_project ON public.activity_log;
CREATE TRIGGER activity_log_touch_project
  AFTER INSERT ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_project_last_activity();

-- Backfill from existing data so the column isn't empty on day one.
UPDATE public.projects p
   SET last_activity_at = GREATEST(
     p.updated_at,
     COALESCE((SELECT MAX(c.created_at) FROM public.project_comments c
                WHERE c.project_id = p.id AND c.deleted_at IS NULL), p.updated_at),
     COALESCE((SELECT MAX(a.created_at) FROM public.activity_log a
                WHERE a.entity_type = 'project' AND a.entity_id = p.id), p.updated_at)
   );

CREATE INDEX IF NOT EXISTS idx_projects_last_activity_at ON public.projects(last_activity_at DESC);
