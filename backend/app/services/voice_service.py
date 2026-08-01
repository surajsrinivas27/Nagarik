import logging
import os
from groq import AsyncGroq
from app.config import settings

logger = logging.getLogger("nagrik.voice")

async def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.wav") -> str:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY == "mock_groq_key":
        logger.info("Using mock audio transcription (GROQ_API_KEY not configured)")
        return "Voice note: Pothole on main road causing heavy traffic and risk to commuters."

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        transcription = await client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-large-v3-turbo",
            response_format="json",
            temperature=0.0
        )
        return transcription.text
    except Exception as e:
        logger.error(f"Groq Whisper transcription error: {str(e)}")
        return f"Voice recording transcribed: Citizen reported issue via audio."
