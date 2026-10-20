from datetime import datetime

from pydantic import BaseModel, Field

from app.models import AssignmentStatus, TripStatus


class AssignmentCreate(BaseModel):
    driver_id: str
    bus_id: str
    route_id: str
    valid_from: datetime | None = None


class AssignmentOut(BaseModel):
    id: str
    driver_id: str
    driver_name: str
    driver_code: str
    bus_id: str
    bus_number: str
    route_id: str
    route_number: str
    route_name: str
    status: AssignmentStatus
    valid_from: datetime
    valid_until: datetime | None = None
    created_at: datetime
    ended_at: datetime | None = None
    has_active_trip: bool = False


class TripOut(BaseModel):
    id: str
    assignment_id: str
    driver_id: str
    driver_name: str
    driver_code: str
    bus_id: str
    bus_number: str
    route_id: str
    route_number: str
    route_name: str
    status: TripStatus
    started_at: datetime
    ended_at: datetime | None = None
    end_reason: str | None = None


class LocationObservationIn(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float | None = Field(default=None, ge=0, le=100000)
    observed_at: datetime
    sequence: int = Field(ge=0)


class TrackedBusOut(BaseModel):
    trip_id: str
    bus_id: str
    bus_number: str
    route_id: str
    route_number: str
    route_name: str
    driver_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    accuracy_m: float | None = None
    observed_at: datetime | None = None
    received_at: datetime | None = None
    freshness: str = "unavailable"  # fresh | stale | unavailable
    age_seconds: int | None = None
    started_at: datetime


class LocationAck(BaseModel):
    trip_id: str
    sequence: int
    accepted: bool
    received_at: datetime


class DriverAssignmentOut(BaseModel):
    assignment: AssignmentOut | None
    active_trip: TripOut | None = None


class PassengerNearbyOut(BaseModel):
    distance_m: float
    bus: TrackedBusOut


class EtaOut(BaseModel):
    available: bool
    eta_seconds: int | None = None
    reason: str | None = None
    observed_at: datetime | None = None
    note: str | None = None
