// Mock data for the Vendor portal redesign project.

export const mockProject = {
  id: 'X15',
  code: 'X15',
  name: 'Vendor portal redesign',
  updatedAt: '3h ago',
  createdAt: 'May 12, 2026',
  dueDate: 'Jun 23, 2026',
  status: { label: 'In flight', tone: 'inflight' },
  squad: 'Customer',
  bookmarked: false,
};

export const mockTeam = [
  { id: 'u1', name: 'Saumya Garg', roles: ['Owner', 'SPM'] },
  { id: 'u2', name: 'Anurag Shastri', roles: ['Motion Designer'] },
  { id: 'u3', name: 'Faraz Khan', roles: ['Engineering manager'] },
  { id: 'u4', name: 'Riya Kapoor', roles: ['Product Designer'] },
  { id: 'u5', name: 'Vikram Sethi', roles: ['Frontend lead'] },
];

export const mockResources = [
  { id: 'r1', type: 'figma', title: 'Portal flows v3', subtitle: 'Figma • 32 frames', href: '#' },
  { id: 'r2', type: 'data', title: 'Vendor data XML', subtitle: 'Schema • 0.4MB', href: '#' },
  { id: 'r3', type: 'deck', title: 'Faraz V3 deck', subtitle: 'Slides • 18 pg', href: '#' },
  { id: 'r4', type: 'pdf', title: 'PRD draft', subtitle: 'PDF • 12 pg', href: '#' },
  { id: 'r5', type: 'link', title: 'Q3 OKR doc', subtitle: 'Linear • Doc', href: '#' },
];

export const mockPhases = [
  { key: 'prd', label: 'PRD', active: false, status: null },
  { key: 'design', label: 'Design', active: true, status: { kind: 'live', text: 'Live for 12d' } },
  { key: 'dev', label: 'Dev', active: true, status: { kind: 'live', text: 'Live for 4d' } },
  { key: 'alpha', label: 'Alpha', active: false, status: null },
  { key: 'beta', label: 'Beta', active: false, status: null },
  { key: 'qa', label: 'QA', active: true, status: { kind: 'reopened', text: 'Re-opened 2d ago' } },
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
