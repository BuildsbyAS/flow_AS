-- Generate project IDs (X01, X02, ...) server-side to prevent race conditions
-- when multiple users create projects simultaneously.

CREATE OR REPLACE FUNCTION generate_project_id() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    NEW.id := 'X' || LPAD((
      SELECT COALESCE(MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::int), 0) + 1
      FROM projects
    )::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_id
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION generate_project_id();
