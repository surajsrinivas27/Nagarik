from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal, Any
from datetime import datetime

class GeoJSONPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

class StatusHistoryItem(BaseModel):
    status: str
    at: datetime = Field(default_factory=datetime.utcnow)
    note: str = ""
    translated_notes: Optional[Dict[str, str]] = None

class ComplaintBase(BaseModel):
    title: str
    description: str
    department: str = "Other"
    urgency: str = "Medium"
    ai_reasoning: Optional[str] = None
    location: GeoJSONPoint
    address: str = "Unknown Location"
    photo_url: Optional[str] = None
    voice_transcript: Optional[str] = None

class ComplaintCreateInput(BaseModel):
    description: str
    lat: float
    lng: float
    address: Optional[str] = "Specified Location"

class StatusUpdateInput(BaseModel):
    status: Literal["submitted", "acknowledged", "in_progress", "resolved", "rejected"]
    note: Optional[str] = ""

class ComplaintInDB(ComplaintBase):
    id: str = Field(alias="_id")
    complaint_code: str
    status: str = "submitted"
    embedding: Optional[List[float]] = None
    report_count: int = 1
    reporter_ids: List[str] = Field(default_factory=list)
    sla_deadline: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    status_history: List[StatusHistoryItem] = Field(default_factory=list)

class ComplaintResponse(BaseModel):
    id: str
    complaint_code: str
    title: str
    description: str
    department: str
    urgency: str
    ai_reasoning: Optional[str] = None
    status: str
    location: GeoJSONPoint
    address: str
    photo_url: Optional[str] = None
    voice_transcript: Optional[str] = None
    report_count: int = 1
    sla_deadline: datetime
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime
    status_history: List[StatusHistoryItem] = []
    merged_message: Optional[str] = None
