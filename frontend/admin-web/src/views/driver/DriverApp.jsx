import { useDriverAppController } from "../../controllers/driver/DriverApp";
import {
  CircleStop,
  LogOut,
  MapPin,
  PlayCircle,
  RefreshCw,
  Route,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatTime } from "../format";
import {
  Badge,
  Banner,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  PageHeader,
} from "../components/ui/Display";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/Dialog";
import { SkeletonCard } from "../components/ui/Skeleton";
function StatusPill({ tone, children }) {
  return (
    <Badge tone={tone} dot>
      {children}
    </Badge>
  );
}
export function DriverApp() {
  const {
    profile,
    gpsState,
    network,
    lastSent,
    lastSentAt,
    sendError,
    setSendError,
    samples,
    confirmEnd,
    setConfirmEnd,
    handleLogout,
    assignment,
    invalidate,
    startMutation,
    endMutation,
    activeTrip,
    startWatching,
    a,
  } = useDriverAppController();
  if (assignment.isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted">
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <p className="text-sm font-bold text-brand-700">TrackSafar</p>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
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
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          <ErrorState
            message={assignment.error.message}
            onRetry={() => assignment.refetch()}
          />
        </main>
      </div>
    );
  }
  if (!a) {
    return (
      <DriverShell onLogout={handleLogout}>
        <PageHeader
          title="Driver dashboard"
          description="No active assignment found."
        />
        <Card>
          <CardBody>
            <Banner tone="warning" title="No assignment">
              You have no current driver assignment. An administrator must pair
              you with a bus and route before you can start a trip. If you
              believe this is wrong, contact dispatch.
            </Banner>
          </CardBody>
        </Card>
      </DriverShell>
    );
  }
  return (
    <DriverShell onLogout={handleLogout}>
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
        <Banner tone="danger" title="Reporting issue">
          {sendError}
        </Banner>
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
              <p className="text-base font-semibold text-ink">
                {a.route_number} · {a.route_name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-ink-muted">Bus</p>
                <p className="font-medium text-ink">{a.bus_number}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Assignment</p>
                <p className="font-medium text-ink">
                  since {formatTime(a.valid_from)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Trip status"
            description="One active trip at a time — enforced server-side."
          />
          <CardBody className="space-y-4">
            {!activeTrip ? (
              <>
                <Banner tone="info" title="No active trip">
                  Start a trip when you are ready to depart. Ending a trip
                  requires a confirmation.
                </Banner>
                <Button
                  onClick={() => {
                    setSendError(null);
                    startMutation.mutate();
                  }}
                  loading={startMutation.isPending}
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start
                  trip
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="brand">Trip active</StatusPill>
                  <span className="text-xs text-ink-muted">
                    since {formatTime(activeTrip.started_at)}
                  </span>
                </div>

                <div className="rounded-[--radius-control] border border-border bg-surface-muted p-3.5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">GPS</span>
                    {gpsState === "active" ? (
                      <StatusPill tone="success">Active — reporting</StatusPill>
                    ) : gpsState === "locating" ? (
                      <StatusPill tone="warning">Acquiring signal…</StatusPill>
                    ) : gpsState === "denied" ? (
                      <StatusPill tone="danger">Permission denied</StatusPill>
                    ) : gpsState === "unavailable" ? (
                      <StatusPill tone="danger">Unavailable</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">Not started</StatusPill>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Network</span>
                    {network === "online" ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-success">
                        <Wifi className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-danger">
                        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        Offline
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Samples accepted</span>
                    <span className="font-medium tabular-nums text-ink">
                      {samples}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Last send</span>
                    <span className="text-xs font-medium text-ink">
                      {lastSentAt ? formatTime(lastSentAt) : "—"}
                    </span>
                  </div>
                  {lastSent && (
                    <p className="font-mono text-[10px] text-ink-faint">
                      {lastSent.latitude.toFixed(5)},{" "}
                      {lastSent.longitude.toFixed(5)}
                    </p>
                  )}
                </div>

                {gpsState === "denied" && (
                  <Banner tone="danger" title="Location permission required">
                    Your browser is blocking location access. Trip tracking
                    cannot work without it. Open site settings, allow location,
                    then tap “Retry GPS”.
                  </Banner>
                )}
                {network === "offline" && (
                  <Banner tone="warning" title="Offline">
                    Samples are queued by the browser and will sync once
                    connectivity returns, or will be rejected if they fall
                    outside the freshness window.
                  </Banner>
                )}

                <div className="flex flex-wrap gap-2">
                  {gpsState !== "active" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={startWatching}
                    >
                      <MapPin className="h-4 w-4" aria-hidden="true" /> Retry
                      GPS
                    </Button>
                  )}
                  <Button
                    variant="danger-soft"
                    size="sm"
                    onClick={() => setConfirmEnd(true)}
                  >
                    <CircleStop className="h-4 w-4" aria-hidden="true" /> End
                    trip
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmEnd}
        danger
        title="End trip?"
        description="Your location will stop being reported and the trip is closed for the day. This cannot be undone — an administrator can only recover abandoned trips."
        confirmLabel="End trip"
        loading={endMutation.isPending}
        onClose={() => setConfirmEnd(false)}
        onConfirm={() => endMutation.mutate(activeTrip?.id)}
      />
    </DriverShell>
  );
}
function DriverShell({ onLogout, children }) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <p className="text-sm font-bold text-brand-700">TrackSafar</p>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-ink-muted sm:inline">
              Driver mode
            </span>
            <Button variant="secondary" size="sm" onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
