import { useStopsPageController } from "../../controllers/stops/StopsPage";
import { Pencil, Plus } from "lucide-react";
import { formatTimestamp } from "../format";
import { Badge, Banner, Card, PageHeader } from "../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Dialog, ConfirmDialog } from "../components/ui/Dialog";
import { Field, Input } from "../components/ui/Forms";
export function StopsPage() {
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
  } = useStopsPageController();
  return (
    <>
      <PageHeader
        title="Stops"
        description="Maintain stop names and coordinates. Deactivation preserves route references."
        actions={
          <>
            <div className="w-full sm:w-56">
              <label htmlFor="stop-search" className="sr-only">
                Search stops
              </label>
              <Input
                id="stop-search"
                type="search"
                placeholder="Search stop name…"
                value={search}
                onChange={(e) => {
                  onSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add stop
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
              key: "name",
              label: "Stop",
            },
            {
              key: "coords",
              label: "Coordinates",
            },
            {
              key: "status",
              label: "Status",
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
          caption="Stops"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle={
              debounced ? "No stops match your search" : "No stops registered"
            }
            emptyDescription={
              debounced
                ? "Try another name."
                : "Add stops, then order them on routes."
            }
            onRetry={() => query.refetch()}
            colSpan={5}
          >
            {items.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td className="font-mono text-xs text-ink-muted">
                  {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                </Td>
                <Td>
                  {s.is_active ? (
                    <Badge tone="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge tone="danger" dot>
                      Inactive
                    </Badge>
                  )}
                </Td>
                <Td className="text-xs text-ink-muted">
                  {formatTimestamp(s.created_at)}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </Button>
                    <Button
                      variant={s.is_active ? "danger-soft" : "secondary"}
                      size="sm"
                      onClick={() => setConfirm(s)}
                    >
                      {s.is_active ? "Deactivate" : "Activate"}
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
        title={editing ? "Edit stop" : "Add stop"}
        description="Coordinates use latitude / longitude in decimal degrees."
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
              {editing ? "Save changes" : "Create stop"}
            </Button>
          </>
        }
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <form onSubmit={submit}>
          <Field label="Stop name" required>
            {({ id, invalid }) => (
              <Input
                id={id}
                value={form.name}
                invalid={invalid}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                  }))
                }
                placeholder="Liberty Market"
              />
            )}
          </Field>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Latitude" required>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  step="any"
                  value={form.latitude}
                  invalid={invalid}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      latitude: e.target.value,
                    }))
                  }
                  placeholder="31.5127"
                />
              )}
            </Field>
            <Field label="Longitude" required>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="number"
                  step="any"
                  value={form.longitude}
                  invalid={invalid}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      longitude: e.target.value,
                    }))
                  }
                  placeholder="74.3466"
                />
              )}
            </Field>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirm)}
        danger={Boolean(confirm?.is_active)}
        title={confirm?.is_active ? "Deactivate stop?" : "Activate stop?"}
        description={
          confirm
            ? confirm.is_active
              ? `"${confirm.name}" will be deactivated. Existing route references are preserved; it cannot be added to routes while inactive.`
              : `"${confirm.name}" can be added to routes again.`
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
