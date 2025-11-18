from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import activities, entries, goals, reflections, dashboard

app = FastAPI(
    title="Momentum Tracker API",
    description="API para seguimiento de hábitos y objetivos",
    version="1.0.0"
)

# Configurar CORS para permitir requests desde React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # Vite dev server
        "http://localhost:5173",  # Vite default port
        "http://localhost:3000",  # React default
        "https://*.vercel.app",   # Vercel deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(activities.router, prefix="/api/activities", tags=["Activities"])
app.include_router(entries.router, prefix="/api/entries", tags=["Daily Entries"])
app.include_router(goals.router, prefix="/api/goals", tags=["Weekly Goals"])
app.include_router(reflections.router, prefix="/api/reflections", tags=["Weekly Reflections"])

@app.get("/")
async def root():
    return {
        "message": "Momentum Tracker API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
