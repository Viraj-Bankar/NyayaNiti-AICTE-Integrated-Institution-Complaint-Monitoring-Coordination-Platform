
import os
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = (
        "NyayaNiti — AICTE Institution Complaint Monitoring "
        "& Coordination System"
    )
    API_V1_PREFIX: str = "/api"

    SECRET_KEY: str = "nyayaniti-dev-secret-key-32chars-minimum-fallback"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    DATABASE_URL: str = "sqlite:///./nyayaniti.db"

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://nyaya-niti-aicte-integrated-institu.vercel.app",
    ]

    SBERT_MODEL_NAME: str = "all-MiniLM-L6-v2"
    OVERLAP_HIGH_THRESHOLD: float = 0.82
    OVERLAP_REVIEW_THRESHOLD: float = 0.60
    RAPIDFUZZ_NAME_SIMILARITY_THRESHOLD: float = 78.0

    SURGE_Z_SCORE_THRESHOLD: float = 1.8
    SURGE_MIN_COMPLAINT_COUNT: int = 3
    SURGE_WINDOW_DAYS: int = 30

    SLA_CRITICAL_DAYS: int = 7
    SLA_HIGH_DAYS: int = 15
    SLA_MEDIUM_DAYS: int = 30
    SLA_LOW_DAYS: int = 45

    # Document & Evidence Storage Configuration (Filesystem / Persistent Disk Storage)
    DOCUMENT_STORAGE_BACKEND: str = "filesystem"
    DOCUMENT_STORAGE_ROOT: str = "./storage/docs"
    DOCUMENT_STORAGE_MAX_FILE_SIZE_MB: int = 3
    DOCUMENT_STORAGE_ALLOWED_EXTENSIONS: List[str] = [
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg",
        ".docx",
    ]
    # Assumed / configured storage quota threshold for zero-cost Neon tier (unverified estimate, not an empirical quota fact)
    DOCUMENT_STORAGE_ASSUMED_QUOTA_MB: int = 512

    # Database Migration and Seeding Controls
    AUTO_MIGRATE: bool = True
    AUTO_SEED: bool = True

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


env_mode = os.getenv("APP_ENV", "development").lower()
if env_mode in ("production", "staging"):
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32 or "fallback" in settings.SECRET_KEY.lower():
        raise RuntimeError(
            f"{env_mode.capitalize()} requires an explicit, strong SECRET_KEY of at least 32 characters. Cannot use default development fallback key."
        )
    if "sqlite" in settings.DATABASE_URL.lower() and "nyayaniti.db" in settings.DATABASE_URL.lower():
        raise RuntimeError(
            f"{env_mode.capitalize()} cannot execute against local development database 'nyayaniti.db'. Explicit remote/staging DATABASE_URL is required."
        )
