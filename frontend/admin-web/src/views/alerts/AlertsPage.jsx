import {
  useAlertsPageController,
  AUDIENCES,
} from "../../controllers/alerts/AlertsPage";
import { Pencil, Plus } from "lucide-react";
import { formatTimestamp } from "../format";
import { Badge, Banner, Card, PageHeader } from "../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import {
  Field,
  Input,
  Select,
  Textarea,
  Checkbox,
} from "../components/ui/Forms";
export function AlertsPage() {
  const {
    page,
    setPage,
    formOpen,
    setFormOpen,
    editing,
    form,
    setForm,
    formError,
    pageSize,
    query,
    items,
    total,
    saveMutation,
    openCreate,
    openEdit,
    submit,
  } = useAlertsPageController();
  return (
    <>
      <PageHeader
        title="Notifications & notices"
        description="Passenger-safe system notices with server-enforced audiences — separate from operational incidents."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New notice
          </Button>
        }
      />

      <Banner tone="info" title="Audience enforcement">
        The selected audience is validated on the backend; users only ever
        receive notices intended for their role.
      </Banner>

      {formError && (
        <Banner tone="danger" title="Rejected">
          {formError}
        </Banner>
      )}

      <Card>
        <Table
          columns={[
            {
              key: "notice",
              label: "Notice",
            },
            {
              key: "audience",
              label: "Audience",
            },
            {
              key: "severity",
              label: "Severity",
            },
            {
              key: "state",
              label: "State",
            },
            {
              key: "created",
              label: "Created",
            },
            {
              key: "actions",
              label: "",
              className: "text-right",
            },
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
                  <p className="line-clamp-1 max-w-md text-xs text-ink-muted">
                    {a.body}
                  </p>
                </Td>
                <Td>
                  <Badge tone="info">
                    {AUDIENCES.find((x) => x.value === a.audience)?.label ||
                      a.audience}
                  </Badge>
                </Td>
                <Td>
                  <Badge
                    tone={
                      a.severity === "critical"
                        ? "danger"
                        : a.severity === "warning"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {a.severity}
                  </Badge>
                </Td>
                <Td>
                  {a.is_published ? (
                    <Badge tone="success" dot>
                      Published
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Draft</Badge>
                  )}
                </Td>
                <Td className="text-xs text-ink-muted">
                  {formatTimestamp(a.created_at)}
                </Td>
                <Td className="text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </Button>
                </Td>
              </Tr>
            ))}
          </TableState>
        </Table>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPage={setPage}
        />
      </Card>

      <Dialog
        open={formOpen}
        title={editing ? "Edit notice" : "New notice"}
        description="Notices are visible to the selected audience only."
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFormOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button size="sm" loading={saveMutation.isPending} onClick={submit}>
              {editing ? "Save changes" : "Publish notice"}
            </Button>
          </>
        }
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <form onSubmit={submit}>
          <Field label="Title" required>
            {({ id }) => (
              <Input
                id={id}
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                  }))
                }
                placeholder="Weekend service change"
              />
            )}
          </Field>
          <Field label="Message" required>
            {({ id }) => (
              <Textarea
                id={id}
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    body: e.target.value,
                  }))
                }
                placeholder="What should the audience know?"
              />
            )}
          </Field>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Audience" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.audience}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      audience: e.target.value,
                    }))
                  }
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Severity">
              {({ id }) => (
                <Select
                  id={id}
                  value={form.severity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      severity: e.target.value,
                    }))
                  }
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </Select>
              )}
            </Field>
          </div>
          <Checkbox
            checked={form.is_published}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                is_published: e.target.checked,
              }))
            }
            label="Published"
            hint="Unpublished notices are saved as drafts and never delivered."
          />
        </form>
      </Dialog>
    </>
  );
}
