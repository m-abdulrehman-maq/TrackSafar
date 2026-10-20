from datetime import datetime

from pydantic import BaseModel, Field

from app.models import RouteDirection


class BusCreate(BaseModel):
    bus_number: str = Field(min_length=1, max_length=32)
    registration_number: str | None = Field(default=None, max_length=32)
    operator: str | None = Field(default=None, max_length=120)
    seating_capacity: int | None = Field(default=None, ge=1, le=300)


class BusUpdate(BaseModel):
    bus_number: str | None = Field(default=None, min_length=1, max_length=32)
    registration_number: str | None = Field(default=None, max_length=32)
    operator: str | None = Field(default=None, max_length=120)
    seating_capacity: int | None = Field(default=None, ge=1, le=300)
    is_active: bool | None = None


class BusOut(BaseModel):
    id: str
    bus_number: str
    registration_number: str | None = None
    operator: str | None = None
    seating_capacity: int | None = None
    is_active: bool
    created_at: datetime
    has_active_trip: bool = False

    model_config = {"from_attributes": True}


class RouteStopIn(BaseModel):
    stop_id: str
    sequence: int = Field(ge=1)


class RouteStopOut(BaseModel):
    id: str
    stop_id: str
    sequence: int
    stop_name: str
    latitude: float
    longitude: float
    stop_active: bool


class RouteCreate(BaseModel):
    route_number: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=2, max_length=160)
    origin: str = Field(min_length=1, max_length=160)
    destination: str = Field(min_length=1, max_length=160)
    direction: RouteDirection = RouteDirection.outbound
    path: list[list[float]] | None = None


class RouteUpdate(BaseModel):
    route_number: str | None = Field(default=None, min_length=1, max_length=32)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    origin: str | None = Field(default=None, min_length=1, max_length=160)
    destination: str | None = Field(default=None, min_length=1, max_length=160)
    path: list[list[float]] | None = None
    is_active: bool | None = None


class RouteStopsReplace(BaseModel):
    stop_ids: list[str] = Field(max_length=200)


class RouteOut(BaseModel):
    id: str
    route_number: str
    name: str
    origin: str
    destination: str
    direction: RouteDirection
    path: list | None = None
    is_active: bool
    created_at: datetime
    stop_count: int = 0
    has_geometry: bool = False

    model_config = {"from_attributes": True}


class RouteDetailOut(RouteOut):
    stops: list[RouteStopOut] = Field(default_factory=list)


class StopCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class StopUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    is_active: bool | None = None


class StopOut(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
