/** Timestamp and status formatting helpers. */

export function formatTimestamp(value) {
  if (!value) return "—";
  let date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  // SQLite development responses may omit the offset; they are UTC.
  if (typeof value === "string" && !/(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    date = new Date(`${value}Z`);
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTime(value) {
  if (!value) return "—";
  let s = typeof value === "string" ? value : value.toISOString();
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s = `${s}Z`;
  const date = new Date(s);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ageLabel(ageSeconds) {
  if (ageSeconds == null) return null;
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  if (ageSeconds < 3600) return `${Math.floor(ageSeconds / 60)}m ago`;
  return `${Math.floor(ageSeconds / 3600)}h ago`;
}

export function formatDistance(meters) {
  if (meters == null) return "—";
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  if (m < 1) return "<1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const FRESHNESS_LABELS = {
  fresh: "Live",
  stale: "Stale",
  unavailable: "No signal",
};
