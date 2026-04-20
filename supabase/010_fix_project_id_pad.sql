-- Fix: generate_project_id() generated duplicate IDs once projects crossed 99.
-- Postgres LPAD truncates on the right when input exceeds the pad length, so
-- LPAD('109', 2, '0') returned '10', colliding with existing X10.
-- Pad only 2-digit numbers; leave 3+ digit numbers unpadded.

CREATE OR REPLACE FUNCTION generate_project_id() RETURNS TRIGGER AS $$
DECLARE next_num int;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::int), 0) + 1
      INTO next_num FROM projects;
    NEW.id := 'X' || CASE WHEN next_num < 100
                          THEN LPAD(next_num::text, 2, '0')
                          ELSE next_num::text END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
