-- Add activity type support (time-based or count-based)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'time' CHECK (activity_type IN ('time', 'count'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_unit TEXT DEFAULT 'horas';

-- Rename columns to be more generic (support both time and count)
ALTER TABLE weekly_goals RENAME COLUMN target_hours TO target_value;
ALTER TABLE daily_entries RENAME COLUMN hours_spent TO value_amount;

-- Update column comments for clarity
COMMENT ON COLUMN weekly_goals.target_value IS 'Target value: hours (for time activities) or count (for count activities)';
COMMENT ON COLUMN daily_entries.value_amount IS 'Amount: hours (for time activities) or count (for count activities)';
COMMENT ON COLUMN activities.activity_type IS 'Type of activity: time (hours-based) or count (quantity-based)';
COMMENT ON COLUMN activities.target_unit IS 'Unit of measurement for display (e.g., "horas", "vasos", "veces", "páginas")';
