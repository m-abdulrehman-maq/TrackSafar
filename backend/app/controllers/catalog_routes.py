"""Catalog, tracking, discovery and notifications available to all active roles."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import Principal
from app.auth.dependencies import current_principal
from app.models import queries as repo
from app.models.database import get_db
from app.models.services import alerts as alerts_service
from app.models.services import ops as ops_service
from app.views.admin import AlertOut, NotificationOut
from app.views.catalog import BusOut, RouteDetailOut, RouteOut, StopOut
from app.views.common import Page, page_params
from app.views.ops import EtaOut, PassengerNearbyOut, TrackedBusOut
from app.views.presenters import route_view

router = APIRouter(tags=["catalog"])


async def _active(principal: Principal = Depends(current_principal)) -> Principal:
    return principal


@router.get("/catalog/buses", response_model=Page[BusOut])
async def catalog_buses(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _p: Principal = Depends(_active),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    buses, total = await repo.list_buses(
        db, search=search, active=True, page=page, page_size=page_size
    )
    active_ids = await repo.active_bus_ids(db)
    items = [
        BusOut(
            id=b.id,
            bus_number=b.bus_number,
            registration_number=b.registration_number,
            operator=b.operator,
            seating_capacity=b.seating_capacity,
            is_active=b.is_active,
            created_at=b.created_at,
            has_active_trip=b.id in active_ids,
        )
        for b in buses
    ]
    return Page[BusOut](items=items, total=total, page=page, page_size=page_size)


@router.get("/catalog/routes", response_model=Page[RouteOut])
async def catalog_routes(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _p: Principal = Depends(_active),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    routes, total = await repo.list_routes(
        db, search=search, active=True, page=page, page_size=page_size
    )
    items = [route_view(r, await repo.count_route_stops(db, r.id)) for r in routes]
    return Page[RouteOut](items=items, total=total, page=page, page_size=page_size)


@router.get("/catalog/routes/{route_id}", response_model=RouteDetailOut)
async def catalog_route_detail(
    route_id: str, _p: Principal = Depends(_active), db: AsyncSession = Depends(get_db)
):
    from app.core.errors import NotFound

    route = await repo.get_route_with_stops(db, route_id)
    if route is None or not route.is_active:
        raise NotFound("route not found")
    detail = RouteDetailOut(**route_view(route, len(route.stops)).model_dump())
    from app.views.catalog import RouteStopOut

    detail.stops = [
        RouteStopOut(
            id=rs.id,
            stop_id=rs.stop_id,
            sequence=rs.sequence,
            stop_name=rs.stop.name if rs.stop else "",
            latitude=rs.stop.latitude if rs.stop else 0,
            longitude=rs.stop.longitude if rs.stop else 0,
            stop_active=rs.stop.is_active if rs.stop else False,
        )
        for rs in route.stops
    ]
    return detail


@router.get("/catalog/stops", response_model=Page[StopOut])
async def catalog_stops(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _p: Principal = Depends(_active),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    stops, total = await repo.list_stops(
        db, search=search, active=True, page=page, page_size=page_size
    )
    return Page[StopOut](items=stops, total=total, page=page, page_size=page_size)


@router.get("/tracking/active", response_model=list[TrackedBusOut])
async def tracking_active(_p: Principal = Depends(_active), db: AsyncSession = Depends(get_db)):
    buses = await ops_service.active_tracked_buses(db)
    return [TrackedBusOut(**b) for b in buses]


@router.get("/tracking/search")
async def tracking_search(
    q: str, _p: Principal = Depends(_active), db: AsyncSession = Depends(get_db)
):
    results = await ops_service.search_catalog(db, q)
    return {
        "buses": [BusOut.model_validate(b) for b in results["buses"]],
        "routes": [route_view(r) for r in results["routes"]],
        "stops": [StopOut.model_validate(s) for s in results["stops"]],
    }


@router.get("/tracking/nearby", response_model=list[PassengerNearbyOut])
async def tracking_nearby(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_m: float = Query(1500, ge=50, le=20000),
    _p: Principal = Depends(_active),
    db: AsyncSession = Depends(get_db),
):
    results = await ops_service.nearby_buses(db, lat, lon, radius_m)
    return [
        PassengerNearbyOut(distance_m=r["distance_m"], bus=TrackedBusOut(**r["bus"]))
        for r in results
    ]


@router.get("/tracking/eta", response_model=EtaOut)
async def tracking_eta(
    trip_id: str,
    stop_id: str,
    _p: Principal = Depends(_active),
    db: AsyncSession = Depends(get_db),
):
    result = await ops_service.eta_for_stop(db, trip_id, stop_id)
    return EtaOut(**result)


@router.get("/me/notifications", response_model=Page[NotificationOut])
async def my_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    principal: Principal = Depends(_active),
    db: AsyncSession = Depends(get_db),
):
    page, page_size = page_params(page, page_size)
    items, total = await alerts_service.my_notifications(
        db, principal, page=page, page_size=page_size
    )
    return Page[NotificationOut](items=items, total=total, page=page, page_size=page_size)


@router.post("/me/notifications/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: str,
    principal: Principal = Depends(_active),
    db: AsyncSession = Depends(get_db),
):
    return await alerts_service.mark_notification_read(db, principal, notification_id)


@router.get("/me/alerts", response_model=list[AlertOut])
async def my_alerts(principal: Principal = Depends(_active), db: AsyncSession = Depends(get_db)):
    return await alerts_service.visible_alerts_for(db, principal)
