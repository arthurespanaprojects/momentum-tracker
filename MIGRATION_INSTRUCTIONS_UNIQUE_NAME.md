# Instrucciones para aplicar la migración

## Desde Supabase Dashboard (Recomendado)

1. Abre tu proyecto en https://supabase.com/dashboard
2. Ve a "SQL Editor" en el menú lateral izquierdo
3. Copia y pega el siguiente SQL:

```sql
-- Eliminar el constraint UNIQUE del nombre de actividades
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_name_key;

-- Agregar índice para búsquedas por nombre (sin ser único)
CREATE INDEX IF NOT EXISTS idx_activities_name ON activities(name);
```

4. Click en "RUN" o presiona Ctrl+Enter
5. Deberías ver el mensaje "Success. No rows returned"

## Desde Supabase CLI (Alternativa)

```bash
supabase db push
```

## Verificar que funcionó

Después de ejecutar la migración, prueba crear una actividad en tu app.
El error "duplicate key value violates unique constraint" ya no debería aparecer.
