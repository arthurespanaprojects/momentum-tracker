from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import Activity, ActivityCreate
from app.core.database import get_supabase

router = APIRouter()

@router.get("/", response_model=List[Activity])
async def get_activities():
    """Get all active activities"""
    supabase = get_supabase()
    response = supabase.table("activities").select("*").eq("is_active", True).order("created_at").execute()
    return response.data

@router.post("/", response_model=Activity)
async def create_activity(activity: ActivityCreate):
    """Create a new activity"""
    supabase = get_supabase()
    response = supabase.table("activities").insert(activity.model_dump()).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create activity")
    
    return response.data[0]

@router.get("/{activity_id}", response_model=Activity)
async def get_activity(activity_id: str):
    """Get a specific activity"""
    supabase = get_supabase()
    response = supabase.table("activities").select("*").eq("id", activity_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return response.data[0]

@router.delete("/{activity_id}")
async def delete_activity(activity_id: str):
    """Soft delete an activity (set is_active to False)"""
    supabase = get_supabase()
    response = supabase.table("activities").update({"is_active": False}).eq("id", activity_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    return {"message": "Activity deleted successfully"}
