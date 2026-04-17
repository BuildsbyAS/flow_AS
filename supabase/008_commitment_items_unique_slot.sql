-- 008_commitment_items_unique_slot.sql
-- Adds UNIQUE (commitment_id, slot) on commitment_items so that
-- syncCommitmentToDB's upsert with onConflict: 'commitment_id,slot' succeeds.
-- Prior to this, every commit save returned 400 "no unique or exclusion
-- constraint matching the ON CONFLICT specification".

-- Drop any pre-existing duplicates so the constraint can be created.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY commitment_id, slot ORDER BY updated_at DESC, created_at DESC, id) AS rn
  FROM commitment_items
)
DELETE FROM commitment_items
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE commitment_items
  ADD CONSTRAINT commitment_items_commitment_slot_unique UNIQUE (commitment_id, slot);
