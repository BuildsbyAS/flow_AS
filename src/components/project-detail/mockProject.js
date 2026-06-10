// Mock data for the Vendor portal redesign project.

export const mockProject = {
  id: 'X15',
  code: 'X15',
  name: 'Vendor portal redesign',
  updatedAt: '3h ago',
  createdAt: new Date(2026, 4, 12), // May 12, 2026
  dueDate: new Date(2026, 5, 23), // Jun 23, 2026
  statusKey: 'inflight',
  squads: ['Customer'],
  complexity: 'medium',
  tags: ['enhancement'],
  bookmarked: false,
};

export const availableComplexity = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];

// Extra tags a project can carry (max 3). Tone mirrors the status pill style.
export const availableTags = [
  { key: 'enhancement', label: 'Enhancement' },
  { key: 'bug', label: 'Bug' },
  { key: 'feature', label: 'Feature' },
  { key: 'research', label: 'Research' },
  { key: 'techdebt', label: 'Tech debt' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'experiment', label: 'Experiment' },
  { key: 'revenue', label: 'Revenue' },
];

export const tagTone = {
  enhancement: { bg: '#F5FAFF', fg: '#0F7EFF' },
  bug: { bg: '#FBE7E7', fg: '#B91C1C' },
  feature: { bg: '#E6FBF1', fg: '#007A4A' },
  research: { bg: '#F3F0FF', fg: '#6D28D9' },
  techdebt: { bg: '#FFF7E0', fg: '#B45309' },
  compliance: { bg: '#E0F7FA', fg: '#0E7490' },
  experiment: { bg: '#FCE7F3', fg: '#DB2777' },
  revenue: { bg: '#ECFDF5', fg: '#047857' },
};

export const availableStatuses = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'inflight', label: 'In flight' },
  { key: 'review', label: 'In review' },
  { key: 'live', label: 'Live' },
  { key: 'paused', label: 'Paused' },
  { key: 'done', label: 'Done' },
  { key: 'cancelled', label: 'Cancelled' },
];

// Visual tone (bg + fg) per status key — kept here so renderers stay dumb.
export const statusTone = {
  discovery: { bg: '#F3F0FF', fg: '#6D28D9' },
  inflight: { bg: '#F5FAFF', fg: '#0F7EFF' },
  review: { bg: '#FFF7E0', fg: '#B45309' },
  live: { bg: '#E6FBF1', fg: '#007A4A' },
  paused: { bg: '#FEF3C7', fg: '#92400E' },
  done: { bg: '#F1F5F9', fg: '#475569' },
  cancelled: { bg: '#FBE7E7', fg: '#B91C1C' },
};

export const availableSquads = [
  'Customer',
  'Vendor',
  'Internal',
  'Platform',
  'Growth',
  'Marketing',
  'Operations',
  'Finance',
];

export const mockTeam = [
  { id: 'u1', name: 'Saumya Garg', roles: ['Owner', 'SPM'], email: 'saumya@flow.app' },
  { id: 'u2', name: 'Anurag Shastri', roles: ['Motion Designer'], email: 'anurag@flow.app' },
  { id: 'u3', name: 'Faraz Khan', roles: ['Engineering manager'], email: 'faraz@flow.app' },
  { id: 'u4', name: 'Riya Kapoor', roles: ['Product Designer'], email: 'riya@flow.app' },
  { id: 'u5', name: 'Vikram Sethi', roles: ['Frontend lead'], email: 'vikram@flow.app' },
];

// Org-wide members the user can add — kept separate so the picker can suggest
// people not already on the project.
export const mockAvailableMembers = [
  { id: 'p1', name: 'Diya Ramesh', roles: ['UX Researcher'], email: 'diya@flow.app' },
  { id: 'p2', name: 'Karan Mehta', roles: ['Data Analyst'], email: 'karan@flow.app' },
  { id: 'p3', name: 'Maya Iyer', roles: ['QA Engineer'], email: 'maya@flow.app' },
  { id: 'p4', name: 'Suresh Altman', roles: ['Staff Engineer'], email: 'suresh@flow.app' },
  { id: 'p5', name: 'Blake Cooper', roles: ['Brand Designer'], email: 'blake@flow.app' },
  { id: 'p6', name: 'Sami Koushik', roles: ['Backend lead'], email: 'sami@flow.app' },
  { id: 'p7', name: 'Aanya Joshi', roles: ['Content Strategist'], email: 'aanya@flow.app' },
  { id: 'p8', name: 'Rohan Patel', roles: ['Mobile Engineer'], email: 'rohan@flow.app' },
];

export const mockResources = [
  { id: 'r1', type: 'figma', title: 'Portal flows v3', href: '#' },
  { id: 'r2', type: 'category-cool', title: 'Data XML', href: '#' },
  { id: 'r3', type: 'category-warm', title: 'Faraz V3 deck', href: '#' },
  { id: 'r4', type: 'category-cool', title: 'PRD draft', href: '#' },
  { id: 'r5', type: 'category-warm', title: 'Q3 OKR doc', href: '#' },
];

// Phase order is the visual row order in the Gantt and the left-to-right
// order of the phase chip strip. PRD first → Beta last; QA sits between Dev
// and Alpha to match Figma 583:12380.
export const PHASE_ORDER = ['prd', 'design', 'dev', 'qa', 'alpha', 'beta'];
export const PHASE_LABELS = {
  prd: 'PRD',
  design: 'Design',
  dev: 'Dev',
  qa: 'QA',
  alpha: 'Alpha',
  beta: 'Beta',
};

// ── Track-timeline node model (Figma 850:14954, v2) ───────────────────────
// Each node is a date-range "run" inside a phase lane. Dates are ISO strings
// (inclusive start, exclusive end). `plannedEnd` freezes when a node is marked
// done so the timeline can show an early/late ghost. `state` drives the
// solid/dashed split-at-today rendering; `upd` is the latest change stamp.
//
// Seeded so today (≈ 10 Jun 2026) lands inside the Design run → it renders as a
// solid "elapsed" head + dashed "remaining" tail. Window derives to Jun–Sep.
// `running: true` = an open-ended phase that keeps ticking to "today" until the
// user completes, changes, or pauses it (the start/stop model). A paused phase
// has state 'paused' and a frozen end.
export const mockNodes = [
  { id: 'prd-1', lane: 'prd', start: '2026-06-01', end: '2026-06-05', plannedEnd: '2026-06-05', state: 'done', upd: { who: 'Saumya Garg', label: 'Marked done', at: '5d ago' } },
  { id: 'prd-2', lane: 'prd', start: '2026-06-06', end: '2026-06-09', plannedEnd: '2026-06-08', state: 'done', upd: { who: 'Saumya Garg', label: 'Marked done', at: '1d ago' } },
  { id: 'des-1', lane: 'design', start: '2026-06-08', end: '2026-06-08', plannedEnd: '2026-06-08', state: 'inprogress', running: true, upd: { who: 'Faraz Khan', label: 'Started', at: '3d ago' } },
  { id: 'des-2', lane: 'design', start: '2026-08-08', end: '2026-09-04', plannedEnd: '2026-09-04', state: 'planned', upd: null },
  { id: 'dev-1', lane: 'dev', start: '2026-06-24', end: '2026-08-09', plannedEnd: '2026-08-09', state: 'planned', upd: null },
  { id: 'qa-1', lane: 'qa', start: '2026-09-02', end: '2026-09-26', plannedEnd: '2026-09-26', state: 'planned', upd: null },
];

// Project-level state — separate from individual node state. A blocked/parked
// project recolours every node but never mutates node records.
export const mockProjectState = { status: 'active', blockPhase: null, blockReason: null };

// Set when Beta is marked done (or the project is explicitly shipped). Null = projected.
export const mockShipDate = null;

// Activity feed v2 (Figma 624:16078) — posts with progress cards + reactions.
export const mockActivityPosts = [
  {
    id: 'a-sara',
    author: 'Sara',
    initials: 'SA',
    type: 'update',
    time: '4:54 pm',
    content:
      'On track for Design review. Pushing dev in parallel to claw back the design slip — vendor contract is the one thing that can still derail the back half.',
    reactions: { heart: 0, heartLiked: false, thumbs: 0, thumbsLiked: false, emojis: [] },
  },
  {
    id: 'a-hassan',
    author: 'Hassan',
    initials: 'HA',
    type: 'update',
    time: '12:03 pm',
    content:
      'On track for Design review. Pushing dev in parallel to claw back the design slip — vendor contract is the one thing that can still derail the back half.',
    progress: [
      { label: 'Progress', from: '38%', to: '51%' },
      { label: 'Design', from: '30%', to: '60%' },
      { label: 'Priority', from: 'P1', to: 'P0' },
    ],
    reactions: { heart: 12, heartLiked: false, thumbs: 5, thumbsLiked: true, emojis: [] },
  },
  {
    id: 'a-ayush',
    author: 'Ayush',
    initials: 'AY',
    type: 'comment',
    time: '4:55 pm, May 2, 2026',
    content: 'API spike saved us a week — unblocked the whole dev track 👌🏻',
    reactions: { heart: 12, heartLiked: false, thumbs: 5, thumbsLiked: true, emojis: [] },
  },
  {
    id: 'a-ibrahim',
    author: 'Ibrahim',
    initials: 'IM',
    type: 'comment',
    time: '4:23 am, May 4, 2026',
    content: null,
    reactions: { heart: 0, heartLiked: false, thumbs: 0, thumbsLiked: false, emojis: [] },
  },
];

// Legacy activity items (unused now that v2 is in place — kept for compat)
export const mockActivity = [
  {
    id: 'a1',
    kind: 'event',
    actor: 'Saumya Garg',
    action: 'moved this to',
    target: 'QA',
    targetTone: 'qa',
    timestamp: '2h ago',
  },
  {
    id: 'a2',
    kind: 'comment',
    actor: 'Faraz Khan',
    text: 'Quick heads-up — vendor onboarding step 3 is dropping focus when the OTP modal closes. I’m repro-ing on staging now.',
    timestamp: '4h ago',
    reactions: [
      { emoji: '👀', count: 3, byMe: true },
      { emoji: '🔥', count: 1, byMe: false },
    ],
    likes: 5,
    likedByMe: false,
    replies: [
      {
        id: 'a2-r1',
        actor: 'Riya Kapoor',
        text: 'Same — happens in Safari only. Filed a ticket already.',
        timestamp: '3h ago',
        likes: 2,
        likedByMe: true,
      },
      {
        id: 'a2-r2',
        actor: 'Anurag Shastri',
        text: 'Let me know if you want me to look at the close transition — might be the issue.',
        timestamp: '1h ago',
        likes: 1,
        likedByMe: false,
      },
    ],
  },
  {
    id: 'a3',
    kind: 'event',
    actor: 'Riya Kapoor',
    action: 'added',
    target: 'Portal flows v3',
    targetTone: 'resource',
    timestamp: '6h ago',
  },
  {
    id: 'a4',
    kind: 'comment',
    actor: 'Saumya Garg',
    text: 'Looking at the latest design — really like the new empty state for the vendor list. Can we extend that pattern to the document review flow?',
    timestamp: 'Yesterday',
    reactions: [{ emoji: '🎯', count: 4, byMe: false }, { emoji: '✨', count: 2, byMe: true }],
    likes: 12,
    likedByMe: true,
    replies: [],
  },
  {
    id: 'a5',
    kind: 'event',
    actor: 'Faraz Khan',
    action: 'joined as',
    target: 'Engineering manager',
    targetTone: 'team',
    timestamp: '2d ago',
  },
];

export const emojiSet = ['👀', '🔥', '🎯', '✨', '👏', '🙌', '🚀', '💡'];
