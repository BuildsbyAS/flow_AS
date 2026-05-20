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
const SQUAD_UGC        = "00000000-0000-0000-0000-000000000001";
const SQUAD_TS         = "00000000-0000-0000-0000-000000000002";
const SQUAD_AFS        = "00000000-0000-0000-0000-000000000003";
const SQUAD_O2D        = "00000000-0000-0000-0000-000000000004";
const SQUAD_CUSTOMER   = "00000000-0000-0000-0000-000000000005";
const SQUAD_GAMING     = "00000000-0000-0000-0000-000000000006";
const SQUAD_SPECIAL    = "00000000-0000-0000-0000-000000000007";
const SQUAD_PLATFORM   = "00000000-0000-0000-0000-000000000008";
const SQUAD_NSO        = "00000000-0000-0000-0000-000000000009";
const SQUAD_STOREFRONT = "00000000-0000-0000-0000-00000000000a";
const SQUAD_SALES      = "00000000-0000-0000-0000-00000000000b";
const SQUAD_FINSERV    = "00000000-0000-0000-0000-00000000000c";

const ROLE_ENG         = "00000000-0000-0000-0000-000000000101";
const ROLE_PM          = "00000000-0000-0000-0000-000000000102";
const ROLE_DESIGN      = "00000000-0000-0000-0000-000000000103";

const PERSON_AJ        = "00000000-0000-0000-0000-000000000201";
const PERSON_MARIAM    = "00000000-0000-0000-0000-000000000202";
const PERSON_RANIA     = "00000000-0000-0000-0000-000000000203";
const PERSON_KHALID    = "00000000-0000-0000-0000-000000000204";
const PERSON_AYUSH     = "00000000-0000-0000-0000-000000000205";
const PERSON_IBRAHIM   = "00000000-0000-0000-0000-000000000206";
const PERSON_FATIMA    = "00000000-0000-0000-0000-000000000207";
const PERSON_OMAR      = "00000000-0000-0000-0000-000000000208";
const PERSON_SARA      = "00000000-0000-0000-0000-000000000209";
const PERSON_TARIQ     = "00000000-0000-0000-0000-000000000210";
const PERSON_LINA      = "00000000-0000-0000-0000-000000000211";
const PERSON_HASSAN    = "00000000-0000-0000-0000-000000000212";

export const seedSquads = [
  { id: SQUAD_UGC,        name: "UGC" },
  { id: SQUAD_TS,         name: "T&S" },
  { id: SQUAD_AFS,        name: "AFS" },
  { id: SQUAD_O2D,        name: "O2D" },
  { id: SQUAD_CUSTOMER,   name: "Customer" },
  { id: SQUAD_GAMING,     name: "Gaming" },
  { id: SQUAD_SPECIAL,    name: "Special Projects" },
  { id: SQUAD_PLATFORM,   name: "Platform" },
  { id: SQUAD_NSO,        name: "NSO" },
  { id: SQUAD_STOREFRONT, name: "Storefront" },
  { id: SQUAD_SALES,      name: "Sales" },
  { id: SQUAD_FINSERV,    name: "Financial Service" },
];

export const seedRoles = [
  { id: ROLE_ENG,    name: "Engineer"      },
  { id: ROLE_PM,     name: "Product Manager" },
  { id: ROLE_DESIGN, name: "Designer"      },
];

export const seedPeople = [
  { id: PERSON_AJ,      name: "AJ",      squad: "Storefront", role: "Product Manager", squad_id: SQUAD_STOREFRONT, role_id: ROLE_PM },
  { id: PERSON_MARIAM,  name: "Mariam",  squad: "Platform",   role: "Engineer",        squad_id: SQUAD_PLATFORM,   role_id: ROLE_ENG },
  { id: PERSON_RANIA,   name: "Rania",   squad: "UGC",        role: "Engineer",        squad_id: SQUAD_UGC,        role_id: ROLE_ENG },
  { id: PERSON_KHALID,  name: "Khalid",  squad: "Customer",   role: "Designer",        squad_id: SQUAD_CUSTOMER,   role_id: ROLE_DESIGN },
  { id: PERSON_AYUSH,   name: "Ayush",   squad: "Platform",   role: "Engineer",        squad_id: SQUAD_PLATFORM,   role_id: ROLE_ENG },
  { id: PERSON_IBRAHIM, name: "Ibrahim", squad: "O2D",        role: "Product Manager", squad_id: SQUAD_O2D,        role_id: ROLE_PM },
  { id: PERSON_FATIMA,  name: "Fatima",  squad: "Financial Service", role: "Product Manager", squad_id: SQUAD_FINSERV, role_id: ROLE_PM },
  { id: PERSON_OMAR,    name: "Omar",    squad: "T&S",        role: "Engineer",        squad_id: SQUAD_TS,         role_id: ROLE_ENG },
  { id: PERSON_SARA,    name: "Sara",    squad: "NSO",        role: "Designer",        squad_id: SQUAD_NSO,        role_id: ROLE_DESIGN },
  { id: PERSON_TARIQ,   name: "Tariq",   squad: "Gaming",     role: "Engineer",        squad_id: SQUAD_GAMING,     role_id: ROLE_ENG },
  { id: PERSON_LINA,    name: "Lina",    squad: "AFS",        role: "Engineer",        squad_id: SQUAD_AFS,        role_id: ROLE_ENG },
  { id: PERSON_HASSAN,  name: "Hassan",  squad: "Sales",      role: "Product Manager", squad_id: SQUAD_SALES,      role_id: ROLE_PM },
];

// Project shape mirrors what toSeedProjects() in useSupabaseData returns.
// `owner_id` is essential — PersonProjects ("Owns" section on the People
// deep-dive) filters on it strictly, matching the prod schema.
export const seedProjects = [
  {
    id: "X01", name: "Checkout speedup",
    owner: "AJ", owner_id: PERSON_AJ, squad: "Storefront",
    phase: "Dev", status: "active",
    priority: "P0", complexity: "L",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-03-01", endDate: "2026-06-15",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(3 * HOUR),
  },
  {
    id: "X02", name: "Onboarding redesign",
    owner: "Khalid", owner_id: PERSON_KHALID, squad: "Customer",
    phase: "Design", status: "active",
    priority: "P1", complexity: "M",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: { Design: 28 },
    startDate: "2026-04-12", endDate: "2026-07-30",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(10 * DAY), // frozen — no update in 10d
  },
  {
    id: "X03", name: "Notifications platform",
    owner: "Mariam", owner_id: PERSON_MARIAM, squad: "Platform",
    phase: "QA", status: "active",
    priority: "P1", complexity: "XL",
    isBlocked: true, blockedReason: "Waiting on push notification cert from iOS team", blockedAt: isoAgo(5 * DAY),
    phaseDurationOverrides: null,
    startDate: "2026-02-02", endDate: "2026-05-10",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(20 * DAY),
  },
  {
    id: "X04", name: "Search relevance v3",
    owner: "Ayush", owner_id: PERSON_AYUSH, squad: "Platform",
    phase: "PRD", status: "active",
    priority: "P2", complexity: "S",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-05-01", endDate: "2026-08-10",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(18 * DAY), // sloth — PRD threshold is 14d
  },
  {
    id: "X05", name: "Returns flow",
    owner: "Ibrahim", owner_id: PERSON_IBRAHIM, squad: "O2D",
    phase: "GA", status: "active",
    priority: "P0", complexity: "L",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2025-11-15", endDate: "2026-03-30",
    actualStartDate: "2025-11-20", actualEndDate: "2026-04-02",
    gaEnteredAt: "2026-04-02", depriReason: null,
    gaReleaseNote: "Full self-service returns with auto-refund for eligible items. Supports 12 return reasons with photo upload.",
    gaFeatureType: "New",
    lastActivityAt: isoAgo(11 * DAY),
  },
  {
    id: "X06", name: "Promo engine v2",
    owner: "Rania", owner_id: PERSON_RANIA, squad: "UGC",
    phase: "Dev", status: "deprioritized",
    priority: "P3", complexity: "M",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-02-20", endDate: "2026-06-30",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: "Pushed to Q3 — focus shifted to checkout speed.",
    lastActivityAt: isoAgo(33 * DAY),
  },
  {
    id: "X07", name: "Payment gateway migration",
    owner: "Fatima", owner_id: PERSON_FATIMA, squad: "Financial Service",
    phase: "Dev", status: "active",
    priority: "P0", complexity: "XL",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: { Dev: 42 },
    startDate: "2026-02-01", endDate: "2026-05-15",
    actualStartDate: "2026-02-05", actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(1 * HOUR),
  },
  {
    id: "X08", name: "Warehouse routing optimizer",
    owner: "Hassan", owner_id: PERSON_HASSAN, squad: "Sales",
    phase: "QA", status: "active",
    priority: "P1", complexity: "L",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-03-10", endDate: "2026-06-20",
    actualStartDate: "2026-03-12", actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(4 * HOUR),
  },
  {
    id: "X09", name: "Fraud detection v2",
    owner: "Omar", owner_id: PERSON_OMAR, squad: "T&S",
    phase: "Alpha", status: "active",
    priority: "P1", complexity: "L",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-01-15", endDate: "2026-05-25",
    actualStartDate: "2026-01-20", actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    shipNote: "Testing new ML scoring model with 10% of payment transactions.",
    shipPct: 10,
    lastActivityAt: isoAgo(9 * DAY), // frozen — 9d no update
  },
  {
    id: "X10", name: "Last-mile tracking dashboard",
    owner: "Sara", owner_id: PERSON_SARA, squad: "NSO",
    phase: "Design", status: "active",
    priority: "P2", complexity: "M",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-04-20", endDate: "2026-08-15",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(25 * DAY), // sloth — Design threshold is 21d
  },
  {
    id: "X11", name: "Subscription billing engine",
    owner: "Lina", owner_id: PERSON_LINA, squad: "AFS",
    phase: "PRD", status: "active",
    priority: "P2", complexity: "L",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-05-10", endDate: "2026-09-30",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(12 * HOUR),
  },
  {
    id: "X12", name: "Driver allocation ML",
    owner: "Tariq", owner_id: PERSON_TARIQ, squad: "Gaming",
    phase: "Dev", status: "active",
    priority: "P1", complexity: "XL",
    isBlocked: true, blockedReason: "ML model training pipeline broken — waiting on infra fix", blockedAt: isoAgo(3 * DAY),
    phaseDurationOverrides: null,
    startDate: "2026-03-01", endDate: "2026-05-01",
    actualStartDate: "2026-03-05", actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(3 * DAY),
  },
  {
    id: "X13", name: "Refund automation",
    owner: "Fatima", owner_id: PERSON_FATIMA, squad: "Financial Service",
    phase: "Beta", status: "active",
    priority: "P0", complexity: "M",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2025-12-01", endDate: "2026-05-30",
    actualStartDate: "2025-12-10", actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(5 * HOUR),
  },
  {
    id: "X14", name: "Customer address validation",
    owner: "Hassan", owner_id: PERSON_HASSAN, squad: "Sales",
    phase: "GA", status: "active",
    priority: "P2", complexity: "S",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2025-10-01", endDate: "2026-02-28",
    actualStartDate: "2025-10-05", actualEndDate: "2026-03-10",
    gaEnteredAt: "2026-03-10", depriReason: null,
    gaReleaseNote: "Google Maps autocomplete + UAE-specific address formatting. Reduced delivery failures by 23%.",
    gaFeatureType: "Enhancement",
    lastActivityAt: isoAgo(7 * DAY),
  },
  {
    id: "X15", name: "Vendor portal redesign",
    owner: "Sara", owner_id: PERSON_SARA, squad: "NSO",
    phase: "Design", status: "deprioritized",
    priority: "P3", complexity: "M",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-04-01", endDate: "2026-08-30",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: "Waiting on vendor API contract finalization.",
    lastActivityAt: isoAgo(15 * DAY),
  },
  {
    id: "X16", name: "Dynamic pricing engine",
    owner: "Omar", owner_id: PERSON_OMAR, squad: "T&S",
    phase: "PRD", status: "active",
    priority: "P1", complexity: "XL",
    isBlocked: false, blockedReason: null, blockedAt: null,
    phaseDurationOverrides: null,
    startDate: "2026-05-15", endDate: "2026-10-31",
    actualStartDate: null, actualEndDate: null,
    gaEnteredAt: null, depriReason: null,
    lastActivityAt: isoAgo(2 * HOUR),
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
    // X02 has a conversation
    {
      id: "cmt-3", project_id: "X02", author_id: PERSON_KHALID,
      body: "First-round designs are up. Going to share with @AJ for review tomorrow.",
      created_at: isoAgo(10 * DAY), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-4", project_id: "X03", author_id: PERSON_MARIAM,
      body: "QA found 3 regressions in the notification queue. @AJ can you check the priority on these before standup?",
      created_at: isoAgo(4 * HOUR), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-5", project_id: "X03", author_id: PERSON_RANIA,
      body: "The blocked status is due to a downstream dependency. @AJ we need your sign-off to unblock.",
      created_at: isoAgo(1 * DAY), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-6", project_id: "X04", author_id: PERSON_AYUSH,
      body: "Search latency is down to 120ms after the index rebuild. @AJ ready for your review when you get a chance.",
      created_at: isoAgo(18 * DAY), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-7", project_id: "X02", author_id: PERSON_KHALID,
      body: "Updated the Figma with mobile breakpoints. @AJ take a look at the nav drawer variant.",
      created_at: isoAgo(10 * DAY), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-8", project_id: "X05", author_id: PERSON_IBRAHIM,
      body: "Returns API integration is done. @AJ shipping estimate — should we target this sprint or next?",
      created_at: isoAgo(3 * DAY), edited_at: null, deleted_at: null,
    },
    // X07 — Payment gateway migration
    {
      id: "cmt-9", project_id: "X07", author_id: PERSON_FATIMA,
      body: "Stripe integration passed sandbox testing. Moving to production validation next week.",
      created_at: isoAgo(1 * HOUR), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-10", project_id: "X07", author_id: PERSON_OMAR,
      body: "Found an edge case with multi-currency refunds. @Fatima can we sync tomorrow morning?",
      created_at: isoAgo(3 * HOUR), edited_at: null, deleted_at: null,
    },
    // X08 — Warehouse routing
    {
      id: "cmt-11", project_id: "X08", author_id: PERSON_HASSAN,
      body: "QA results look solid — 98% route accuracy on test dataset. Scheduling load test for Thursday.",
      created_at: isoAgo(4 * HOUR), edited_at: null, deleted_at: null,
    },
    // X09 — Fraud detection
    {
      id: "cmt-12", project_id: "X09", author_id: PERSON_OMAR,
      body: "Alpha rollout to 5% of transactions. False positive rate is at 0.3% — within target. @Lina monitor the dashboard this week.",
      created_at: isoAgo(8 * HOUR), edited_at: null, deleted_at: null,
    },
    // X10 — Last-mile tracking
    {
      id: "cmt-13", project_id: "X10", author_id: PERSON_SARA,
      body: "Wireframes shared in Figma. Need feedback on the real-time map component — performance is a concern on mobile.",
      created_at: isoAgo(25 * DAY), edited_at: null, deleted_at: null,
    },
    // X11 — Subscription billing
    {
      id: "cmt-14", project_id: "X11", author_id: PERSON_LINA,
      body: "PRD draft is ready for review. Key open question: do we support mid-cycle plan upgrades from day one?",
      created_at: isoAgo(12 * HOUR), edited_at: null, deleted_at: null,
    },
    // X12 — Driver allocation
    {
      id: "cmt-15", project_id: "X12", author_id: PERSON_TARIQ,
      body: "Pipeline still down. Infra team says ETA is 2 more days. We're blocked until the training cluster is back.",
      created_at: isoAgo(3 * DAY), edited_at: null, deleted_at: null,
    },
    // X13 — Refund automation
    {
      id: "cmt-16", project_id: "X13", author_id: PERSON_FATIMA,
      body: "Beta cohort processed 1,200 refunds this week with zero manual overrides. Ready for GA discussion.",
      created_at: isoAgo(5 * HOUR), edited_at: null, deleted_at: null,
    },
    {
      id: "cmt-17", project_id: "X13", author_id: PERSON_LINA,
      body: "One merchant flagged a timing issue with partial refunds. Investigating now — doesn't block GA.",
      created_at: isoAgo(2 * HOUR), edited_at: null, deleted_at: null,
    },
    // X14 — Address validation
    {
      id: "cmt-18", project_id: "X14", author_id: PERSON_HASSAN,
      body: "GA metrics looking healthy — 99.2% validation accuracy. Closing the project this sprint.",
      created_at: isoAgo(7 * DAY), edited_at: null, deleted_at: null,
    },
    // X16 — Dynamic pricing
    {
      id: "cmt-19", project_id: "X16", author_id: PERSON_OMAR,
      body: "Initial competitive analysis done. @Fatima let's align on pricing model constraints before the PRD review.",
      created_at: isoAgo(2 * HOUR), edited_at: null, deleted_at: null,
    },
  ],
  members: [
    // X01: owner is AJ; members are Mariam, Ayush, Khalid, Rania
    { id: "mem-1",  project_id: "X01", person_id: PERSON_MARIAM,  added_by: PERSON_AJ,      added_at: isoAgo(10 * DAY) },
    { id: "mem-2",  project_id: "X01", person_id: PERSON_AYUSH,   added_by: PERSON_AJ,      added_at: isoAgo(8 * DAY) },
    { id: "mem-4",  project_id: "X01", person_id: PERSON_KHALID,  added_by: PERSON_AJ,      added_at: isoAgo(6 * DAY) },
    { id: "mem-5",  project_id: "X01", person_id: PERSON_RANIA,   added_by: PERSON_AJ,      added_at: isoAgo(4 * DAY) },
    // X02: owner is Khalid; members are AJ, Mariam, Ibrahim
    { id: "mem-3",  project_id: "X02", person_id: PERSON_AJ,      added_by: PERSON_KHALID,  added_at: isoAgo(15 * DAY) },
    { id: "mem-6",  project_id: "X02", person_id: PERSON_MARIAM,  added_by: PERSON_KHALID,  added_at: isoAgo(12 * DAY) },
    { id: "mem-7",  project_id: "X02", person_id: PERSON_IBRAHIM, added_by: PERSON_KHALID,  added_at: isoAgo(9 * DAY) },
    // X03: owner is Mariam; members are AJ, Khalid, Ayush
    { id: "mem-8",  project_id: "X03", person_id: PERSON_AJ,      added_by: PERSON_MARIAM,  added_at: isoAgo(20 * DAY) },
    { id: "mem-9",  project_id: "X03", person_id: PERSON_KHALID,  added_by: PERSON_MARIAM,  added_at: isoAgo(18 * DAY) },
    { id: "mem-10", project_id: "X03", person_id: PERSON_AYUSH,   added_by: PERSON_MARIAM,  added_at: isoAgo(14 * DAY) },
    // X04: owner is Ayush; members are Mariam, Rania, Ibrahim
    { id: "mem-11", project_id: "X04", person_id: PERSON_MARIAM,  added_by: PERSON_AYUSH,   added_at: isoAgo(22 * DAY) },
    { id: "mem-12", project_id: "X04", person_id: PERSON_RANIA,   added_by: PERSON_AYUSH,   added_at: isoAgo(17 * DAY) },
    { id: "mem-13", project_id: "X04", person_id: PERSON_IBRAHIM, added_by: PERSON_AYUSH,   added_at: isoAgo(13 * DAY) },
    // X05: owner is Ibrahim; members are AJ, Rania, Khalid
    { id: "mem-14", project_id: "X05", person_id: PERSON_AJ,      added_by: PERSON_IBRAHIM, added_at: isoAgo(11 * DAY) },
    { id: "mem-15", project_id: "X05", person_id: PERSON_RANIA,   added_by: PERSON_IBRAHIM, added_at: isoAgo(7 * DAY) },
    { id: "mem-16", project_id: "X05", person_id: PERSON_KHALID,  added_by: PERSON_IBRAHIM, added_at: isoAgo(5 * DAY) },
    // X06: owner is Rania; members are Ayush, Ibrahim, AJ
    { id: "mem-17", project_id: "X06", person_id: PERSON_AYUSH,   added_by: PERSON_RANIA,   added_at: isoAgo(16 * DAY) },
    { id: "mem-18", project_id: "X06", person_id: PERSON_IBRAHIM, added_by: PERSON_RANIA,   added_at: isoAgo(10 * DAY) },
    { id: "mem-19", project_id: "X06", person_id: PERSON_AJ,      added_by: PERSON_RANIA,   added_at: isoAgo(3 * DAY) },
    // X07: owner is Fatima; members are Omar, Lina, AJ
    { id: "mem-20", project_id: "X07", person_id: PERSON_OMAR,    added_by: PERSON_FATIMA,  added_at: isoAgo(90 * DAY) },
    { id: "mem-21", project_id: "X07", person_id: PERSON_LINA,    added_by: PERSON_FATIMA,  added_at: isoAgo(60 * DAY) },
    { id: "mem-22", project_id: "X07", person_id: PERSON_AJ,      added_by: PERSON_FATIMA,  added_at: isoAgo(30 * DAY) },
    // X08: owner is Hassan; members are Tariq, Sara
    { id: "mem-23", project_id: "X08", person_id: PERSON_TARIQ,   added_by: PERSON_HASSAN,  added_at: isoAgo(50 * DAY) },
    { id: "mem-24", project_id: "X08", person_id: PERSON_SARA,    added_by: PERSON_HASSAN,  added_at: isoAgo(40 * DAY) },
    // X09: owner is Omar; members are Fatima, Lina, Mariam
    { id: "mem-25", project_id: "X09", person_id: PERSON_FATIMA,  added_by: PERSON_OMAR,    added_at: isoAgo(80 * DAY) },
    { id: "mem-26", project_id: "X09", person_id: PERSON_LINA,    added_by: PERSON_OMAR,    added_at: isoAgo(60 * DAY) },
    { id: "mem-27", project_id: "X09", person_id: PERSON_MARIAM,  added_by: PERSON_OMAR,    added_at: isoAgo(30 * DAY) },
    // X10: owner is Sara; members are Hassan, Tariq
    { id: "mem-28", project_id: "X10", person_id: PERSON_HASSAN,  added_by: PERSON_SARA,    added_at: isoAgo(20 * DAY) },
    { id: "mem-29", project_id: "X10", person_id: PERSON_TARIQ,   added_by: PERSON_SARA,    added_at: isoAgo(15 * DAY) },
    // X11: owner is Lina; members are Fatima, Omar
    { id: "mem-30", project_id: "X11", person_id: PERSON_FATIMA,  added_by: PERSON_LINA,    added_at: isoAgo(8 * DAY) },
    { id: "mem-31", project_id: "X11", person_id: PERSON_OMAR,    added_by: PERSON_LINA,    added_at: isoAgo(5 * DAY) },
    // X12: owner is Tariq; members are Hassan, Sara, AJ
    { id: "mem-32", project_id: "X12", person_id: PERSON_HASSAN,  added_by: PERSON_TARIQ,   added_at: isoAgo(45 * DAY) },
    { id: "mem-33", project_id: "X12", person_id: PERSON_SARA,    added_by: PERSON_TARIQ,   added_at: isoAgo(30 * DAY) },
    { id: "mem-34", project_id: "X12", person_id: PERSON_AJ,      added_by: PERSON_TARIQ,   added_at: isoAgo(20 * DAY) },
    // X13: owner is Fatima; members are Lina, Omar, Khalid
    { id: "mem-35", project_id: "X13", person_id: PERSON_LINA,    added_by: PERSON_FATIMA,  added_at: isoAgo(100 * DAY) },
    { id: "mem-36", project_id: "X13", person_id: PERSON_OMAR,    added_by: PERSON_FATIMA,  added_at: isoAgo(70 * DAY) },
    { id: "mem-37", project_id: "X13", person_id: PERSON_KHALID,  added_by: PERSON_FATIMA,  added_at: isoAgo(40 * DAY) },
    // X14: owner is Hassan; members are Tariq, Sara
    { id: "mem-38", project_id: "X14", person_id: PERSON_TARIQ,   added_by: PERSON_HASSAN,  added_at: isoAgo(120 * DAY) },
    { id: "mem-39", project_id: "X14", person_id: PERSON_SARA,    added_by: PERSON_HASSAN,  added_at: isoAgo(90 * DAY) },
    // X15: owner is Sara; members are Hassan
    { id: "mem-40", project_id: "X15", person_id: PERSON_HASSAN,  added_by: PERSON_SARA,    added_at: isoAgo(25 * DAY) },
    // X16: owner is Omar; members are Fatima, Lina
    { id: "mem-41", project_id: "X16", person_id: PERSON_FATIMA,  added_by: PERSON_OMAR,    added_at: isoAgo(4 * DAY) },
    { id: "mem-42", project_id: "X16", person_id: PERSON_LINA,    added_by: PERSON_OMAR,    added_at: isoAgo(2 * DAY) },
  ],
  links: [
    { id: "link-1", project_id: "X01", type: "prd", label: null, url: "https://docs.google.com/document/d/checkout-speedup-prd", created_at: isoAgo(30 * DAY) },
    { id: "link-2", project_id: "X01", type: "figma", label: null, url: "https://figma.com/file/checkout-speedup", created_at: isoAgo(25 * DAY) },
    { id: "link-3", project_id: "X02", type: "figma", label: null, url: "https://figma.com/file/onboarding-redesign", created_at: isoAgo(10 * DAY) },
    { id: "link-4", project_id: "X01", type: "custom", label: "Tech Doc", url: "https://docs.google.com/document/d/checkout-tech-spec", created_at: isoAgo(20 * DAY) },
    { id: "link-5", project_id: "X07", type: "prd", label: null, url: "https://docs.google.com/document/d/payment-gateway-prd", created_at: isoAgo(100 * DAY) },
    { id: "link-6", project_id: "X07", type: "jira", label: null, url: "https://jira.noon.com/board/PAY-GATEWAY", created_at: isoAgo(90 * DAY) },
    { id: "link-7", project_id: "X08", type: "prd", label: null, url: "https://docs.google.com/document/d/warehouse-routing", created_at: isoAgo(60 * DAY) },
    { id: "link-8", project_id: "X10", type: "figma", label: null, url: "https://figma.com/file/last-mile-tracking", created_at: isoAgo(15 * DAY) },
    { id: "link-9", project_id: "X13", type: "prd", label: null, url: "https://docs.google.com/document/d/refund-automation", created_at: isoAgo(150 * DAY) },
    { id: "link-10", project_id: "X13", type: "qa_testcases", label: null, url: "https://docs.google.com/spreadsheets/d/refund-qa", created_at: isoAgo(40 * DAY) },
    { id: "link-11", project_id: "X12", type: "gchat", label: null, url: "https://chat.google.com/room/driver-allocation", created_at: isoAgo(50 * DAY) },
    { id: "link-12", project_id: "X16", type: "prd", label: null, url: "https://docs.google.com/document/d/dynamic-pricing-prd", created_at: isoAgo(3 * DAY) },
  ],
  events: [
    // ── X01 — Checkout speedup (start 80d ago, currently Dev) ──
    { id: "ev-01", entity_type: "project", entity_id: "X01", action: "project_created", user_name: "AJ", user_email: "ajain@noon.com", details: {}, created_at: isoAgo(80 * DAY) },
    { id: "ev-02", entity_type: "project", entity_id: "X01", action: "member_added", user_name: "AJ", user_email: "ajain@noon.com", details: { person_name: "Mariam" }, created_at: isoAgo(10 * DAY) },
    { id: "ev-03", entity_type: "project", entity_id: "X01", action: "project_phase_changed", user_name: "AJ", user_email: "ajain@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(56 * DAY) },
    { id: "ev-04", entity_type: "project", entity_id: "X01", action: "project_phase_changed", user_name: "AJ", user_email: "ajain@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(8 * DAY) },

    // ── X02 — Onboarding redesign (start 38d ago, currently Design) ──
    { id: "ev-05", entity_type: "project", entity_id: "X02", action: "project_created", user_name: "Khalid", user_email: "khalid@noon.com", details: {}, created_at: isoAgo(38 * DAY) },
    { id: "ev-06", entity_type: "project", entity_id: "X02", action: "project_phase_changed", user_name: "Khalid", user_email: "khalid@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(10 * DAY) },

    // ── X03 — Notifications platform (start 107d ago, currently QA, blocked, OVERDUE) ──
    { id: "ev-07", entity_type: "project", entity_id: "X03", action: "project_created", user_name: "Mariam", user_email: "mariam@noon.com", details: {}, created_at: isoAgo(107 * DAY) },
    { id: "ev-08", entity_type: "project", entity_id: "X03", action: "project_phase_changed", user_name: "Mariam", user_email: "mariam@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(92 * DAY) },
    { id: "ev-09", entity_type: "project", entity_id: "X03", action: "project_phase_changed", user_name: "Mariam", user_email: "mariam@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(72 * DAY) },
    { id: "ev-10", entity_type: "project", entity_id: "X03", action: "project_phase_changed", user_name: "Mariam", user_email: "mariam@noon.com", details: { from: "Dev", to: "QA" }, created_at: isoAgo(16 * DAY) },
    { id: "ev-11", entity_type: "project", entity_id: "X03", action: "project_status_changed", user_name: "Mariam", user_email: "mariam@noon.com", details: { from: "active", to: "active" }, created_at: isoAgo(20 * DAY) },

    // ── X04 — Search relevance v3 (start 19d ago, currently PRD) ──
    { id: "ev-12", entity_type: "project", entity_id: "X04", action: "project_created", user_name: "Ayush", user_email: "ayush@noon.com", details: {}, created_at: isoAgo(19 * DAY) },

    // ── X05 — Returns flow (start 186d ago, shipped GA) ──
    { id: "ev-13", entity_type: "project", entity_id: "X05", action: "project_created", user_name: "Ibrahim", user_email: "ibrahim@noon.com", details: {}, created_at: isoAgo(186 * DAY) },
    { id: "ev-14", entity_type: "project", entity_id: "X05", action: "project_phase_changed", user_name: "Ibrahim", user_email: "ibrahim@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(166 * DAY) },
    { id: "ev-15", entity_type: "project", entity_id: "X05", action: "project_phase_changed", user_name: "Ibrahim", user_email: "ibrahim@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(130 * DAY) },
    { id: "ev-16", entity_type: "project", entity_id: "X05", action: "project_phase_changed", user_name: "Ibrahim", user_email: "ibrahim@noon.com", details: { from: "Dev", to: "QA" }, created_at: isoAgo(89 * DAY) },
    { id: "ev-17", entity_type: "project", entity_id: "X05", action: "project_phase_changed", user_name: "Ibrahim", user_email: "ibrahim@noon.com", details: { from: "QA", to: "Alpha" }, created_at: isoAgo(71 * DAY) },
    { id: "ev-18", entity_type: "project", entity_id: "X05", action: "project_phase_changed", user_name: "Ibrahim", user_email: "ibrahim@noon.com", details: { from: "Alpha", to: "Beta" }, created_at: isoAgo(61 * DAY) },
    { id: "ev-19", entity_type: "project", entity_id: "X05", action: "project_phase_changed", user_name: "Ibrahim", user_email: "ibrahim@noon.com", details: { from: "Beta", to: "GA" }, created_at: isoAgo(48 * DAY) },

    // ── X06 — Promo engine v2 (start 89d ago, currently Dev, deprioritized) ──
    { id: "ev-20", entity_type: "project", entity_id: "X06", action: "project_created", user_name: "Rania", user_email: "rania@noon.com", details: {}, created_at: isoAgo(89 * DAY) },
    { id: "ev-21", entity_type: "project", entity_id: "X06", action: "project_phase_changed", user_name: "Rania", user_email: "rania@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(71 * DAY) },
    { id: "ev-22", entity_type: "project", entity_id: "X06", action: "project_phase_changed", user_name: "Rania", user_email: "rania@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(51 * DAY) },

    // ── X07 — Payment gateway migration (start 108d ago, currently Dev, OVERDUE) ──
    { id: "ev-23", entity_type: "project", entity_id: "X07", action: "project_created", user_name: "Fatima", user_email: "fatima@noon.com", details: {}, created_at: isoAgo(108 * DAY) },
    { id: "ev-24", entity_type: "project", entity_id: "X07", action: "project_phase_changed", user_name: "Fatima", user_email: "fatima@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(80 * DAY) },
    { id: "ev-25", entity_type: "project", entity_id: "X07", action: "project_phase_changed", user_name: "Omar", user_email: "omar@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(45 * DAY) },

    // ── X08 — Warehouse routing optimizer (start 71d ago, currently QA) ──
    { id: "ev-26", entity_type: "project", entity_id: "X08", action: "project_created", user_name: "Hassan", user_email: "hassan@noon.com", details: {}, created_at: isoAgo(71 * DAY) },
    { id: "ev-27", entity_type: "project", entity_id: "X08", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(56 * DAY) },
    { id: "ev-28", entity_type: "project", entity_id: "X08", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(36 * DAY) },
    { id: "ev-29", entity_type: "project", entity_id: "X08", action: "project_phase_changed", user_name: "Tariq", user_email: "tariq@noon.com", details: { from: "Dev", to: "QA" }, created_at: isoAgo(11 * DAY) },

    // ── X09 — Fraud detection v2 (start 125d ago, currently Alpha) ──
    { id: "ev-30", entity_type: "project", entity_id: "X09", action: "project_created", user_name: "Omar", user_email: "omar@noon.com", details: {}, created_at: isoAgo(125 * DAY) },
    { id: "ev-31", entity_type: "project", entity_id: "X09", action: "project_phase_changed", user_name: "Omar", user_email: "omar@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(108 * DAY) },
    { id: "ev-32", entity_type: "project", entity_id: "X09", action: "project_phase_changed", user_name: "Omar", user_email: "omar@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(84 * DAY) },
    { id: "ev-33", entity_type: "project", entity_id: "X09", action: "project_phase_changed", user_name: "Omar", user_email: "omar@noon.com", details: { from: "Dev", to: "QA" }, created_at: isoAgo(40 * DAY) },
    { id: "ev-34", entity_type: "project", entity_id: "X09", action: "project_phase_changed", user_name: "Omar", user_email: "omar@noon.com", details: { from: "QA", to: "Alpha" }, created_at: isoAgo(19 * DAY) },

    // ── X10 — Last-mile tracking dashboard (start 30d ago, currently Design) ──
    { id: "ev-35", entity_type: "project", entity_id: "X10", action: "project_created", user_name: "Sara", user_email: "sara@noon.com", details: {}, created_at: isoAgo(30 * DAY) },
    { id: "ev-36", entity_type: "project", entity_id: "X10", action: "project_phase_changed", user_name: "Sara", user_email: "sara@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(25 * DAY) },

    // ── X11 — Subscription billing engine (start 10d ago, currently PRD) ──
    { id: "ev-37", entity_type: "project", entity_id: "X11", action: "project_created", user_name: "Lina", user_email: "lina@noon.com", details: {}, created_at: isoAgo(10 * DAY) },

    // ── X12 — Driver allocation ML (start 80d ago, currently Dev, blocked, OVERDUE) ──
    { id: "ev-38", entity_type: "project", entity_id: "X12", action: "project_created", user_name: "Tariq", user_email: "tariq@noon.com", details: {}, created_at: isoAgo(80 * DAY) },
    { id: "ev-39", entity_type: "project", entity_id: "X12", action: "project_phase_changed", user_name: "Tariq", user_email: "tariq@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(61 * DAY) },
    { id: "ev-40", entity_type: "project", entity_id: "X12", action: "project_phase_changed", user_name: "Tariq", user_email: "tariq@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(30 * DAY) },
    { id: "ev-41", entity_type: "project", entity_id: "X12", action: "project_blocked", user_name: "Tariq", user_email: "tariq@noon.com", details: { reason: "ML model training pipeline broken" }, created_at: isoAgo(3 * DAY) },

    // ── X13 — Refund automation (start 170d ago, currently Beta) ──
    { id: "ev-42", entity_type: "project", entity_id: "X13", action: "project_created", user_name: "Fatima", user_email: "fatima@noon.com", details: {}, created_at: isoAgo(170 * DAY) },
    { id: "ev-43", entity_type: "project", entity_id: "X13", action: "project_phase_changed", user_name: "Fatima", user_email: "fatima@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(151 * DAY) },
    { id: "ev-44", entity_type: "project", entity_id: "X13", action: "project_phase_changed", user_name: "Fatima", user_email: "fatima@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(120 * DAY) },
    { id: "ev-45", entity_type: "project", entity_id: "X13", action: "project_phase_changed", user_name: "Fatima", user_email: "fatima@noon.com", details: { from: "Dev", to: "QA" }, created_at: isoAgo(66 * DAY) },
    { id: "ev-46", entity_type: "project", entity_id: "X13", action: "project_phase_changed", user_name: "Fatima", user_email: "fatima@noon.com", details: { from: "QA", to: "Alpha" }, created_at: isoAgo(35 * DAY) },
    { id: "ev-47", entity_type: "project", entity_id: "X13", action: "project_phase_changed", user_name: "Lina", user_email: "lina@noon.com", details: { from: "Alpha", to: "Beta" }, created_at: isoAgo(20 * DAY) },

    // ── X14 — Customer address validation (start 231d ago, shipped GA) ──
    { id: "ev-48", entity_type: "project", entity_id: "X14", action: "project_created", user_name: "Hassan", user_email: "hassan@noon.com", details: {}, created_at: isoAgo(231 * DAY) },
    { id: "ev-49", entity_type: "project", entity_id: "X14", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(217 * DAY) },
    { id: "ev-50", entity_type: "project", entity_id: "X14", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "Design", to: "Dev" }, created_at: isoAgo(196 * DAY) },
    { id: "ev-51", entity_type: "project", entity_id: "X14", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "Dev", to: "QA" }, created_at: isoAgo(161 * DAY) },
    { id: "ev-52", entity_type: "project", entity_id: "X14", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "QA", to: "Alpha" }, created_at: isoAgo(140 * DAY) },
    { id: "ev-53", entity_type: "project", entity_id: "X14", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "Alpha", to: "Beta" }, created_at: isoAgo(119 * DAY) },
    { id: "ev-54", entity_type: "project", entity_id: "X14", action: "project_phase_changed", user_name: "Hassan", user_email: "hassan@noon.com", details: { from: "Beta", to: "GA" }, created_at: isoAgo(71 * DAY) },

    // ── X15 — Vendor portal redesign (start 49d ago, currently Design, deprioritized) ──
    { id: "ev-55", entity_type: "project", entity_id: "X15", action: "project_created", user_name: "Sara", user_email: "sara@noon.com", details: {}, created_at: isoAgo(49 * DAY) },
    { id: "ev-56", entity_type: "project", entity_id: "X15", action: "project_phase_changed", user_name: "Sara", user_email: "sara@noon.com", details: { from: "PRD", to: "Design" }, created_at: isoAgo(30 * DAY) },
    { id: "ev-57", entity_type: "project", entity_id: "X15", action: "project_status_changed", user_name: "Sara", user_email: "sara@noon.com", details: { from: "active", to: "deprioritized" }, created_at: isoAgo(15 * DAY) },

    // ── X16 — Dynamic pricing engine (start 5d ago, currently PRD) ──
    { id: "ev-58", entity_type: "project", entity_id: "X16", action: "project_created", user_name: "Omar", user_email: "omar@noon.com", details: {}, created_at: isoAgo(5 * DAY) },

    // ── Shoutouts & Feedback for shipped GA projects ──
    { id: "ev-59", entity_type: "project", entity_id: "X05", action: "shoutout", user_name: "AJ", user_email: "ajain@noon.com", details: { from: "AJ", projectName: "Returns flow optimization" }, created_at: isoAgo(45 * DAY) },
    { id: "ev-60", entity_type: "project", entity_id: "X05", action: "shoutout", user_name: "Khalid", user_email: "khalid@noon.com", details: { from: "Khalid", projectName: "Returns flow optimization" }, created_at: isoAgo(40 * DAY) },
    { id: "ev-61", entity_type: "project", entity_id: "X05", action: "feedback", user_name: "Mariam", user_email: "mariam@noon.com", details: { from: "Mariam", projectName: "Returns flow optimization", comment: "Great improvement on the return processing speed. Customer complaints dropped significantly." }, created_at: isoAgo(43 * DAY) },
    { id: "ev-62", entity_type: "project", entity_id: "X14", action: "shoutout", user_name: "Sara", user_email: "sara@noon.com", details: { from: "Sara", projectName: "Customer address validation" }, created_at: isoAgo(65 * DAY) },
    { id: "ev-63", entity_type: "project", entity_id: "X14", action: "feedback", user_name: "Omar", user_email: "omar@noon.com", details: { from: "Omar", projectName: "Customer address validation", comment: "Address validation is catching edge cases well. Delivery failures in KSA are down 30%." }, created_at: isoAgo(60 * DAY) },
    { id: "ev-64", entity_type: "project", entity_id: "X14", action: "shoutout", user_name: "Fatima", user_email: "fatima@noon.com", details: { from: "Fatima", projectName: "Customer address validation" }, created_at: isoAgo(55 * DAY) },
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

// ── Persistence layer: localStorage + cross-tab sync ──────────────
const STORAGE_KEY_STATE = "flow_devstore_state";
const STORAGE_KEY_PROJECTS = "flow_devstore_projects";

function _persistState() {
  try { localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(_state)); } catch { /* quota */ }
}
function _persistProjects() {
  try { localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(seedProjects)); } catch { /* quota */ }
}

// Hydrate _state from localStorage if available
(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.comments) _state.comments = parsed.comments;
      if (parsed.members) _state.members = parsed.members;
      if (parsed.events) _state.events = parsed.events;
      if (parsed.links) _state.links = parsed.links;
    }
  } catch { /* corrupt data, use seed defaults */ }
})();

// Hydrate seedProjects from localStorage if available
(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        seedProjects.length = 0;
        parsed.forEach(p => seedProjects.push(p));
      }
    }
  } catch { /* corrupt data, use seed defaults */ }
})();

const _subs = new Set();
function notify(change) {
  _subs.forEach(fn => { try { fn(change); } catch { /* ignore */ } });
}

// Cross-tab sync: reload state when another tab writes to localStorage
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY_STATE && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed.comments) _state.comments = parsed.comments;
        if (parsed.members) _state.members = parsed.members;
        if (parsed.events) _state.events = parsed.events;
        if (parsed.links) _state.links = parsed.links;
        notify({ type: "cross-tab-sync" });
      } catch { /* ignore */ }
    }
    if (e.key === STORAGE_KEY_PROJECTS && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          seedProjects.length = 0;
          parsed.forEach(p => seedProjects.push(p));
          notify({ type: "cross-tab-projects" });
        }
      } catch { /* ignore */ }
    }
  });
}

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

  listLinks(projectId) {
    return _state.links.filter(l => l.project_id === projectId).slice();
  },
  listAllLinks() {
    return _state.links.slice();
  },
  listAllEvents() {
    return _state.events.slice();
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
    _persistState();
    notify({ type: "comments", projectId, change: { op: "insert", row } });
    return row;
  },
  editComment(commentId, body) {
    const c = _state.comments.find(x => x.id === commentId);
    if (!c) return null;
    c.body = body.trim();
    c.edited_at = new Date().toISOString();
    _persistState();
    notify({ type: "comments", projectId: c.project_id, change: { op: "update", row: c } });
    return c;
  },
  softDeleteComment(commentId) {
    const c = _state.comments.find(x => x.id === commentId);
    if (!c) return null;
    c.deleted_at = new Date().toISOString();
    _persistState();
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
    _persistState();
    notify({ type: "members", projectId, change: { op: "insert", row } });
    return row;
  },
  removeMember(projectId, personId) {
    const idx = _state.members.findIndex(m => m.project_id === projectId && m.person_id === personId);
    if (idx === -1) return null;
    const [row] = _state.members.splice(idx, 1);
    _persistState();
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
    _persistState();
    notify({ type: "events", projectId, change: { op: "insert", row } });
    return row;
  },

  // ── LINKS ────────────────────────────────────────────────────
  _addLink(row) {
    _state.links.push(row);
    _persistState();
    notify({ type: "links", projectId: row.project_id, change: { op: "insert", row } });
    return row;
  },
  _removeLink(linkId) {
    const idx = _state.links.findIndex(l => l.id === linkId);
    if (idx === -1) return null;
    const [row] = _state.links.splice(idx, 1);
    _persistState();
    notify({ type: "links", projectId: row.project_id, change: { op: "delete", row } });
    return row;
  },

  // ── PEOPLE ───────────────────────────────────────────────────
  addPerson({ name, squad, role }) {
    const id = `person-${Math.random().toString(36).slice(2, 9)}`;
    const squadObj = seedSquads.find(s => s.name === squad);
    const roleObj = seedRoles.find(r => r.name === role);
    const row = {
      id, name: name.trim(), squad: squad || null, role: role || null,
      squad_id: squadObj?.id || null, role_id: roleObj?.id || null,
    };
    seedPeople.push(row);
    notify({ type: "people", change: { op: "insert", row } });
    return row;
  },

  // ── Project persistence ──────────────────────────────────────
  persistProjects(projectsArray) {
    seedProjects.length = 0;
    projectsArray.forEach(p => seedProjects.push(p));
    _persistProjects();
  },

  // ── Realtime-ish subscription ────────────────────────────────
  subscribe(fn) { _subs.add(fn); return () => _subs.delete(fn); },
};

// Persist initial seed state so it survives reload even before any mutations
if (typeof window !== "undefined" && isDevSeedMode()) {
  if (!localStorage.getItem(STORAGE_KEY_STATE)) _persistState();
  if (!localStorage.getItem(STORAGE_KEY_PROJECTS)) _persistProjects();
}

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
