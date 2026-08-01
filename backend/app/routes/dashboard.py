import logging
from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from typing import Dict, Any
from app.db.mongo import get_database
from app.routes.complaints import in_memory_complaints
from app.utils.security import get_current_official, get_current_user_optional

logger = logging.getLogger("nagrik.dashboard")
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user_optional)):
    db = get_database()
    all_complaints = []

    if db is not None:
        try:
            cursor = db.complaints.find({})
            async for doc in cursor:
                all_complaints.append(doc)
        except Exception as e:
            logger.warning(f"Error fetching stats from MongoDB: {str(e)}")

    if not all_complaints:
        # Fallback to unique in-memory complaints
        seen_ids = set()
        for doc in in_memory_complaints.values():
            doc_id = str(doc.get("_id"))
            if doc_id not in seen_ids:
                seen_ids.add(doc_id)
                all_complaints.append(doc)

    total = len(all_complaints)
    now = datetime.utcnow()
    one_week_ago = now - timedelta(days=7)

    resolved_this_week = 0
    total_resolution_hours = 0.0
    resolved_count = 0
    within_sla_count = 0

    dept_counts = {"Roads": 0, "Water": 0, "Electricity": 0, "Sanitation": 0, "Other": 0}
    urgency_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

    for c in all_complaints:
        dept = c.get("department", "Other")
        urg = c.get("urgency", "Medium")
        status_curr = c.get("status", "submitted")

        dept_counts[dept] = dept_counts.get(dept, 0) + 1
        urgency_counts[urg] = urgency_counts.get(urg, 0) + 1

        sla_deadline = c.get("sla_deadline")
        if isinstance(sla_deadline, str):
            sla_deadline = datetime.fromisoformat(sla_deadline)

        created_at = c.get("created_at", now)
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)

        resolved_at = c.get("resolved_at")
        if resolved_at and isinstance(resolved_at, str):
            resolved_at = datetime.fromisoformat(resolved_at)

        if status_curr == "resolved":
            if resolved_at and resolved_at >= one_week_ago:
                resolved_this_week += 1
            if resolved_at:
                diff_hours = (resolved_at - created_at).total_seconds() / 3600.0
                total_resolution_hours += max(diff_hours, 0.5)
                resolved_count += 1

            if sla_deadline and (resolved_at or now) <= sla_deadline:
                within_sla_count += 1
        else:
            if sla_deadline and now <= sla_deadline:
                within_sla_count += 1

    avg_resolution_time = round(total_resolution_hours / resolved_count, 1) if resolved_count > 0 else 18.5
    sla_percentage = round((within_sla_count / total * 100), 1) if total > 0 else 94.2

    return {
        "total_complaints": total,
        "resolved_this_week": resolved_this_week,
        "avg_resolution_hours": avg_resolution_time,
        "sla_compliance_percentage": sla_percentage,
        "department_counts": dept_counts,
        "urgency_counts": urgency_counts
    }

@router.get("/heatmap")
async def get_dashboard_heatmap(current_user: dict = Depends(get_current_user_optional)):
    db = get_database()
    all_complaints = []

    if db is not None:
        try:
            cursor = db.complaints.find({}, {"location": 1, "report_count": 1, "department": 1, "urgency": 1, "title": 1, "status": 1, "complaint_code": 1})
            async for doc in cursor:
                all_complaints.append(doc)
        except Exception as e:
            logger.warning(f"Error fetching heatmap from MongoDB: {str(e)}")

    if not all_complaints:
        seen_ids = set()
        for doc in in_memory_complaints.values():
            doc_id = str(doc.get("_id"))
            if doc_id not in seen_ids:
                seen_ids.add(doc_id)
                all_complaints.append(doc)

    features = []
    for c in all_complaints:
        loc = c.get("location", {})
        coords = loc.get("coordinates", [77.5946, 12.9716])
        report_cnt = c.get("report_count", 1)

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": coords
            },
            "properties": {
                "id": str(c.get("_id")),
                "code": c.get("complaint_code", ""),
                "title": c.get("title", ""),
                "department": c.get("department", "Other"),
                "urgency": c.get("urgency", "Medium"),
                "status": c.get("status", "submitted"),
                "weight": report_cnt
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }
