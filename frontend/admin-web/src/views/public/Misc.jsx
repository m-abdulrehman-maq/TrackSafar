import {
  useForbiddenPageController,
  useNotFoundPageController,
} from "../../controllers/public/Misc";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { ForbiddenState } from "../components/ui/Display";
import { FEATURES } from "./Landing";
export function ForbiddenPage() {
  const { navigate } = useForbiddenPageController();
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <div className="rounded-[--radius-card] border border-border bg-white">
        <ForbiddenState
          title="You don't have access to this area"
          message="Your account does not have permission for this section. If you believe this is a mistake, contact an administrator."
        />
        <div className="flex justify-center gap-3 pb-8">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Link to="/">
            <Button variant="primary">Return home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
export function NotFoundPage() {
  const { navigate } = useNotFoundPageController();
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-5xl font-bold text-brand-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The page you requested does not exist or has moved.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Link to="/">
          <Button>Return home</Button>
        </Link>
      </div>
    </div>
  );
}
export function FeaturesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
        Features
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
        What TrackSafar does
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
        Every capability below reads from the live backend. Positions, counts
        and estimates are only shown when the system has real data to support
        them.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-[--radius-card] border border-border bg-white p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[--radius-control] bg-brand-100 text-brand-700">
              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-ink">{title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              {body}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-10 rounded-[--radius-card] border border-border bg-surface-muted p-6">
        <h2 className="text-sm font-semibold text-ink">Honest about data</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          TrackSafar never invents bus positions, fleet counts or arrival times.
          When tracking data is stale or a route has no verified path, the
          interface states that clearly with the last observed timestamp.
        </p>
      </div>
      <div className="mt-6">
        <Link
          to="/register"
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          Create a passenger account →
        </Link>
      </div>
    </div>
  );
}
export function StaticPage({ title, children }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <div className="prose-sm mt-6 space-y-4 text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
      <div className="mt-8">
        <Link
          to="/"
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
