import clsx from "clsx";

/**
 * Full-screen TrackSafar boot loader:
 *  - bus slides left → right across a track
 *  - "Track" and "Safar" animate in word-by-word
 */
export function TrackSafarLoader({ label = "Loading…" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-muted"
      role="status"
      aria-label={label}
    >
      {/* Word-by-word brand */}
      <div
        className="flex items-baseline gap-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="ts-word">Track</span>
        <span className="ts-word ts-word-accent">Safar</span>
      </div>

      {/* Bus track */}
      <div
        className="relative mt-8 h-10 w-64 overflow-hidden rounded-full bg-brand-100/60"
        aria-hidden="true"
      >
        {/* road dashes */}
        <div className="ts-bus-track" />
        {/* bus */}
        <div className="ts-bus">
          <svg
            width="36"
            height="24"
            viewBox="0 0 36 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="1" y="4" width="30" height="14" rx="3" fill="#006852" />
            <rect x="3" y="6" width="7" height="5" rx="1" fill="#a6e5d3" />
            <rect x="12" y="6" width="7" height="5" rx="1" fill="#a6e5d3" />
            <rect x="21" y="6" width="7" height="5" rx="1" fill="#a6e5d3" />
            <rect x="31" y="8" width="4" height="7" rx="1.5" fill="#009872" />
            <circle cx="9" cy="19" r="2.5" fill="#14201c" />
            <circle cx="25" cy="19" r="2.5" fill="#14201c" />
            <circle cx="9" cy="19" r="1" fill="#8b9894" />
            <circle cx="25" cy="19" r="1" fill="#8b9894" />
          </svg>
        </div>
      </div>

      <p className="mt-6 text-xs font-medium tracking-wide text-ink-muted">
        {label}
      </p>
    </div>
  );
}

/** Lightweight inline loader for buttons/areas already inside a layout. */
export function InlineLoader({ label = "Loading…" }) {
  return (
    <div
      className="flex items-center gap-3 py-10 text-sm text-ink-muted"
      role="status"
    >
      <div
        className="relative h-6 w-16 overflow-hidden rounded-full bg-brand-100/60"
        aria-hidden="true"
      >
        <div className="ts-bus ts-bus-sm">
          <svg width="22" height="14" viewBox="0 0 36 24" fill="none">
            <rect x="1" y="4" width="30" height="14" rx="3" fill="#006852" />
            <rect x="3" y="6" width="7" height="5" rx="1" fill="#a6e5d3" />
            <rect x="12" y="6" width="7" height="5" rx="1" fill="#a6e5d3" />
            <rect x="21" y="6" width="7" height="5" rx="1" fill="#a6e5d3" />
            <circle cx="9" cy="19" r="2.5" fill="#14201c" />
            <circle cx="25" cy="19" r="2.5" fill="#14201c" />
          </svg>
        </div>
      </div>
      <span>{label}</span>
    </div>
  );
}
