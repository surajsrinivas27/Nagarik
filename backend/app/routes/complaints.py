import logging
import os
import uuid
import base64
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query, status
from app.db.mongo import get_database
from app.models.complaint import ComplaintResponse, StatusUpdateInput, StatusHistoryItem, GeoJSONPoint
from app.models.department import SLA_HOURS
from app.services.voice_service import transcribe_audio_bytes
from app.services.vision_service import analyze_complaint_image
from app.services.classification_service import classify_complaint_text
from app.services.embedding_service import generate_text_embedding
from app.services.duplicate_service import find_duplicate_complaint
from app.services.translation_service import generate_status_translations
from app.routes.ws import manager as ws_manager
from app.utils.security import get_current_user_optional, get_current_official

logger = logging.getLogger("nagrik.complaints")
router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

# In-memory store fallback if MongoDB is not connected
in_memory_complaints = {}
code_counter = 147

def generate_complaint_code() -> str:
    global code_counter
    code_counter += 1
    return f"GRV-2026-{code_counter:05d}"

def is_overdue(sla_deadline: datetime, status_name: str) -> bool:
    if status_name == "resolved":
        return False
    return datetime.utcnow() > sla_deadline

@router.post("", response_model=dict)
async def submit_complaint(
    description: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    address: Optional[str] = Form("Specified Location"),
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    db = get_database()
    combined_parts = [description.strip()]
    voice_transcript = None
    photo_url = None

    # Step 1: Voice transcription if audio present
    if audio:
        try:
            audio_bytes = await audio.read()
            voice_transcript = await transcribe_audio_bytes(audio_bytes, audio.filename or "audio.wav")
            combined_parts.append(f"[Voice Transcript: {voice_transcript}]")
        except Exception as e:
            logger.warning(f"Audio processing error: {str(e)}")

    # Step 2: Vision captioning if photo present
    if photo:
        try:
            photo_bytes = await photo.read()
            mime_type = photo.content_type or "image/jpeg"
            vision_caption = await analyze_complaint_image(photo_bytes, mime_type)
            combined_parts.append(f"[Photo Caption: {vision_caption}]")
            
            # Save photo as base64 data url for self-contained hackathon display
            encoded = base64.b64encode(photo_bytes).decode('utf-8')
            photo_url = f"data:{mime_type};base64,{encoded}"
        except Exception as e:
            logger.warning(f"Photo processing error: {str(e)}")

    combined_text = "\n".join(combined_parts)

    # Step 3: Groq LLM Classification
    classification = await classify_complaint_text(combined_text)
    title = classification["title"]
    dept = classification["department"]
    urgency = classification["urgency"]
    ai_reasoning = classification["ai_reasoning"]

    # Step 4: Gemini Embedding Generation
    embedding = await generate_text_embedding(combined_text)

    reporter_id = current_user.get("sub") if current_user else f"anon_{uuid.uuid4().hex[:8]}"

    # Step 5: Duplicate Detection Check
    existing_duplicate = await find_duplicate_complaint(
        department=dept,
        lat=lat,
        lng=lng,
        embedding=embedding,
        radius_meters=300.0,
        similarity_threshold=0.86
    )

    now = datetime.utcnow()

    if existing_duplicate:
        # MERGE DUPLICATE
        dup_id = str(existing_duplicate["_id"])
        new_count = existing_duplicate.get("report_count", 1) + 1
        reporter_list = existing_duplicate.get("reporter_ids", [])
        if reporter_id not in reporter_list:
            reporter_list.append(reporter_id)

        update_fields = {
            "report_count": new_count,
            "reporter_ids": reporter_list,
            "updated_at": now
        }

        if db is not None:
            try:
                await db.complaints.update_one({"_id": existing_duplicate["_id"]}, {"$set": update_fields})
            except Exception as e:
                logger.warning(f"Failed to update duplicate in MongoDB: {str(e)}")

        existing_duplicate["report_count"] = new_count
        in_memory_complaints[dup_id] = existing_duplicate

        # Broadcast via WebSocket
        merged_event = {
            "event": "status_update",
            "data": {
                "id": dup_id,
                "complaint_code": existing_duplicate["complaint_code"],
                "report_count": new_count,
                "department": dept,
                "urgency": urgency,
                "title": title
            }
        }
        await ws_manager.broadcast(merged_event)

        return {
            "complaint_code": existing_duplicate["complaint_code"],
            "title": existing_duplicate["title"],
            "department": existing_duplicate["department"],
            "urgency": existing_duplicate["urgency"],
            "ai_reasoning": existing_duplicate.get("ai_reasoning", ai_reasoning),
            "sla_deadline": existing_duplicate.get("sla_deadline", now + timedelta(hours=72)).isoformat(),
            "report_count": new_count,
            "is_merged": True,
            "merged_message": f"This grievance matches an existing report near your location. {new_count} citizens have now reported this issue!"
        }

    # CREATE NEW COMPLAINT
    complaint_code = generate_complaint_code()
    sla_hours = SLA_HOURS.get(urgency, 72)
    sla_deadline = now + timedelta(hours=sla_hours)
    doc_id = f"cmp_{uuid.uuid4().hex[:12]}"

    new_doc = {
        "_id": doc_id,
        "complaint_code": complaint_code,
        "title": title,
        "description": description,
        "department": dept,
        "urgency": urgency,
        "ai_reasoning": ai_reasoning,
        "status": "submitted",
        "location": {"type": "Point", "coordinates": [lng, lat]},
        "address": address,
        "photo_url": photo_url,
        "voice_transcript": voice_transcript,
        "embedding": embedding,
        "report_count": 1,
        "reporter_ids": [reporter_id],
        "sla_deadline": sla_deadline,
        "created_at": now,
        "updated_at": now,
        "resolution_note": None,
        "resolved_at": None,
        "status_history": [
            {
                "status": "submitted",
                "at": now,
                "note": "Complaint submitted by citizen and classified by Nagrik AI engine."
            }
        ]
    }

    if db is not None:
        try:
            await db.complaints.insert_one(new_doc)
        except Exception as e:
            logger.warning(f"Failed to insert complaint in Mongo Atlas: {str(e)}")

    in_memory_complaints[doc_id] = new_doc
    in_memory_complaints[complaint_code] = new_doc

    # Step 6: Broadcast new complaint over WebSocket
    ws_event = {
        "event": "new_complaint",
        "data": {
            "id": doc_id,
            "complaint_code": complaint_code,
            "title": title,
            "department": dept,
            "urgency": urgency,
            "status": "submitted",
            "address": address,
            "lat": lat,
            "lng": lng,
            "created_at": now.isoformat(),
            "report_count": 1
        }
    }
    await ws_manager.broadcast(ws_event)

    return {
        "complaint_code": complaint_code,
        "title": title,
        "department": dept,
        "urgency": urgency,
        "ai_reasoning": ai_reasoning,
        "sla_deadline": sla_deadline.isoformat(),
        "report_count": 1,
        "is_merged": False,
        "merged_message": "Your grievance has been successfully submitted and routed to the department."
    }

@router.get("/{complaint_code}", response_model=ComplaintResponse)
async def get_complaint_by_code(complaint_code: str):
    db = get_database()
    doc = None
    code_upper = complaint_code.strip().upper()

    if db is not None:
        try:
            doc = await db.complaints.find_one({"complaint_code": code_upper})
        except Exception:
            pass

    if not doc:
        doc = in_memory_complaints.get(code_upper)

    if not doc:
        raise HTTPException(status_code=404, detail=f"Complaint with code '{code_upper}' not found.")

    sla = doc.get("sla_deadline", datetime.utcnow())
    if isinstance(sla, str):
        sla = datetime.fromisoformat(sla)

    created = doc.get("created_at", datetime.utcnow())
    if isinstance(created, str):
        created = datetime.fromisoformat(created)

    updated = doc.get("updated_at", datetime.utcnow())
    if isinstance(updated, str):
        updated = datetime.fromisoformat(updated)

    status_curr = doc.get("status", "submitted")

    return ComplaintResponse(
        id=str(doc.get("_id")),
        complaint_code=doc.get("complaint_code"),
        title=doc.get("title", "Civic Grievance"),
        description=doc.get("description", ""),
        department=doc.get("department", "Other"),
        urgency=doc.get("urgency", "Medium"),
        ai_reasoning=doc.get("ai_reasoning"),
        status=status_curr,
        location=GeoJSONPoint(**doc.get("location", {"type": "Point", "coordinates": [77.5946, 12.9716]})),
        address=doc.get("address", "Specified Location"),
        photo_url=doc.get("photo_url"),
        voice_transcript=doc.get("voice_transcript"),
        report_count=doc.get("report_count", 1),
        sla_deadline=sla,
        is_overdue=is_overdue(sla, status_curr),
        created_at=created,
        updated_at=updated,
        status_history=[StatusHistoryItem(**item) for item in doc.get("status_history", [])]
    )

@router.get("", response_model=List[ComplaintResponse])
async def list_complaints(
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    urgency: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    official: dict = Depends(get_current_official)
):
    db = get_database()
    results = []

    if db is not None:
        try:
            query = {}
            if department:
                query["department"] = department
            if status_filter:
                query["status"] = status_filter
            if urgency:
                query["urgency"] = urgency

            cursor = db.complaints.find(query).sort([("created_at", -1)]).limit(limit)
            async for doc in cursor:
                results.append(doc)
        except Exception as e:
            logger.warning(f"Error fetching complaints from Mongo: {str(e)}")

    if not results:
        # In-memory fallback docs
        for k, doc in in_memory_complaints.items():
            if not k.startswith("GRV-"): # Avoid duplicates stored under code & id
                match = True
                if department and doc.get("department") != department:
                    match = False
                if status_filter and doc.get("status") != status_filter:
                    match = False
                if urgency and doc.get("urgency") != urgency:
                    match = False
                if match and doc not in results:
                    results.append(doc)

    formatted = []
    for doc in results[:limit]:
        sla = doc.get("sla_deadline", datetime.utcnow())
        if isinstance(sla, str):
            sla = datetime.fromisoformat(sla)
        created = doc.get("created_at", datetime.utcnow())
        if isinstance(created, str):
            created = datetime.fromisoformat(created)
        updated = doc.get("updated_at", datetime.utcnow())
        if isinstance(updated, str):
            updated = datetime.fromisoformat(updated)
        status_curr = doc.get("status", "submitted")

        formatted.append(
            ComplaintResponse(
                id=str(doc.get("_id")),
                complaint_code=doc.get("complaint_code"),
                title=doc.get("title", "Civic Grievance"),
                description=doc.get("description", ""),
                department=doc.get("department", "Other"),
                urgency=doc.get("urgency", "Medium"),
                ai_reasoning=doc.get("ai_reasoning"),
                status=status_curr,
                location=GeoJSONPoint(**doc.get("location", {"type": "Point", "coordinates": [77.5946, 12.9716]})),
                address=doc.get("address", "Specified Location"),
                photo_url=doc.get("photo_url"),
                voice_transcript=doc.get("voice_transcript"),
                report_count=doc.get("report_count", 1),
                sla_deadline=sla,
                is_overdue=is_overdue(sla, status_curr),
                created_at=created,
                updated_at=updated,
                status_history=[StatusHistoryItem(**item) for item in doc.get("status_history", [])]
            )
        )
    return formatted

@router.patch("/{id}/status", response_model=dict)
async def update_complaint_status(
    id: str,
    update_data: StatusUpdateInput,
    official: dict = Depends(get_current_official)
):
    db = get_database()
    now = datetime.utcnow()
    doc = None

    if db is not None:
        try:
            doc = await db.complaints.find_one({"_id": id})
            if not doc:
                doc = await db.complaints.find_one({"complaint_code": id})
        except Exception:
            pass

    if not doc:
        doc = in_memory_complaints.get(id)

    if not doc:
        raise HTTPException(status_code=404, detail="Complaint not found")

    new_status = update_data.status
    note_text = update_data.note.strip() if update_data.note else f"Status set to {new_status}"

    # Generate multilingual status update notifications via Gemini
    translations = await generate_status_translations(new_status, note_text)

    history_item = {
        "status": new_status,
        "at": now,
        "note": note_text,
        "translated_notes": translations
    }

    history = doc.get("status_history", [])
    history.append(history_item)

    update_fields = {
        "status": new_status,
        "updated_at": now,
        "status_history": history
    }

    if new_status == "resolved":
        update_fields["resolution_note"] = note_text
        update_fields["resolved_at"] = now

    if db is not None:
        try:
            await db.complaints.update_one({"_id": doc["_id"]}, {"$set": update_fields})
        except Exception as e:
            logger.warning(f"Error updating Mongo status: {str(e)}")

    doc.update(update_fields)
    in_memory_complaints[str(doc["_id"])] = doc

    # Broadcast over WebSocket
    ws_event = {
        "event": "status_update",
        "data": {
            "id": str(doc["_id"]),
            "complaint_code": doc["complaint_code"],
            "status": new_status,
            "note": note_text,
            "translations": translations,
            "updated_at": now.isoformat()
        }
    }
    await ws_manager.broadcast(ws_event)

    return {
        "status": "ok",
        "complaint_code": doc["complaint_code"],
        "new_status": new_status,
        "translations": translations
    }
