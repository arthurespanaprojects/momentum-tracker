# Momentum Tracker

Aplicación de seguimiento de hábitos y objetivos semanales.

## Stack Tecnológico

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)

## Configuración

### Frontend (React)

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno:

   - Copia `.env.example` a `.env`
   - Añade tu `VITE_SUPABASE_ANON_KEY`

3. Ejecutar en desarrollo:

```bash
npm run dev
```

- Frontend disponible en: http://localhost:8080

### Backend (FastAPI)

1. Crear entorno virtual de Python:

```bash
cd backend
python -m venv venv
```

2. Activar entorno virtual:

```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Instalar dependencias:

```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:

   - Copia `backend/.env.example` a `backend/.env`
   - Añade tu `SUPABASE_KEY` (anon key)

5. Ejecutar servidor:

```bash
python run.py
```

- API disponible en: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs

## Estructura del Proyecto

```
momentum-tracker/
├── src/                    # Frontend React
│   ├── components/         # Componentes React
│   │   ├── ui/            # Componentes UI base
│   │   └── ...            # Componentes de la aplicación
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Cliente Supabase
│   ├── lib/               # Utilidades
│   └── pages/             # Páginas
├── backend/               # Backend FastAPI
│   ├── app/
│   │   ├── api/          # Endpoints API
│   │   │   ├── activities.py
│   │   │   ├── entries.py
│   │   │   ├── goals.py
│   │   │   └── reflections.py
│   │   ├── core/         # Configuración
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/       # Modelos Pydantic
│   │   │   └── schemas.py
│   │   └── main.py       # Aplicación FastAPI
│   ├── requirements.txt
│   └── run.py
└── supabase/             # Migraciones DB
```

## API Endpoints

### Activities

- `GET /api/activities` - Listar actividades
- `POST /api/activities` - Crear actividad
- `GET /api/activities/{id}` - Obtener actividad
- `DELETE /api/activities/{id}` - Eliminar actividad

### Daily Entries

- `GET /api/entries` - Listar entradas (filtros: activity_id, start_date, end_date)
- `POST /api/entries` - Crear/actualizar entrada
- `GET /api/entries/{id}` - Obtener entrada

### Weekly Goals

- `GET /api/goals` - Listar metas (filtro: week_start_date)
- `POST /api/goals` - Crear/actualizar meta

### Weekly Reflections

- `GET /api/reflections` - Listar reflexiones (filtro: week_start_date)
- `POST /api/reflections` - Crear/actualizar reflexión

## Base de Datos (Supabase)

Tablas:

- `activities` - Actividades a rastrear
- `daily_entries` - Registro diario de horas
- `weekly_goals` - Objetivos semanales
- `weekly_reflections` - Reflexiones semanales

## Desarrollo

Para desarrollo simultáneo:

1. Terminal 1: `npm run dev` (Frontend)
2. Terminal 2: `cd backend && python run.py` (Backend)

- `weekly_reflections` - Reflexiones semanales
