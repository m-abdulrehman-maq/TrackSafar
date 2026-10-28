"""Identity verification and trusted principal resolution.

Supabase Auth is the sole credential authority in deployed environments. The
development provider issues compatible JWTs and is hard-refused outside
development (see Settings.validate_security).
"""

from dataclasses import dataclass
from datetime import datetime, timezone

import bcrypt
import jwt

from app.core.config import settings
from app.core.errors import Forbidden, Unauthorized
from app.models import DevAuthUser, Profile, Role

ALGORITHM = "HS256"


@dataclass(frozen=True)
class Principal:
    auth_user_id: str
    profile_id: str
    email: str
    full_name: str
    role: Role
    is_active: bool


def _decode_token(token: str) -> dict:
    secret = settings.supabase_jwt_secret
    if not secret:
        raise Unauthorized("server identity verification is not configured")
    try:
        return jwt.decode(
            token, secret, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
        )
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("session expired") from exc
    except jwt.InvalidTokenError as exc:
        raise Unauthorized("invalid session token") from exc


async def verify_supabase_token(token: str) -> str:
    """Validate a Supabase-issued access token; return the provider subject (auth user id)."""
    claims = _decode_token(token)
    return str(claims["sub"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except (ValueError, Exception):
        return False


def issue_dev_token(profile: Profile, ttl_seconds: int | None = None) -> str:
    """Issue a development JWT with Supabase-compatible claims. Development only."""
    if settings.auth_mode != "development":
        raise Forbidden("development tokens are not available in this environment")
    ttl = ttl_seconds or settings.access_token_ttl_seconds
    now = datetime.now(timezone.utc)
    claims = {
        "sub": profile.auth_user_id,
        "email": profile.email,
        "role": "authenticated",
        "iss": "tracksafar-dev",
        "iat": int(now.timestamp()),
        "exp": int(now.timestamp()) + ttl,
    }
    secret = settings.supabase_jwt_secret or "tracksafar-development-secret-key-32bytes-min"
    return jwt.encode(claims, secret, algorithm=ALGORITHM)


async def resolve_principal(db, token: str) -> Principal:
    """Resolve the trusted, current profile for a provider identity.

    Role and activity always come from the server-side profile record — never
    from client-supplied claims or metadata.
    """
    if settings.auth_mode == "development":
        claims = _decode_token_or_dev(token)
        auth_user_id = str(claims["sub"])
    else:
        auth_user_id = await verify_supabase_token(token)

    from sqlalchemy import select

    profile = (
        await db.execute(select(Profile).where(Profile.auth_user_id == auth_user_id))
    ).scalar_one_or_none()
    if profile is None:
        raise Forbidden("no provisioned application profile for this account")
    if not profile.is_active:
        raise Forbidden("account is deactivated")
    return Principal(
        auth_user_id=profile.auth_user_id,
        profile_id=profile.id,
        email=profile.email,
        full_name=profile.full_name,
        role=profile.role,
        is_active=profile.is_active,
    )


def _decode_token_or_dev(token: str) -> dict:
    secret = settings.supabase_jwt_secret or "tracksafar-development-secret-key-32bytes-min"
    try:
        return jwt.decode(
            token, secret, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]}
        )
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("session expired") from exc
    except jwt.InvalidTokenError as exc:
        raise Unauthorized("invalid session token") from exc


async def authenticate_dev_credentials(db, email: str, password: str) -> Profile:
    """Development-only email/password authentication against the local store."""
    if settings.auth_mode != "development":
        raise Forbidden("password login is handled by the identity provider")
    from sqlalchemy import select

    user = (
        await db.execute(select(DevAuthUser).where(DevAuthUser.email == email.lower().strip()))
    ).scalar_one_or_none()
    if user is None or not check_password(password, user.password_hash):
        raise Unauthorized("invalid email or password")
    profile = (
        await db.execute(select(Profile).where(Profile.auth_user_id == user.id))
    ).scalar_one_or_none()
    if profile is None:
        raise Unauthorized("no provisioned application profile for this account")
    if not profile.is_active:
        raise Forbidden("account is deactivated")
    return profile


# --- role helpers -----------------------------------------------------------


def require_role(principal: Principal, *roles: Role) -> None:
    if principal.role not in roles:
        raise Forbidden("you do not have permission to perform this action")


def require_admin(principal: Principal) -> None:
    require_role(principal, Role.admin)


def require_driver(principal: Principal) -> None:
    require_role(principal, Role.driver)


def require_passenger(principal: Principal) -> None:
    require_role(principal, Role.passenger)


def require_authenticated(principal: Principal) -> None:
    if not principal.is_active:
        raise Forbidden("account is deactivated")
