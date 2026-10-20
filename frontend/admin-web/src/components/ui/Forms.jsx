import clsx from "clsx";
import { useId } from "react";

export function Field({ label, error, hint, children, required }) {
  const id = useId();
  return (
    <div className="mb-4">
      <label htmlFor={id} className="ts-label">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children({ id, invalid: Boolean(error) })}
      {error ? (
        <p className="ts-error-text" role="alert">{error}</p>
      ) : hint ? (
        <p className="ts-hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ invalid, className, ...rest }) {
  return <input aria-invalid={invalid || undefined} className={clsx("ts-input", className)} {...rest} />;
}

export function Select({ invalid, className, children, ...rest }) {
  return (
    <select aria-invalid={invalid || undefined} className={clsx("ts-input", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ invalid, className, ...rest }) {
  return <textarea aria-invalid={invalid || undefined} className={clsx("ts-input min-h-24", className)} {...rest} />;
}

export function Checkbox({ label, hint, error, ...rest }) {
  return (
    <div className="mb-4">
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border-strong accent-[#006852]"
          {...rest}
        />
        <span>
          {label}
          {hint && <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>}
        </span>
      </label>
      {error && <p className="ts-error-text" role="alert">{error}</p>}
    </div>
  );
}
