# TrackSafar — Software Requirements Specification

Version: 1.0 · Date: 2026-10-13 · Status: planned system, not an implementation report.

Related documents: [Technology stack](teckstack.md) · [Architecture](architecture.md) · [Detailed design](design.md) · [Development rules](rules.md) · [Tasks and team workflow](tasks.md)

## 1. Purpose and source

This specification defines what TrackSafar must deliver and how the team will assess completion. It is based on the complete updated problem statement in the referenced **Real-Time Bus Tracking Systems** conversation and the approved TrackSafar folder structure. No existing application, database deployment, operator integration, or working feature is assumed. Earlier experimental starter code is not the project baseline.

The intended readers are the three developers, their project reviewer, and future maintainers. Requirements use **shall** for required behavior. Proposed engineering defaults and unresolved decisions are explicitly identified. Architecture describes how these requirements will be realized; tasks assign the work.

## 2. Problem, objectives and scope

Lahore commuters using public transport, including services such as Speedo and Green Electric Buses, may not know when a bus will arrive or which route serves their destination. TrackSafar will connect passengers, drivers and administrators through registered route information and observed bus positions.

Objectives are to help passengers identify routes and stops, discover nearby active buses, inspect current positions, and obtain an ETA only when sufficient data exists. Drivers will manage assigned trips and share smartphone location during those trips. Administrators will maintain accounts, vehicles and network information and monitor operations.

The first release includes an Android/iOS application with Passenger and Driver panels, a browser-based administrator dashboard, one domain backend and a relational/geospatial database. Basic in-app alerts are included. Ticketing, payments, bookings, seat availability, fare calculation, hardware trackers, automatic public transport data feeds and guaranteed traffic prediction are outside scope. An operator's name does not imply a data agreement or integration.

## 3. Actors and permissions

Authentication proves identity. Authorization decides which operation that identity may perform. All protected operations require an active application account.

| Operation | Passenger | Driver | Administrator |
|---|---|---|---|
| Public registration | Passenger role only | No self-provisioning | No self-provisioning |
| Login, logout and own session | Yes | Yes | Yes |
| View buses, routes, stops and live tracking | Yes | Yes | Yes |
| Own profile and own in-app notifications | Yes | Yes, supporting behavior | Yes, supporting behavior |
| View driver assignment | No | Own assignment | Authorized management view |
| Start/end a driver trip | No | Own valid assignment/trip | No driver impersonation; explicit recovery operation only |
| Broadcast GPS | No | Own active trip | No driver impersonation |
| Manage accounts, drivers, buses, routes, stops, assignments | No | No | Yes |
| View operational fleet/system alerts | Passenger-safe alerts only | Own operational alerts | Fleet-wide |

An administrator recovery action for an abandoned trip is a proposed operational safeguard and must be separately authorized and audited. It is not a substitute for normal driver actions. Public visitors may access registration/login only under the initial access model; anonymous fleet browsing is not included.

## 4. Functional requirements and acceptance criteria

### 4.1 Authentication and common access

| ID | Requirement | Acceptance criterion |
|---|---|---|
| AUTH-01 | The system shall allow passenger registration and privileged provisioning of drivers/administrators. | Public signup cannot select or gain an elevated role; duplicate/failed provisioning produces a recoverable error without partial privileged access. |
| AUTH-02 | All three roles shall securely log in and log out through one identity authority. | Valid users establish sessions; invalid/expired credentials are rejected; logout clears client credentials and requests provider session revocation; token lifetime limitations are documented. |
| AUTH-03 | The backend shall enforce role, active-account and resource-ownership checks. | Direct API requests cannot bypass UI restrictions; deactivated accounts cannot perform protected operations; forged roles and another user's resource identifiers are denied. |
| COM-01 | All three active roles shall view registered buses, routes and stops. | Each role can retrieve permitted catalog information without gaining mutation privileges; private driver/account information is excluded. |
| COM-02 | All three active roles shall view permitted live bus tracking. | Authorized clients obtain observed positions with timestamps; expired/unauthorized subscriptions are denied or closed. |

### 4.2 Passenger module

| ID | Requirement | Acceptance criterion |
|---|---|---|
| P-01 | Discover nearby active buses using passenger GPS when permission is granted. | Valid location/radius returns qualifying fresh active buses; permission denial allows manual search and is not reported as an empty fleet. |
| P-02 | Search by bus number, route number or route name. | Known registered entries can be found through each supported field; no-match and service-error states are distinguishable. |
| P-03 | Display route origins, destinations, paths, ordered stops and active buses on an interactive map. | Selecting a route displays the correct ordered data and direction; a missing path is disclosed instead of invented. |
| P-04 | Allow selection of a stop to inspect approaching buses. | Results are consistent with active trips, route direction and stop order; insufficient progress data is described as unknown, not approaching. |
| P-05 | Provide ETA for a selected bus/trip and stop when inputs are sufficient. | ETA includes observation context; stale position, unknown direction, missing path or routing failure yields unavailable with a reason, never an invented number. |
| P-06 | Allow passengers to view and update their own profile. | Only allowlisted profile fields change; another user's profile and role/activation fields cannot be altered. |
| P-07 | Deliver basic in-app notifications and passenger-safe system alerts. | Users see only their own or intended audience's messages and can mark their own messages read; operational private details are withheld. |

### 4.3 Driver module

| ID | Requirement | Acceptance criterion |
|---|---|---|
| D-01 | Show the driver's current bus and route assignment. | The authenticated driver's current assignment is shown; no assignment is an explicit state. |
| D-02 | Start a trip only with an active driver, bus, route and valid current assignment. | Invalid or conflicting starts fail without partial changes; concurrent starts cannot create multiple active trips for the same bus/driver. |
| D-03 | End an authorized active trip. | Ending is safe to retry; the backend rejects subsequent location ingestion and removes the bus from active tracking; the device stops capture. |
| D-04 | Capture and transmit driver smartphone GPS during an active trip. | The backend validates position, timing, accuracy, ordering and ownership and derives the bus from the trip; another driver's trip is rejected. |
| D-05 | Clearly show sharing state and GPS/network operational alerts. | Permission denial, GPS unavailable, disconnected network and confirmed sharing are distinguishable; sending alone is not labeled server-confirmed live. |
| D-06 | Attempt to resume sharing after temporary network failure when the trip remains active. | Reconnect validates session and trip status, uses bounded retries/queues, and prevents old samples from replacing newer observations. |

### 4.4 Administrator module

| ID | Requirement | Acceptance criterion |
|---|---|---|
| A-01 | Provide CRUD and activation/deactivation for passenger and driver accounts. | Admin-only changes are audited; elevated provisioning is controlled; deletion follows reference/retention rules and cannot erase required history silently. |
| A-02 | Provide bus CRUD and activation/deactivation. | Identifiers are unique; invalid updates fail; buses in active service cannot be silently reassigned or deactivated mid-trip. |
| A-03 | Create, update and deactivate routes/stops and maintain route-stop order. | References and sequence are valid; route detail and map agree; referenced historical data is preserved. |
| A-04 | Assign drivers to buses and routes. | Only eligible active records can form an assignment; conflicting current assignments and edits underneath active trips are blocked. |
| A-05 | Monitor active buses, ongoing trips and system alerts in realtime. | Trip end removes the bus; stale location is visibly distinct; reconnect reconciles against an authoritative snapshot. |
| A-06 | Manage basic system alerts and inspect operational incidents. | Admin-created audience-safe notices and operational alerts remain distinct; resolution/read state is represented consistently and changes are audited. |

## 5. Non-functional requirements

| ID | Requirement | Verification |
|---|---|---|
| NFR-01 | Responsive APIs/maps, smooth updates and concurrent users; trial GPS transmission at 5–15 seconds. | Measure API latency, map loading, fan-out, dropped updates and device battery use against an agreed fleet/load profile. The interval is a tuning target, not an OS guarantee. |
| NFR-02 | Secure transport, credential handling, identity verification and authorization. | HTTPS/WSS deployment checks; negative role/ownership tests; no plaintext application passwords or privileged secrets in clients/logs/Git. |
| NFR-03 | Preserve relational and location integrity and never invent live observations. | Invalid/nonfinite coordinates, stale/future samples, duplicates, out-of-order updates and concurrent lifecycle changes have explicit tests. |
| NFR-04 | Handle dependency/network failures and support recoverable operation. | Verify reconnect, permission loss, process restart, database/routing failure and backup restoration; no silent success or persistent false-live state. |
| NFR-05 | Clear responsive interfaces with accessible labels and minimal commuter steps. | Keyboard/screen-reader checks, legible contrast and touch controls; usability walkthroughs for finding a bus, selecting a stop and starting/ending a trip. |
| NFR-06 | Modular, maintainable design that supports the three-member rotation and future expansion. | Defined module boundaries, reviewed contracts/migrations, reproducible setup, documented handoffs and traceable requirements/tasks. |
| NFR-07 | Android/iOS mobile support and modern Chrome/Edge/Firefox/Safari administration. | Record tested device/OS/browser combinations; execute native background-location tests on physical devices. |
| NFR-08 | Minimize personal/location data and define retention. **Proposed privacy baseline.** | Passenger GPS is not retained by default; only necessary driver observations are collected during trips; access, retention and deletion decisions are documented before release. |

Numeric latency, concurrency, uptime, freshness and accuracy thresholds require project evidence. They are release decisions, not measured achievements. The decision register below assigns when they must be resolved.

## 6. Principal use cases

| Use case | Preconditions and normal flow | Failure/alternative path | Requirements |
|---|---|---|---|
| UC-01 Register and sign in | Passenger registers, completes configured identity verification, signs in and obtains a passenger profile. | Duplicate identity, verification failure or profile provisioning delay shows a recoverable state; no elevated access. | AUTH-01, AUTH-02, AUTH-03 |
| UC-02 Find a bus | Active user grants location or enters a search; selects bus/route; inspects its stops. | Denied GPS uses manual search; empty results and offline errors differ. | COM-01, P-01, P-02, P-03 |
| UC-03 Inspect a stop/ETA | User selects a stop and a qualifying active trip; observes tracking and conditional ETA. | Stale/insufficient data shows unknown/unavailable and last observation time. | COM-02, P-04, P-05 |
| UC-04 Operate a trip | Driver views assignment, starts trip, grants required permissions, broadcasts and ends trip. | Inactive/conflicting assignment denies start; revoked permission or network loss changes sharing state; retries remain safe. | D-01, D-02, D-03, D-04, D-05, D-06 |
| UC-05 Maintain the network | Admin manages accounts, buses, routes/stops and assignments. | Invalid references/conflicts are rejected; historical records use deactivation where hard deletion is unsafe. | A-01, A-02, A-03, A-04 |
| UC-06 Monitor and notify | Admin monitors trips/incidents and publishes an appropriate notice; intended users read it. | Unauthorized audiences cannot access private operational details; ended/stale trips update correctly. | A-05, A-06, P-07 |
| UC-07 Maintain profile | Passenger edits allowed profile fields. | Role/identity/activation changes and cross-user writes are rejected. | P-06, AUTH-03 |

## 7. Constraints and decision register

The project will use the stack described in [teckstack.md](teckstack.md). Development starts from the approved folder organization. There are three members with milestone-based layer rotation, no invented deadlines, and no assumed existing code. English is the documentation language; additional interface localization requires an explicit decision.

| Decision | Proposed default or unresolved evidence | Accountable decision task / deadline |
|---|---|---|
| Central identity and signup policy | Supabase Auth; public passenger signup; privileged driver/admin provisioning; provider verification policy recorded before integration. | M1-C, before M1 integration |
| Official network data | Operator-provided or otherwise licensed/verified routes and stops; synthetic fixtures clearly isolated in tests. No dataset assumed. | M2-C, before route acceptance |
| Route direction and loops | Separate direction-specific route records; repeated stops distinguished by sequence. Validate with available route data. | M2-C |
| Freshness, accuracy, future-skew and reconnect limits | Configurable thresholds chosen using physical-device/network measurements; no hard-coded undocumented production values. | M4-C, finalized at M4-G |
| Mapping/routing provider and ETA method | Google Maps Platform candidate; budget/API restrictions and available routing data must be verified. ETA must permit unavailable results. | M5-C before provider integration |
| Alert audiences | Own notifications, passenger-safe public notices to authenticated users, and restricted operational incidents. | M5-C |
| Retention/deletion | No passenger location retention by default; preserve referenced operational history until an approved retention/anonymization policy applies. | M1-C baseline; M6-C release review |
| Performance and supported platform targets | Agree fleet/load profile and supported device/browser matrix, then set measurable acceptance targets. | M1-C provisional; M6-C final |
| Hosting, region and cost | Select a suitable HTTPS/WSS backend host and Supabase region with measured connectivity, cost and privacy considerations. | M6-C before deployment preparation |

These decisions are required tasks, not permission to claim unavailable evidence. An unresolved release-critical decision blocks the relevant integration or release gate.

## 8. Acceptance and traceability

Every requirement above is mapped to concrete tasks and acceptance evidence in the traceability table in [tasks.md](tasks.md). A milestone passes only when frontend, backend and database behavior is demonstrated together, negative cases pass, documentation is updated and the rotation handoff is complete. SRS changes require updating affected design, contracts and tasks before implementation proceeds.
