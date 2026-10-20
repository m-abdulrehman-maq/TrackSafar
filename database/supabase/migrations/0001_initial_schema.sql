-- TrackSafar initial schema (authoritative Supabase/PostgreSQL migration).
-- One ordered migration history: never edit an applied migration; add a new one.
-- Notes:
--  * Identity credentials live in Supabase Auth (auth.users). No application passwords.
--  * Geometry columns are optional: route.path stays GeoJSON-compatible JSON so the
--    portable SQLAlchemy models and Postgres/PostGIS deployments share one model layer.
--    PostGIS extensions/GIST indexes are added in 0002_geospatial.sql when enabled.
--  * RLS is enabled with deny-by-default policies: clients never read/mutate
--    application tables directly; the backend role is granted explicit privileges.

create extension if not exists pgcrypto;

do $$ begin
  create type role_enum as enum ('passenger', 'driver', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type route_direction_enum as enum ('outbound', 'inbound');
exception when duplicate_object then null; end $$;
do $$ begin
  create type assignment_status_enum as enum ('active', 'ended');
exception when duplicate_object then null; end $$;
do $$ begin
  create type trip_status_enum as enum ('active', 'ended');
exception when duplicate_object then null; end $$;
do $$ begin
  create type alert_audience_enum as enum ('all_authenticated', 'passengers', 'drivers', 'admins');
exception when duplicate_object then null; end $$;
do $$ begin
  create type alert_severity_enum as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type incident_status_enum as enum ('open', 'acknowledged', 'resolved');
exception when duplicate_object then null; end $$;
do $$ begin
  create type audit_outcome_enum as enum ('success', 'denied', 'error');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 160),
  email text not null unique check (position('@' in email) > 1),
  phone text,
  role role_enum not null default 'passenger',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_active on profiles(is_active);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id),
  driver_code text not null unique check (char_length(driver_code) between 2 and 32),
  license_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists buses (
  id uuid primary key default gen_random_uuid(),
  bus_number text not null unique check (char_length(bus_number) between 1 and 32),
  registration_number text unique,
  operator text,
  seating_capacity integer check (seating_capacity is null or seating_capacity between 1 and 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  route_number text not null check (char_length(route_number) between 1 and 32),
  name text not null check (char_length(name) between 2 and 160),
  origin text not null,
  destination text not null,
  direction route_direction_enum not null default 'outbound',
  path json, -- GeoJSON-style [[lon, lat], ...]; null when no verified geometry exists
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_number, direction)
);
create index if not exists idx_routes_number on routes(route_number);

create table if not exists stops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_stops_name on stops(name);
create index if not exists idx_stops_geo on stops(latitude, longitude);

create table if not exists route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  stop_id uuid not null references stops(id),
  sequence integer not null check (sequence > 0),
  unique (route_id, sequence)
);
create index if not exists idx_route_stops_stop on route_stops(stop_id);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id),
  bus_id uuid not null references buses(id),
  route_id uuid not null references routes(id),
  status assignment_status_enum not null default 'active',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_assignments_driver on assignments(driver_id, status);
create index if not exists idx_assignments_bus on assignments(bus_id, status);

-- One current assignment per driver and per bus (concurrency-safe, beyond app prechecks).
create unique index if not exists uq_assignment_driver_active
  on assignments(driver_id) where status = 'active';
create unique index if not exists uq_assignment_bus_active
  on assignments(bus_id) where status = 'active';

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id),
  driver_id uuid not null references drivers(id),
  bus_id uuid not null references buses(id),
  route_id uuid not null references routes(id),
  status trip_status_enum not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references profiles(id),
  end_reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_trips_status on trips(status);
create index if not exists idx_trips_driver on trips(driver_id, status);
create index if not exists idx_trips_bus on trips(bus_id, status);

create unique index if not exists uq_trip_driver_active
  on trips(driver_id) where status = 'active';
create unique index if not exists uq_trip_bus_active
  on trips(bus_id) where status = 'active';

create table if not exists bus_location_current (
  trip_id uuid primary key references trips(id) on delete cascade,
  bus_id uuid not null references buses(id),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m >= 0),
  sequence integer not null check (sequence >= 0),
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  check (observed_at <= received_at + interval '2 minutes')
);
create index if not exists idx_location_bus on bus_location_current(bus_id);
create index if not exists idx_location_observed on bus_location_current(observed_at);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'system',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_recipient on notifications(recipient_id, created_at desc);

create table if not exists system_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity alert_severity_enum not null default 'info',
  audience alert_audience_enum not null,
  is_published boolean not null default true,
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_alerts_audience on system_alerts(audience, is_published);

create table if not exists operational_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  severity alert_severity_enum not null default 'warning',
  status incident_status_enum not null default 'open',
  trip_id uuid references trips(id),
  bus_id uuid references buses(id),
  route_id uuid references routes(id),
  reported_by uuid references profiles(id),
  resolved_by uuid references profiles(id),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_incidents_status on operational_incidents(status, created_at desc);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references profiles(id),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  outcome audit_outcome_enum not null default 'success',
  metadata_json json,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_created on audit_events(created_at desc);
create index if not exists idx_audit_entity on audit_events(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Access control: deny-by-default for API clients (backend-mediated model).
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table drivers enable row level security;
alter table buses enable row level security;
alter table routes enable row level security;
alter table stops enable row level security;
alter table route_stops enable row level security;
alter table assignments enable row level security;
alter table trips enable row level security;
alter table bus_location_current enable row level security;
alter table notifications enable row level security;
alter table system_alerts enable row level security;
alter table operational_incidents enable row level security;
alter table audit_events enable row level security;

-- No client policies are defined: default is deny. The dedicated backend
-- runtime role receives object privileges below; it still performs per-user
-- authorization in FastAPI. Never grant anon/authenticated on these tables.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','drivers','buses','routes','stops','route_stops','assignments',
    'trips','bus_location_current','notifications','system_alerts',
    'operational_incidents','audit_events'
  ] loop
    execute format('revoke all on table %I from anon, authenticated;', t);
    execute format('grant select, insert, update, delete on table %I to tracksafar_backend;', t);
  end loop;
exception when undefined_object then
  raise notice 'tracksafar_backend role not yet created; run 0000_runtime_role first';
end $$;
