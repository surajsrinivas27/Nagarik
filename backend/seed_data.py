import asyncio
import random
import math
from datetime import datetime, timedelta
from app.config import settings
from app.db.mongo import connect_to_mongo, db_container, close_mongo_connection
from app.services.embedding_service import generate_text_embedding
from app.models.department import SLA_HOURS

BANGALORE_LOCATIONS = [
    {"area": "MG Road, Bengaluru", "lat": 12.9716, "lng": 77.5946},
    {"area": "Indiranagar 100ft Road, Bengaluru", "lat": 12.9784, "lng": 77.6412},
    {"area": "Koramangala 5th Block, Bengaluru", "lat": 12.9352, "lng": 77.6245},
    {"area": "Whitefield Main Road, Bengaluru", "lat": 12.9698, "lng": 77.7499},
    {"area": "Electronic City Phase 1, Bengaluru", "lat": 12.8399, "lng": 77.6649},
    {"area": "Hebbal Flyover, Bengaluru", "lat": 13.0358, "lng": 77.5970},
    {"area": "Jayanagar 4th Block, Bengaluru", "lat": 12.9250, "lng": 77.5938},
    {"area": "HSR Layout Sector 2, Bengaluru", "lat": 12.9116, "lng": 77.6474},
]

SEED_COMPLAINT_TEMPLATES = [
    {
        "title": "Large Pothole near Bus Stop causing Traffic Hazard",
        "description": "A massive deep pothole has formed near the main bus stop. Two two-wheelers skidded yesterday. Extremely dangerous during rain.",
        "department": "Roads",
        "urgency": "High",
        "ai_reasoning": "Pothole poses immediate accident risk on a high-density transit route.",
        "duplicates_to_create": 5
    },
    {
        "title": "Water Main Leak Flooding Pedestrian Walkway",
        "description": "Clean drinking water is bursting out of an underground supply line and flooding the sidewalk for 3 days.",
        "department": "Water",
        "urgency": "Critical",
        "ai_reasoning": "Clean water wastage and public flooding requires urgent utility intervention.",
        "duplicates_to_create": 3
    },
    {
        "title": "Uncollected Commercial Waste Accumulating on Corner",
        "description": "Garbage bags and organic waste piled up outside commercial complex. Foul odor and attracting stray animals.",
        "department": "Sanitation",
        "urgency": "Medium",
        "ai_reasoning": "Unmanaged waste accumulation creates public health concerns.",
        "duplicates_to_create": 4
    },
    {
        "title": "Flickering Streetlights on Dark Residential Alley",
        "description": "Three sequential streetlights have been dead for a week. The road is pitch dark at night, safety concern for women.",
        "department": "Electricity",
        "urgency": "High",
        "ai_reasoning": "Streetlight failure in residential zone impacts night safety.",
        "duplicates_to_create": 2
    },
    {
        "title": "Broken Drain Cover near School Entrance",
        "description": "Concrete slab covering stormwater drain is cracked open. Children could step in during evening school departure.",
        "department": "Roads",
        "urgency": "Critical",
        "ai_reasoning": "Open storm drain near school poses severe injury risk to children.",
        "duplicates_to_create": 3
    },
    {
        "title": "Low Voltage Power Fluctuation Damaging Appliances",
        "description": "Frequent voltage drops occurring every afternoon. Air conditioners and refrigerators tripping repeatedly.",
        "department": "Electricity",
        "urgency": "Medium",
        "ai_reasoning": "Voltage irregularity requires electrical grid phase balancing.",
        "duplicates_to_create": 2
    },
    {
        "title": "Sewage Overflow on Main Market Road",
        "description": "Sewage manhole overflowing onto shop entrances. High contamination risk and unbearable stench.",
        "department": "Water",
        "urgency": "Critical",
        "ai_reasoning": "Active sewage overflow poses immediate biohazard and health risk.",
        "duplicates_to_create": 4
    },
    {
        "title": "Fallen Tree Branch Blocking Lane",
        "description": "Heavy storm branch fell across narrow road blocking car access and tangling telephone wires.",
        "department": "Other",
        "urgency": "Low",
        "ai_reasoning": "Debris removal required for lane clearance.",
        "duplicates_to_create": 1
    }
]

STATUSES = ["submitted", "acknowledged", "in_progress", "resolved"]

def get_jittered_coordinates(lat: float, lng: float, radius_meters: float = 150.0):
    r_lat = (random.uniform(-1, 1) * radius_meters) / 111000.0
    r_lng = (random.uniform(-1, 1) * radius_meters) / (111000.0 * math.cos(math.radians(lat)))
    return round(lng + r_lng, 6), round(lat + r_lat, 6)

async def seed_database():
    print("Connecting to MongoDB for seeding...")
    await connect_to_mongo()
    db = db_container.db

    docs_to_insert = []
    code_idx = 100
    now = datetime.utcnow()

    for tmpl in SEED_COMPLAINT_TEMPLATES:
        dup_count = tmpl["duplicates_to_create"]
        base_loc = random.choice(BANGALORE_LOCATIONS)
        
        status = random.choice(STATUSES)
        created_days_ago = random.randint(1, 14)
        created_at = now - timedelta(days=created_days_ago, hours=random.randint(1, 23))
        
        sla_hours = SLA_HOURS.get(tmpl["urgency"], 72)
        sla_deadline = created_at + timedelta(hours=sla_hours)

        resolved_at = None
        if status == "resolved":
            resolved_at = created_at + timedelta(hours=random.randint(4, min(sla_hours, created_days_ago * 24)))

        code_idx += 1
        code = f"GRV-2026-{code_idx:05d}"
        lng, lat = get_jittered_coordinates(base_loc["lat"], base_loc["lng"], 80.0)

        combined = f"{tmpl['title']}\n{tmpl['description']}\nLocation: {base_loc['area']}"
        embedding = await generate_text_embedding(combined)

        history = [
            {
                "status": "submitted",
                "at": created_at,
                "note": "Complaint submitted by citizen and classified by AI engine."
            }
        ]
        if status in ["acknowledged", "in_progress", "resolved"]:
            history.append({
                "status": "acknowledged",
                "at": created_at + timedelta(hours=2),
                "note": f"Routing ticket to {tmpl['department']} department field engineer."
            })
        if status in ["in_progress", "resolved"]:
            history.append({
                "status": "in_progress",
                "at": created_at + timedelta(hours=8),
                "note": "Work order assigned to municipal repair crew. Operations underway."
            })
        if status == "resolved":
            history.append({
                "status": "resolved",
                "at": resolved_at,
                "note": "Inspection completed and issue fully resolved on site."
            })

        doc = {
            "_id": f"cmp_seed_{code_idx}",
            "complaint_code": code,
            "title": tmpl["title"],
            "description": tmpl["description"],
            "department": tmpl["department"],
            "urgency": tmpl["urgency"],
            "ai_reasoning": tmpl["ai_reasoning"],
            "status": status,
            "location": {"type": "Point", "coordinates": [lng, lat]},
            "address": base_loc["area"],
            "photo_url": None,
            "voice_transcript": tmpl["description"] if random.random() > 0.5 else None,
            "embedding": embedding,
            "report_count": dup_count,
            "reporter_ids": [f"user_{random.randint(100, 999)}" for _ in range(dup_count)],
            "sla_deadline": sla_deadline,
            "created_at": created_at,
            "updated_at": resolved_at or created_at,
            "resolution_note": "Inspection completed and issue resolved." if status == "resolved" else None,
            "resolved_at": resolved_at,
            "status_history": history
        }
        docs_to_insert.append(doc)

    for i in range(12):
        base_loc = random.choice(BANGALORE_LOCATIONS)
        dept = random.choice(["Roads", "Water", "Electricity", "Sanitation", "Other"])
        urg = random.choice(["Critical", "High", "Medium", "Low"])
        st = random.choice(STATUSES)
        
        created_days_ago = random.randint(1, 10)
        created_at = now - timedelta(days=created_days_ago)
        sla_deadline = created_at + timedelta(hours=SLA_HOURS[urg])
        resolved_at = created_at + timedelta(hours=12) if st == "resolved" else None

        code_idx += 1
        code = f"GRV-2026-{code_idx:05d}"
        lng, lat = get_jittered_coordinates(base_loc["lat"], base_loc["lng"], 250.0)

        title = f"{urg} Priority {dept} Issue in {base_loc['area'].split(',')[0]}"
        desc = f"Citizen reported {dept.lower()} defect needing attention near {base_loc['area']}."
        combined = f"{title}\n{desc}"
        embedding = await generate_text_embedding(combined)

        doc = {
            "_id": f"cmp_seed_{code_idx}",
            "complaint_code": code,
            "title": title,
            "description": desc,
            "department": dept,
            "urgency": urg,
            "ai_reasoning": f"Automated routing assigned {urg} priority to {dept} department.",
            "status": st,
            "location": {"type": "Point", "coordinates": [lng, lat]},
            "address": base_loc["area"],
            "photo_url": None,
            "voice_transcript": None,
            "embedding": embedding,
            "report_count": random.randint(1, 4),
            "reporter_ids": [f"user_{random.randint(100, 999)}"],
            "sla_deadline": sla_deadline,
            "created_at": created_at,
            "updated_at": resolved_at or created_at,
            "resolution_note": "Issue marked resolved by area engineer." if st == "resolved" else None,
            "resolved_at": resolved_at,
            "status_history": [
                {"status": "submitted", "at": created_at, "note": "Complaint filed."}
            ]
        }
        docs_to_insert.append(doc)

    if db is not None:
        try:
            await db.complaints.delete_many({})
            await db.complaints.insert_many(docs_to_insert)
            
            from app.utils.security import get_password_hash
            official_user = {
                "_id": "usr_official_admin",
                "name": "District Governance Administrator",
                "email": "official@nagrik.gov.in",
                "password_hash": get_password_hash("admin123"),
                "role": "official",
                "department": "Roads",
                "preferred_language": "en",
                "created_at": now
            }
            await db.users.delete_one({"email": "official@nagrik.gov.in"})
            await db.users.insert_one(official_user)
            print(f"Successfully seeded MongoDB Atlas with {len(docs_to_insert)} grievances!")
        except Exception as e:
            print(f"MongoDB Atlas seed bypass ({str(e)}). Populating in-memory fallback store...")
            from app.routes.complaints import in_memory_complaints
            for d in docs_to_insert:
                in_memory_complaints[d["_id"]] = d
                in_memory_complaints[d["complaint_code"]] = d
            print(f"Seeded {len(docs_to_insert)} grievances in local memory store.")
    else:
        from app.routes.complaints import in_memory_complaints
        for d in docs_to_insert:
            in_memory_complaints[d["_id"]] = d
            in_memory_complaints[d["complaint_code"]] = d
        print(f"Seeded {len(docs_to_insert)} grievances in local memory store.")

    total_reports = sum(d["report_count"] for d in docs_to_insert)
    print(f"Primary tickets: {len(docs_to_insert)} | Total citizen reports represented: {total_reports}")
    print("Default official login: official@nagrik.gov.in / admin123")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_database())
