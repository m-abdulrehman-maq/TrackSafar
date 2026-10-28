# TrackSafar

TrackSafar is a public transport tracking application for Lahore. This checkout contains a React web application for passengers, drivers, and administrators, plus a FastAPI backend. Native mobile applications and deployment infrastructure are future work.

The code follows MVC: **models** manage data and business rules, **controllers** handle requests and screen actions, and **views** display results. Start with [the MVC guide](docs/MVC.md) and [the technology terminology guide](docs/TERMINOLOGY.md).

## Requirements

- Node.js 22 or newer (validated with Node 24)
- Python 3.11 or newer (validated with Python 3.12)
- npm and Python venv support

## Install

From the repository root:

```bash
npm ci
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt pytest pytest-asyncio ruff
```

## Run locally

Start the backend in one terminal:

```bash
cd backend
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Start the frontend from the repository root in another terminal:

```bash
npm run dev --workspace admin-web -- --host 127.0.0.1 --strictPort
```

Vite runs on port 5173 and forwards `/api` and `/ws` to the backend on port 8000. Leave frontend `.env` absent to use this same-origin development proxy. An optional Google Maps key can be configured as `VITE_GOOGLE_MAPS_API_KEY`; Leaflet is the fallback and still needs network access for map tiles. The frontend example also shows optional absolute API and WebSocket URLs.

Backend defaults use SQLite in `backend/tracksafar_dev.db` and development authentication. You can register a passenger through the application. SQLite tables are initialized at startup. No administrator or official fleet data is automatically seeded. To create the first local administrator explicitly, use the command documented in `backend/app/bootstrap_admin.py`; choose your own credentials and protect shell history on shared machines.

Health is available at `/api/health`, interactive API documentation at `/api/docs`, and OpenAPI at `/api/openapi.json` on the backend. Development authentication must not be used in production. See [authentication and database notes](docs/AUTH_AND_DATABASE_REFERENCES.md) before configuring Supabase/PostgreSQL.

## Check changes

```bash
npm run build
npm run typecheck
npm test
cd backend
.venv/bin/python -m pytest -q
.venv/bin/ruff check app tests --select F,I
.venv/bin/ruff format --check app tests
```

The frontend tests render admin views and verify list refresh and independent search timing. The backend tests use a temporary SQLite database to exercise authentication, role checks, validation, catalog writes, and WebSocket authentication/ping. They do not validate production Supabase/PostGIS, external map services, physical-device GPS, or every tracking scenario. TypeScript checks TS/TSX; existing JavaScript uses build and runtime tests. A production bundle-size warning may still appear.

## Project map

- `backend/app/`: MVC API, authentication, configuration, and identity integration
- `backend/tests/`: API integration tests
- `frontend/admin-web/src/`: MVC browser application
- `frontend/admin-web/tests/`: view and controller tests
- `database/supabase/migrations/`: production SQL migration history
- `docs/`: requirements, design, MVC guide, glossary, and code guide

[Code responsibilities](docs/CODE_FUNCTIONS_AND_SERVICES.md) explains where to make feature changes. Existing requirement/design documents record longer-term plans; they are not a list of completed features.

MIT license. See [LICENSE](LICENSE).
