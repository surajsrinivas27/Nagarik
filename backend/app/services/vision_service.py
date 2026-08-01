import logging
import base64
from google import genai
from google.genai import types
from app.config import settings

logger = logging.getLogger("nagrik.vision")

async def analyze_complaint_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "mock_gemini_key":
        logger.info("Using mock vision caption (GEMINI_API_KEY not configured)")
        return "Photo evidence shows damaged infrastructure on public street."

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                "Provide a one-sentence descriptive caption of the civic issue visible in this image (e.g. pothole, broken streetlight, garbage dump, water pipeline leak, fallen electrical cable)."
            ]
        )
        return response.text.strip() if response.text else "Photo evidence attached."
    except Exception as e:
        logger.error(f"Gemini vision error: {str(e)}")
        return "Photo attached depicting civic infrastructure issue."
