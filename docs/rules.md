# TrackSafar — Development and Collaboration Rules

Version: 1.0 · Date: 2026-10-13 · Status: standards for future implementation.

Related documents: [SRS](SRS.md) · [Technology stack](teckstack.md) · [Architecture](architecture.md) · [Detailed design](design.md) · [Tasks and rotation](tasks.md)

## 1. Scope and source of truth

These are project development standards, not instructions to start building the app as part of this documentation delivery. The SRS governs required behavior; architecture governs boundaries; design governs interactions; tasks governs ownership and milestone order. Resolve conflicts through a documented decision and update the affected documents together. Do not treat experimental files from previous drafting as completed project functionality.

Use the approved folder structure. Add a folder only when it has a clear responsibility that existing folders cannot reasonably serve. Keep the six document names as requested, including `teckstack.md`.

## 2. Coding and module conventions

- Use TypeScript for both frontends, Python for FastAPI, and versioned SQL for schema changes.
- Use descriptive domain names. React components/types use PascalCase; TypeScript functions/variables use camelCase; Python and SQL identifiers use snake_case. Avoid unrelated naming conventions within one layer.
- Keep route handlers thin, business rules in services, persistence in repositories, input/output validation in schemas, and shared authorization in the central auth module.
- UI components may validate for usability, but the server repeats security and business validation.
- Do not duplicate auth, map-provider or socket connection logic across feature screens. Use shared adapters.
- Format/lint with the agreed layer tools and enable TypeScript strict checking. Keep public request/response contracts explicit; do not expose internal database models wholesale.
- Return consistent validation, forbidden, conflict, missing-resource and dependency-failure responses. Do not convert failures into successful empty results.
- Use UTC timestamp contracts and explicit coordinate conventions. Geographic point construction must respect longitude/latitude order.

## 3. Identity, permissions and secrets

Supabase Auth is the sole credential authority. Do not store application plaintext passwords or add a competing password-hashing/login scheme. Public registration provisions only passengers. Elevated roles are assigned through an audited privileged workflow.

Each protected REST operation and WebSocket subscription must verify identity and current account authorization. Each write must also check ownership/assignment and allowed fields. Never trust user-editable metadata, a frontend role switch, an arbitrary resource ID or an unsigned/merely decoded token as permission.

Use HTTPS/WSS in deployed environments. Local HTTP is a development exception, not a production default. Limit CORS/origins to intended clients. Never put tokens in URL parameters or logs.

Server credentials, database passwords, service-role keys and secret map-routing keys must stay in server/CI secret stores. `VITE_` and `EXPO_PUBLIC_` values are public build inputs. Public map keys need provider restrictions and usage controls. Only empty or clearly non-secret sample configuration belongs in Git. Redact credentials and unnecessary personal information from errors, screenshots, fixtures and review discussions. If a real secret is committed, revoke/rotate it; deleting the line alone does not fix exposure.

Profile self-service fields must exclude role, identity and active status. Driver/admin deactivation must affect subsequent access and active subscription authorization. Document and test logout/refresh/revocation behavior rather than assuming all tokens disappear immediately.

## 4. Database and migration discipline

- One ordered Supabase SQL migration history is authoritative. Do not rely on manual dashboard edits or ORM auto-create in deployed environments.
- The database owner creates reviewed migrations with the installed CLI's supported workflow; every migration has an explanation, constraints/index review, access implications and a verification/rollback-or-forward-fix plan.
- Enable RLS and review grants for exposed application tables. Default client access is denied in the backend-mediated model. Review functions/views as access paths too.
- Do not solve access errors by globally permissive policies, `SECURITY DEFINER` shortcuts or exposing a service-role key. A privileged connection may bypass RLS; backend authorization is still mandatory.
- Runtime database credentials are separate from migration-owner credentials. Direct SQL does not automatically carry caller identity. Test any transaction-local identity scheme against connection-pool leakage before adopting it.
- Enforce foreign keys, uniqueness and lifecycle constraints where possible. Use transactions and concurrency tests for assignment/trip changes; application prechecks alone do not prevent races.
- Never rewrite an already-applied shared migration. Resolve conflicting migration work before merge; one database owner coordinates each milestone's schema changes.
- Run migrations and seeds only against the explicitly selected environment. Test fresh setup and upgrades in a disposable database before staging promotion.
- Synthetic fixtures are labeled, isolated and never displayed as real Lahore fleet data. Do not seed real credentials or invent official route/location evidence.
- Referenced account/catalog records use deactivation or a reviewed archival/anonymization path. Hard delete is permitted only when references and retention policy allow it.

## 5. Tracking and mobile behavior

Validate coordinates, observed time, accuracy, ordering, active trip and driver ownership before accepting GPS. Derive bus/driver identifiers from the trusted trip. Reject old/future/invalid samples using documented thresholds, and never let delayed packets overwrite fresher data.

Begin sharing only for a validated active trip with appropriate consent. Stop capture after confirmed end or lost authorization. Reconnect must recheck identity/trip state and use bounded queues/retries; do not upload a long stale trail as if it were current. Handle an offline end request explicitly as unconfirmed until the server acknowledges it.

The driver UI distinguishes GPS permission, connectivity and server-accepted sharing. Native background configuration and physical-device tests are mandatory. The 5–15 second interval is a starting experiment, not a delivery guarantee. A force-stopped app or restricted OS may stop location delivery.

Fleet and ETA interfaces must reveal stale, unavailable and ended states. Never invent positions, arrivals, fleet counts or a live label. Use a last-observed timestamp. ETA may be unavailable even while the rest of tracking works.

## 6. Three-member workflow and reviews

The exact rotation and owners are in [tasks.md](tasks.md). All members work in frontend, backend and database across six milestones; each owns each layer twice. Frontend ownership covers both mobile/admin work relevant to that milestone, not a permanently assigned actor panel.

Use the same reviewer ring for all task types: **Member 2 reviews Member 1; Member 3 reviews Member 2; Member 1 reviews Member 3.** No self-approval. A second specialist review is welcome for security/schema changes but does not replace the assigned reviewer.

Each milestone begins with a shared contract workshop led by its backend owner. Record interfaces, schema implications, failures and unresolved decisions before layer work proceeds. Assign one accountable owner to every task. Contributors may pair across layers, but the owner remains responsible for evidence and handoff.

Use task-ID feature branches and focused pull requests. A pull request includes purpose, linked SRS/task IDs, affected contracts/migrations, tests/evidence and known limitations. Keep a working main branch; merge only after required CI and assigned review pass. Do not include secrets, generated dependency folders or unrelated changes. Conflicting edits are reconciled with the owner rather than overwritten.

An integration gate is a joint demonstration, coordinated by its named owner. No rotation starts while blocking integration failures remain. The outgoing owner hands the incoming owner changed files, architecture decisions, contracts, migrations, test commands/results, known issues and next steps; the incoming owner demonstrates that they can reproduce the setup/tests for that layer.

## 7. Test and documentation responsibilities

Every layer task includes its own tests and relevant documentation updates; these are not postponed entirely to Milestone 6. Frontend owners test interaction and state rendering. Backend owners test validation, authorization, business invariants and error contracts. Database owners test constraints, migrations and actual connection-role access. End-to-end gates verify all three layers together.

Mandatory negative scenarios include passenger privilege escalation, cross-user profile/notification access, cross-driver trip/GPS access, inactive accounts/assets, concurrent starts, stale/duplicate/out-of-order GPS, ended-trip ingestion, revoked permission, network loss, socket re-authentication, unavailable ETA and rejected unsafe management changes.

Use synthetic fixtures only in tests and explicitly labeled demos. Native behavior, map billing and cloud readiness cannot be proven solely by mocks. Record actual devices/browsers, configurations, results and limitations. Do not write “passed” for an unexecuted check.

When changing behavior, update SRS acceptance criteria, design/architecture, contracts and tasks in the same review cycle. Save test plans/reports in the approved testing documentation folders and decisions in ADRs. Link evidence from the task tracker so the next layer owner can find it.

## 8. Definition of done and release rules

A task is done only when its stated deliverable exists, its acceptance checks pass, its assigned reviewer approves, affected documents are current and no unresolved blocking issue remains. A milestone also needs its integration gate and signed-off rotation handoff. Status remains Planned/In progress/Blocked until there is evidence; this documentation package marks all implementation tasks Planned.

Release readiness additionally requires an agreed supported-device/load matrix, environment-specific secrets, TLS/origin controls, tested migrations and restore procedure, monitored failure/freshness behavior, provider cost review and documented retention decisions. Release preparation is not authorization to publish to stores or change production. Use a reviewed deployment decision with the intended environment and rollback/forward-fix path.

No calendar deadlines or performance achievements are invented here. If workload becomes uneven, split a task within the same milestone and document ownership/reviewer changes while preserving each member's full rotation through all layers.
