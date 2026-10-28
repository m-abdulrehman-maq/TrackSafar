# TrackSafar MVC guide

MVC means **Model, View, Controller**. Each part has a clear job. Keep the existing checkout; no special workspace or worktree is needed.

| Part | Backend | Frontend | Responsibility |
| --- | --- | --- | --- |
| Model | `backend/app/models/` | `frontend/admin-web/src/models/` | Data, database queries, business rules, and API access |
| View | `backend/app/views/` | `frontend/admin-web/src/views/` | JSON field definitions on the server; pages, layouts, maps, and UI components in the browser |
| Controller | `backend/app/controllers/` | `frontend/admin-web/src/controllers/` | Accept requests or screen actions, call models, and provide results to views |

The backend is a JSON API, so its views are Pydantic request/response definitions, not HTML templates. Input and output definitions live together so each feature's API contract is easy to find. React draws the HTML in the browser. A React controller is a normal custom hook such as `useBusesPageController`, rather than a class or another framework.

## Folder map

```text
backend/app/
  main.py                  # Creates FastAPI and connects the controllers
  models/
    __init__.py            # Database tables and enums
    database.py            # Database connection and sessions
    queries.py             # Reads and filtering
    services/              # Business rules and writes, grouped by subject
  views/                   # API input/output fields and validation
  controllers/
    router.py              # Registers the HTTP controllers
    auth_routes.py         # Registration, login, and profile requests
    admin_routes.py        # Administrator requests
    catalog_routes.py      # Discovery, public catalog, notifications
    driver_routes.py       # Assignment, trip, and GPS requests
    tracking/              # WebSocket messages and subscriptions
  auth/                    # Token verification and role permissions
  core/                    # Settings and shared errors
  integrations/            # External identity provider adapter
  bootstrap_admin.py       # Explicit administrator setup command
frontend/admin-web/src/
  App.jsx                  # URL-to-screen routing
  main.jsx                 # React entry point and query provider
  models/                  # API client, passenger data types, map adapters
  controllers/             # Authentication, location, lists, and screen hooks
  views/
    public/                # Landing, login, registration, legal pages
    layouts/               # Shared public/admin layouts and access guards
    components/ui/         # Reusable buttons, dialogs, tables, loading states
    passenger/             # Passenger pages and map rendering
    driver/                # Driver page
    ...                    # Administrator screens grouped by subject
    styles/                # Shared CSS
    format.js              # Display labels and timestamps
  config/                  # Public frontend environment settings
```

## Example: saving a bus

1. `views/buses/BusesPage.jsx` displays a form and calls `submit` when it is submitted.
2. `controllers/buses/BusesPage.jsx` checks the form, chooses POST or PATCH, and calls `models/api.js`.
3. The API client sends the session token with the request.
4. `backend/app/controllers/admin_routes.py` checks the administrator role and accepts validated fields.
5. `models/services/catalog.py` applies the business rules and saves through SQLAlchemy.
6. `views/catalog.py` defines the JSON returned to the frontend.
7. The frontend controller refreshes the bus list; the view displays the updated data.

## Keep changes easy to follow

- Put data fetching and action handlers in controllers, not page markup.
- Keep database rules on the server. Browser validation helps users; it cannot grant permission.
- Keep reusable visual behavior with the UI: dialog focus, map markers, DOM references, and display-only state belong in views.
- Put shared rules in ordinary named functions. Do not add a base controller or generic CRUD framework for a small feature.
- Use descriptive names and early returns for errors. Preserve role checks, stale-location checks, and error responses when simplifying code.
- Keep SQL migrations under `database/supabase/migrations/`; migrations are database assets, not controllers.

## Cleanup in this refactor

Empty `.gitkeep` scaffolding was removed, including the unimplemented native-mobile and infrastructure directory trees. The web passenger and driver applications remain. The Office temporary lock file was removed; the original design document remains. The passenger compatibility re-export was replaced by a direct import. An unused search-input component and three unused form dependencies were removed. Both Google Maps and Leaflet are retained because Leaflet is the working fallback.

Requirements and design documents describe broader future goals. Their mention of native mobile apps, Docker, or CI does not mean those implementations exist today.
