-- Create Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Weekly Goals table
CREATE TABLE IF NOT EXISTS weekly_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    target_hours REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, week_start_date)
);

-- Create Daily Entries table
CREATE TABLE IF NOT EXISTS daily_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    hours_spent REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, entry_date)
);

-- Create Weekly Reflections table
CREATE TABLE IF NOT EXISTS weekly_reflections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    reflection_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, week_start_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_start_date);
CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_week ON weekly_reflections(week_start_date);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

-- Create policies (permitir todo por ahora - single user app)
CREATE POLICY "Enable all for activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for weekly_goals" ON weekly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for daily_entries" ON daily_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for weekly_reflections" ON weekly_reflections FOR ALL USING (true) WITH CHECK (true);
