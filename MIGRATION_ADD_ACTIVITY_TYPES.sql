-- IMPORTANTE: Ejecuta este SQL en Supabase Dashboard para agregar soporte de actividades por cantidad
-- https://supabase.com/dashboard/project/kxotzmvtdgzlctcarrhh/sql/new

-- 1. Agregar columnas a la tabla activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'time' CHECK (activity_type IN ('time', 'count'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_unit TEXT DEFAULT 'horas';

-- 2. Renombrar columnas en weekly_goals (de target_hours a target_value)
ALTER TABLE weekly_goals RENAME COLUMN target_hours TO target_value;

-- 3. Renombrar columnas en daily_entries (de hours_spent a value_amount)
ALTER TABLE daily_entries RENAME COLUMN hours_spent TO value_amount;

-- 4. Agregar comentarios para documentación
COMMENT ON COLUMN weekly_goals.target_value IS 'Target value: hours (for time activities) or count (for count activities)';
COMMENT ON COLUMN daily_entries.value_amount IS 'Amount: hours (for time activities) or count (for count activities)';
COMMENT ON COLUMN activities.activity_type IS 'Type of activity: time (hours-based) or count (quantity-based)';
COMMENT ON COLUMN activities.target_unit IS 'Unit of measurement for display (e.g., "horas", "vasos", "veces", "páginas")';
