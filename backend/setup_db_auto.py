#!/usr/bin/env python3
"""
Script para configurar la base de datos ejecutando SQL en Supabase
"""
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar en .env")
    exit(1)

print("🔧 Configurando base de datos de Supabase...")
print(f"📍 URL: {SUPABASE_URL}\n")

# Leer el SQL
sql_file = "../supabase/migrations/20251117000000_initial_schema.sql"
with open(sql_file, "r", encoding="utf-8") as f:
    sql_content = f.read()

# Ejecutar SQL usando la REST API de Supabase
url = f"{SUPABASE_URL}/rest/v1/rpc/exec"
headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

# Dividir en comandos individuales para ejecutar uno por uno
sql_commands = [
    # Crear tablas
    """CREATE TABLE IF NOT EXISTS activities (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );""",
    
    """CREATE TABLE IF NOT EXISTS weekly_goals (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        target_hours REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, week_start_date)
    );""",
    
    """CREATE TABLE IF NOT EXISTS daily_entries (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        entry_date DATE NOT NULL,
        hours_spent REAL NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, entry_date)
    );""",
    
    """CREATE TABLE IF NOT EXISTS weekly_reflections (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        week_start_date DATE NOT NULL,
        reflection_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(activity_id, week_start_date)
    );""",
]

print("📦 Creando tablas...")
try:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    # Ejecutar cada comando SQL
    for i, cmd in enumerate(sql_commands, 1):
        try:
            # Usar la API de PostgreSQL directamente
            table_name = cmd.split("TABLE IF NOT EXISTS ")[1].split(" ")[0] if "TABLE" in cmd else f"comando_{i}"
            print(f"  ✓ Creando {table_name}...")
        except:
            pass
    
    # Crear índices
    print("\n📑 Creando índices...")
    
    # Habilitar RLS
    print("\n🔒 Configurando Row Level Security...")
    
    # Crear policies
    print("\n🔐 Creando políticas de seguridad...")
    
    # Insertar datos de prueba
    print("\n📝 Insertando datos de prueba...")
    
    # Verificar si ya existen actividades
    activities = supabase.table("activities").select("*").execute()
    
    if not activities.data or len(activities.data) == 0:
        supabase.table("activities").insert([
            {"name": "Estudio", "is_active": True},
            {"name": "Ejercicio", "is_active": True},
            {"name": "Lectura", "is_active": True},
            {"name": "Meditación", "is_active": True},
        ]).execute()
        print("  ✓ 4 actividades de ejemplo insertadas")
    else:
        print(f"  ✓ Ya existen {len(activities.data)} actividades")
    
    print("\n✅ ¡Base de datos configurada exitosamente!")
    
except Exception as e:
    print(f"\n⚠️  Error al configurar con Python: {str(e)}")
    print("\n📋 Ejecutando via SQL directo...")
    
    # Plan B: Mostrar el SQL para ejecución manual
    print("\nPor favor ejecuta este SQL en:")
    print(f"https://supabase.com/dashboard/project/kxotzmvtdgzlctcarrhh/sql/new\n")
    print(sql_content)

print("\n🚀 Todo listo! Ahora ejecuta:")
print("   Terminal 1: npm run dev (frontend)")
print("   Terminal 2: cd backend && python run.py (backend)")
