# Migración: Soporte para Actividades por Cantidad

## ⚠️ IMPORTANTE - EJECUTA ESTO ANTES DE USAR LA APP

Esta actualización agrega soporte para dos tipos de actividades:

- **Por Tiempo** (⏱️): Como estudiar, meditar, leer (medidas en horas)
- **Por Cantidad** (🔢): Como vasos de agua, páginas leídas, flexiones (medidas en números)

## 🚀 Pasos para Aplicar la Migración

### 1. Abre el Editor SQL de Supabase

Ve a: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

### 2. Copia y Ejecuta Este SQL

```sql
-- Agregar columnas a la tabla activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'time' CHECK (activity_type IN ('time', 'count'));
ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_unit TEXT DEFAULT 'horas';

-- Renombrar columnas en weekly_goals
ALTER TABLE weekly_goals RENAME COLUMN target_hours TO target_value;

-- Renombrar columnas en daily_entries
ALTER TABLE daily_entries RENAME COLUMN hours_spent TO value_amount;

-- Agregar comentarios
COMMENT ON COLUMN weekly_goals.target_value IS 'Target value: hours (for time activities) or count (for count activities)';
COMMENT ON COLUMN daily_entries.value_amount IS 'Amount: minutes (for time activities) or count (for count activities)';
COMMENT ON COLUMN activities.activity_type IS 'Type of activity: time (hours-based) or count (quantity-based)';
COMMENT ON COLUMN activities.target_unit IS 'Unit of measurement for display (e.g., "horas", "vasos", "veces", "páginas")';
```

### 3. Click en "RUN"

### 4. ✅ Listo!

Ahora puedes reiniciar el backend y frontend.

## 📝 Cambios Principales

### Base de Datos

- `activities.activity_type`: "time" o "count"
- `activities.target_unit`: "horas", "vasos", "veces", "páginas", etc.
- `weekly_goals.target_value`: Reemplaza `target_hours` (genérico)
- `daily_entries.value_amount`: Reemplaza `hours_spent` (genérico)

### Frontend

- Registro diario ahora en **MINUTOS** para actividades de tiempo
- Visualización automática en **HORAS** en la tabla de resumen
- Selector de tipo al crear actividad
- Campo personalizado para la unidad de medida
- Cronómetro solo para actividades de tiempo

### Backend

- Modelos Pydantic actualizados con `activity_type` y `target_unit`
- Endpoint `/api/dashboard` calcula correctamente ambos tipos
- Conversión automática de minutos a horas en resumen

## 🔄 Cómo Usar

### Crear Actividad de Tiempo

1. Click en "Agregar Nueva Actividad"
2. Nombre: "Estudiar Python"
3. Tipo: ⏱️ Por Tiempo
4. Unidad: "horas"
5. Meta semanal: 10 (horas)
6. Registro diario: En minutos (ej: 90 min = 1.5 hrs)

### Crear Actividad de Cantidad

1. Click en "Agregar Nueva Actividad"
2. Nombre: "Beber Agua"
3. Tipo: 🔢 Por Cantidad
4. Unidad: "vasos"
5. Meta semanal: 8 (vasos)
6. Registro diario: Números enteros (ej: 3 vasos)

## 🎯 Ejemplos de Uso

| Actividad | Tipo     | Unidad       | Meta Semanal | Registro Diario      |
| --------- | -------- | ------------ | ------------ | -------------------- |
| Meditar   | Tiempo   | minutos      | 300          | 30, 45, 60...        |
| Leer      | Tiempo   | horas        | 5            | 60, 90, 120... (min) |
| Agua      | Cantidad | vasos        | 56           | 8, 7, 9...           |
| Flexiones | Cantidad | repeticiones | 200          | 30, 25, 40...        |
| Páginas   | Cantidad | páginas      | 100          | 15, 20, 10...        |

## ⚙️ Reiniciar Servidores

```powershell
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend (desde carpeta backend)
.\venv\Scripts\Activate.ps1
python run.py
```

## 🐛 Troubleshooting

### Error: "column target_hours does not exist"

✅ La migración se aplicó correctamente

### Error: "column target_value does not exist"

❌ Necesitas ejecutar la migración SQL

### Error: "duplicate key value violates unique constraint"

⚠️ Ya existe una actividad con ese nombre, usa otro

### Los valores no se muestran correctamente

🔄 Recarga la página (F5)
