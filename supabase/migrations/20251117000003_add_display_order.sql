-- Add display_order column to activities table
ALTER TABLE activities ADD COLUMN display_order INTEGER;

-- Set initial order based on creation date
UPDATE activities 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM activities
) AS subquery
WHERE activities.id = subquery.id;

-- Make display_order not null with default
ALTER TABLE activities ALTER COLUMN display_order SET NOT NULL;
ALTER TABLE activities ALTER COLUMN display_order SET DEFAULT 0;

-- Create index for ordering
CREATE INDEX idx_activities_display_order ON activities(display_order);
