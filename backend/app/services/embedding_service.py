import logging
import math
from typing import List
from google import genai
from app.config import settings

logger = logging.getLogger("nagrik.embedding")

def _generate_synthetic_768_embedding(text: str) -> List[float]:
    """Generates a deterministic 768-dimensional normalized float vector for fallback/mock testing."""
    vec = []
    text_hash = sum(ord(c) for c in text)
    for i in range(768):
        val = math.sin((text_hash + 1) * (i + 1) * 0.01)
        vec.append(val)
    # Normalize vector to unit length
    magnitude = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / magnitude, 6) for v in vec]

async def generate_text_embedding(text: str) -> List[float]:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "mock_gemini_key":
        return _generate_synthetic_768_embedding(text)

    # Try embedding models supported by google-genai
    for model_name in ["text-embedding-004", "gemini-embedding-001"]:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            result = client.models.embed_content(
                model=model_name,
                contents=text
            )
            if result.embedding and result.embedding.values:
                vals = [float(x) for x in result.embedding.values]
                # If vector length differs from 768, resize or pad/truncate to 768
                if len(vals) == 768:
                    return vals
                elif len(vals) > 768:
                    return vals[:768]
                else:
                    return vals + [0.0] * (768 - len(vals))
        except Exception as e:
            logger.debug(f"Gemini embedding model '{model_name}' failed: {str(e)}")

    return _generate_synthetic_768_embedding(text)
