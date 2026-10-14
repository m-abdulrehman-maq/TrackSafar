# TrackSafar — Implementation Tasks and Three-Member Workflow

Version: 1.0 · Date: 2026-10-13 · Status: all application implementation tasks below are **Planned**.

Related documents: [Requirements](SRS.md) · [Technology stack](teckstack.md) · [Architecture](architecture.md) · [Detailed design](design.md) · [Development rules](rules.md)

## 1. How to use this plan

This is the execution backlog for the future application, not a statement that development has begun or passed testing. Use the approved empty folder structure as the project organization. This documentation delivery does not install dependencies, create application code or provision a database.

Replace Member 1/2/3 with names when known; do not change the ownership rotation without updating this document. No dates or effort estimates are invented. Agree schedules after the team reviews workload and external dependencies.

Each task row specifies one owner, one reviewer, an output and a completion criterion. The heading supplies its milestone. **C** means contract/decisions, **F** frontend, **B** backend, **D** database, **G** integration gate and **H** handoff. C/G/H are real accountable tasks, not unowned shared work. Everyone participates in contract workshops and integration demonstrations.

Every implementation task includes tests and relevant document updates as part of its deliverable. “Complete” means the row's checks pass, evidence is linked and its reviewer approves under [rules.md](rules.md). Until then, the task remains Planned, In progress or Blocked.

## 2. Layer rotation and review matrix

| Milestone | Frontend owner | Backend owner | Database owner |
|---|---|---|---|
| M1 — Foundations, authentication and profiles | Member 1 | Member 2 | Member 3 |
| M2 — Bus, route and stop management | Member 2 | Member 3 | Member 1 |
| M3 — Assignments and trip lifecycle | Member 3 | Member 1 | Member 2 |
| M4 — GPS ingestion and realtime tracking | Member 1 | Member 2 | Member 3 |
| M5 — Passenger discovery, maps, ETA and alerts | Member 2 | Member 3 | Member 1 |
| M6 — Integrated testing and deployment preparation | Member 3 | Member 1 | Member 2 |

| Member | Frontend milestones | Backend milestones | Database milestones | Assigned reviewer |
|---|---|---|---|---|
| Member 1 | M1, M4 | M3, M6 | M2, M5 | Member 2 |
| Member 2 | M2, M5 | M1, M4 | M3, M6 | Member 3 |
| Member 3 | M3, M6 | M2, M5 | M1, M4 | Member 1 |

Each member owns each layer twice. Frontend means both mobile and administrator work relevant to the milestone. The team does not permanently allocate one member to only Passenger, Driver or Administration.

## 3. Dependency and working pattern

M1 → M2 → M3 → M4 → M5 → M6. Each milestone starts after the preceding milestone's H task, except M1 which starts from the approved documentation.

Within a milestone: C → F/B/D → G → H. F/B/D may start in parallel against reviewed contracts after C. Their completion must use real integrated behavior: a frontend mock is not final evidence, and backend persistence cannot pass before the database deliverable is available. G requires all F/B/D tasks to pass; H requires G. Unresolved blocking issues prevent H and the next rotation.

Recommended work cycle: contract workshop → small task branches → tests and cross-review → merged integration environment → joint demonstration → evidence update → handoff. Do not hold all branches until a milestone ends; integrate small compatible changes after review.

## 4. Milestone tasks

### M1 — Foundations, authentication and profiles

Outcome: repeatable development setup and a secure identity/profile path for each actor, including administrator account management foundations.

| Task | Owner | Reviewer | Deliverable and completion criterion | SRS references |
|---|---|---|---|---|
| M1-C | Member 2 | Member 3 | Lead workshop: confirm compatible tool versions, identity/session strategy, passenger provisioning, privileged provisioning, permission matrix, profile fields and provisional privacy/platform/load assumptions. All three owners approve contracts; unresolved evidence has an owner and deadline in SRS. | AUTH-01, AUTH-02, AUTH-03, NFR-01, NFR-06, NFR-07, NFR-08 |
| M1-F | Member 1 | Member 2 | Establish web/mobile shells, shared session adapters, role navigation, passenger signup/profile screens and administrator users/drivers forms. Verify login/logout, verification/provisioning errors, permitted profile edits and forbidden states; UI does not grant roles. | AUTH-01, AUTH-02, AUTH-03, P-06, A-01, NFR-05, NFR-07 |
| M1-B | Member 2 | Member 3 | Implement centralized provider-token verification, current role/activity lookup, self-profile API and audited administrator account/driver management including safe deletion/deactivation. Test invalid/expired sessions, role escalation, cross-user writes, inactive accounts and failed/retried provisioning. | AUTH-01, AUTH-02, AUTH-03, P-06, A-01, NFR-02, NFR-04 |
| M1-D | Member 3 | Member 1 | Design/profile/driver/audit migrations, restricted runtime access and identity linkage without app password storage. Test clean migration, uniqueness/references, denied direct-client access, authorized backend access and safe user lifecycle; document retention baseline. | AUTH-01, AUTH-03, P-06, A-01, NFR-02, NFR-03, NFR-08 |
| M1-G | Member 1 | Member 2 | Coordinate integrated registration, login/logout, own-profile update and administrator provision/deactivate flows. Demonstrate direct-request privilege/ownership denials and session policy; all layer evidence is linked. | AUTH-01, AUTH-02, AUTH-03, P-06, A-01, NFR-02, NFR-06 |
| M1-H | Member 3 | Member 1 | Coordinate rotation handoff: frontend Member 1 → 2; backend Member 2 → 3; database Member 3 → 1. Incoming owners reproduce setup and tests; all three handoff records accepted and no blocking M1 failures remain. | NFR-06 |

### M2 — Bus, route and stop management

Outcome: administrators maintain the catalog and all active roles can view registered transport information.

| Task | Owner | Reviewer | Deliverable and completion criterion | SRS references |
|---|---|---|---|---|
| M2-C | Member 3 | Member 1 | Agree catalog CRUD/list/detail contracts, identifiers, pagination, route direction/stop sequencing, deletion rules and licensed-data source. Confirm missing-path behavior; no unofficial fixture is accepted as live operator data. | COM-01, A-02, A-03, NFR-03, NFR-06 |
| M2-F | Member 2 | Member 3 | Build admin bus/route/stop editors and ordered route-stop controls; add common mobile/web catalog views including Driver network access. Test forms, no-match/empty/error states, ordering and role-restricted controls. Map rendering is completed in M5. | COM-01, P-02, P-03, A-02, A-03, NFR-05 |
| M2-B | Member 3 | Member 1 | Implement authorized catalog CRUD, activation and search/list/detail services. Test all-role reads, admin-only writes, pagination, valid identifiers and safe deletion/conflict responses. Extend active-trip edit protection in M3. | COM-01, P-02, A-02, A-03, AUTH-03, NFR-03 |
| M2-D | Member 1 | Member 2 | Create bus/route/stop/route-stop schema and PostGIS support, constraints/indexes and reviewed catalog access. Verify coordinate bounds, positive unique route sequence, repeated stops at different positions, references and idempotent labeled fixture import. | COM-01, P-03, A-02, A-03, NFR-02, NFR-03 |
| M2-G | Member 2 | Member 3 | Demonstrate administrator catalog creation/edit/deactivation and reads/search from all three roles. Verify ordered-stop consistency, denied non-admin mutations, sourced-data record and honest absent geometry states. | COM-01, P-02, P-03, A-02, A-03, NFR-03, NFR-05 |
| M2-H | Member 1 | Member 2 | Handoff frontend Member 2 → 3; backend Member 3 → 1; database Member 1 → 2. Incoming owners reproduce catalog tests/migrations and acknowledge data provenance and contract decisions. | NFR-06 |

### M3 — Assignments and trip lifecycle

Outcome: administrators make eligible assignments and drivers can start/end their own trips safely, before GPS sharing is enabled.

| Task | Owner | Reviewer | Deliverable and completion criterion | SRS references |
|---|---|---|---|---|
| M3-C | Member 1 | Member 2 | Agree current-assignment rules, preserved trip identity, active-asset change restrictions, retry/idempotency behavior and audited recovery operation. Review race scenarios with all owners. | D-01, D-02, D-03, A-04, NFR-03, NFR-06 |
| M3-F | Member 3 | Member 1 | Build admin assignment editor and Driver assignment/start/end flows. Display ineligible/no-assignment/conflict and pending end states; no screen claims confirmed start/end before backend acknowledgment. | D-01, D-02, D-03, A-04, NFR-05 |
| M3-B | Member 1 | Member 2 | Implement own-assignment access, atomic authorized trip start/end, safe retry behavior, audited administrative recovery and active-trip management guards. Test cross-driver access, inactive driver/bus/route, reassignment conflicts and repeated end requests. | AUTH-03, D-01, D-02, D-03, A-02, A-03, A-04, NFR-03 |
| M3-D | Member 2 | Member 3 | Add assignment/trip relations, current-assignment uniqueness, active-trip uniqueness and transaction/locking tests. Preserve referenced assignment/route history; simultaneous starts cannot create conflicting active trips. | D-01, D-02, D-03, A-04, NFR-03 |
| M3-G | Member 3 | Member 1 | Demonstrate assignment → driver start → active state → end, plus invalid/concurrent/retried actions. Confirm no cross-driver operation or ordinary catalog edit bypasses lifecycle constraints. | AUTH-03, D-01, D-02, D-03, A-04, NFR-03, NFR-04 |
| M3-H | Member 2 | Member 3 | Handoff frontend Member 3 → 1; backend Member 1 → 2; database Member 2 → 3. Incoming owners reproduce lifecycle/concurrency tests and explain assignment/trip invariants. | NFR-06 |

### M4 — GPS ingestion and realtime tracking

Outcome: validated driver observations flow to authenticated viewers with accurate sharing/freshness states and trip-end removal.

| Task | Owner | Reviewer | Deliverable and completion criterion | SRS references |
|---|---|---|---|---|
| M4-C | Member 2 | Member 3 | Agree GPS fields, timestamp/accuracy/order rules, measured freshness/retry thresholds, authenticated WebSocket handshake/events and single-instance versus shared fan-out deployment assumption. Include revoked/expired sessions and offline end scenarios. | COM-02, D-04, D-05, D-06, NFR-01, NFR-02, NFR-03, NFR-04 |
| M4-F | Member 1 | Member 2 | Implement Driver foreground/background capture, permissions and actual sharing/network state; authenticated tracking clients and fleet freshness/list views for all roles. Test real Android/iOS devices, denied/revoked permissions, disconnect/reconnect and trip end. Final provider maps come in M5. | COM-02, D-03, D-04, D-05, D-06, A-05, NFR-05, NFR-07 |
| M4-B | Member 2 | Member 3 | Build authorized GPS ingestion and sanitized WebSocket snapshot/events, session rechecks, stale-state handling and end-trip removal. Test invalid, stale, future, duplicate and out-of-order samples, cross-driver writes, bounded clients and reconnect reconciliation. | COM-02, D-03, D-04, D-06, A-05, AUTH-03, NFR-02, NFR-03, NFR-04 |
| M4-D | Member 3 | Member 1 | Add current-location geography/indexes and ordered update logic linked to active trips. Verify atomic newest-observation behavior, observed/received times, ended-trip exclusion and restricted access; do not add unapproved passenger/raw location history. | D-03, D-04, A-05, NFR-01, NFR-02, NFR-03, NFR-08 |
| M4-G | Member 1 | Member 2 | Demonstrate physical-device capture through persistence to all-role viewers, network recovery and trip-end disappearance. Record interval/battery/freshness observations; distinguish OS suspension from app failure and resolve production threshold choices. | COM-02, D-03, D-04, D-05, D-06, A-05, NFR-01, NFR-03, NFR-04, NFR-07 |
| M4-H | Member 3 | Member 1 | Handoff frontend Member 1 → 2; backend Member 2 → 3; database Member 3 → 1. Transfer native configuration, device evidence, event contracts, thresholds and limitations; incoming owners reproduce tracking checks. | NFR-06 |

### M5 — Passenger discovery, maps, ETA and alerts

Outcome: passengers can find and inspect useful transport information, while each audience receives only appropriate notices.

| Task | Owner | Reviewer | Deliverable and completion criterion | SRS references |
|---|---|---|---|---|
| M5-C | Member 3 | Member 1 | Finalize map/routing provider, costs/key restrictions, route-progress/approaching logic, ETA inputs and unavailable reasons, proximity limits and alert audiences. Validate provider/route evidence; no numeric ETA is accepted without a defensible method. | P-01, P-03, P-04, P-05, P-07, A-06, NFR-02, NFR-03 |
| M5-F | Member 2 | Member 3 | Complete passenger nearby/search/map/route/stop/ETA flows, common all-role map viewer, own alerts/read state and admin alert/fleet map screens. Test manual search without GPS, absent geometry, no results, stale data and unavailable ETA; preserve accessibility. | COM-01, COM-02, P-01, P-02, P-03, P-04, P-05, P-07, A-05, A-06, NFR-05 |
| M5-B | Member 3 | Member 1 | Implement fresh nearby filtering, approaching-stop logic, nullable ETA with reasons, notification ownership and operational/public alert services. Test wrong direction, insufficient progress, provider failure, intended audiences and cross-user read/update denials. | P-01, P-02, P-04, P-05, P-07, A-06, AUTH-03, NFR-03, NFR-04 |
| M5-D | Member 1 | Member 2 | Add notification/system-alert persistence, lifecycle/recipient constraints and geospatial/query indexes. Verify audience-sensitive queries, recipient read updates, accepted trip/stop joins and documented query plans on representative fixtures. | P-01, P-04, P-07, A-06, NFR-01, NFR-02, NFR-03 |
| M5-G | Member 2 | Member 3 | Demonstrate search/nearby → route → ordered stop → observed bus/conditional ETA and admin notice → intended user receipt/read. Verify denied GPS and provider/network failures, stale-state honesty, privacy and admin operational monitoring. | P-01, P-02, P-03, P-04, P-05, P-07, A-05, A-06, NFR-03, NFR-05, NFR-08 |
| M5-H | Member 1 | Member 2 | Handoff frontend Member 2 → 3; backend Member 3 → 1; database Member 1 → 2. Incoming owners reproduce provider-independent and configured integration tests and understand ETA limitations, costs and alert access. | NFR-06 |

### M6 — Integrated testing and deployment preparation

Outcome: evidence-based release readiness and operational handover, without implying automatic production deployment.

| Task | Owner | Reviewer | Deliverable and completion criterion | SRS references |
|---|---|---|---|---|
| M6-C | Member 1 | Member 2 | Agree final measurable load/latency criteria, supported platform matrix, hosting/region, retention, migration/restore plan and release checklist. Resolve SRS release-blocking decisions using actual evidence and budget constraints. | NFR-01, NFR-02, NFR-04, NFR-06, NFR-07, NFR-08 |
| M6-F | Member 3 | Member 1 | Complete admin/mobile regression, accessibility, responsive/browser and native-device checks; prepare build/release instructions and user guides. Demonstrate all role workflows on the agreed matrix and record known non-blocking limitations. | NFR-05, NFR-07, COM-01, COM-02, P-01, P-02, P-03, P-04, P-05, P-06, P-07, D-01, D-02, D-03, D-04, D-05, D-06, A-01, A-02, A-03, A-04, A-05, A-06 |
| M6-B | Member 1 | Member 2 | Run full API/role/ownership/socket regressions and load/failure tests; prepare container/runtime, CI, TLS/origin configuration, readiness, redacted logs and monitoring runbooks. Evidence meets agreed targets; no deployment or availability claim without execution. | AUTH-01, AUTH-02, AUTH-03, NFR-01, NFR-02, NFR-03, NFR-04, NFR-06 |
| M6-D | Member 2 | Member 3 | Validate clean/upgrade migrations, grants/RLS/runtime-role boundaries, concurrency, index behavior, retention procedures and backup restoration in a disposable environment. Prepare staging promotion/forward-fix runbook; record successful restore evidence and unresolved risks. | NFR-01, NFR-02, NFR-03, NFR-04, NFR-08 |
| M6-G | Member 3 | Member 1 | Lead full three-role acceptance demonstration and review all requirement evidence in the traceability matrix. Every requirement has a result; no unresolved blocker remains; readiness is distinguished from a later approved release. | AUTH-01, AUTH-02, AUTH-03, COM-01, COM-02, P-01, P-02, P-03, P-04, P-05, P-06, P-07, D-01, D-02, D-03, D-04, D-05, D-06, A-01, A-02, A-03, A-04, A-05, A-06, NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-08 |
| M6-H | Member 2 | Member 3 | Coordinate final maintenance handover: all three members can reproduce setup, explain all layers and use deployment/incident/restore guidance. Record owners for remaining non-blocking work; archive evidence and document each member's contributions across all layers. | NFR-06 |

## 5. Requirement-to-task traceability

The SRS owns the detailed acceptance criterion. The task IDs below identify implementation responsibility and the gate where the criterion must be demonstrated. M6-G additionally reviews the entire matrix; it does not replace earlier milestone testing.

| Requirement | Primary implementation/decision tasks | Acceptance gate |
|---|---|---|
| AUTH-01 | M1-C, M1-F, M1-B, M1-D | M1-G |
| AUTH-02 | M1-C, M1-F, M1-B | M1-G |
| AUTH-03 | M1-B, M1-D, M2-B, M3-B, M4-B, M5-B | M1-G, M3-G, M6-G |
| COM-01 | M2-F, M2-B, M2-D, M5-F | M2-G |
| COM-02 | M4-F, M4-B, M5-F | M4-G, M6-G |
| P-01 | M5-C, M5-F, M5-B, M5-D | M5-G |
| P-02 | M2-F, M2-B, M5-F, M5-B | M2-G, M5-G |
| P-03 | M2-C, M2-F, M2-D, M5-F | M2-G, M5-G |
| P-04 | M5-C, M5-F, M5-B, M5-D | M5-G |
| P-05 | M5-C, M5-F, M5-B | M5-G |
| P-06 | M1-F, M1-B, M1-D | M1-G |
| P-07 | M5-C, M5-F, M5-B, M5-D | M5-G |
| D-01 | M3-F, M3-B, M3-D | M3-G |
| D-02 | M3-C, M3-F, M3-B, M3-D | M3-G |
| D-03 | M3-F, M3-B, M3-D, M4-F, M4-B, M4-D | M3-G, M4-G |
| D-04 | M4-C, M4-F, M4-B, M4-D | M4-G |
| D-05 | M4-C, M4-F | M4-G |
| D-06 | M4-C, M4-F, M4-B | M4-G |
| A-01 | M1-F, M1-B, M1-D | M1-G |
| A-02 | M2-F, M2-B, M2-D, M3-B | M2-G, M3-G |
| A-03 | M2-F, M2-B, M2-D, M3-B | M2-G, M3-G |
| A-04 | M3-C, M3-F, M3-B, M3-D | M3-G |
| A-05 | M4-F, M4-B, M4-D, M5-F | M4-G, M5-G |
| A-06 | M5-C, M5-F, M5-B, M5-D | M5-G |
| NFR-01 | M1-C, M4-C, M4-D, M5-D, M6-C, M6-B, M6-D | M4-G, M6-G |
| NFR-02 | M1-B, M1-D, M2-D, M4-B, M4-D, M5-D, M6-B, M6-D | M1-G, M6-G |
| NFR-03 | M2-B, M2-D, M3-B, M3-D, M4-B, M4-D, M5-B, M6-D | M2-G, M3-G, M4-G, M5-G, M6-G |
| NFR-04 | M1-B, M4-B, M5-B, M6-B, M6-D | M3-G, M4-G, M6-G |
| NFR-05 | M1-F, M2-F, M3-F, M4-F, M5-F, M6-F | M2-G, M5-G, M6-G |
| NFR-06 | M1-C, M2-C, M3-C, M6-B, M1-H, M2-H, M3-H, M4-H, M5-H, M6-H | M1-G, M6-G |
| NFR-07 | M1-C, M1-F, M4-F, M6-C, M6-F | M4-G, M6-G |
| NFR-08 | M1-C, M1-D, M4-D, M6-C, M6-D | M5-G, M6-G |

## 6. Required handoff record

Every outgoing layer owner prepares a record; the H-task owner coordinates completeness and the assigned reviewer checks it. Include:

1. Milestone, layer, outgoing member, incoming member and acceptance date.
2. Changed folders/files and linked reviewed pull requests.
3. Requirement IDs completed and the actual test/evidence locations.
4. Interface contracts, schema/migration changes and compatibility notes.
5. Setup/test instructions using secret references only, never secret values.
6. Relevant architecture decisions and reasons for non-obvious choices.
7. Known limitations and open issues, with owner and blocking status.
8. Next milestone dependencies and recommended first checks.
9. Incoming owner's confirmation that setup/tests were reproduced and questions resolved.

For M6, replace the next-rotation record with a maintenance handover accepted by all three members. Historical task ownership stays recorded even if members pair or help outside their current layer.

## 7. Evidence and progress tracking

Maintain a task tracker with ID, owner, reviewer, status, linked branch/PR, test report, document updates and blockers. Use the approved documentation folders for requirements, design/ADRs, setup guidance, test reports and deployment runbooks. Use app-specific test folders for layer checks and root tests for cross-system cases.

The G-task evidence must include successful scenarios, required negative cases, tested environment/device configuration and remaining limitations. The reviewer verifies the evidence rather than accepting an unchecked “done” label. An unavailable external dataset, provider budget or physical test device remains an explicit blocker for the behavior that depends on it; a mock or invented live demonstration does not resolve that blocker.

Implementation is considered ready for a separate release decision only after M6-H passes. Actual cloud deployment, store publication and operation are later actions with their own evidence and environment authorization.
