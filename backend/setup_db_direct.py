#!/usr/bin/env python3
"""
Script para configurar la base de datos usando psycopg2 directamente
"""
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "")

if not DB_PASSWORD:
    print("❌ Error: SUPABASE_DB_PASSWORD no está configurada en .env")
    print("Agrega: SUPABASE_DB_PASSWORD=tu_password")
    exit(1)

# Extraer el project_id de la URL
project_id = SUPABASE_URL.split("//")[1].split(".")[0]

# Construir connection string de PostgreSQL
conn_string = f"postgresql://postgres:{DB_PASSWORD}@db.{project_id}.supabase.co:5432/postgres"

print("🔧 Configurando base de datos de Supabase...")
print(f"📍 Proyecto: {project_id}\n")

# Leer el SQL
sql_file = "../supabase/migrations/20251117000000_initial_schema.sql"
with open(sql_file, "r", encoding="utf-8") as f:
    sql_content = f.read()

try:
    import psycopg2
    print("✓ psycopg2 encontrado")
except ImportError:
    print("❌ psycopg2 no está instalado")
    print("📦 Instalando psycopg2-binary...")
    import subprocess
    subprocess.check_call(["pip", "install", "psycopg2-binary"])
    import psycopg2

try:
    # Conectar a la base de datos
    print("🔌 Conectando a PostgreSQL...")
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("✓ Conectado exitosamente")
    print("\n📦 Ejecutando SQL...")
    
    # Ejecutar el SQL
    cursor.execute(sql_content)
    
    print("✓ Tablas creadas")
    print("✓ Índices creados")
    print("✓ RLS habilitado")
    print("✓ Políticas configuradas")
    
    # Insertar datos de prueba
    print("\n📝 Insertando datos de prueba...")
    cursor.execute("""
        INSERT INTO activities (name, is_active) VALUES
        ('Estudio', true),
        ('Ejercicio', true),
        ('Lectura', true),
        ('Meditación', true)
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Verificar
    cursor.execute("SELECT COUNT(*) FROM activities;")
    count = cursor.fetchone()[0]
    print(f"✓ {count} actividades en la base de datos")
    
    cursor.close()
    conn.close()
    
    print("\n✅ ¡Base de datos configurada exitosamente!\n")
    print("🚀 Ahora puedes ejecutar:")
    print("   Terminal 1: npm run dev")
    print("   Terminal 2: cd backend && python run.py")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}\n")
    print("📋 Por favor ejecuta el SQL manualmente en:")
    print(f"https://supabase.com/dashboard/project/{project_id}/sql/new")
