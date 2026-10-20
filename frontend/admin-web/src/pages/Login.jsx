import { useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { useAuth, redirectForRole } from "../lib/auth";
import { Button } from "../components/ui/Button";
import { Field, Input, Checkbox } from "../components/ui/Forms";
import { Banner } from "../components/ui/Display";

const ROLE_COPY = {
  passenger: {
    title: "Passenger sign in",
    blurb: "Track buses, routes and your own alerts.",
    home: "/register",
    homeLabel: "Create a passenger account",
  },
  driver: {
    title: "Driver sign in",
    blurb: "Sign in to view your assignment and operate trips.",
    home: null,
    homeLabel: null,
  },
  admin: {
    title: "Administrator sign in",
    blurb: "Restricted staff portal. Accounts are provisioned by an administrator.",
    home: null,
    homeLabel: null,
  },
};

const ROLE_PATHS = { passenger: "/login/passenger", driver: "/login/driver", admin: "/login/admin" };

export function LoginPage() {
  const { role } = useParams();
  const location = useLocation();
  const { login, profile, authConfig, initializing } = useAuth();

  const activeRole = role || (new URLSearchParams(location.search).get("role") || "passenger");
  const copy = ROLE_COPY[activeRole] || ROLE_COPY.passenger;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (initializing) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-muted">Loading…</div>;
  }
  if (profile) {
    return <Navigate to={redirectForRole(profile.role)} replace />;
  }

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    if (activeRole !== "passenger" && !acceptTerms) {
      setFormError("Please acknowledge the acceptable-use notice before signing in.");
      return;
    }
    setSubmitting(true);
    try {
      const me = await login({ email, password });
      if (me.role !== activeRole) {
        setFormError(
          `This account is a ${me.role} account. Redirecting to your ${me.role} dashboard…`,
        );
        setTimeout(() => {
          window.location.href = redirectForRole(me.role);
        }, 700);
        return;
      }
      if (!me.is_active) {
        setFormError("This account is deactivated. Contact an administrator.");
        return;
      }
      window.location.href = redirectForRole(me.role);
    } catch (err) {
      setFormError(err.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold tracking-tight text-ink">{copy.title}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">{copy.blurb}</p>
        <div className="mt-6 rounded-[--radius-card] border border-border bg-surface-muted p-5 text-xs leading-relaxed text-ink-muted">
          <p className="font-semibold text-ink">One identity, three roles</p>
          <p className="mt-1.5">
            Selecting a role here never grants privileges. Your access comes from your
            server-side account record — a passenger cannot become a driver or administrator
            by using this screen.
          </p>
        </div>
        <div className="mt-4 space-y-1.5">
          {Object.entries(ROLE_PATHS).map(([r, path]) => (
            <Link key={r} to={path} className={`block text-sm ${r === activeRole ? "font-semibold text-brand-700" : "text-ink-muted hover:text-brand-700"}`}>
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
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-[--radius-control] border border-border bg-surface-muted p-1" role="tablist" aria-label="Account type">
            {Object.entries(ROLE_COPY).map(([r, c]) => (
              <Link
                key={r}
                to={ROLE_PATHS[r]}
                role="tab"
                aria-selected={r === activeRole}
                className={`rounded-[calc(--radius-control-0.25rem)] px-2 py-1.5 text-center text-xs font-medium transition ${
                  r === activeRole ? "bg-white text-brand-700 shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                {r === "admin" ? "Admin" : r[0].toUpperCase() + r.slice(1)}
              </Link>
            ))}
          </div>

          {authConfig.auth_mode === "supabase" && (
            <Banner tone="info" title="Managed sign-in">
              Sessions are issued by the identity provider. Sign-in will redirect through your
              organization's authentication service.
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </Field>

            {activeRole !== "passenger" && (
              <Checkbox
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                label={activeRole === "admin" ? "I am authorized to use this staff portal" : "I am on duty and acknowledge operational guidelines"}
                hint="Unauthorized access to restricted accounts is prohibited and audited."
              />
            )}

            <Button type="submit" className="w-full" loading={submitting} disabled={!authConfig.password_login_enabled && authConfig.auth_mode !== "development"}>
              Sign in
            </Button>

            {activeRole === "passenger" && (
              <p className="mt-4 text-center text-xs text-ink-muted">
                No account?{" "}
                <Link to="/register" className="font-semibold text-brand-700 hover:underline">
                  Create one
                </Link>
              </p>
            )}
            {activeRole !== "passenger" && (
              <p className="mt-4 text-center text-xs text-ink-muted">
                Accounts are provisioned by an administrator. No self-registration.
              </p>
            )}
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-ink-faint">
          <Link to="/" className="hover:text-brand-700">← Back to TrackSafar</Link>
        </p>
      </div>
    </div>
  );
}
