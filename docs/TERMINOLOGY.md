# TrackSafar terminology and technology stack

This glossary describes the code that is present today. See [MVC.md](MVC.md) for the folder map and [the README](../README.md) for commands.

## Languages and tools

| Term | What it does here | Why it is used |
| --- | --- | --- |
| JavaScript (JS) | Runs frontend controllers and React components in the browser | Handles user interactions and API calls |
| TypeScript (TS) | Adds types to passenger screens and map/data code | Makes data shapes and function arguments easier to check |
| JSX / TSX | HTML-like markup inside JS / TS files | Describes React screens alongside their display logic |
| Python | Runs the backend API and business rules | Supports readable asynchronous server code |
| SQL | Defines the production database schema in migrations | Creates database tables, indexes, and constraints |
| HTML | Provides the frontend root document | Gives React a place to render |
| CSS | Defines colors, spacing, layout, and passenger screen styles | Keeps presentation consistent |
| Node.js | Runs Vite, npm scripts, and frontend tests | Provides the frontend development runtime |
| npm / workspaces | Installs packages and runs the admin-web workspace from the root | Keeps one JavaScript dependency lockfile |
| package.json | Lists frontend dependencies and commands | Makes installation and available commands explicit |
| package-lock.json | Records exact npm dependency versions and integrity hashes | Allows repeatable installation with `npm ci` |
| pyproject.toml / requirements.txt | Declare Python packages and tool settings | Document backend requirements; Python versions are currently ranges, not a frozen lock |
| Virtual environment (`.venv`) | Isolates backend Python packages | Avoids mixing application dependencies with system packages |
| Git / GitHub | Tracks source revisions and hosts the repository | Supports collaboration and review |

## Frontend libraries

| Term | Function | Why it is used |
| --- | --- | --- |
| React / React DOM | Builds components and renders them into the browser document | Reuses UI elements and updates screens when state changes |
| Vite | Serves development modules, proxies API/WebSocket calls, and builds production assets | Provides a fast frontend workflow |
| React Router | Maps URLs to screens and handles redirects | Separates passenger, driver, public, and admin routes |
| TanStack Query | Fetches and caches server data; tracks loading/error states and mutations | Avoids writing the same request lifecycle in every screen |
| Tailwind CSS | Supplies utility classes and integrates with Vite | Gives pages consistent styling without a separate CSS rule for every element |
| Lucide React | Supplies icon components | Keeps icons consistent |
| clsx | Combines conditional CSS class names | Makes variant styling readable |
| Google Maps JavaScript API | Displays the optional Google map | Provides a familiar interactive map when a configured key is available |
| Leaflet / OpenStreetMap tiles | Displays the fallback map | Keeps map rendering available without a Google Maps key; tiles still need network access |
| Photon / Nominatim | Searches place names in the geocoding adapter | Converts user searches into geographic coordinates; needs external network access |
| Vitest | Runs frontend tests | Checks controllers and views during development |
| Testing Library / jest-dom / jsdom | Renders components, simulates browser behavior, and provides DOM assertions | Tests what a user can see and interact with without a full browser |
| TypeScript compiler (`tsc`) | Checks the TS/TSX source without writing output | Finds invalid types and unresolved imports before deployment |

## Backend libraries and database

| Term | Function | Why it is used |
| --- | --- | --- |
| FastAPI | Registers HTTP routes, validation, and OpenAPI documentation | Exposes the server API to the frontend |
| Uvicorn / ASGI | Runs the asynchronous Python web application | Handles HTTP and WebSocket connections |
| Starlette | Provides the web foundation used by FastAPI | Supplies routing, middleware, and test-client infrastructure |
| Pydantic | Defines and validates API input/output fields | Rejects invalid requests and gives responses predictable shapes |
| pydantic-settings / python-dotenv | Loads settings from process variables and optional `.env` files | Keeps configuration out of source code |
| SQLAlchemy / ORM | Maps Python model classes to SQL tables and builds queries | Makes database reads and writes consistent |
| Async session | A scoped unit for database work that can await I/O | Allows requests to share a connection pool without sharing their transaction state |
| SQLite / aiosqlite | Local file database and asynchronous driver | Enables development without an external database service |
| PostgreSQL / asyncpg | Production relational database and asynchronous driver | Supports the production data model and concurrent operations |
| Supabase | Hosted PostgreSQL and the deployed identity provider | Supplies production storage and centralized identity; separate configuration is required |
| PostGIS | Spatial PostgreSQL extension referenced by the SQL migration | Supports production geographic data and distance queries; local SQLite does not prove PostGIS behavior |
| HTTPX | Calls external identity APIs and supports API tests | Provides asynchronous HTTP requests |
| PyJWT / JWT | Signs development tokens and verifies identity tokens | Carries an expiring, signed session identity |
| bcrypt | Hashes and verifies development passwords | Avoids storing plaintext passwords; production credentials belong to the identity provider |
| python-multipart | Adds multipart/form-data parsing support to FastAPI | Supports form/file handling when needed by API integrations |
| pytest / pytest-asyncio | Runs Python tests, including asynchronous tests | Checks backend behavior and database interactions |
| Ruff | Checks and formats Python | Helps keep Python code consistent and detect mistakes |

## Architecture, security, and transport terms

| Term | Meaning and role in TrackSafar | Why it matters |
| --- | --- | --- |
| MVC | Model stores data/rules, View displays results, Controller handles actions | Makes code easier to locate and understand |
| Component / props | A reusable React UI function and the inputs passed to it | Keeps screens composed of understandable parts |
| Hook / state / effect | React functions for reusable logic, changing values, and work synchronized with the browser | Drives screen controllers and UI behavior |
| Context / provider | Shares authentication or query state with descendant components | Avoids passing the same session through every component |
| Query / mutation / invalidation | Read data / change data / mark cached reads for refresh | Keeps displayed lists synchronized with writes |
| API / REST endpoint | A URL and HTTP method that performs an operation | Connects browser controllers to backend controllers |
| GET / POST / PATCH / PUT | Read / create or perform action / partial update / replace | Communicates the purpose of each request |
| JSON / schema | Structured request data / the rules for its fields | Gives client and server a shared contract |
| OpenAPI | Machine-readable API specification generated at `/api/openapi.json` | Documents endpoints and powers `/api/docs` |
| WebSocket | Persistent two-way connection at `/ws/tracking` | Delivers tracking updates without repeated HTTP requests |
| HTTP / HTTPS / WSS | Web transport / encrypted web transport / encrypted WebSocket | Protects deployed sessions and location data |
| Proxy / CORS | Vite forwards local API calls / backend controls allowed browser origins | Connects frontend and backend during development and limits browser access |
| Authentication / authorization | Verify identity / verify permission | A valid token alone does not grant admin or driver actions |
| Bearer token / principal / role | Session token / trusted current user / passenger, driver, or admin permissions | Checks the current server profile before protected actions |
| RLS | Row-level security in the production database design | Limits database access; it does not replace backend role checks |
| Environment variable / secret | Runtime configuration / sensitive credential | Separates deployment settings from code; `VITE_` inputs are public |
| Migration / index / foreign key / transaction | Versioned schema change / lookup optimization / relationship constraint / atomic work unit | Preserves database consistency and traceable changes |
| Pagination / debounce | Load a page of records / wait briefly before acting on typing | Limits network work and avoids requests for every keystroke |
| Audit event | Record of a privileged or operational action | Makes important changes traceable |

## Transport and location terms

| Term | Function | Why it is used |
| --- | --- | --- |
| Bus / route / stop | Vehicle / direction-specific travel path / boarding location | Defines the transport catalog |
| Assignment / trip | Driver-bus-route allocation / actual journey session | Connects GPS observations to the authorized driver and vehicle |
| GPS / geolocation | Device location observations | Supplies passenger location and active driver tracking |
| Latitude / longitude | North-south / east-west coordinates | Locates points on a map; route geometry uses `[longitude, latitude]` |
| Geocoding | Converting a place name to coordinates | Enables place search |
| Fresh / stale / unavailable | Recent observation / old observation / missing usable position | Prevents the UI from presenting old or absent data as live |
| ETA | Estimated time of arrival | Helps journey planning; estimates remain disabled by default until supported by evidence |
| Alert / notification / incident | Published service notice / user message / operational problem | Communicates service changes and records issues |

## Planned technologies versus running code

Expo, React Native, Docker deployment, GitHub Actions CI, native background GPS, and physical-device testing appear in the design documents. They are future work, not working components in this checkout. Empty scaffold folders were removed rather than presenting them as implemented features. Production Supabase/PostGIS, map billing, and external network integrations need their own credentials and integration validation.
