import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb+srv://user:pass@cluster0.mongodb.net/nagrik_ai?retryWrites=true&w=majority"
    GROQ_API_KEY: str = "mock_groq_key"
    GEMINI_API_KEY: str = "mock_gemini_key"
    JWT_SECRET: str = "nagrikaijwtsecretkey2026_nagrik_app_sec"
    PORT: int = 8000
    ENV: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
