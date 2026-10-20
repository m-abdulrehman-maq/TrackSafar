import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, Plus } from "lucide-react";
import { get, patch, post } from "../../lib/api";
import { formatTimestamp } from "../../lib/format";
import { Badge, Banner, Card, PageHeader } from "../../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Field, Input, Select, Textarea, Checkbox } from "../../components/ui/Forms";
import { usePaged } from "../shared";

const AUDIENCES = [
  { value: "all_authenticated", label: "All signed-in users" },
  { value: "passengers", label: "Passengers only" },
  { value: "drivers", label: "Drivers only" },
  { value: "admins", label: "Administrators only" },
];

const EMPTY = { title: "", body: "", severity: "info", audience: "all_authenticated", is_published: true };

export function AlertsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);

  const pageSize = 10;
  const query = usePaged("/admin/alerts", { page, pageSize });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/admin/alerts"] });

  const saveMutation = useMutation({
    mutationFn: ({ id, body }) => (id ? patch(`/admin/alerts/${id}`, body) : post("/admin/alerts", body)),
    onSuccess: () => { invalidate(); setFormOpen(false); setEditing(null); setForm(EMPTY); setFormError(null); },
    onError: (err) => setFormError(err.message),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setFormError(null); setFormOpen(true); };
  const openEdit = (alert) => {
    setEditing(alert);
    setForm({
      title: alert.title, body: alert.body, severity: alert.severity,
      audience: alert.audience, is_published: alert.is_published,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3) return setFormError("Title must be at least 3 characters.");
    if (!form.body.trim()) return setFormError("Message body is required.");
    saveMutation.mutate({
      id: editing?.id,
      body: {
        title: form.title.trim(),
        body: form.body.trim(),
        severity: form.severity,
        audience: form.audience,
        is_published: form.is_published,
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Notifications & notices"
        description="Passenger-safe system notices with server-enforced audiences — separate from operational incidents."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" aria-hidden="true" /> New notice</Button>}
      />

      <Banner tone="info" title="Audience enforcement">
        The selected audience is validated on the backend; users only ever receive notices
        intended for their role.
      </Banner>

      {formError && <Banner tone="danger" title="Rejected">{formError}</Banner>}

      <Card>
        <Table
          columns={[
            { key: "notice", label: "Notice" },
            { key: "audience", label: "Audience" },
            { key: "severity", label: "Severity" },
            { key: "state", label: "State" },
            { key: "created", label: "Created" },
            { key: "actions", label: "", className: "text-right" },
          ]}
          caption="System notices"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle="No notices yet"
            emptyDescription="Create a notice to inform passengers, drivers or administrators."
            onRetry={() => query.refetch()}
            colSpan={6}
          >
            {items.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <p className="font-medium">{a.title}</p>
                  <p className="line-clamp-1 max-w-md text-xs text-ink-muted">{a.body}</p>
                </Td>
                <Td><Badge tone="info">{AUDIENCES.find((x) => x.value === a.audience)?.label || a.audience}</Badge></Td>
                <Td>
                  <Badge tone={a.severity === "critical" ? "danger" : a.severity === "warning" ? "warning" : "neutral"}>
                    {a.severity}
                  </Badge>
                </Td>
                <Td>{a.is_published ? <Badge tone="success" dot>Published</Badge> : <Badge tone="neutral">Draft</Badge>}</Td>
                <Td className="text-xs text-ink-muted">{formatTimestamp(a.created_at)}</Td>
                <Td className="text-right">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </Button>
                </Td>
              </Tr>
            ))}
          </TableState>
        </Table>
        <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
      </Card>

      <Dialog
        open={formOpen}
        title={editing ? "Edit notice" : "New notice"}
        description="Notices are visible to the selected audience only."
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(false)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button size="sm" loading={saveMutation.isPending} onClick={submit}>{editing ? "Save changes" : "Publish notice"}</Button>
          </>
        }
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <form onSubmit={submit}>
          <Field label="Title" required>
            {({ id }) => <Input id={id} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Weekend service change" />}
          </Field>
          <Field label="Message" required>
            {({ id }) => <Textarea id={id} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="What should the audience know?" />}
          </Field>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Audience" required>
              {({ id }) => (
                <Select id={id} value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
                  {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              )}
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
          </div>
          <Checkbox
            checked={form.is_published}
            onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            label="Published"
            hint="Unpublished notices are saved as drafts and never delivered."
          />
        </form>
      </Dialog>
    </>
  );
}
