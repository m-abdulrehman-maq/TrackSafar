# Code responsibilities

Use this guide to find the code for a task. [MVC.md](MVC.md) explains the request flow; [TERMINOLOGY.md](TERMINOLOGY.md) explains the technology names.

## Backend

| File or folder | Main responsibilities |
| --- | --- |
| `backend/app/main.py` | Create the FastAPI application, initialize development tables, register CORS/controllers, health and WebSocket endpoints |
| `backend/app/controllers/router.py` | Group the HTTP controllers under the configured API prefix |
| `backend/app/controllers/auth_routes.py` | Auth configuration, register, login, own profile, role redirect |
| `backend/app/controllers/admin_routes.py` | Admin overview, fleet, people, routes/stops, assignments, trips, alerts, incidents, settings, audit |
| `backend/app/controllers/catalog_routes.py` | Active catalog, route details, nearby/live tracking, ETA, notifications |
| `backend/app/controllers/driver_routes.py` | Assigned vehicle/route, starting/ending trips, location ingestion |
| `backend/app/controllers/tracking/hub.py` | WebSocket authentication, subscriptions, broadcasts, and connection cleanup |
| `backend/app/models/` | SQLAlchemy entities, database connection, queries, business services |
| `backend/app/views/` | Validated JSON request/response contracts grouped by feature |
| `backend/app/auth/` | Token verification, trusted principals, and role helpers |
| `backend/app/core/` | Configuration and API error types |
| `backend/app/integrations/identity.py` | External identity provider operations |
| `backend/app/bootstrap_admin.py` | Explicit initial administrator provisioning |

Business services are grouped by purpose: `people`, `catalog`, `ops`, `alerts`, and `audit`. A controller should use these ordinary functions instead of duplicating database rules. `queries.py` contains reusable reads; services manage writes and transactions.

## Frontend

| File or folder under `frontend/admin-web/src/` | Main responsibilities |
| --- | --- |
| `App.jsx` | Browser routing and role-specific route groups |
| `main.jsx` | React root, query provider, startup UI |
| `models/api.js` | HTTP methods, bearer token storage, error conversion |
| `models/passenger.ts` | Passenger data contracts, catalog loading, filtering, formatting helpers |
| `models/maps/` | Google Maps loading and place-search adapters |
| `controllers/auth.jsx` | Auth provider, login/logout/registration, session/profile state |
| `controllers/lists.js` | Paged reads and independent debounced search |
| `controllers/usePassengerLocation.ts` | Passenger browser geolocation state and permission labels |
| `controllers/<subject>/` | Screen state, server reads, action handlers, form validation |
| `views/<subject>/` | Screen markup and display-only behavior |
| `views/public/` | Landing, login, registration, and static public pages |
| `views/layouts/` | Shared page layout, navigation, and route guards |
| `views/components/ui/` | Buttons, fields, tables, dialogs, skeletons, and display states |
| `views/passenger/PassengerMap.tsx` | Google map view with Leaflet fallback |
| `views/passenger/PassengerLeafletMap.tsx` | Fallback map markers, route lines, and interaction |
| `views/format.js` | Timestamp, role, freshness, and display labels |
| `views/styles/` | Shared application CSS |
| `config/env.js` | Public API and WebSocket URL configuration |

Screen controller hooks use names such as `useBusesPageController` and return the data and handlers the view needs. Small rendering components, DOM effects, and map drawing remain in views. There is no base-controller inheritance hierarchy or generated CRUD framework.

## Common changes

- Add a field: update the database entity/migration where needed, API contract, model service, controller, form, and tests.
- Change a screen layout: edit its view and shared UI components.
- Change a form action or loading behavior: edit its controller.
- Change a server rule: edit its model service and add an API regression test.
- Change permissions: inspect `auth`, the endpoint controller, and tests for each affected role.

Run the build, TypeScript check, frontend tests, and backend tests after changes. See the root README for commands and current test coverage limits.
