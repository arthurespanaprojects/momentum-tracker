-- Create activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create weekly goals table
CREATE TABLE public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  target_hours REAL NOT NULL DEFAULT 0,
  UNIQUE(activity_id, week_start_date)
);

-- Create daily entries table
CREATE TABLE public.daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  hours_spent REAL NOT NULL DEFAULT 0,
  UNIQUE(activity_id, entry_date)
);

-- Create weekly reflections table
CREATE TABLE public.weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  reflection_text TEXT,
  UNIQUE(activity_id, week_start_date)
);

-- Enable RLS on all tables
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public app - single user)
CREATE POLICY "Allow all operations on activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weekly_goals" ON public.weekly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_entries" ON public.daily_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weekly_reflections" ON public.weekly_reflections FOR ALL USING (true) WITH CHECK (true);

-- Insert sample activities
INSERT INTO public.activities (name) VALUES 
  ('Estudio'),
  ('Ejercicio'),
  ('Lectura'),
  ('Proyecto Personal');