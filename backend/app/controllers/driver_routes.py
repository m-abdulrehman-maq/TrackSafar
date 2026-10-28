"""Driver endpoints: own assignment, trip lifecycle and GPS submission."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, require_driver
from app.auth.dependencies import current_principal
from app.models.database import get_db
from app.models.services import ops as ops_service
from app.views.ops import (
    DriverAssignmentOut,
    LocationAck,
    LocationObservationIn,
    TripOut,
)
from app.views.presenters import assignment_view, trip_view

router = APIRouter(prefix="/driver", tags=["driver"])


async def _driver(principal: Principal = Depends(current_principal)) -> Principal:
    require_driver(principal)
    return principal


@router.get("/assignment", response_model=DriverAssignmentOut)
async def my_assignment(actor: Principal = Depends(_driver), db: AsyncSession = Depends(get_db)):
    from app.models import queries as repo

    driver = await repo.get_driver_by_profile(db, actor.profile_id)
    if driver is None:
        return DriverAssignmentOut(assignment=None, active_trip=None)
    assignment = await repo.get_current_assignment_for_driver(db, driver.id)
    trip = await repo.active_trip_for_driver(db, driver.id)
    return DriverAssignmentOut(
        assignment=assignment_view(assignment) if assignment else None,
        active_trip=trip_view(trip) if trip else None,
    )


@router.post("/trips/start", response_model=TripOut, status_code=201)
async def start_trip(actor: Principal = Depends(_driver), db: AsyncSession = Depends(get_db)):
    trip = await ops_service.start_trip(db, actor)
    return trip_view(trip)


@router.post("/trips/{trip_id}/end", response_model=TripOut)
async def end_trip(
    trip_id: str, actor: Principal = Depends(_driver), db: AsyncSession = Depends(get_db)
):
    trip = await ops_service.end_trip(db, actor, trip_id)
    return trip_view(trip)


@router.post("/trips/{trip_id}/location", response_model=LocationAck)
async def submit_location(
    trip_id: str,
    payload: LocationObservationIn,
    actor: Principal = Depends(_driver),
    db: AsyncSession = Depends(get_db),
):
    current = await ops_service.ingest_location(db, actor, trip_id, payload)
    return LocationAck(
        trip_id=trip_id,
        sequence=current.sequence,
        accepted=True,
        received_at=current.received_at,
    )
