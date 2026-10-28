import { useDriverAppController } from "../../controllers/driver/DriverApp";
import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Bus, Bell, UserRound, Route, MapPin, AlertCircle, LogOut,
  RefreshCw, PlayCircle, CircleStop,
} from "lucide-react";
import { formatTime } from "../format";
import {
  Badge, Banner, Card, CardBody, CardHeader, ErrorState,
  PageHeader, EmptyState,
} from "../components/ui/Display";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Dialog";
import { SkeletonCard } from "../components/ui/Skeleton";
import { get } from "../../models/api";

function StatusPill({ tone, children }) {
  return <Badge tone={tone} dot>{children}</Badge>;
}

function NavTab({ to, label, icon: Icon, isActive }) {
  return (
    <NavLink to={to} end={to === "/driver"}
      className={({ isActive }) =>
        "flex flex-col items-center gap-1.5 px-3 py-2 text-xs rounded-[--radius-control] transition-colors " +
        (isActive
          ? "bg-brand-100 text-brand-700 border border-brand-200"
          : "text-ink-muted hover:bg-surface-muted hover:text-ink")}
    >
      <Icon size={18} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  );
}

export function DriverApp() {
  const {
    profile, gpsState, network, lastSent, lastSentAt, sendError,
    setSendError, samples, confirmEnd, setConfirmEnd, handleLogout,
    assignment, invalidate, startMutation, endMutation, activeTrip,
    startWatching, a,
  } = useDriverAppController();

  const [tab, setTab] = useState("trip");
  const tabs = [
    { to: "/driver", label: "My trip", icon: MapPin, id: "trip" },
    { to: "/driver/network", label: "Network", icon: Bus, id: "network" },
    { to: "/driver/alerts", label: "Alerts", icon: Bell, id: "alerts" },
    { to: "/driver/account", label: "Account", icon: UserRound, id: "account" },
  ];

  if (assignment.isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted">
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <p className="text-sm font-bold text-brand-700">TrackSafar</p>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-ink-muted sm:inline">Driver mode</span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard /><SkeletonCard />
          </div>
        </main>
      </div>
    );
  }
  if (assignment.isError) {
    return (
      <div className="min-h-screen bg-surface-muted">
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <p className="text-sm font-bold text-brand-700">TrackSafar</p>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-ink-muted sm:inline">Driver mode</span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          <ErrorState message={assignment.error.message} onRetry={() => assignment.refetch()} />
        </main>
      </div>
    );
  }
  if (!a) {
    return (
      <DriverShell onLogout={handleLogout} activeTab={tab} tabs={tabs} setTab={setTab}>
        <MyTripView profile={profile} gpsState={gpsState} network={network}
          lastSent={lastSent} lastSentAt={lastSentAt} sendError={sendError}
          setSendError={setSendError} samples={samples} confirmEnd={confirmEnd}
          setConfirmEnd={setConfirmEnd} handleLogout={handleLogout}
          assignment={assignment} invalidate={invalidate}
          startMutation={startMutation} endMutation={endMutation}
          activeTrip={activeTrip} startWatching={startWatching} a={a} />
      </DriverShell>
    );
  }
  return (
    <DriverShell onLogout={handleLogout} activeTab={tab} tabs={tabs} setTab={setTab}>
      <MyTripView profile={profile} gpsState={gpsState} network={network}
        lastSent={lastSent} lastSentAt={lastSentAt} sendError={sendError}
        setSendError={setSendError} samples={samples} confirmEnd={confirmEnd}
        setConfirmEnd={setConfirmEnd} handleLogout={handleLogout}
        assignment={assignment} invalidate={invalidate}
        startMutation={startMutation} endMutation={endMutation}
        activeTrip={activeTrip} startWatching={startWatching} a={a} />
    </DriverShell>
  );
}

function MyTripView({ profile, gpsState, network, lastSent, lastSentAt,
  sendError, setSendError, samples, confirmEnd, setConfirmEnd, handleLogout,
  assignment, invalidate, startMutation, endMutation, activeTrip,
  startWatching, a }) {
  if (assignment.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }
  if (assignment.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <ErrorState message={assignment.error.message} onRetry={() => assignment.refetch()} />
      </div>
    );
  }
  if (!a) {
    return (
      <>
        <PageHeader title="Driver dashboard" description="No active assignment found." />
        <Card>
          <CardBody>
            <Banner tone="warning" title="No assignment">
              You have no current driver assignment. An administrator must pair
              you with a bus and route before you can start a trip.
            </Banner>
          </CardBody>
        </Card>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={`Driver dashboard${profile?.full_name ? ` — ${profile.full_name}` : ""}`}
        description="Start your trip, then keep your phone with you — locations are reported automatically."
        actions={
          <Button variant="secondary" size="sm" onClick={invalidate}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </Button>
        }
      />
      {sendError && (
        <Banner tone="danger" title="Reporting issue">{sendError}</Banner>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Current assignment"
            description="Managed by an administrator — you cannot change these details."
          />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Route className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <p className="text-base font-semibold text-ink">{a.route_number} · {a.route_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-ink-muted">Bus</p>
                <p className="font-medium text-ink">{a.bus_number}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Assignment</p>
                <p className="font-medium text-ink">since {formatTime(a.valid_from)}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Trip status" description="One active trip at a time — enforced server-side." />
          <CardBody className="space-y-4">
            {!activeTrip ? (
              <>
                <Banner tone="info" title="No active trip">
                  Start a trip when you are ready to depart.
                </Banner>
                <Button onClick={() => { setSendError(null); startMutation.mutate(); }} loading={startMutation.isPending}>
                  <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start trip
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="brand">Trip active</StatusPill>
                  <span className="text-xs text-ink-muted">since {formatTime(activeTrip.started_at)}</span>
                </div>
                <div className="rounded-[--radius-control] border border-border bg-surface-muted p-3.5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">GPS</span>
                    {gpsState === "active" ? <StatusPill tone="success">Active — reporting</StatusPill> : gpsState === "locating" ? <StatusPill tone="warning">Acquiring signal…</StatusPill> : gpsState === "denied" ? <StatusPill tone="danger">Permission blocked</StatusPill> : <StatusPill tone="neutral">Idle</StatusPill>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Network</span>
                    {network === "online" ? <StatusPill tone="success">Online</StatusPill> : <StatusPill tone="danger">Offline</StatusPill>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Samples accepted</span>
                    <span className="font-medium text-ink">{samples}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Last send</span>
                    <span className="text-xs font-medium text-ink">{lastSentAt ? formatTime(lastSentAt) : "—"}</span>
                  </div>
                </div>
                {gpsState === "denied" && (
                  <Banner tone="danger" title="Location permission required">
                    Your browser is blocking location access. Open site settings, allow location, then tap "Retry GPS".
                  </Banner>
                )}
                {network === "offline" && (
                  <Banner tone="warning" title="Offline">
                    Samples will sync once connectivity returns.
                  </Banner>
                )}
                <div className="flex flex-wrap gap-2">
                  {gpsState !== "active" && (
                    <Button variant="secondary" size="sm" onClick={startWatching}>
                      <MapPin className="h-4 w-4" aria-hidden="true" /> Retry GPS
                    </Button>
                  )}
                  <Button variant="danger-soft" size="sm" onClick={() => setConfirmEnd(true)}>
                    <CircleStop className="h-4 w-4" aria-hidden="true" /> End trip
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog open={confirmEnd} danger title="End trip?"
        description="Your location will stop being reported and the trip is closed for the day."
        confirmLabel="End trip" loading={endMutation.isPending}
        onClose={() => setConfirmEnd(false)}
        onConfirm={() => endMutation.mutate(activeTrip?.id)} />
    </>
  );
}

function NetworkView() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [activeBuses, setActiveBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNetwork = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [busRes, routeRes, stopRes, trackingRes] = await Promise.allSettled([
        get("/catalog/buses?page_size=50"),
        get("/catalog/routes?page_size=50"),
        get("/catalog/stops?page_size=50"),
        get("/tracking/active"),
      ]);
      if (busRes.status === "fulfilled") setBuses(busRes.value.items || []);
      if (routeRes.status === "fulfilled") setRoutes(routeRes.value.items || []);
      if (stopRes.status === "fulfilled") setStops(stopRes.value.items || []);
      if (trackingRes.status === "fulfilled") setActiveBuses(trackingRes.value.buses || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadNetwork(); }, [loadNetwork]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="Network" description="Registered buses, routes and stops." />
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="Network" description="Registered buses, routes and stops." />
        <ErrorState message={error} onRetry={loadNetwork} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Network" description="Browse registered buses, routes and stops across the network." />
      <Card>
        <CardHeader title="Active buses on network" description={`Buses currently sharing location (${activeBuses.length}).`} />
        <CardBody>
          {activeBuses.length === 0 ? (
            <EmptyState title="No active buses" description="No buses are currently sharing live location on the network." />
          ) : (
            <div className="space-y-2">
              {activeBuses.slice(0, 8).map((bus) => (
                <div key={bus.trip_id} className="flex items-center justify-between p-3 rounded-[--radius-control] border border-border bg-white">
                  <div className="flex items-center gap-3">
                    <Bus className="h-5 w-5 text-brand-700" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-ink">{bus.bus_number}</p>
                      <p className="text-xs text-ink-muted">{bus.route_number} · {bus.route_name}</p>
                    </div>
                  </div>
                  <Badge tone={bus.freshness === "fresh" ? "success" : bus.freshness === "stale" ? "warning" : "neutral"}>{bus.freshness}</Badge>
                </div>
              ))}
              {activeBuses.length > 8 && <p className="text-xs text-ink-muted text-center mt-2">+{activeBuses.length - 8} more active buses</p>}
            </div>
          )}
        </CardBody>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <Card>
          <CardHeader title="Buses" description={`${buses.length} registered vehicles`} />
          <CardBody className="space-y-2">
            {buses.length === 0 ? <p className="text-xs text-ink-muted">No buses registered.</p> : (
              <div className="space-y-2">
                {buses.slice(0, 10).map((bus) => (
                  <div key={bus.id} className="flex items-center justify-between p-2 rounded-[--radius-control] border border-border bg-white">
                    <span className="text-sm text-ink">{bus.bus_number}</span>
                    <Badge tone={bus.has_active_trip ? "brand" : "neutral"} size="sm">{bus.has_active_trip ? "Active" : "Idle"}</Badge>
                  </div>
                ))}
                {buses.length > 10 && <p className="text-xs text-ink-muted text-center mt-2">+{buses.length - 10} more</p>}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Routes" description={`${routes.length} registered routes`} />
          <CardBody className="space-y-2">
            {routes.length === 0 ? <p className="text-xs text-ink-muted">No routes registered.</p> : (
              <div className="space-y-2">
                {routes.slice(0, 10).map((route) => (
                  <div key={route.id} className="flex items-center justify-between p-2 rounded-[--radius-control] border border-border bg-white">
                    <span className="text-sm text-ink">{route.route_number} · {route.name}</span>
                    <span className="text-xs text-ink-muted">{route.origin} → {route.destination}</span>
                  </div>
                ))}
                {routes.length > 10 && <p className="text-xs text-ink-muted text-center mt-2">+{routes.length - 10} more</p>}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Stops" description={`${stops.length} registered stops`} />
          <CardBody className="space-y-2">
            {stops.length === 0 ? <p className="text-xs text-ink-muted">No stops registered.</p> : (
              <div className="space-y-2">
                {stops.slice(0, 10).map((stop) => (
                  <div key={stop.id} className="flex items-center justify-between p-2 rounded-[--radius-control] border border-border bg-white">
                    <span className="text-sm text-ink">{stop.name}</span>
                    <MapPin className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                  </div>
                ))}
                {stops.length > 10 && <p className="text-xs text-ink-muted text-center mt-2">+{stops.length - 10} more</p>}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function AlertsView() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await get("/driver/alerts");
      setAlerts(res.alerts || res.items || []);
    } catch (err) { setAlerts([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="Alerts" description="Your operational notifications." />
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Alerts" description="Operational notices and alerts relevant to your trips." />
      {error && <Banner tone="danger" title="Unable to load alerts">{error}</Banner>}
      {alerts.length === 0 ? (
        <EmptyState title="No alerts" description="You have no operational alerts at this time."
          action={<Button variant="secondary" size="sm" onClick={loadAlerts}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh</Button>} />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-ink">{alert.title || "Alert"}</h3>
                  </div>
                  <Badge tone={alert.severity === "high" ? "danger" : "info"} size="sm">{alert.severity || "info"}</Badge>
                </div>
                {alert.message && <p className="mt-2 text-xs text-ink-muted leading-relaxed">{alert.message}</p>}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-muted">{alert.created_at ? formatTime(alert.created_at) : "—"}</span>
                  {alert.read !== true && <Button variant="secondary" size="sm" onClick={() => {}}>Mark read</Button>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountView({ profile, handleLogout }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Account" description="Your driver profile and settings." />
      <Card>
        <CardHeader title="Profile" description="Your account details as registered by the administrator." />
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-lg">
              {(profile?.full_name || "D").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{profile?.full_name || "Driver account"}</p>
              <p className="text-xs text-ink-muted">{profile?.role || "driver"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-[--radius-control] border border-border bg-surface-muted">
              <p className="text-xs text-ink-muted">Email</p>
              <p className="text-sm text-ink">{profile?.email || "Not provided"}</p>
            </div>
            <div className="p-3 rounded-[--radius-control] border border-border bg-surface-muted">
              <p className="text-xs text-ink-muted">Phone</p>
              <p className="text-sm text-ink">{profile?.phone || "Not provided"}</p>
            </div>
          </div>
          <div className="p-3 rounded-[--radius-control] border border-border bg-surface-muted">
            <p className="text-xs text-ink-muted">Role</p>
            <p className="text-sm text-ink">Driver</p>
            <p className="mt-1 text-xs text-ink-muted">Driver accounts are provisioned by an administrator.</p>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Trip sharing" description="Your location is shared only during an active trip." />
        <CardBody className="space-y-4">
          <div className="p-3 rounded-[--radius-control] border border-border bg-surface-muted">
            <p className="text-xs text-ink-muted">How it works</p>
            <p className="text-sm text-ink leading-relaxed">
              When you start a trip, your smartphone sends GPS observations to the server every few seconds.
              The bus appears as active on the network map. When you end the trip, sharing stops immediately.
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-ink">Location sharing</span>
            <Badge tone="brand">Active during trips only</Badge>
          </div>
        </CardBody>
      </Card>
      <div className="mt-6">
        <Button variant="danger-soft" size="sm" onClick={handleLogout} className="w-full">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
        </Button>
      </div>
    </div>
  );
}

function DriverShell({ onLogout, activeTab, tabs, setTab, children }) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <p className="text-sm font-bold text-brand-700">TrackSafar</p>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-ink-muted sm:inline">Driver mode</span>
            <Button variant="secondary" size="sm" onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
            </Button>
          </div>
        </div>
      </header>
      <nav className="border-b border-border bg-white">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex gap-1 px-2 py-1 overflow-x-auto scrollbar-hide">
            {tabs.map((t) => (
              <NavTab key={t.id} to={t.to} label={t.label} icon={t.icon}
                isActive={activeTab === t.id} onClick={() => setTab(t.id)} />
            ))}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}