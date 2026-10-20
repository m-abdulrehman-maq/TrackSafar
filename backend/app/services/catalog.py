"""Bus, route, stop and assignment management invariants."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal
from app.core.errors import Conflict, NotFound, ValidationFailed
from app.models import (
    Assignment,
    AssignmentStatus,
    Bus,
    Route,
    RouteStop,
    Stop,
    new_id,
)
from app.repositories import queries as repo
from app.services.audit import record_audit

LH_BOUNDS = {"lat_min": 31.0, "lat_max": 31.8, "lon_min": 74.2, "lon_max": 74.7}


def _validate_path(path: list[list[float]] | None) -> list[list[float]] | None:
    if path is None:
        return None
    if len(path) < 2:
        raise ValidationFailed("route path requires at least two coordinates [lon, lat]")
    for pair in path:
        if not isinstance(pair, list | tuple) or len(pair) != 2:
            raise ValidationFailed("each path coordinate must be [longitude, latitude]")
        lon, lat = float(pair[0]), float(pair[1])
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValidationFailed("route path coordinates are out of range")
    return [[float(p[0]), float(p[1])] for p in path]


# --- buses ------------------------------------------------------------------

async def create_bus(db: AsyncSession, actor: Principal, payload) -> Bus:
    if await repo.get_bus_by_number(db, payload.bus_number):
        raise Conflict(f"bus number '{payload.bus_number}' already exists")
    if payload.registration_number:
        from sqlalchemy import select
        from app.models import Bus as B

        dup = (await db.execute(
            select(B).where(B.registration_number == payload.registration_number)
        )).scalar_one_or_none()
        if dup:
            raise Conflict("registration number already exists")
    bus = Bus(
        bus_number=payload.bus_number.strip().upper(),
        registration_number=payload.registration_number,
        operator=payload.operator,
        seating_capacity=payload.seating_capacity,
    )
    db.add(bus)
    await db.flush()
    await record_audit(db, actor=actor, action="bus.create", entity_type="bus", entity_id=bus.id,
                       metadata={"bus_number": bus.bus_number})
    await db.commit()
    await db.refresh(bus)
    return bus


async def update_bus(db: AsyncSession, actor: Principal, bus_id: str, payload) -> Bus:
    bus = await db.get(Bus, bus_id)
    if bus is None:
        raise NotFound("bus not found")
    if payload.bus_number and payload.bus_number != bus.bus_number:
        if await repo.get_bus_by_number(db, payload.bus_number, bus_id=bus_id):
            raise Conflict(f"bus number '{payload.bus_number}' already exists")
        bus.bus_number = payload.bus_number.strip().upper()
    if payload.registration_number is not None:
        bus.registration_number = payload.registration_number
    if payload.operator is not None:
        bus.operator = payload.operator
    if payload.seating_capacity is not None:
        bus.seating_capacity = payload.seating_capacity
    if payload.is_active is not None:
        active_trip = await repo.bus_has_active_trip(db, bus_id)
        if not payload.is_active and active_trip:
            raise Conflict("bus has an active trip; it cannot be deactivated mid-trip")
        if not payload.is_active:
            conflicting = await repo.active_assignment_exists(db, bus_id=bus_id)
            if conflicting:
                raise Conflict("bus has a current assignment; end it before deactivating")
        bus.is_active = payload.is_active
    await record_audit(db, actor=actor, action="bus.update", entity_type="bus", entity_id=bus.id,
                       metadata={"is_active": payload.is_active})
    await db.commit()
    await db.refresh(bus)
    return bus


# --- routes -----------------------------------------------------------------

async def create_route(db: AsyncSession, actor: Principal, payload) -> Route:
    from sqlalchemy import select

    dup = (await db.execute(
        select(Route).where(
            Route.route_number == payload.route_number, Route.direction == payload.direction
        )
    )).scalar_one_or_none()
    if dup:
        raise Conflict("a route with this number and direction already exists")
    route = Route(
        route_number=payload.route_number.strip().upper(),
        name=payload.name.strip(),
        origin=payload.origin.strip(),
        destination=payload.destination.strip(),
        direction=payload.direction,
        path=_validate_path(payload.path),
    )
    db.add(route)
    await db.flush()
    await record_audit(db, actor=actor, action="route.create", entity_type="route",
                       entity_id=route.id, metadata={"route_number": route.route_number,
                                                     "direction": route.direction.value})
    await db.commit()
    await db.refresh(route)
    return route


async def update_route(db: AsyncSession, actor: Principal, route_id: str, payload) -> Route:
    route = await repo.get_route_with_stops(db, route_id)
    if route is None:
        raise NotFound("route not found")
    if payload.route_number is not None:
        route.route_number = payload.route_number.strip().upper()
    if payload.name is not None:
        route.name = payload.name.strip()
    if payload.origin is not None:
        route.origin = payload.origin.strip()
    if payload.destination is not None:
        route.destination = payload.destination.strip()
    if payload.path is not None:
        if await repo.route_has_active_trip(db, route_id) and payload.path != route.path:
            raise Conflict("route geometry cannot be changed while a trip is active")
        route.path = _validate_path(payload.path)
    if payload.is_active is not None:
        if not payload.is_active and await repo.route_has_active_trip(db, route_id):
            raise Conflict("route has an active trip; it cannot be deactivated mid-trip")
        route.is_active = payload.is_active
    await record_audit(db, actor=actor, action="route.update", entity_type="route",
                       entity_id=route.id, metadata={"is_active": payload.is_active})
    await db.commit()
    return await repo.get_route_with_stops(db, route_id)


async def replace_route_stops(
    db: AsyncSession, actor: Principal, route_id: str, stop_ids: list[str]
) -> Route:
    route = await repo.get_route_with_stops(db, route_id)
    if route is None:
        raise NotFound("route not found")
    if await repo.route_has_active_trip(db, route_id):
        raise Conflict("stop order cannot be changed while a trip is active on this route")
    if not stop_ids:
        raise ValidationFailed("at least one stop is required")
    if len(stop_ids) != len(set(stop_ids)):
        raise ValidationFailed("duplicate stop references are not allowed")
    for sid in stop_ids:
        stop = await db.get(Stop, sid)
        if stop is None:
            raise ValidationFailed(f"stop '{sid}' does not exist")
        if not stop.is_active:
            raise ValidationFailed(f"stop '{stop.name}' is deactivated")
    await db.flush()
    for rs in list(route.stops):
        await db.delete(rs)
    await db.flush()
    for index, sid in enumerate(stop_ids, start=1):
        db.add(RouteStop(route_id=route_id, stop_id=sid, sequence=index))
    await db.flush()
    await record_audit(db, actor=actor, action="route.stops.replace", entity_type="route",
                       entity_id=route_id, metadata={"stop_count": len(stop_ids)})
    await db.commit()
    return await repo.get_route_with_stops(db, route_id)


# --- stops ------------------------------------------------------------------

async def create_stop(db: AsyncSession, actor: Principal, payload) -> Stop:
    stop = Stop(name=payload.name.strip(), latitude=payload.latitude, longitude=payload.longitude)
    db.add(stop)
    await db.flush()
    await record_audit(db, actor=actor, action="stop.create", entity_type="stop",
                       entity_id=stop.id, metadata={"name": stop.name})
    await db.commit()
    await db.refresh(stop)
    return stop


async def update_stop(db: AsyncSession, actor: Principal, stop_id: str, payload) -> Stop:
    stop = await db.get(Stop, stop_id)
    if stop is None:
        raise NotFound("stop not found")
    if payload.name is not None:
        stop.name = payload.name.strip()
    if payload.latitude is not None:
        stop.latitude = payload.latitude
    if payload.longitude is not None:
        stop.longitude = payload.longitude
    if payload.is_active is not None:
        stop.is_active = payload.is_active
    await record_audit(db, actor=actor, action="stop.update", entity_type="stop",
                       entity_id=stop.id, metadata={"is_active": payload.is_active})
    await db.commit()
    await db.refresh(stop)
    return stop


# --- assignments ------------------------------------------------------------

async def create_assignment(db: AsyncSession, actor: Principal, payload) -> Assignment:
    driver = await repo.get_driver_by_id(db, payload.driver_id)
    if driver is None or not driver.is_active:
        raise Conflict("driver is missing or inactive")
    profile = await repo.get_profile_by_id(db, driver.profile_id)
    if profile is None or not profile.is_active:
        raise Conflict("driver account profile is inactive")
    bus = await db.get(Bus, payload.bus_id)
    if bus is None or not bus.is_active:
        raise Conflict("bus is missing or inactive")
    route = await db.get(Route, payload.route_id)
    if route is None or not route.is_active:
        raise Conflict("route is missing or inactive")
    if await repo.active_assignment_exists(db, driver_id=payload.driver_id):
        raise Conflict("driver already has a current assignment")
    if await repo.active_assignment_exists(db, bus_id=payload.bus_id):
        raise Conflict("bus already has a current assignment")
    assignment = Assignment(
        driver_id=payload.driver_id,
        bus_id=payload.bus_id,
        route_id=payload.route_id,
        valid_from=payload.valid_from,
        created_by=actor.profile_id,
    )
    db.add(assignment)
    await db.flush()
    await record_audit(db, actor=actor, action="assignment.create", entity_type="assignment",
                       entity_id=assignment.id,
                       metadata={"driver_id": payload.driver_id, "bus_id": payload.bus_id,
                                 "route_id": payload.route_id})
    await db.commit()
    return await repo.get_assignment_by_id(db, assignment.id)


async def end_assignment(db: AsyncSession, actor: Principal, assignment_id: str) -> Assignment:
    from datetime import datetime, timezone

    from sqlalchemy import func, select

    from app.models import Trip, TripStatus

    assignment = await repo.get_assignment_by_id(db, assignment_id)
    if assignment is None:
        raise NotFound("assignment not found")
    if assignment.status == AssignmentStatus.ended:
        return assignment
    active_count = await db.scalar(
        select(func.count()).where(
            Trip.assignment_id == assignment_id, Trip.status == TripStatus.active
        )
    )
    if active_count:
        raise Conflict("assignment has an active trip; end the trip first")
    assignment.status = AssignmentStatus.ended
    assignment.ended_at = datetime.now(timezone.utc)
    await record_audit(db, actor=actor, action="assignment.end", entity_type="assignment",
                       entity_id=assignment.id)
    await db.commit()
    return await repo.get_assignment_by_id(db, assignment.id)
