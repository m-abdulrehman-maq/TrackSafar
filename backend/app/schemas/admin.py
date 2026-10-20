from datetime import datetime

from pydantic import BaseModel, Field

from app.models import AlertAudience, AlertSeverity, AuditOutcome, IncidentStatus


class AlertCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=1, max_length=4000)
    severity: AlertSeverity = AlertSeverity.info
    audience: AlertAudience
    expires_at: datetime | None = None
    is_published: bool = True


class AlertUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    body: str | None = Field(default=None, min_length=1, max_length=4000)
    severity: AlertSeverity | None = None
    audience: AlertAudience | None = None
    is_published: bool | None = None
    expires_at: datetime | None = None


class AlertOut(BaseModel):
    id: str
    title: str
    body: str
    severity: AlertSeverity
    audience: AlertAudience
    is_published: bool
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: str
    title: str
    body: str
    category: str
    read_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=4000)
    severity: AlertSeverity = AlertSeverity.warning
    trip_id: str | None = None
    bus_id: str | None = None
    route_id: str | None = None


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    severity: AlertSeverity | None = None
    status: IncidentStatus | None = None
    resolution_note: str | None = Field(default=None, max_length=2000)


class IncidentOut(BaseModel):
    id: str
    title: str
    description: str
    severity: AlertSeverity
    status: IncidentStatus
    trip_id: str | None = None
    bus_id: str | None = None
    route_id: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    resolved_at: datetime | None = None
    resolution_note: str | None = None

    model_config = {"from_attributes": True}


class AuditEventOut(BaseModel):
    id: str
    actor_profile_id: str | None = None
    actor_email: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    outcome: AuditOutcome
    metadata_json: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OverviewOut(BaseModel):
    total_buses: int
    active_buses: int
    active_trips: int
    total_drivers: int
    active_drivers: int
    total_passengers: int
    open_incidents: int
    stale_trips: int


class SettingsOut(BaseModel):
    location_stale_after_seconds: int
    location_max_future_skew_seconds: int
    eta_enabled: bool
    eta_assumed_speed_kmh: float
    auth_mode: str
    environment: str
