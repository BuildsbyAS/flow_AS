import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mockNodes, mockProjectState, mockShipDate, mockTeam, PHASE_ORDER, PHASE_LABELS } from './mockProject.js';
import { color } from './ds.js';
import { FloatingPopover, RangeCalendar, Calendar } from './pickers.jsx';
import prdIcon from './phase-icons/PRDIcon.svg';
import designIcon from './phase-icons/DesignIcon.svg';
import devIcon from './phase-icons/DevIcon.svg';
import qaIcon from './phase-icons/QAIcon.svg';
import alphaIcon from './phase-icons/AlphaIcon.svg';
import betaIcon from './phase-icons/BetaIcon.svg';
import gaIcon from './phase-icons/GAIcon.svg';
import checkCircleFilled from './phase-icons/check-circle-filled.svg';

// Per-phase glyphs (Figma export) used on the rail + Play dropdown.
const PHASE_ICON = { prd: prdIcon, design: designIcon, dev: devIcon, qa: qaIcon, alpha: alphaIcon, beta: betaIcon, ga: gaIcon };

// GanttTimeline — "Track timeline" (Figma 850:14954 v3).
// ───────────────────────────────────────────────────────────────────────────
// Left rail (lane glyph + name + status rollup) · month/week axis with a static
// today pill · a horizontally-scrollable, ZOOMABLE stage of date-range "nodes"
// that split at TODAY (solid elapsed head + dashed remaining tail).
//
// Zoom: the top-right dropdown picks a density — Project (fit) / Quarter / Month /
// Week — and the canvas resizes so that span fills the viewport; content beyond
// the viewport scrolls horizontally. Pinch (trackpad) or Alt/Ctrl + scroll zooms
// reactively, anchored at the cursor. All editing affordances are always live.

// ─── Layout ────────────────────────────────────────────────────────────────
const LANES = PHASE_ORDER; // ['prd','design','dev','qa','alpha','beta']
const RAIL_W = 160;
const AXIS_H = 64;
const LANE_H = 72;
const NODE_TOP = 8;
const NODE_H = 56;
const EDGE = 10; // resize grab width
const MS_DAY = 86400000;
const MIN_NODE_PX = 8;

const WARM = {
  border: '#F1EAE4',
  hover: '#F4EEEB',
  ink: '#3D1602',
  sub: '#8A6D5B',
  band: 'rgba(140, 134, 124, 0.05)',
  bandHover: 'rgba(140, 134, 124, 0.10)',
  line: '#EEE7E1',
};

// ─── Date helpers ───────────────────────────────────────────────────────────
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
const TODAY = startOfDay(new Date());
function parseISO(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function diffDays(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / MS_DAY); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmt(d) { return `${d.getDate()} ${MON[d.getMonth()]}`; }
function initials(name) { return (name || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }
const nextLane = (lane) => { const i = LANES.indexOf(lane); return i >= 0 && i < LANES.length - 1 ? LANES[i + 1] : null; };
const rangeStr = (a, b) => `${fmt(a)} → ${fmt(b)}`;
// The visible right edge of a running run — its stored end, but never less than one day wide.
const liveEnd = (node) => new Date(Math.max(+node.end, +addDays(node.start, 1)));
// A node's effective (visible) end — running runs grow to their 1-day floor / today-baked end.
const effEndOf = (node) => (node.running ? liveEnd(node) : node.end);
// A run's live/planned state follows its position: starting in the future = planned (not begun
// yet), starting today-or-earlier = running (already underway). Done/paused stay as the user set them.
function positionalState(node, start) {
  if (node.state === 'done' || node.state === 'paused') return {};
  return start > TODAY ? { state: 'planned', running: false } : { state: 'inprogress', running: true };
}

let nodeSeq = 0;
const nextId = (lane) => `${lane}-${Date.now()}-${nodeSeq++}`;
const overlaps = (a, b) => a.start < b.end && b.start < a.end;

function computeWindow(list, dueDate) {
  const starts = list.map((n) => n.start.getTime());
  const ends = list.map((n) => n.end.getTime());
  const extra = dueDate ? [dueDate.getTime()] : [];
  const lo = startOfMonth(new Date(Math.min(TODAY.getTime(), ...starts, ...extra)));
  let hi = endOfMonth(new Date(Math.max(TODAY.getTime(), ...ends, ...extra)));
  if (diffDays(lo, hi) < 90) hi = endOfMonth(addDays(lo, 90));
  return { start: lo, end: hi, total: Math.max(1, diffDays(lo, hi)) };
}

// ─── Zoom presets — pixels per day so the named span fills the viewport ──────
const ZOOM = [
  { key: 'project', label: 'Project' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
];
function presetPpd(key, vw, total) {
  if (!vw) return 0;
  if (key === 'project') return vw / Math.max(total, 1);
  if (key === 'quarter') return vw / 91;
  if (key === 'month') return vw / 30.4;
  return vw / 7; // week
}

// ════════════════════════════════════════════════════════════════════════════
export default function GanttTimeline({
  nodes: nodesProp,
  projectState: projectStateProp = mockProjectState,
  shipDate: shipDateProp = mockShipDate,
  dueDate: dueDateProp,
  team = mockTeam,
  onLog,
}) {
  // The ship line is the end/ship date set when the project was created (a fixed
  // target), not something derived from the phases — so an overrun reads as slip.
  const dueDate = dueDateProp ? new Date(dueDateProp) : null;
  // Timeline changes are attributed to the project owner (first team member) in the audit log.
  const owner = (team && team.length ? team : mockTeam)[0];
  const actingAs = owner ? { name: owner.name, initials: initials(owner.name) } : { name: 'You', initials: 'YO' };
  const initialNodes = useMemo(
    () => (nodesProp || mockNodes).map((n) => {
      const start = parseISO(n.start);
      let end = parseISO(n.end);
      // An open-ended running phase has been ticking up to today — bake that into its stored
      // span so it drags/resizes like any other bar (no "snap to today" surprises).
      if (n.running && end < TODAY) end = TODAY;
      return { id: n.id, lane: n.lane, state: n.state || 'planned', running: !!n.running, upd: n.upd || null, start, end, plannedEnd: parseISO(n.plannedEnd || n.end) };
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [win] = useState(() => computeWindow(initialNodes, dueDate));
  const { start: WIN_START, total: TOTAL } = win;

  const [nodes, setNodes] = useState(initialNodes);
  const [proj, setProj] = useState(projectStateProp);
  const [shipDate, setShipDate] = useState(shipDateProp ? parseISO(shipDateProp) : null);
  // The shipping line / deadline: the defined target end, already ratcheted past any phase that
  // overruns it at load (it never sits inside the work).
  const [deadline, setDeadline] = useState(() => {
    if (!initialNodes.length) return dueDate;
    const lastEnd = new Date(Math.max(...initialNodes.map((n) => +effEndOf(n))));
    return dueDate && +dueDate > +lastEnd ? dueDate : lastEnd;
  });

  const [selected, setSelected] = useState(null);
  const [menu, setMenu] = useState(null);
  const [pending, setPending] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [playCfg, setPlayCfg] = useState(null); // { anchor } — Play kickoff dropdown

  const [drag, setDrag] = useState(null);
  const [resize, setResize] = useState(null);
  const [draw, setDraw] = useState(null);
  const [hoverLane, setHoverLane] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [nearNode, setNearNode] = useState(false);

  // ── Zoom / scroll state ──────────────────────────────────────────────────
  const [level, setLevel] = useState('project');
  const [pxPerDay, setPxPerDay] = useState(0);
  const [viewportW, setViewportW] = useState(0);
  const [centerDate, setCenterDate] = useState(TODAY);
  const [zoom, setZoom] = useState(null); // { anchor } when the dropdown is open

  const scrollRef = useRef(null);
  const stageRef = useRef(null);
  const nodesRef = useRef(nodes); nodesRef.current = nodes;
  const ppdRef = useRef(0); ppdRef.current = pxPerDay;
  const vwRef = useRef(0); vwRef.current = viewportW;
  const levelRef = useRef('project'); levelRef.current = level;
  const centerRaf = useRef(0);

  const active = proj.status === 'active';
  const canEdit = active;
  const busy = !!drag || !!resize || !!draw;

  // ── Geometry (px) ──────────────────────────────────────────────────────────
  const x = (date) => diffDays(WIN_START, date) * pxPerDay;
  const contentW = TOTAL * pxPerDay;
  const stageRect = () => stageRef.current?.getBoundingClientRect();
  const dayFloatFromX = (clientX) => { const r = stageRect(); const ppd = ppdRef.current; return r && ppd ? (clientX - r.left) / ppd : 0; };
  const dateFromX = (clientX) => addDays(WIN_START, clamp(Math.round(dayFloatFromX(clientX)), 0, TOTAL));
  const laneFromY = (clientY) => { const r = stageRect(); return r ? clamp(Math.floor((clientY - r.top) / LANE_H), 0, LANES.length - 1) : 0; };

  const months = useMemo(() => {
    const out = [];
    let cur = startOfMonth(WIN_START);
    const last = addDays(WIN_START, TOTAL);
    while (cur < last) { out.push(cur); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
    return out;
  }, [WIN_START, TOTAL]);

  // Adaptive tick density: aim for legible spacing as the zoom changes.
  const ticks = useMemo(() => {
    const ppd = pxPerDay || 1;
    const step = ppd >= 42 ? 1 : ppd >= 20 ? 2 : 7;
    const out = [];
    if (step === 7) { let i = 0; while (i < 7 && addDays(WIN_START, i).getDay() !== 1) i++; for (; i <= TOTAL; i += 7) out.push(addDays(WIN_START, i)); }
    else { for (let i = 0; i <= TOTAL; i += step) out.push(addDays(WIN_START, i)); }
    return out;
  }, [pxPerDay, WIN_START, TOTAL]);

  const nodesByLane = useMemo(() => {
    const m = {}; LANES.forEach((k) => (m[k] = []));
    nodes.forEach((n) => m[n.lane]?.push(n));
    LANES.forEach((k) => m[k].sort((a, b) => a.start - b.start));
    return m;
  }, [nodes]);

  // ── Measure viewport + keep preset zoom in sync on resize ──────────────────
  useLayoutEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const measure = () => {
      const w = sc.clientWidth;
      setViewportW(w);
      setPxPerDay((prev) => (levelRef.current !== 'custom' ? presetPpd(levelRef.current, w, TOTAL) : (prev || presetPpd('project', w, TOTAL))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sc);
    return () => ro.disconnect();
  }, [TOTAL]);

  // ── Pinch / Alt-scroll zoom (native listener so we can preventDefault) ─────
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    function onWheel(e) {
      if (!(e.ctrlKey || e.altKey)) return; // pinch fires ctrlKey; alt+scroll fires altKey
      e.preventDefault();
      const ppd = ppdRef.current, vw = vwRef.current;
      if (!ppd || !vw) return;
      const rect = sc.getBoundingClientRect();
      const dayUnder = (e.clientX - rect.left + sc.scrollLeft) / ppd;
      const next = clamp(ppd * Math.exp(-e.deltaY * 0.0015), presetPpd('project', vw, TOTAL), vw / 4);
      if (next === ppd) return;
      setLevel('custom'); levelRef.current = 'custom';
      setPxPerDay(next); ppdRef.current = next;
      requestAnimationFrame(() => { sc.scrollLeft = Math.max(0, dayUnder * next - (e.clientX - rect.left)); updateCenter(); });
    }
    sc.addEventListener('wheel', onWheel, { passive: false });
    return () => sc.removeEventListener('wheel', onWheel);
  }, [TOTAL]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateCenter() {
    const sc = scrollRef.current, ppd = ppdRef.current;
    if (!sc || !ppd) return;
    const c = (sc.scrollLeft + sc.clientWidth / 2) / ppd;
    setCenterDate(addDays(WIN_START, clamp(Math.round(c), 0, TOTAL)));
  }
  function onScroll() { cancelAnimationFrame(centerRaf.current); centerRaf.current = requestAnimationFrame(updateCenter); }

  function applyLevel(key) {
    const ppd = presetPpd(key, vwRef.current, TOTAL);
    setLevel(key); levelRef.current = key;
    setPxPerDay(ppd); ppdRef.current = ppd;
    setZoom(null);
    requestAnimationFrame(() => {
      const sc = scrollRef.current; if (!sc) return;
      sc.scrollLeft = key === 'project' ? 0 : Math.max(0, diffDays(WIN_START, TODAY) * ppd - sc.clientWidth / 2);
      updateCenter();
    });
  }
  function zoomLabel() {
    const cd = centerDate;
    if (level === 'project') return 'Project';
    if (level === 'quarter') return `Q${Math.floor(cd.getMonth() / 3) + 1} ${cd.getFullYear()}`;
    if (level === 'week') return `Week · ${fmt(cd)}`;
    return `${MON[cd.getMonth()]} ${cd.getFullYear()}`; // month + custom
  }

  // ── Modes & rollups ─────────────────────────────────────────────────────────
  function nodeMode(n) {
    if (proj.status === 'parked') return 'parked';
    if (proj.status === 'blocked') return n.lane === proj.blockPhase ? 'blocked' : 'held';
    if (n.state === 'paused') return 'paused';
    if (n.running) return 'running';
    return n.state;
  }
  function laneRollup(lane) {
    const list = nodesByLane[lane] || [];
    const count = list.length;
    if (proj.status === 'parked') return { label: 'Parked', tone: color.state.park, marker: 'dot', count };
    if (proj.status === 'blocked') {
      if (lane === proj.blockPhase) return { label: 'Blocked', tone: color.state.block, marker: 'dot', count };
      if (count) return { label: 'Held', tone: color.state.held, marker: 'dot', count };
      return { label: 'No dates', tone: color.state.planned, marker: 'none', count: 0 };
    }
    if (!count) return { label: 'No dates', tone: color.state.planned, marker: 'none', count: 0 };
    if (list.some((n) => n.running)) return { label: 'In progress', tone: color.state.inprogress, marker: 'pulse', count };
    if (list.some((n) => n.state === 'paused')) return { label: 'Paused', tone: color.state.held, marker: 'pause', count };
    if (list.some((n) => n.state === 'inprogress')) return { label: 'In progress', tone: color.state.inprogress, marker: 'pulse', count };
    if (list.some((n) => n.state === 'planned')) return { label: 'Planned', tone: color.state.planned, marker: 'none', count };
    return { label: 'Done', tone: color.state.done, marker: 'check', count };
  }

  // ── Audit logging ──────────────────────────────────────────────────────────
  // Every timeline edit emits an entry (who · what · recorded-at) to the Activity
  // feed and stamps the node's provenance. `pushLog` shape mirrors `activity_log`.
  function pushLog(meta, { content, progress } = {}) { onLog?.({ user: actingAs, meta, content, progress }); }
  function bump(id, label) { setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, upd: { who: actingAs.name, label, at: 'just now' } } : n))); }

  // ── Mutations ────────────────────────────────────────────────────────────────
  function stamp(id, label) { bump(id, label); }
  function setGeom(id, start, end) { setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, start, end, plannedEnd: n.state === 'done' ? n.plannedEnd : end, ...positionalState(n, start) } : n))); }
  function addNode(lane, start, end, opts = {}) {
    const s = start < end ? start : end;
    const e = diffDays(s, end) >= 1 ? end : addDays(s, 1); // a new phase is at least one day long
    // Calendar-created runs start running if they begin today-or-earlier (future = planned);
    // drawn runs (click-hold-drag) are always planned.
    const running = !!opts.canRun && s <= TODAY;
    const node = { id: nextId(lane), lane, start: s, end: e, plannedEnd: e, state: running ? 'inprogress' : 'planned', running, upd: { who: actingAs.name, label: running ? 'Started' : 'Created', at: 'just now' } };
    setNodes((prev) => [...prev, node]);
    pushLog(`${running ? 'started' : 'added'} a ${PHASE_LABELS[lane]} run`, { progress: [{ label: PHASE_LABELS[lane], from: '—', to: running ? 'In progress' : rangeStr(s, e) }] });
    return node.id;
  }
  function removeNode(id) {
    const n = nodesRef.current.find((x2) => x2.id === id);
    setNodes((prev) => prev.filter((x2) => x2.id !== id));
    setSelected((s) => (s === id ? null : s));
    if (n) pushLog(`removed a ${PHASE_LABELS[n.lane]} run`);
  }
  function setNodeState(id, state, endOverride) {
    const target = nodesRef.current.find((x2) => x2.id === id);
    if (!target) return;
    const lbl = PHASE_LABELS[target.lane];
    setNodes((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      if (state === 'done') { const end = endOverride || (TODAY > n.start ? TODAY : n.end); return { ...n, state, plannedEnd: n.plannedEnd, end, upd: { who: actingAs.name, label: 'Marked done', at: 'just now' } }; }
      const label = state === 'inprogress' ? (n.state === 'done' ? 'Reopened' : 'Marked in progress') : 'Back to planned';
      return { ...n, state, plannedEnd: n.end, upd: { who: actingAs.name, label, at: 'just now' } };
    }));
    if (state === 'done') {
      const end = endOverride || (TODAY > target.start ? TODAY : target.end);
      pushLog(`marked ${lbl} done`, { progress: [{ label: lbl, from: 'In progress', to: `Done · ${fmt(end)}` }] });
      if (target.lane === 'beta') setShipDate(end);
    } else if (state === 'inprogress') {
      const reopened = target.state === 'done';
      pushLog(reopened ? `reopened ${lbl}` : `started ${lbl}`, { progress: [{ label: lbl, from: reopened ? 'Done' : 'Planned', to: 'In progress' }] });
    } else {
      pushLog(`moved ${lbl} back to planned`, { progress: [{ label: lbl, from: 'In progress', to: 'Planned' }] });
    }
  }
  // The PM's core loop: complete this phase (actual end) and start the next one.
  function completeAndAdvance(id, endOverride) {
    const cur = nodesRef.current.find((x2) => x2.id === id);
    if (!cur) return;
    const lbl = PHASE_LABELS[cur.lane];
    const end = endOverride || (TODAY > cur.start ? TODAY : cur.end);
    const nl = nextLane(cur.lane);
    const progress = [{ label: lbl, from: 'In progress', to: `Done · ${fmt(end)}` }];
    setNodes((prev) => {
      let arr = prev.map((n) => (n.id === id ? { ...n, state: 'done', running: false, end, upd: { who: actingAs.name, label: 'Completed', at: 'just now' } } : n));
      if (nl) {
        // The next phase starts *running* (open-ended) from today.
        const existing = arr.find((n) => n.lane === nl && n.state !== 'done');
        if (existing) arr = arr.map((n) => (n.id === existing.id ? { ...n, state: 'inprogress', running: true, start: TODAY, end: TODAY, upd: { who: actingAs.name, label: 'Started', at: 'just now' } } : n));
        else arr = [...arr, { id: nextId(nl), lane: nl, start: TODAY, end: TODAY, plannedEnd: TODAY, state: 'inprogress', running: true, upd: { who: actingAs.name, label: 'Started', at: 'just now' } }];
      }
      return arr;
    });
    if (cur.lane === 'beta') setShipDate(end);
    if (nl) progress.push({ label: PHASE_LABELS[nl], from: '—', to: 'In progress' });
    pushLog(nl ? `completed ${lbl} and started ${PHASE_LABELS[nl]}` : `completed ${lbl}`, { progress });
  }

  // ── Start / Pause / Resume (the running-clock model) ─────────────────────────
  // Kick off one or more phases at a chosen start date (the Play dropdown). A
  // phase with a planned/paused run begins/resumes it; an empty lane gets a new run.
  function startPhases(lanes, date) {
    const start = date || TODAY;
    const end = start > TODAY ? start : TODAY;
    const labels = [];
    setNodes((prev) => {
      let arr = [...prev];
      for (const lane of lanes) {
        const list = arr.filter((n) => n.lane === lane);
        const paused = list.find((n) => n.state === 'paused');
        const planned = list.find((n) => n.state === 'planned');
        const target = paused || planned;
        if (target) arr = arr.map((n) => (n.id === target.id ? { ...n, state: 'inprogress', running: true, start, end, upd: { who: actingAs.name, label: paused ? 'Resumed' : 'Started', at: 'just now' } } : n));
        else arr = [...arr, { id: nextId(lane), lane, start, end, plannedEnd: end, state: 'inprogress', running: true, upd: { who: actingAs.name, label: 'Started', at: 'just now' } }];
        labels.push(PHASE_LABELS[lane]);
      }
      return arr;
    });
    if (labels.length) pushLog(`started ${labels.join(', ')}${labels.length > 1 ? ' in parallel' : ''}${diffDays(start, TODAY) !== 0 ? ` (from ${fmt(start)})` : ''}`, { progress: labels.map((l) => ({ label: l, from: '—', to: 'In progress' })) });
  }
  // Begin / reopen a phase node → running (open-ended) from today.
  function beginRunning(id) {
    const t = nodesRef.current.find((n) => n.id === id); if (!t) return;
    const reopened = t.state === 'done';
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, state: 'inprogress', running: true, start: TODAY, end: TODAY, upd: { who: actingAs.name, label: reopened ? 'Reopened' : 'Started', at: 'just now' } } : n)));
    pushLog(reopened ? `reopened ${PHASE_LABELS[t.lane]}` : `started ${PHASE_LABELS[t.lane]}`, { progress: [{ label: PHASE_LABELS[t.lane], from: reopened ? 'Done' : 'Planned', to: 'In progress' }] });
  }
  function pausePhase(id) {
    const t = nodesRef.current.find((n) => n.id === id); if (!t || !t.running) return;
    const end = TODAY > t.start ? TODAY : t.end;
    const days = Math.max(0, diffDays(t.start, end));
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, running: false, state: 'paused', end, upd: { who: actingAs.name, label: 'Paused', at: 'just now' } } : n)));
    pushLog(`paused ${PHASE_LABELS[t.lane]} after ${days}d`, { progress: [{ label: PHASE_LABELS[t.lane], from: 'In progress', to: 'Paused' }] });
  }
  function resumePhase(id) {
    const t = nodesRef.current.find((n) => n.id === id); if (!t || t.state !== 'paused') return;
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, running: true, state: 'inprogress', end: TODAY > n.end ? TODAY : n.end, upd: { who: actingAs.name, label: 'Resumed', at: 'just now' } } : n)));
    pushLog(`resumed ${PHASE_LABELS[t.lane]}`, { progress: [{ label: PHASE_LABELS[t.lane], from: 'Paused', to: 'In progress' }] });
  }

  // ── Overlap resolution ───────────────────────────────────────────────────────
  function resolveConflicts(candidateId, restore, kind) {
    const all = nodesRef.current;
    const cand = all.find((n) => n.id === candidateId);
    if (!cand) return;
    let uStart = cand.start, uEnd = cand.end;
    const conflicts = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of all) {
        if (n.id === candidateId || n.lane !== cand.lane || conflicts.includes(n.id)) continue;
        if (overlaps({ start: uStart, end: uEnd }, n)) { conflicts.push(n.id); uStart = new Date(Math.min(uStart, n.start)); uEnd = new Date(Math.max(uEnd, n.end)); changed = true; }
      }
    }
    if (!conflicts.length) return;
    const coversAll = conflicts.every((id) => { const o = all.find((n) => n.id === id); return cand.start <= o.start && cand.end >= o.end; });
    setPending({ id: candidateId, kind, restore, conflicts, union: { start: uStart, end: uEnd }, verb: coversAll ? 'Replace' : 'Merge', lane: cand.lane, count: conflicts.length });
  }
  function applyMerge() {
    const p = pending; if (!p) return;
    setNodes((prev) => prev.filter((n) => !p.conflicts.includes(n.id)).map((n) => (n.id === p.id ? { ...n, start: p.union.start, end: p.union.end, plannedEnd: n.state === 'done' ? n.plannedEnd : p.union.end, ...positionalState(n, p.union.start), upd: { who: actingAs.name, label: p.verb === 'Replace' ? 'Replaced' : 'Merged', at: 'just now' } } : n)));
    pushLog(`${p.verb === 'Replace' ? 'replaced' : 'merged'} ${p.count} ${PHASE_LABELS[p.lane]} run${p.count === 1 ? '' : 's'}`);
    setPending(null);
  }
  function cancelMerge() {
    const p = pending; if (!p) return;
    if (p.kind === 'create') setNodes((prev) => prev.filter((n) => n.id !== p.id));
    else setNodes((prev) => prev.map((n) => (n.id === p.id ? { ...n, ...p.restore } : n)));
    setPending(null);
  }

  // ── Drag (move) ──────────────────────────────────────────────────────────────
  const moveRef = useRef({ start0: 0, span: 0, grab: 0, moved: false });
  const gestureCancelRef = useRef(false); // set by Escape so the pointerup handler aborts cleanly
  // Revert and end whatever gesture is in flight (Escape "dismiss the action").
  function cancelGesture() {
    gestureCancelRef.current = true;
    if (drag) { const o = moveRef.current.orig; if (o) setNodes((prev) => prev.map((n) => (n.id === drag ? { ...n, ...o } : n))); setDrag(null); }
    else if (resize) { const o = resizeRef.current.orig; if (o) setNodes((prev) => prev.map((n) => (n.id === resize ? { ...n, ...o } : n))); setResize(null); }
    else if (draw) setDraw(null);
  }
  function startMove(node, e) {
    if (!canEdit || e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    gestureCancelRef.current = false;
    const end = node.running ? liveEnd(node) : node.end; // drag preserves the bar's visible span
    moveRef.current = { start0: diffDays(WIN_START, node.start), span: Math.max(1, diffDays(node.start, end)), grab: dayFloatFromX(e.clientX), moved: false, orig: { start: node.start, end: node.end, plannedEnd: node.plannedEnd } };
    setSelected(node.id); setDrag(node.id);
  }
  useEffect(() => {
    if (!drag) return;
    function onMove(e) {
      const delta = Math.round(dayFloatFromX(e.clientX) - moveRef.current.grab);
      if (delta !== 0) moveRef.current.moved = true;
      const { start0, span } = moveRef.current;
      const start = addDays(WIN_START, clamp(start0 + delta, 0, TOTAL - span));
      const end = addDays(start, span);
      // Move the whole bar (preserve span); its running/planned state follows where it lands.
      setNodes((prev) => prev.map((n) => (n.id === drag ? { ...n, start, end, plannedEnd: n.state === 'done' ? n.plannedEnd : end, ...positionalState(n, start) } : n)));
    }
    function onUp(e) {
      if (gestureCancelRef.current) { setDrag(null); return; }
      if (!moveRef.current.moved) { openMenuAt(drag, { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }); setDrag(null); return; }
      const node = nodesRef.current.find((n) => n.id === drag);
      const { start0, span } = moveRef.current;
      const oldStart = addDays(WIN_START, start0), oldEnd = addDays(WIN_START, start0 + span);
      stamp(drag, 'Moved');
      if (node) pushLog(`moved ${PHASE_LABELS[node.lane]}`, { progress: [{ label: PHASE_LABELS[node.lane], from: rangeStr(oldStart, oldEnd), to: rangeStr(node.start, node.end) }] });
      resolveConflicts(drag, { start: oldStart, end: oldEnd, plannedEnd: node?.plannedEnd }, 'move');
      setDrag(null);
    }
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
  }, [drag]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize ───────────────────────────────────────────────────────────────────
  const resizeRef = useRef({ edge: 'r', start0: 0, end0: 0, grab: 0 });
  function startResize(node, edge, e) {
    if (!canEdit || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    gestureCancelRef.current = false;
    // A running node's visible right edge is its 1-day floor — grab from there.
    const end = node.running ? liveEnd(node) : node.end;
    resizeRef.current = { edge, start0: diffDays(WIN_START, node.start), end0: diffDays(WIN_START, end), grab: dayFloatFromX(e.clientX), orig: { start: node.start, end: node.end, plannedEnd: node.plannedEnd } };
    setSelected(node.id); setResize(node.id);
  }
  useEffect(() => {
    if (!resize) return;
    function onMove(e) {
      const delta = Math.round(dayFloatFromX(e.clientX) - resizeRef.current.grab);
      const { edge, start0, end0 } = resizeRef.current;
      let s = start0, en = end0;
      if (edge === 'r') en = clamp(end0 + delta, start0 + 1, TOTAL); else s = clamp(start0 + delta, 0, end0 - 1);
      const start = addDays(WIN_START, s), end = addDays(WIN_START, en);
      setNodes((prev) => prev.map((n) => (n.id === resize ? { ...n, start, end, plannedEnd: n.state === 'done' ? n.plannedEnd : end, ...positionalState(n, start) } : n)));
    }
    function onUp() {
      if (gestureCancelRef.current) { setResize(null); return; }
      const node = nodesRef.current.find((n) => n.id === resize);
      const oldStart = addDays(WIN_START, resizeRef.current.start0), oldEnd = addDays(WIN_START, resizeRef.current.end0);
      stamp(resize, 'Resized');
      if (node) pushLog(`resized ${PHASE_LABELS[node.lane]}`, { progress: [{ label: PHASE_LABELS[node.lane], from: rangeStr(oldStart, oldEnd), to: rangeStr(node.start, node.end) }] });
      resolveConflicts(resize, { start: oldStart, end: oldEnd }, 'resize');
      setResize(null);
    }
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
  }, [resize]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lane draw / cursor-+ ─────────────────────────────────────────────────────
  function onStageMove(e) {
    if (!canEdit || busy) return;
    const r = stageRect(); if (!r) return;
    const lane = laneFromY(e.clientY);
    setHoverLane(lane);
    setHoverX(clamp(e.clientX - r.left, 0, r.width));
    const laneKey = LANES[lane];
    const cx = e.clientX - r.left;
    const near = (nodesByLane[laneKey] || []).some((n) => {
      const l = diffDays(WIN_START, n.start) * pxPerDay, rr = diffDays(WIN_START, n.end) * pxPerDay;
      const safe = Math.max(10, (rr - l) * 0.05);
      return cx >= l - safe && cx <= rr + safe;
    });
    setNearNode(near);
  }
  function onStageLeave() { if (!busy) { setHoverLane(null); setNearNode(false); } }
  function onStageDown(e) {
    if (!canEdit || nodesRef.current.length === 0 || e.button !== 0 || busy || menu || pending) return; // empty → use Play
    setSelected(null);
    gestureCancelRef.current = false;
    const lane = laneFromY(e.clientY);
    const d0 = dateFromX(e.clientX);
    setDraw({ lane, laneKey: LANES[lane], start: d0, end: d0, x0: e.clientX, moved: false });
  }
  useEffect(() => {
    if (!draw) return;
    function onMove(e) { const d = dateFromX(e.clientX); setDraw((dr) => (dr ? { ...dr, end: d, moved: dr.moved || Math.abs(e.clientX - dr.x0) > 5 } : dr)); }
    function onUp(e) {
      const dr = draw; setDraw(null); if (!dr || gestureCancelRef.current) return;
      if (dr.moved) {
        const a = dr.start < dr.end ? dr.start : dr.end, b = dr.start < dr.end ? dr.end : dr.start;
        const id = addNode(dr.laneKey, a, diffDays(a, b) >= 1 ? b : addDays(a, 1));
        setTimeout(() => resolveConflicts(id, null, 'create'), 0);
      } else {
        const s = dateFromX(e.clientX);
        openCalendar({ lane: dr.laneKey, id: null, start: s, end: addDays(s, 14), anchor: { left: e.clientX, right: e.clientX, top: e.clientY + 4, bottom: e.clientY + 8 } });
      }
    }
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
  }, [draw]); // eslint-disable-line react-hooks/exhaustive-deps

  function openMenuAt(id, anchor) { setSelected(id); setMenu({ id, anchor }); }
  function openCalendar(cfg) { setMenu(null); setCalendar(cfg); }
  const STATUS_LABEL = { active: 'On track', blocked: 'Blocked · Dev', parked: 'Deprioritised' };
  function setPreview(status) {
    if (status === proj.status) return;
    const from = STATUS_LABEL[proj.status] || '—';
    if (status === 'blocked') setProj({ status: 'blocked', blockPhase: 'dev', blockReason: 'Waiting on API contract' });
    else if (status === 'parked') setProj({ status: 'parked', blockPhase: null, blockReason: null });
    else setProj({ status: 'active', blockPhase: null, blockReason: null });
    pushLog('changed project status', { progress: [{ label: 'Project', from, to: STATUS_LABEL[status] }] });
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      const inField = t?.closest?.('input, textarea, [contenteditable="true"], [data-floating-popover], [role="alertdialog"]');
      if (e.key === 'Escape') {
        // Escape dismisses the in-flight action only — never the parent side sheet.
        if (drag || resize || draw) { cancelGesture(); e.stopPropagation(); return; }
        // Popovers (menu / calendar / zoom / Play config) and the overlap dialog own their own Escape.
        if (calendar || menu || zoom || playCfg || pending) return;
        if (selected) { setSelected(null); e.stopPropagation(); return; }
        return; // nothing to dismiss → let it bubble so the sheet can close
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && canEdit && selected && !inField && !pending) { e.preventDefault(); removeNode(selected); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [calendar, menu, zoom, playCfg, draw, drag, resize, selected, canEdit, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const spanLabel = proj.status === 'parked' ? 'Parked'
    : nodes.length ? `${fmt(new Date(Math.min(...nodes.map((n) => n.start))))} – ${fmt(new Date(Math.max(...nodes.map((n) => +effEndOf(n)))))}` : '—';
  const chartHeight = LANES.length * LANE_H;
  const empty = nodes.length === 0;
  const showPlus = canEdit && !empty && hoverLane != null && !nearNode && !busy && !menu && !pending && !calendar && !!pxPerDay;
  // Shipping line holds its defined date, shown until the project actually ships (solid actual date).
  const shipDateForFlag = proj.status !== 'parked' ? (shipDate || deadline) : null;

  // The shipping line is sticky: a defined date stays put. It only ratchets OUTWARD when a phase is
  // created/dragged/resized past it (then it snaps to that phase's end and logs the slip). Pulling
  // phases back in never drags it inward. Skips mid-gesture so a drag logs once, on drop.
  useEffect(() => {
    if (busy || shipDate || !nodes.length) return;
    const lastEnd = new Date(Math.max(...nodes.map((n) => +effEndOf(n))));
    if (deadline == null) { setDeadline(lastEnd); return; } // first definition — no log
    if (+lastEnd > +deadline) {
      setDeadline(lastEnd);
      pushLog('extended the deadline to fit the last phase', { progress: [{ label: 'Deadline', from: fmt(deadline), to: fmt(lastEnd) }] });
    }
  }, [busy, shipDate, nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-phase status, used by the empty-state Play kickoff dropdown.
  const phaseList = LANES.map((lane) => {
    const list = nodesByLane[lane] || [];
    let status = 'empty';
    if (list.some((n) => n.running)) status = 'running';
    else if (list.some((n) => n.state === 'paused')) status = 'paused';
    else if (list.length && list.every((n) => n.state === 'done')) status = 'done';
    else if (list.some((n) => n.state === 'planned')) status = 'planned';
    return { lane, label: PHASE_LABELS[lane], status };
  });

  return (
    <section>
      {/* Topbar */}
      <div style={{ position: 'relative', paddingRight: 150, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-text-primary)', letterSpacing: '-0.1px' }}>Track timeline</span>
          <span style={{ fontSize: 14, color: WARM.sub, fontVariantNumeric: 'tabular-nums' }}>{spanLabel}</span>
        </div>
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ZoomButton label={zoomLabel()} onOpen={(anchor) => setZoom({ anchor })} />
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', border: `1px solid ${WARM.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh-card)' }}>
        {/* Blocked / Deprioritised views — driven by the project's real status (`projectState` prop).
            The demo segmented toggle is gone; these render whenever proj.status is blocked/parked.
            Blocked → origin phase renders in `blocked` mode, others `held`, amber banner.
            Parked  → all phases `parked` (greyed), grey banner, ship flag hidden (see nodeMode / laneRollup). */}
        {proj.status === 'blocked' && <Banner tone="block" text={<>⚠ Project blocked on <b>{PHASE_LABELS[proj.blockPhase]}</b> — {proj.blockReason}</>} right="on hold" />}
        {proj.status === 'parked' && <Banner tone="park" text={<>‖ Project deprioritised — all phases parked</>} right={<button type="button" onClick={() => setPreview('active')} style={{ color: 'var(--c-text-action)', fontWeight: 600, fontSize: 13 }}>Resume project</button>} />}

        <div style={{ display: 'flex' }}>
          {/* Rail (fixed left column) */}
          <div style={{ width: RAIL_W, flexShrink: 0, borderRight: `1px solid ${WARM.border}`, position: 'relative', zIndex: 2, background: '#fff' }}>
            <div style={{ height: AXIS_H, borderBottom: `1px solid ${WARM.border}` }} />
            {LANES.map((lane) => (
              <RailRow key={lane} lane={lane} label={PHASE_LABELS[lane]} rollup={laneRollup(lane)} canEdit={canEdit}
                onAdd={(e) => { const r = e.currentTarget.getBoundingClientRect(); openCalendar({ lane, id: null, start: TODAY, end: addDays(TODAY, 14), anchor: r }); }} />
            ))}
          </div>

          {/* Scrollable canvas (axis + stage share one horizontal scroll) */}
          <div ref={scrollRef} className="pd-hscroll" onScroll={onScroll}
            style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
            <div style={{ width: contentW || '100%', minWidth: '100%', position: 'relative' }}>
              {/* Axis */}
              <div style={{ position: 'relative', height: AXIS_H, borderBottom: `1px solid ${WARM.border}` }}>
                {months.map((m, i) => {
                  const left = x(m < WIN_START ? WIN_START : m);
                  return (
                    <div key={i}>
                      {i > 0 && <div style={{ position: 'absolute', left, top: 12, bottom: 0, width: 1, background: WARM.line }} />}
                      <span style={{ position: 'absolute', left: left + 10, top: 10, fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)', whiteSpace: 'nowrap' }}>{`${MON[m.getMonth()]} ${m.getFullYear()}`}</span>
                    </div>
                  );
                })}
                {ticks.map((d, i) => {
                  // Only hide a tick the today pill would actually overlap (pixel-based, so it doesn't
                  // blow a fixed 2-day hole when zoomed in).
                  if (Math.abs(x(d) - x(TODAY)) < 18) return null;
                  return <span key={i} style={{ position: 'absolute', left: x(d), top: 38, transform: 'translateX(-50%)', fontSize: 13, color: WARM.sub, fontVariantNumeric: 'tabular-nums' }}>{d.getDate()}</span>;
                })}
                <div style={{ position: 'absolute', left: x(TODAY), top: 36, transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 20, padding: '0 6px', borderRadius: 6, background: WARM.ink, color: '#fff', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }} title="Today">{TODAY.getDate()}</div>
              </div>

              {/* Stage */}
              <div ref={stageRef} onPointerMove={onStageMove} onPointerLeave={onStageLeave} onPointerDown={onStageDown}
                style={{ position: 'relative', height: chartHeight, touchAction: 'pan-x', cursor: showPlus ? 'copy' : 'default' }}>
                {LANES.map((lane, i) => (
                  <div key={lane} style={{ position: 'absolute', top: i * LANE_H, left: 0, right: 0, height: LANE_H, borderBottom: i < LANES.length - 1 ? `1px dashed ${WARM.line}` : 'none', background: canEdit && hoverLane === i ? WARM.bandHover : canEdit ? WARM.band : 'transparent', transition: 'background 140ms var(--ease-out)' }} />
                ))}

                <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: x(TODAY), width: 2, background: WARM.ink, opacity: 0.5, zIndex: 5, pointerEvents: 'none' }} />

                {shipDateForFlag && <ShipFlag leftPx={x(shipDateForFlag)} flip={x(shipDateForFlag) > contentW - 160} date={shipDateForFlag} shipped={!!shipDate} height={chartHeight} />}

                {!!pxPerDay && nodes.map((n) => (
                  <Node key={n.id} node={n} mode={nodeMode(n)} x={x} laneIndex={LANES.indexOf(n.lane)}
                    fg={color.phase[n.lane]} soft={color.phaseSoft[n.lane]} today={TODAY}
                    canEdit={canEdit} selected={selected === n.id} dragging={drag === n.id} resizing={resize === n.id}
                    dimmed={busy && drag !== n.id && resize !== n.id}
                    onStartMove={(e) => startMove(n, e)} onStartResize={(edge, e) => startResize(n, edge, e)}
                    onOpenMenu={(anchor) => openMenuAt(n.id, anchor)} />
                ))}

                {draw && draw.moved && (
                  <DrawPreview x={x} laneIndex={draw.lane} laneKey={draw.laneKey} start={draw.start < draw.end ? draw.start : draw.end} end={draw.start < draw.end ? draw.end : draw.start} fg={color.phase[draw.laneKey]} />
                )}

                {showPlus && (
                  <div aria-hidden style={{ position: 'absolute', left: hoverX, top: hoverLane * LANE_H + LANE_H / 2, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 7 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 999, background: WARM.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(61,22,2,0.18)' }}><IconPlus size={14} /></div>
                  </div>
                )}
                {showPlus && <div aria-hidden style={{ position: 'absolute', left: hoverX, top: 0, bottom: 0, width: 1, borderLeft: `1px dashed ${WARM.sub}`, opacity: 0.5, pointerEvents: 'none', zIndex: 4 }} />}

                {/* Empty state — a clear Play to kick off the first phase. */}
                {empty && active && <PlayStart onStart={(rect) => setPlayCfg({ anchor: rect })} firstPhase={PHASE_LABELS[LANES[0]]} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom dropdown */}
      {zoom && (
        <FloatingPopover anchor={zoom.anchor} width={180} onClose={() => setZoom(null)}>
          <div className="flow-pd" style={{ padding: 6 }}>
            {ZOOM.map((z) => <MenuRow key={z.key} label={z.label} selected={level === z.key} onClick={() => applyLevel(z.key)} />)}
            <div style={{ padding: '6px 10px 4px', fontSize: 11.5, color: 'var(--c-text-muted)', borderTop: '1px solid var(--c-border-subtle)', marginTop: 4 }}>Pinch or ⌥/Ctrl-scroll to zoom</div>
          </div>
        </FloatingPopover>
      )}

      {/* Play kickoff dropdown — pick which phases to start, and when */}
      {playCfg && (
        <FloatingPopover anchor={playCfg.anchor} width={300} onClose={() => setPlayCfg(null)}>
          <PlayConfig phases={phaseList} onCancel={() => setPlayCfg(null)}
            onStart={(lanes) => { startPhases(lanes); setPlayCfg(null); }} />
        </FloatingPopover>
      )}

      {/* Node menu */}
      {menu && (() => {
        const node = nodes.find((n) => n.id === menu.id);
        if (!node) return null;
        return <NodeMenu node={node} anchor={menu.anchor} onClose={() => setMenu(null)}
          onState={(s) => { setNodeState(node.id, s); setMenu(null); }}
          onBegin={() => { beginRunning(node.id); setMenu(null); }}
          onPause={() => { pausePhase(node.id); setMenu(null); }}
          onResume={() => { resumePhase(node.id); setMenu(null); }}
          onCompleteAdvance={() => { completeAndAdvance(node.id); setMenu(null); }}
          onMarkDone={(date) => { setNodeState(node.id, 'done', date); setMenu(null); }}
          onEditDates={() => openCalendar({ lane: node.lane, id: node.id, start: node.start, end: node.end, anchor: menu.anchor })}
          onRemove={() => { removeNode(node.id); setMenu(null); }} />;
      })()}

      {/* Calendar */}
      {calendar && (
        <FloatingPopover anchor={calendar.anchor} width={256} onClose={() => setCalendar(null)}>
          <div className="flow-pd">
            <CalendarEditor cfg={calendar}
              onApply={(start, end) => {
                const e2 = diffDays(start, end) >= 1 ? end : addDays(start, 1); // a single-day pick → one full day
                if (calendar.id) { const lbl = PHASE_LABELS[calendar.lane]; setGeom(calendar.id, start, e2); stamp(calendar.id, 'Dates changed'); pushLog(`changed ${lbl} dates`, { progress: [{ label: lbl, from: rangeStr(calendar.start, calendar.end), to: rangeStr(start, e2) }] }); const cid = calendar.id, cs = calendar.start, ce = calendar.end; setTimeout(() => resolveConflicts(cid, { start: cs, end: ce }, 'resize'), 0); }
                else { const id = addNode(calendar.lane, start, e2, { canRun: true }); setTimeout(() => resolveConflicts(id, null, 'create'), 0); }
                setCalendar(null);
              }} />
          </div>
        </FloatingPopover>
      )}

      {/* Overlap dialog */}
      {pending && <OverlapDialog verb={pending.verb} count={pending.count} lane={PHASE_LABELS[pending.lane]} tone={color.phase[pending.lane]} onConfirm={applyMerge} onCancel={cancelMerge} />}
    </section>
  );
}

// ─── Zoom button ─────────────────────────────────────────────────────────────
function ZoomButton({ label, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 12px 9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: 'var(--c-text-secondary)', background: hover ? WARM.hover : '#fff', border: `1px solid ${WARM.border}`, transition: 'background 140ms var(--ease-out)' }}>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{label}</span>
      <IconCaret />
    </button>
  );
}

// ─── Play kickoff config — choose phases + start date ────────────────────────
function PlayConfig({ phases, onStart, onCancel }) {
  const startableLanes = phases.filter((p) => p.status !== 'running' && p.status !== 'done').map((p) => p.lane);
  const [sel, setSel] = useState(() => new Set(startableLanes.slice(0, 1))); // first startable pre-checked
  const STATUS = { running: 'Running', paused: 'Paused', done: 'Done', planned: 'Planned', empty: '—' };
  const toggle = (lane) => setSel((s) => { const n = new Set(s); n.has(lane) ? n.delete(lane) : n.add(lane); return n; });
  return (
    <div className="flow-pd" style={{ padding: 8 }}>
      <div style={{ padding: '4px 6px 8px', fontSize: 13, fontWeight: 700, color: 'var(--c-text-primary)' }}>Start phases</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 264, overflowY: 'auto' }}>
        {phases.map((p) => {
          const disabled = p.status === 'running' || p.status === 'done';
          const checked = sel.has(p.lane);
          return (
            <button key={p.lane} type="button" disabled={disabled} onClick={() => toggle(p.lane)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 8, background: checked ? WARM.hover : 'transparent', opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer', textAlign: 'left', transition: 'background 120ms var(--ease-out)' }}>
              <CheckBox checked={checked} disabled={disabled} />
              <PhaseGlyph lane={p.lane} size={18} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--c-text-primary)' }}>{p.label}</span>
              <span style={{ fontSize: 11.5, color: p.status === 'paused' ? 'var(--c-held)' : 'var(--c-text-muted)' }}>{STATUS[p.status]}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '10px 8px 4px', borderTop: '1px solid var(--c-border-subtle)', marginTop: 6 }}>
        <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        <PrimaryBtn disabled={sel.size === 0} onClick={() => onStart([...sel])}>{sel.size > 1 ? `Start ${sel.size} phases` : 'Start'}</PrimaryBtn>
      </div>
    </div>
  );
}
function CheckBox({ checked, disabled }) {
  return (
    <span aria-hidden style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: checked ? 'var(--c-text-action)' : '#fff', border: checked ? '1px solid var(--c-text-action)' : `1.5px solid ${disabled ? 'var(--c-border-primary)' : 'var(--c-border-strong)'}`, color: '#fff' }}>
      {checked && <svg width={11} height={11} viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </span>
  );
}

// ─── Calendar editor ─────────────────────────────────────────────────────────
function CalendarEditor({ cfg, onApply }) {
  const [start, setStart] = useState(cfg.start);
  const [end, setEnd] = useState(cfg.end);
  return <RangeCalendar start={start} end={end} onChange={(s, e) => { setStart(s); setEnd(e); }} onApply={onApply} applyLabel={cfg.id ? 'Update dates' : `Add to ${PHASE_LABELS[cfg.lane]}`} />;
}

// ─── Rail row ────────────────────────────────────────────────────────────────
function RailRow({ lane, label, rollup, canEdit, onAdd }) {
  const [hover, setHover] = useState(false);
  return (
    <div onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ height: LANE_H, padding: '16px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PhaseGlyph lane={lane} />
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--c-text-primary)', letterSpacing: '-0.1px' }}>{label}</span>
        {canEdit && (
          <button type="button" aria-label={`Add ${label} node`} onClick={onAdd}
            style={{ width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: WARM.sub, opacity: hover ? 1 : 0, transition: 'opacity 140ms var(--ease-out)' }}>
            <IconPlus size={14} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: WARM.sub }}>
        <RollupMarker marker={rollup.marker} tone={rollup.tone} />
        <span style={{ color: rollup.tone, fontWeight: 500 }}>{rollup.label}</span>
        {rollup.count > 1 && <><span style={{ width: 3, height: 3, borderRadius: 999, background: WARM.sub, opacity: 0.6 }} /><span>{rollup.count} runs</span></>}
      </div>
    </div>
  );
}

function RollupMarker({ marker, tone }) {
  if (marker === 'check') return <img src={checkCircleFilled} alt="" aria-hidden width={13} height={13} style={{ display: 'block', flexShrink: 0 }} />;
  if (marker === 'pulse') return <span className="flow-pulse-dot" style={{ width: 7, height: 7, borderRadius: 999, background: tone, display: 'inline-block' }} />;
  if (marker === 'pause') return <span aria-hidden style={{ color: tone, display: 'inline-flex' }}><IconPause size={11} /></span>;
  if (marker === 'dot') return <span style={{ width: 7, height: 7, borderRadius: 999, background: tone, display: 'inline-block' }} />;
  return <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--c-border-strong)', display: 'inline-block' }} />;
}

// ─── Node (split-at-today card, px-positioned) ───────────────────────────────
function Node({ node, mode, x, laneIndex, fg, soft, today, canEdit, selected, dragging, resizing, dimmed, onStartMove, onStartResize, onOpenMenu }) {
  const [hover, setHover] = useState(false);
  const top = laneIndex * LANE_H + NODE_TOP;
  const running = mode === 'running';
  const effEnd = running ? liveEnd(node) : node.end; // running spans at least one day
  const xs = x(node.start), xe = x(effEnd), xt = x(today);
  const width = Math.max(MIN_NODE_PX, xe - xs);

  const fillBg = color.phaseFill[node.lane];
  const fillBorder = color.phaseFillBorder[node.lane];
  const accent = mode === 'blocked' ? 'var(--c-block)' : mode === 'held' || mode === 'paused' ? 'var(--c-held)' : mode === 'parked' ? 'var(--c-park)' : fillBorder;
  const split = mode === 'inprogress' || mode === 'held' || (mode === 'blocked' && node.end >= today);
  const solidFill = running || mode === 'done' || mode === 'paused'; // solid colour block
  const onSolid = solidFill || mode === 'inprogress' || mode === 'blocked'; // dark text sits on a colour fill
  const elapsedEnd = node.end < today ? node.end : (today > node.start ? today : node.start);
  const headFrac = clamp(((x(elapsedEnd) - xs) / Math.max(1, xe - xs)) * 100, 0, 100);
  const overdue = mode === 'blocked' && node.end < today;
  const interacting = dragging || resizing;
  const draggable = canEdit;            // every node can be dragged to change its dates
  const resizable = canEdit;            // every node can be resized, incl. running (left = start, right = end)

  const ghost = mode === 'done' && node.plannedEnd && +node.plannedEnd !== +node.end;
  const gx = ghost ? x(node.plannedEnd) : 0;
  const early = ghost && node.plannedEnd > node.end;
  const ghostDays = ghost ? Math.abs(diffDays(node.end, node.plannedEnd)) : 0;
  const overBy = mode === 'inprogress' && node.plannedEnd < today ? diffDays(node.plannedEnd, today) : 0;

  const content = (
    <NodeContent label={PHASE_LABELS[node.lane]} start={node.start} end={effEnd} running={running} animate={interacting} onSolid={onSolid}
      check={mode === 'done'} pill={pillFor(mode, node, today)} pillTone={accent} over={overBy} />
  );

  // single-card fill + border
  const cardBg = solidFill ? fillBg : mode === 'planned' ? color.phaseSoft[node.lane] : 'rgba(255,255,255,0.6)';
  const cardBorder = solidFill ? `1px solid ${fillBorder}` : `1px dashed ${mode === 'planned' ? fillBorder : accent}`;
  // split head fill (in-progress with planned remaining): solid colour head, dashed light tail
  const headBg = mode === 'inprogress' ? fillBg : mode === 'blocked' ? 'rgba(216,99,46,0.10)' : '#fff';
  const headBorder = mode === 'inprogress' ? fillBorder : accent;

  return (
    <>
      {ghost && (
        <div aria-hidden style={{ position: 'absolute', top, left: Math.min(xs, gx), width: Math.abs(gx - xs), height: NODE_H, border: `1.5px dashed ${early ? color.state.early : color.state.late}`, borderRadius: 6, zIndex: 1, pointerEvents: 'none' }}>
          <span style={{ position: 'absolute', right: 4, top: -17, fontSize: 11, fontWeight: 600, color: early ? color.state.early : color.state.late, whiteSpace: 'nowrap' }}>{ghostDays}d {early ? 'early' : 'late'}</span>
        </div>
      )}
      {overdue && (
        <div aria-hidden className="flow-tt-hatch" style={{ position: 'absolute', top, left: xe, width: Math.max(0, xt - xe), height: NODE_H, borderTop: '1.5px dashed var(--c-block)', borderRight: '1.5px dashed var(--c-block)', borderBottom: '1.5px dashed var(--c-block)', borderTopRightRadius: 6, borderBottomRightRadius: 6, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, color: 'var(--c-block)', fontSize: 11, fontWeight: 700 }}>+{diffDays(node.end, today)}d</div>
      )}

      <div onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
        onPointerDown={draggable ? onStartMove : (ev) => ev.stopPropagation()}
        style={{
          position: 'absolute', top, left: xs, width, height: NODE_H,
          zIndex: interacting ? 8 : selected ? 6 : 2,
          cursor: canEdit ? (dragging ? 'grabbing' : 'grab') : 'default',
          opacity: dimmed ? 0.5 : mode === 'parked' ? 0.4 : mode === 'held' ? 0.6 : mode === 'paused' ? 0.85 : 1,
          filter: mode === 'parked' ? 'grayscale(0.7)' : mode === 'held' ? 'grayscale(0.45)' : mode === 'paused' ? 'grayscale(0.5)' : 'none',
          transition: interacting ? 'none' : 'opacity 160ms var(--ease-out)',
        }}>
        {split ? (
          <>
            <div aria-hidden style={{ position: 'absolute', right: 0, top: 0, bottom: 0, left: `${headFrac}%`, background: 'rgba(255,255,255,0.56)', borderTop: `1px dashed ${accent}`, borderRight: `1px dashed ${accent}`, borderBottom: `1px dashed ${accent}`, borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
            <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${headFrac}%`, minWidth: 6, background: headBg, border: `1px solid ${headBorder}`, borderRight: 'none', borderTopLeftRadius: 6, borderBottomLeftRadius: 6, boxShadow: 'var(--sh-bar)' }} />
          </>
        ) : (
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: cardBg, border: cardBorder, borderRadius: 6, boxShadow: solidFill ? 'var(--sh-bar)' : 'none' }} />
        )}
        {content}

        {/* live cap — a pulsing dot at today's edge while the phase is running */}
        {running && <span className="flow-pulse-dot" aria-hidden style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: 999, background: fillBorder, boxShadow: `0 0 0 3px ${fillBorder}40`, zIndex: 4, pointerEvents: 'none' }} />}

        {resizable && (hover || selected) && (
          <>
            <ResizeHandle side="l" accent={accent} onPointerDown={(ev) => onStartResize('l', ev)} />
            <ResizeHandle side="r" accent={accent} onPointerDown={(ev) => onStartResize('r', ev)} />
          </>
        )}
        {selected && <div aria-hidden style={{ position: 'absolute', inset: -2, borderRadius: 8, boxShadow: `0 0 0 2px ${accent}`, pointerEvents: 'none' }} />}
      </div>
    </>
  );
}

function NodeContent({ label, start, end, running, animate, onSolid, check, pill, pillTone, over }) {
  // On a solid colour block, text + chips go dark; on a light/dashed card they keep the tinted treatment.
  const dateColor = onSolid ? 'rgba(0,0,0,0.78)' : WARM.sub;
  const checkColor = onSolid ? 'rgba(0,0,0,0.82)' : pillTone;
  const pillBg = onSolid ? 'rgba(0,0,0,0.10)' : (typeof pillTone === 'string' && pillTone.startsWith('#') ? pillTone + '1A' : 'rgba(216,99,46,0.10)');
  const pillColor = onSolid ? 'rgba(0,0,0,0.72)' : pillTone;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '10px 12px', pointerEvents: 'none' }}>
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#131313', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {check && <span style={{ color: checkColor, display: 'inline-flex', flexShrink: 0 }}><IconCheckCircle size={14} /></span>}
          {pill && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: pillColor, background: pillBg, padding: '1px 6px', borderRadius: 999 }}>{pill}</span>}
          {over > 0 && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--c-held)', background: 'rgba(180,83,9,0.12)', padding: '1px 6px', borderRadius: 999 }}>{over}d over — done?</span>}
        </div>
        <span style={{ fontSize: 12, color: dateColor, overflow: 'hidden' }}><RollingDate start={start} end={end} running={running} animate={animate} /></span>
      </div>
    </div>
  );
}

// ─── Odometer date — day numbers roll like a slot counter while dragging/resizing ─
const ODO_H = 15;
function RollingDate({ start, end, running, animate }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: ODO_H, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      <RollingNumber value={start.getDate()} animate={animate} />
      <span>{MON[start.getMonth()]}</span>
      <span style={{ opacity: 0.7, margin: '0 1px' }}>→</span>
      {running ? <span>now</span> : <><RollingNumber value={end.getDate()} animate={animate} /><span>{MON[end.getMonth()]}</span></>}
    </span>
  );
}
function RollingNumber({ value, animate }) {
  const digits = String(value).split('').map(Number);
  return <span style={{ display: 'inline-flex', height: ODO_H }}>{digits.map((d, i) => <Digit key={i} d={d} animate={animate} />)}</span>;
}
function Digit({ d, animate }) {
  return (
    <span style={{ display: 'inline-block', width: '1ch', height: ODO_H, overflow: 'hidden', textAlign: 'center' }}>
      <span className={animate ? 'flow-odo-col' : undefined} style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${-d * ODO_H}px)` }}>
        {Array.from({ length: 10 }).map((_, n) => <span key={n} style={{ height: ODO_H, lineHeight: `${ODO_H}px` }}>{n}</span>)}
      </span>
    </span>
  );
}

function pillFor(mode, node, today) {
  if (mode === 'running') { const d = Math.max(1, Math.min(diffDays(node.start, today), diffDays(node.start, liveEnd(node)))); return `running ${d}d`; }
  if (mode === 'paused') return 'Paused';
  if (mode === 'inprogress') { const total = Math.max(1, diffDays(node.start, node.end)); const elapsed = clamp(diffDays(node.start, today), 0, total); return `${elapsed}d / ${total}d`; }
  if (mode === 'blocked') return 'Blocked';
  if (mode === 'held') return 'Held';
  if (mode === 'parked') return 'Parked';
  return null;
}

function ResizeHandle({ side, accent, onPointerDown }) {
  const [hover, setHover] = useState(false);
  return (
    <div onPointerDown={onPointerDown} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ position: 'absolute', top: 0, bottom: 0, [side === 'l' ? 'left' : 'right']: 0, width: EDGE, cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: side === 'l' ? 'flex-start' : 'flex-end', padding: '0 3px', zIndex: 9 }}>
      <span style={{ width: 3, height: 22, borderRadius: 999, background: accent, opacity: hover ? 1 : 0.45, transition: 'opacity 140ms var(--ease-out)' }} />
    </div>
  );
}

// ─── Draw preview ────────────────────────────────────────────────────────────
function DrawPreview({ x, laneIndex, laneKey, start, end, fg }) {
  const top = laneIndex * LANE_H + NODE_TOP;
  const xs = x(start), xe = x(end);
  return (
    <div aria-hidden style={{ position: 'absolute', top, left: xs, width: Math.max(MIN_NODE_PX, xe - xs), height: NODE_H, background: 'rgba(255,255,255,0.7)', border: `1.5px dashed ${fg}`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', zIndex: 8, boxShadow: 'var(--sh-bar)', overflow: 'hidden' }}>
      <div style={{ width: 2, height: 29, borderRadius: 2, background: fg, flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#131313' }}>{PHASE_LABELS[laneKey]}</span>
        <span style={{ fontSize: 12, color: fg, fontVariantNumeric: 'tabular-nums' }}>{fmt(start)} → {fmt(end)}</span>
      </div>
    </div>
  );
}

// ─── Empty-state Play (kick off the first phase) ─────────────────────────────
function PlayStart({ onStart, firstPhase }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 6, pointerEvents: 'none' }}>
      <button type="button" onClick={(e) => onStart(e.currentTarget.getBoundingClientRect())} onPointerDown={(e) => e.stopPropagation()} aria-label="Start the project"
        onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
        style={{ pointerEvents: 'auto', width: 64, height: 64, borderRadius: 999, background: WARM.ink, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hover ? '0 14px 30px rgba(61,22,2,0.28)' : '0 10px 24px rgba(61,22,2,0.20)', transform: hover ? 'scale(1.05)' : 'scale(1)', transition: 'transform 160ms var(--ease-spring), box-shadow 160ms var(--ease-out)' }}>
        <IconPlay />
      </button>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)' }}>Start the project</div>
        <div style={{ fontSize: 13, color: WARM.sub, marginTop: 3, lineHeight: '18px' }}>Choose which phases to kick off ({firstPhase} and beyond) and when.</div>
      </div>
    </div>
  );
}

// ─── Ship flag ───────────────────────────────────────────────────────────────
function ShipFlag({ leftPx, flip, date, shipped, height }) {
  const c = shipped ? '#B42318' : 'var(--c-block)';
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, left: leftPx, height, pointerEvents: 'none', zIndex: 6 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 0, borderLeft: shipped ? `2px solid ${c}` : `2px dashed ${c}` }} />
      <div style={{ position: 'absolute', top: 4, [flip ? 'right' : 'left']: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600, color: shipped ? '#fff' : c, background: shipped ? c : '#fff', border: shipped ? 'none' : `1px dashed ${c}` }}>
        {shipped ? '🚀 Shipped' : '⚑ Projected'} · {fmt(date)}
      </div>
    </div>
  );
}

// ─── Node menu ───────────────────────────────────────────────────────────────
function NodeMenu({ node, anchor, onClose, onState, onBegin, onPause, onResume, onCompleteAdvance, onMarkDone, onEditDates, onRemove }) {
  const [view, setView] = useState('root');
  const [doneDate, setDoneDate] = useState(() => (TODAY > node.start ? TODAY : node.end));
  const lbl = PHASE_LABELS[node.lane];
  const nl = nextLane(node.lane);
  const active = node.running || node.state === 'inprogress';
  // Mirror the bar: a running phase spans at least one day.
  const effEnd = node.running ? liveEnd(node) : node.end;
  return (
    <FloatingPopover anchor={anchor} width={view === 'done' ? 300 : 252} onClose={onClose}>
      <div className="flow-pd" style={{ padding: 6 }}>
        {view === 'root' ? (
          <>
            {/* Provenance — who last touched this run, as the first thing you see. */}
            {node.upd && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', marginBottom: 4, borderRadius: 8, background: WARM.hover }}>
                <span style={{ color: WARM.sub, display: 'inline-flex', marginTop: 1 }}><IconRevert /></span>
                <span style={{ fontSize: 12.5, lineHeight: '17px', color: 'var(--c-text-secondary)' }}>
                  <b style={{ color: 'var(--c-text-primary)', fontWeight: 600 }}>{node.upd.who}</b> {node.upd.label.toLowerCase()} · {node.upd.at}
                </span>
              </div>
            )}
            <div style={{ padding: '2px 10px 6px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--c-text-tertiary)' }}>{lbl}</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-secondary)', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{fmt(node.start)} → {fmt(effEnd)} · {Math.max(1, diffDays(node.start, effEnd))}d</div>
            </div>
            {active && (
              <button type="button" onClick={onCompleteAdvance}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', borderRadius: 8, background: WARM.ink, color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span style={{ display: 'inline-flex' }}><IconCheck size={14} /></span>
                {nl ? `Complete & start ${PHASE_LABELS[nl]}` : 'Complete phase'}
              </button>
            )}
            {node.running && <MenuRow icon={<IconPause size={13} />} label="Pause" onClick={onPause} />}
            {node.state === 'paused' && <MenuRow icon={<IconPlay size={13} />} label="Resume" onClick={onResume} />}
            {node.state === 'planned' && <MenuRow dot="#0F61FF" label="Start phase" onClick={onBegin} />}
            {node.state !== 'done' && <MenuRow dot="#00A86B" label="Mark done…" onClick={() => setView('done')} />}
            {node.state === 'done' && <MenuRow dot="#0F61FF" label="Reopen" onClick={onBegin} />}
            {node.state === 'inprogress' && !node.running && <MenuRow dot="#989FB3" label="Back to planned" onClick={() => onState('planned')} />}
            <MenuRow icon={<IconCalendar />} label="Edit dates…" onClick={onEditDates} />
            <div style={{ height: 1, background: 'var(--c-border-subtle)', margin: '4px 6px' }} />
            <MenuRow icon={<IconTrash />} label="Remove" danger onClick={onRemove} />
          </>
        ) : (
          <>
            <MenuHeader label={`Mark ${lbl} done`} onBack={() => setView('root')} />
            <div style={{ padding: '0 10px 4px', fontSize: 12, color: 'var(--c-text-secondary)' }}>Ends today by default — tap another day to backdate.</div>
            <Calendar selected={doneDate} onSelect={setDoneDate} />
            <div style={{ display: 'flex', gap: 8, padding: '0 12px 10px' }}>
              <GhostBtn onClick={() => setView('root')}>Cancel</GhostBtn>
              <PrimaryBtn onClick={() => onMarkDone(doneDate)}>Mark done · {fmt(doneDate)}</PrimaryBtn>
            </div>
          </>
        )}
      </div>
    </FloatingPopover>
  );
}

function MenuHeader({ label, onBack }) {
  return (
    <button type="button" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px 8px', color: 'var(--c-text-tertiary)', fontSize: 12, fontWeight: 600 }}>
      <IconBack /> {label}
    </button>
  );
}


function MenuRow({ icon, dot, label, onClick, danger, selected }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" role="menuitem" onClick={onClick} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 6, background: hover ? WARM.hover : 'transparent', color: danger ? '#B91C1C' : 'var(--c-text-primary)', fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'background 120ms var(--ease-out)' }}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flexShrink: 0 }} />}
      {icon && <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', color: danger ? '#B91C1C' : 'var(--c-text-secondary)' }}>{icon}</span>}
      <span style={{ flex: 1 }}>{label}</span>
      {selected && <span aria-hidden style={{ color: 'var(--c-text-action)' }}><svg width={14} height={14} viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
    </button>
  );
}

// ─── Overlap dialog ──────────────────────────────────────────────────────────
function OverlapDialog({ verb, count, lane, tone, onConfirm, onCancel }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } else if (e.key === 'Enter') onConfirm(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onConfirm, onCancel]);
  const body = verb === 'Replace'
    ? `Your ${lane} node now fully covers ${count} existing ${count === 1 ? 'node' : 'nodes'} in this lane. Replace ${count === 1 ? 'it' : 'them'} with this one?`
    : `This ${lane} node overlaps ${count} existing ${count === 1 ? 'node' : 'nodes'} in the same lane. Merge into one node spanning the full range?`;
  return createPortal(
    <div className="flow-pd" onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(27,20,16,0.28)', backdropFilter: 'blur(2px)', animation: 'flow-tt-fade 140ms var(--ease-out) both' }}>
      <div role="alertdialog" style={{ width: 392, maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 24px 60px rgba(27,20,16,0.24)', animation: 'flow-pop-out 200ms var(--ease-out) both' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${tone}1A`, color: tone }}><IconMerge /></span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-primary)' }}>{verb === 'Replace' ? 'Replace overlapping node?' : 'Merge overlapping nodes?'}</span>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: '19px', color: 'var(--c-text-secondary)' }}>{body}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onConfirm} autoFocus>{verb}</PrimaryBtn>
        </div>
      </div>
    </div>, document.body);
}

// ─── Banner ──────────────────────────────────────────────────────────────────
function Banner({ tone, text, right }) {
  const bg = tone === 'block' ? 'rgba(216,99,46,0.10)' : 'rgba(107,114,128,0.10)';
  const fg = tone === 'block' ? 'var(--c-block)' : 'var(--c-text-secondary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 16px', background: bg, fontSize: 13, color: fg, borderBottom: `1px solid ${WARM.border}` }}>
      <span>{text}</span>
      <span style={{ flexShrink: 0, fontWeight: 600 }}>{right}</span>
    </div>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────
function GhostBtn({ children, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={onClick} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: 'var(--c-text-secondary)', background: hover ? WARM.hover : '#fff', border: `1px solid ${WARM.border}`, transition: 'background 140ms var(--ease-out)' }}>
      {children}
    </button>
  );
}
function PrimaryBtn({ children, onClick, disabled, autoFocus }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={onClick} disabled={disabled} autoFocus={autoFocus}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      style={{ padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#fff', background: disabled ? 'var(--c-border-strong)' : hover ? '#23120A' : WARM.ink, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 140ms var(--ease-out)' }}>
      {children}
    </button>
  );
}

// ─── Glyphs & icons ──────────────────────────────────────────────────────────
function PhaseGlyph({ lane, size = 20 }) {
  const src = PHASE_ICON[lane];
  if (!src) return <span aria-hidden style={{ width: size, height: size, flexShrink: 0 }} />;
  return <img src={src} alt="" aria-hidden width={size} height={size} style={{ flexShrink: 0, display: 'block' }} />;
}
function IconPlus({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>; }
function IconCaret({ size = 12 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconBack({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconPlay({ size = 24 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5.6v12.8a1 1 0 0 0 1.52.85l10.3-6.4a1 1 0 0 0 0-1.7L10.02 4.75A1 1 0 0 0 8.5 5.6Z" /></svg>; }
function IconPause({ size = 16 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="1" /><rect x="9" y="3" width="3" height="10" rx="1" /></svg>; }
function IconRevert({ size = 13 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3.5 8a4.5 4.5 0 1 1 1.3 3.2M3.5 8V5.2M3.5 8h2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconCheck({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconCheckCircle({ size = 14 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" opacity="0.18" /><path d="M5 8l2 2 4-4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>; }
function IconTrash({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6.5 4V2.8h3V4M5 4.5l.5 8.2a1 1 0 0 0 1 .9h3a1 1 0 0 0 1-.9L11 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconCalendar({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconMerge({ size = 15 }) { return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M5 2v3.5C5 8 7 8.5 9 9s3 1.5 3 4M5 2L3.3 3.8M5 2l1.7 1.8M12 13h-2.5M12 13v-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
