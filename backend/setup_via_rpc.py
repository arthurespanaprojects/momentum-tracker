#!/usr/bin/env python3
"""
Script para configurar la base de datos usando RPC functions en Supabase
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def setup_database():
    """Configura la base de datos ejecutando SQL via función RPC"""
    print("🔧 Configurando base de datos con service_role key...")
    print(f"📍 URL: {SUPABASE_URL}")
    
    # Crear cliente con service_role key
    supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    
    sql_statements = [
        # Crear tabla activities
        """
        CREATE TABLE IF NOT EXISTS activities (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # Crear tabla weekly_goals
        """
        CREATE TABLE IF NOT EXISTS weekly_goals (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
            week_start_date DATE NOT NULL,
            target_hours REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(activity_id, week_start_date)
        )
        """,
        # Crear tabla daily_entries
        """
        CREATE TABLE IF NOT EXISTS daily_entries (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
            entry_date DATE NOT NULL,
            hours_spent REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(activity_id, entry_date)
        )
        """,
        # Crear tabla weekly_reflections
        """
        CREATE TABLE IF NOT EXISTS weekly_reflections (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
            week_start_date DATE NOT NULL,
            reflection_text TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(activity_id, week_start_date)
        )
        """,
    ]
    
    try:
        # Intentar ejecutar usando rpc si existe alguna función
        print("\n📦 Intentando crear tablas...")
        
        # Probar si podemos ejecutar SQL directo (esto no funcionará, pero nos dará info)
        result = supabase.rpc('version', {}).execute()
        print(f"✓ Conexión exitosa: {result.data}")
        
        print("\n⚠️  Supabase no permite ejecutar DDL (CREATE TABLE) via API por seguridad.")
        print("Necesitas ejecutar el SQL manualmente en el dashboard.")
        
        return False
        
    except Exception as e:
        print(f"\n⚠️  Como esperado, no se puede ejecutar DDL via API: {str(e)}")
        print("\n💡 Supabase requiere que las migraciones se ejecuten manualmente por seguridad.")
        return False

if __name__ == "__main__":
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        print("❌ Error: Faltan variables de entorno")
        exit(1)
    
    setup_database()
    
    project_ref = SUPABASE_URL.split("//")[1].split(".")[0]
    
    print("\n" + "="*80)
    print("📋 SOLUCIÓN: Copia este SQL y ejecútalo manualmente")
    print(f"\n🔗 Link directo: https://supabase.com/dashboard/project/{project_ref}/sql/new")
    print("\n" + "="*80)
    
    sql = """CREATE TABLE IF NOT EXISTS activities (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL UNIQUE, is_active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS weekly_goals (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE, week_start_date DATE NOT NULL, target_hours REAL NOT NULL DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(activity_id, week_start_date)); CREATE TABLE IF NOT EXISTS daily_entries (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE, entry_date DATE NOT NULL, hours_spent REAL NOT NULL DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(activity_id, entry_date)); CREATE TABLE IF NOT EXISTS weekly_reflections (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE, week_start_date DATE NOT NULL, reflection_text TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE(activity_id, week_start_date)); CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_start_date); CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(entry_date); CREATE INDEX IF NOT EXISTS idx_weekly_reflections_week ON weekly_reflections(week_start_date); CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active); ALTER TABLE activities ENABLE ROW LEVEL SECURITY; ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY; ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY; CREATE POLICY "Enable all for activities" ON activities FOR ALL USING (true) WITH CHECK (true); CREATE POLICY "Enable all for weekly_goals" ON weekly_goals FOR ALL USING (true) WITH CHECK (true); CREATE POLICY "Enable all for daily_entries" ON daily_entries FOR ALL USING (true) WITH CHECK (true); CREATE POLICY "Enable all for weekly_reflections" ON weekly_reflections FOR ALL USING (true) WITH CHECK (true);"""
    
    print(sql)
    print("\n" + "="*80)
    print("\n✅ Después de ejecutar el SQL, corre:")
    print("   Terminal 1: npm run dev")
    print("   Terminal 2: cd backend && python run.py")
