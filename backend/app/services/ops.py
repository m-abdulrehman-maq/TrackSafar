"""Trip lifecycle, GPS ingestion, freshness, ETA and discovery.

Invariants enforced here (see design.md section 5):
- one active trip per driver and per bus (DB-backed check inside a transaction)
- location derived from the trusted trip, never from client-supplied bus ids
- older/out-of-order observations never overwrite newer ones
- ended trips reject ingestion and disappear from active tracking
"""
import math
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, require_driver
from app.core.config import settings
from app.core.errors import Conflict, Forbidden, NotFound, ValidationFailed
from app.models import (
    BusLocationCurrent,
    Driver,
    Trip,
    TripStatus,
)
from app.repositories import queries as repo
from app.services.audit import record_audit


def _utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def freshness_state(observed_at: datetime | None, now: datetime | None = None) -> tuple[str, int | None]:
    if observed_at is None:
        return "unavailable", None
    now = now or datetime.now(timezone.utc)
    age = max(0, int((now - _utc(observed_at)).total_seconds()))
    if age > settings.location_stale_after_seconds:
        return "stale", age
    return "fresh", age


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


async def _publish_location(trip_id: str) -> None:
    """Publish a sanitized event after the observation is committed."""
    from app.db.session import SessionLocal
    from app.websocket.hub import hub, publish_location_update

    if not await hub.subscriber_count():
        return
    async with SessionLocal() as db:
        trip = await repo.get_trip_by_id(db, trip_id)
        if trip is None or trip.status.value != "active":
            return
        await publish_location_update(tracked_bus_from_trip(trip))


async def _publish_end(trip_id: str) -> None:
    from app.websocket.hub import hub, publish_trip_ended

    if not await hub.subscriber_count():
        return
    await publish_trip_ended(trip_id)


# --- trip lifecycle ---------------------------------------------------------

async def start_trip(db: AsyncSession, actor: Principal, assignment_id: str | None = None) -> Trip:
    """Atomically start a trip for the driver's current assignment."""
    require_driver(actor)
    driver = await repo.get_driver_by_profile(db, actor.profile_id)
    if driver is None or not driver.is_active:
        raise Forbidden("no active driver record for this account")

    assignment = await repo.get_current_assignment_for_driver(db, driver.id)
    if assignment is None:
        raise Conflict("no current assignment is available for you")
    if assignment_id is not None and assignment.id != assignment_id:
        raise Forbidden("you can only start your own current assignment")
    if not assignment.bus.is_active or not assignment.route.is_active:
        raise Conflict("assigned bus or route is inactive")

    existing = await repo.active_trip_for_driver(db, driver.id)
    if existing is not None:
        raise Conflict("you already have an active trip")
    other = await repo.active_trip_for_bus(db, assignment.bus_id)
    if other is not None:
        raise Conflict("the assigned bus is already on an active trip")

    trip = Trip(
        assignment_id=assignment.id,
        driver_id=driver.id,
        bus_id=assignment.bus_id,
        route_id=assignment.route_id,
        status=TripStatus.active,
    )
    db.add(trip)
    await db.flush()
    await record_audit(db, actor=actor, action="trip.start", entity_type="trip", entity_id=trip.id,
                       metadata={"assignment_id": assignment.id, "bus_id": assignment.bus_id})
    await db.commit()
    return await repo.get_trip_by_id(db, trip.id)


async def get_own_active_trip(db: AsyncSession, actor: Principal) -> Trip | None:
    require_driver(actor)
    driver = await repo.get_driver_by_profile(db, actor.profile_id)
    if driver is None:
        return None
    return await repo.active_trip_for_driver(db, driver.id)


async def end_trip(
    db: AsyncSession,
    actor: Principal,
    trip_id: str,
    *,
    reason: str = "driver_ended",
    admin_recovery: bool = False,
) -> Trip:
    """End an authorized trip. Safe to retry: an already ended trip returns as-is."""
    from app.auth import require_admin

    trip = await repo.get_trip_by_id(db, trip_id)
    if trip is None:
        raise NotFound("trip not found")

    if admin_recovery:
        require_admin(actor)
        if trip.status == TripStatus.ended:
            return trip
        trip.status = TripStatus.ended
        trip.ended_at = datetime.now(timezone.utc)
        trip.ended_by = actor.profile_id
        trip.end_reason = "admin_recovery"
        await db.delete(trip.location) if trip.location else None
        await record_audit(db, actor=actor, action="trip.admin_end", entity_type="trip",
                           entity_id=trip.id, metadata={"reason": "admin_recovery"})
        await db.commit()
        await _publish_end(trip.id)
        return await repo.get_trip_by_id(db, trip.id)

    require_driver(actor)
    driver = await repo.get_driver_by_profile(db, actor.profile_id)
    if driver is None or trip.driver_id != driver.id:
        raise Forbidden("you can only end your own trip")
    if trip.status == TripStatus.ended:
        return trip

    trip.status = TripStatus.ended
    trip.ended_at = datetime.now(timezone.utc)
    trip.end_reason = reason
    if trip.location is not None:
        await db.delete(trip.location)
    await record_audit(db, actor=actor, action="trip.end", entity_type="trip", entity_id=trip.id)
    await db.commit()
    await _publish_end(trip.id)
    return await repo.get_trip_by_id(db, trip.id)


# --- GPS ingestion ----------------------------------------------------------

async def ingest_location(
    db: AsyncSession, actor: Principal, trip_id: str, payload
) -> BusLocationCurrent:
    require_driver(actor)
    driver = await repo.get_driver_by_profile(db, actor.profile_id)
    if driver is None or not driver.is_active:
        raise Forbidden("no active driver record for this account")

    trip = await repo.get_trip_by_id(db, trip_id)
    if trip is None:
        raise NotFound("trip not found")
    if trip.driver_id != driver.id:
        raise Forbidden("this trip does not belong to you")
    if trip.status != TripStatus.active:
        raise Conflict("trip has ended; location updates are rejected")

    now = datetime.now(timezone.utc)
    observed_at = _utc(payload.observed_at)
    age = (now - observed_at).total_seconds()
    if age > settings.gps_max_batch_age_seconds:
        raise ValidationFailed("observation timestamp is too old")
    if age < -settings.location_max_future_skew_seconds:
        raise ValidationFailed("observation timestamp is in the future")
    if not (math.isfinite(payload.latitude) and math.isfinite(payload.longitude)):
        raise ValidationFailed("coordinates must be finite")

    current = await repo.get_location(db, trip_id)
    if current is not None:
        if payload.sequence < current.sequence:
            raise Conflict("out-of-order observation rejected")
        if payload.sequence == current.sequence:
            return current
        if observed_at < _utc(current.observed_at):
            raise Conflict("older observation cannot overwrite a newer position")

    if current is None:
        current = BusLocationCurrent(trip_id=trip_id, bus_id=trip.bus_id,
                                     sequence=payload.sequence)
        db.add(current)
    current.latitude = payload.latitude
    current.longitude = payload.longitude
    current.accuracy_m = payload.accuracy_m
    current.sequence = payload.sequence
    current.observed_at = observed_at
    current.received_at = now
    await db.commit()
    await db.refresh(current)
    await _publish_location(trip_id)
    return current


# --- reading tracking -------------------------------------------------------

def tracked_bus_from_trip(trip: Trip) -> dict:
    loc = trip.location
    if loc is None:
        return {
            "trip_id": trip.id, "bus_id": trip.bus_id, "bus_number": trip.bus.bus_number,
            "route_id": trip.route_id, "route_number": trip.route.route_number,
            "route_name": trip.route.name,
            "driver_name": trip.driver.profile.full_name if trip.driver and trip.driver.profile else None,
            "latitude": None, "longitude": None, "accuracy_m": None,
            "observed_at": None, "received_at": None,
            "freshness": "unavailable", "age_seconds": None,
            "started_at": trip.started_at,
        }
    state, age = freshness_state(loc.observed_at)
    return {
        "trip_id": trip.id, "bus_id": trip.bus_id, "bus_number": trip.bus.bus_number,
        "route_id": trip.route_id, "route_number": trip.route.route_number,
        "route_name": trip.route.name,
        "driver_name": trip.driver.profile.full_name if trip.driver and trip.driver.profile else None,
        "latitude": loc.latitude, "longitude": loc.longitude, "accuracy_m": loc.accuracy_m,
        "observed_at": loc.observed_at, "received_at": loc.received_at,
        "freshness": state, "age_seconds": age, "started_at": trip.started_at,
    }


async def active_tracked_buses(db: AsyncSession) -> list[dict]:
    trips = await repo.get_active_trips(db)
    return [tracked_bus_from_trip(t) for t in trips]


async def nearby_buses(
    db: AsyncSession, lat: float, lon: float, radius_m: float
) -> list[dict]:
    """Fresh, located active buses within radius. Explicitly reports stale separately."""
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValidationFailed("invalid coordinates")
    radius = min(max(radius_m, 50.0), 20000.0)
    results = []
    for bus in await active_tracked_buses(db):
        if bus["latitude"] is None:
            continue
        if bus["freshness"] == "stale":
            continue
        dist = _haversine_m(lat, lon, bus["latitude"], bus["longitude"])
        if dist <= radius:
            results.append({"distance_m": round(dist, 1), "bus": bus})
    results.sort(key=lambda item: item["distance_m"])
    return results


async def search_catalog(db: AsyncSession, term: str) -> dict:
    term = term.strip()
    if not term:
        raise ValidationFailed("search term is required")
    from app.models import Bus, Route, Stop

    like = f"%{term}%"
    buses = (await db.execute(
        select(Bus).where(Bus.is_active.is_(True), Bus.bus_number.ilike(like)).limit(25)
    )).scalars().all()
    routes = (await db.execute(
        select(Route).where(Route.is_active.is_(True),
                            (Route.route_number.ilike(like)) | (Route.name.ilike(like)))
        .order_by(Route.route_number, Route.direction).limit(25)
    )).scalars().all()
    stops = (await db.execute(
        select(Stop).where(Stop.is_active.is_(True), Stop.name.ilike(like)).limit(25)
    )).scalars().all()
    return {"buses": list(buses), "routes": list(routes), "stops": list(stops)}


# --- ETA --------------------------------------------------------------------

async def eta_for_stop(db: AsyncSession, trip_id: str, stop_id: str) -> dict:
    """Return a conditional ETA or an explicit unavailability reason.

    A numeric ETA requires: fresh observation, route geometry, ordered target
    stop and sufficient progress. Otherwise `available=false` with a reason —
    never an invented number (SRS P-05).
    """
    trip = await repo.get_trip_by_id(db, trip_id)
    if trip is None:
        raise NotFound("trip not found")
    if trip.status != TripStatus.active:
        return {"available": False, "reason": "trip_ended", "note": "This trip has ended."}

    loc = await repo.get_location(db, trip_id)
    if loc is None:
        return {"available": False, "reason": "no_observation",
                "note": "No position has been observed for this bus yet."}
    state, _age = freshness_state(loc.observed_at)
    if state != "fresh":
        return {"available": False, "reason": "stale_position",
                "observed_at": loc.observed_at,
                "note": "Last observed position is not fresh enough for an estimate."}

    route = await repo.get_route_with_stops(db, trip.route_id)
    if route is None or route.path is None or len(route.path) < 2:
        return {"available": False, "reason": "missing_route_geometry",
                "note": "No verified route path is registered for this route."}

    target = next((rs for rs in route.stops if rs.stop_id == stop_id), None)
    if target is None:
        return {"available": False, "reason": "stop_not_on_route",
                "note": "The selected stop is not part of this route direction."}
    if not settings.eta_enabled:
        return {"available": False, "reason": "eta_method_not_configured",
                "observed_at": loc.observed_at,
                "note": "The ETA method has not been approved for this deployment (M5)."}

    total = 0.0
    coords = [(float(p[0]), float(p[1])) for p in route.path]
    for i in range(1, len(coords)):
        seg = _haversine_m(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0])
        total += seg
    remaining = _path_remaining_distance(coords, loc.latitude, loc.longitude)
    if remaining is None:
        return {"available": False, "reason": "unknown_progress",
                "observed_at": loc.observed_at,
                "note": "The bus position could not be matched to the route path."}
    speed_ms = (settings.eta_assumed_speed_kmh * 1000) / 3600
    seconds = int(remaining / speed_ms)
    return {
        "available": True,
        "eta_seconds": seconds,
        "observed_at": loc.observed_at,
        "note": "Provisional straight-line estimate along the registered route path.",
    }


def _path_remaining_distance(
    coords: list[tuple[float, float]], lat: float, lon: float
) -> float | None:
    """Distance from the closest point on the path to the path end."""
    if len(coords) < 2:
        return None
    best_i, best_d = 0, float("inf")
    for i, (plon, plat) in enumerate(coords):
        d = _haversine_m(lat, lon, plat, plon)
        if d < best_d:
            best_d, best_i = d, i
    if best_d > 5000:
        return None  # position too far from the registered path
    remaining = 0.0
    for i in range(best_i + 1, len(coords)):
        remaining += _haversine_m(
            coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]
        )
    return remaining
