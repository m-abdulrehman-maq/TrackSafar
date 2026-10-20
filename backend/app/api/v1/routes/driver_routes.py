"""Driver endpoints: own assignment, trip lifecycle and GPS submission."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, require_driver
from app.auth.dependencies import current_principal
from app.db.session import get_db
from app.models import AssignmentStatus, TripStatus
from app.schemas.common import Message
from app.schemas.ops import (
    DriverAssignmentOut,
    LocationAck,
    LocationObservationIn,
    TripOut,
)
from app.services import ops as ops_service

router = APIRouter(prefix="/driver", tags=["driver"])


async def _driver(principal: Principal = Depends(current_principal)) -> Principal:
    require_driver(principal)
    return principal


def _assignment_out(a) -> dict:
    return {
        "id": a.id, "driver_id": a.driver_id,
        "driver_name": a.driver.profile.full_name if a.driver and a.driver.profile else "",
        "driver_code": a.driver.driver_code if a.driver else "",
        "bus_id": a.bus_id, "bus_number": a.bus.bus_number if a.bus else "",
        "route_id": a.route_id, "route_number": a.route.route_number if a.route else "",
        "route_name": a.route.name if a.route else "",
        "status": a.status, "valid_from": a.valid_from, "valid_until": a.valid_until,
        "created_at": a.created_at, "ended_at": a.ended_at, "has_active_trip": False,
    }


def _trip_out(t) -> TripOut:
    return TripOut(
        id=t.id, assignment_id=t.assignment_id, driver_id=t.driver_id,
        driver_name=t.driver.profile.full_name if t.driver and t.driver.profile else "",
        driver_code=t.driver.driver_code if t.driver else "",
        bus_id=t.bus_id, bus_number=t.bus.bus_number if t.bus else "",
        route_id=t.route_id, route_number=t.route.route_number if t.route else "",
        route_name=t.route.name if t.route else "",
        status=t.status, started_at=t.started_at, ended_at=t.ended_at,
        end_reason=t.end_reason,
    )


@router.get("/assignment", response_model=DriverAssignmentOut)
async def my_assignment(actor: Principal = Depends(_driver),
                        db: AsyncSession = Depends(get_db)):
    from app.repositories import queries as repo

    driver = await repo.get_driver_by_profile(db, actor.profile_id)
    if driver is None:
        return DriverAssignmentOut(assignment=None, active_trip=None)
    assignment = await repo.get_current_assignment_for_driver(db, driver.id)
    trip = await repo.active_trip_for_driver(db, driver.id)
    return DriverAssignmentOut(
        assignment=_assignment_out(assignment) if assignment else None,
        active_trip=_trip_out(trip) if trip else None,
    )


@router.post("/trips/start", response_model=TripOut, status_code=201)
async def start_trip(actor: Principal = Depends(_driver),
                     db: AsyncSession = Depends(get_db)):
    trip = await ops_service.start_trip(db, actor)
    return _trip_out(trip)


@router.post("/trips/{trip_id}/end", response_model=TripOut)
async def end_trip(trip_id: str, actor: Principal = Depends(_driver),
                   db: AsyncSession = Depends(get_db)):
    trip = await ops_service.end_trip(db, actor, trip_id)
    return _trip_out(trip)


@router.post("/trips/{trip_id}/location", response_model=LocationAck)
async def submit_location(trip_id: str, payload: LocationObservationIn,
                          actor: Principal = Depends(_driver),
                          db: AsyncSession = Depends(get_db)):
    current = await ops_service.ingest_location(db, actor, trip_id, payload)
    return LocationAck(
        trip_id=trip_id, sequence=current.sequence, accepted=True,
        received_at=current.received_at,
    )
