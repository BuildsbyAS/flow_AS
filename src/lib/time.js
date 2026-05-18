// Tiny shared time helpers. Kept stateless — no theme imports here, so
// these are safe to call from anywhere (mutations, hooks, components).

export const STALE_DAYS = 14;

/** Human-friendly elapsed string. Returns "" if the input is missing. */
export function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/** Days since `iso`. Returns Infinity for missing input so callers can
 *  default to "stale" cleanly. */
export function daysSince(iso) {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return Infinity;
  return ms / 86_400_000;
}

/** A project is "stale" if no activity in >STALE_DAYS days. Missing
 *  timestamps are treated as stale — they need attention. */
export function isStale(iso, threshold = STALE_DAYS) {
  return daysSince(iso) > threshold;
}

export function fmtAbsolute(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}
