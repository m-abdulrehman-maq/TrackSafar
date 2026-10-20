import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileClock, Gauge, KeyRound, Lock } from "lucide-react";
import { get } from "../../lib/api";
import { formatTimestamp } from "../../lib/format";
import { Badge, Banner, Card, CardBody, CardHeader, ErrorState, LoadingState, PageHeader } from "../../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../../components/ui/Table";

function SettingRow({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-start gap-3 border-b border-border px-5 py-3.5 last:border-b-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[--radius-control] bg-surface-muted text-ink-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      <span className="shrink-0 rounded-[--radius-control] border border-border bg-surface-muted px-2.5 py-1 font-mono text-xs text-ink">
        {value}
      </span>
    </div>
  );
}

export function SettingsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const settings = useQuery({ queryKey: ["admin/settings"], queryFn: () => get("/admin/settings") });
  const auditPath = `/admin/audit?page=${page}&page_size=${pageSize}`;
  const audit = useQuery({ queryKey: [auditPath], queryFn: () => get(auditPath), placeholderData: (p) => p });

  const auditItems = audit.data?.items || [];
  const total = audit.data?.total || 0;

  return (
    <>
      <PageHeader
        title="Settings & audit trail"
        description="Effective operational thresholds and an append-only record of privileged actions."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Operational settings" description="Read-only in this build; changes are release-managed via environment configuration." />
          {settings.isLoading ? (
            <LoadingState label="Loading settings…" />
          ) : settings.isError ? (
            <ErrorState message={settings.error.message} onRetry={() => settings.refetch()} />
          ) : (
            <div>
              <SettingRow icon={Gauge} label="Location freshness threshold" hint="Positions older than this are marked stale"
                value={`${settings.data.location_stale_after_seconds}s`} />
              <SettingRow icon={Gauge} label="Future timestamp tolerance" hint="GPS samples further in the future are rejected"
                value={`${settings.data.location_max_future_skew_seconds}s`} />
              <SettingRow icon={KeyRound} label="ETA engine" hint="Disabled until the method review (M5) approves it"
                value={settings.data.eta_enabled ? "enabled" : "disabled"} />
              <SettingRow icon={Lock} label="Identity authority" hint="Supabase Auth in production; local store in development"
                value={settings.data.auth_mode} />
              <SettingRow icon={Lock} label="Environment" hint="Enforced at backend startup"
                value={settings.data.environment} />
            </div>
          )}
          <CardBody className="border-t border-border">
            <Banner tone="info" title="No secret access">
              Provider keys, service-role credentials and database passwords are never exposed
              through this interface — they live only in server-side environment configuration.
            </Banner>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Audit trail"
            description="Actor, action, target, timestamp and outcome — passwords and tokens are never recorded."
            actions={<Badge tone="neutral">{total} events</Badge>}
          />
          <Table
            columns={[
              { key: "when", label: "When" },
              { key: "actor", label: "Actor" },
              { key: "action", label: "Action" },
              { key: "target", label: "Target" },
              { key: "outcome", label: "Outcome" },
            ]}
            caption="Audit events"
          >
            <TableState
              loading={audit.isLoading}
              error={audit.isError ? audit.error.message : null}
              isEmpty={auditItems.length === 0}
              emptyTitle="No audit events"
              emptyDescription="Privileged operations will be recorded here as they happen."
              onRetry={() => audit.refetch()}
              colSpan={5}
            >
              {auditItems.map((event) => (
                <Tr key={event.id}>
                  <Td className="whitespace-nowrap text-xs text-ink-muted">{formatTimestamp(event.created_at)}</Td>
                  <Td className="text-xs">
                    <span className="block font-medium text-ink">{event.actor_email || "system"}</span>
                  </Td>
                  <Td className="font-mono text-xs">{event.action}</Td>
                  <Td className="text-xs text-ink-muted">
                    {event.entity_type}
                    {event.entity_id && <span className="block font-mono text-[10px]">{event.entity_id.slice(0, 8)}…</span>}
                  </Td>
                  <Td>
                    <Badge tone={event.outcome === "success" ? "success" : event.outcome === "denied" ? "warning" : "danger"}>
                      {event.outcome}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </TableState>
          </Table>
          <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
        </Card>
      </div>
    </>
  );
}
