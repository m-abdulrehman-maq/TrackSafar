"""FastAPI dependencies for identity and role enforcement."""

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, resolve_principal
from app.core.errors import Unauthorized
from app.models.database import get_db


def _extract_bearer(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise Unauthorized("missing bearer token")
    token = auth[len("Bearer ") :].strip()
    if not token:
        raise Unauthorized("missing bearer token")
    return token


async def current_principal(request: Request, db: AsyncSession = Depends(get_db)) -> Principal:
    token = _extract_bearer(request)
    return await resolve_principal(db, token)


async def optional_principal(request: Request, db: AsyncSession = Depends(get_db)):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[len("Bearer ") :].strip()
    if not token:
        return None
    return await resolve_principal(db, token)
