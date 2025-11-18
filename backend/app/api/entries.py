from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import DailyEntry, DailyEntryCreate
from app.core.database import get_supabase

router = APIRouter()

@router.get("/", response_model=List[DailyEntry])
async def get_entries(activity_id: str = None, start_date: str = None, end_date: str = None):
    """Get daily entries with optional filters"""
    supabase = get_supabase()
    query = supabase.table("daily_entries").select("*")
    
    if activity_id:
        query = query.eq("activity_id", activity_id)
    if start_date:
        query = query.gte("entry_date", start_date)
    if end_date:
        query = query.lte("entry_date", end_date)
    
    response = query.order("entry_date", desc=True).execute()
    return response.data

@router.post("/", response_model=DailyEntry)
async def create_or_update_entry(entry: DailyEntryCreate):
    """Create or update a daily entry"""
    supabase = get_supabase()
    response = supabase.table("daily_entries").upsert(entry.model_dump()).execute()
    
    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save entry")
    
    return response.data[0]

@router.get("/{entry_id}", response_model=DailyEntry)
async def get_entry(entry_id: str):
    """Get a specific daily entry"""
    supabase = get_supabase()
    response = supabase.table("daily_entries").select("*").eq("id", entry_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return response.data[0]
