"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(BACKEND_DIR / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "TrackSafar API"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # CORS: comma-separated origins. "*" is refused in production by validate_security().
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Database. Local development defaults to SQLite; production uses Supabase PostgreSQL.
    database_url: str = f"sqlite+aiosqlite:///{(BACKEND_DIR / 'tracksafar_dev.db').as_posix()}"
    db_echo: bool = False

    @field_validator("database_url", mode="after")
    @classmethod
    def _normalize_sqlite_path(cls, v: str) -> str:
        if v.startswith("sqlite+aiosqlite:///./"):
            rel_part = v.removeprefix("sqlite+aiosqlite:///./")
            abs_path = (BACKEND_DIR / rel_part).resolve().as_posix()
            return f"sqlite+aiosqlite:///{abs_path}"
        return v

    # Identity authority (Supabase Auth).
    # auth_mode="supabase"  -> validate provider-issued JWTs, proxy GoTrue (production default path).
    # auth_mode="development" -> local identity store; ONLY permitted when environment=development.
    auth_mode: Literal["supabase", "development"] = "development"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    # Shared secret used to verify Supabase JWTs (Project Settings -> API -> JWT Secret).
    supabase_jwt_secret: str = ""
    access_token_ttl_seconds: int = 3600

    # Operational thresholds
    location_stale_after_seconds: int = Field(default=120, ge=10, le=3600)
    location_max_future_skew_seconds: int = Field(default=60, ge=5, le=600)
    location_min_accuracy_m: float = Field(default=5000.0, ge=10.0)
    gps_max_batch_age_seconds: int = Field(default=300, ge=30)

    # ETA (provisional; M5 reviews the method against route evidence)
    eta_enabled: bool = False
    eta_assumed_speed_kmh: float = Field(default=22.0, ge=5.0, le=90.0)

    # WebSocket limits
    ws_auth_timeout_seconds: int = 10
    ws_max_subscriptions: int = 20
    ws_max_message_bytes: int = 4096

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def validate_security(self) -> None:
        """Refuse unsafe production configuration at startup."""
        if self.environment == "production":
            if self.auth_mode == "development":
                raise RuntimeError(
                    "auth_mode=development is not permitted when environment=production. "
                    "Configure Supabase Auth (SUPABASE_URL, SUPABASE_JWT_SECRET, "
                    "SUPABASE_SERVICE_ROLE_KEY)."
                )
            if not self.database_url.startswith("postgresql"):
                raise RuntimeError("production requires a PostgreSQL database_url")
            if "*" in self.cors_origin_list():
                raise RuntimeError("wildcard CORS origins are not permitted in production")
            if not self.supabase_jwt_secret and not self.supabase_url:
                raise RuntimeError("production requires Supabase JWT verification settings")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
