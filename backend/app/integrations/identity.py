"""Server-side identity provider adapters.

- SupabaseIdentityProvider talks to GoTrue (Supabase Auth REST) using the
  service-role key. Secrets stay server-side only.
- DevelopmentIdentityProvider manages the local dev credential store and is
  unusable when auth_mode=supabase.
"""
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.core.config import settings
from app.core.errors import Conflict, Unauthorized, ValidationFailed
from app.models import DevAuthUser, Profile, Role, new_id


class IdentityProviderError(Exception):
    pass


class SupabaseIdentityProvider:
    def __init__(self, base_url: str, service_role_key: str):
        self._base = base_url.rstrip("/")
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    async def create_user(self, email: str, password: str, email_confirm: bool = True) -> str:
        import httpx

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._base}/auth/v1/admin/users",
                headers=self._headers,
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": email_confirm,
                    "app_metadata": {"provider": "tracksafar"},
                },
            )
        if resp.status_code == 422:
            raise Conflict("an account with this email already exists")
        if resp.status_code >= 400:
            raise IdentityProviderError(f"identity provider rejected user creation ({resp.status_code})")
        data = resp.json()
        return str(data["id"])

    async def deactivate_user(self, auth_user_id: str) -> None:
        import httpx

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.patch(
                f"{self._base}/auth/v1/admin/users/{auth_user_id}",
                headers=self._headers,
                json={"ban_duration": "876600h"},
            )
        if resp.status_code >= 400:
            raise IdentityProviderError(f"identity provider rejected deactivation ({resp.status_code})")

    async def reactivate_user(self, auth_user_id: str) -> None:
        import httpx

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.patch(
                f"{self._base}/auth/v1/admin/users/{auth_user_id}",
                headers=self._headers,
                json={"ban_duration": "none"},
            )
        if resp.status_code >= 400:
            raise IdentityProviderError(f"identity provider rejected reactivation ({resp.status_code})")


class DevelopmentIdentityProvider:
    """Local credential store for development and automated tests only."""

    async def create_user(self, db: AsyncSession, email: str, password: str) -> str:
        email = email.lower().strip()
        from sqlalchemy import select

        existing = (await db.execute(
            select(DevAuthUser).where(DevAuthUser.email == email)
        )).scalar_one_or_none()
        if existing is not None:
            raise Conflict("an account with this email already exists")
        user = DevAuthUser(id=new_id(), email=email, password_hash=hash_password(password))
        db.add(user)
        await db.flush()
        return user.id

    async def set_password(self, db: AsyncSession, auth_user_id: str, password: str) -> None:
        user = await db.get(DevAuthUser, auth_user_id)
        if user is None:
            raise IdentityProviderError("dev identity not found")
        user.password_hash = hash_password(password)


def get_supabase_provider() -> SupabaseIdentityProvider:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise IdentityProviderError("Supabase administration is not configured")
    return SupabaseIdentityProvider(settings.supabase_url, settings.supabase_service_role_key)


async def create_identity(db: AsyncSession, email: str, password: str) -> str:
    """Create a provider identity. Returns auth_user_id. Used by registration and provisioning."""
    if settings.auth_mode == "development":
        return await DevelopmentIdentityProvider().create_user(db, email, password)
    provider = get_supabase_provider()
    try:
        auth_user_id = await provider.create_user(email, password)
    except Conflict:
        raise
    except IdentityProviderError as exc:
        raise ValidationFailed(str(exc)) from exc
    return auth_user_id


async def verify_local_password(db: AsyncSession, email: str, password: str) -> bool:
    from app.auth import check_password

    if settings.auth_mode != "development":
        raise Unauthorized("password login is handled by the identity provider")
    from sqlalchemy import select

    user = (await db.execute(
        select(DevAuthUser).where(DevAuthUser.email == email.lower().strip())
    )).scalar_one_or_none()
    return bool(user and check_password(password, user.password_hash))


async def profile_exists_for_email(db: AsyncSession, email: str) -> bool:
    from sqlalchemy import func, select

    count = await db.scalar(
        select(func.count()).select_from(Profile).where(Profile.email == email.lower().strip())
    )
    return bool(count)


def assert_dev_mode() -> None:
    if settings.auth_mode != "development":
        raise Unauthorized("this operation is only available in development mode")
