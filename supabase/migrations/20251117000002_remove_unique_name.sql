-- Eliminar el constraint UNIQUE del nombre de actividades
-- Esto permite crear múltiples actividades con el mismo nombre si es necesario
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_name_key;

-- Agregar índice para búsquedas por nombre (sin ser único)
CREATE INDEX IF NOT EXISTS idx_activities_name ON activities(name);
