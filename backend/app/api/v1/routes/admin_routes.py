"""Administrator management endpoints. Every route requires the admin role."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal, require_admin
from app.auth.dependencies import current_principal
from app.core.config import settings
from app.db.session import get_db
from app.models import AssignmentStatus, IncidentStatus, TripStatus
from app.repositories import queries as repo
from app.schemas.admin import (
    AlertCreate,
    AlertOut,
    AlertUpdate,
    AuditEventOut,
    IncidentCreate,
    IncidentOut,
    IncidentUpdate,
    OverviewOut,
    SettingsOut,
)
from app.schemas.catalog import (
    BusCreate,
    BusOut,
    BusUpdate,
    RouteCreate,
    RouteDetailOut,
    RouteOut,
    RouteStopsReplace,
    RouteUpdate,
    StopCreate,
    StopOut,
    StopUpdate,
)
from app.schemas.common import Message, Page, page_params
from app.schemas.ops import AssignmentCreate, AssignmentOut, TripOut
from app.schemas.people import (
    DriverOut,
    DriverProvisionRequest,
    DriverUpdate,
    PassengerOut,
    PassengerUpdate,
)
from app.services import alerts as alerts_service
from app.services import catalog as catalog_service
from app.services import people as people_service
from app.services.ops import freshness_state, tracked_bus_from_trip

router = APIRouter(prefix="/admin", tags=["admin"])


async def _admin(principal: Principal = Depends(current_principal)) -> Principal:
    require_admin(principal)
    return principal


def _assignment_out(a) -> AssignmentOut:
    return AssignmentOut(
        id=a.id, driver_id=a.driver_id,
        driver_name=a.driver.profile.full_name if a.driver and a.driver.profile else "",
        driver_code=a.driver.driver_code if a.driver else "",
        bus_id=a.bus_id, bus_number=a.bus.bus_number if a.bus else "",
        route_id=a.route_id,
        route_number=a.route.route_number if a.route else "",
        route_name=a.route.name if a.route else "",
        status=a.status, valid_from=a.valid_from, valid_until=a.valid_until,
        created_at=a.created_at, ended_at=a.ended_at,
        has_active_trip=False,
    )


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


# --- overview ---------------------------------------------------------------

@router.get("/overview", response_model=OverviewOut)
async def overview(actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db)):
    counts = await repo.counts(db)
    tracked = [tracked_bus_from_trip(t) for t in await repo.get_active_trips(db)]
    stale = sum(1 for b in tracked if b["freshness"] != "fresh")
    return OverviewOut(
        total_buses=counts["total_buses"], active_buses=counts["active_buses"],
        active_trips=counts["active_trips"], total_drivers=counts["total_drivers"],
        active_drivers=counts["active_drivers"], total_passengers=counts["total_passengers"],
        open_incidents=counts["open_incidents"], stale_trips=stale,
    )


# --- passengers -------------------------------------------------------------

@router.get("/passengers", response_model=Page[PassengerOut])
async def list_passengers(
    search: str | None = None, active: bool | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    items, total = await people_service.list_passengers(
        db, search=search, active=active, page=page, page_size=page_size
    )
    return Page[PassengerOut](items=items, total=total, page=page, page_size=page_size)


@router.get("/passengers/{profile_id}", response_model=PassengerOut)
async def get_passenger(profile_id: str, actor: Principal = Depends(_admin),
                        db: AsyncSession = Depends(get_db)):
    from app.core.errors import NotFound
    from app.models import Role

    profile = await repo.get_profile_by_id(db, profile_id)
    if profile is None or profile.role != Role.passenger:
        raise NotFound("passenger not found")
    return profile


@router.patch("/passengers/{profile_id}", response_model=PassengerOut)
async def update_passenger(profile_id: str, payload: PassengerUpdate,
                           actor: Principal = Depends(_admin),
                           db: AsyncSession = Depends(get_db)):
    return await people_service.update_passenger(db, actor, profile_id, payload)


# --- drivers ----------------------------------------------------------------

@router.get("/drivers", response_model=Page[DriverOut])
async def list_drivers(
    search: str | None = None, active: bool | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    drivers, total = await repo.list_drivers(
        db, search=search, active=active, page=page, page_size=page_size
    )
    items = [
        DriverOut(
            id=d.id, profile_id=d.profile_id, driver_code=d.driver_code,
            license_number=d.license_number, is_active=d.is_active,
            full_name=d.profile.full_name if d.profile else "",
            email=d.profile.email if d.profile else "",
            phone=d.profile.phone if d.profile else None,
            profile_active=d.profile.is_active if d.profile else False,
            role=d.profile.role if d.profile else "driver",
            created_at=d.created_at,
        )
        for d in drivers
    ]
    return Page[DriverOut](items=items, total=total, page=page, page_size=page_size)


@router.post("/drivers", response_model=DriverOut, status_code=201)
async def provision_driver(payload: DriverProvisionRequest,
                           actor: Principal = Depends(_admin),
                           db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.models import Driver as D

    driver, _temp = await people_service.provision_driver(db, actor, payload)
    driver = (await db.execute(
        select(D).options(selectinload(D.profile)).where(D.id == driver.id)
    )).scalar_one()
    return DriverOut(
        id=driver.id, profile_id=driver.profile_id, driver_code=driver.driver_code,
        license_number=driver.license_number, is_active=driver.is_active,
        full_name=driver.profile.full_name, email=driver.profile.email,
        phone=driver.profile.phone, profile_active=driver.profile.is_active,
        role=driver.profile.role, created_at=driver.created_at,
    )


@router.get("/drivers/{driver_id}/assignments", response_model=Page[AssignmentOut])
async def driver_assignments(
    driver_id: str, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    items, total = await repo.list_assignments(db, driver_id=driver_id, page=page, page_size=page_size)
    return Page[AssignmentOut](items=[_assignment_out(a) for a in items], total=total,
                               page=page, page_size=page_size)


@router.patch("/drivers/{driver_id}", response_model=DriverOut)
async def update_driver(driver_id: str, payload: DriverUpdate,
                        actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.models import Driver as D

    await people_service.update_driver(db, actor, driver_id, payload)
    driver = (await db.execute(
        select(D).options(selectinload(D.profile)).where(D.id == driver_id)
    )).scalar_one()
    return DriverOut(
        id=driver.id, profile_id=driver.profile_id, driver_code=driver.driver_code,
        license_number=driver.license_number, is_active=driver.is_active,
        full_name=driver.profile.full_name, email=driver.profile.email,
        phone=driver.profile.phone, profile_active=driver.profile.is_active,
        role=driver.profile.role, created_at=driver.created_at,
    )


# --- buses ------------------------------------------------------------------

@router.get("/buses", response_model=Page[BusOut])
async def list_buses(
    search: str | None = None, active: bool | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    buses, total = await repo.list_buses(db, search=search, active=active,
                                         page=page, page_size=page_size)
    active_ids = await repo.active_bus_ids(db)
    items = [
        BusOut(id=b.id, bus_number=b.bus_number, registration_number=b.registration_number,
               operator=b.operator, seating_capacity=b.seating_capacity, is_active=b.is_active,
               created_at=b.created_at, has_active_trip=b.id in active_ids)
        for b in buses
    ]
    return Page[BusOut](items=items, total=total, page=page, page_size=page_size)


@router.post("/buses", response_model=BusOut, status_code=201)
async def create_bus(payload: BusCreate, actor: Principal = Depends(_admin),
                     db: AsyncSession = Depends(get_db)):
    bus = await catalog_service.create_bus(db, actor, payload)
    return BusOut.model_validate(bus)


@router.patch("/buses/{bus_id}", response_model=BusOut)
async def update_bus(bus_id: str, payload: BusUpdate, actor: Principal = Depends(_admin),
                     db: AsyncSession = Depends(get_db)):
    bus = await catalog_service.update_bus(db, actor, bus_id, payload)
    out = BusOut.model_validate(bus)
    out.has_active_trip = await repo.bus_has_active_trip(db, bus_id)
    return out


# --- routes -----------------------------------------------------------------

def _route_out(r, stop_count: int = 0) -> RouteOut:
    return RouteOut(
        id=r.id, route_number=r.route_number, name=r.name, origin=r.origin,
        destination=r.destination, direction=r.direction, path=r.path, is_active=r.is_active,
        created_at=r.created_at, stop_count=stop_count,
        has_geometry=bool(r.path and len(r.path) >= 2),
    )


@router.get("/routes", response_model=Page[RouteOut])
async def list_routes(
    search: str | None = None, active: bool | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    routes, total = await repo.list_routes(db, search=search, active=active,
                                           page=page, page_size=page_size)
    items = []
    for r in routes:
        items.append(_route_out(r, await repo.count_route_stops(db, r.id)))
    return Page[RouteOut](items=items, total=total, page=page, page_size=page_size)


@router.get("/routes/{route_id}", response_model=RouteDetailOut)
async def get_route(route_id: str, actor: Principal = Depends(_admin),
                    db: AsyncSession = Depends(get_db)):
    from app.core.errors import NotFound

    route = await repo.get_route_with_stops(db, route_id)
    if route is None:
        raise NotFound("route not found")
    detail = RouteDetailOut(**_route_out(route, len(route.stops)).model_dump())
    detail.stops = [
        __import__("app.schemas.catalog", fromlist=["RouteStopOut"]).RouteStopOut(
            id=rs.id, stop_id=rs.stop_id, sequence=rs.sequence,
            stop_name=rs.stop.name if rs.stop else "", latitude=rs.stop.latitude if rs.stop else 0,
            longitude=rs.stop.longitude if rs.stop else 0,
            stop_active=rs.stop.is_active if rs.stop else False,
        )
        for rs in route.stops
    ]
    return detail


@router.post("/routes", response_model=RouteOut, status_code=201)
async def create_route(payload: RouteCreate, actor: Principal = Depends(_admin),
                       db: AsyncSession = Depends(get_db)):
    route = await catalog_service.create_route(db, actor, payload)
    return _route_out(route)


@router.patch("/routes/{route_id}", response_model=RouteOut)
async def update_route(route_id: str, payload: RouteUpdate, actor: Principal = Depends(_admin),
                       db: AsyncSession = Depends(get_db)):
    route = await catalog_service.update_route(db, actor, route_id, payload)
    return _route_out(route, await repo.count_route_stops(db, route_id))


@router.put("/routes/{route_id}/stops", response_model=RouteDetailOut)
async def replace_route_stops(route_id: str, payload: RouteStopsReplace,
                              actor: Principal = Depends(_admin),
                              db: AsyncSession = Depends(get_db)):
    return await _replace_stops_impl(db, actor, route_id, payload.stop_ids)


async def _replace_stops_impl(db, actor, route_id, stop_ids) -> RouteDetailOut:
    route = await catalog_service.replace_route_stops(db, actor, route_id, stop_ids)
    detail = RouteDetailOut(**_route_out(route, len(route.stops)).model_dump())
    from app.schemas.catalog import RouteStopOut

    detail.stops = [
        RouteStopOut(id=rs.id, stop_id=rs.stop_id, sequence=rs.sequence,
                     stop_name=rs.stop.name if rs.stop else "",
                     latitude=rs.stop.latitude if rs.stop else 0,
                     longitude=rs.stop.longitude if rs.stop else 0,
                     stop_active=rs.stop.is_active if rs.stop else False)
        for rs in route.stops
    ]
    return detail


# --- stops ------------------------------------------------------------------

@router.get("/stops", response_model=Page[StopOut])
async def list_stops(
    search: str | None = None, active: bool | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    stops, total = await repo.list_stops(db, search=search, active=active,
                                         page=page, page_size=page_size)
    return Page[StopOut](items=stops, total=total, page=page, page_size=page_size)


@router.post("/stops", response_model=StopOut, status_code=201)
async def create_stop(payload: StopCreate, actor: Principal = Depends(_admin),
                      db: AsyncSession = Depends(get_db)):
    stop = await catalog_service.create_stop(db, actor, payload)
    return stop


@router.patch("/stops/{stop_id}", response_model=StopOut)
async def update_stop(stop_id: str, payload: StopUpdate, actor: Principal = Depends(_admin),
                      db: AsyncSession = Depends(get_db)):
    return await catalog_service.update_stop(db, actor, stop_id, payload)


# --- assignments ------------------------------------------------------------

@router.get("/assignments", response_model=Page[AssignmentOut])
async def list_assignments(
    status: str | None = None, page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    st = AssignmentStatus(status) if status else None
    items, total = await repo.list_assignments(db, status=st, page=page, page_size=page_size)
    active_bus_trips = await repo.active_bus_ids(db)
    outs = []
    for a in items:
        out = _assignment_out(a)
        out.has_active_trip = a.bus_id in active_bus_trips
        outs.append(out)
    return Page[AssignmentOut](items=outs, total=total, page=page, page_size=page_size)


@router.post("/assignments", response_model=AssignmentOut, status_code=201)
async def create_assignment(payload: AssignmentCreate, actor: Principal = Depends(_admin),
                            db: AsyncSession = Depends(get_db)):
    assignment = await catalog_service.create_assignment(db, actor, payload)
    return _assignment_out(assignment)


@router.post("/assignments/{assignment_id}/end", response_model=AssignmentOut)
async def end_assignment(assignment_id: str, actor: Principal = Depends(_admin),
                         db: AsyncSession = Depends(get_db)):
    assignment = await catalog_service.end_assignment(db, actor, assignment_id)
    return _assignment_out(assignment)


# --- trips ------------------------------------------------------------------

@router.get("/trips", response_model=Page[TripOut])
async def list_trips(
    status: str | None = None, page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    st = TripStatus(status) if status else None
    items, total = await repo.list_trips(db, status=st, page=page, page_size=page_size)
    return Page[TripOut](items=[_trip_out(t) for t in items], total=total,
                         page=page, page_size=page_size)


@router.post("/trips/{trip_id}/recover-end", response_model=TripOut)
async def recover_end_trip(trip_id: str, actor: Principal = Depends(_admin),
                           db: AsyncSession = Depends(get_db)):
    """Audited administrator recovery for an abandoned trip (never impersonation)."""
    from app.services import ops as ops_service

    trip = await ops_service.end_trip(db, actor, trip_id, admin_recovery=True)
    return _trip_out(trip)


# --- alerts, incidents, audit, settings ------------------------------------

@router.get("/alerts", response_model=Page[AlertOut])
async def list_alerts(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                      actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db)):
    page, page_size = page_params(page, page_size)
    items, total = await repo.list_alerts(db, page=page, page_size=page_size)
    return Page[AlertOut](items=items, total=total, page=page, page_size=page_size)


@router.post("/alerts", response_model=AlertOut, status_code=201)
async def create_alert(payload: AlertCreate, actor: Principal = Depends(_admin),
                       db: AsyncSession = Depends(get_db)):
    return await alerts_service.create_alert(db, actor, payload)


@router.patch("/alerts/{alert_id}", response_model=AlertOut)
async def update_alert(alert_id: str, payload: AlertUpdate, actor: Principal = Depends(_admin),
                       db: AsyncSession = Depends(get_db)):
    return await alerts_service.update_alert(db, actor, alert_id, payload)


@router.get("/incidents", response_model=Page[IncidentOut])
async def list_incidents(
    status: str | None = None, page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    items, total = await repo.list_incidents(db, status=status, page=page, page_size=page_size)
    return Page[IncidentOut](items=items, total=total, page=page, page_size=page_size)


@router.post("/incidents", response_model=IncidentOut, status_code=201)
async def create_incident(payload: IncidentCreate, actor: Principal = Depends(_admin),
                          db: AsyncSession = Depends(get_db)):
    return await alerts_service.create_incident(db, actor, payload)


@router.patch("/incidents/{incident_id}", response_model=IncidentOut)
async def update_incident(incident_id: str, payload: IncidentUpdate,
                          actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db)):
    return await alerts_service.update_incident(db, actor, incident_id, payload)


@router.get("/audit", response_model=Page[AuditEventOut])
async def list_audit(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                     actor: Principal = Depends(_admin), db: AsyncSession = Depends(get_db)):
    page, page_size = page_params(page, page_size)
    items, total = await repo.list_audit_events(db, page=page, page_size=page_size)
    return Page[AuditEventOut](items=items, total=total, page=page, page_size=page_size)


@router.get("/settings", response_model=SettingsOut)
async def get_settings(actor: Principal = Depends(_admin)) -> SettingsOut:
    return SettingsOut(
        location_stale_after_seconds=settings.location_stale_after_seconds,
        location_max_future_skew_seconds=settings.location_max_future_skew_seconds,
        eta_enabled=settings.eta_enabled,
        eta_assumed_speed_kmh=settings.eta_assumed_speed_kmh,
        auth_mode=settings.auth_mode,
        environment=settings.environment,
    )
