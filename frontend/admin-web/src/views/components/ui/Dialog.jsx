import { useEffect, useRef } from "react";
import { Button } from "./Button";

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  labelledBy,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const first = ref.current?.querySelector("input, select, textarea, button");
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || "dialog-title"}
        className="w-full max-w-md rounded-[--radius-card] border border-border bg-white shadow-lg"
      >
        <div className="border-b border-border px-5 py-4">
          <h2
            id={labelledBy || "dialog-title"}
            className="text-sm font-semibold text-ink"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-ink-muted">{description}</p>
          )}
        </div>
        {children && (
          <div className="px-5 py-4 text-sm text-ink">{children}</div>
        )}
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  loading,
  onConfirm,
  onClose,
}) {
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
