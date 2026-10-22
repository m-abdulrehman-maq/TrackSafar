import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Radio, RefreshCw, StopCircle } from "lucide-react";
import { get, post, getToken } from "../../lib/api";
import { WS_BASE_URL } from "../../config/env";
import { ageLabel, formatTime, formatTimestamp, FRESHNESS_LABELS } from "../../lib/format";
import { Badge, Banner, Card, CardBody, CardHeader, EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { Select } from "../../components/ui/Forms";

const FRESHNESS_TONE = { fresh: "success", stale: "warning", unavailable: "neutral" };

function useTrackingSocket(onEvent) {
  const [status, setStatus] = useState("connecting"); // connecting | live | offline

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus("offline");
      return undefined;
    }
    let ws;
    let closed = false;
    let retryTimer;

    const connect = () => {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const wsBase = WS_BASE_URL || `${proto}://${window.location.host}`;
      ws = new WebSocket(`${wsBase}/ws/tracking`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token }));
        setStatus("live");
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== "pong") onEvent(data);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus("offline");
        retryTimer = setTimeout(connect, 4000);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      try {
        ws?.close();
      } catch {
        /* already closed */
      }
    };
  }, [onEvent]);

  return status;
}

function LiveFleetList({ rows, onRefresh }) {
  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <EmptyState title="No buses currently observed" description="Active trips with at least one accepted GPS sample appear here." />
      )}
      {rows.map((bus) => (
        <div key={bus.trip_id} className="flex flex-wrap items-center justify-between gap-3 rounded-[--radius-control] border border-border bg-white px-3.5 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[--radius-control] bg-brand-100 text-brand-700">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{bus.bus_number} · {bus.route_number}</p>
              <p className="text-xs text-ink-muted">
                {bus.latitude != null
                  ? `${bus.latitude.toFixed(5)}, ${bus.longitude.toFixed(5)}`
                  : "No position yet"}
                {bus.observed_at && ` · observed ${formatTime(bus.observed_at)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={FRESHNESS_TONE[bus.freshness]} dot>
              {FRESHNESS_LABELS[bus.freshness]}
            </Badge>
            {bus.age_seconds != null && <span className="text-[11px] text-ink-faint">{ageLabel(bus.age_seconds)}</span>}
          </div>
        </div>
      ))}
      <button type="button" onClick={onRefresh} className="text-xs font-semibold text-brand-700 hover:underline">
        Refresh snapshot
      </button>
    </div>
  );
}

export function TripsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [recover, setRecover] = useState(null);
  const [live, setLive] = useState([]);
  const [notice, setNotice] = useState(null);

  const pageSize = 10;
  const path = `/admin/trips?page=${page}&page_size=${pageSize}${status ? `&status=${status}` : ""}`;
  const query = useQuery({ queryKey: [path], queryFn: () => get(path), placeholderData: (p) => p });
  const overview = useQuery({ queryKey: ["admin/overview"], queryFn: () => get("/admin/overview") });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [path] });
    queryClient.invalidateQueries({ queryKey: ["admin/overview"] });
  };

  // Live events (authoritative REST snapshot re-fetched after each event)
  const onEvent = (event) => {
    if (event.type === "location-updated") {
      setLive((prev) => {
        const next = prev.filter((b) => b.trip_id !== event.data.trip_id);
        return [event.data, ...next];
      });
      clearTimeout(window.__tsLive);
      window.__tsLive = setTimeout(invalidateAll, 800);
    } else if (event.type === "trip-ended") {
      setLive((prev) => prev.filter((b) => b.trip_id !== event.data.trip_id));
      setNotice("A trip ended — it has been removed from the active fleet.");
      invalidateAll();
    }
  };
  const socketStatus = useTrackingSocket(onEvent);

  // Initial authoritative snapshot for the live list
  useEffect(() => {
    get("/tracking/active")
      .then(setLive)
      .catch(() => setLive([]));
  }, []);

  const recoverMutation = useMutation({
    mutationFn: (tripId) => post(`/admin/trips/${tripId}/recover-end`, {}),
    onSuccess: () => {
      setRecover(null);
      setNotice("Trip recovered and ended. The action was recorded in the audit log.");
      setLive((prev) => prev.filter((b) => b.trip_id !== recover.id));
      invalidateAll();
    },
    onError: (err) => {
      setRecover(null);
      setNotice(`Recovery failed: ${err.message}`);
    },
  });

  const items = query.data?.items || [];
  const total = query.data?.total || 0;

  return (
    <>
      <PageHeader
        title="Trips & live tracking"
        description="Active trips, observed positions with freshness states, and trip history."
        actions={
          <>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter trips" className="w-32">
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="">All</option>
            </Select>
            <Button variant="secondary" size="sm" onClick={invalidateAll}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Sync snapshot
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={socketStatus === "live" ? "success" : socketStatus === "connecting" ? "warning" : "danger"} dot>
          {socketStatus === "live" ? "Live updates connected" : socketStatus === "connecting" ? "Connecting…" : "Offline — snapshot only"}
        </Badge>
        <span className="text-xs text-ink-muted">
          Freshness threshold: {overview.data?.stale_trips != null ? `${overview.data.stale_trips} stale right now` : "from server settings"}
        </span>
      </div>

      {notice && <Banner tone="info" title="Update">{notice}</Banner>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Live fleet" description="Timestamped observations from active trips." />
          <CardBody>
            <LiveFleetList rows={live} onRefresh={() => get("/tracking/active").then(setLive).catch(() => {})} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={status === "ended" ? "Trip history" : status === "active" ? "Active trips" : "All trips"}
            description={`${total} record${total === 1 ? "" : "s"}`}
          />
          <Table
            columns={[
              { key: "trip", label: "Trip" },
              { key: "people", label: "Driver / Bus" },
              { key: "state", label: "State" },
              { key: "started", label: "Started / ended" },
              { key: "actions", label: "", className: "text-right" },
            ]}
            caption="Trips"
          >
            <TableState
              loading={query.isLoading}
              error={query.isError ? query.error.message : null}
              isEmpty={items.length === 0}
              emptyTitle={status === "active" ? "No active trips" : "No trips recorded"}
              emptyDescription="Drivers start trips from their dashboard once assigned."
              onRetry={() => query.refetch()}
              colSpan={5}
            >
              {items.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <p className="text-xs font-medium">{t.route_number} · {t.route_name}</p>
                    <p className="font-mono text-[10px] text-ink-faint">{t.id.slice(0, 8)}…</p>
                  </Td>
                  <Td>
                    <p className="text-sm">{t.driver_name}</p>
                    <p className="text-xs text-ink-muted">{t.bus_number}</p>
                  </Td>
                  <Td>
                    <Badge tone={t.status === "active" ? "brand" : "neutral"} dot={t.status === "active"}>
                      {t.status}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-ink-muted">
                    <span className="block">{formatTimestamp(t.started_at)}</span>
                    {t.ended_at && <span className="block">ended {formatTimestamp(t.ended_at)}</span>}
                    {t.end_reason && <span className="block text-ink-faint">{t.end_reason}</span>}
                  </Td>
                  <Td className="text-right">
                    {t.status === "active" ? (
                      <Button variant="danger-soft" size="sm" onClick={() => setRecover(t)} title="Audited recovery for abandoned trips">
                        <StopCircle className="h-3.5 w-3.5" aria-hidden="true" /> Recover-end
                      </Button>
                    ) : (
                      <span className="text-[11px] text-ink-faint">—</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TableState>
          </Table>
          <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(recover)}
        danger
        title="Recover abandoned trip?"
        description={
          recover
            ? `This ends trip ${recover.id.slice(0, 8)}… for ${recover.bus_number} driven by ${recover.driver_name}. It is an administrative recovery — not driver impersonation — and is fully audited. No GPS data will be accepted afterwards.`
            : ""
        }
        confirmLabel="End trip (recovery)"
        loading={recoverMutation.isPending}
        onClose={() => setRecover(null)}
        onConfirm={() => recoverMutation.mutate(recover.id)}
      />
    </>
  );
}
