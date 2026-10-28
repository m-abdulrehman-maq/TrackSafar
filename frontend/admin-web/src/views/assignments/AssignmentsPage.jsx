import { useAssignmentsPageController } from "../../controllers/assignments/AssignmentsPage";
import { Plus, XCircle } from "lucide-react";
import { formatTimestamp } from "../format";
import { Badge, Banner, Card, PageHeader } from "../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Dialog, ConfirmDialog } from "../components/ui/Dialog";
import { Field, Select } from "../components/ui/Forms";
export function AssignmentsPage() {
  const {
    page,
    setPage,
    status,
    setStatus,
    createOpen,
    setCreateOpen,
    confirmEnd,
    setConfirmEnd,
    formError,
    setFormError,
    form,
    setForm,
    pageSize,
    query,
    drivers,
    buses,
    routes,
    createMutation,
    endMutation,
    items,
    total,
    submitCreate,
  } = useAssignmentsPageController();
  return (
    <>
      <PageHeader
        title="Driver assignments"
        description="Assign eligible drivers to buses and routes. Conflicts and active-trip edits are blocked server-side."
        actions={
          <>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
              className="w-36"
            >
              <option value="active">Active</option>
              <option value="ended">History</option>
              <option value="">All</option>
            </Select>
            <Button
              onClick={() => {
                setFormError(null);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> New assignment
            </Button>
          </>
        }
      />

      {formError && (
        <Banner tone="danger" title="Rejected">
          {formError}
        </Banner>
      )}

      <Card>
        <Table
          columns={[
            {
              key: "driver",
              label: "Driver",
            },
            {
              key: "bus",
              label: "Bus",
            },
            {
              key: "route",
              label: "Route",
            },
            {
              key: "status",
              label: "Status",
            },
            {
              key: "since",
              label: "Since",
            },
            {
              key: "actions",
              label: "",
              className: "text-right",
            },
          ]}
          caption="Assignments"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle="No assignments found"
            emptyDescription="Create an assignment to pair a driver, bus and route."
            onRetry={() => query.refetch()}
            colSpan={6}
          >
            {items.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <p className="font-medium">{a.driver_name}</p>
                  <p className="font-mono text-xs text-ink-muted">
                    {a.driver_code}
                  </p>
                </Td>
                <Td className="font-medium">{a.bus_number}</Td>
                <Td>
                  <p>
                    {a.route_number} · {a.route_name}
                  </p>
                </Td>
                <Td>
                  <div className="flex flex-col gap-1">
                    <Badge tone={a.status === "active" ? "brand" : "neutral"}>
                      {a.status}
                    </Badge>
                    {a.has_active_trip && (
                      <Badge tone="warning" dot>
                        Trip running
                      </Badge>
                    )}
                  </div>
                </Td>
                <Td className="text-xs text-ink-muted">
                  {formatTimestamp(a.valid_from)}
                </Td>
                <Td className="text-right">
                  {a.status === "active" ? (
                    <Button
                      variant="danger-soft"
                      size="sm"
                      onClick={() => setConfirmEnd(a)}
                      disabled={a.has_active_trip}
                      title={
                        a.has_active_trip
                          ? "End the active trip first"
                          : undefined
                      }
                    >
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> End
                    </Button>
                  ) : (
                    <span className="text-xs text-ink-faint">
                      Ended {a.ended_at ? formatTimestamp(a.ended_at) : ""}
                    </span>
                  )}
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
        open={createOpen}
        title="New assignment"
        description="Only active, unassigned records can be selected. Validated again on the server."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={createMutation.isPending}
              onClick={submitCreate}
            >
              Create assignment
            </Button>
          </>
        }
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <form onSubmit={submitCreate}>
          <Field
            label="Driver"
            required
            hint="Active drivers without a current assignment"
          >
            {({ id }) => (
              <Select
                id={id}
                value={form.driver_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    driver_id: e.target.value,
                  }))
                }
              >
                <option value="">Select driver…</option>
                {(drivers.data?.items || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.driver_code})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Bus"
            required
            hint="Active buses without a current assignment"
          >
            {({ id }) => (
              <Select
                id={id}
                value={form.bus_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    bus_id: e.target.value,
                  }))
                }
              >
                <option value="">Select bus…</option>
                {(buses.data?.items || [])
                  .filter((b) => b.is_active)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number}
                      {b.operator ? ` — ${b.operator}` : ""}
                    </option>
                  ))}
              </Select>
            )}
          </Field>
          <Field label="Route" required hint="Active routes">
            {({ id }) => (
              <Select
                id={id}
                value={form.route_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    route_id: e.target.value,
                  }))
                }
              >
                <option value="">Select route…</option>
                {(routes.data?.items || [])
                  .filter((r) => r.is_active)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_number} · {r.name} ({r.direction})
                    </option>
                  ))}
              </Select>
            )}
          </Field>
        </form>
        {(drivers.isLoading || buses.isLoading || routes.isLoading) && (
          <p className="text-xs text-ink-muted">Loading eligible records…</p>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmEnd)}
        danger
        title="End assignment?"
        description={
          confirmEnd
            ? `${confirmEnd.driver_name} will no longer be able to start trips on ${confirmEnd.bus_number} (${confirmEnd.route_number}). History is preserved.`
            : ""
        }
        confirmLabel="End assignment"
        loading={endMutation.isPending}
        onClose={() => setConfirmEnd(null)}
        onConfirm={() => endMutation.mutate(confirmEnd.id)}
      />
    </>
  );
}
