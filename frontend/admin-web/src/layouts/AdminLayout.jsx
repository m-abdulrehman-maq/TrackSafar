import { useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle, Bell, Bus, ChevronLeft, ClipboardList, Gauge, LogOut, Map, Menu,
  Route as RouteIcon, Settings, ShieldAlert, SquareParking, Tag, UserRound, Users, X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { Logo } from "./PublicLayout";
import { TrackSafarLoader } from "../components/ui/Loader";

export const ADMIN_NAV = [
  { to: "/admin", label: "Overview", icon: Gauge, end: true },
  { to: "/admin/passengers", label: "Passengers", icon: Users },
  { to: "/admin/drivers", label: "Drivers", icon: UserRound },
  { to: "/admin/buses", label: "Buses", icon: Bus },
  { to: "/admin/routes", label: "Routes", icon: RouteIcon },
  { to: "/admin/stops", label: "Stops", icon: SquareParking },
  { to: "/admin/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/admin/trips", label: "Trips & Live", icon: Map },
  { to: "/admin/alerts", label: "Notifications", icon: Bell },
  { to: "/admin/incidents", label: "Incidents", icon: ShieldAlert },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/profile", label: "Profile", icon: Tag },
];

export function RequireAuth({ role }) {
  const { profile, initializing } = useAuth();
  const location = useLocation();
  if (initializing) {
    return <TrackSafarLoader label="Checking session…" />;
  }
  if (!profile) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (role && profile.role !== role) {
    return <Navigate to="/forbidden" replace />;
  }
  if (role === "admin" && !profile.is_active) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}

function Breadcrumbs({ pathname }) {
  const parts = pathname.split("/").filter(Boolean);
  const labels = {
    admin: "Administration", passengers: "Passengers", drivers: "Drivers", buses: "Buses",
    routes: "Routes", stops: "Stops", assignments: "Assignments", trips: "Trips & Live",
    alerts: "Notifications", incidents: "Incidents", settings: "Settings", profile: "Profile",
    passenger: "Passenger", driver: "Driver",
  };
  if (parts.length <= 1) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden text-xs text-ink-muted lg:block">
      <ol className="flex items-center gap-1.5">
        {parts.map((part, i) => (
          <li key={`${part}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            <span className={i === parts.length - 1 ? "font-medium text-ink" : ""}>
              {labels[part] || part}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function titleFor(pathname) {
  const map = {
    "/admin": "Fleet overview",
    "/admin/passengers": "Passenger management",
    "/admin/drivers": "Driver management",
    "/admin/buses": "Fleet — buses",
    "/admin/routes": "Routes",
    "/admin/stops": "Stops",
    "/admin/assignments": "Driver assignments",
    "/admin/trips": "Trips & live tracking",
    "/admin/alerts": "Notifications",
    "/admin/incidents": "Operational incidents",
    "/admin/settings": "Settings & audit",
    "/admin/profile": "My profile",
  };
  if (map[pathname]) return map[pathname];
  if (/^\/admin\/routes\/.+/.test(pathname)) return "Route detail";
  return "Administration";
}

export function AdminLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login/admin");
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <a href="/" aria-label="TrackSafar home"><Logo compact={collapsed} /></a>
        <button
          type="button"
          className="hidden rounded-[--radius-control] p-1.5 text-ink-muted hover:bg-surface-muted lg:block"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          className="rounded p-1.5 text-ink-muted lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Administration">
        {ADMIN_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-[--radius-control] px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-100 text-brand-700"
                  : "text-ink-muted hover:bg-surface-muted hover:text-ink"
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-[--radius-control] px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {!collapsed && "Log out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-white transition-[width] lg:block ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className={`transition-[padding] ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-[--radius-control] border border-border p-2 text-ink lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-ink">{titleFor(location.pathname)}</h2>
              <Breadcrumbs pathname={location.pathname} />
            </div>

            <a
              href="/admin/incidents"
              className="relative rounded-[--radius-control] border border-border p-2 text-ink-muted transition hover:bg-surface-muted"
              aria-label="Operational incidents"
            >
              <Bell className="h-4 w-4" />
              <AlertTriangle className="absolute -right-1 -top-1 h-3 w-3 text-warning" aria-hidden="true" />
            </a>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-[--radius-control] border border-border px-2 py-1.5 text-sm hover:bg-surface-muted"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
                  {(profile?.full_name || "A").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate font-medium sm:inline">{profile?.full_name}</span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 w-52 rounded-[--radius-card] border border-border bg-white p-1.5 shadow-sm"
                >
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-sm font-medium text-ink">{profile?.full_name}</p>
                    <p className="truncate text-xs text-ink-muted">{profile?.email}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-brand-700">{profile?.role}</p>
                  </div>
                  <a href="/admin/profile" role="menuitem" className="block rounded-[--radius-control] px-3 py-2 text-sm text-ink-muted hover:bg-surface-muted" onClick={() => setMenuOpen(false)}>
                    My profile
                  </a>
                  <a href="/admin/settings" role="menuitem" className="block rounded-[--radius-control] px-3 py-2 text-sm text-ink-muted hover:bg-surface-muted" onClick={() => setMenuOpen(false)}>
                    Settings
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full rounded-[--radius-control] px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
