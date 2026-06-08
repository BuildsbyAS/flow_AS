// Mock data for the Vendor portal redesign project.

export const mockProject = {
  id: 'X15',
  code: 'X15',
  name: 'Vendor portal redesign',
  updatedAt: '3h ago',
  createdAt: new Date(2026, 4, 12), // May 12, 2026
  dueDate: new Date(2026, 5, 23), // Jun 23, 2026
  statusKey: 'inflight',
  squad: 'Customer',
  bookmarked: false,
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

export const mockPhases = [
  { key: 'prd', label: 'PRD', active: false, status: null },
  { key: 'design', label: 'Design', active: true, status: { kind: 'live', text: 'Live for 12d' } },
  { key: 'dev', label: 'Dev', active: true, status: { kind: 'live', text: 'Live for 4d' } },
  { key: 'qa', label: 'QA', active: true, status: { kind: 'reopened', text: 'Re-opened 2d ago' } },
  { key: 'alpha', label: 'Alpha', active: false, status: null },
  { key: 'beta', label: 'Beta', active: false, status: null },
];

// Bars positioned in week units. Total span ≈ 24 weeks (Jan W1 → Jul W4).
// startWeek + spanWeeks define horizontal placement on the Gantt.
export const mockBars = [
  { key: 'design-pre', phase: 'design', label: 'Discovery', startWeek: 0, spanWeeks: 4, dateRange: '4 Jan → 1 Feb', light: true },
  { key: 'design', phase: 'design', label: 'Design', startWeek: 4, spanWeeks: 8, dateRange: '4 Jan → 12 Feb' },
  { key: 'dev', phase: 'dev', label: 'Dev', startWeek: 10, spanWeeks: 7, dateRange: '8 Mar → 26 Apr' },
  { key: 'qa', phase: 'qa', label: 'QA', startWeek: 16, spanWeeks: 5, dateRange: '26 Apr → 1 Jun' },
];

export const mockMonths = [
  { key: 'jan', label: 'JAN', weeks: 4 },
  { key: 'feb', label: 'FEB', weeks: 4 },
  { key: 'mar', label: 'MAR', weeks: 4 },
  { key: 'apr', label: 'APR', weeks: 4 },
  { key: 'may', label: 'MAY', weeks: 4 },
  { key: 'jun', label: 'JUN', weeks: 4 },
];

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
