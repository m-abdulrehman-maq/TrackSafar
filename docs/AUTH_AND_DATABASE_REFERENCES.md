# Authentication and database guide

See [MVC.md](MVC.md) for the project structure and [TERMINOLOGY.md](TERMINOLOGY.md) for definitions. Paths below describe the current code; source line numbers are deliberately omitted because they change during refactoring.

## Authentication flow

1. `frontend/admin-web/src/controllers/auth.jsx` loads the session and handles login, registration, and logout.
2. `frontend/admin-web/src/models/api.js` stores the browser token, sends the bearer header, normalizes errors, and clears an expired session after a 401.
3. `backend/app/controllers/auth_routes.py` accepts validated input and calls the people model services.
4. `backend/app/auth/__init__.py` verifies credentials/tokens and resolves the current profile. Role and active status come from the database, not client metadata.
5. `backend/app/auth/dependencies.py` provides the current principal to controllers. Admin and driver endpoints enforce role requirements.
6. `frontend/admin-web/src/views/layouts/AdminLayout.jsx` guards browser routes for usability; backend checks remain mandatory.

The development provider stores bcrypt password hashes and issues development JWTs. Supabase Auth is the deployed identity authority; `backend/app/integrations/identity.py` wraps its HTTP calls. `Settings.validate_security` refuses development authentication in production. This refactor preserves that behavior; it does not certify the production identity integration.

Public registration creates passengers. Elevated accounts use a privileged workflow. `backend/app/bootstrap_admin.py` creates the initial administrator explicitly and refuses weak passwords or escalating an existing account. No default administrator password is provided.

## Database responsibilities

| Path | Responsibility |
| --- | --- |
| `backend/app/models/__init__.py` | Tables, enums, relationships, IDs, and timestamps |
| `backend/app/models/database.py` | Engine, async sessions, development table initialization |
| `backend/app/models/queries.py` | Reads, filtering, pagination, and relationship loading |
| `backend/app/models/services/people.py` | Registration, driver provisioning, profiles, and activity checks |
| `backend/app/models/services/catalog.py` | Bus, route, and stop writes and validation |
| `backend/app/models/services/ops.py` | Assignments, trips, accepted GPS, freshness, and ETA |
| `backend/app/models/services/alerts.py` | Alerts, incidents, notifications |
| `backend/app/models/services/audit.py` | Audit records |
| `database/supabase/migrations/0001_initial_schema.sql` | Production PostgreSQL/PostGIS schema history |

Local defaults use SQLite and create tables at startup. Production uses PostgreSQL and reviewed SQL migrations. SQLite checks do not verify production constraints, PostGIS, connection roles, or RLS. Run migrations only against an explicitly selected database, with separate migration credentials.

## Configuration and safety

Settings are in `backend/app/core/config.py`; sample names are in `backend/.env.example`. Keep real credentials outside Git. Server Supabase keys and JWT secrets must never become `VITE_` values because frontend build inputs are public. Preserve production validation, configured CORS origins, backend role checks, account activity checks, and GPS ownership checks when editing the application.

## Verification

From `backend`, run `.venv/bin/python -m pytest -q`. Tests create a temporary SQLite database, exercise login/registration, reject unauthorized requests, and verify bus create/update/catalog behavior. Production identity, RLS, native GPS, and map services require separate integration testing.
