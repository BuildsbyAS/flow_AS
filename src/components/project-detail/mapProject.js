// Maps a flow-ayaneshu project (+ derived metrics, people, links) into the exact
// data shapes the ported flow_AS project-detail sections expect. Everything is
// defensive — missing data yields empty/minimal arrays rather than throwing.

const PHASES = [
  ['prd', 'PRD'],
  ['design', 'Design'],
  ['dev', 'Dev'],
  ['qa', 'QA'],
  ['alpha', 'Alpha'],
  ['beta', 'Beta'],
];
const MS_DAY = 86400000;
const MS_WEEK = 7 * MS_DAY;
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_UPPER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const initials = (name) =>
  (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const fmtShort = (d) => `${d.getDate()} ${MON_SHORT[d.getMonth()]}`;
const emptyReactions = () => ({ heart: 0, heartLiked: false, thumbs: 0, thumbsLiked: false, emojis: [] });
const periodsOf = (p, label) => (p.tracks && p.tracks[label] && p.tracks[label].periods) || [];

// ── Team ──────────────────────────────────────────────────────────────────
export function mapTeam(p, m, people) {
  const byId = new Map((people || []).map((x) => [x.id, x]));
  const byName = new Map((people || []).map((x) => [x.name, x]));
  const team = [];
  const seen = new Set();
  if (p.owner) { team.push({ id: 'owner', name: p.owner, roles: ['Owner'], email: '' }); seen.add(p.owner); }
  for (const pid of (m && m.teamMembers) || []) {
    const person = byId.get(pid);
    const name = person ? person.name : pid;
    if (seen.has(name)) continue;
    seen.add(name);
    team.push({ id: pid, name, roles: person && person.squad ? [person.squad] : [], email: '' });
  }
  // Fall back to people surfaced from weekly history when no explicit members.
  if (team.length <= 1) {
    for (const name of (m && m.peopleList) || []) {
      if (seen.has(name)) continue;
      seen.add(name);
      const person = byName.get(name);
      team.push({ id: name, name, roles: person && person.squad ? [person.squad] : [], email: '' });
    }
  }
  return team;
}

export function mapAvailableMembers(team, people) {
  const onTeam = new Set(team.map((t) => t.name));
  return (people || [])
    .filter((x) => !onTeam.has(x.name))
    .map((x) => ({ id: x.id, name: x.name, roles: x.squad ? [x.squad] : [], email: '' }));
}

// ── Resources (from projectLinks) ───────────────────────────────────────────
export function mapResources(p, projectLinks) {
  const typeMap = { figma: 'figma', design: 'figma' };
  return (projectLinks || [])
    .filter((l) => (l.projectId || l.project_id) === p.id)
    .map((l, i) => ({
      id: l.id || `r${i}`,
      type: typeMap[l.type] || (i % 2 === 0 ? 'category-cool' : 'category-warm'),
      title: l.label || l.title || l.url || 'Untitled',
      href: l.url || '#',
    }));
}

// ── Gantt phase strip (from track status) ───────────────────────────────────
export function mapPhases(p) {
  const now = Date.now();
  return PHASES.map(([key, label]) => {
    const periods = periodsOf(p, label);
    if (periods.length === 0) return { key, label, active: false, status: null };
    const last = periods[periods.length - 1];
    const active = last.completed_at === null || last.completed_at === undefined;
    let status = null;
    if (active) {
      const days = Math.max(1, Math.round((now - new Date(last.started_at).getTime()) / MS_DAY));
      status = periods.length > 1
        ? { kind: 'reopened', text: `Re-opened ${days}d ago` }
        : { kind: 'live', text: `Live for ${days}d` };
    }
    return { key, label, active, status };
  });
}

// ── Gantt bars + month columns (from real track periods) ────────────────────
export function mapGantt(p) {
  const now = Date.now();
  const segs = [];
  for (const [key, label] of PHASES) {
    for (const per of periodsOf(p, label)) {
      if (!per.started_at) continue;
      segs.push({
        phase: key,
        label,
        start: new Date(per.started_at),
        end: per.completed_at ? new Date(per.completed_at) : new Date(now),
      });
    }
  }
  // Timeline bounds — prefer track segments, fall back to project dates.
  const candStarts = segs.map((s) => s.start.getTime());
  const candEnds = segs.map((s) => s.end.getTime());
  if (p.startDate) candStarts.push(new Date(p.startDate).getTime());
  if (p.endDate) candEnds.push(new Date(p.endDate).getTime());
  if (candStarts.length === 0) { const d = p.createdAt ? new Date(p.createdAt).getTime() : now; candStarts.push(d); candEnds.push(d + 120 * MS_DAY); }
  const start = new Date(Math.min(...candStarts));
  const end = new Date(Math.max(...candEnds, start.getTime() + MS_WEEK));
  const weeksFrom = (d) => Math.max(0, Math.round((d.getTime() - start.getTime()) / MS_WEEK));

  const bars = segs.map((s, i) => ({
    key: `${s.phase}-${i}`,
    phase: s.phase,
    label: s.label,
    startWeek: weeksFrom(s.start),
    spanWeeks: Math.max(1, Math.round((s.end.getTime() - s.start.getTime()) / MS_WEEK)),
    dateRange: `${fmtShort(s.start)} → ${fmtShort(s.end)}`,
  }));

  const totalWeeks = Math.max(4, weeksFrom(end));
  const months = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  for (let acc = 0; acc < totalWeeks; acc += 4) {
    months.push({ key: `${MON_UPPER[cur.getMonth()]}-${cur.getFullYear()}-${acc}`, label: MON_UPPER[cur.getMonth()], weeks: 4 });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return { bars, months, rangeLabel: `${fmtShort(start)} — ${fmtShort(end)}` };
}

// ── Activity feed (derived from real track + project events) ────────────────
export function mapActivity(p) {
  const owner = p.owner || 'System';
  const evts = [];
  for (const [, label] of PHASES) {
    for (const per of periodsOf(p, label)) {
      if (per.started_at) evts.push({ t: new Date(per.started_at), text: `Started the ${label} track.` });
      if (per.completed_at) evts.push({ t: new Date(per.completed_at), text: `Completed the ${label} track.` });
    }
  }
  evts.sort((a, b) => b.t - a.t);
  const posts = evts.slice(0, 8).map((e, i) => ({
    id: `evt-${i}`, author: owner, initials: initials(owner), type: 'update',
    time: fmtShort(e.t), content: e.text, reactions: emptyReactions(),
  }));
  if (p.createdAt) {
    posts.push({
      id: 'created', author: owner, initials: initials(owner), type: 'update',
      time: fmtShort(new Date(p.createdAt)), content: `Created “${p.name}”.`, reactions: emptyReactions(),
    });
  }
  return posts;
}

// ── One call to build every section's data for a project ─────────────────────
export function mapProjectSections(p, m, people, projectLinks) {
  const team = mapTeam(p, m, people);
  const { bars, months, rangeLabel } = mapGantt(p);
  return {
    team,
    availableMembers: mapAvailableMembers(team, people),
    resources: mapResources(p, projectLinks),
    phases: mapPhases(p),
    bars,
    months,
    rangeLabel,
    activity: mapActivity(p),
  };
}
