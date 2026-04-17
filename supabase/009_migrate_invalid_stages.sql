-- ============================================================
-- 009_migrate_invalid_stages.sql
-- ============================================================
-- Alpha / Beta / GA are project lifecycle states, not commit stages.
-- The Commit tab only offers PRD / Design / Dev / QA (commitPhases in
-- src/styles/theme.js). Prior seed and backfill scripts incorrectly
-- wrote Alpha/Beta/GA into stage columns, producing phantom activity
-- in the Projects > Weekly Commits matrix "Other" bucket.
--
-- This migration reassigns every existing row with an illegal stage
-- to 'Dev' (a safe, common default). Affects two tables:
--   commitment_items.stage   (current-week commits)
--   project_history.stage    (historical weekly commits)
--
-- If you'd rather delete these rows instead of remapping, see the
-- commented DELETE statements at the bottom.
-- ============================================================

BEGIN;

-- Preview (run SELECTs first to see what will change)
--   SELECT stage, COUNT(*) FROM commitment_items WHERE stage IN ('Alpha','Beta','GA') GROUP BY stage;
--   SELECT stage, COUNT(*) FROM project_history WHERE stage IN ('Alpha','Beta','GA') GROUP BY stage;

UPDATE commitment_items
   SET stage = 'Dev'
 WHERE stage IN ('Alpha', 'Beta', 'GA');

UPDATE project_history
   SET stage = 'Dev'
 WHERE stage IN ('Alpha', 'Beta', 'GA');

-- Verify after:
--   SELECT COUNT(*) FROM commitment_items WHERE stage IN ('Alpha','Beta','GA');  -- expect 0
--   SELECT COUNT(*) FROM project_history  WHERE stage IN ('Alpha','Beta','GA');  -- expect 0

COMMIT;

-- ============================================================
-- Alternative: DELETE instead of remap (destructive — data is lost)
-- ============================================================
-- BEGIN;
--   DELETE FROM commitment_items WHERE stage IN ('Alpha','Beta','GA');
--   DELETE FROM project_history  WHERE stage IN ('Alpha','Beta','GA');
-- COMMIT;
