// Flow — Announcements (What's New)
// ─────────────────────────────────────────────────────────────────────
// Shown in the megaphone panel in the top-right header. Users see an
// accent-orange dot until they open the panel; "last seen" timestamp is
// persisted to localStorage (key: flow_announcements_last_seen).
//
// To publish a new announcement, add an object to the TOP of this array
// and deploy. Order matters — newest first (sorting also happens in UI).
//
// Fields:
//   id     — stable unique string (e.g. `YYYY-MM-DD-slug`)
//   date   — ISO date string (YYYY-MM-DD)
//   title  — short headline, title case
//   body   — 1–3 sentence description; plain text
//   link   — (optional) { href, label } for a learn-more button
//   tag    — (optional) "new" | "fix" | "update" | "soon"

export const ANNOUNCEMENTS = [
  {
    id: "2026-04-24-new-logo",
    date: "2026-04-24",
    title: "New logo + UI cleanup",
    body: "Coming next — a refreshed logo and another pass of UI polish across the app.",
    tag: "soon",
  },
  {
    id: "2026-04-21-v2-2",
    date: "2026-04-21",
    title: "v2.2 — Commits & Projects fixes",
    body: "Bug fixes across the Commits and Projects tabs.",
    tag: "fix",
  },
  {
    id: "2026-04-20-alpha",
    date: "2026-04-20",
    title: "Alpha testing begins",
    body: "Flow is now in alpha with a select product crew. Feedback welcome.",
    tag: "new",
  },
  {
    id: "2026-04-15-v2-1",
    date: "2026-04-15",
    title: "v2.1 — Launch prep",
    body: "Bug fixes and backend data sync wired up for launch.",
    tag: "fix",
  },
  {
    id: "2026-04-10-v2-light",
    date: "2026-04-10",
    title: "v2 — Light theme, major UI overhaul",
    body: "Flow is now light-mode first (Steel & Orange). Most surfaces have been redesigned.",
    tag: "update",
  },
  {
    id: "2026-03-27-v1-testing",
    date: "2026-03-27",
    title: "v1 ready for testing",
    body: "First cut of Flow is ready for testing and final clean-ups.",
    tag: "new",
  },
];
