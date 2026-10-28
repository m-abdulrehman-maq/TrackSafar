import { useBusesPageController } from "../../controllers/buses/BusesPage";
import { Bus as BusIcon, Pencil, Plus } from "lucide-react";
import { Badge, Banner, Card, PageHeader } from "../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Dialog, ConfirmDialog } from "../components/ui/Dialog";
import { Field, Input } from "../components/ui/Forms";
export function BusesPage() {
  const {
    page,
    setPage,
    search,
    onSearch,
    debounced,
    formOpen,
    setFormOpen,
    editing,
    form,
    setForm,
    formError,
    confirm,
    setConfirm,
    pageSize,
    query,
    items,
    total,
    saveMutation,
    toggleMutation,
    openCreate,
    openEdit,
    submit,
    onToggle,
  } = useBusesPageController();
  return (
    <>
      <PageHeader
        title="Fleet — buses"
        description="Create, edit and activate registered buses. Conflicts with active service are blocked."
        actions={
          <>
            <div className="w-full sm:w-56">
              <label htmlFor="bus-search" className="sr-only">
                Search buses
              </label>
              <Input
                id="bus-search"
                type="search"
                placeholder="Search bus number…"
                value={search}
                onChange={(e) => {
                  onSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add bus
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
              key: "bus",
              label: "Bus",
            },
            {
              key: "reg",
              label: "Registration",
            },
            {
              key: "operator",
              label: "Operator",
            },
            {
              key: "status",
              label: "Status",
            },
            {
              key: "service",
              label: "Service",
            },
            {
              key: "actions",
              label: "",
              className: "text-right",
            },
          ]}
          caption="Buses"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle={
              debounced ? "No buses match your search" : "No buses registered"
            }
            emptyDescription={
              debounced
                ? "Try another number."
                : "Add the first bus to start building your fleet."
            }
            onRetry={() => query.refetch()}
            colSpan={6}
          >
            {items.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[--radius-control] bg-brand-100 text-brand-700">
                      <BusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="font-medium">{b.bus_number}</span>
                  </div>
                </Td>
                <Td className="text-ink-muted">
                  {b.registration_number || "—"}
                </Td>
                <Td className="text-ink-muted">{b.operator || "—"}</Td>
                <Td>
                  {b.is_active ? (
                    <Badge tone="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge tone="danger" dot>
                      Inactive
                    </Badge>
                  )}
                </Td>
                <Td>
                  {b.has_active_trip ? (
                    <Badge tone="brand" dot>
                      On trip
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Idle</Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(b)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </Button>
                    <Button
                      variant={b.is_active ? "danger-soft" : "secondary"}
                      size="sm"
                      onClick={() => onToggle(b)}
                    >
                      {b.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
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
        title={editing ? "Edit bus" : "Add bus"}
        description={
          editing ? editing.bus_number : "Register a new bus in the fleet."
        }
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
              {editing ? "Save changes" : "Create bus"}
            </Button>
          </>
        }
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <form onSubmit={submit}>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Bus number" required hint="Unique fleet identifier">
              {({ id, invalid }) => (
                <Input
                  id={id}
                  value={form.bus_number}
                  invalid={invalid}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bus_number: e.target.value,
                    }))
                  }
                  placeholder="LS-101"
                />
              )}
            </Field>
            <Field
              label="Registration number"
              hint="Must be unique when provided"
            >
              {({ id }) => (
                <Input
                  id={id}
                  value={form.registration_number}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      registration_number: e.target.value,
                    }))
                  }
                />
              )}
            </Field>
            <Field label="Operator">
              {({ id }) => (
                <Input
                  id={id}
                  value={form.operator}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      operator: e.target.value,
                    }))
                  }
                  placeholder="Speedo / Green Electric"
                />
              )}
            </Field>
            <Field label="Seating capacity">
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min="1"
                  max="300"
                  value={form.seating_capacity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      seating_capacity: e.target.value,
                    }))
                  }
                />
              )}
            </Field>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirm)}
        danger={Boolean(confirm?.is_active)}
        title={confirm?.is_active ? "Deactivate bus?" : "Activate bus?"}
        description={
          confirm
            ? confirm.is_active
              ? `${confirm.bus_number} will be excluded from new assignments until reactivated.`
              : `${confirm.bus_number} will become eligible for assignments again.`
            : ""
        }
        confirmLabel={confirm?.is_active ? "Deactivate" : "Activate"}
        loading={toggleMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          toggleMutation.mutate({
            id: confirm.id,
            is_active: !confirm.is_active,
          })
        }
      />
    </>
  );
}
