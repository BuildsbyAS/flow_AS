// ═══════════════════════════════════════════════════════════════════
// devSeed.js — localhost-only mock data + in-memory mutable store.
//
// When the app runs on localhost without a real Supabase session, RLS
// would return zero rows for every table. That makes the new UI
// unclickable. This module short-circuits the data layer so the
// dashboard works without auth.
//
// What's in here:
//   - isDevSeedMode()           — gate predicate (localhost + anon)
//   - seedSquads/Roles/People/Projects — initial state used by
//                                  useSupabaseData when in seed mode
//   - devStore                  — in-memory comments/members/events
//                                  with subscribe() for "realtime"
//
// Mutations.js, useProjectActivity.js, and useSupabaseData.js all check
// isDevSeedMode() and route through this store instead of Supabase.
// Nothing here ever hits the network.
// ═══════════════════════════════════════════════════════════════════

/** Localhost + no real Supabase session = dev seed mode. We treat the
 *  presence of a session as a signal that the developer wants live data,
 *  even on localhost, so the seed is a fallback rather than a takeover. */
let _hasSession = false;
export function setDevSeedSessionFlag(hasSession) { _hasSession = !!hasSession; }
export function isDevSeedMode() {
  if (typeof window === "undefined") return false;
  const host = window.location?.hostname || "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  if (!isLocal) return false;
  return !_hasSession;
}

// ── Helper: build an ISO offset from "now" so seed timestamps stay relative ──
const now = () => new Date();
const isoAgo = (ms) => new Date(Date.now() - ms).toISOString();
const HOUR = 3_600_000;
const DAY  = 86_400_000;

// ── IDs (kept stable so refresh doesn't shuffle order) ──────────────
const SQUAD_PLATFORM   = "00000000-0000-0000-0000-000000000001";
const SQUAD_GROWTH     = "00000000-0000-0000-0000-000000000002";

const ROLE_ENG         = "00000000-0000-0000-0000-000000000101";
const ROLE_PM          = "00000000-0000-0000-0000-000000000102";
const ROLE_DESIGN      = "00000000-0000-0000-0000-000000000103";

const PERSON_AJ        = "00000000-0000-0000-0000-000000000201";
const PERSON_MARIAM    = "00000000-0000-0000-0000-000000000202";
const PERSON_RANIA     = "00000000-0000-0000-0000-000000000203";
const PERSON_KHALID    = "00000000-0000-0000-0000-000000000204";
const PERSON_AYUSH     = "00000000-0000-0000-0000-000000000205";
const PERSON_IBRAHIM   = "00000000-0000-0000-0000-000000000206";

export const seedSquads = [
  { id: SQUAD_PLATFORM, name: "Platform" },
  { id: SQUAD_GROWTH,   name: "Growth"   },
];

export const seedRoles = [
  { id: ROLE_ENG,    name: "Engineer"      },
  { id: ROLE_PM,     name: "Product Manager" },
  { id: ROLE_DESIGN, name: "Designer"      },
];

export const seedPeople = [
  { id: PERSON_AJ,      name: "AJ",      squad: "Platform", role: "Product Manager", squad_id: SQUAD_PLATFORM, role_id: ROLE_PM },
  { id: PERSON_MARIAM,  name: "Mariam",  squad: "Platform", role: "Engineer",        squad_id: SQUAD_PLATFORM, role_id: ROLE_ENG },
  { id: PERSON_RANIA,   name: "Rania",   squad: "Growth",   role: "Engineer",        squad_id: SQUAD_GROWTH,   role_id: ROLE_ENG },
  { id: PERSON_KHALID,  name: "Khalid",  squad: "Growth",   role: "Designer",        squad_id: SQUAD_GROWTH,   role_id: ROLE_DESIGN },
  { id: PERSON_AYUSH,   name: "Ayush",   squad: "Platform", role: "Engineer",        squad_id: SQUAD_PLATFORM, role_id: ROLE_ENG },
  { id: PERSON_IBRAHIM, name: "Ibrahim", squad: "Growth",   role: "Product Manager", squad_id: SQUAD_GROWTH,   role_id: ROLE_PM },
];

// Project shape mirrors what toSeedProjects() in useSupabaseData returns.
// `owner_id` is essential — PersonProjects ("Owns" section on the People
// deep-dive) filters on it strictly, matching the prod schema.
export const seedProjects = [
  {
    id: "X01", name: "Checkout speedup",
    owner: "AJ", owner_id: PERSON_AJ, squad: "Growth",
    phase: "Dev", status: "active",
    startDate: "2026-03-01", endDate: "2026-06-15",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(3 * HOUR),
  },
  {
    id: "X02", name: "Onboarding redesign",
    owner: "Khalid", owner_id: PERSON_KHALID, squad: "Growth",
    phase: "Design", status: "active",
    startDate: "2026-04-12", endDate: "2026-07-30",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(2 * DAY),
  },
  {
    id: "X03", name: "Notifications platform",
    owner: "Mariam", owner_id: PERSON_MARIAM, squad: "Platform",
    phase: "QA", status: "active",
    startDate: "2026-02-02", endDate: "2026-05-20",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(20 * DAY), // stale → should show red ⚠ chip
  },
  {
    id: "X04", name: "Search relevance v3",
    owner: "Ayush", owner_id: PERSON_AYUSH, squad: "Platform",
    phase: "PRD", status: "active",
    startDate: "2026-05-01", endDate: "2026-08-10",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(6 * HOUR),
  },
  {
    id: "X05", name: "Returns flow",
    owner: "Ibrahim", owner_id: PERSON_IBRAHIM, squad: "Growth",
    phase: "GA", status: "active",
    startDate: "2025-11-15", endDate: "2026-03-30",
    actualStartDate: "2025-11-20", actualEndDate: "2026-04-02",
    gaEnteredAt: "2026-04-02", depriReason: null,
    lastActivityAt: isoAgo(11 * DAY),
  },
  {
    id: "X06", name: "Promo engine v2",
    owner: "Rania", owner_id: PERSON_RANIA, squad: "Growth",
    phase: "Dev", status: "deprioritized",
    startDate: "2026-02-20", endDate: "2026-06-30",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: "Pushed to Q3 — focus shifted to checkout speed.",
    lastActivityAt: isoAgo(33 * DAY),
  },
];

// ── In-memory mutable store for comments / members / events ────────
// Subscribers receive `{ type: 'comments'|'members'|'events', projectId, change }`
// after every mutation so hooks can refresh.
const _state = {
  comments: [
    // X01 has a small conversation
    {
      id: "cmt-1", project_id: "X01", author_id: PERSON_AJ,
      body: "Demo today went well — pushing the new flow to QA tomorrow.",
      created_at: isoAgo(3 * HOUR), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-2", project_id: "X01", author_id: PERSON_MARIAM,
      body: "Nice. I'll pick up the metrics dashboard piece this week. @Ayush, want to pair on the perf budget?",
      created_at: isoAgo(2 * HOUR), edited_at: null, deleted_at: null,
    },
    // X02 has one comment
    {
      id: "cmt-3", project_id: "X02", author_id: PERSON_KHALID,
      body: "First-round designs are up. Going to share with @AJ for review tomorrow.",
      created_at: isoAgo(2 * DAY), edited_at: null, deleted_at: null,
    },
  ],
  members: [
    // X01: owner is AJ; members are Mariam + Ayush
    { id: "mem-1", project_id: "X01", person_id: PERSON_MARIAM, added_by: PERSON_AJ, added_at: isoAgo(10 * DAY) },
    { id: "mem-2", project_id: "X01", person_id: PERSON_AYUSH,  added_by: PERSON_AJ, added_at: isoAgo(8 * DAY) },
    // X02: owner is Khalid; member is AJ (for review)
    { id: "mem-3", project_id: "X02", person_id: PERSON_AJ,     added_by: PERSON_KHALID, added_at: isoAgo(15 * DAY) },
  ],
  events: [
    {
      id: "ev-1", entity_type: "project", entity_id: "X01",
      action: "project_phase_changed",
      user_name: "AJ", user_email: "ajain@noon.com",
      details: { from: "Design", to: "Dev" },
      created_at: isoAgo(7 * DAY),
    },
    {
      id: "ev-2", entity_type: "project", entity_id: "X01",
      action: "member_added",
      user_name: "AJ", user_email: "ajain@noon.com",
      details: { person_name: "Mariam" },
      created_at: isoAgo(10 * DAY),
    },
    {
      id: "ev-3", entity_type: "project", entity_id: "X03",
      action: "project_status_changed",
      user_name: "Mariam", user_email: "mariam@noon.com",
      details: { from: "active", to: "active" }, // illustrative; not a real transition
      created_at: isoAgo(20 * DAY),
    },
  ],
};

// Bump every project's last_activity_at to its actual most-recent event.
(() => {
  for (const p of seedProjects) {
    const allTs = [
      ..._state.comments.filter(c => c.project_id === p.id && !c.deleted_at).map(c => c.created_at),
      ..._state.events.filter(e => e.entity_id === p.id).map(e => e.created_at),
    ].map(s => new Date(s).getTime()).filter(t => Number.isFinite(t));
    if (allTs.length) p.lastActivityAt = new Date(Math.max(...allTs)).toISOString();
  }
})();

const _subs = new Set();
function notify(change) { _subs.forEach(fn => { try { fn(change); } catch { /* ignore */ } }); }

export const devStore = {
  // ── READ ──────────────────────────────────────────────────────
  listComments(projectId) {
    return _state.comments
      .filter(c => c.project_id === projectId)
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  listMembers(projectId) {
    return _state.members.filter(m => m.project_id === projectId).slice();
  },
  listEvents(projectId) {
    return _state.events
      .filter(e => e.entity_type === "project" && e.entity_id === projectId)
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Cross-person reads (used by the People deep-dive).
  listMembershipsByPerson(personId) {
    return _state.members.filter(m => m.person_id === personId).slice();
  },
  listCommentsByAuthor(authorId, limit = 20) {
    return _state.comments
      .filter(c => c.author_id === authorId && !c.deleted_at)
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  },

  // ── COMMENTS ─────────────────────────────────────────────────
  addComment(projectId, authorId, body) {
    const row = {
      id: `cmt-${Math.random().toString(36).slice(2, 9)}`,
      project_id: projectId, author_id: authorId,
      body: body.trim(),
      created_at: new Date().toISOString(),
      edited_at: null, deleted_at: null,
    };
    _state.comments.unshift(row);
    notify({ type: "comments", projectId, change: { op: "insert", row } });
    return row;
  },
  editComment(commentId, body) {
    const c = _state.comments.find(x => x.id === commentId);
    if (!c) return null;
    c.body = body.trim();
    c.edited_at = new Date().toISOString();
    notify({ type: "comments", projectId: c.project_id, change: { op: "update", row: c } });
    return c;
  },
  softDeleteComment(commentId) {
    const c = _state.comments.find(x => x.id === commentId);
    if (!c) return null;
    c.deleted_at = new Date().toISOString();
    notify({ type: "comments", projectId: c.project_id, change: { op: "update", row: c } });
    return c;
  },

  // ── MEMBERS ──────────────────────────────────────────────────
  addMember(projectId, personId, addedBy) {
    const existing = _state.members.find(m => m.project_id === projectId && m.person_id === personId);
    if (existing) return existing;
    const row = {
      id: `mem-${Math.random().toString(36).slice(2, 9)}`,
      project_id: projectId, person_id: personId,
      added_by: addedBy || null, added_at: new Date().toISOString(),
    };
    _state.members.push(row);
    notify({ type: "members", projectId, change: { op: "insert", row } });
    return row;
  },
  removeMember(projectId, personId) {
    const idx = _state.members.findIndex(m => m.project_id === projectId && m.person_id === personId);
    if (idx === -1) return null;
    const [row] = _state.members.splice(idx, 1);
    notify({ type: "members", projectId, change: { op: "delete", row } });
    return row;
  },

  // ── EVENTS (activity_log) ────────────────────────────────────
  logEvent({ projectId, action, userName, userEmail, details }) {
    const row = {
      id: `ev-${Math.random().toString(36).slice(2, 9)}`,
      entity_type: "project", entity_id: projectId,
      action,
      user_name: userName || "AJ",
      user_email: userEmail || "ajain@noon.com",
      details: details || null,
      created_at: new Date().toISOString(),
    };
    _state.events.unshift(row);
    notify({ type: "events", projectId, change: { op: "insert", row } });
    return row;
  },

  // ── Realtime-ish subscription ────────────────────────────────
  subscribe(fn) { _subs.add(fn); return () => _subs.delete(fn); },
};

// Convenience: pre-populated project list with current lastActivityAt
export function getSeedProjects() {
  // Recompute lastActivityAt on read so post-mount mutations are reflected.
  return seedProjects.map(p => {
    const ts = [
      ..._state.comments.filter(c => c.project_id === p.id && !c.deleted_at).map(c => c.created_at),
      ..._state.events.filter(e => e.entity_id === p.id).map(e => e.created_at),
    ].map(s => new Date(s).getTime()).filter(Number.isFinite);
    return { ...p, lastActivityAt: ts.length ? new Date(Math.max(...ts)).toISOString() : p.lastActivityAt };
  });
}
