"""Persistence queries. No business rules live here."""
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Assignment,
    AssignmentStatus,
    AuditEvent,
    Bus,
    BusLocationCurrent,
    Driver,
    Notification,
    OperationalIncident,
    Profile,
    Role,
    Route,
    RouteStop,
    Stop,
    SystemAlert,
    Trip,
    TripStatus,
)


async def get_profile_by_id(db: AsyncSession, profile_id: str) -> Profile | None:
    return await db.get(Profile, profile_id)


async def get_profile_by_email(db: AsyncSession, email: str) -> Profile | None:
    return await db.scalar(select(Profile).where(Profile.email == email.lower().strip()))


async def get_driver_by_profile(db: AsyncSession, profile_id: str) -> Driver | None:
    return await db.scalar(select(Driver).where(Driver.profile_id == profile_id))


async def get_driver_by_id(db: AsyncSession, driver_id: str) -> Driver | None:
    from sqlalchemy import select as _select
    from sqlalchemy.orm import selectinload as _sl

    return await db.scalar(
        _select(Driver).options(_sl(Driver.profile)).where(Driver.id == driver_id)
    )


async def list_profiles(
    db: AsyncSession,
    *,
    role: Role | None = None,
    search: str | None = None,
    active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Profile], int]:
    q = select(Profile)
    if role is not None:
        q = q.where(Profile.role == role)
    if active is not None:
        q = q.where(Profile.is_active == active)
    if search:
        term = f"%{search.strip()}%"
        q = q.where(or_(Profile.full_name.ilike(term), Profile.email.ilike(term)))
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Profile.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def list_drivers(
    db: AsyncSession,
    *,
    search: str | None = None,
    active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Driver], int]:
    q = select(Driver).options(selectinload(Driver.profile))
    if active is not None:
        q = q.where(Driver.is_active == active)
    if search:
        term = f"%{search.strip()}%"
        q = q.join(Profile).where(
            or_(Profile.full_name.ilike(term), Profile.email.ilike(term),
                Driver.driver_code.ilike(term))
        )
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Driver.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def list_buses(
    db: AsyncSession,
    *,
    search: str | None = None,
    active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Bus], int]:
    q = select(Bus)
    if active is not None:
        q = q.where(Bus.is_active == active)
    if search:
        term = f"%{search.strip()}%"
        q = q.where(or_(Bus.bus_number.ilike(term), Bus.registration_number.ilike(term),
                        Bus.operator.ilike(term)))
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Bus.bus_number).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def bus_has_active_trip(db: AsyncSession, bus_id: str) -> bool:
    count = await db.scalar(
        select(func.count()).where(Trip.bus_id == bus_id, Trip.status == TripStatus.active)
    )
    return bool(count)


async def active_bus_ids(db: AsyncSession) -> set[str]:
    rows = await db.execute(select(Trip.bus_id).where(Trip.status == TripStatus.active))
    return set(rows.scalars())


async def get_bus_by_number(db: AsyncSession, bus_number: str, bus_id: str | None = None) -> Bus | None:
    q = select(Bus).where(Bus.bus_number == bus_number)
    if bus_id:
        q = q.where(Bus.id != bus_id)
    return await db.scalar(q)


async def list_routes(
    db: AsyncSession,
    *,
    search: str | None = None,
    active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Route], int]:
    q = select(Route)
    if active is not None:
        q = q.where(Route.is_active == active)
    if search:
        term = f"%{search.strip()}%"
        q = q.where(or_(Route.route_number.ilike(term), Route.name.ilike(term),
                        Route.origin.ilike(term), Route.destination.ilike(term)))
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Route.route_number, Route.direction)
        .offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def get_route_with_stops(db: AsyncSession, route_id: str) -> Route | None:
    return await db.scalar(
        select(Route)
        .options(selectinload(Route.stops).selectinload(RouteStop.stop))
        .where(Route.id == route_id)
        .execution_options(populate_existing=True)
    )


async def route_has_active_trip(db: AsyncSession, route_id: str) -> bool:
    count = await db.scalar(
        select(func.count()).where(Trip.route_id == route_id, Trip.status == TripStatus.active)
    )
    return bool(count)


async def count_route_stops(db: AsyncSession, route_id: str) -> int:
    return int(await db.scalar(select(func.count()).where(RouteStop.route_id == route_id)) or 0)


async def list_stops(
    db: AsyncSession,
    *,
    search: str | None = None,
    active: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Stop], int]:
    q = select(Stop)
    if active is not None:
        q = q.where(Stop.is_active == active)
    if search:
        q = q.where(Stop.name.ilike(f"%{search.strip()}%"))
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Stop.name).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def stop_in_use(db: AsyncSession, stop_id: str) -> bool:
    count = await db.scalar(select(func.count()).where(RouteStop.stop_id == stop_id))
    return bool(count)


async def get_stop_ids_in_routes(db: AsyncSession, stop_ids: list[str]) -> set[str]:
    if not stop_ids:
        return set()
    rows = await db.execute(select(RouteStop.stop_id).where(RouteStop.stop_id.in_(stop_ids)))
    return set(rows.scalars())


async def list_assignments(
    db: AsyncSession,
    *,
    status: AssignmentStatus | None = None,
    driver_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Assignment], int]:
    q = (
        select(Assignment)
        .options(
            selectinload(Assignment.driver).selectinload(Driver.profile),
            selectinload(Assignment.bus),
            selectinload(Assignment.route),
        )
    )
    if status is not None:
        q = q.where(Assignment.status == status)
    if driver_id is not None:
        q = q.where(Assignment.driver_id == driver_id)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Assignment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def get_current_assignment_for_driver(db: AsyncSession, driver_id: str) -> Assignment | None:
    return await db.scalar(
        select(Assignment)
        .options(
            selectinload(Assignment.driver).selectinload(Driver.profile),
            selectinload(Assignment.bus),
            selectinload(Assignment.route),
        )
        .where(Assignment.driver_id == driver_id, Assignment.status == AssignmentStatus.active)
    )


async def active_assignment_exists(db: AsyncSession, *, driver_id=None, bus_id=None) -> bool:
    q = select(func.count()).where(Assignment.status == AssignmentStatus.active)
    if driver_id:
        q = q.where(Assignment.driver_id == driver_id)
    if bus_id:
        q = q.where(Assignment.bus_id == bus_id)
    return bool(await db.scalar(q))


async def get_assignment_by_id(db: AsyncSession, assignment_id: str) -> Assignment | None:
    return await db.scalar(
        select(Assignment)
        .options(
            selectinload(Assignment.driver).selectinload(Driver.profile),
            selectinload(Assignment.bus),
            selectinload(Assignment.route),
        )
        .where(Assignment.id == assignment_id)
    )


async def get_active_trips(db: AsyncSession) -> list[Trip]:
    rows = await db.execute(
        select(Trip)
        .options(
            selectinload(Trip.bus),
            selectinload(Trip.route),
            selectinload(Trip.driver).selectinload(Driver.profile),
            selectinload(Trip.location),
        )
        .where(Trip.status == TripStatus.active)
        .order_by(Trip.started_at.desc())
    )
    return list(rows.scalars())


async def get_trip_by_id(db: AsyncSession, trip_id: str) -> Trip | None:
    return await db.scalar(
        select(Trip)
        .options(
            selectinload(Trip.bus),
            selectinload(Trip.route),
            selectinload(Trip.driver).selectinload(Driver.profile),
            selectinload(Trip.location),
            selectinload(Trip.assignment),
        )
        .where(Trip.id == trip_id)
    )


async def active_trip_for_driver(db: AsyncSession, driver_id: str) -> Trip | None:
    return await db.scalar(
        select(Trip)
        .options(
            selectinload(Trip.bus),
            selectinload(Trip.route),
            selectinload(Trip.driver).selectinload(Driver.profile),
            selectinload(Trip.location),
        )
        .where(Trip.driver_id == driver_id, Trip.status == TripStatus.active)
    )


async def active_trip_for_bus(db: AsyncSession, bus_id: str) -> Trip | None:
    return await db.scalar(
        select(Trip).where(Trip.bus_id == bus_id, Trip.status == TripStatus.active)
    )


async def list_trips(
    db: AsyncSession,
    *,
    status: TripStatus | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Trip], int]:
    q = select(Trip).options(
        selectinload(Trip.bus),
        selectinload(Trip.route),
        selectinload(Trip.driver).selectinload(Driver.profile),
        selectinload(Trip.location),
    )
    if status is not None:
        q = q.where(Trip.status == status)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Trip.started_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def get_location(db: AsyncSession, trip_id: str) -> BusLocationCurrent | None:
    return await db.get(BusLocationCurrent, trip_id)


async def list_notifications(
    db: AsyncSession, recipient_id: str, *, page: int = 1, page_size: int = 20
) -> tuple[list[Notification], int]:
    q = select(Notification).where(Notification.recipient_id == recipient_id)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def get_notification(db: AsyncSession, notification_id: str, recipient_id: str) -> Notification | None:
    return await db.scalar(
        select(Notification)
        .where(Notification.id == notification_id, Notification.recipient_id == recipient_id)
    )


async def list_alerts(
    db: AsyncSession,
    *,
    published_only: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[SystemAlert], int]:
    q = select(SystemAlert)
    if published_only:
        q = q.where(SystemAlert.is_published.is_(True))
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(SystemAlert.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def list_incidents(
    db: AsyncSession,
    *,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[OperationalIncident], int]:
    q = select(OperationalIncident)
    if status:
        q = q.where(OperationalIncident.status == status)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(OperationalIncident.created_at.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def list_audit_events(
    db: AsyncSession, *, page: int = 1, page_size: int = 20
) -> tuple[list[AuditEvent], int]:
    q = select(AuditEvent)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    rows = await db.execute(
        q.order_by(AuditEvent.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return list(rows.scalars()), int(total or 0)


async def counts(db: AsyncSession) -> dict:
    async def c(model, *where):
        q = select(func.count()).select_from(model)
        for w in where:
            q = q.where(w)
        return int(await db.scalar(q) or 0)

    now = datetime.now(timezone.utc)
    return {
        "total_buses": await c(Bus),
        "active_buses": await c(Bus, Bus.is_active.is_(True)),
        "active_trips": await c(Trip, Trip.status == TripStatus.active),
        "total_drivers": await c(Driver),
        "active_drivers": await c(Driver, Driver.is_active.is_(True)),
        "total_passengers": await c(Profile, Profile.role == Role.passenger),
        "open_incidents": await c(OperationalIncident, OperationalIncident.status != "resolved"),
        "unresolved": now,
    }
