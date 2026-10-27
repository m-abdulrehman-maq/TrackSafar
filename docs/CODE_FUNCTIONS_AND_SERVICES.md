# TrackSafar — Code Map: Functions, Services & Line References

Quick reference for the backend (`backend/app`) and the web frontend (`frontend/admin-web/src`).
Line numbers refer to the files as of this document's creation.

> Tip: use `Ctrl+F` / `Cmd+F` with a symbol name. Paths are relative to the repository root.
> If code changes significantly, refresh the numbers with:
> `grep -rnE "^(async def|def|class|@router)\b" backend/app --include="*.py" --exclude-dir=__pycache__`

---

## 1. Backend architecture at a glance

```
HTTP/WS request
   └─ app/main.py                 FastAPI app, lifespan, health, /ws/tracking
      └─ app/api/v1/router.py     mounts /api/v1
         ├─ auth_routes.py        /auth/*
         ├─ admin_routes.py       /admin/*
         ├─ catalog_routes.py     /catalog/*, /tracking/*, /me/*
         └─ driver_routes.py      /driver/*
            ├─ app/auth/          token verification → Principal, role guards
            ├─ app/services/      business rules / invariants
            ├─ app/repositories/  SQLAlchemy queries
            ├─ app/models/        ORM tables + enums
            └─ app/schemas/       Pydantic request/response models
```

Supporting modules: `core/` (settings, error types), `db/` (session), `integrations/` (identity),
`websocket/` (live tracking hub), `bootstrap_admin.py`.

---

## 2. Backend — Services (business logic)

### 2.1 `app/services/ops.py` — trips, GPS, freshness, ETA, discovery

| Line | Function | Purpose |
| ---: | --- | --- |
| 28 | `_utc(dt)` | Normalize a datetime to UTC. |
| 32 | `freshness_state(observed_at, now=None)` | Returns `("fresh"/"stale"/"unavailable", age_seconds)`. |
| 42 | `_haversine_m(lat1, lon1, lat2, lon2)` | Great-circle distance in metres. |
| 51 | `_publish_location(trip_id)` | Re-reads a trip and publishes a sanitized WebSocket event. |
| 65 | `_publish_end(trip_id)` | Publishes `trip-ended` if subscribers exist. |
| 75 | `start_trip(db, actor, assignment_id=None)` | Atomically starts a trip for the driver's current assignment. |
| 112 | `get_own_active_trip(db, actor)` | Active trip for the authenticated driver. |
| 120 | `end_trip(db, actor, trip_id, *, reason, admin_recovery)` | Ends a trip (driver or audited admin recovery); idempotent. |
| 170 | `ingest_location(db, actor, trip_id, payload)` | Validates and stores GPS observations; rejects stale/out-of-order/future data. |
| 223 | `tracked_bus_from_trip(trip)` | Serializes a trip + location into the tracking payload. |
| 248 | `active_tracked_buses(db)` | All active trips as tracking payloads. |
| 253 | `nearby_buses(db, lat, lon, radius_m)` | Fresh, located buses within a radius, sorted by distance. |
| 273 | `search_catalog(db, term)` | Search active buses, routes and stops. |
| 296 | `eta_for_stop(db, trip_id, stop_id)` | Conditional ETA with explicit unavailability reasons. |
| 353 | `_path_remaining_distance(coords, lat, lon)` | Remaining path distance from the closest point. |

### 2.2 `app/services/catalog.py` — buses, routes, stops, assignments

| Line | Function | Purpose |
| ---: | --- | --- |
| 21 | `_validate_path(path)` | Validates route geometry (`[lon, lat]` pairs). |
| 37 | `create_bus(db, actor, payload)` | Creates a bus, enforcing unique number/registration. |
| 64 | `update_bus(db, actor, bus_id, payload)` | Updates a bus; blocks deactivation during an active trip/assignment. |
| 96 | `create_route(db, actor, payload)` | Creates a route with unique number + direction. |
| 124 | `update_route(db, actor, route_id, payload)` | Updates a route; locks geometry while a trip is active. |
| 150 | `replace_route_stops(db, actor, route_id, stop_ids)` | Replaces ordered stops (no active trip, no duplicates/inactive stops). |
| 183 | `create_stop(db, actor, payload)` | Creates a stop. |
| 194 | `update_stop(db, actor, stop_id, payload)` | Updates a stop. |
| 215 | `create_assignment(db, actor, payload)` | Assigns driver + bus + route; uniqueness on driver and bus. |
| 249 | `end_assignment(db, actor, assignment_id)` | Ends an assignment; blocked while a trip is active. |
| 18 | `LH_BOUNDS` | Lahore bounding box constant. |

### 2.3 `app/services/people.py` — accounts & passengers

| Line | Function | Purpose |
| ---: | --- | --- |
| 21 | `_normalize_email(email)` | Lowercase/trim email. |
| 25 | `register_passenger(db, payload)` | Public registration; role forced to `passenger`. |
| 59 | `dev_login(db, payload)` | Development-only email/password login → token. |
| 69 | `list_passengers(db, *, search, active, page, page_size)` | Paged passenger listing. |
| 77 | `update_passenger(db, actor, profile_id, payload)` | Admin passenger update (name/phone/active). |
| 104 | `provision_driver(db, actor, payload)` | Admin-only driver provisioning; may return a temp password. |
| 148 | `update_driver(db, actor, driver_id, payload)` | Updates driver + profile; deactivation blocked during active trip. |
| 183 | `update_own_profile(db, actor, payload)` | Self-service name/phone update only. |

### 2.4 `app/services/alerts.py` — notices, incidents, notifications

| Line | Function | Purpose |
| ---: | --- | --- |
| 24 | `create_alert(db, actor, payload)` | Admin creates a system alert. |
| 41 | `update_alert(db, actor, alert_id, payload)` | Admin updates an alert. |
| 58 | `visible_alerts_for(db, actor)` | Audience-filtered, unexpired published alerts. |
| 73 | `create_incident(db, actor, payload)` | Admin creates an operational incident. |
| 93 | `update_incident(db, actor, incident_id, payload)` | Updates/resolves an incident. |
| 119 | `my_notifications(db, actor, *, page, page_size)` | Paged notifications for the current profile. |
| 125 | `mark_notification_read(db, actor, notification_id)` | Marks own notification read. |
| 137 | `notify_profiles(db, *, role, title, body, ...)` | Bulk-creates notifications for active profiles. |

### 2.5 `app/services/audit.py`

| Line | Function | Purpose |
| ---: | --- | --- |
| 12 | `record_audit(db, *, actor, action, entity_type, entity_id, metadata)` | Appends an audit event (used by most mutations). |

---

## 3. Backend — HTTP & WebSocket routes

### 3.1 Router mounting — `app/api/v1/router.py`

| Line | Detail |
| ---: | --- |
| 5 | `api_router = APIRouter()` |
| 6 | Includes `auth_routes.router` |
| 7 | Includes `admin_routes.router` |
| 8 | Includes `catalog_routes.router` |
| 9 | Includes `driver_routes.router` |

Router prefixes: `/auth` (`auth_routes.py:19`), `/admin` (`admin_routes.py:49`),
`/driver` (`driver_routes.py:18`); catalog routes are unprefixed (`catalog_routes.py:19`).
Mounted at `settings.api_v1_prefix` in `main.py:46`.

### 3.2 Auth routes — `app/api/v1/routes/auth_routes.py`

| Line | Method + path | Handler | Service |
| ---: | --- | --- | --- |
| 22 | `GET /auth/config` | `auth_config` (23) | settings |
| 31 | `POST /auth/register` | `register` (32) | `people.register_passenger` |
| 37 | `POST /auth/dev/login` | `dev_login` (38) | `people.dev_login` |
| 44 | `GET /auth/me` | `me` (45) | `repo.get_profile_by_id` |
| 57 | `PATCH /auth/me` | `update_me` (58) | `people.update_own_profile` |
| 63 | `GET /auth/role-redirect` | `role_redirect` (64) | role → dashboard path |

### 3.3 Admin routes — `app/api/v1/routes/admin_routes.py`

Helpers: `_admin` (52), `_assignment_out` (57), `_trip_out` (72), `_route_out` (255),
`_replace_stops_impl` (321).

| Line | Method + path | Handler | Service |
| ---: | --- | --- | --- |
| 87 | `GET /admin/overview` | `overview` (88) | `repo.counts`, `ops.tracked_bus_from_trip` |
| 102 | `GET /admin/passengers` | `list_passengers` (103) | `people.list_passengers` |
| 115 | `GET /admin/passengers/{profile_id}` | `get_passenger` (116) | `repo.get_profile_by_id` |
| 127 | `PATCH /admin/passengers/{profile_id}` | `update_passenger` (128) | `people.update_passenger` |
| 136 | `GET /admin/drivers` | `list_drivers` (137) | `repo.list_drivers` |
| 162 | `POST /admin/drivers` | `provision_driver` (163) | `people.provision_driver` |
| 184 | `GET /admin/drivers/{driver_id}/assignments` | `driver_assignments` (185) | `repo.list_assignments` |
| 195 | `PATCH /admin/drivers/{driver_id}` | `update_driver` (196) | `people.update_driver` |
| 218 | `GET /admin/buses` | `list_buses` (219) | `repo.list_buses`, `repo.active_bus_ids` |
| 237 | `POST /admin/buses` | `create_bus` (238) | `catalog.create_bus` |
| 244 | `PATCH /admin/buses/{bus_id}` | `update_bus` (245) | `catalog.update_bus` |
| 264 | `GET /admin/routes` | `list_routes` (265) | `repo.list_routes` |
| 279 | `GET /admin/routes/{route_id}` | `get_route` (280) | `repo.get_route_with_stops` |
| 300 | `POST /admin/routes` | `create_route` (301) | `catalog.create_route` |
| 307 | `PATCH /admin/routes/{route_id}` | `update_route` (308) | `catalog.update_route` |
| 314 | `PUT /admin/routes/{route_id}/stops` | `replace_route_stops` (315) | `catalog.replace_route_stops` |
| 339 | `GET /admin/stops` | `list_stops` (340) | `repo.list_stops` |
| 351 | `POST /admin/stops` | `create_stop` (352) | `catalog.create_stop` |
| 358 | `PATCH /admin/stops/{stop_id}` | `update_stop` (359) | `catalog.update_stop` |
| 366 | `GET /admin/assignments` | `list_assignments` (367) | `repo.list_assignments` |
| 384 | `POST /admin/assignments` | `create_assignment` (385) | `catalog.create_assignment` |
| 391 | `POST /admin/assignments/{assignment_id}/end` | `end_assignment` (392) | `catalog.end_assignment` |
| 400 | `GET /admin/trips` | `list_trips` (401) | `repo.list_trips` |
| 413 | `POST /admin/trips/{trip_id}/recover-end` | `recover_end_trip` (414) | `ops.end_trip(admin_recovery=True)` |
| 425 | `GET /admin/alerts` | `list_alerts` (426) | `repo.list_alerts` |
| 433 | `POST /admin/alerts` | `create_alert` (434) | `alerts.create_alert` |
| 439 | `PATCH /admin/alerts/{alert_id}` | `update_alert` (440) | `alerts.update_alert` |
| 445 | `GET /admin/incidents` | `list_incidents` (446) | `repo.list_incidents` |
| 456 | `POST /admin/incidents` | `create_incident` (457) | `alerts.create_incident` |
| 462 | `PATCH /admin/incidents/{incident_id}` | `update_incident` (463) | `alerts.update_incident` |
| 468 | `GET /admin/audit` | `list_audit` (469) | `repo.list_audit_events` |
| 476 | `GET /admin/settings` | `get_settings` (477) | `settings` |

### 3.4 Catalog / tracking / own-data routes — `app/api/v1/routes/catalog_routes.py`

Helpers: `_active` (22), `_route_out` (26).

| Line | Method + path | Handler | Service |
| ---: | --- | --- | --- |
| 35 | `GET /catalog/buses` | `catalog_buses` (36) | `repo.list_buses`, `repo.active_bus_ids` |
| 54 | `GET /catalog/routes` | `catalog_routes` (55) | `repo.list_routes`, `repo.count_route_stops` |
| 67 | `GET /catalog/routes/{route_id}` | `catalog_route_detail` (68) | `repo.get_route_with_stops` |
| 89 | `GET /catalog/stops` | `catalog_stops` (90) | `repo.list_stops` |
| 101 | `GET /tracking/active` | `tracking_active` (102) | `ops.active_tracked_buses` |
| 108 | `GET /tracking/search` | `tracking_search` (109) | `ops.search_catalog` |
| 119 | `GET /tracking/nearby` | `tracking_nearby` (120) | `ops.nearby_buses` |
| 130 | `GET /tracking/eta` | `tracking_eta` (131) | `ops.eta_for_stop` |
| 139 | `GET /me/notifications` | `my_notifications` (140) | `alerts.my_notifications` |
| 151 | `POST /me/notifications/{notification_id}/read` | `mark_read` (152) | `alerts.mark_notification_read` |
| 157 | `GET /me/alerts` | `my_alerts` (158) | `alerts.visible_alerts_for` |

### 3.5 Driver routes — `app/api/v1/routes/driver_routes.py`

Helpers: `_driver` (21), `_assignment_out` (26), `_trip_out` (39).

| Line | Method + path | Handler | Service |
| ---: | --- | --- | --- |
| 52 | `GET /driver/assignment` | `my_assignment` (53) | `repo.get_current_assignment_for_driver`, `repo.active_trip_for_driver` |
| 68 | `POST /driver/trips/start` | `start_trip` (69) | `ops.start_trip` |
| 75 | `POST /driver/trips/{trip_id}/end` | `end_trip` (76) | `ops.end_trip` |
| 82 | `POST /driver/trips/{trip_id}/location` | `submit_location` (83) | `ops.ingest_location` |

### 3.6 App entry & WebSocket — `app/main.py`, `app/websocket/hub.py`

| File | Line | Symbol | Purpose |
| --- | ---: | --- | --- |
| `main.py` | 17 | `lifespan(_app)` | Startup/shutdown (DB init). |
| `main.py` | 49 | `GET /api/health` → `health` (50) | Health check. |
| `main.py` | 54 | `WS /ws/tracking` → `ws_tracking` (55) | Delegates to `tracking_socket`. |
| `websocket/hub.py` | 20 | `class TrackingHub` | Subscriber registry + auth + fan-out. |
| `websocket/hub.py` | 25 | `TrackingHub.connect(ws)` | First-message auth; returns success. |
| `websocket/hub.py` | 52 | `TrackingHub.disconnect(ws)` | Removes subscriber. |
| `websocket/hub.py` | 56 | `TrackingHub._close(ws, code, reason)` | Safe close. |
| `websocket/hub.py` | 62 | `TrackingHub.publish(event, *, include_roles)` | Sends to authorized subscribers. |
| `websocket/hub.py` | 76 | `TrackingHub.subscriber_count()` | Subscriber count. |
| `websocket/hub.py` | 84 | `tracking_socket(ws)` | Socket loop: auth → ping/subscribe. |
| `websocket/hub.py` | 111 | `publish_location_update(bus)` | Emits `location-updated`. |
| `websocket/hub.py` | 123 | `publish_trip_ended(trip_id)` | Emits `trip-ended`. |

---

## 4. Backend — Repositories (`app/repositories/queries.py`)

| Line | Function | Purpose |
| ---: | --- | --- |
| 28 | `get_profile_by_id(db, profile_id)` | Profile lookup by app id. |
| 32 | `get_profile_by_email(db, email)` | Profile lookup by email. |
| 36 | `get_driver_by_profile(db, profile_id)` | Driver record for a profile. |
| 40 | `get_driver_by_id(db, driver_id)` | Driver lookup. |
| 49 | `list_profiles(...)` | Paged/filtered profiles by role. |
| 73 | `list_drivers(...)` | Paged/filtered drivers. |
| 97 | `list_buses(...)` | Paged/filtered buses. |
| 119 | `bus_has_active_trip(db, bus_id)` | Active-trip guard for buses. |
| 126 | `active_bus_ids(db)` | Set of bus ids currently on active trips. |
| 131 | `get_bus_by_number(db, bus_number, bus_id=None)` | Duplicate-number check. |
| 138 | `list_routes(...)` | Paged/filtered routes. |
| 161 | `get_route_with_stops(db, route_id)` | Route with ordered stops + stops. |
| 170 | `route_has_active_trip(db, route_id)` | Active-trip guard for routes. |
| 177 | `count_route_stops(db, route_id)` | Stop count for list responses. |
| 181 | `list_stops(...)` | Paged/filtered stops. |
| 201 | `stop_in_use(db, stop_id)` | Stop referenced by routes. |
| 206 | `get_stop_ids_in_routes(db, stop_ids)` | Existing stop ids check. |
| 213 | `list_assignments(...)` | Paged/filtered assignments. |
| 240 | `get_current_assignment_for_driver(db, driver_id)` | Driver's current assignment. |
| 252 | `active_assignment_exists(db, *, driver_id, bus_id)` | Uniqueness guard. |
| 261 | `get_assignment_by_id(db, assignment_id)` | Assignment lookup. |
| 273 | `get_active_trips(db)` | All active trips with relations. |
| 288 | `get_trip_by_id(db, trip_id)` | Trip lookup. |
| 302 | `active_trip_for_driver(db, driver_id)` | Driver's active trip. |
| 315 | `active_trip_for_bus(db, bus_id)` | Bus's active trip. |
| 321 | `list_trips(...)` | Paged/filtered trips. |
| 343 | `get_location(db, trip_id)` | Current location for a trip. |
| 347 | `list_notifications(...)` | Paged notifications for a recipient. |
| 358 | `get_notification(db, notification_id, recipient_id)` | Ownership-scoped lookup. |
| 365 | `list_alerts(...)` | Paged alerts. |
| 382 | `list_incidents(...)` | Paged incidents. |
| 400 | `list_audit_events(...)` | Paged audit log. |
| 411 | `counts(db)` | Dashboard aggregates (buses, drivers, passengers, incidents, trips). |

---

## 5. Backend — Auth, identity, config, DB

### 5.1 `app/auth/__init__.py`

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 22 | `class Principal` | Trusted identity (profile-derived role). |
| 31 | `_decode_token(token)` | Verifies Supabase JWT. |
| 43 | `verify_supabase_token(token)` | Returns provider subject (`sub`). |
| 49 | `hash_password(password)` | bcrypt hash. |
| 53 | `check_password(password, hash)` | bcrypt verify. |
| 60 | `issue_dev_token(profile, ttl_seconds=None)` | Dev-only JWT. |
| 78 | `resolve_principal(db, token)` | Token → current active `Principal`. |
| 109 | `_decode_token_or_dev(token)` | Dev JWT decode. |
| 119 | `authenticate_dev_credentials(db, email, password)` | Dev credential check. |
| 142 | `require_role(principal, *roles)` | Role guard. |
| 147 | `require_admin(principal)` | Admin guard. |
| 151 | `require_driver(principal)` | Driver guard. |
| 155 | `require_passenger(principal)` | Passenger guard. |
| 159 | `require_authenticated(principal)` | Active-account guard. |

### 5.2 `app/auth/dependencies.py`

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 10 | `_extract_bearer(request)` | Reads `Authorization: Bearer …`. |
| 20 | `current_principal(request, db)` | FastAPI dependency (required auth). |
| 25 | `optional_principal(request, db)` | Optional auth dependency. |

### 5.3 `app/integrations/identity.py`

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 16 | `IdentityProviderError` | Provider failure type. |
| 20 | `class SupabaseIdentityProvider` | GoTrue admin adapter (create/deactivate/reactivate). |
| 29 | `SupabaseIdentityProvider.create_user` | Creates Supabase user. |
| 50 | `SupabaseIdentityProvider.deactivate_user` | Bans/deactivates user. |
| 62 | `SupabaseIdentityProvider.reactivate_user` | Re-enables user. |
| 75 | `class DevelopmentIdentityProvider` | Local dev credential store. |
| 78 | `DevelopmentIdentityProvider.create_user` | Creates dev user. |
| 92 | `DevelopmentIdentityProvider.set_password` | Updates dev password. |
| 99 | `get_supabase_provider()` | Builds configured provider. |
| 105 | `create_identity(db, email, password)` | Creates identity in active mode. |
| 119 | `verify_local_password(db, email, password)` | Dev password verification. |
| 132 | `profile_exists_for_email(db, email)` | Email existence check. |
| 141 | `assert_dev_mode()` | Hard-fails outside development. |

### 5.4 `app/core`, `app/db`, `app/bootstrap_admin.py`

| File | Line | Symbol | Purpose |
| --- | ---: | --- | --- |
| `core/config.py` | 10 | `class Settings` | Env-driven settings (auth mode, GPS/ETA thresholds, etc.). |
| `core/config.py` | 72 | `get_settings()` | Cached settings accessor. |
| `core/errors.py` | 6 | `class ApiError` | Base API error. |
| `core/errors.py` | 18/23/28/33/38/43 | `ValidationFailed`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `InactiveAccount` | Typed errors. |
| `core/errors.py` | 48 | `api_error_handler` | Maps errors to JSON responses. |
| `db/session.py` | 9 | `class Base` | Declarative base. |
| `db/session.py` | 17 | `get_db()` | Async session dependency. |
| `db/session.py` | 22 | `init_db()` | Creates tables. |
| `bootstrap_admin.py` | 22 | `bootstrap(email, password, full_name)` | Seeds the first admin. |
| `bootstrap_admin.py` | 64 | `main()` | CLI entry point. |

---

## 6. Backend — Models & Schemas

### 6.1 Enums — `app/models/__init__.py`

| Line | Enum |
| ---: | --- |
| 30 | `Role` |
| 36 | `RouteDirection` |
| 41 | `AssignmentStatus` |
| 46 | `TripStatus` |
| 51 | `AlertAudience` |
| 58 | `AlertSeverity` |
| 64 | `IncidentStatus` |
| 70 | `AuditOutcome` |

### 6.2 ORM tables — `app/models/__init__.py`

| Line | Model | Table concern |
| ---: | --- | --- |
| 76 | `Profile` | App user (role, active, contact). |
| 94 | `Driver` | Driver record linked to a profile. |
| 111 | `Bus` | Fleet record. |
| 126 | `Route` | Route + optional geometry `path`. |
| 149 | `Stop` | Stop coordinates. |
| 163 | `RouteStop` | Ordered route↔stop join. |
| 176 | `Assignment` | Driver + bus + route validity. |
| 197 | `Trip` | Active/ended trip lifecycle. |
| 221 | `BusLocationCurrent` | Latest GPS observation per trip. |
| 238 | `Notification` | Per-user notification. |
| 250 | `SystemAlert` | Audience-scoped notice. |
| 267 | `OperationalIncident` | Incident lifecycle. |
| 288 | `AuditEvent` | Immutable audit log. |
| 302 | `DevAuthUser` | Development credential store. |

Helpers: `utcnow` (22), `new_id` (26).

### 6.3 Pydantic schemas

| File | Key models (lines) |
| --- | --- |
| `schemas/auth.py` | `RegisterRequest` (8), `LoginRequest` (15), `TokenResponse` (20), `ProfileOut` (26), `ProfileUpdate` (38), `AuthConfig` (43) |
| `schemas/common.py` | `Page` (10), `ErrorBody` (17), `ErrorResponse` (23), `Message` (27), `page_params` (31), `offset_for` (37) |
| `schemas/catalog.py` | `BusCreate` (8), `BusUpdate` (15), `BusOut` (23), `RouteStopIn` (36), `RouteStopOut` (41), `RouteCreate` (51), `RouteUpdate` (60), `RouteStopsReplace` (69), `RouteOut` (73), `RouteDetailOut` (89), `StopCreate` (93), `StopUpdate` (99), `StopOut` (106) |
| `schemas/people.py` | `PassengerCreate` (8), `PassengerOut` (15), `PassengerUpdate` (28), `DriverProvisionRequest` (34), `DriverUpdate` (46), `DriverOut` (54) |
| `schemas/ops.py` | `AssignmentCreate` (8), `AssignmentOut` (15), `TripOut` (33), `LocationObservationIn` (50), `TrackedBusOut` (58), `LocationAck` (76), `DriverAssignmentOut` (83), `PassengerNearbyOut` (88), `EtaOut` (93) |
| `schemas/admin.py` | `AlertCreate` (8), `AlertUpdate` (17), `AlertOut` (26), `NotificationOut` (40), `IncidentCreate` (51), `IncidentUpdate` (60), `IncidentOut` (68), `AuditEventOut` (85), `OverviewOut` (99), `SettingsOut` (110) |

---

## 7. Frontend — Services, client & shared modules

### 7.1 `src/lib/api.js` — HTTP client

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 5 | `TOKEN_KEY` | LocalStorage key for the bearer token. |
| 7 | `getToken()` | Read token. |
| 10 | `setToken(token)` | Store/remove token. |
| 15 | `class ApiError` | Normalized error (`status`, `code`, `details`). |
| 24 | `parseError(status, payload)` | Parses API/FastAPI errors. |
| 38 | `api(path, { method, body, signal })` | Fetch wrapper with auth + 401 session-expiry event. |
| 80 | `get`, `post`, `patch`, `put`, `del` | HTTP verb helpers. |

### 7.2 `src/lib/auth.jsx` — auth context

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 6 | `REDIRECTS` | role → dashboard path. |
| 8 | `redirectForRole(role)` | Safe redirect resolver. |
| 12 | `AuthProvider({ children })` | Loads config/session, exposes login/register/logout/reload. |
| 18 | `loadSession()` (inside provider) | Validates token via `/auth/me`. |
| 56 | `login({ email, password })` | Dev login → token → profile. |
| 64 | `register(payload)` | Passenger registration. |
| 68 | `logout()` | Clears token/profile. |
| 81 | `useAuth()` | Context hook. |

### 7.3 `src/lib/format.js` — display helpers

`formatTimestamp` (3), `formatTime` (17), `ageLabel` (26), `formatDistance` (33),
`formatDuration` (38), `FRESHNESS_LABELS` (46).

### 7.4 `src/config/env.js`

`API_BASE_URL` (4), `WS_BASE_URL` (5).

### 7.5 `src/features/shared.jsx` — reusable data hooks

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 9 | `usePaged(fetchPath, opts)` | Paged fetch with search/extra params. |
| 20 | `useDebounced(value, delay=300)` | Debounced value. |
| 29 | `SearchInput({ value, onChange, ... })` | Search box. |
| 45 | `useDebouncedSearch(initial="")` | Debounced search state helper. |

### 7.6 `src/features/passenger/passenger-data.ts` — passenger data layer

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 60 | `apiGet<T>(path, signal)` | Typed GET. |
| 64 | `searchNetwork(term, signal)` | Merges `/tracking/search` + `/catalog/routes`. |
| 77 | `loadBusCatalog(signal)` | Paginates the full bus catalog. |
| 89 | `matchesService(operator, filter)` | Operator/filter matching. |
| 95 | `initials(name)` | Avatar initials. |
| 100 | `timeAgo(timestamp, now)` | Relative time label. |
| 113 | `distanceLabel(metres)` | `m`/`km` label. |
| 118 | `errorMessage(error)` | Human-readable error text. |

### 7.7 `src/features/passenger/usePassengerLocation.ts`

| Line | Symbol | Purpose |
| ---: | --- | --- |
| 5 | `usePassengerLocation()` | GPS permission + one-shot locate hook. |
| 96 | `permissionLabels` | Permission → label map. |
| 95 | `type PassengerLocation` | Hook return type. |

### 7.8 Maps

| File | Line | Symbol | Purpose |
| --- | ---: | --- | --- |
| `maps/googleMaps.ts` | 12 | `GOOGLE_MAPS_API_KEY` | Env key. |
| `maps/googleMaps.ts` | 23 | `guardIntersectionObserver()` | Guards provider bootstrap errors. |
| `maps/googleMaps.ts` | 33 | `loadGoogleMaps(apiKey)` | Lazy, deduped script loader with timeout. |
| `maps/geocoding.ts` | 41 | `tokens(value)` | Tokenizer. |
| `maps/geocoding.ts` | 54 | `rank(places, term)` | Relevance ranking. |
| `maps/geocoding.ts` | 71 | `dedupe(places)` | Raw result de-duplication. |
| `maps/geocoding.ts` | 81 | `dedupeByName(places)` | Name de-duplication. |
| `maps/geocoding.ts` | 91 | `searchPhoton(term, signal)` | Photon geocoder. |
| `maps/geocoding.ts` | 138 | `searchNominatim(term, signal)` | Nominatim fallback. |
| `maps/geocoding.ts` | 181 | `searchPlaces(term, signal)` | Combined place search. |

---

## 8. Frontend — UI components

### 8.1 `src/components/ui/`

| File | Line | Component |
| --- | ---: | --- |
| `Button.jsx` | 19 | `Button` |
| `Dialog.jsx` | 4 | `Dialog` |
| `Dialog.jsx` | 47 | `ConfirmDialog` |
| `Display.jsx` | 6 | `Card` |
| `Display.jsx` | 20 | `CardHeader` |
| `Display.jsx` | 32 | `CardBody` |
| `Display.jsx` | 45 | `Badge` |
| `Display.jsx` | 60 | `PageHeader` |
| `Display.jsx` | 72 | `Spinner` |
| `Display.jsx` | 76 | `LoadingState` |
| `Display.jsx` | 80 | `EmptyState` |
| `Display.jsx` | 91 | `ErrorState` |
| `Display.jsx` | 106 | `ForbiddenState` |
| `Display.jsx` | 118 | `Banner` |
| `Forms.jsx` | 4 | `Field` |
| `Forms.jsx` | 22 | `Input` |
| `Forms.jsx` | 26 | `Select` |
| `Forms.jsx` | 34 | `Textarea` |
| `Forms.jsx` | 38 | `Checkbox` |
| `Loader.jsx` | 8 | `TrackSafarLoader` |
| `Loader.jsx` | 47 | `InlineLoader` |
| `Skeleton.jsx` | 3 | `Skeleton` |
| `Skeleton.jsx` | 13 | `SkeletonText` |
| `Skeleton.jsx` | 26 | `SkeletonCard` |
| `Skeleton.jsx` | 35 | `SkeletonStat` |
| `Skeleton.jsx` | 44 | `SkeletonTableRows` |
| `Table.jsx` | 7 | `Table` |
| `Table.jsx` | 31 | `Td` |
| `Table.jsx` | 35 | `Tr` |
| `Table.jsx` | 46 | `TableState` |
| `Table.jsx` | 72 | `Pagination` |

---

## 9. Frontend — Pages & feature modules

### 9.1 Route map — `src/App.jsx`

| Line | Path | Component |
| ---: | --- | --- |
| 32 | `/` | `LandingPage` |
| 33 | `/features` | `FeaturesPage` |
| 34–35 | `/login`, `/login/:role` | `LoginPage` |
| 36 | `/register` | `RegisterPage` |
| 37 | `/forbidden` | `ForbiddenPage` |
| 38 | `/privacy` | `StaticPage` |
| 45 | `/terms` | `StaticPage` |
| 54–55 | `/passenger/*` | `PassengerApp` (passenger only) |
| 59–60 | `/driver/*` | `DriverApp` (driver only) |
| 64–79 | `/admin/*` | `AdminLayout` + feature pages (admin only) |
| 82 | `/403` | `ForbiddenPage` |
| 83 | `*` | `NotFoundPage` |

### 9.2 Public pages

| File | Line | Export |
| --- | ---: | --- |
| `pages/Landing.jsx` | 142 | `LandingPage` (helpers `TransitVisual` 75) |
| `pages/Login.jsx` | 32 | `LoginPage` |
| `pages/Register.jsx` | 11 | `RegisterPage` |
| `pages/Misc.jsx` | 6/26/41/78 | `ForbiddenPage`, `NotFoundPage`, `FeaturesPage`, `StaticPage` |

### 9.3 Layouts

| File | Line | Export |
| --- | ---: | --- |
| `layouts/PublicLayout.jsx` | 13 | `Logo` (`BusIcon` 28, `PublicLayout` 40, helpers 191–204) |
| `layouts/AdminLayout.jsx` | 11 | `ADMIN_NAV` |
| `layouts/AdminLayout.jsx` | 26 | `RequireAuth` |
| `layouts/AdminLayout.jsx` | 90 | `AdminLayout` (helpers `Breadcrumbs` 45, `titleFor` 70) |

### 9.4 Admin feature pages

| File | Line | Export / helper |
| --- | ---: | --- |
| `features/overview/OverviewPage.jsx` | 42 | `OverviewPage` (`StatCard` 10, `FleetMapPlaceholder` 26) |
| `features/passengers/PassengersPage.jsx` | 13 | `PassengersPage` |
| `features/drivers/DriversPage.jsx` | 79 | `DriversPage` (`ProvisionDialog` 13) |
| `features/buses/BusesPage.jsx` | 15 | `BusesPage` |
| `features/routes/RoutesPage.jsx` | 27 | `RoutesPage` (`parsePath` 16, `StopSequenceEditor` 183) |
| `features/routes/RoutesPage.jsx` | 282 | `RouteDetailPage` (`Row` 389, `UpdateRouteForm` 398) |
| `features/stops/StopsPage.jsx` | 15 | `StopsPage` |
| `features/assignments/AssignmentsPage.jsx` | 13 | `AssignmentsPage` |
| `features/trips/TripsPage.jsx` | 104 | `TripsPage` (`useTrackingSocket` 15, `LiveFleetList` 67) |
| `features/alerts/AlertsPage.jsx` | 22 | `AlertsPage` |
| `features/incidents/IncidentsPage.jsx` | 17 | `IncidentsPage` |
| `features/settings/SettingsPage.jsx` | 26 | `SettingsPage` (`SettingRow` 9) |
| `features/settings/ProfilePage.jsx` | 12 | `ProfilePage` |

### 9.5 Driver app

| File | Line | Export / helper |
| --- | ---: | --- |
| `features/driver/DriverApp.jsx` | 17 | `DriverApp` |
| `features/driver/DriverApp.jsx` | 13 | `StatusPill` |
| `features/driver/DriverApp.jsx` | 339 | `DriverShell` |

### 9.6 Passenger app

| File | Line | Export / helper |
| --- | ---: | --- |
| `features/passenger/PassengerPanel.tsx` | 9 | `PassengerApp` (entry re-exported by `PassengerApp.jsx`) |
| `features/passenger/PassengerHome.tsx` | 24 | `PassengerHome` (`Loading` 222, `Failure` 226, `RouteDetails` 230) |
| `features/passenger/PassengerAccount.tsx` | 15 | `PassengerAccount` |
| `features/passenger/PassengerMap.tsx` | 48 | `PassengerMap` (`GooglePassengerMap` 55) |
| `features/passenger/PassengerLeafletMap.tsx` | 32 | `PassengerLeafletMap` (`escapeHtml` 15) |
| `features/passenger/PassengerUi.tsx` | 5/12/20 | `PassengerBrand`, `PassengerEmpty`, `PassengerModal` |
| `features/passenger/passenger-data.ts` | see §7.6 | Data helpers |
| `features/passenger/usePassengerLocation.ts` | 5 | Location hook |

---

## 10. Backend ↔ Frontend endpoint usage

| Frontend caller | Backend endpoint |
| --- | --- |
| `lib/auth.jsx` → `login` | `POST /auth/dev/login` |
| `lib/auth.jsx` → `loadSession` | `GET /auth/me` |
| `lib/auth.jsx` → `register` | `POST /auth/register` |
| `passenger-data.ts` → `searchNetwork` | `GET /tracking/search`, `GET /catalog/routes` |
| `passenger-data.ts` → `loadBusCatalog` | `GET /catalog/buses` |
| `PassengerHome` / passenger features | `GET /tracking/active`, `/tracking/nearby`, `/tracking/eta`, `/me/alerts`, `/me/notifications` |
| `DriverApp` | `GET /driver/assignment`, `POST /driver/trips/start`, `POST /driver/trips/{id}/end`, `POST /driver/trips/{id}/location` |
| Admin pages | `/admin/overview`, `/admin/passengers`, `/admin/drivers`, `/admin/buses`, `/admin/routes`, `/admin/stops`, `/admin/assignments`, `/admin/trips`, `/admin/alerts`, `/admin/incidents`, `/admin/audit`, `/admin/settings` |
| `TripsPage` → `useTrackingSocket` | `WS /ws/tracking` |

---

## 11. Notes

- `backend/tests/` currently contains only the package marker; no automated test modules are indexed here.
- `frontend/mobile/` is a folder skeleton with `.gitkeep` files only — no source to reference yet.
- `app/models/__init__.py` holds all ORM models rather than one file per model.
- Line numbers can drift after edits; re-run the grep command at the top to refresh.
