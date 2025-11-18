from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import WeeklyReflection, WeeklyReflectionCreate
from app.core.database import get_supabase

router = APIRouter()

@router.get("/", response_model=List[WeeklyReflection])
async def get_reflections(week_start_date: str = None):
    """Get weekly reflections, optionally filtered by week"""
    supabase = get_supabase()
    query = supabase.table("weekly_reflections").select("*")
    
    if week_start_date:
        query = query.eq("week_start_date", week_start_date)
    
    response = query.order("created_at", desc=True).execute()
    return response.data

@router.post("/", response_model=WeeklyReflection)
async def create_or_update_reflection(reflection: WeeklyReflectionCreate):
    """Create or update a weekly reflection"""
    supabase = get_supabase()
    response = supabase.table("weekly_reflections").upsert(reflection.model_dump()).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save reflection")
    
    return response.data[0]
