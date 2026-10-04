from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Rahnuma AI"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = "sqlite:///./rahnuma.db"
    GEMINI_API_KEY: Optional[str] = None
    PRIMARY_GEMINI_MODEL: str = "gemini-3.8-flash"
    FAST_GEMINI_MODEL: str = "gemini-3.8-flash"
    
    # Groq LLM
    GROQ_API_KEY: Optional[str] = None
    PRIMARY_GROQ_MODEL: str = "qwen/qwen3.8-27b"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    # LMS
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None
    MOODLE_BASE_URL: Optional[str] = None
    MOODLE_TOKEN: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
