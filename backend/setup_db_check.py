#!/usr/bin/env python3
"""
Script para configurar la base de datos ejecutando SQL en Supabase vía HTTP
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
# Necesitamos la service_role key para ejecutar SQL, pero no la tienes configurada
# Vamos a intentar con la anon key

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Variables de entorno no configuradas")
    exit(1)

print("🔧 Intentando configurar base de datos...")
print(f"📍 URL: {SUPABASE_URL}\n")

# Leer el SQL
sql_file = "../supabase/migrations/20251117000000_initial_schema.sql"
with open(sql_file, "r", encoding="utf-8") as f:
    sql_content = f.read()

print("📝 SQL a ejecutar:")
print("=" * 60)
print(sql_content[:500] + "..." if len(sql_content) > 500 else sql_content)
print("=" * 60)
print()

# Desafortunadamente, la ejecución de SQL DDL requiere service_role key
# que no está disponible en el cliente
print("⚠️  NOTA IMPORTANTE:")
print("=" * 60)
print("La API anon key no tiene permisos para crear tablas.")
print("Necesitas ejecutar el SQL manualmente en Supabase.\n")
print("🔗 Abre este link:")
print(f"   https://supabase.com/dashboard/project/{SUPABASE_URL.split('//')[1].split('.')[0]}/sql/new")
print()
print("📋 Luego copia y pega este SQL:\n")
print(sql_content)
print("\n" + "=" * 60)

# Intentar verificar si ya existen las tablas
try:
    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    result = supabase.table("activities").select("id").limit(1).execute()
    print("\n✅ ¡Las tablas YA EXISTEN! No necesitas hacer nada.")
    print(f"✅ Base de datos lista para usar")
    
except Exception as e:
    print(f"\n❌ Las tablas NO existen todavía.")
    print(f"   Error: {str(e)}\n")
    print("👉 Por favor, ejecuta el SQL manualmente siguiendo las instrucciones arriba.")
