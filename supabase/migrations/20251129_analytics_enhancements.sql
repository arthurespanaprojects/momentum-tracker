-- ================================================
-- MEJORAS PARA ANÁLISIS DE DATOS AVANZADO
-- ================================================

-- Tabla de snapshots diarios para análisis histórico
CREATE TABLE IF NOT EXISTS daily_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    value_amount REAL NOT NULL,
    weekly_target REAL,
    weekly_progress REAL,
    streak_days INTEGER DEFAULT 0,
    is_goal_achieved BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(snapshot_date, activity_id)
);

CREATE INDEX idx_daily_snapshots_date ON daily_snapshots(snapshot_date);
CREATE INDEX idx_daily_snapshots_activity ON daily_snapshots(activity_id);
CREATE INDEX idx_daily_snapshots_metadata ON daily_snapshots USING gin(metadata);

-- Tabla de eventos/hitos importantes
CREATE TABLE IF NOT EXISTS milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('streak', 'goal', 'record', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    achieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    value_amount REAL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_milestones_activity ON milestones(activity_id);
CREATE INDEX idx_milestones_type ON milestones(milestone_type);
CREATE INDEX idx_milestones_achieved ON milestones(achieved_at);

-- ================================================
-- FUNCIONES AVANZADAS DE ANÁLISIS
-- ================================================

-- Calcular promedio móvil (para detectar tendencias)
CREATE OR REPLACE FUNCTION get_moving_average(
    p_activity_id UUID,
    p_days INTEGER DEFAULT 7,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    entry_date DATE,
    daily_value REAL,
    moving_avg REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.entry_date,
        de.value_amount as daily_value,
        AVG(de2.value_amount) OVER (
            ORDER BY de.entry_date 
            ROWS BETWEEN p_days - 1 PRECEDING AND CURRENT ROW
        )::REAL as moving_avg
    FROM daily_entries de
    LEFT JOIN daily_entries de2 ON de2.activity_id = de.activity_id
        AND de2.entry_date <= de.entry_date
        AND de2.entry_date > de.entry_date - p_days
    WHERE de.activity_id = p_activity_id
        AND de.entry_date <= p_end_date
    ORDER BY de.entry_date;
END;
$$ LANGUAGE plpgsql;

-- Comparar rendimiento entre períodos
CREATE OR REPLACE FUNCTION compare_periods(
    p_activity_id UUID,
    p_period1_start DATE,
    p_period1_end DATE,
    p_period2_start DATE,
    p_period2_end DATE
)
RETURNS TABLE (
    period1_total REAL,
    period1_avg REAL,
    period1_days INTEGER,
    period2_total REAL,
    period2_avg REAL,
    period2_days INTEGER,
    change_percentage REAL,
    trend TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH period1 AS (
        SELECT 
            COALESCE(SUM(value_amount), 0) as total,
            COALESCE(AVG(value_amount), 0) as avg,
            COUNT(*)::INTEGER as days
        FROM daily_entries
        WHERE activity_id = p_activity_id
        AND entry_date BETWEEN p_period1_start AND p_period1_end
    ),
    period2 AS (
        SELECT 
            COALESCE(SUM(value_amount), 0) as total,
            COALESCE(AVG(value_amount), 0) as avg,
            COUNT(*)::INTEGER as days
        FROM daily_entries
        WHERE activity_id = p_activity_id
        AND entry_date BETWEEN p_period2_start AND p_period2_end
    )
    SELECT 
        p1.total::REAL,
        p1.avg::REAL,
        p1.days,
        p2.total::REAL,
        p2.avg::REAL,
        p2.days,
        CASE 
            WHEN p1.avg > 0 
            THEN ((p2.avg - p1.avg) / p1.avg * 100)::REAL
            ELSE 0
        END as change_percentage,
        CASE 
            WHEN p2.avg > p1.avg THEN 'improving'
            WHEN p2.avg < p1.avg THEN 'declining'
            ELSE 'stable'
        END as trend
    FROM period1 p1, period2 p2;
END;
$$ LANGUAGE plpgsql;

-- Detectar patrones por día de la semana
CREATE OR REPLACE FUNCTION get_weekday_patterns(
    p_activity_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    weekday INTEGER,
    weekday_name TEXT,
    avg_value REAL,
    total_entries INTEGER,
    best_day BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH weekday_stats AS (
        SELECT 
            EXTRACT(DOW FROM entry_date)::INTEGER as day_num,
            AVG(value_amount)::REAL as avg_val,
            COUNT(*)::INTEGER as entries
        FROM daily_entries
        WHERE activity_id = p_activity_id
        AND entry_date >= COALESCE(p_start_date, entry_date)
        AND entry_date <= p_end_date
        GROUP BY EXTRACT(DOW FROM entry_date)
    ),
    max_day AS (
        SELECT MAX(avg_val) as max_avg FROM weekday_stats
    )
    SELECT 
        ws.day_num,
        CASE ws.day_num
            WHEN 0 THEN 'Domingo'
            WHEN 1 THEN 'Lunes'
            WHEN 2 THEN 'Martes'
            WHEN 3 THEN 'Miércoles'
            WHEN 4 THEN 'Jueves'
            WHEN 5 THEN 'Viernes'
            WHEN 6 THEN 'Sábado'
        END as weekday_name,
        ws.avg_val,
        ws.entries,
        (ws.avg_val = md.max_avg) as best_day
    FROM weekday_stats ws, max_day md
    ORDER BY ws.day_num;
END;
$$ LANGUAGE plpgsql;

-- Calcular racha más larga histórica
CREATE OR REPLACE FUNCTION get_longest_streak(p_activity_id UUID)
RETURNS TABLE (
    longest_streak INTEGER,
    streak_start_date DATE,
    streak_end_date DATE
) AS $$
DECLARE
    v_current_streak INTEGER := 0;
    v_max_streak INTEGER := 0;
    v_current_start DATE;
    v_max_start DATE;
    v_max_end DATE;
    v_prev_date DATE;
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT entry_date 
        FROM daily_entries 
        WHERE activity_id = p_activity_id 
        AND value_amount > 0
        ORDER BY entry_date
    LOOP
        IF v_prev_date IS NULL OR rec.entry_date = v_prev_date + 1 THEN
            IF v_current_streak = 0 THEN
                v_current_start := rec.entry_date;
            END IF;
            v_current_streak := v_current_streak + 1;
        ELSE
            IF v_current_streak > v_max_streak THEN
                v_max_streak := v_current_streak;
                v_max_start := v_current_start;
                v_max_end := v_prev_date;
            END IF;
            v_current_streak := 1;
            v_current_start := rec.entry_date;
        END IF;
        v_prev_date := rec.entry_date;
    END LOOP;
    
    IF v_current_streak > v_max_streak THEN
        v_max_streak := v_current_streak;
        v_max_start := v_current_start;
        v_max_end := v_prev_date;
    END IF;
    
    RETURN QUERY SELECT v_max_streak, v_max_start, v_max_end;
END;
$$ LANGUAGE plpgsql;

-- Predecir si alcanzará la meta semanal
CREATE OR REPLACE FUNCTION predict_weekly_goal(
    p_activity_id UUID,
    p_week_start_date DATE
)
RETURNS TABLE (
    target_value REAL,
    current_value REAL,
    days_elapsed INTEGER,
    days_remaining INTEGER,
    avg_per_day REAL,
    required_per_day REAL,
    will_achieve BOOLEAN,
    confidence TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH goal_data AS (
        SELECT target_value as target
        FROM weekly_goals
        WHERE activity_id = p_activity_id
        AND week_start_date = p_week_start_date
    ),
    current_data AS (
        SELECT 
            COALESCE(SUM(value_amount), 0) as current,
            COUNT(DISTINCT entry_date)::INTEGER as days
        FROM daily_entries
        WHERE activity_id = p_activity_id
        AND entry_date >= p_week_start_date
        AND entry_date < p_week_start_date + 7
    )
    SELECT 
        gd.target::REAL,
        cd.current::REAL,
        cd.days,
        (7 - cd.days)::INTEGER as days_rem,
        CASE WHEN cd.days > 0 THEN (cd.current / cd.days)::REAL ELSE 0 END as avg_pd,
        CASE 
            WHEN (7 - cd.days) > 0 
            THEN ((gd.target - cd.current) / (7 - cd.days))::REAL 
            ELSE 0 
        END as req_pd,
        CASE 
            WHEN cd.days > 0 AND (7 - cd.days) > 0
            THEN (cd.current / cd.days) * 7 >= gd.target
            ELSE false
        END as will_ach,
        CASE 
            WHEN cd.days >= 5 THEN 'alta'
            WHEN cd.days >= 3 THEN 'media'
            ELSE 'baja'
        END as conf
    FROM goal_data gd, current_data cd;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- VISTAS ADICIONALES PARA DASHBOARDS
-- ================================================

-- Vista de resumen general de todas las actividades
CREATE OR REPLACE VIEW activities_dashboard AS
SELECT 
    a.id,
    a.name,
    a.activity_type,
    a.is_active,
    (SELECT COUNT(*) FROM daily_entries de WHERE de.activity_id = a.id) as total_entries,
    (SELECT COALESCE(SUM(value_amount), 0) FROM daily_entries de WHERE de.activity_id = a.id) as lifetime_total,
    (SELECT get_current_streak(a.id)) as current_streak,
    (SELECT MAX(value_amount) FROM daily_entries de WHERE de.activity_id = a.id) as personal_best,
    (SELECT entry_date FROM daily_entries de WHERE de.activity_id = a.id ORDER BY entry_date DESC LIMIT 1) as last_entry_date,
    (SELECT COUNT(*) FROM weekly_goals wg WHERE wg.activity_id = a.id AND wg.achieved = true) as goals_achieved,
    (SELECT COUNT(*) FROM weekly_goals wg WHERE wg.activity_id = a.id) as total_goals
FROM activities a;

-- Vista de actividad reciente (últimos 30 días)
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    a.id as activity_id,
    a.name as activity_name,
    de.entry_date,
    de.value_amount,
    CASE 
        WHEN de.entry_date = CURRENT_DATE THEN 'hoy'
        WHEN de.entry_date = CURRENT_DATE - 1 THEN 'ayer'
        ELSE TO_CHAR(de.entry_date, 'DD/MM')
    END as relative_date
FROM activities a
JOIN daily_entries de ON a.id = de.activity_id
WHERE de.entry_date >= CURRENT_DATE - 30
ORDER BY de.entry_date DESC, a.name;

-- ================================================
-- TRIGGER PARA CREAR SNAPSHOTS AUTOMÁTICOS
-- ================================================

CREATE OR REPLACE FUNCTION create_daily_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    v_weekly_target REAL;
    v_weekly_progress REAL;
    v_streak INTEGER;
    v_is_achieved BOOLEAN;
BEGIN
    -- Obtener meta semanal
    SELECT target_value INTO v_weekly_target
    FROM weekly_goals
    WHERE activity_id = NEW.activity_id
    AND week_start_date = DATE_TRUNC('week', NEW.entry_date)::DATE;
    
    -- Calcular progreso semanal
    SELECT COALESCE(SUM(value_amount), 0) INTO v_weekly_progress
    FROM daily_entries
    WHERE activity_id = NEW.activity_id
    AND entry_date >= DATE_TRUNC('week', NEW.entry_date)::DATE
    AND entry_date < DATE_TRUNC('week', NEW.entry_date)::DATE + INTERVAL '7 days';
    
    -- Obtener racha actual
    v_streak := get_current_streak(NEW.activity_id);
    
    -- Verificar si alcanzó la meta
    v_is_achieved := (v_weekly_target > 0 AND v_weekly_progress >= v_weekly_target);
    
    -- Insertar o actualizar snapshot
    INSERT INTO daily_snapshots (
        snapshot_date,
        activity_id,
        value_amount,
        weekly_target,
        weekly_progress,
        streak_days,
        is_goal_achieved
    ) VALUES (
        NEW.entry_date,
        NEW.activity_id,
        NEW.value_amount,
        v_weekly_target,
        v_weekly_progress,
        v_streak,
        v_is_achieved
    )
    ON CONFLICT (snapshot_date, activity_id) 
    DO UPDATE SET
        value_amount = NEW.value_amount,
        weekly_target = v_weekly_target,
        weekly_progress = v_weekly_progress,
        streak_days = v_streak,
        is_goal_achieved = v_is_achieved;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_snapshot_on_entry 
    AFTER INSERT OR UPDATE ON daily_entries
    FOR EACH ROW 
    EXECUTE FUNCTION create_daily_snapshot();

-- ================================================
-- FUNCIÓN PARA DETECTAR Y CREAR HITOS AUTOMÁTICOS
-- ================================================

CREATE OR REPLACE FUNCTION check_and_create_milestones()
RETURNS TRIGGER AS $$
DECLARE
    v_streak INTEGER;
    v_max_value REAL;
    v_milestone_exists BOOLEAN;
BEGIN
    -- Verificar racha de 7 días
    v_streak := get_current_streak(NEW.activity_id);
    IF v_streak % 7 = 0 AND v_streak > 0 THEN
        SELECT EXISTS(
            SELECT 1 FROM milestones 
            WHERE activity_id = NEW.activity_id 
            AND milestone_type = 'streak'
            AND achieved_at::DATE = CURRENT_DATE
        ) INTO v_milestone_exists;
        
        IF NOT v_milestone_exists THEN
            INSERT INTO milestones (
                activity_id, milestone_type, title, description,
                achieved_at, value_amount
            ) VALUES (
                NEW.activity_id, 'streak',
                'Racha de ' || v_streak || ' días',
                'Mantuviste una racha de ' || v_streak || ' días consecutivos',
                CURRENT_TIMESTAMP, v_streak
            );
        END IF;
    END IF;
    
    -- Verificar récord personal
    SELECT MAX(value_amount) INTO v_max_value
    FROM daily_entries
    WHERE activity_id = NEW.activity_id
    AND entry_date < NEW.entry_date;
    
    IF v_max_value IS NULL OR NEW.value_amount > v_max_value THEN
        INSERT INTO milestones (
            activity_id, milestone_type, title, description,
            achieved_at, value_amount
        ) VALUES (
            NEW.activity_id, 'record',
            '¡Nuevo récord personal!',
            'Alcanzaste tu mejor marca con ' || NEW.value_amount || ' unidades',
            CURRENT_TIMESTAMP, NEW.value_amount
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_milestones_on_entry 
    AFTER INSERT OR UPDATE ON daily_entries
    FOR EACH ROW 
    EXECUTE FUNCTION check_and_create_milestones();

-- ================================================
-- RLS PARA NUEVAS TABLAS
-- ================================================

ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for daily_snapshots" ON daily_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for milestones" ON milestones FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ================================================

-- Índice compuesto para queries de análisis temporal
CREATE INDEX IF NOT EXISTS idx_daily_entries_date_activity_value 
    ON daily_entries(entry_date DESC, activity_id, value_amount);

-- Índice para búsquedas de metas activas
CREATE INDEX IF NOT EXISTS idx_weekly_goals_active 
    ON weekly_goals(week_start_date DESC, activity_id) 
    WHERE achieved = false;

-- Índice para análisis de consistencia
CREATE INDEX IF NOT EXISTS idx_daily_entries_activity_date_asc 
    ON daily_entries(activity_id, entry_date ASC);
