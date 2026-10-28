import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Clock,
  Gauge,
  Lock,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Signal,
  UserRound,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: Navigation,
    title: "Live bus tracking",
    body: "Follow observed bus positions on the map while trips are active, each with the time it was actually observed.",
  },
  {
    icon: Search,
    title: "Route and stop discovery",
    body: "Search registered buses, route numbers and stop names to plan your journey across the network.",
  },
  {
    icon: Clock,
    title: "Conditional arrival estimates",
    body: "See an estimated arrival only when route geometry and a fresh position make it reliable — never an invented number.",
  },
  {
    icon: Signal,
    title: "Driver trip management",
    body: "Drivers start and end assigned trips and share GPS only while a validated trip is running.",
  },
  {
    icon: ShieldCheck,
    title: "Fleet operations & administration",
    body: "Operators manage accounts, buses, routes, assignments and incidents from one secure panel.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Choose a route or search for a bus",
    body: "Browse registered routes or search by bus number, route number or stop name.",
  },
  {
    step: "02",
    title: "Select a stop or an active trip",
    body: "Open a route to see its ordered stops, or pick a trip that is currently running.",
  },
  {
    step: "03",
    title: "Inspect the observed position",
    body: "View where the bus was last observed and its timestamp — plus an arrival estimate only when data supports one.",
  },
];

const ROLES = [
  {
    icon: Users,
    title: "Passenger",
    body: "Search routes, track buses and manage your own profile and alerts.",
    href: "/register",
    cta: "Create account",
    primary: true,
  },
  {
    icon: UserRound,
    title: "Driver",
    body: "Sign in to view your assignment, start trips and share location while on duty.",
    href: "/login/driver",
    cta: "Driver sign in",
  },
  {
    icon: Lock,
    title: "Administrator",
    body: "Restricted staff portal for fleet, network and account operations. Accounts are provisioned by an administrator — no public sign-up.",
    href: "/login/admin",
    cta: "Staff sign in",
    restricted: true,
  },
];

function TransitVisual() {
  return (
    <div className="relative overflow-hidden rounded-[--radius-card] border border-border bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Route map · illustration
        </span>
        <span className="rounded-full border border-brand-200 bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
          Demo visual — not live data
        </span>
      </div>
      <svg
        viewBox="0 0 560 300"
        className="w-full"
        role="img"
        aria-label="Illustration of a transit map with a route line and stops"
      >
        <rect width="560" height="300" fill="#f8faf9" rx="10" />
        {/* grid */}
        <g stroke="#e4e9e7" strokeWidth="1">
          {[40, 90, 140, 190, 240].map((y) => (
            <line key={y} x1="0" y1={y} x2="560" y2={y} />
          ))}
          {[60, 140, 220, 300, 380, 460].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="300" />
          ))}
        </g>
        {/* route line */}
        <polyline
          points="40,240 140,240 220,150 340,150 420,80 520,80"
          fill="none"
          stroke="#006852"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="40,240 140,240 220,150 340,150 420,80 520,80"
          fill="none"
          stroke="#00b386"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="1 26"
          strokeLinejoin="round"
        />
        {/* stops */}
        {[
          [40, 240],
          [140, 240],
          [220, 150],
          [340, 150],
          [420, 80],
          [520, 80],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r="8"
              fill="#ffffff"
              stroke="#006852"
              strokeWidth="3"
            />
            <text
              x={cx}
              y={cy + 26}
              textAnchor="middle"
              fontSize="11"
              fill="#5b6b66"
            >
              Stop {i + 1}
            </text>
          </g>
        ))}
        {/* bus marker (static illustration) */}
        <g transform="translate(326,132)">
          <rect x="0" y="0" width="28" height="20" rx="5" fill="#00b386" />
          <rect x="4" y="4" width="7" height="7" rx="2" fill="#ffffff" />
          <rect x="14" y="4" width="7" height="7" rx="2" fill="#ffffff" />
        </g>
        <text x="364" y="146" fontSize="11" fill="#006852" fontWeight="600">
          Illustrated bus
        </text>
      </svg>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-[--radius-control] border border-border bg-surface-muted px-2 py-2.5">
          <dt className="text-[11px] text-ink-muted">Positions</dt>
          <dd className="text-sm font-semibold text-ink">Timestamped</dd>
        </div>
        <div className="rounded-[--radius-control] border border-border bg-surface-muted px-2 py-2.5">
          <dt className="text-[11px] text-ink-muted">Stops</dt>
          <dd className="text-sm font-semibold text-ink">Ordered</dd>
        </div>
        <div className="rounded-[--radius-control] border border-border bg-surface-muted px-2 py-2.5">
          <dt className="text-[11px] text-ink-muted">ETA</dt>
          <dd className="text-sm font-semibold text-ink">When available</dd>
        </div>
      </dl>
    </div>
  );
}

export function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-50/70 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
              <Bus className="h-3.5 w-3.5" aria-hidden="true" /> Lahore public
              transport, in real time
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
              Your Journey,{" "}
              <span className="text-brand-700">Tracked in Real Time.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted">
              TrackSafar helps commuters discover routes, locate active buses,
              inspect stops and view estimated arrivals — whenever live tracking
              data is available. No more waiting at stops without answers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-[--radius-control] bg-brand-700 px-6 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Find Your Bus{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/register"
                className="inline-flex h-11 items-center gap-2 rounded-[--radius-control] border border-border-strong bg-white px-6 text-sm font-semibold text-ink transition hover:bg-surface-muted"
              >
                Get Started
              </a>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin
                className="h-3.5 w-3.5 text-brand-600"
                aria-hidden="true"
              />
              Bus positions and arrival times appear only when observed data
              supports them.
            </p>
          </div>
          <TransitVisual />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Features
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">
              Everything a commuter needs
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Built around honest data: live positions come from real trip
              observations, and estimates are shown only when they can be
              justified.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-[--radius-card] border border-border bg-white p-5 transition hover:border-brand-300"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[--radius-control] bg-brand-100 text-brand-700">
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-b border-border bg-surface-muted"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">
              Three steps to your bus
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 lg:grid-cols-3">
            {STEPS.map(({ step, title, body }) => (
              <li
                key={step}
                className="relative rounded-[--radius-card] border border-border bg-white p-6"
              >
                <span className="text-3xl font-bold text-brand-200">
                  {step}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Roles */}
      <section id="about" className="border-b border-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Who it's for
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">
              Choose your access
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {ROLES.map(
              ({ icon: Icon, title, body, href, cta, primary, restricted }) => (
                <article
                  key={title}
                  className={`flex flex-col rounded-[--radius-card] border p-6 ${
                    primary
                      ? "border-brand-300 bg-brand-50/50"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-[--radius-control] ${primary ? "bg-brand-700 text-white" : "bg-surface-muted text-ink"}`}
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    {restricted && (
                      <span className="rounded-full border border-warning/30 bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
                        Staff only
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-muted">
                    {body}
                  </p>
                  <a
                    href={href}
                    className={`mt-5 inline-flex h-9 items-center justify-center gap-1.5 rounded-[--radius-control] px-4 text-sm font-semibold transition ${
                      primary
                        ? "bg-brand-700 text-white hover:bg-brand-800"
                        : "border border-border-strong bg-white text-ink hover:bg-surface-muted"
                    }`}
                  >
                    {cta}{" "}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-700">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-12 sm:px-6 lg:flex-row">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Ready to stop waiting blindly?
            </h2>
            <p className="mt-2 text-sm text-brand-100">
              Create a free passenger account and start finding your bus.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/register"
              className="inline-flex h-10 items-center rounded-[--radius-control] bg-white px-5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
            >
              Create account
            </a>
            <a
              href="/login"
              className="inline-flex h-10 items-center rounded-[--radius-control] border border-brand-400 px-5 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Sign in
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export { FEATURES, STEPS, ROLES };
