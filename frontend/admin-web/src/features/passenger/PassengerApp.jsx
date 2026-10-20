import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bus, LogOut, MapPin, Navigation, RefreshCw, Signal, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { get } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatDistance, formatTime, FRESHNESS_LABELS } from "../../lib/format";
import { Badge, Banner, Card, CardBody, CardHeader, EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui/Display";
import { Button } from "../../components/ui/Button";
import { SkeletonCard } from "../../components/ui/Skeleton";

const FRESHNESS_TONE = { fresh: "success", stale: "warning", unavailable: "neutral" };

const MAP_NOTE =
  "Map view requires a provider key — none is configured yet. Once a provider is approved (M5), " +
  "the map replaces this placeholder. Route, bus and freshness data below come from the live API.";

function RouteStopStrip({ stops }) {
  if (!stops || stops.length === 0) {
    return <p className="text-xs text-ink-muted">No published stop sequence for this route yet.</p>;
  }
  return (
    <ol className="space-y-0">
      {stops.map((stop, idx) => (
        <li key={stop.stop_id} className="relative flex gap-3 pb-4 last:pb-0">
          <div className="relative flex flex-col items-center">
            <span
              className="z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-border bg-white"
              aria-hidden="true"
            />
            {idx < stops.length - 1 && <span className="absolute top-3.5 h-full w-px bg-border" aria-hidden="true" />}
          </div>
          <div className="-mt-0.5 min-w-0 flex-1 text-ink">
            <p className="text-sm font-medium">{stop.stop_name}</p>
            <p className="text-xs text-ink-muted">{stop.sequence}. in sequence</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function NearbyResult({ item }) {
  const bus = item.bus;
  const distance = item.distance_m;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[--radius-control] border border-border px-3.5 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Bus className="h-4 w-4 text-brand-700" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">
            {bus.route_number} · {bus.route_name}
          </p>
        </div>
        <p className="mt-1 font-mono text-[11px] text-ink-faint">{bus.bus_number}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {bus.latitude != null
            ? `Last seen ${formatDistance(distance)} away`
            : "Position not yet reported"}
        </p>
        {bus.observed_at && (
          <p className="text-[11px] text-ink-faint">observed {formatTime(bus.observed_at)}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge tone={FRESHNESS_TONE[bus.freshness]} dot>
          {FRESHNESS_LABELS[bus.freshness]}
        </Badge>
        <span className="text-[11px] text-ink-muted">ETA unavailable — disabled until M5 review</span>
      </div>
    </div>
  );
}

export function PassengerApp() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");
  const [originCoords, setOriginCoords] = useState(null);
  const [geoState, setGeoState] = useState("idle");
  const [searchRun, setSearchRun] = useState(0);
  const [notice, setNotice] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/login/passenger");
  };

  const myAlerts = useQuery({
    queryKey: ["passenger/alerts"],
    queryFn: () => get("/me/alerts"),
    refetchInterval: 60000,
  });

  const activeRoutes = useQuery({
    queryKey: ["passenger/routes"],
    queryFn: () => get("/catalog/routes?page=1&page_size=20"),
  });

  const nearby = useQuery({
    queryKey: ["passenger/nearby", originCoords?.lat, originCoords?.lon, searchRun],
    enabled: Boolean(originCoords),
    queryFn: () =>
      get(`/tracking/nearby?lat=${originCoords.lat}&lon=${originCoords.lon}&radius_m=1500`),
  });

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState("unavailable");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setOrigin(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setGeoState("located");
        setNotice(null);
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  const alerts = (Array.isArray(myAlerts.data) ? myAlerts.data : myAlerts.data?.items || []).filter(
    (a) => a.is_published,
  );
  const routeList = activeRoutes.data?.items || [];
  const nearbyItems = Array.isArray(nearby.data) ? nearby.data : nearby.data?.items || [];

  const freshnessSummary = useMemo(() => {
    if (nearbyItems.length === 0) return null;
    const fresh = nearbyItems.filter((item) => item.bus?.freshness === "fresh").length;
    return `${fresh} of ${nearbyItems.length} bus${nearbyItems.length === 1 ? "" : "es"} reporting live`;
  }, [nearbyItems]);

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <p className="text-sm font-bold text-brand-700">TrackSafar</p>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-ink-muted sm:inline">{profile?.email}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
          description="Track buses near you and follow service notices for your routes."
          actions={
            <Button variant="secondary" size="sm" onClick={() => { nearby.refetch(); myAlerts.refetch(); }}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
            </Button>
          }
        />

        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            {alerts.map((a) => (
              <Banner
                key={a.id}
                tone={a.severity === "critical" ? "danger" : a.severity === "warning" ? "warning" : "info"}
                title={a.title}
              >
                {a.body}
              </Banner>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader title="Find buses near me" description="Positions update as drivers report GPS from their phones." />
            <CardBody>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label htmlFor="origin" className="ts-label">Your location</label>
                  <input
                    id="origin"
                    className="ts-input mt-1"
                    value={origin}
                    onChange={(e) => { setOrigin(e.target.value); setOriginCoords(null); }}
                    placeholder="Tap Locate, or type coordinates"
                  />
                </div>
                <Button onClick={locate} disabled={geoState === "locating"} loading={geoState === "locating"}>
                  <Navigation className="h-4 w-4" aria-hidden="true" /> Locate me
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!originCoords) return setNotice("Use Locate me or enter coordinates first.");
                    setSearchRun((n) => n + 1);
                  }}
                  disabled={!originCoords}
                >
                  Search
                </Button>
              </div>

              {geoState === "denied" && (
                <div className="mt-3">
                  <Banner tone="warning" title="Location permission denied">
                    Location access is blocked for this browser. You can still search by entering
                    coordinates manually, or contact support if the problem continues.
                  </Banner>
                </div>
              )}
              {geoState === "unavailable" && (
                <div className="mt-3">
                  <Banner tone="warning" title="Location unavailable">
                    Your browser or device could not determine a position right now. Try again shortly.
                  </Banner>
                </div>
              )}
              {notice && (
                <div className="mt-3">
                  <Banner tone="info">{notice}</Banner>
                </div>
              )}

              <div className="mt-4 rounded-[--radius-control] border border-dashed border-border bg-surface-muted px-4 py-6 text-center">
                <MapPin className="mx-auto h-6 w-6 text-ink-faint" aria-hidden="true" />
                <p className="mt-2 text-xs font-semibold text-ink-muted">Demo placeholder — map not connected</p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-muted">{MAP_NOTE}</p>
              </div>

              <div className="mt-4">
                {nearby.isLoading && <LoadingState label="Searching nearby buses…" />}
                {nearby.isError && (
                  <ErrorState message={nearby.error.message} onRetry={() => nearby.refetch()} />
                )}
                {nearby.isSuccess && (
                  <>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge tone="brand">{nearbyItems.length} result{nearbyItems.length === 1 ? "" : "s"}</Badge>
                      {freshnessSummary && (
                        <span className="flex items-center gap-1 text-xs text-ink-muted">
                          <Signal className="h-3.5 w-3.5" aria-hidden="true" /> {freshnessSummary}
                        </span>
                      )}
                    </div>
                    {nearbyItems.length === 0 ? (
                      <EmptyState
                        title="No buses nearby right now"
                        description="Try a wider area, or check again during service hours."
                      />
                    ) : (
                      <div className="space-y-2">
                        {nearbyItems.map((item) => <NearbyResult key={item.bus?.trip_id} item={item} />)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Active routes" description="Routes with published stop sequences." />
              <CardBody>
                {activeRoutes.isLoading && (
                  <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                {activeRoutes.isError && (
                  <ErrorState message={activeRoutes.error.message} onRetry={() => activeRoutes.refetch()} />
                )}
                {activeRoutes.isSuccess && routeList.length === 0 && (
                  <EmptyState title="No active routes" description="Routes appear once an administrator publishes them." />
                )}
                <div className="space-y-3">
                  {routeList.map((route) => (
                    <details key={route.id} className="rounded-[--radius-control] border border-border px-3.5 py-2.5">
                      <summary className="cursor-pointer text-sm font-medium text-ink">
                        {route.route_number} · {route.name}{" "}
                        <span className="text-xs font-normal text-ink-muted">
                          ({route.direction}) · {route.stop_count} stops
                        </span>
                      </summary>
                      <div className="mt-3">
                        <RouteDetailStops routeId={route.id} />
                      </div>
                    </details>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="About freshness" />
              <CardBody className="space-y-2 text-xs leading-relaxed text-ink-muted">
                <p className="flex items-center gap-2">
                  <Badge tone="success" dot>{FRESHNESS_LABELS.fresh}</Badge> recently reported
                </p>
                <p className="flex items-center gap-2">
                  <Badge tone="warning" dot>{FRESHNESS_LABELS.stale}</Badge> older than the freshness threshold
                </p>
                <p className="flex items-center gap-2">
                  <Badge tone="neutral" dot>{FRESHNESS_LABELS.unavailable}</Badge> no sample on this trip yet
                </p>
                <p className="flex items-start gap-1.5 pt-1">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                  We never claim a bus is arriving unless we can calculate a real estimate. When an
                  estimate is unavailable, you will see why.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function RouteDetailStops({ routeId }) {
  const detail = useQuery({
    queryKey: ["passenger/route", routeId],
    queryFn: () => get(`/catalog/routes/${routeId}`),
  });
  if (detail.isLoading) return <LoadingState label="Loading stops…" />;
  if (detail.isError) return <ErrorState message={detail.error.message} onRetry={() => detail.refetch()} />;
  return <RouteStopStrip stops={detail.data?.stops || []} />;
}
