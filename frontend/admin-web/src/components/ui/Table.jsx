import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";
import { EmptyState, ErrorState } from "./Display";
import { SkeletonTableRows } from "./Skeleton";

export function Table({ columns, children, caption }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border bg-surface-muted/60">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={clsx("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted", col.className)}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }) {
  return <td className={clsx("px-4 py-3 align-middle text-sm text-ink", className)}>{children}</td>;
}

export function Tr({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={clsx("transition-colors", onClick && "cursor-pointer hover:bg-surface-muted/70")}
    >
      {children}
    </tr>
  );
}

export function TableState({ loading, error, isEmpty, emptyTitle, emptyDescription, onRetry, colSpan = 5, children, skeletonRows = 5 }) {
  if (loading)
    return (
      <>
        <SkeletonTableRows rows={skeletonRows} cols={colSpan} />
      </>
    );
  if (error)
    return (
      <tr>
        <td colSpan={colSpan}>
          <ErrorState message={error} onRetry={onRetry} />
        </td>
      </tr>
    );
  if (isEmpty)
    return (
      <tr>
        <td colSpan={colSpan}>
          <EmptyState title={emptyTitle || "Nothing here yet"} description={emptyDescription} />
        </td>
      </tr>
    );
  return children;
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return (
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-ink-muted">
        <span>{total} record{total === 1 ? "" : "s"}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <span className="text-xs text-ink-muted">
        Page {page} of {pages} · {total} records
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
