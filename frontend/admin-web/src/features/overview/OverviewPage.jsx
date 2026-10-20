import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, ArrowRight, Bus, MapPin, RefreshCw, Signal, TriangleAlert, UserRound } from "lucide-react";
import { get, post } from "../../lib/api";
import { formatTime } from "../../lib/format";
import { Badge, Banner, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader } from "../../components/ui/Display";
import { Table, Td, Tr, TableState } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { SkeletonStat, SkeletonCard } from "../../components/ui/Skeleton";

function StatCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  const tones = { brand: "bg-brand-100 text-brand-700", warning: "bg-warning-soft text-warning", neutral: "bg-surface-muted text-ink" };
  return (
    <div className="rounded-[--radius-card] border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-[--radius-control] ${tones[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-ink-muted">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}
    </div>
  );
}

function FleetMapPlaceholder() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-[--radius-card] border border-dashed border-border-strong bg-surface-muted p-6 text-center">
      <MapPin className="mb-2 h-7 w-7 text-ink-faint" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">Live fleet map unavailable</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-muted">
        No map provider key is configured for this environment. Route geometry and bus positions
        are rendered here once the maps provider decision (M5) is implemented. Active trips are
        listed below with observed coordinates and timestamps.
      </p>
    </div>
  );
}

const FRESHNESS_TONE = { fresh: "success", stale: "warning", unavailable: "neutral" };

export function OverviewPage() {
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: ["admin/overview"], queryFn: () => get("/admin/overview"), refetchInterval: 30000 });
  const trips = useQuery({ queryKey: ["admin/trips", "active"], queryFn: () => get("/admin/trips?status=active&page_size=10"), refetchInterval: 15000 });
  const audit = useQuery({ queryKey: ["admin/audit", "recent"], queryFn: () => get("/admin/audit?page_size=6") });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin/overview"] });
    queryClient.invalidateQueries({ queryKey: ["admin/trips"] });
    queryClient.invalidateQueries({ queryKey: ["admin/audit"] });
  };

  if (overview.isLoading) {
    return (
      <>
        <PageHeader title="Fleet overview" description="Live operational metrics from the backend." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="min-h-64" />
          <SkeletonCard className="min-h-64" />
        </div>
      </>
    );
  }
  if (overview.isError) {
    return (
      <>
        <PageHeader title="Fleet overview" description="Live operational metrics from the backend." />
        <Card><ErrorState message={overview.error.message} onRetry={() => overview.refetch()} /></Card>
      </>
    );
  }

  const data = overview.data;
  const tripItems = trips.data?.items || [];

  return (
    <>
      <PageHeader
        title="Fleet overview"
        description="Every metric below is computed from live backend data — no hardcoded counts."
        actions={
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Bus} label="Registered buses" value={data.total_buses} hint={`${data.active_buses} active`} />
        <StatCard icon={Activity} label="Active trips" value={data.active_trips} hint={data.stale_trips > 0 ? `${data.stale_trips} with stale position` : "All positions fresh"} tone={data.stale_trips > 0 ? "warning" : "brand"} />
        <StatCard icon={UserRound} label="Registered drivers" value={data.total_drivers} hint={`${data.active_drivers} active`} />
        <StatCard icon={TriangleAlert} label="Open incidents" value={data.open_incidents} hint={data.open_incidents > 0 ? "Needs attention" : "Nothing open"} tone={data.open_incidents > 0 ? "warning" : "neutral"} />
      </div>

      {data.stale_trips > 0 && (
        <Banner tone="warning" title="Stale positions detected">
          {data.stale_trips} active {data.stale_trips === 1 ? "trip has" : "trips have"} not reported a fresh
          position within the freshness threshold. Their last observed timestamps are shown in the table.
        </Banner>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Live fleet map" description="Positions render here when a maps provider is configured." />
          <CardBody className="p-4">
            <FleetMapPlaceholder />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Active trips"
            description={tripItems.length ? `${tripItems.length} running now` : "No trips are running"}
            actions={<a href="/admin/trips" className="text-xs font-semibold text-brand-700 hover:underline">View all</a>}
          />
          <Table columns={[{ key: "bus", label: "Bus" }, { key: "route", label: "Route" }, { key: "driver", label: "Driver" }, { key: "started", label: "Started" }]}>
            <TableState
              loading={trips.isLoading}
              error={trips.isError ? trips.error.message : null}
              isEmpty={!trips.isLoading && tripItems.length === 0}
              emptyTitle="No active trips"
              emptyDescription="Trips appear here as soon as a driver starts an assigned trip."
              onRetry={() => trips.refetch()}
              colSpan={4}
            >
              {tripItems.map((trip) => (
                <Tr key={trip.id}>
                  <Td className="font-medium">{trip.bus_number}</Td>
                  <Td>
                    <span className="block">{trip.route_number}</span>
                    <span className="block text-xs text-ink-muted">{trip.route_name}</span>
                  </Td>
                  <Td className="text-ink-muted">{trip.driver_name}</Td>
                  <Td className="text-xs text-ink-muted">{formatTime(trip.started_at)}</Td>
                </Tr>
              ))}
            </TableState>
          </Table>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Latest operational events"
          description="Audited privileged actions from the audit trail."
          actions={<a href="/admin/settings" className="text-xs font-semibold text-brand-700 hover:underline">Full audit log</a>}
        />
        <Table columns={[{ key: "when", label: "When" }, { key: "actor", label: "Actor" }, { key: "action", label: "Action" }, { key: "entity", label: "Target" }, { key: "outcome", label: "Outcome" }]}>
          <TableState
            loading={audit.isLoading}
            error={audit.isError ? audit.error.message : null}
            isEmpty={!audit.isLoading && (audit.data?.items || []).length === 0}
            emptyTitle="No events yet"
            emptyDescription="Administrative actions will be recorded here."
            onRetry={() => audit.refetch()}
            colSpan={5}
          >
            {(audit.data?.items || []).map((event) => (
              <Tr key={event.id}>
                <Td className="text-xs text-ink-muted">{formatTime(event.created_at)}</Td>
                <Td className="text-xs">{event.actor_email || "system"}</Td>
                <Td className="font-mono text-xs">{event.action}</Td>
                <Td className="text-xs text-ink-muted">{event.entity_type}</Td>
                <Td>
                  <Badge tone={event.outcome === "success" ? "success" : event.outcome === "denied" ? "warning" : "danger"}>
                    {event.outcome}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TableState>
        </Table>
      </Card>
    </>
  );
}
