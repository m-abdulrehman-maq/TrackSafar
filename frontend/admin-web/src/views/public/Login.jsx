import {
  useLoginPageController,
  ROLE_COPY,
  ROLE_PATHS,
} from "../../controllers/public/Login";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { redirectForRole } from "../../controllers/auth";
import { Button } from "../components/ui/Button";
import { Field, Input, Checkbox } from "../components/ui/Forms";
import { Banner } from "../components/ui/Display";
export function LoginPage() {
  const {
    profile,
    authConfigError,
    initializing,
    activeRole,
    copy,
    passwordLoginBlocked,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    acceptTerms,
    setAcceptTerms,
    errors,
    formError,
    submitting,
    onSubmit,
  } = useLoginPageController();
  if (initializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-muted">
        Loading…
      </div>
    );
  }
  if (profile) {
    return <Navigate to={redirectForRole(profile.role)} replace />;
  }
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold tracking-tight text-ink">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
          {copy.blurb}
        </p>
        <div className="mt-6 rounded-[--radius-card] border border-border bg-surface-muted p-5 text-xs leading-relaxed text-ink-muted">
          <p className="font-semibold text-ink">One identity, three roles</p>
          <p className="mt-1.5">
            Selecting a role here never grants privileges. Your access comes
            from your server-side account record — a passenger cannot become a
            driver or administrator by using this screen.
          </p>
        </div>
        <div className="mt-4 space-y-1.5">
          {Object.entries(ROLE_PATHS).map(([r, path]) => (
            <Link
              key={r}
              to={path}
              className={`block text-sm ${r === activeRole ? "font-semibold text-brand-700" : "text-ink-muted hover:text-brand-700"}`}
            >
              → {ROLE_COPY[r].title}
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[--radius-card] border border-border bg-white p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[--radius-control] bg-brand-700 text-white">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-base font-semibold text-ink">{copy.title}</h1>
              <p className="text-xs text-ink-muted">{copy.blurb}</p>
            </div>
          </div>

          {/* Role tabs */}
          <div
            className="mb-6 grid grid-cols-3 gap-1 rounded-[--radius-control] border border-border bg-surface-muted p-1"
            role="tablist"
            aria-label="Account type"
          >
            {Object.entries(ROLE_COPY).map(([r, c]) => (
              <Link
                key={r}
                to={ROLE_PATHS[r]}
                role="tab"
                aria-selected={r === activeRole}
                className={`rounded-[calc(--radius-control-0.25rem)] px-2 py-1.5 text-center text-xs font-medium transition ${r === activeRole ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"}`}
              >
                {r === "admin" ? "Admin" : r[0].toUpperCase() + r.slice(1)}
              </Link>
            ))}
          </div>

          {authConfigError && (
            <Banner tone="warning" title="Could not load sign-in settings">
              The server could not be reached. Check that the backend is running
              and that VITE_API_URL points to it, then retry.
            </Banner>
          )}

          {passwordLoginBlocked && (
            <Banner tone="info" title="Managed sign-in">
              Password sign-in is handled by the identity provider in this
              environment.
            </Banner>
          )}

          {formError && <Banner tone="danger">{formError}</Banner>}

          <form onSubmit={onSubmit} noValidate>
            <Field label="Email address" error={errors.email} required>
              {({ id, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  invalid={invalid}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              )}
            </Field>

            <Field label="Password" error={errors.password} required>
              {({ id, invalid }) => (
                <div className="relative">
                  <Input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    invalid={invalid}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </Field>

            {activeRole !== "passenger" && (
              <Checkbox
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                label={
                  activeRole === "admin"
                    ? "I am authorized to use this staff portal"
                    : "I am on duty and acknowledge operational guidelines"
                }
                hint="Unauthorized access to restricted accounts is prohibited and audited."
              />
            )}

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={passwordLoginBlocked}
            >
              Sign in
            </Button>

            {activeRole === "passenger" && (
              <p className="mt-4 text-center text-xs text-ink-muted">
                No account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Create one
                </Link>
              </p>
            )}
            {activeRole !== "passenger" && (
              <p className="mt-4 text-center text-xs text-ink-muted">
                Accounts are provisioned by an administrator. No
                self-registration.
              </p>
            )}
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-ink-faint">
          <Link to="/" className="hover:text-brand-700">
            ← Back to TrackSafar
          </Link>
        </p>
      </div>
    </div>
  );
}
