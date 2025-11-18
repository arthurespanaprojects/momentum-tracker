# Pasos para configurar la base de datos en Supabase

## 1. Ir al SQL Editor de Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto `kxotzmvtdgzlctcarrhh`
3. En el menú lateral, haz clic en **SQL Editor**

## 2. Ejecutar la migración

1. Crea una nueva query
2. Copia y pega el contenido completo del archivo:
   `supabase/migrations/20251117000000_initial_schema.sql`
3. Haz clic en **Run** (o presiona Ctrl+Enter)

## 3. Verificar que se crearon las tablas

En el menú lateral, ve a **Table Editor** y deberías ver:

- activities
- weekly_goals
- daily_entries
- weekly_reflections

## 4. (Opcional) Agregar datos de prueba

Puedes ejecutar esto en el SQL Editor para tener datos iniciales:

```sql
-- Insertar actividades de ejemplo
INSERT INTO activities (name, is_active) VALUES
('Estudio', true),
('Ejercicio', true),
('Lectura', true),
('Meditación', true);
```

## 5. Ya está listo!

Ahora puedes ejecutar:

**Frontend:**

```bash
npm run dev
```

(Se abrirá en http://localhost:8080)

**Backend:**

```bash
cd backend
python run.py
```

(API en http://localhost:8000)

**Documentación API:**
http://localhost:8000/docs
