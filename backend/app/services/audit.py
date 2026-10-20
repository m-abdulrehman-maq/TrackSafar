"""Append-only audit trail for privileged operations.

Metadata must stay sanitized: no passwords, tokens, or unnecessary personal
data (see rules.md section 3).
"""
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal
from app.models import AuditEvent, AuditOutcome


async def record_audit(
    db: AsyncSession,
    *,
    actor: Principal | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    outcome: AuditOutcome = AuditOutcome.success,
    metadata: dict | None = None,
    commit: bool = False,
) -> AuditEvent:
    event = AuditEvent(
        actor_profile_id=actor.profile_id if actor else None,
        actor_email=actor.email if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        outcome=outcome,
        metadata_json=metadata or None,
    )
    db.add(event)
    if commit:
        await db.commit()
    else:
        await db.flush()
    return event
