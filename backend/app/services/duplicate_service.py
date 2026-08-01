import logging
import math
from typing import Optional, Dict, Any, List
from app.db.mongo import get_database

logger = logging.getLogger("nagrik.duplicate")

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance in meters between two lat/lon points on Earth."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

async def find_duplicate_complaint(
    department: str,
    lat: float,
    lng: float,
    embedding: List[float],
    radius_meters: float = 300.0,
    similarity_threshold: float = 0.86
) -> Optional[Dict[str, Any]]:
    db = get_database()
    if db is None:
        return None

    try:
        # First attempt MongoDB $vectorSearch aggregation pipeline if vector index exists
        vector_pipeline = [
            {
                "$vectorSearch": {
                    "index": "complaint_vector_index",
                    "path": "embedding",
                    "queryVector": embedding,
                    "numCandidates": 50,
                    "limit": 10,
                    "filter": {
                        "department": department
                    }
                }
            },
            {
                "$match": {
                    "status": {"$ne": "resolved"},
                    "location": {
                        "$near": {
                            "$geometry": {
                                "type": "Point",
                                "coordinates": [lng, lat]
                            },
                            "$maxDistance": radius_meters
                        }
                    }
                }
            }
        ]

        cursor = db.complaints.aggregate(vector_pipeline)
        async for candidate in cursor:
            score = candidate.get("score", 0.9)
            if score >= similarity_threshold:
                logger.info(f"Duplicate complaint found via $vectorSearch: {candidate['complaint_code']} (score: {score})")
                return candidate
    except Exception as e:
        logger.debug(f"Atlas $vectorSearch pipeline fallback to manual geo+cosine check: {str(e)}")

    # Fallback / standard Geo+Cosine check: find active complaints in department within 300m radius
    try:
        query = {
            "department": department,
            "status": {"$ne": "resolved"},
            "location": {
                "$near": {
                    "$geometry": {
                        "type": "Point",
                        "coordinates": [lng, lat]
                    },
                    "$maxDistance": radius_meters
                }
            }
        }
        cursor = db.complaints.find(query)
        async for doc in cursor:
            doc_embedding = doc.get("embedding")
            if doc_embedding:
                sim = cosine_similarity(embedding, doc_embedding)
                if sim >= similarity_threshold:
                    logger.info(f"Duplicate complaint matched via Geo+Cosine: {doc['complaint_code']} (sim: {sim:.3f})")
                    return doc
            else:
                # If nearby same department issue exists within 150m, treat as match
                coords = doc.get("location", {}).get("coordinates", [0, 0])
                dist = haversine_distance_meters(lat, lng, coords[1], coords[0])
                if dist <= 150.0:
                    logger.info(f"Duplicate complaint matched via Geo proximity: {doc['complaint_code']} ({dist:.1f}m away)")
                    return doc
    except Exception as e:
        logger.warning(f"Error querying Mongo for duplicates: {str(e)}")

    return None
