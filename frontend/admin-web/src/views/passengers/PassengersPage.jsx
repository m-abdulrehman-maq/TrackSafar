import { usePassengersPageController } from "../../controllers/passengers/PassengersPage";
import { Eye } from "lucide-react";
import { formatTimestamp } from "../format";
import { Badge, Banner, Card, PageHeader } from "../components/ui/Display";
import { Table, Td, Tr, TableState, Pagination } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Dialog, ConfirmDialog } from "../components/ui/Dialog";
import { Field, Input } from "../components/ui/Forms";
export function PassengersPage() {
  const {
    page,
    setPage,
    search,
    onSearch,
    debounced,
    detail,
    setDetail,
    confirm,
    setConfirm,
    editName,
    setEditName,
    editPhone,
    setEditPhone,
    saveError,
    pageSize,
    query,
    items,
    total,
    updateMutation,
    openDetail,
    saveProfile,
    toggleActive,
  } = usePassengersPageController();
  return (
    <>
      <PageHeader
        title="Passenger management"
        description="Search, inspect and deactivate passenger accounts. Role changes are never available here."
        actions={
          <div className="w-full sm:w-72">
            <label htmlFor="passenger-search" className="sr-only">
              Search passengers
            </label>
            <Input
              id="passenger-search"
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => {
                onSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        }
      />

      <Banner tone="info" title="Role safety">
        Passenger records can be renamed, re-contacted and deactivated — never
        converted into driver or administrator accounts through this screen.
      </Banner>

      <Card>
        <Table
          columns={[
            {
              key: "name",
              label: "Passenger",
            },
            {
              key: "phone",
              label: "Phone",
            },
            {
              key: "status",
              label: "Status",
            },
            {
              key: "joined",
              label: "Joined",
            },
            {
              key: "actions",
              label: "",
              className: "text-right",
            },
          ]}
          caption="Passenger accounts"
        >
          <TableState
            loading={query.isLoading}
            error={query.isError ? query.error.message : null}
            isEmpty={items.length === 0}
            emptyTitle={
              debounced
                ? "No passengers match your search"
                : "No passengers registered yet"
            }
            emptyDescription={
              debounced
                ? "Try a different name or email."
                : "Passengers appear here after they register."
            }
            onRetry={() => query.refetch()}
            colSpan={5}
          >
            {items.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {p.full_name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium">{p.full_name}</p>
                      <p className="text-xs text-ink-muted">{p.email}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-ink-muted">{p.phone || "—"}</Td>
                <Td>
                  {p.is_active ? (
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
                  {formatTimestamp(p.created_at)}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openDetail(p)}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View
                    </Button>
                    <Button
                      variant={p.is_active ? "danger-soft" : "secondary"}
                      size="sm"
                      onClick={() => toggleActive(p)}
                    >
                      {p.is_active ? "Deactivate" : "Activate"}
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

      {/* Detail dialog */}
      <Dialog
        open={Boolean(detail)}
        title="Passenger detail"
        description={detail?.email}
        onClose={() => setDetail(null)}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDetail(null)}
            >
              Close
            </Button>
            <Button
              size="sm"
              loading={updateMutation.isPending}
              onClick={saveProfile}
            >
              Save changes
            </Button>
          </>
        }
      >
        {saveError && <Banner tone="danger">{saveError}</Banner>}
        {detail && (
          <div className="space-y-1">
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-ink-muted">
              <div>
                <span className="block font-semibold text-ink">Role</span>
                {detail.role} (fixed)
              </div>
              <div>
                <span className="block font-semibold text-ink">Status</span>
                {detail.is_active ? "Active" : "Deactivated"}
              </div>
              <div>
                <span className="block font-semibold text-ink">Joined</span>
                {formatTimestamp(detail.created_at)}
              </div>
              <div>
                <span className="block font-semibold text-ink">Profile ID</span>
                <span className="font-mono">{detail.id.slice(0, 8)}…</span>
              </div>
            </div>
            <Field label="Full name">
              {({ id }) => (
                <Input
                  id={id}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              )}
            </Field>
            <Field label="Phone">
              {({ id }) => (
                <Input
                  id={id}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+92…"
                />
              )}
            </Field>
          </div>
        )}
      </Dialog>

      {/* Activation confirmation */}
      <ConfirmDialog
        open={Boolean(confirm)}
        danger={confirm && !confirm.activate}
        title={
          confirm?.activate
            ? "Activate passenger account?"
            : "Deactivate passenger account?"
        }
        description={
          confirm
            ? confirm.activate
              ? `${confirm.passenger.full_name} will regain access to their account.`
              : `${confirm.passenger.full_name} will lose access immediately, including active sessions on subsequent requests. This change is recorded in the audit log.`
            : ""
        }
        confirmLabel={confirm?.activate ? "Activate" : "Deactivate"}
        loading={updateMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          updateMutation.mutate({
            id: confirm.passenger.id,
            body: {
              is_active: confirm.activate,
            },
          })
        }
      />
    </>
  );
}
