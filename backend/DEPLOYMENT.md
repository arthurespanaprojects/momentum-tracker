# Momentum Tracker - FastAPI Backend Deployment

Para deployar el backend FastAPI en Vercel, necesitas:

## Opción 1: Vercel (Serverless)

1. Instalar Vercel CLI:

```bash
npm i -g vercel
```

2. Crear `vercel.json` en el directorio `backend/`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app/main.py"
    }
  ]
}
```

3. Deploy:

```bash
cd backend
vercel
```

## Opción 2: Railway / Render (Recomendado para FastAPI)

Estas plataformas son mejores para FastAPI que Vercel.

### Railway:

1. Conecta tu repo de GitHub
2. Selecciona el directorio `backend/`
3. Railway detectará automáticamente Python

### Render:

1. Conecta tu repo
2. Tipo de servicio: Web Service
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Variables de Entorno

Configura en el panel de tu plataforma:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `ENVIRONMENT=production`

## Frontend (.env)

Actualiza tu `.env` frontend con la URL del backend deployado:

```
VITE_API_URL=https://tu-backend.railway.app
```
