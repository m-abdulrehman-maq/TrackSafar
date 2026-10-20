"""Registration and administrative account management."""
import re
import secrets
import string

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, Role, issue_dev_token
from app.core.config import settings
from app.core.errors import Conflict, Forbidden, NotFound, ValidationFailed
from app.integrations.identity import IdentityProviderError, create_identity, get_supabase_provider
from app.models import Driver, Profile, new_id
from app.repositories import queries as repo
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.auth import ProfileUpdate
from app.schemas.people import DriverProvisionRequest, PassengerUpdate
from app.services.audit import record_audit


def _normalize_email(email: str) -> str:
    return email.lower().strip()


async def register_passenger(
    db: AsyncSession, payload: RegisterRequest
) -> tuple[Profile, str]:
    """Public registration provisions passenger accounts only.

    The role is assigned server-side; no client field can influence it.
    """
    if not payload.accept_terms:
        raise ValidationFailed("you must accept the terms and privacy policy")
    email = _normalize_email(payload.email)
    if await repo.get_profile_by_email(db, email):
        raise Conflict("an account with this email already exists")
    if settings.auth_mode == "supabase":
        from app.auth import verify_supabase_token  # noqa: F401

    auth_user_id = await create_identity(db, email, payload.password)
    profile = Profile(
        id=new_id(),
        auth_user_id=auth_user_id,
        full_name=payload.full_name.strip(),
        email=email,
        role=Role.passenger,
        is_active=True,
    )
    db.add(profile)
    await db.flush()
    await record_audit(
        db, actor=None, action="passenger.register", entity_type="profile",
        entity_id=profile.id, metadata={"role": "passenger"},
    )
    await db.commit()
    return profile, auth_user_id


async def dev_login(db: AsyncSession, payload: LoginRequest) -> tuple[Profile, str]:
    from app.auth import authenticate_dev_credentials

    if settings.auth_mode != "development":
        raise Forbidden("password login is handled by the identity provider")
    profile = await authenticate_dev_credentials(db, payload.email, payload.password)
    token = issue_dev_token(profile)
    return profile, token


async def list_passengers(
    db: AsyncSession, *, search: str | None, active: bool | None, page: int, page_size: int
):
    return await repo.list_profiles(
        db, role=Role.passenger, search=search, active=active, page=page, page_size=page_size
    )


async def update_passenger(
    db: AsyncSession, actor: Principal, profile_id: str, payload: PassengerUpdate
) -> Profile:
    profile = await repo.get_profile_by_id(db, profile_id)
    if profile is None:
        raise NotFound("passenger not found")
    if profile.role != Role.passenger:
        raise Forbidden("role changes are not permitted through passenger management")
    changes: dict = {}
    if payload.full_name is not None:
        profile.full_name = payload.full_name.strip()
        changes["full_name"] = True
    if payload.phone is not None:
        profile.phone = payload.phone.strip() or None
        changes["phone"] = True
    if payload.is_active is not None:
        profile.is_active = payload.is_active
        changes["is_active"] = payload.is_active
    await record_audit(
        db, actor=actor, action="passenger.update", entity_type="profile",
        entity_id=profile.id, metadata=changes,
    )
    await db.commit()
    await db.refresh(profile)
    return profile


async def provision_driver(
    db: AsyncSession, actor: Principal, payload: DriverProvisionRequest
) -> tuple[Driver, str | None]:
    """Server-side driver provisioning. No public path exists."""
    email = _normalize_email(payload.email)
    if await repo.get_profile_by_email(db, email):
        raise Conflict("an account with this email already exists")
    code_dup = (await db.execute(
        select(Driver).where(Driver.driver_code == payload.driver_code)
    )).scalar_one_or_none()
    if code_dup is not None:
        raise Conflict("driver code already exists")

    temp_password = payload.temporary_password
    generated_temp: str | None = None
    if temp_password is None:
        generated_temp = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
        temp_password = generated_temp

    auth_user_id = await create_identity(db, email, temp_password)
    profile = Profile(
        id=new_id(), auth_user_id=auth_user_id, full_name=payload.full_name.strip(),
        email=email, phone=(payload.phone or None), role=Role.driver, is_active=True,
    )
    db.add(profile)
    await db.flush()
    driver = Driver(
        id=new_id(), profile_id=profile.id, driver_code=payload.driver_code.strip().upper(),
        license_number=payload.license_number, is_active=True,
    )
    db.add(driver)
    await db.flush()
    await record_audit(
        db, actor=actor, action="driver.provision", entity_type="driver",
        entity_id=driver.id, metadata={"email": email, "driver_code": driver.driver_code},
    )
    await db.commit()
    await db.refresh(driver)
    # Temporary password returned once, only in development mode.
    if settings.auth_mode == "development":
        return driver, generated_temp
    return driver, None


async def update_driver(
    db: AsyncSession, actor: Principal, driver_id: str, payload
) -> Driver:
    driver = await repo.get_driver_by_id(db, driver_id)
    if driver is None:
        raise NotFound("driver not found")
    profile = await repo.get_profile_by_id(db, driver.profile_id)
    if profile is None:
        raise NotFound("driver profile not found")
    changes: dict = {}
    if payload.driver_profile_active is not None:
        if not payload.driver_profile_active and await repo.active_trip_for_driver(db, driver_id):
            raise Conflict("driver has an active trip; end the trip before deactivation")
        profile.is_active = payload.driver_profile_active
        driver.is_active = payload.driver_profile_active
        changes["is_active"] = payload.driver_profile_active
    if payload.is_active is not None:
        driver.is_active = payload.is_active
        changes["driver_record_active"] = payload.is_active
    if payload.full_name is not None:
        profile.full_name = payload.full_name.strip()
        changes["full_name"] = True
    if payload.phone is not None:
        profile.phone = payload.phone.strip() or None
    if payload.license_number is not None:
        driver.license_number = payload.license_number
    await record_audit(
        db, actor=actor, action="driver.update", entity_type="driver",
        entity_id=driver.id, metadata=changes,
    )
    await db.commit()
    await db.refresh(driver)
    return driver


async def update_own_profile(
    db: AsyncSession, actor: Principal, payload: ProfileUpdate
) -> Profile:
    """Self-service profile update: name/phone only. Role and activity excluded."""
    profile = await repo.get_profile_by_id(db, actor.profile_id)
    if profile is None:
        raise NotFound("profile not found")
    if payload.full_name is not None:
        profile.full_name = payload.full_name.strip()
    if payload.phone is not None:
        profile.phone = payload.phone.strip() or None
    await db.commit()
    await db.refresh(profile)
    return profile
