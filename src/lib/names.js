/**
 * names.js — single source of truth for name rendering.
 *
 * Flow's DB has mixed name formats ("Ibrahim K." vs "Ayush Kapoor") that
 * can't be auto-expanded at render time — the K. could be Khan, Khalil,
 * Kazmi. A proper fix is a DB migration with a mapping someone from
 * Noon can vouch for.
 *
 * What this file does: stabilise the CODE layer so every call site
 * renders names the same way. When the data layer gets cleaned up, no
 * render code needs to be revisited.
 */

/**
 * Display form of a name. Current rule: return the DB value as-is —
 * never truncate a full name to "First L." at render time. If the DB
 * already has a short form, it stays short (no invented surnames).
 */
export function displayName(name) {
  if (!name) return "";
  return String(name).trim();
}

/**
 * First-word of the display name, lowercased. Used for compact
 * identifiers (sync toast, logs). "Ibrahim K." → "ibrahim".
 */
export function firstNameLower(name) {
  const d = displayName(name);
  if (!d) return "";
  return (d.split(/\s+/)[0] || "").toLowerCase();
}

/**
 * 2-letter uppercase initials for avatar chips. Unicode-safe (handles
 * names like "Anna Ng"). Capped at 2 letters so long names don't
 * produce 3-letter blobs ("Mariam Rashid Khan" → "MR", not "MRK").
 *   "Ibrahim K."      → "IK"
 *   "Ayush Kapoor"    → "AK"
 *   "AJ"              → "A"  (falls back to the single word)
 *   ""                → "?"
 */
export function initialsOf(name) {
  const d = displayName(name);
  if (!d) return "?";
  const parts = d.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  const letters = parts.map(p => [...p][0]?.toUpperCase() || "").join("");
  return letters || "?";
}
