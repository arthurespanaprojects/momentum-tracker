from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from app.core.database import get_supabase

router = APIRouter()

@router.get("/{week_start_date}")
async def get_dashboard(week_start_date: str):
    """
    Endpoint principal del dashboard.
    Carga todos los datos para una semana específica (debe ser lunes).
    
    Retorna:
    - Todas las actividades activas
    - Para cada actividad: meta, reflexión, 7 entradas diarias
    - Cálculos: realized_hours, percentage_complete
    - Resumen semanal total
    """
    supabase = get_supabase()
    
    # Validar que sea lunes
    try:
        week_date = datetime.strptime(week_start_date, "%Y-%m-%d").date()
        if week_date.weekday() != 0:  # 0 = Monday
            raise HTTPException(status_code=400, detail="week_start_date debe ser un lunes")
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
    
    # Calcular fechas de la semana
    week_dates = [(week_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    
    # Obtener actividades activas
    activities_response = supabase.table("activities").select("*").eq("is_active", True).order("created_at").execute()
    
    if not activities_response.data:
        return {
            "week_start_date": week_start_date,
            "week_dates": week_dates,
            "activities": [],
            "weekly_summary": {
                "total_target_hours": 0,
                "total_realized_hours": 0,
                "overall_percentage": 0
            }
        }
    
    activities = []
    total_target_hours = 0
    total_realized_hours = 0
    
    for activity in activities_response.data:
        activity_id = activity["id"]
        activity_type = activity.get("activity_type", "time")
        target_unit = activity.get("target_unit", "horas")
        
        # Obtener meta semanal
        goal_response = supabase.table("weekly_goals").select("*").eq("activity_id", activity_id).eq("week_start_date", week_start_date).execute()
        target_value = goal_response.data[0]["target_value"] if goal_response.data else 0
        
        # Obtener reflexión semanal
        reflection_response = supabase.table("weekly_reflections").select("*").eq("activity_id", activity_id).eq("week_start_date", week_start_date).execute()
        reflection_text = reflection_response.data[0]["reflection_text"] if reflection_response.data else ""
        
        # Obtener entradas diarias de la semana
        entries_response = supabase.table("daily_entries").select("*").eq("activity_id", activity_id).in_("entry_date", week_dates).execute()
        
        # Crear diccionario de entradas por fecha
        daily_values = {date: 0.0 for date in week_dates}
        for entry in entries_response.data:
            daily_values[entry["entry_date"]] = entry["value_amount"]
        
        # Calcular valor realizado
        realized_value = sum(daily_values.values())
        
        # Calcular porcentaje
        percentage_complete = (realized_value / target_value * 100) if target_value > 0 else 0
        
        # Acumular totales (solo para actividades de tiempo para el resumen)
        if activity_type == "time":
            total_target_hours += target_value
            total_realized_hours += realized_value
        
        activities.append({
            "activity_id": activity_id,
            "name": activity["name"],
            "activity_type": activity_type,
            "target_unit": target_unit,
            "target_value": target_value,
            "realized_value": realized_value,
            "percentage_complete": round(percentage_complete, 2),
            "reflection_text": reflection_text,
            "daily_values": daily_values
        })
    
    # Calcular porcentaje general
    overall_percentage = (total_realized_hours / total_target_hours * 100) if total_target_hours > 0 else 0
    
    return {
        "week_start_date": week_start_date,
        "week_dates": week_dates,
        "activities": activities,
        "weekly_summary": {
            "total_target_hours": total_target_hours,
            "total_realized_hours": total_realized_hours,
            "overall_percentage": round(overall_percentage, 2)
        }
    }
