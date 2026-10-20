"""System notices, operational incidents and per-user notifications."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, require_admin
from app.core.errors import Forbidden, NotFound, ValidationFailed
from app.models import (
    AlertAudience,
    Trip,
    IncidentStatus,
    Notification,
    OperationalIncident,
    Profile,
    Role,
    SystemAlert,
    new_id,
)
from app.repositories import queries as repo
from app.services.audit import record_audit


async def create_alert(db: AsyncSession, actor: Principal, payload) -> SystemAlert:
    require_admin(actor)
    alert = SystemAlert(
        id=new_id(), title=payload.title.strip(), body=payload.body.strip(),
        severity=payload.severity, audience=payload.audience,
        is_published=payload.is_published, expires_at=payload.expires_at,
        created_by=actor.profile_id,
    )
    db.add(alert)
    await db.flush()
    await record_audit(db, actor=actor, action="alert.create", entity_type="system_alert",
                       entity_id=alert.id, metadata={"audience": payload.audience.value})
    await db.commit()
    await db.refresh(alert)
    return alert


async def update_alert(db: AsyncSession, actor: Principal, alert_id: str, payload) -> SystemAlert:
    require_admin(actor)
    alert = await db.get(SystemAlert, alert_id)
    if alert is None:
        raise NotFound("notice not found")
    for field in ("title", "body", "severity", "audience", "is_published", "expires_at"):
        value = getattr(payload, field, None)
        if value is not None:
            setattr(alert, field, value)
    await record_audit(db, actor=actor, action="alert.update", entity_type="system_alert",
                       entity_id=alert.id, metadata={"audience": alert.audience.value,
                                                     "published": alert.is_published})
    await db.commit()
    await db.refresh(alert)
    return alert


async def visible_alerts_for(db: AsyncSession, actor: Principal) -> list[SystemAlert]:
    """Audience enforcement mirrors the backend permission model."""
    now = datetime.now(timezone.utc)
    q = select(SystemAlert).where(SystemAlert.is_published.is_(True))
    if actor.role == Role.passenger:
        allowed = [AlertAudience.all_authenticated, AlertAudience.passengers]
    elif actor.role == Role.driver:
        allowed = [AlertAudience.all_authenticated, AlertAudience.drivers]
    else:
        allowed = list(AlertAudience)
    q = q.where(SystemAlert.audience.in_(allowed))
    rows = await db.execute(q.order_by(SystemAlert.created_at.desc()).limit(50))
    return [a for a in rows.scalars().all() if a.expires_at is None or a.expires_at > now]


async def create_incident(db: AsyncSession, actor: Principal, payload) -> OperationalIncident:
    require_admin(actor)
    if payload.trip_id:
        trip = await db.get(Trip, payload.trip_id)
        if trip is None:
            raise ValidationFailed("trip reference does not exist")
    incident = OperationalIncident(
        id=new_id(), title=payload.title.strip(), description=payload.description.strip(),
        severity=payload.severity, trip_id=payload.trip_id, bus_id=payload.bus_id,
        route_id=payload.route_id, reported_by=actor.profile_id,
    )
    db.add(incident)
    await db.flush()
    await record_audit(db, actor=actor, action="incident.create", entity_type="incident",
                       entity_id=incident.id)
    await db.commit()
    await db.refresh(incident)
    return incident


async def update_incident(db: AsyncSession, actor: Principal, incident_id: str, payload) -> OperationalIncident:
    require_admin(actor)
    incident = await db.get(OperationalIncident, incident_id)
    if incident is None:
        raise NotFound("incident not found")
    if payload.title is not None:
        incident.title = payload.title.strip()
    if payload.description is not None:
        incident.description = payload.description.strip()
    if payload.severity is not None:
        incident.severity = payload.severity
    if payload.status is not None:
        incident.status = payload.status
        if payload.status == IncidentStatus.resolved:
            incident.resolved_at = datetime.now(timezone.utc)
            incident.resolved_by = actor.profile_id
            incident.resolution_note = payload.resolution_note or incident.resolution_note
    elif payload.resolution_note is not None:
        incident.resolution_note = payload.resolution_note
    await record_audit(db, actor=actor, action="incident.update", entity_type="incident",
                       entity_id=incident.id, metadata={"status": incident.status.value})
    await db.commit()
    await db.refresh(incident)
    return incident


async def my_notifications(
    db: AsyncSession, actor: Principal, *, page: int, page_size: int
):
    return await repo.list_notifications(db, actor.profile_id, page=page, page_size=page_size)


async def mark_notification_read(db: AsyncSession, actor: Principal, notification_id: str) -> Notification:
    notification = await repo.get_notification(db, notification_id, actor.profile_id)
    if notification is None:
        # Do not reveal whether another user's notification exists.
        raise NotFound("notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(notification)
    return notification


async def notify_profiles(
    db: AsyncSession,
    *,
    role: Role | None,
    title: str,
    body: str,
    category: str = "system",
    actor: Principal | None = None,
    exclude_profile_id: str | None = None,
) -> int:
    q = select(Profile).where(Profile.is_active.is_(True))
    if role is not None:
        q = q.where(Profile.role == role)
    rows = (await db.execute(q)).scalars().all()
    created = 0
    for profile in rows:
        if exclude_profile_id and profile.id == exclude_profile_id:
            continue
        db.add(Notification(id=new_id(), recipient_id=profile.id, title=title, body=body,
                            category=category))
        created += 1
    await record_audit(db, actor=actor, action="notification.broadcast", entity_type="notification",
                       metadata={"role": role.value if role else "all", "count": created})
    return created
