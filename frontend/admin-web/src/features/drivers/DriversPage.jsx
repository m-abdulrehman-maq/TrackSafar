import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Eye, KeyRound, UserPlus } from "lucide-react";
import { get, patch, post } from "../../lib/api";
import { formatTimestamp } from "../../lib/format";
import { Badge, Banner, Card, CardBody, CardHeader, EmptyState, ErrorState, LoadingState, PageHeader } from "../../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Dialog, ConfirmDialog } from "../../components/ui/Dialog";
import { Field, Input } from "../../components/ui/Forms";
import { useDebouncedSearch, usePaged } from "../shared";

function ProvisionDialog({ open, onClose, onDone }) {
  const [form, setForm] = useState({ full_name: "", email: "", driver_code: "", license_number: "", phone: "", temporary_password: "" });
  const [error, setError] = useState(null);
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (body) => post("/admin/drivers", body),
    onSuccess: (driver) => {
      setError(null);
      onDone(driver);
      setForm({ full_name: "", email: "", driver_code: "", license_number: "", phone: "", temporary_password: "" });
    },
    onError: (err) => setError(err.message),
  });

  const submit = (e) => {
    e.preventDefault();
    if (form.full_name.trim().length < 2) return setError("Full name is required.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("A valid email address is required.");
    if (form.driver_code.trim().length < 2) return setError("Driver code is required.");
    if (form.temporary_password && form.temporary_password.length < 8)
      return setError("Temporary password must be at least 8 characters.");
    mutation.mutate({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      driver_code: form.driver_code.trim(),
      license_number: form.license_number || null,
      phone: form.phone || null,
      temporary_password: form.temporary_password || null,
    });
  };

  return (
    <Dialog
      open={open}
      title="Provision driver account"
      description="Creates a driver identity server-side. Drivers cannot self-register."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button size="sm" loading={mutation.isPending} onClick={submit}>Provision driver</Button>
        </>
      }
    >
      {error && <Banner tone="danger">{error}</Banner>}
      <form onSubmit={submit}>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="Full name" required>{({ id }) => <Input id={id} value={form.full_name} onChange={update("full_name")} />}</Field>
          <Field label="Email" required>{({ id }) => <Input id={id} type="email" value={form.email} onChange={update("email")} />}</Field>
          <Field label="Driver code" required hint="e.g. DRV-014">{({ id }) => <Input id={id} value={form.driver_code} onChange={update("driver_code")} />}</Field>
          <Field label="License number">{({ id }) => <Input id={id} value={form.license_number} onChange={update("license_number")} />}</Field>
          <Field label="Phone">{({ id }) => <Input id={id} value={form.phone} onChange={update("phone")} placeholder="+92…" />}</Field>
          <Field label="Initial password" hint="Development mode only. Leave blank to generate one.">
            {({ id }) => <Input id={id} type="password" value={form.temporary_password} onChange={update("temporary_password")} autoComplete="new-password" />}
          </Field>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-muted">
          Credentials are created through the identity provider. The application database never
          stores passwords, and provider secrets never appear in responses.
        </p>
      </form>
    </Dialog>
  );
}

export function DriversPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { value: search, onChange: onSearch, debounced } = useDebouncedSearch();
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [error, setError] = useState(null);

  const pageSize = 10;
  const query = usePaged("/admin/drivers", { search: debounced, page, pageSize });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;

  const assignments = useQuery({
    queryKey: ["driver-assignments", detail?.id],
    queryFn: () => get(`/admin/drivers/${detail.id}/assignments?page_size=5`),
    enabled: Boolean(detail),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/admin/drivers"] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => patch(`/admin/drivers/${id}`, { driver_profile_active: active, is_active: active }),
    onSuccess: () => { invalidate(); setConfirm(null); setError(null); },
    onError: (err) => { setError(err.message); setConfirm(null); },
  });

  return (
    <>
      <PageHeader
        title="Driver management"
        description="Provision, inspect and deactivate driver accounts and review their assignments."
        actions={
          <>
            <div className="w-full sm:w-64">
              <label htmlFor="driver-search" className="sr-only">Search drivers</label>
              <Input id="driver-search" type="search" placeholder="Search name, email, code…" value={search}
                onChange={(e) => { onSearch(e.target.value); setPage(1); }} />
            </div>
            <Button onClick={() => setProvisionOpen(true)}>
              <UserPlus className="h-4 w-4" aria-hidden="true" /> Provision driver
            </Button>
          </>
        }
      />

      {error && <Banner tone="danger" title="Change rejected">{error}</Banner>}

      <Card>
        <Table
          columns={[
            { key: "driver", label: "Driver" },
            { key: "code", label: "Code" },
            { key: "license", label: "License" },
            { key: "status", label: "Status" },
            { key: "actions", label: "", className: "text-right" },
          ]}
          caption="Driver accounts"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle={debounced ? "No drivers match your search" : "No drivers provisioned"}
            emptyDescription={debounced ? "Try a different term." : "Use 'Provision driver' to create the first driver account."}
            onRetry={() => query.refetch()}
            colSpan={5}
          >
            {items.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <p className="font-medium">{d.full_name}</p>
                  <p className="text-xs text-ink-muted">{d.email}</p>
                </Td>
                <Td className="font-mono text-xs">{d.driver_code}</Td>
                <Td className="text-ink-muted">{d.license_number || "—"}</Td>
                <Td>
                  {d.is_active && d.profile_active
                    ? <Badge tone="success" dot>Active</Badge>
                    : <Badge tone="danger" dot>Inactive</Badge>}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => setDetail(d)}>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Details
                    </Button>
                    <Button
                      variant={d.is_active && d.profile_active ? "danger-soft" : "secondary"}
                      size="sm"
                      onClick={() => setConfirm({ driver: d, active: !(d.is_active && d.profile_active) })}
                    >
                      {d.is_active && d.profile_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TableState>
        </Table>
        <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
      </Card>

      <ProvisionDialog
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        onDone={(driver) => {
          invalidate();
          setProvisionOpen(false);
          setTempPassword(driver.__temp || null);
        }}
      />

      {/* Driver detail */}
      <Dialog
        open={Boolean(detail)}
        title="Driver detail"
        description={detail ? `${detail.driver_code} · ${detail.email}` : ""}
        onClose={() => setDetail(null)}
        footer={<Button variant="secondary" size="sm" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-ink-muted">
              <div><span className="block font-semibold text-ink">Account</span>{detail.profile_active ? "Active" : "Deactivated"}</div>
              <div><span className="block font-semibold text-ink">Driver record</span>{detail.is_active ? "Active" : "Inactive"}</div>
              <div><span className="block font-semibold text-ink">License</span>{detail.license_number || "—"}</div>
              <div><span className="block font-semibold text-ink">Phone</span>{detail.phone || "—"}</div>
            </div>
            <div className="rounded-[--radius-control] border border-border">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold text-ink">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" /> Assignments
              </div>
              {assignments.isLoading ? (
                <LoadingState label="Loading assignments…" />
              ) : assignments.isError ? (
                <ErrorState message={assignments.error.message} onRetry={() => assignments.refetch()} />
              ) : (assignments.data?.items || []).length === 0 ? (
                <EmptyState title="No assignments" description="This driver has no assignment records yet." />
              ) : (
                <ul className="divide-y divide-border text-xs">
                  {assignments.data.items.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <p className="font-medium text-ink">{a.bus_number} · {a.route_number}</p>
                        <p className="text-ink-muted">{a.route_name}</p>
                      </div>
                      <Badge tone={a.status === "active" ? "brand" : "neutral"}>{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirm)}
        danger={confirm && !confirm.active}
        title={confirm?.active ? "Activate driver account?" : "Deactivate driver account?"}
        description={
          confirm
            ? confirm.active
              ? `${confirm.driver.full_name} will be able to sign in and operate trips again.`
              : `${confirm.driver.full_name} will be blocked from signing in and from starting trips. Drivers with an active trip must have the trip ended first. This is audited.`
            : ""
        }
        confirmLabel={confirm?.active ? "Activate" : "Deactivate"}
        loading={toggleMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => toggleMutation.mutate({ id: confirm.driver.id, active: confirm.active })}
      />
    </>
  );
}
