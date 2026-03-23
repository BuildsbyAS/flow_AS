-- Add actual start/end date columns to projects for shipped tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- Populate dummy actual dates for shipped projects (Alpha, Beta, GA)
-- Actual start is a few days after plan start, actual end varies
UPDATE projects SET actual_start_date = start_date + INTERVAL '3 days', actual_end_date = end_date + INTERVAL '5 days'
WHERE phase IN ('Alpha', 'Beta', 'GA') AND actual_start_date IS NULL;
