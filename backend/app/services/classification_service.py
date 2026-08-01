import logging
import json
import re
from groq import AsyncGroq
from app.config import settings

logger = logging.getLogger("nagrik.classification")

VALID_DEPARTMENTS = ["Roads", "Water", "Electricity", "Sanitation", "Other"]
VALID_URGENCIES = ["Critical", "High", "Medium", "Low"]

async def classify_complaint_text(combined_text: str) -> dict:
    fallback_result = {
        "title": combined_text[:50].strip() or "Civic Grievance Report",
        "department": "Roads",
        "urgency": "Medium",
        "ai_reasoning": "Classified automatically based on keywords."
    }

    # Keyword heuristics for fast fallback or mock mode
    low_text = combined_text.lower()
    if any(w in low_text for w in ["pothole", "road", "tar", "asphalt", "bridge"]):
        fallback_result["department"] = "Roads"
        fallback_result["title"] = "Road Maintenance & Pothole Issue"
        fallback_result["urgency"] = "High" if "deep" in low_text or "accident" in low_text else "Medium"
        fallback_result["ai_reasoning"] = "Road surface defect poses potential traffic hazard."
    elif any(w in low_text for w in ["water", "leak", "pipe", "drain", "sewage", "flood"]):
        fallback_result["department"] = "Water"
        fallback_result["title"] = "Water Pipeline & Drainage Problem"
        fallback_result["urgency"] = "Critical" if "burst" in low_text or "overflow" in low_text else "High"
        fallback_result["ai_reasoning"] = "Water leak or sewage blockage affecting public health."
    elif any(w in low_text for w in ["light", "electric", "power", "wire", "cable", "transformer"]):
        fallback_result["department"] = "Electricity"
        fallback_result["title"] = "Electrical Infrastructure Defect"
        fallback_result["urgency"] = "Critical" if "spark" in low_text or "wire" in low_text else "Medium"
        fallback_result["ai_reasoning"] = "Electrical fault requires immediate technical inspection."
    elif any(w in low_text for w in ["garbage", "trash", "waste", "clean", "smell", "dump"]):
        fallback_result["department"] = "Sanitation"
        fallback_result["title"] = "Uncollected Garbage & Sanitation Concern"
        fallback_result["urgency"] = "Medium"
        fallback_result["ai_reasoning"] = "Waste accumulation requires sanitation crew cleanup."

    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "mock_groq_key":
        return fallback_result

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        system_prompt = (
            "You are an AI governance routing engine for a civic grievance platform. "
            "Analyze the citizen complaint text and return ONLY a raw JSON object with 4 fields:\n"
            "- 'title': A short, clear 4-7 word title summarizing the complaint\n"
            "- 'department': Exactly one of ['Roads', 'Water', 'Electricity', 'Sanitation', 'Other']\n"
            "- 'urgency': Exactly one of ['Critical', 'High', 'Medium', 'Low']\n"
            "- 'ai_reasoning': One short sentence explaining why this urgency and department were assigned.\n\n"
            "Respond ONLY with valid JSON, no markdown formatting or extra text."
        )

        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Complaint details:\n{combined_text}"}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        raw_json = response.choices[0].message.content.strip()
        parsed = json.loads(raw_json)

        # Validate fields
        dept = parsed.get("department")
        if dept not in VALID_DEPARTMENTS:
            dept = fallback_result["department"]

        urgency = parsed.get("urgency")
        if urgency not in VALID_URGENCIES:
            urgency = fallback_result["urgency"]

        return {
            "title": str(parsed.get("title", fallback_result["title"])),
            "department": dept,
            "urgency": urgency,
            "ai_reasoning": str(parsed.get("ai_reasoning", fallback_result["ai_reasoning"]))
        }
    except Exception as e:
        logger.error(f"Groq LLM classification error: {str(e)}")
        return fallback_result
