# TrackSafar — Technology Stack

Version: 1.0 · Date: 2026-10-13 · Status: planned technology baseline. Filename intentionally preserved as `teckstack.md`.

Related documents: [Requirements](SRS.md) · [Architecture](architecture.md) · [Detailed design](design.md) · [Rules](rules.md) · [Tasks](tasks.md)

## 1. Selection principles

Use a small stack that three rotating developers can understand and maintain. Keep one credential authority, one domain API and one public tracking feed. TypeScript unifies frontend development; Python implements backend services; PostgreSQL holds authoritative operational data. Framework selection does not imply that features, integrations or deployments already exist.

Exact supported versions will be selected and locked in M1 against current compatibility documentation. No dependency installation or version upgrade is part of this documentation deliverable. Do not copy version pins from earlier experimental scaffolds without review.

## 2. Application and data technologies

| Area | Technology | Responsibility and selection rationale | Boundary |
|---|---|---|---|
| Administrator web | React + Vite + TypeScript | Modular management screens, form validation, catalog tables and fleet UI; Vite supplies local tooling/builds; TypeScript defines frontend contracts. | Browser behavior never authorizes privileged actions. |
| Passenger/Driver mobile | Expo + React Native + TypeScript | One Android/iOS codebase with distinct role panels, native location access and shared components. | Native permissions and OS scheduling constrain background operation. |
| Mobile navigation | React Navigation, proposed | Authenticated stacks and role-specific screens with a common route/stop/tracking viewer. | Screen visibility is separate from API permissions. |
| Client identity | Supabase Auth client integration | Sign-in, passenger signup, session refresh and logout through one provider. | Public keys are not privileged secrets; app roles come from trusted backend data. |
| Mobile session storage | Expo SecureStore, proposed | OS-backed storage for sensitive persisted session material. | Never put refresh credentials in public config or plain general-purpose storage. |
| Domain API | FastAPI + Python | Typed REST endpoints, dependency-based authorization and asynchronous I/O boundaries. | Route handlers delegate business rules to services. |
| Validation/contracts | Pydantic + generated OpenAPI | Explicit validated request/response contracts and a machine-readable API reference. | Generated schemas must still reflect reviewed domain permissions and errors. |
| API runtime | Uvicorn | ASGI runtime for REST and WebSockets. | Multiple workers require shared tracking/event coordination. |
| Relational database | PostgreSQL hosted by Supabase | Accounts' application profiles, buses, routes/stops, assignments, trips and notifications with transactional consistency. | Auth credentials remain provider-owned; application tables do not store passwords. |
| Geospatial support | PostGIS | Geographic points, route geometry and indexed proximity queries. | Geometry and distance alone do not provide a reliable traffic-aware ETA. |
| Backend data access | SQLAlchemy 2 asynchronous sessions + asyncpg, proposed | Parameterized queries, repository boundaries, pooling and explicit transactions. | Backend queries use a restricted server role; per-user authorization remains explicit. |
| Schema changes | Supabase CLI SQL migrations | One ordered history for tables, constraints, indexes, grants and policies. | Do not operate an independent competing migration history. |
| Live delivery | FastAPI WebSockets over WSS | Sanitized fleet snapshots/events to authenticated clients. | Supabase Realtime is not a second enabled client feed in this baseline. |

## 3. Maps, GPS and ETA

**Maps candidate:** Google Maps Platform. Browser and native SDK/API choices will be confirmed during M5, with separate appropriately restricted client keys and a server-only routing credential where needed. Billing and SKU-specific quotas apply; the project must not describe it as unlimited free access. Verify enabled APIs and budgets before integration. [Official pricing overview](https://developers.google.com/maps/billing-and-pricing/overview).

**Alternative:** MapLibre with a licensed tile provider and a separately selected routing service. OpenStreetMap data is not a promise of free unrestricted tiles or routing. Changing provider requires an architecture decision and corresponding task updates; two providers will not be built simultaneously by default.

**Driver location:** Expo Location and TaskManager are proposed for foreground/background capture. Use SDK-compatible packages and a native development build for background validation. Expo Go is not sufficient for background-location acceptance. Test Android/iOS permissions, background configuration and real-device behavior; force termination and OS power policies may stop updates. [Expo location documentation](https://docs.expo.dev/versions/latest/sdk/location/).

**ETA:** a backend service will combine accepted observations, the assigned route, ordered target stop and a reviewed routing/progress method. The provider choice does not prove suitability for Lahore bus routes. M5 must validate the method against route evidence. Missing or unreliable inputs produce an unavailable result.

## 4. Authentication and database security tooling

Supabase Auth is the planned identity authority. FastAPI will validate provider-issued identity and retrieve current application role/activity before authorizing domain operations. FastAPI's security helpers support integration, but the framework does not automatically supply the project's authorization rules. [FastAPI security guidance](https://fastapi.tiangolo.com/tutorial/security/).

PostgreSQL grants and RLS are separate controls. Enable RLS on exposed application tables, revoke unnecessary client grants and add only reviewed access paths. Owners and service-role connections can bypass RLS; keep privileged credentials server-side. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

The default architecture sends domain requests through FastAPI, rather than allowing clients to mutate application tables directly. See [architecture.md](architecture.md) for the restricted backend connection and [rules.md](rules.md) for review requirements.

## 5. Tests and developer workflow

| Tool | Planned use |
|---|---|
| Git and a shared repository | Feature branches, reviewed pull requests and migration history. |
| npm workspaces | Coordinate admin/mobile packages without duplicating frontend dependency management. |
| ESLint, Prettier and TypeScript checking | Consistent TypeScript style and static checks. |
| Ruff and pytest | Python style/static checks and backend unit/integration tests. |
| HTTPX/FastAPI TestClient | API behavior, authentication boundaries and HTTP error scenarios. |
| Vitest + React Testing Library | Admin component and interaction tests. |
| Jest + React Native Testing Library | Mobile screen and state tests, with Expo-compatible setup. |
| Playwright | Administrator browser workflows and cross-browser acceptance. |
| Maestro, proposed | Mobile workflow automation, supplemented by manual physical-device GPS tests. |
| Disposable Supabase/PostgreSQL environments | Migration, constraint, transaction and access-control tests; never production fixtures. |
| k6, proposed | Agreed API and WebSocket load scenarios. |
| Mermaid in Markdown | System, entity and sequence diagrams versioned with documents. |
| GitHub Actions | CI checks for changed layers and integration readiness. |

The task owner writes tests for their layer; the incoming owner must be able to reproduce them. Tool selection is not a coverage claim. Native battery/background tests require real devices even if automation passes.

## 6. Hosting and operations

Use separate development, staging and production environments. Containerize the FastAPI service; choose a host that supports persistent WebSocket connections and TLS. Host the built admin assets on an HTTPS static host. Use Expo development builds and a reviewed signing/release process for Android/iOS; cloud build services are optional and may incur charges.

Supabase supplies hosted PostgreSQL/Auth. Region, backup features and service limits must be confirmed for the selected plan. Secrets belong in host/CI secret stores, not frontend bundles. Monitor API latency/errors, rejected GPS updates, location age, socket disconnects and provider usage. Do not collect tokens or unnecessary personal location history in logs.

A shared message broker is a future scaling requirement if the backend uses multiple realtime workers. The initial deployment may use one backend instance only if its limitations are explicit and load tests justify it. No particular cloud account, paid plan, uptime guarantee or deployment is assumed.

## 7. Version and cost decisions

M1 records the chosen compatible Node, Python, Expo, React Native and package versions in setup documentation and lockfiles when implementation begins. M4 verifies native location support; M5 verifies map/routing costs; M6 verifies hosting, TLS, backups and runtime behavior. Re-check official documentation at those milestones instead of treating this document as a permanent version/pricing reference.

Official reference set, consulted for this documentation on 2026-10-13: the linked FastAPI, Supabase, Expo and Google Maps pages above. Project architecture and tooling proposals are team decisions, not claims that the providers prescribe this exact design.
