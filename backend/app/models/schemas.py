from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal

class ActivityBase(BaseModel):
    name: str
    is_active: bool = True
    activity_type: Literal["time", "count"] = "time"
    target_unit: str = "horas"

class ActivityCreate(ActivityBase):
    pass

class Activity(ActivityBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class DailyEntryBase(BaseModel):
    activity_id: str
    entry_date: str
    value_amount: float  # Changed from hours_spent to support both time and count

class DailyEntryCreate(DailyEntryBase):
    pass

class DailyEntry(DailyEntryBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class WeeklyGoalBase(BaseModel):
    activity_id: str
    week_start_date: str
    target_value: float  # Changed from target_hours to support both time and count

class WeeklyGoalCreate(WeeklyGoalBase):
    pass

class WeeklyGoal(WeeklyGoalBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class WeeklyReflectionBase(BaseModel):
    activity_id: str
    week_start_date: str
    reflection_text: str

class WeeklyReflectionCreate(WeeklyReflectionBase):
    pass

class WeeklyReflection(WeeklyReflectionBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
