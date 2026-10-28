import {
  useRoutesPageController,
  useStopSequenceEditorController,
  useRouteDetailPageController,
  useUpdateRouteFormController,
} from "../../controllers/routes/RoutesPage";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import { formatTimestamp } from "../format";
import {
  Badge,
  Banner,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import { Field, Input, Select } from "../components/ui/Forms";
export function RoutesPage() {
  const {
    navigate,
    page,
    setPage,
    search,
    onSearch,
    debounced,
    formOpen,
    setFormOpen,
    form,
    formError,
    setFormError,
    pageSize,
    query,
    items,
    total,
    createMutation,
    submit,
    update,
  } = useRoutesPageController();
  return (
    <>
      <PageHeader
        title="Routes"
        description="Direction-specific route records with ordered stops and optional verified geometry."
        actions={
          <>
            <div className="w-full sm:w-56">
              <label htmlFor="route-search" className="sr-only">
                Search routes
              </label>
              <Input
                id="route-search"
                type="search"
                placeholder="Search number or name…"
                value={search}
                onChange={(e) => {
                  onSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              onClick={() => {
                setFormError(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> New route
            </Button>
          </>
        }
      />

      <Card>
        <Table
          columns={[
            {
              key: "route",
              label: "Route",
            },
            {
              key: "path",
              label: "Path",
            },
            {
              key: "direction",
              label: "Direction",
            },
            {
              key: "stops",
              label: "Stops",
            },
            {
              key: "status",
              label: "Status",
            },
            {
              key: "open",
              label: "",
              className: "text-right",
            },
          ]}
          caption="Routes"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle={
              debounced ? "No routes match your search" : "No routes registered"
            }
            emptyDescription={
              debounced
                ? "Try another number or name."
                : "Create a route, then add ordered stops."
            }
            onRetry={() => query.refetch()}
            colSpan={6}
          >
            {items.map((r) => (
              <Tr key={r.id} onClick={() => navigate(`/admin/routes/${r.id}`)}>
                <Td>
                  <p className="font-medium">
                    {r.route_number} · {r.name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {r.origin} → {r.destination}
                  </p>
                </Td>
                <Td>
                  {r.has_geometry ? (
                    <Badge tone="success">Geometry</Badge>
                  ) : (
                    <Badge tone="warning">No geometry</Badge>
                  )}
                </Td>
                <Td className="text-ink-muted">{r.direction}</Td>
                <Td>{r.stop_count}</Td>
                <Td>
                  {r.is_active ? (
                    <Badge tone="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge tone="danger" dot>
                      Inactive
                    </Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <Link
                    to={`/admin/routes/${r.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex h-8 items-center rounded-[--radius-control] border border-border-strong bg-white px-3 text-xs font-medium hover:bg-surface-muted"
                  >
                    Manage
                  </Link>
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
        title="New route"
        description="One record per direction. Geometry is optional and must be sourced — never invented."
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFormOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={createMutation.isPending}
              onClick={submit}
            >
              Create route
            </Button>
          </>
        }
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <form onSubmit={submit}>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Route number" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={form.route_number}
                  onChange={update("route_number")}
                  placeholder="R-14"
                />
              )}
            </Field>
            <Field label="Direction" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={form.direction}
                  onChange={update("direction")}
                >
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Name" required>
            {({ id }) => (
              <Input
                id={id}
                value={form.name}
                onChange={update("name")}
                placeholder="Ravi — Mall Road"
              />
            )}
          </Field>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="Origin" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={form.origin}
                  onChange={update("origin")}
                />
              )}
            </Field>
            <Field label="Destination" required>
              {({ id }) => (
                <Input
                  id={id}
                  value={form.destination}
                  onChange={update("destination")}
                />
              )}
            </Field>
          </div>
          <Field
            label="Path geometry (optional)"
            hint="GeoJSON-style [longitude, latitude] pairs from verified data. Leave empty if unknown."
          >
            {({ id }) => (
              <Input
                id={id}
                value={form.path_text}
                onChange={update("path_text")}
                placeholder="[[74.3400,31.5500],[74.3466,31.5127]]"
                className="font-mono text-xs"
              />
            )}
          </Field>
        </form>
      </Dialog>
    </>
  );
}
function StopSequenceEditor({ route, stops, onSaved }) {
  const {
    order,
    adding,
    setAdding,
    error,
    dirty,
    saveMutation,
    move,
    removeStop,
    addStop,
    stopById,
  } = useStopSequenceEditorController({
    route,
    stops,
    onSaved,
  });
  return (
    <div>
      {error && <Banner tone="danger">{error}</Banner>}
      <ol className="divide-y divide-border rounded-[--radius-control] border border-border">
        {order.map((stopId, index) => {
          const stop = stopById[stopId];
          return (
            <li
              key={`${stopId}-${index}`}
              className="flex items-center gap-2 px-3 py-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                {index + 1}
              </span>
              <span className="flex-1 truncate text-sm text-ink">
                {stop ? stop.name : stopId.slice(0, 8)}
              </span>
              {stop && (
                <span className="font-mono text-[10px] text-ink-faint">
                  {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                </span>
              )}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1 text-ink-muted hover:bg-surface-muted disabled:opacity-30"
                  aria-label={`Move ${stop?.name} up`}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  className="rounded p-1 text-ink-muted hover:bg-surface-muted disabled:opacity-30"
                  aria-label={`Move ${stop?.name} down`}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStop(index)}
                  className="rounded p-1 text-danger hover:bg-danger-soft"
                  aria-label={`Remove ${stop?.name}`}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
        {order.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-ink-muted">
            No stops on this route yet.
          </li>
        )}
      </ol>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <Field label="Add stop">
            {({ id }) => (
              <Select
                id={id}
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
              >
                <option value="">Select a stop…</option>
                {stops.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    disabled={order.includes(s.id)}
                  >
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={addStop}
          disabled={!adding}
        >
          Add
        </Button>
        <Button
          size="sm"
          loading={saveMutation.isPending}
          disabled={!dirty}
          onClick={() => saveMutation.mutate(order)}
        >
          Save order
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">
        Sequence numbers are validated server-side. A stop may appear only once
        per route; loop routes use separate direction records.
      </p>
    </div>
  );
}
export function RouteDetailPage() {
  const {
    routeId,
    queryClient,
    editing,
    setEditing,
    routeQuery,
    stopsQuery,
    route,
    stops,
    updateMutation,
  } = useRouteDetailPageController();
  if (routeQuery.isLoading)
    return (
      <Card>
        <LoadingState label="Loading route…" />
      </Card>
    );
  if (routeQuery.isError)
    return (
      <Card>
        <ErrorState
          message={routeQuery.error.message}
          onRetry={() => routeQuery.refetch()}
        />
      </Card>
    );
  return (
    <>
      <PageHeader
        title={`${route.route_number} · ${route.name}`}
        description={`${route.origin} → ${route.destination} · ${route.direction}`}
        actions={
          <>
            <Link
              to="/admin/routes"
              className="inline-flex h-9 items-center gap-1.5 rounded-[--radius-control] border border-border-strong bg-white px-3 text-sm font-medium hover:bg-surface-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> All
              routes
            </Link>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit route
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Route record" />
          <CardBody className="space-y-3 text-sm">
            <Row label="Status">
              {route.is_active ? (
                <Badge tone="success" dot>
                  Active
                </Badge>
              ) : (
                <Badge tone="danger" dot>
                  Inactive
                </Badge>
              )}
            </Row>
            <Row label="Direction">{route.direction}</Row>
            <Row label="Stops">{route.stop_count}</Row>
            <Row label="Geometry">
              {route.has_geometry ? (
                <Badge tone="success">Verified path</Badge>
              ) : (
                <Badge tone="warning">Not sourced</Badge>
              )}
            </Row>
            <Row label="Created">{formatTimestamp(route.created_at)}</Row>
            {!route.has_geometry && (
              <Banner tone="warning" title="No path data">
                This route has no verified geometry, so map rendering and
                path-based ETA stay unavailable rather than being invented.
              </Banner>
            )}
            <UpdateRouteForm
              route={route}
              open={editing}
              onClose={() => setEditing(false)}
              mutation={updateMutation}
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Ordered stops"
            description="Reorder with the arrows; changes are blocked while a trip is active on this route."
          />
          <CardBody>
            {route.has_geometry && route.path?.length > 1 && (
              <div className="mb-4 rounded-[--radius-control] border border-border bg-surface-muted p-4 text-xs text-ink-muted">
                <p className="mb-2 font-semibold text-ink">Path preview</p>
                <div className="flex h-14 items-end gap-0.5">
                  {route.path.map((pt, i) => (
                    <span
                      key={i}
                      className="h-full w-1.5 rounded-sm bg-brand-500/70"
                      title={`${pt[0]}, ${pt[1]}`}
                    />
                  ))}
                </div>
                <p className="mt-2 font-mono text-[10px]">
                  {route.path.length} coordinates · full map view renders once a
                  maps provider is configured (M5).
                </p>
              </div>
            )}
            {stopsQuery.isLoading ? (
              <LoadingState label="Loading stops…" />
            ) : stopsQuery.isError ? (
              <ErrorState
                message={stopsQuery.error.message}
                onRetry={() => stopsQuery.refetch()}
              />
            ) : (
              <StopSequenceEditor
                route={route}
                stops={stops}
                onSaved={(detail) => {
                  queryClient.setQueryData(["admin/route", routeId], detail);
                  queryClient.invalidateQueries({
                    queryKey: ["/admin/routes"],
                  });
                }}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">
        {children}
      </span>
    </div>
  );
}
function UpdateRouteForm({ route, open, onClose, mutation }) {
  const { form, setForm, error, submit } = useUpdateRouteFormController({
    route,
    open,
    onClose,
    mutation,
  });
  return (
    <Dialog
      open={open}
      title="Edit route"
      description="Geometry and stop order cannot change while a trip is active."
      onClose={onClose}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" loading={mutation.isPending} onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      {error && <Banner tone="danger">{error}</Banner>}
      <Field label="Name">
        {({ id }) => (
          <Input
            id={id}
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                name: e.target.value,
              }))
            }
          />
        )}
      </Field>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label="Origin">
          {({ id }) => (
            <Input
              id={id}
              value={form.origin}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  origin: e.target.value,
                }))
              }
            />
          )}
        </Field>
        <Field label="Destination">
          {({ id }) => (
            <Input
              id={id}
              value={form.destination}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  destination: e.target.value,
                }))
              }
            />
          )}
        </Field>
      </div>
      <Field
        label="Path geometry"
        hint="Longitude-first pairs from verified data."
      >
        {({ id }) => (
          <Input
            id={id}
            value={form.path_text}
            className="font-mono text-xs"
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                path_text: e.target.value,
              }))
            }
          />
        )}
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_active}
          className="h-4 w-4 accent-[#006852]"
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              is_active: e.target.checked,
            }))
          }
        />
        Route is active
      </label>
    </Dialog>
  );
}
