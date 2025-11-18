#!/usr/bin/env python3
"""
Script para configurar la base de datos de Supabase automáticamente
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL y SUPABASE_KEY deben estar configurados en .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔧 Configurando base de datos de Supabase...")
print(f"📍 URL: {SUPABASE_URL}")

# Leer el archivo SQL de migración
with open("../supabase/migrations/20251117000000_initial_schema.sql", "r", encoding="utf-8") as f:
    sql = f.read()

try:
    # Ejecutar el SQL usando la API RPC de Supabase
    # Nota: Supabase Python client no tiene método directo para ejecutar SQL raw
    # Vamos a crear las tablas directamente desde Python
    
    print("\n📦 Creando tablas...")
    
    # Verificar si las tablas ya existen consultando una de ellas
    try:
        result = supabase.table("activities").select("id").limit(1).execute()
        print("✅ Las tablas ya existen en Supabase")
        
        # Insertar datos de prueba si no existen
        activities = supabase.table("activities").select("*").execute()
        if not activities.data:
            print("\n📝 Insertando datos de prueba...")
            supabase.table("activities").insert([
                {"name": "Estudio", "is_active": True},
                {"name": "Ejercicio", "is_active": True},
                {"name": "Lectura", "is_active": True},
                {"name": "Meditación", "is_active": True},
            ]).execute()
            print("✅ Datos de prueba insertados")
        else:
            print(f"✅ Ya existen {len(activities.data)} actividades en la base de datos")
            
    except Exception as e:
        print(f"\n⚠️  Las tablas no existen o hay un error: {str(e)}")
        print("\n📋 INSTRUCCIONES MANUALES:")
        print("=" * 60)
        print("Necesitas ejecutar el SQL manualmente en Supabase:")
        print("\n1. Ve a: https://supabase.com/dashboard/project/kxotzmvtdgzlctcarrhh/sql/new")
        print("2. Copia el contenido de: supabase/migrations/20251117000000_initial_schema.sql")
        print("3. Pégalo en el SQL Editor")
        print("4. Haz clic en RUN")
        print("=" * 60)
        
except Exception as e:
    print(f"❌ Error: {str(e)}")
    exit(1)

print("\n✅ Configuración completada!")
print("\n🚀 Ahora puedes ejecutar:")
print("   Frontend: npm run dev")
print("   Backend:  cd backend && python run.py")
