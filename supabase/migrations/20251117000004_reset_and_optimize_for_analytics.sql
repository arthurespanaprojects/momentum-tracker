-- ================================================
-- RESET COMPLETO DE LA BASE DE DATOS
-- ================================================

-- Drop todas las políticas primero
DROP POLICY IF EXISTS "Enable all for activities" ON activities;
DROP POLICY IF EXISTS "Enable all for weekly_goals" ON weekly_goals;
DROP POLICY IF EXISTS "Enable all for daily_entries" ON daily_entries;
DROP POLICY IF EXISTS "Enable all for weekly_reflections" ON weekly_reflections;
DROP POLICY IF EXISTS "Enable all for activity_goals" ON activity_goals;

-- Drop todas las tablas en orden correcto (dependencias primero)
DROP TABLE IF EXISTS weekly_reflections CASCADE;
DROP TABLE IF EXISTS daily_entries CASCADE;
DROP TABLE IF EXISTS weekly_goals CASCADE;
DROP TABLE IF EXISTS activity_goals CASCADE;
DROP TABLE IF EXISTS activities CASCADE;

-- ================================================
-- CREAR ESTRUCTURA OPTIMIZADA PARA ANÁLISIS
-- ================================================

-- Tabla de Actividades
CREATE TABLE activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    activity_type TEXT NOT NULL DEFAULT 'time' CHECK (activity_type IN ('time', 'count')),
    target_unit TEXT DEFAULT 'horas',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP WITH TIME ZONE
);

-- Índices para actividades
CREATE INDEX idx_activities_active ON activities(is_active);
CREATE INDEX idx_activities_display_order ON activities(display_order);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_created ON activities(created_at);

-- Tabla de Entradas Diarias (datos históricos para análisis)
CREATE TABLE daily_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    value_amount REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, entry_date)
);

-- Índices para entradas diarias (optimizado para queries de análisis)
CREATE INDEX idx_daily_entries_date ON daily_entries(entry_date);
CREATE INDEX idx_daily_entries_activity ON daily_entries(activity_id);
CREATE INDEX idx_daily_entries_activity_date ON daily_entries(activity_id, entry_date);
CREATE INDEX idx_daily_entries_value ON daily_entries(value_amount);
CREATE INDEX idx_daily_entries_created ON daily_entries(created_at);

-- Tabla de Metas Semanales (para análisis de cumplimiento)
CREATE TABLE weekly_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    target_value REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    achieved BOOLEAN DEFAULT false,
    achieved_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(activity_id, week_start_date)
);

-- Índices para metas semanales
CREATE INDEX idx_weekly_goals_week ON weekly_goals(week_start_date);
CREATE INDEX idx_weekly_goals_activity ON weekly_goals(activity_id);
CREATE INDEX idx_weekly_goals_activity_week ON weekly_goals(activity_id, week_start_date);
CREATE INDEX idx_weekly_goals_achieved ON weekly_goals(achieved);
CREATE INDEX idx_weekly_goals_target ON weekly_goals(target_value);

-- Tabla de Metas de Actividad (checkboxes - nueva funcionalidad)
CREATE TABLE activity_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    goal_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(activity_id, week_start_date, goal_text)
);

-- Índices para metas de actividad
CREATE INDEX idx_activity_goals_activity ON activity_goals(activity_id);
CREATE INDEX idx_activity_goals_week ON activity_goals(week_start_date);
CREATE INDEX idx_activity_goals_activity_week ON activity_goals(activity_id, week_start_date);
CREATE INDEX idx_activity_goals_completed ON activity_goals(completed);

-- Tabla de Reflexiones Semanales (análisis cualitativo)
CREATE TABLE weekly_reflections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    reflection_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, week_start_date)
);

-- Índices para reflexiones
CREATE INDEX idx_weekly_reflections_week ON weekly_reflections(week_start_date);
CREATE INDEX idx_weekly_reflections_activity ON weekly_reflections(activity_id);

-- ================================================
-- FUNCIONES PARA ANÁLISIS
-- ================================================

-- Función para calcular estadísticas de una actividad
CREATE OR REPLACE FUNCTION get_activity_stats(
    p_activity_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_value REAL,
    avg_daily_value REAL,
    max_daily_value REAL,
    days_with_data INTEGER,
    total_days INTEGER,
    consistency_rate REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH date_range AS (
        SELECT 
            COALESCE(p_start_date, MIN(entry_date)) as start_d,
            COALESCE(p_end_date, MAX(entry_date)) as end_d
        FROM daily_entries
        WHERE activity_id = p_activity_id
    )
    SELECT 
        COALESCE(SUM(de.value_amount), 0)::REAL as total_value,
        COALESCE(AVG(de.value_amount), 0)::REAL as avg_daily_value,
        COALESCE(MAX(de.value_amount), 0)::REAL as max_daily_value,
        COUNT(de.id)::INTEGER as days_with_data,
        (dr.end_d - dr.start_d + 1)::INTEGER as total_days,
        CASE 
            WHEN (dr.end_d - dr.start_d + 1) > 0 
            THEN (COUNT(de.id)::REAL / (dr.end_d - dr.start_d + 1)::REAL) * 100
            ELSE 0 
        END::REAL as consistency_rate
    FROM date_range dr
    LEFT JOIN daily_entries de ON de.activity_id = p_activity_id
        AND de.entry_date BETWEEN dr.start_d AND dr.end_d;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular racha actual
CREATE OR REPLACE FUNCTION get_current_streak(p_activity_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_current_date DATE := CURRENT_DATE;
    v_has_entry BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM daily_entries 
            WHERE activity_id = p_activity_id 
            AND entry_date = v_current_date
            AND value_amount > 0
        ) INTO v_has_entry;
        
        EXIT WHEN NOT v_has_entry;
        
        v_streak := v_streak + 1;
        v_current_date := v_current_date - 1;
    END LOOP;
    
    RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_entries_updated_at BEFORE UPDATE ON daily_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON weekly_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_reflections_updated_at BEFORE UPDATE ON weekly_reflections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para marcar cuando se alcanza una meta
CREATE OR REPLACE FUNCTION check_goal_achievement()
RETURNS TRIGGER AS $$
DECLARE
    v_total_value REAL;
    v_target_value REAL;
BEGIN
    -- Calcular el total de la semana
    SELECT COALESCE(SUM(value_amount), 0) INTO v_total_value
    FROM daily_entries
    WHERE activity_id = NEW.activity_id
    AND entry_date >= (
        SELECT week_start_date FROM weekly_goals WHERE id = NEW.activity_id
    )
    AND entry_date < (
        SELECT week_start_date FROM weekly_goals WHERE id = NEW.activity_id
    ) + INTERVAL '7 days';
    
    -- Obtener la meta
    SELECT target_value INTO v_target_value
    FROM weekly_goals
    WHERE activity_id = NEW.activity_id;
    
    -- Actualizar si se alcanzó
    IF v_total_value >= v_target_value AND v_target_value > 0 THEN
        UPDATE weekly_goals 
        SET achieved = true, 
            achieved_at = CURRENT_TIMESTAMP
        WHERE activity_id = NEW.activity_id
        AND achieved = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_goal_after_entry AFTER INSERT OR UPDATE ON daily_entries
    FOR EACH ROW EXECUTE FUNCTION check_goal_achievement();

-- ================================================
-- SEGURIDAD (RLS)
-- ================================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_goals ENABLE ROW LEVEL SECURITY;

-- Políticas (permitir todo - single user app)
CREATE POLICY "Enable all for activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for weekly_goals" ON weekly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for daily_entries" ON daily_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for weekly_reflections" ON weekly_reflections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for activity_goals" ON activity_goals FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- VISTAS PARA ANÁLISIS
-- ================================================

-- Vista de resumen semanal por actividad
CREATE OR REPLACE VIEW weekly_activity_summary AS
SELECT 
    a.id as activity_id,
    a.name as activity_name,
    a.activity_type,
    DATE_TRUNC('week', de.entry_date)::DATE as week_start,
    SUM(de.value_amount) as total_value,
    AVG(de.value_amount) as avg_daily_value,
    COUNT(DISTINCT de.entry_date) as days_active,
    wg.target_value,
    CASE 
        WHEN wg.target_value > 0 
        THEN (SUM(de.value_amount) / wg.target_value * 100)::REAL
        ELSE 0
    END as completion_percentage
FROM activities a
LEFT JOIN daily_entries de ON a.id = de.activity_id
LEFT JOIN weekly_goals wg ON a.id = wg.activity_id 
    AND wg.week_start_date = DATE_TRUNC('week', de.entry_date)::DATE
GROUP BY a.id, a.name, a.activity_type, DATE_TRUNC('week', de.entry_date), wg.target_value;

-- Vista de tendencias mensuales
CREATE OR REPLACE VIEW monthly_trends AS
SELECT 
    a.id as activity_id,
    a.name as activity_name,
    DATE_TRUNC('month', de.entry_date)::DATE as month_start,
    SUM(de.value_amount) as total_value,
    AVG(de.value_amount) as avg_daily_value,
    COUNT(DISTINCT de.entry_date) as days_active
FROM activities a
LEFT JOIN daily_entries de ON a.id = de.activity_id
GROUP BY a.id, a.name, DATE_TRUNC('month', de.entry_date);
