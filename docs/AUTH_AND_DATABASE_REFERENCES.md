# Auth Services & Database Map

Reference map for where authentication and database code lives in TrackSafar.
All line numbers refer to the current files at the time of writing.

Stack: FastAPI + SQLAlchemy (async) backend, Supabase Auth / dev identity
provider, React (Vite) admin web frontend, SQLite for local dev, Supabase
PostgreSQL (with RLS) for deployed environments.

---

## 1. Backend Auth Service

### 1.1 Core identity logic — `backend/app/auth/__init__.py`

| Concern | Location |
| --- | --- |
| Trusted principal model (`Principal` dataclass) | `backend/app/auth/__init__.py:21-28` |
| JWT algorithm (`HS256`) | `backend/app/auth/__init__.py:18` |
| Decode/verify Supabase JWT | `backend/app/auth/__init__.py:31-40` |
| Verify Supabase token, return `sub` | `backend/app/auth/__init__.py:43-46` |
| Password hashing (bcrypt) | `backend/app/auth/__init__.py:49-50` |
| Password check | `backend/app/auth/__init__.py:53-57` |
| Issue development JWT | `backend/app/auth/__init__.py:60-75` |
| Resolve token → trusted `Principal` from DB profile | `backend/app/auth/__init__.py:78-106` |
| Dev-token decode helper | `backend/app/auth/__init__.py:109-116` |
| Dev email/password authentication | `backend/app/auth/__init__.py:119-137` |
| Role guards (`require_role`, `require_admin`, `require_driver`, `require_passenger`, `require_authenticated`) | `backend/app/auth/__init__.py:142-161` |

Key rule: role and active status always come from the server-side `Profile`
record, never from JWT claims (`backend/app/auth/__init__.py:81-83`,
`backend/app/auth/__init__.py:99-106`).

### 1.2 FastAPI auth dependencies — `backend/app/auth/dependencies.py`

| Concern | Location |
| --- | --- |
| Extract `Bearer` token from header | `backend/app/auth/dependencies.py:10-17` |
| `current_principal` dependency (required auth) | `backend/app/auth/dependencies.py:20-22` |
| `optional_principal` dependency (anonymous allowed) | `backend/app/auth/dependencies.py:25-32` |

### 1.3 Auth HTTP routes — `backend/app/api/v1/routes/auth_routes.py`

Router prefix `/auth`, tag `auth`: `backend/app/api/v1/routes/auth_routes.py:19`

| Endpoint | Location |
| --- | --- |
| `GET /auth/config` | `backend/app/api/v1/routes/auth_routes.py:22-28` |
| `POST /auth/register` | `backend/app/api/v1/routes/auth_routes.py:31-34` |
| `POST /auth/dev/login` (development only) | `backend/app/api/v1/routes/auth_routes.py:37-41` |
| `GET /auth/me` | `backend/app/api/v1/routes/auth_routes.py:44-54` |
| `PATCH /auth/me` | `backend/app/api/v1/routes/auth_routes.py:57-60` |
| `GET /auth/role-redirect` | `backend/app/api/v1/routes/auth_routes.py:63-70` |

Router registration: `backend/app/api/v1/router.py:5-9`
API prefix mount: `backend/app/main.py:46` (prefix `/api/v1` from
`backend/app/core/config.py:16`).

### 1.4 Identity provider adapters — `backend/app/integrations/identity.py`

| Concern | Location |
| --- | --- |
| Supabase/GoTrue admin provider | `backend/app/integrations/identity.py:20-72` |
| Supabase `create_user` | `backend/app/integrations/identity.py:29-48` |
| Supabase `deactivate_user` | `backend/app/integrations/identity.py:50-60` |
| Supabase `reactivate_user` | `backend/app/integrations/identity.py:62-72` |
| Development identity provider | `backend/app/integrations/identity.py:75-96` |
| Build configured Supabase provider | `backend/app/integrations/identity.py:99-102` |
| `create_identity` (mode-aware) | `backend/app/integrations/identity.py:105-116` |
| Verify local password | `backend/app/integrations/identity.py:119-129` |
| Check profile exists by email | `backend/app/integrations/identity.py:132-138` |
| Assert development mode | `backend/app/integrations/identity.py:141-143` |

### 1.5 Account/auth business services — `backend/app/services/people.py`

| Concern | Location |
| --- | --- |
| Public passenger registration | `backend/app/services/people.py:25-56` |
| Dev login (profile + JWT) | `backend/app/services/people.py:59-66` |
| List passengers | `backend/app/services/people.py:69-74` |
| Update passenger (admin) | `backend/app/services/people.py:77-101` |
| Provision driver (admin, creates identity) | `backend/app/services/people.py:104-145` |
| Update driver (admin) | `backend/app/services/people.py:148-180` |
| Self-service profile update | `backend/app/services/people.py:183-196` |

Auth request/response schemas: `backend/app/schemas/auth.py:8-46`
(`RegisterRequest`, `LoginRequest`, `TokenResponse`, `ProfileOut`,
`ProfileUpdate`, `AuthConfig`).

### 1.6 Initial admin bootstrap — `backend/app/bootstrap_admin.py`

| Concern | Location |
| --- | --- |
| Idempotent admin creation | `backend/app/bootstrap_admin.py:22-61` |
| CLI entry point / weak-password refusal | `backend/app/bootstrap_admin.py:64-73` |

### 1.7 Auth configuration — `backend/app/core/config.py`

| Concern | Location |
| --- | --- |
| `auth_mode` (`supabase` \| `development`) | `backend/app/core/config.py:28` |
| Supabase URL / anon / service-role / JWT secret | `backend/app/core/config.py:29-33` |
| Access token TTL | `backend/app/core/config.py:34` |
| Production safety checks (refuse dev auth in prod) | `backend/app/core/config.py:54-68` |
| Settings singleton | `backend/app/core/config.py:71-76` |

### 1.8 Role-protected routes

| Guard | Location |
| --- | --- |
| Admin guard (`require_admin`) | `backend/app/api/v1/routes/admin_routes.py:52-53` |
| Driver guard (`require_driver`) | `backend/app/api/v1/routes/driver_routes.py:21-22` |
| Any active authenticated role | `backend/app/api/v1/routes/catalog_routes.py:22-23` |

### 1.9 WebSocket authentication — `backend/app/websocket/hub.py`

| Concern | Location |
| --- | --- |
| Handshake: first message must be `{"type":"auth","token":...}` | `backend/app/websocket/hub.py:25-50` |
| Resolve principal using DB session | `backend/app/websocket/hub.py:38-41` |
| Role-filtered publish | `backend/app/websocket/hub.py:62-74` |
| Socket endpoint wiring | `backend/app/main.py:54-56` |

### 1.10 Frontend auth

| Concern | Location |
| --- | --- |
| Token storage key `tracksafar.token` | `frontend/admin-web/src/lib/api.js:5` |
| `getToken` / `setToken` | `frontend/admin-web/src/lib/api.js:7-13` |
| API client attaches `Authorization: Bearer` | `frontend/admin-web/src/lib/api.js:38-51` |
| 401 clears token + emits `tracksafar:session-expired` | `frontend/admin-web/src/lib/api.js:69-76` |
| `AuthProvider` (session/config/login) | `frontend/admin-web/src/lib/auth.jsx:12-79` |
| Load session via `GET /auth/me` | `frontend/admin-web/src/lib/auth.jsx:18-35` |
| Load `GET /auth/config` | `frontend/admin-web/src/lib/auth.jsx:37-48` |
| Login via `POST /auth/dev/login` | `frontend/admin-web/src/lib/auth.jsx:56-62` |
| Register via `POST /auth/register` | `frontend/admin-web/src/lib/auth.jsx:64-66` |
| Logout (clear token/profile) | `frontend/admin-web/src/lib/auth.jsx:68-71` |
| `useAuth` hook | `frontend/admin-web/src/lib/auth.jsx:81-85` |
| API/WS base URLs (`VITE_API_URL`, `VITE_WS_URL`) | `frontend/admin-web/src/config/env.js:1-7` |

---

## 2. Database Layer

### 2.1 Engine, session, bootstrap — `backend/app/db/session.py`

| Concern | Location |
| --- | --- |
| Declarative `Base` | `backend/app/db/session.py:9-10` |
| Async engine from `settings.database_url` | `backend/app/db/session.py:13` |
| `SessionLocal` async session factory | `backend/app/db/session.py:14` |
| `get_db()` FastAPI dependency | `backend/app/db/session.py:17-19` |
| `init_db()` dev/test table creation | `backend/app/db/session.py:22-27` |

### 2.2 Database configuration — `backend/app/core/config.py`

| Concern | Location |
| --- | --- |
| Default SQLite URL (`sqlite+aiosqlite:///./tracksafar_dev.db`) | `backend/app/core/config.py:22` |
| SQL echo flag | `backend/app/core/config.py:23` |
| Production requires PostgreSQL | `backend/app/core/config.py:63-64` |

Local database file: `backend/tracksafar_dev.db`
(`backend/app/core/config.py:22`, relative to the backend working directory).

### 2.3 ORM models — `backend/app/models/__init__.py`

| Table | Location |
| --- | --- |
| `profiles` (application identity/role) | `backend/app/models/__init__.py:76-91` |
| `drivers` | `backend/app/models/__init__.py:94-108` |
| `buses` | `backend/app/models/__init__.py:111-123` |
| `routes` | `backend/app/models/__init__.py:126-146` |
| `stops` | `backend/app/models/__init__.py:149-160` |
| `route_stops` | `backend/app/models/__init__.py:163-173` |
| `assignments` | `backend/app/models/__init__.py:176-194` |
| `trips` | `backend/app/models/__init__.py:197-218` |
| `bus_location_current` | `backend/app/models/__init__.py:221-235` |
| `notifications` | `backend/app/models/__init__.py:238-247` |
| `system_alerts` | `backend/app/models/__init__.py:250-264` |
| `operational_incidents` | `backend/app/models/__init__.py:267-285` |
| `audit_events` | `backend/app/models/__init__.py:288-299` |
| `dev_auth_users` (dev-only credentials) | `backend/app/models/__init__.py:302-310` |

Shared helpers: `utcnow()` `backend/app/models/__init__.py:22-23`,
`new_id()` `backend/app/models/__init__.py:26-27`, `Role` enum
`backend/app/models/__init__.py:30-33`.

### 2.4 Query repository — `backend/app/repositories/queries.py`

| Concern | Location |
| --- | --- |
| Get profile by ID | `backend/app/repositories/queries.py:28-29` |
| Get profile by email | `backend/app/repositories/queries.py:32-33` |
| Get driver by profile | `backend/app/repositories/queries.py:36-37` |
| Get driver by ID | `backend/app/repositories/queries.py:40-46` |
| List/search profiles (pagination) | `backend/app/repositories/queries.py:49-70` |

### 2.5 SQL schema & access control — `database/supabase/migrations/0001_initial_schema.sql`

| Concern | Location |
| --- | --- |
| Enums | `database/supabase/migrations/0001_initial_schema.sql:20-36` |
| `profiles` table (+ role/active indexes) | `database/supabase/migrations/0001_initial_schema.sql:38-50` |
| `drivers` table | `database/supabase/migrations/0001_initial_schema.sql:52-60` |
| `buses` table | `database/supabase/migrations/0001_initial_schema.sql:62-64` |
| RLS enabled (deny-by-default) | `database/supabase/migrations/0001_initial_schema.sql:223-238` |
| Backend-role grants / revoke anon | `database/supabase/migrations/0001_initial_schema.sql:240-256` |

The backend is the only data access path; Supabase `anon`/`authenticated`
roles are revoked and RLS has no client policies
(`database/supabase/migrations/0001_initial_schema.sql:224-242`).

### 2.6 Database usage in app startup / other services

| Concern | Location |
| --- | --- |
| `init_db()` on FastAPI lifespan | `backend/app/main.py:16-25` |
| Background job sessions | `backend/app/services/ops.py:53-58` |
| WebSocket principal lookup session | `backend/app/websocket/hub.py:38-41` |
| Bootstrap admin session | `backend/app/bootstrap_admin.py:27-28` |

---

## 3. Auth Flow (end to end)

1. Frontend `AuthProvider` calls `GET /api/v1/auth/config` and, if a token
   exists, `GET /api/v1/auth/me`
   (`frontend/admin-web/src/lib/auth.jsx:37-48`).
2. Login sends `POST /api/v1/auth/dev/login`
   (`frontend/admin-web/src/lib/auth.jsx:56-62`).
3. Backend route calls `people.dev_login`
   (`backend/app/api/v1/routes/auth_routes.py:37-41`) →
   `authenticate_dev_credentials` (`backend/app/auth/__init__.py:119-137`) →
   `issue_dev_token` (`backend/app/auth/__init__.py:60-75`).
4. Frontend stores the JWT and sends it as `Authorization: Bearer <token>`
   (`frontend/admin-web/src/lib/api.js:38-51`).
5. `current_principal` extracts the token
   (`backend/app/auth/dependencies.py:10-22`) and `resolve_principal` verifies
   it and loads the `Profile` from the DB
   (`backend/app/auth/__init__.py:78-106`).
6. Role guards enforce access per route
   (`backend/app/auth/__init__.py:142-161`).

---

## 4. Quick Reference

| Item | Primary file |
| --- | --- |
| Auth core / JWT / principal | `backend/app/auth/__init__.py` |
| Auth dependencies | `backend/app/auth/dependencies.py` |
| Auth endpoints | `backend/app/api/v1/routes/auth_routes.py` |
| Identity providers (Supabase/dev) | `backend/app/integrations/identity.py` |
| Registration/login services | `backend/app/services/people.py` |
| Admin bootstrap | `backend/app/bootstrap_admin.py` |
| DB engine/session | `backend/app/db/session.py` |
| DB config | `backend/app/core/config.py` |
| ORM models | `backend/app/models/__init__.py` |
| Queries | `backend/app/repositories/queries.py` |
| SQL schema / RLS | `database/supabase/migrations/0001_initial_schema.sql` |
| Local SQLite DB | `backend/tracksafar_dev.db` |
| Frontend API/token | `frontend/admin-web/src/lib/api.js` |
| Frontend auth context | `frontend/admin-web/src/lib/auth.jsx` |
