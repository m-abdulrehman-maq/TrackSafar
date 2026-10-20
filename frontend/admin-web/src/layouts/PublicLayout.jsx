import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

/** Public site chrome: navbar + footer shared by landing, login and register. */

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/#how-it-works", label: "How It Works" },
  { to: "/#about", label: "About" },
];

export function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-[--radius-control] bg-brand-700 text-white">
        <BusIcon className="h-4.5 w-4.5" />
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-ink">
          Track<span className="text-brand-700">Safar</span>
        </span>
      )}
    </span>
  );
}

function BusIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10" />
      <path d="M4 11h16" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
      <path d="M4 16h16v2.5a1 1 0 0 1-1 1h-1.5" />
    </svg>
  );
}

export function PublicLayout({ profile, onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const dashTarget = profile ? dashboardPathFor(profile.role) : null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="rounded-md" aria-label="TrackSafar home">
            <Logo />
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.to}
                className="rounded-[--radius-control] px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <div className="group relative">
              <a
                href="/login"
                className="rounded-[--radius-control] px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                aria-haspopup="menu"
              >
                Log in
              </a>
              <div className="invisible absolute right-0 top-full w-48 rounded-[--radius-card] border border-border bg-white p-1.5 opacity-0 shadow-sm transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <RoleMenuLink href="/login/passenger" label="Passenger" desc="Track your bus" />
                <RoleMenuLink href="/login/driver" label="Driver" desc="Operate a trip" />
                <RoleMenuLink href="/login/admin" label="Administrator" desc="Staff portal" />
              </div>
            </div>
            {dashTarget ? (
              <a
                href={dashTarget}
                className="rounded-[--radius-control] bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Dashboard
              </a>
            ) : (
              <a
                href="/register"
                className="rounded-[--radius-control] bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Get Started
              </a>
            )}
          </div>

          <button
            type="button"
            className="rounded-[--radius-control] border border-border p-2 text-ink md:hidden"
            aria-expanded={open}
            aria-label="Toggle navigation menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <nav className="border-t border-border bg-white px-4 py-3 md:hidden" aria-label="Mobile">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.to} className="block rounded-[--radius-control] px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-muted">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 border-t border-border pt-3">
              <a href="/login" className="rounded-[--radius-control] border border-border-strong px-3 py-2 text-center text-sm font-medium">
                Log in
              </a>
              <a href="/register" className="rounded-[--radius-control] bg-brand-700 px-3 py-2 text-center text-sm font-semibold text-white">
                Get Started
              </a>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs text-ink-muted">
              <a href="/login/passenger" className="rounded border border-border py-1.5">Passenger</a>
              <a href="/login/driver" className="rounded border border-border py-1.5">Driver</a>
              <a href="/login/admin" className="rounded border border-border py-1.5">Admin</a>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ profile, onLogout }} />
      </main>

      <footer className="border-t border-border bg-surface-muted">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-muted">
              Real-time public bus tracking for Lahore. Discover routes, follow observed bus
              positions and plan with confidence when data is available.
            </p>
          </div>
          <FooterColumn
            title="Product"
            links={[
              { label: "Home", href: "/" },
              { label: "Features", href: "/features" },
              { label: "How it works", href: "/#how-it-works" },
              { label: "About", href: "/#about" },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { label: "Log in", href: "/login" },
              { label: "Create account", href: "/register" },
              { label: "Driver login", href: "/login/driver" },
              { label: "Administrator login", href: "/login/admin" },
            ]}
          />
          <FooterColumn
            title="Contact"
            links={[
              { label: "support@tracksafar.pk", href: "mailto:support@tracksafar.pk" },
              { label: "Privacy policy", href: "/privacy" },
              { label: "Terms of use", href: "/terms" },
            ]}
          />
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-ink-faint sm:px-6">
          © {new Date().getFullYear()} TrackSafar. Built for Lahore's commuters.
        </div>
      </footer>
    </div>
  );
}

function dashboardPathFor(role) {
  return { admin: "/admin", driver: "/driver", passenger: "/passenger" }[role] || null;
}

function RoleMenuLink({ href, label, desc }) {
  return (
    <a href={href} className="block rounded-[--radius-control] px-3 py-2 hover:bg-surface-muted">
      <span className="block text-sm font-medium text-ink">{label}</span>
      <span className="block text-xs text-ink-muted">{desc}</span>
    </a>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="text-sm text-ink-muted transition-colors hover:text-brand-700">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
