"""Turn database records into API response views, shared by controllers."""

from app.views.catalog import RouteOut
from app.views.ops import AssignmentOut, TripOut


def assignment_view(assignment) -> AssignmentOut:
    return AssignmentOut(
        id=assignment.id,
        driver_id=assignment.driver_id,
        driver_name=assignment.driver.profile.full_name
        if assignment.driver and assignment.driver.profile
        else "",
        driver_code=assignment.driver.driver_code if assignment.driver else "",
        bus_id=assignment.bus_id,
        bus_number=assignment.bus.bus_number if assignment.bus else "",
        route_id=assignment.route_id,
        route_number=assignment.route.route_number if assignment.route else "",
        route_name=assignment.route.name if assignment.route else "",
        status=assignment.status,
        valid_from=assignment.valid_from,
        valid_until=assignment.valid_until,
        created_at=assignment.created_at,
        ended_at=assignment.ended_at,
        has_active_trip=False,
    )


def trip_view(trip) -> TripOut:
    return TripOut(
        id=trip.id,
        assignment_id=trip.assignment_id,
        driver_id=trip.driver_id,
        driver_name=trip.driver.profile.full_name if trip.driver and trip.driver.profile else "",
        driver_code=trip.driver.driver_code if trip.driver else "",
        bus_id=trip.bus_id,
        bus_number=trip.bus.bus_number if trip.bus else "",
        route_id=trip.route_id,
        route_number=trip.route.route_number if trip.route else "",
        route_name=trip.route.name if trip.route else "",
        status=trip.status,
        started_at=trip.started_at,
        ended_at=trip.ended_at,
        end_reason=trip.end_reason,
    )


def route_view(route, stop_count: int = 0) -> RouteOut:
    return RouteOut(
        id=route.id,
        route_number=route.route_number,
        name=route.name,
        origin=route.origin,
        destination=route.destination,
        direction=route.direction,
        path=route.path,
        is_active=route.is_active,
        created_at=route.created_at,
        stop_count=stop_count,
        has_geometry=bool(route.path and len(route.path) >= 2),
    )
