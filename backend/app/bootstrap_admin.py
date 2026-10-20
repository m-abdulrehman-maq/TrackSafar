"""Secure initial administrator bootstrap.

Run manually against the target environment:

    python -m app.bootstrap_admin admin@example.com "choose-a-strong-password"

Credentials come from arguments/environment only — never from source code,
seeds or Git. The script is idempotent: an existing profile is never
downgraded and an existing admin is reported without modification.
"""
import asyncio
import sys

from sqlalchemy import select

from app.auth import hash_password
from app.core.config import settings
from app.db.session import SessionLocal, init_db
from app.models import DevAuthUser, Profile, Role, new_id


async def bootstrap(email: str, password: str, full_name: str = "Administrator") -> int:
    if settings.auth_mode != "development" and len(password) < 12:
        print("error: password must be at least 12 characters for bootstrap", file=sys.stderr)
        return 2
    email = email.lower().strip()
    await init_db()
    async with SessionLocal() as db:
        existing = (await db.execute(select(Profile).where(Profile.email == email))).scalar_one_or_none()
        if existing is not None:
            if existing.role == Role.admin:
                print(f"already an administrator: {email}")
                return 0
            print(
                "refused: an application profile with this email already exists "
                f"(role={existing.role.value}); bootstrap never escalates existing accounts",
                file=sys.stderr,
            )
            return 1
        if settings.auth_mode == "development":
            user = DevAuthUser(id=new_id(), email=email, password_hash=hash_password(password))
            db.add(user)
            await db.flush()
            auth_user_id = user.id
        else:
            from app.integrations.identity import create_identity

            auth_user_id = await create_identity(db, email, password)
        profile = Profile(
            id=new_id(), auth_user_id=auth_user_id, full_name=full_name.strip(),
            email=email, role=Role.admin, is_active=True,
        )
        db.add(profile)
        await db.flush()
        from app.services.audit import record_audit

        await record_audit(db, actor=None, action="admin.bootstrap", entity_type="profile",
                           entity_id=profile.id, metadata={"email": email})
        await db.commit()
        print(f"administrator created: {email}")
        return 0


def main() -> None:
    if len(sys.argv) < 3:
        print("usage: python -m app.bootstrap_admin <email> <password> [full name]", file=sys.stderr)
        sys.exit(2)
    email, password = sys.argv[1], sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "Administrator"
    if password in ("changeme", "password", "admin", "admin123"):
        print("refused: weak bootstrap password", file=sys.stderr)
        sys.exit(2)
    sys.exit(asyncio.run(bootstrap(email, password, name)))


if __name__ == "__main__":
    main()
