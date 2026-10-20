import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus, ShieldAlert } from "lucide-react";
import { patch, post } from "../../lib/api";
import { formatTimestamp } from "../../lib/format";
import { Badge, Banner, Card, PageHeader } from "../../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Field, Input, Select, Textarea } from "../../components/ui/Forms";
import { usePaged } from "../shared";

const STATUS_TONE = { open: "danger", acknowledged: "warning", resolved: "success" };

const EMPTY = { title: "", description: "", severity: "warning" };

export function IncidentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNote, setResolveNote] = useState("");

  const pageSize = 10;
  const query = usePaged("/admin/incidents", { page, pageSize, extra: status ? `&status=${status}` : "" });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/admin/incidents"] });

  const createMutation = useMutation({
    mutationFn: (body) => post("/admin/incidents", body),
    onSuccess: () => { invalidate(); setCreateOpen(false); setForm(EMPTY); setFormError(null); },
    onError: (err) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => patch(`/admin/incidents/${id}`, body),
    onSuccess: () => { invalidate(); setResolveTarget(null); setResolveNote(""); setFormError(null); },
    onError: (err) => { setFormError(err.message); },
  });

  const submitCreate = (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return setFormError("Title must be at least 3 characters.");
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
    });
  };

  return (
    <>
      <PageHeader
        title="Operational incidents"
        description="Restricted fleet and system incidents — distinct from public notices. Changes record actor and time."
        actions={
          <>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="w-36">
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Button onClick={() => { setFormError(null); setCreateOpen(true); }}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Report incident
            </Button>
          </>
        }
      />

      <Banner tone="warning" title="Restricted data">
        Operational incidents may reference trips, buses and routes. They are never included in
        passenger-facing notices.
      </Banner>

      {formError && <Banner tone="danger" title="Rejected">{formError}</Banner>}

      <Card>
        <Table
          columns={[
            { key: "incident", label: "Incident" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Status" },
            { key: "created", label: "Reported" },
            { key: "resolved", label: "Resolved" },
            { key: "actions", label: "", className: "text-right" },
          ]}
          caption="Operational incidents"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle={status ? "No incidents with this status" : "No incidents reported"}
            emptyDescription="Report an incident to start tracking operational issues."
            onRetry={() => query.refetch()}
            colSpan={6}
          >
            {items.map((inc) => (
              <Tr key={inc.id}>
                <Td>
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{inc.title}</p>
                      <p className="line-clamp-1 max-w-md text-xs text-ink-muted">{inc.description || "—"}</p>
                      {inc.resolution_note && (
                        <p className="mt-0.5 text-[11px] text-success">Resolution: {inc.resolution_note}</p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <Badge tone={inc.severity === "critical" ? "danger" : inc.severity === "warning" ? "warning" : "neutral"}>
                    {inc.severity}
                  </Badge>
                </Td>
                <Td><Badge tone={STATUS_TONE[inc.status]} dot>{inc.status}</Badge></Td>
                <Td className="text-xs text-ink-muted">{formatTimestamp(inc.created_at)}</Td>
                <Td className="text-xs text-ink-muted">{inc.resolved_at ? formatTimestamp(inc.resolved_at) : "—"}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {inc.status === "open" && (
                      <Button variant="secondary" size="sm" onClick={() => updateMutation.mutate({ id: inc.id, body: { status: "acknowledged" } })}>
                        Acknowledge
                      </Button>
                    )}
                    {inc.status !== "resolved" ? (
                      <Button variant="primary" size="sm" onClick={() => { setResolveTarget(inc); setResolveNote(""); }}>
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Resolve
                      </Button>
                    ) : (
                      <span className="text-[11px] text-ink-faint">Closed</span>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </TableState>
        </Table>
        <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
      </Card>

      <Dialog
        open={createOpen}
        title="Report operational incident"
        description="Recorded with your account as the reporter."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>Cancel</Button>
            <Button size="sm" loading={createMutation.isPending} onClick={submitCreate}>Report incident</Button>
          </>
        }
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <form onSubmit={submitCreate}>
          <Field label="Title" required>
            {({ id }) => <Input id={id} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Vehicle breakdown" />}
          </Field>
          <Field label="Description">
            {({ id }) => <Textarea id={id} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />}
          </Field>
          <Field label="Severity">
            {({ id }) => (
              <Select id={id} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </Select>
            )}
          </Field>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(resolveTarget)}
        title="Resolve incident"
        description={resolveTarget?.title}
        onClose={() => setResolveTarget(null)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setResolveTarget(null)} disabled={updateMutation.isPending}>Cancel</Button>
            <Button size="sm" loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: resolveTarget.id, body: { status: "resolved", resolution_note: resolveNote || "Resolved" } })}>
              Mark resolved
            </Button>
          </>
        }
      >
        <Field label="Resolution note" hint="Stored with your account as resolver.">
          {({ id }) => <Input id={id} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Towed to depot; service restored" />}
        </Field>
      </Dialog>
    </>
  );
}
