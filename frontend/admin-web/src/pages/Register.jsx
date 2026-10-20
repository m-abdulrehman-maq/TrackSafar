import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/Button";
import { Field, Input, Checkbox } from "../components/ui/Forms";
import { Banner } from "../components/ui/Display";

const PASSWORD_RULE = "At least 8 characters.";

export function RegisterPage() {
  const { register, profile, authConfig, initializing } = useAuth();

  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (initializing) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-muted">Loading…</div>;
  }
  if (profile) {
    return <Navigate to={profile.role === "admin" ? "/admin" : profile.role === "driver" ? "/driver" : "/passenger"} />;
  }

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (form.full_name.trim().length < 2) next.full_name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = `Password must be ${PASSWORD_RULE}`;
    if (form.password !== form.confirm) next.confirm = "Passwords do not match.";
    if (!acceptTerms) next.terms = "You must accept the terms and privacy notice.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        accept_terms: true,
      });
      setSuccess(
        "Your passenger account has been created. You can now sign in — if email verification is enabled for this environment, confirm your inbox first.",
      );
      setForm((f) => ({ ...f, password: "", confirm: "" }));
    } catch (err) {
      if (err.status === 409) {
        setFormError("An account with this email already exists. Try signing in instead.");
        setErrors((n) => ({ ...n, email: "Already registered." }));
      } else {
        setFormError(err.message || "Registration failed. Please retry.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Create your passenger account</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
          Registration is open to passengers only. Driver and administrator accounts are
          created by an administrator through a controlled, audited workflow.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-ink-muted">
          {[
            "Search routes, buses and stops",
            "Track observed bus positions while trips run",
            "Receive passenger-safe service notices",
            "Manage your own profile",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-[--radius-card] border border-border bg-surface-muted p-4 text-xs text-ink-muted">
          Looking for a driver or staff login?{" "}
          <Link to="/login/driver" className="font-semibold text-brand-700">Driver sign in</Link>
          {" · "}
          <Link to="/login/admin" className="font-semibold text-brand-700">Administrator sign in</Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[--radius-card] border border-border bg-white p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[--radius-control] bg-brand-700 text-white">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-base font-semibold text-ink">Passenger registration</h1>
              <p className="text-xs text-ink-muted">Free account for commuters</p>
            </div>
          </div>

          {success && (
            <Banner tone="success" title="Account created">
              {success}{" "}
              <Link to="/login/passenger" className="font-semibold underline">Sign in</Link>
            </Banner>
          )}
          {formError && <Banner tone="danger">{formError}</Banner>}

          <form onSubmit={onSubmit} noValidate>
            <Field label="Full name" error={errors.full_name} required>
              {({ id, invalid }) => (
                <Input id={id} value={form.full_name} onChange={update("full_name")} invalid={invalid}
                  autoComplete="name" placeholder="Ali Raza" disabled={submitting} />
              )}
            </Field>

            <Field label="Email address" error={errors.email} required>
              {({ id, invalid }) => (
                <Input id={id} type="email" value={form.email} onChange={update("email")} invalid={invalid}
                  autoComplete="email" placeholder="you@example.com" disabled={submitting} />
              )}
            </Field>

            <Field label="Password" error={errors.password} hint={PASSWORD_RULE} required>
              {({ id, invalid }) => (
                <div className="relative">
                  <Input id={id} type={showPassword ? "text" : "password"} value={form.password}
                    onChange={update("password")} invalid={invalid} autoComplete="new-password"
                    className="pr-10" disabled={submitting} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </Field>

            <Field label="Confirm password" error={errors.confirm} required>
              {({ id, invalid }) => (
                <Input id={id} type="password" value={form.confirm} onChange={update("confirm")}
                  invalid={invalid} autoComplete="new-password" disabled={submitting} />
              )}
            </Field>

            <Checkbox
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              error={errors.terms}
              label="I accept the terms of use and privacy notice"
              hint="We only collect what is needed to run the service; passenger location is not retained by default."
            />

            <Button type="submit" className="w-full" loading={submitting}>
              Create account
            </Button>

            <p className="mt-4 text-center text-xs text-ink-muted">
              Already registered?{" "}
              <Link to="/login/passenger" className="font-semibold text-brand-700 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
