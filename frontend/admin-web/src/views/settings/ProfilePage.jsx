import { useProfilePageController } from "../../controllers/settings/ProfilePage";
import { LogOut, Save } from "lucide-react";
import { formatTimestamp } from "../format";
import {
  Badge,
  Banner,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
} from "../components/ui/Display";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Forms";
export function ProfilePage() {
  const {
    profile,
    name,
    setName,
    phone,
    setPhone,
    message,
    error,
    saveMutation,
    submit,
    handleLogout,
  } = useProfilePageController();
  if (!profile) return null;
  return (
    <>
      <PageHeader
        title="My profile"
        description="Your account details. Role and active status are managed by an administrator."
        actions={
          <Button variant="danger-soft" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Profile details"
            description="Only display fields are editable by you."
          />
          <CardBody>
            {message && <Banner tone="success">{message}</Banner>}
            {error && <Banner tone="danger">{error}</Banner>}
            <form onSubmit={submit}>
              <Field label="Full name" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                )}
              </Field>
              <Field
                label="Email address"
                hint="Contact an administrator to change your sign-in email."
              >
                {({ id }) => <Input id={id} value={profile.email} disabled />}
              </Field>
              <Field label="Phone">
                {({ id }) => (
                  <Input
                    id={id}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92…"
                  />
                )}
              </Field>
              <Button type="submit" loading={saveMutation.isPending}>
                <Save className="h-4 w-4" aria-hidden="true" /> Save changes
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Account" />
          <CardBody className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Role</span>
              <Badge tone="brand">{profile.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Status</span>
              {profile.is_active ? (
                <Badge tone="success" dot>
                  Active
                </Badge>
              ) : (
                <Badge tone="danger" dot>
                  Deactivated
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Member since</span>
              <span className="text-xs font-medium text-ink">
                {formatTimestamp(profile.created_at)}
              </span>
            </div>
            <div className="rounded-[--radius-control] border border-border bg-surface-muted p-3 text-xs leading-relaxed text-ink-muted">
              Role, identity and activation fields are excluded from
              self-service edits by design. Elevated changes go through the
              audited administrative workflow.
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
