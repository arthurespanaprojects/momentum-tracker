from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import WeeklyGoal, WeeklyGoalCreate
from app.core.database import get_supabase

router = APIRouter()

@router.get("/", response_model=List[WeeklyGoal])
async def get_goals(week_start_date: str = None):
    """Get weekly goals, optionally filtered by week"""
    supabase = get_supabase()
    query = supabase.table("weekly_goals").select("*")
    
    if week_start_date:
        query = query.eq("week_start_date", week_start_date)
    
    response = query.order("created_at", desc=True).execute()
    return response.data

@router.post("/", response_model=WeeklyGoal)
async def create_or_update_goal(goal: WeeklyGoalCreate):
    """Create or update a weekly goal"""
    supabase = get_supabase()
    response = supabase.table("weekly_goals").upsert(goal.model_dump()).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save goal")
    
    return response.data[0]
