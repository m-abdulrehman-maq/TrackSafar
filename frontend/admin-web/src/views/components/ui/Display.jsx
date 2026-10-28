import clsx from "clsx";
import { AlertCircle, Inbox, Lock, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { InlineLoader } from "./Loader";

export function Card({ className, children, ...rest }) {
  return (
    <section
      className={clsx(
        "rounded-[--radius-card] border border-border bg-white",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

export function CardHeader({ title, description, actions }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CardBody({ className, children }) {
  return <div className={clsx("p-5", className)}>{children}</div>;
}

const BADGE_TONES = {
  neutral: "bg-surface-muted text-ink-muted border-border",
  brand: "bg-brand-100 text-brand-700 border-brand-200",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
};

export function Badge({ tone = "neutral", children, className, dot }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return <InlineLoader label={label} />;
}

export function LoadingState({ label }) {
  return <Spinner label={label} />;
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <Inbox className="mb-3 h-8 w-8 text-ink-faint" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
    >
      <AlertCircle className="mb-3 h-8 w-8 text-danger" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      {message && (
        <p className="mt-1 max-w-md text-xs text-ink-muted">{message}</p>
      )}
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
        </Button>
      )}
    </div>
  );
}

export function ForbiddenState({ title = "Access restricted", message }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      role="alert"
    >
      <Lock className="mb-3 h-8 w-8 text-warning" aria-hidden="true" />
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-md text-xs text-ink-muted">
        {message || "You do not have permission to view this content."}
      </p>
    </div>
  );
}

export function Banner({ tone = "info", title, children }) {
  const tones = {
    info: "border-info/25 bg-info-soft text-info",
    success: "border-success/25 bg-success-soft text-success",
    warning: "border-warning/25 bg-warning-soft text-warning",
    danger: "border-danger/25 bg-danger-soft text-danger",
  };
  return (
    <div
      role="status"
      className={clsx(
        "mb-4 rounded-[--radius-card] border px-4 py-3 text-sm",
        tones[tone],
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && (
        <div className={clsx(title && "mt-1", "text-xs leading-relaxed")}>
          {children}
        </div>
      )}
    </div>
  );
}
