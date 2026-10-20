import clsx from "clsx";

export function Skeleton({ className, ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={clsx("ts-shimmer rounded-[--radius-control]", className)}
      {...rest}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={clsx("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={clsx("h-3.5", i === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }) {
  return (
    <div className={clsx("rounded-[--radius-card] border border-border bg-white p-5", className)} aria-hidden="true">
      <Skeleton className="mb-4 h-4 w-40" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-[--radius-card] border border-border bg-white p-5" aria-hidden="true">
      <Skeleton className="mb-3 h-3.5 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-border">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className={clsx("h-4", c === 0 ? "w-36" : c === cols - 1 ? "ml-auto w-16" : "w-24")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
