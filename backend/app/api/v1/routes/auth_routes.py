from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, issue_dev_token, require_role
from app.auth.dependencies import current_principal
from app.core.config import settings
from app.db.session import get_db
from app.models import Role
from app.schemas.auth import (
    AuthConfig,
    LoginRequest,
    ProfileOut,
    ProfileUpdate,
    RegisterRequest,
    TokenResponse,
)
from app.services import people as people_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/config", response_model=AuthConfig)
async def auth_config() -> AuthConfig:
    return AuthConfig(
        auth_mode=settings.auth_mode,
        registration_enabled=True,
        password_login_enabled=settings.auth_mode == "development",
    )


@router.post("/register", response_model=ProfileOut, status_code=201)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    profile, _auth_id = await people_service.register_passenger(db, payload)
    return profile


@router.post("/dev/login", response_model=TokenResponse)
async def dev_login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Development-only credential exchange. Disabled when auth_mode=supabase."""
    profile, token = await people_service.dev_login(db, payload)
    return TokenResponse(access_token=token, expires_in=settings.access_token_ttl_seconds)


@router.get("/me", response_model=ProfileOut)
async def me(principal: Principal = Depends(current_principal),
             db: AsyncSession = Depends(get_db)):
    from app.repositories import queries as repo

    profile = await repo.get_profile_by_id(db, principal.profile_id)
    if profile is None:
        from app.core.errors import NotFound

        raise NotFound("profile not found")
    return profile


@router.patch("/me", response_model=ProfileOut)
async def update_me(payload: ProfileUpdate, principal: Principal = Depends(current_principal),
                    db: AsyncSession = Depends(get_db)):
    return await people_service.update_own_profile(db, principal, payload)


@router.get("/role-redirect")
async def role_redirect(principal: Principal = Depends(current_principal)) -> dict:
    target = {
        Role.passenger: "/passenger",
        Role.driver: "/driver",
        Role.admin: "/admin",
    }[principal.role]
    return {"role": principal.role.value, "target": target}
