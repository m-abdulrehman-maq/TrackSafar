import clsx from "clsx";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 border border-transparent",
  accent: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 border border-transparent",
  secondary: "bg-white text-ink border border-border-strong hover:bg-surface-muted active:bg-brand-50",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink border border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
  "danger-soft": "bg-danger-soft text-danger border border-danger/20 hover:bg-danger/10",
};

const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-9.5 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[--radius-control] font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
