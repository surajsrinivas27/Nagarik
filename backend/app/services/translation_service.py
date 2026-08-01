import logging
import json
from google import genai
from app.config import settings

logger = logging.getLogger("nagrik.translation")

FALLBACK_TRANSLATIONS = {
    "hi": {
        "acknowledged": "आपकी शिकायत दर्ज कर ली गई है और संबंधित विभाग को भेज दी गई है।",
        "in_progress": "आपकी शिकायत पर संबंधित अधिकारियों द्वारा कार्य शुरू कर दिया गया है।",
        "resolved": "आपकी शिकायत का सफलतापूर्वक समाधान कर दिया गया है। धन्यवाद!",
        "rejected": "आपकी शिकायत की समीक्षा की गई और इसे बंद कर दिया गया है।"
    },
    "kn": {
        "acknowledged": "ನಿಮ್ಮ ದೂರನ್ನು ಸ್ವೀಕರಿಸಲಾಗಿದೆ ಮತ್ತು ಸಂಬಂಧಪಟ್ಟ ಇಲಾಖೆಗೆ ರವಾನಿಸಲಾಗಿದೆ.",
        "in_progress": "ನಿಮ್ಮ ದೂರಿನ ಕುರಿತು ಸಂಬಂಧಪಟ್ಟ ಅಧಿಕಾರಿಗಳು ಕ್ರಮ ಕೈಗೊಳ್ಳುತ್ತಿದ್ದಾರೆ.",
        "resolved": "ನಿಮ್ಮ ದೂರನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪರಿಹರಿಸಲಾಗಿದೆ. ಧನ್ಯವಾದಗಳು!",
        "rejected": "ನಿಮ್ಮ ದೂರನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಮತ್ತು ಮುಕ್ತಾಯಗೊಳಿಸಲಾಗಿದೆ."
    }
}

async def generate_status_translations(status_name: str, note: str) -> dict:
    result = {
        "en": note if note else f"Status updated to '{status_name.replace('_', ' ').title()}'",
        "hi": FALLBACK_TRANSLATIONS.get("hi", {}).get(status_name, note),
        "kn": FALLBACK_TRANSLATIONS.get("kn", {}).get(status_name, note)
    }

    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "mock_gemini_key":
        return result

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = (
            f"Translate the following civic complaint status update into Hindi and Kannada.\n"
            f"Status: {status_name}\n"
            f"Official Note: {result['en']}\n\n"
            "Return ONLY a JSON object with keys 'hi' (Hindi text) and 'kn' (Kannada text)."
        )
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        raw_json = response.text.strip()
        # Clean json fence if present
        if "```json" in raw_json:
            raw_json = raw_json.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_json:
            raw_json = raw_json.split("```")[1].split("```")[0].strip()

        parsed = json.loads(raw_json)
        if "hi" in parsed:
            result["hi"] = str(parsed["hi"])
        if "kn" in parsed:
            result["kn"] = str(parsed["kn"])
    except Exception as e:
        logger.error(f"Gemini status translation error: {str(e)}")

    return result
