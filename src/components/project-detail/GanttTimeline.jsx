import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  mockPhases,
  mockBars,
  mockMonths,
  PHASE_ORDER,
  PHASE_LABELS,
} from './mockProject.js';
import { color } from './ds.js';
import { FloatingPopover, Calendar } from './pickers.jsx';

// GanttTimeline — Figma 710:18540 (warm redesign, day-resolution interactions).
// ────────────────────────────────────────────────────────────────────────
// Internally everything is measured in DAYS (not weeks), so dragging/resizing
// moves one day at a time — smooth, never jumping a whole week.
//
//   • Phase chips — hover an active chip for an eye (hide/show its lane on the
//     chart) and a + (quick-add). Subtitle shows "Currently active" only while
//     today sits inside the phase's range, otherwise the date range itself.
//   • Per-node menu — the ⋯ sits inline after the name (reveal on hover); a
//     right-click anywhere on a node opens the same menu at the cursor. Items:
//     Edit dates · Change phase · Remove.
//   • Edge resize — grab a node's edge and drag (day steps). Hold Alt to scale
//     symmetrically from the center. Date labels roll like an odometer.
//   • Lane hover-plus — a + follows the cursor in empty lane space (suppressed
//     near node edges) and click-drag draws a new node.
//   • Overlaps are never silent — any commit that lands on another node opens a
//     Merge / Replace / Cancel dialog.

// ─── Warm palette ─────────────────────────────────────────────────────────
const WARM = {
  bg: '#FBF9F8',
  border: '#F1EAE4',
  hover: '#F4EEEB',
  labelMuted: '#6E5649',
  subMuted: '#8A6D5B',
  ink: '#3D1602',
  band: 'rgba(27, 20, 16, 0.04)',
  bandHover: 'rgba(27, 20, 16, 0.07)',
  warn: '#C2410C',
};

// ─── Layout — 6 lanes × 60px, 8px gaps, 8px top pad → 408px ───────────────
const LANE_H = 60;
const LANE_GAP = 8;
const TOP_PAD = 8;
const laneTop = (i) => TOP_PAD + i * (LANE_H + LANE_GAP);
const EDGE = 8; // px resize grab zone

// ─── Time model — day 0 = Jan 1, 2026 ─────────────────────────────────────
const EPOCH = new Date(2026, 0, 1);
const MS_DAY = 24 * 60 * 60 * 1000;
function dayToDate(day) {
  return new Date(EPOCH.getTime() + Math.round(day) * MS_DAY);
}
function mon(d) {
  return d.toLocaleDateString('en', { month: 'short' });
}
function fmtDay(d) {
  return `${d.getDate()} ${mon(d)}`;
}
function fmtRangeDays(startDay, spanDays) {
  return `${fmtDay(dayToDate(startDay))} → ${fmtDay(dayToDate(startDay + spanDays))}`;
}
// Compact: same month → "7–27 Feb"; cross-month → "7 Feb – 16 Mar".
function fmtRangeCompact(startDay, spanDays) {
  const s = dayToDate(startDay);
  const e = dayToDate(startDay + spanDays);
  const sM = mon(s);
  const eM = mon(e);
  if (sM === eM && s.getFullYear() === e.getFullYear()) return `${s.getDate()}–${e.getDate()} ${sM}`;
  return `${s.getDate()} ${sM} – ${e.getDate()} ${eM}`;
}
function todayDay() {
  return Math.floor((Date.now() - EPOCH.getTime()) / MS_DAY);
}

function rowForPhase(phaseKey) {
  const i = PHASE_ORDER.indexOf(phaseKey);
  return i === -1 ? 0 : i;
}
const overlaps = (aStart, aSpan, bStart, bSpan) =>
  aStart < bStart + bSpan && bStart < aStart + aSpan;

let barSeq = 0;
const nextBarKey = (phase) => `${phase}-${Date.now()}-${barSeq++}`;

// Selection outline — the node's own colour, a touch more saturated + darker so
// the ring reads against both the fill and the warm canvas.
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
function selectionRing(hex) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(h, Math.min(100, s + 8), Math.max(0, l - 10));
}

// History snapshot — bars arrays are immutable (always replaced, never mutated)
// so we can store the reference directly; serial powers change-detection.
function snap(bars, hidden) {
  const serial =
    bars.map((b) => `${b.key}|${b.phase}|${b.startDay}|${b.spanDays}`).sort().join(';') +
    '#' + [...hidden].sort().join(',');
  return { bars, hidden: [...hidden], serial };
}

// ════════════════════════════════════════════════════════════════════════
export default function GanttTimeline({
  phases: phasesProp = mockPhases,
  bars: barsProp = mockBars,
  months = mockMonths,
  rangeLabel = 'May 12 - Jul 23',
}) {
  const [bars, setBars] = useState(() =>
    barsProp.map((b) => ({
      key: b.key,
      phase: b.phase,
      label: b.label,
      light: b.light,
      startDay: b.startWeek * 7,
      spanDays: b.spanWeeks * 7,
    }))
  );
  const [hidden, setHidden] = useState(() => new Set());
  const [selectedKey, setSelectedKey] = useState(null);

  const chartRef = useRef(null);
  const barsRef = useRef(bars);
  barsRef.current = bars; // latest geometry for pointer handlers
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;

  // ── Undo / redo history ─────────────────────────────────────────────────
  const historyRef = useRef({ past: [], future: [] });
  const lastRef = useRef(null);
  if (lastRef.current === null) lastRef.current = snap(bars, hidden);

  const totalDays = months.reduce((sum, m) => sum + m.weeks, 0) * 7;
  const chartHeight = TOP_PAD + PHASE_ORDER.length * LANE_H + (PHASE_ORDER.length - 1) * LANE_GAP;

  const barsByPhase = useMemo(() => {
    const m = {};
    PHASE_ORDER.forEach((k) => (m[k] = []));
    bars.forEach((b) => (m[b.phase] ? m[b.phase].push(b) : (m[b.phase] = [b])));
    return m;
  }, [bars]);

  const isActive = (key) => (barsByPhase[key] || []).length > 0;
  const isHidden = (key) => hidden.has(key);

  // One range per gap-separated cluster. Touching / contiguous nodes merge into
  // a single range; a real gap yields a second range. So a Design lane that
  // runs 7–27 Feb and again 9–16 Mar reads as two ranges, not one 7 Feb→16 Mar.
  function phaseClusters(key) {
    const list = (barsByPhase[key] || []).slice().sort((a, b) => a.startDay - b.startDay);
    if (!list.length) return [];
    const clusters = [];
    let cur = { startDay: list[0].startDay, end: list[0].startDay + list[0].spanDays };
    for (let i = 1; i < list.length; i++) {
      const s = list[i].startDay;
      const e = s + list[i].spanDays;
      if (s <= cur.end) cur.end = Math.max(cur.end, e);
      else { clusters.push(cur); cur = { startDay: s, end: e }; }
    }
    clusters.push(cur);
    return clusters.map((c) => ({ startDay: c.startDay, spanDays: c.end - c.startDay }));
  }

  // ── Geometry (px ⇄ day ⇄ lane) ──────────────────────────────────────────
  function rect() {
    return chartRef.current?.getBoundingClientRect();
  }
  function dayFloatFromClientX(clientX) {
    const r = rect();
    if (!r) return 0;
    return ((clientX - r.left) / r.width) * totalDays;
  }
  function snapDayFromClientX(clientX) {
    return Math.max(0, Math.min(totalDays - 1, Math.round(dayFloatFromClientX(clientX))));
  }
  function laneFromClientY(clientY) {
    const r = rect();
    if (!r) return 0;
    const i = Math.floor((clientY - r.top - TOP_PAD) / (LANE_H + LANE_GAP));
    return Math.max(0, Math.min(PHASE_ORDER.length - 1, i));
  }

  // ── Mutations ───────────────────────────────────────────────────────────
  function unhide(phaseKey) {
    setHidden((prev) => {
      if (!prev.has(phaseKey)) return prev;
      const n = new Set(prev);
      n.delete(phaseKey);
      return n;
    });
  }
  function addBar(phaseKey, startDay, spanDays) {
    const s = Math.max(0, Math.min(totalDays - 1, startDay));
    const sp = Math.max(1, Math.min(totalDays - s, spanDays));
    const bar = { key: nextBarKey(phaseKey), phase: phaseKey, label: PHASE_LABELS[phaseKey], startDay: s, spanDays: sp };
    setBars((prev) => [...prev, bar]);
    unhide(phaseKey);
    return bar.key;
  }
  function quickAdd(phaseKey) {
    const lane = barsByPhase[phaseKey] || [];
    const lastEnd = lane.reduce((mx, b) => Math.max(mx, b.startDay + b.spanDays), 0);
    const span = 28; // ~4 weeks
    const start = Math.max(0, Math.min(totalDays - span, lastEnd ? lastEnd + 3 : 7));
    const key = addBar(phaseKey, start, span);
    // A quick-add can also land on a neighbour — resolve after commit.
    setTimeout(() => resolveConflicts(key, null, 'create'), 0);
  }
  function removeBar(key) {
    setBars((prev) => prev.filter((b) => b.key !== key));
  }
  function setBarGeom(key, startDay, spanDays) {
    setBars((prev) => prev.map((b) => (b.key === key ? { ...b, startDay, spanDays } : b)));
  }
  function changeBarPhase(key, phaseKey) {
    const bar = barsRef.current.find((b) => b.key === key);
    if (!bar || bar.phase === phaseKey) return;
    const restore = { phase: bar.phase, startDay: bar.startDay, spanDays: bar.spanDays };
    setBars((prev) => prev.map((b) => (b.key === key ? { ...b, phase: phaseKey, label: PHASE_LABELS[phaseKey] } : b)));
    unhide(phaseKey);
    setTimeout(() => resolveConflicts(key, restore, 'phase'), 0);
  }
  function toggleHidden(phaseKey) {
    setHidden((prev) => {
      const n = new Set(prev);
      n.has(phaseKey) ? n.delete(phaseKey) : n.add(phaseKey);
      return n;
    });
  }

  // ── Conflict resolution (merge / replace / cancel) ──────────────────────
  const [pending, setPending] = useState(null);
  function resolveConflicts(candidateKey, restore, kind) {
    const all = barsRef.current;
    const cand = all.find((b) => b.key === candidateKey);
    if (!cand) return;
    // Transitively absorb every same-lane node the candidate (and its growing
    // union) overlaps.
    let uStart = cand.startDay;
    let uEnd = cand.startDay + cand.spanDays;
    const conflicts = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of all) {
        if (b.key === candidateKey || b.phase !== cand.phase) continue;
        if (conflicts.includes(b.key)) continue;
        if (overlaps(uStart, uEnd - uStart, b.startDay, b.spanDays)) {
          conflicts.push(b.key);
          uStart = Math.min(uStart, b.startDay);
          uEnd = Math.max(uEnd, b.startDay + b.spanDays);
          changed = true;
        }
      }
    }
    if (!conflicts.length) return;
    const coversAll = conflicts.every((k) => {
      const c = all.find((b) => b.key === k);
      return cand.startDay <= c.startDay && cand.startDay + cand.spanDays >= c.startDay + c.spanDays;
    });
    setPending({
      key: candidateKey,
      kind,
      restore,
      conflicts,
      union: { startDay: uStart, spanDays: uEnd - uStart },
      verb: coversAll ? 'Replace' : 'Merge',
      phase: cand.phase,
      count: conflicts.length,
    });
  }
  function applyMerge() {
    const p = pending;
    if (!p) return;
    setBars((prev) =>
      prev
        .filter((b) => !p.conflicts.includes(b.key))
        .map((b) => (b.key === p.key ? { ...b, startDay: p.union.startDay, spanDays: p.union.spanDays } : b))
    );
    setPending(null);
  }
  function cancelMerge() {
    const p = pending;
    if (!p) return;
    if (p.kind === 'create') {
      setBars((prev) => prev.filter((b) => b.key !== p.key));
    } else {
      setBars((prev) => prev.map((b) => (b.key === p.key ? { ...b, ...p.restore } : b)));
    }
    setPending(null);
  }

  // ── Bar move ────────────────────────────────────────────────────────────
  const [dragKey, setDragKey] = useState(null);
  const moveRef = useRef({ start0: 0, day0: 0 });
  function startMove(bar, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    moveRef.current = { start0: bar.startDay, day0: dayFloatFromClientX(e.clientX) };
    setSelectedKey(bar.key); // click or drag selects
    setDragKey(bar.key);
  }
  useEffect(() => {
    if (!dragKey) return;
    function onMove(e) {
      const delta = Math.round(dayFloatFromClientX(e.clientX) - moveRef.current.day0);
      setBars((prev) =>
        prev.map((b) => {
          if (b.key !== dragKey) return b;
          const clamped = Math.max(0, Math.min(totalDays - b.spanDays, moveRef.current.start0 + delta));
          return clamped === b.startDay ? b : { ...b, startDay: clamped };
        })
      );
    }
    function onUp() {
      const bar = barsRef.current.find((b) => b.key === dragKey);
      const restore = { startDay: moveRef.current.start0, spanDays: bar?.spanDays };
      resolveConflicts(dragKey, restore, 'move');
      setDragKey(null);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [dragKey, totalDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edge resize (Alt = symmetric from center) ───────────────────────────
  const [resizeKey, setResizeKey] = useState(null);
  const resizeRef = useRef({ edge: 'r', start0: 0, span0: 0, day0: 0 });
  function startResize(bar, edge, e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { edge, start0: bar.startDay, span0: bar.spanDays, day0: dayFloatFromClientX(e.clientX) };
    setResizeKey(bar.key);
  }
  useEffect(() => {
    if (!resizeKey) return;
    function onMove(e) {
      const { edge, start0, span0, day0 } = resizeRef.current;
      const delta = Math.round(dayFloatFromClientX(e.clientX) - day0);
      const alt = e.altKey;
      let s = start0;
      let sp = span0;
      if (edge === 'r') {
        if (alt) { s = start0 - delta; sp = span0 + 2 * delta; }
        else sp = span0 + delta;
      } else {
        if (alt) { s = start0 + delta; sp = span0 - 2 * delta; }
        else { s = start0 + delta; sp = span0 - delta; }
      }
      if (sp < 1) sp = 1;
      if (s < 0) { sp = Math.max(1, sp + s); s = 0; }
      if (s + sp > totalDays) sp = totalDays - s;
      if (sp < 1) { sp = 1; s = Math.min(s, totalDays - 1); }
      setBars((prev) => prev.map((b) => (b.key === resizeKey ? { ...b, startDay: s, spanDays: sp } : b)));
    }
    function onUp() {
      const restore = { startDay: resizeRef.current.start0, spanDays: resizeRef.current.span0 };
      resolveConflicts(resizeKey, restore, 'resize');
      setResizeKey(null);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [resizeKey, totalDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lane hover-plus + draw ──────────────────────────────────────────────
  const [hoverLane, setHoverLane] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [nearBar, setNearBar] = useState(false);
  const [draw, setDraw] = useState(null);
  const [menu, setMenu] = useState(null); // { key, anchor }

  const busy = !!dragKey || !!resizeKey || !!draw;
  const showPlus =
    hoverLane != null && !nearBar && !busy && !menu && !pending && !isHidden(PHASE_ORDER[hoverLane]);

  // Suppress the + when the cursor is within a node's extent + a safe margin
  // (≥5% of the node width, min 10px) so it never crowds a resize edge.
  function computeNearBar(clientX, lane) {
    const r = rect();
    if (!r) return false;
    const x = clientX - r.left;
    const phaseKey = PHASE_ORDER[lane];
    if (isHidden(phaseKey)) return false;
    return (barsByPhase[phaseKey] || []).some((b) => {
      const left = (b.startDay / totalDays) * r.width;
      const right = ((b.startDay + b.spanDays) / totalDays) * r.width;
      const safe = Math.max(10, (right - left) * 0.05);
      return x >= left - safe && x <= right + safe;
    });
  }
  function onChartMove(e) {
    if (busy) return;
    const r = rect();
    if (!r) return;
    const lane = laneFromClientY(e.clientY);
    setHoverLane(lane);
    setHoverX(Math.max(0, Math.min(r.width, e.clientX - r.left)));
    setNearBar(computeNearBar(e.clientX, lane));
  }
  function onChartLeave() {
    if (busy) return;
    setHoverLane(null);
    setNearBar(false);
  }
  function onChartPointerDown(e) {
    if (e.button !== 0 || busy || menu || pending) return;
    setSelectedKey(null); // clicking empty lane space deselects
    const lane = laneFromClientY(e.clientY);
    const phaseKey = PHASE_ORDER[lane];
    if (isHidden(phaseKey)) return;
    const day = snapDayFromClientX(e.clientX);
    setDraw({ phase: phaseKey, lane, startDay: day, endDay: day, moved: false });
  }
  useEffect(() => {
    if (!draw) return;
    function onMove(e) {
      const day = snapDayFromClientX(e.clientX);
      setDraw((d) => (d ? { ...d, endDay: day, moved: d.moved || day !== d.startDay } : d));
    }
    function onUp() {
      setDraw((d) => {
        if (!d) return null;
        const a = Math.min(d.startDay, d.endDay);
        const b = Math.max(d.startDay, d.endDay);
        if (d.moved) {
          const key = addBar(d.phase, a, b - a);
          setTimeout(() => resolveConflicts(key, null, 'create'), 0);
        } else if (!(barsByPhase[d.phase] || []).length) {
          addBar(d.phase, a, Math.min(21, totalDays - a)); // ~3 weeks default
        }
        return null;
      });
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [draw, totalDays, barsByPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Record an undo point once a change settles (skip mid-drag and while a
  // dialog is open, so one gesture = one undo step).
  useEffect(() => {
    if (busy || pending) return;
    const cur = snap(bars, hidden);
    if (cur.serial === lastRef.current.serial) return;
    historyRef.current.past.push(lastRef.current);
    if (historyRef.current.past.length > 80) historyRef.current.past.shift();
    historyRef.current.future = [];
    lastRef.current = cur;
  }, [bars, hidden, busy, pending]);

  function applyHistoryState(s) {
    setBars(s.bars);
    setHidden(new Set(s.hidden));
    setSelectedKey(null);
    setMenu(null);
    setPending(null);
    setDraw(null);
  }
  function undo() {
    if (busy) return;
    const h = historyRef.current;
    if (!h.past.length) return;
    h.future.push(lastRef.current);
    const prev = h.past.pop();
    lastRef.current = prev;
    applyHistoryState(prev);
  }
  function redo() {
    if (busy) return;
    const h = historyRef.current;
    if (!h.future.length) return;
    h.past.push(lastRef.current);
    const next = h.future.pop();
    lastRef.current = next;
    applyHistoryState(next);
  }

  // Keyboard: undo/redo · delete selected · escape.
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      const inField = t && t.closest && t.closest('input, textarea, [contenteditable="true"], [data-floating-popover], [role="alertdialog"]');
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (inField) return;
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        if (inField) return;
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') {
        if (draw) setDraw(null);
        else if (menu) setMenu(null);
        else if (selectedKey) setSelectedKey(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKey && !busy && !pending) {
        if (inField) return;
        e.preventDefault();
        removeBar(selectedKey);
        setSelectedKey(null);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [draw, menu, selectedKey, busy, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live conflict flags for the in-flight bar / ghost.
  const activeKey = dragKey || resizeKey;
  const activeConflictKeys = useMemo(() => {
    if (!activeKey) return new Set();
    const cand = bars.find((b) => b.key === activeKey);
    if (!cand) return new Set();
    return new Set(
      bars
        .filter((b) => b.key !== activeKey && b.phase === cand.phase && overlaps(cand.startDay, cand.spanDays, b.startDay, b.spanDays))
        .map((b) => b.key)
    );
  }, [activeKey, bars]);
  const drawConflict =
    !!draw &&
    bars.some(
      (b) =>
        b.phase === draw.phase &&
        overlaps(Math.min(draw.startDay, draw.endDay), Math.abs(draw.endDay - draw.startDay) || 1, b.startDay, b.spanDays)
    );

  const visibleBars = bars.filter((b) => !isHidden(b.phase));
  const tDay = todayDay();
  // The currently-active week (the one containing today). Phases whose nodes
  // overlap it read "Currently active"; the axis highlights this week.
  const activeWeekIndex = tDay >= 0 && tDay < totalDays ? Math.floor(tDay / 7) : -1;
  const activeWeekStart = activeWeekIndex * 7;
  const isCurrentlyActive = (key) =>
    activeWeekIndex >= 0 && (barsByPhase[key] || []).some((b) => overlaps(b.startDay, b.spanDays, activeWeekStart, 7));

  // Heading date = overall span of every node (earliest start → latest end).
  const headerRange = bars.length
    ? `${fmtDay(dayToDate(Math.min(...bars.map((b) => b.startDay))))} - ${fmtDay(dayToDate(Math.max(...bars.map((b) => b.startDay + b.spanDays))))}`
    : rangeLabel;

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--f-sans)', fontSize: 16, fontWeight: 600, color: 'var(--c-text-primary)', letterSpacing: '-0.1px' }}>Track timeline</span>
        <span style={{ fontFamily: 'var(--f-sans)', paddingTop: 2, fontSize: 14, fontWeight: 400, color: WARM.labelMuted, letterSpacing: '-0.1px', fontVariantNumeric: 'tabular-nums' }}>{headerRange}</span>
      </div>

      {/* Phase chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch', width: '100%', marginBottom: 16, isolation: 'isolate' }}>
        {PHASE_ORDER.map((key, i) => (
          <PhaseChip
            key={key}
            phaseKey={key}
            label={PHASE_LABELS[key]}
            hasNodes={isActive(key)}
            current={isCurrentlyActive(key)}
            hidden={isHidden(key)}
            ranges={phaseClusters(key)}
            zIndex={PHASE_ORDER.length - i}
            onAdd={() => quickAdd(key)}
            onToggleHidden={() => toggleHidden(key)}
          />
        ))}
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', background: WARM.bg, border: `1px solid ${WARM.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div
          ref={chartRef}
          onPointerMove={onChartMove}
          onPointerLeave={onChartLeave}
          onPointerDown={onChartPointerDown}
          style={{ position: 'relative', width: '100%', height: chartHeight, touchAction: 'none' }}
        >
          <MonthGrid months={months} />

          {/* Only hidden lanes get a backdrop. Empty lanes stay blank — the
              hover-+ is their only affordance. */}
          {PHASE_ORDER.map((key, i) =>
            isHidden(key) ? <LaneBand key={key} top={laneTop(i)} label={PHASE_LABELS[key]} /> : null
          )}

          {visibleBars.map((bar) => (
            <Bar
              key={bar.key}
              bar={bar}
              totalDays={totalDays}
              top={laneTop(rowForPhase(bar.phase))}
              dragging={dragKey === bar.key}
              resizing={resizeKey === bar.key}
              menuOpen={menu?.key === bar.key}
              dimmed={(!!dragKey || !!resizeKey) && dragKey !== bar.key && resizeKey !== bar.key}
              conflict={activeKey === bar.key && activeConflictKeys.size > 0}
              flagged={activeConflictKeys.has(bar.key)}
              selected={selectedKey === bar.key}
              onNear={setNearBar}
              onStartMove={(e) => startMove(bar, e)}
              onStartResize={(edge, e) => startResize(bar, edge, e)}
              onOpenMenu={(anchor) => { setSelectedKey(bar.key); setMenu({ key: bar.key, anchor }); }}
            />
          ))}

          {draw && (
            <GhostBar
              phaseKey={draw.phase}
              top={laneTop(draw.lane)}
              startDay={Math.min(draw.startDay, draw.endDay)}
              spanDays={Math.abs(draw.endDay - draw.startDay) || 1}
              totalDays={totalDays}
              conflict={drawConflict}
            />
          )}

          {showPlus && <HoverPlus x={hoverX} top={laneTop(hoverLane)} />}
        </div>

        <MonthAxis months={months} activeWeekIndex={activeWeekIndex} />
      </div>

      {menu && (() => {
        const bar = bars.find((b) => b.key === menu.key);
        if (!bar) return null;
        return (
          <BarMenu
            anchor={menu.anchor}
            bar={bar}
            onClose={() => setMenu(null)}
            onEditDates={(s, sp) => setBarGeom(bar.key, s, sp)}
            onChangePhase={(p) => changeBarPhase(bar.key, p)}
            onRemove={() => removeBar(bar.key)}
            afterEditResolve={() => setTimeout(() => resolveConflicts(bar.key, { startDay: bar.startDay, spanDays: bar.spanDays }, 'resize'), 0)}
          />
        );
      })()}

      {pending && (
        <ConfirmDialog
          title="Overlapping nodes"
          message={
            pending.verb === 'Replace'
              ? `This node fully covers an existing ${PHASE_LABELS[pending.phase]} node. Replace it, or cancel.`
              : `This node overlaps ${pending.count > 1 ? `${pending.count} existing nodes` : 'an existing node'} in ${PHASE_LABELS[pending.phase]}. Merge into one, or cancel.`
          }
          confirmLabel={pending.verb}
          tone={color.phase[pending.phase]}
          onConfirm={applyMerge}
          onCancel={cancelMerge}
        />
      )}
    </section>
  );
}

// ─── Month vertical grid ──────────────────────────────────────────────────
function MonthGrid({ months }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
      {months.map((m, i) => (
        <div key={m.key} style={{ flex: '1 0 0', minWidth: 0, borderRight: i < months.length - 1 ? `1px solid ${WARM.border}` : 'none' }} />
      ))}
    </div>
  );
}

// ─── Lane band — only shown for a HIDDEN lane ─────────────────────────────
function LaneBand({ top, label }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', top, left: 0, right: 0, height: LANE_H,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: WARM.band, pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      <span style={{ fontFamily: 'var(--f-sans)', fontWeight: 500, fontSize: 14, lineHeight: '20px', letterSpacing: '-0.1px', color: WARM.subMuted }}>{label}</span>
      <span aria-hidden style={{ width: 4, height: 4, borderRadius: 999, background: WARM.subMuted, display: 'inline-block' }} />
      <span style={{ fontFamily: 'var(--f-sans)', fontWeight: 500, fontSize: 14, lineHeight: '20px', letterSpacing: '-0.1px', color: WARM.subMuted }}>Hidden</span>
    </div>
  );
}

// ─── Hover-plus ───────────────────────────────────────────────────────────
// Outer wrapper owns the centering transform (kept stable); inner owns the
// entrance animation. Keeping them separate stops the keyframe's transform from
// clobbering translate(-50%,-50%) — which is what made the + sit low/right.
function HoverPlus({ x, top }) {
  return (
    <div aria-hidden style={{ position: 'absolute', left: x, top: top + LANE_H / 2, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 7 }}>
      <div
        style={{
          width: 26, height: 26, borderRadius: 999, background: '#fff', border: `1px solid ${WARM.border}`,
          boxShadow: '0 2px 6px rgba(61, 22, 2, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: WARM.ink, animation: 'flow-tt-pop 140ms var(--ease-out) both',
        }}
      >
        <PlusMini size={14} />
      </div>
    </div>
  );
}

// ─── Bar ──────────────────────────────────────────────────────────────────
function Bar({ bar, totalDays, top, dragging, resizing, menuOpen, dimmed, conflict, flagged, selected, onNear, onStartMove, onStartResize, onOpenMenu }) {
  const [hover, setHover] = useState(false);
  const dotsRef = useRef(null);
  const fg = color.phase[bar.phase];
  const isLight = bar.light;
  const leftPct = (bar.startDay / totalDays) * 100;
  const widthPct = (bar.spanDays / totalDays) * 100;
  const lifted = hover && !dragging && !resizing && !dimmed;
  const active = hover || menuOpen;
  const interacting = dragging || resizing;

  // Conflict ring wins; otherwise a selected node gets an inset outline in its
  // own (slightly punchier) colour.
  const ring = conflict
    ? `0 0 0 2px #fff, 0 0 0 4px ${WARM.warn}`
    : flagged
      ? `0 0 0 2px #fff, 0 0 0 4px ${WARM.warn}66`
      : null;
  const selRing = selected && !ring ? `inset 0 0 0 2px ${selectionRing(fg)}` : null;

  const baseShadow = interacting
    ? '0 12px 28px rgba(61, 22, 2, 0.18), 0 4px 8px rgba(61, 22, 2, 0.08)'
    : lifted
      ? '0 6px 14px rgba(61, 22, 2, 0.14), 0 1px 2px rgba(61, 22, 2, 0.08)'
      : isLight
        ? null
        : '0 1px 1px rgba(0,0,0,0.08), 0 3px 1.5px rgba(0,0,0,0.07), 0 7px 2px rgba(0,0,0,0.04)';
  const boxShadow = ring
    ? ring + ', 0 8px 20px rgba(61,22,2,0.16)'
    : [selRing, baseShadow].filter(Boolean).join(', ') || 'none';

  return (
    <div
      onPointerEnter={() => { setHover(true); onNear(true); }}
      onPointerLeave={() => { setHover(false); onNear(false); }}
      onPointerDown={onStartMove}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenMenu({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY });
      }}
      style={{
        position: 'absolute', top, left: `${leftPct}%`, width: `${widthPct}%`, height: LANE_H,
        background: isLight ? color.phaseSoft[bar.phase] : fg,
        border: isLight ? `1px solid ${WARM.bg}` : 'none',
        borderRadius: 6, padding: '10px 12px', color: isLight ? fg : '#fff',
        boxShadow,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
        cursor: dragging ? 'grabbing' : 'grab', opacity: dimmed ? 0.5 : 1, overflow: 'hidden',
        transform: lifted ? 'translateY(-1px)' : 'translateY(0)',
        zIndex: interacting || menuOpen ? 8 : lifted ? 6 : 2,
        transition: interacting ? 'box-shadow 120ms var(--ease-out)' : 'transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out), opacity 160ms var(--ease-out)',
      }}
    >
      {/* Name + inline ⋯ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--f-sans)', fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {bar.label}
        </span>
        <button
          ref={dotsRef}
          type="button"
          aria-label="Node options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onOpenMenu(dotsRef.current.getBoundingClientRect()); }}
          style={{
            flexShrink: 0, width: 22, height: 18, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: menuOpen ? (isLight ? 'rgba(61,22,2,0.10)' : 'rgba(255,255,255,0.28)') : 'transparent',
            color: isLight ? fg : '#fff',
            opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(0.8)', pointerEvents: active ? 'auto' : 'none',
            transition: 'opacity 150ms var(--ease-out), transform 180ms var(--ease-out), background 140ms var(--ease-out)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = isLight ? 'rgba(61,22,2,0.10)' : 'rgba(255,255,255,0.28)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = menuOpen ? (isLight ? 'rgba(61,22,2,0.10)' : 'rgba(255,255,255,0.28)') : 'transparent')}
        >
          <DotsH size={14} />
        </button>
      </div>

      {/* Date row with odometer */}
      <div style={{ fontFamily: 'var(--f-sans)', fontSize: 12, fontWeight: 400, lineHeight: '16px', letterSpacing: '-0.1px', opacity: 0.92, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <RollingDate startDay={bar.startDay} spanDays={bar.spanDays} animate={interacting} />
      </div>

      <ResizeHandle side="l" show={active && !dragging} onPointerDown={(e) => onStartResize('l', e)} isLight={isLight} />
      <ResizeHandle side="r" show={active && !dragging} onPointerDown={(e) => onStartResize('r', e)} isLight={isLight} />
    </div>
  );
}

function ResizeHandle({ side, show, onPointerDown, isLight }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        position: 'absolute', top: 0, bottom: 0, [side === 'l' ? 'left' : 'right']: 0, width: EDGE + 4,
        cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: side === 'l' ? 'flex-start' : 'flex-end',
        padding: '0 3px', zIndex: 3,
      }}
    >
      <span aria-hidden style={{ width: 3, height: 22, borderRadius: 999, background: isLight ? 'rgba(61,22,2,0.35)' : 'rgba(255,255,255,0.85)', opacity: show && hover ? 1 : 0, transition: 'opacity 140ms var(--ease-out)' }} />
    </div>
  );
}

// ─── Odometer date label ──────────────────────────────────────────────────
const DIGIT_H = 16;
function RollingDate({ startDay, spanDays, animate }) {
  const s = dayToDate(startDay);
  const e = dayToDate(startDay + spanDays);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontVariantNumeric: 'tabular-nums' }}>
      <RollingNumber value={s.getDate()} animate={animate} />
      <MonthLabel value={mon(s)} />
      <span style={{ opacity: 0.8 }}>→</span>
      <RollingNumber value={e.getDate()} animate={animate} />
      <MonthLabel value={mon(e)} />
    </span>
  );
}
function RollingNumber({ value, animate }) {
  const digits = String(value).split('').map(Number);
  return (
    <span style={{ display: 'inline-flex', height: DIGIT_H }}>
      {digits.map((d, i) => (
        <Digit key={i} d={d} animate={animate} />
      ))}
    </span>
  );
}
function Digit({ d, animate }) {
  return (
    <span style={{ display: 'inline-block', width: '1ch', height: DIGIT_H, overflow: 'hidden', textAlign: 'center' }}>
      <span
        className={animate ? 'flow-odo-col' : undefined}
        style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${-d * DIGIT_H}px)` }}
      >
        {Array.from({ length: 10 }).map((_, n) => (
          <span key={n} style={{ height: DIGIT_H, lineHeight: `${DIGIT_H}px` }}>{n}</span>
        ))}
      </span>
    </span>
  );
}
function MonthLabel({ value }) {
  return <span style={{ display: 'inline-block' }}>{value}</span>;
}

// ─── Ghost bar (draw preview) ─────────────────────────────────────────────
function GhostBar({ phaseKey, top, startDay, spanDays, totalDays, conflict }) {
  const fg = color.phase[phaseKey];
  return (
    <div
      style={{
        position: 'absolute', top, left: `${(startDay / totalDays) * 100}%`, width: `${(spanDays / totalDays) * 100}%`, height: LANE_H,
        background: fg, opacity: 0.9,
        border: conflict ? `1.5px dashed ${WARM.warn}` : '1.5px dashed rgba(255,255,255,0.7)',
        boxShadow: conflict ? `0 0 0 2px #fff, 0 0 0 4px ${WARM.warn}, 0 6px 14px rgba(61,22,2,0.16)` : '0 6px 14px rgba(61, 22, 2, 0.16)',
        borderRadius: 6, padding: '10px 12px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
        pointerEvents: 'none', overflow: 'hidden', zIndex: 8,
      }}
    >
      <span style={{ fontFamily: 'var(--f-sans)', fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.1px' }}>{PHASE_LABELS[phaseKey]}</span>
      <span style={{ fontFamily: 'var(--f-sans)', fontSize: 12, fontWeight: 400, lineHeight: '16px', letterSpacing: '-0.1px', fontVariantNumeric: 'tabular-nums' }}>{fmtRangeDays(startDay, spanDays)}</span>
    </div>
  );
}

// ─── Bar menu (click ⋯ or right-click) ────────────────────────────────────
function BarMenu({ anchor, bar, onClose, onEditDates, onChangePhase, onRemove, afterEditResolve }) {
  const [view, setView] = useState('root');
  return createPortal(
    <FloatingPopover anchor={anchor} onClose={onClose} width={view === 'dates' ? 300 : 232}>
      <div className="flow-pd" style={{ fontFamily: 'var(--f-sans)' }}>
        {view === 'root' && (
          <div style={{ padding: 6 }}>
            <MenuRow icon={<CalendarMini />} label="Edit dates" onClick={() => setView('dates')} />
            <MenuRow icon={<SwapMini />} label="Change phase" chevron onClick={() => setView('phase')} />
            <div style={{ height: 1, background: 'var(--c-border-subtle)', margin: '4px 6px' }} />
            <MenuRow icon={<TrashMini />} label="Remove node" danger onClick={() => { onRemove(); onClose(); }} />
          </div>
        )}
        {view === 'phase' && (
          <div style={{ padding: 6 }}>
            <MenuHeader label="Move to phase" onBack={() => setView('root')} />
            {PHASE_ORDER.map((k) => (
              <MenuRow key={k} icon={<Diamond color={color.phase[k]} />} label={PHASE_LABELS[k]} selected={k === bar.phase} onClick={() => { onChangePhase(k); onClose(); }} />
            ))}
          </div>
        )}
        {view === 'dates' && (
          <BarDateEditor
            bar={bar}
            onBack={() => setView('root')}
            onApply={(s, sp) => { onEditDates(s, sp); afterEditResolve(); onClose(); }}
          />
        )}
      </div>
    </FloatingPopover>,
    document.body
  );
}

function MenuHeader({ label, onBack }) {
  return (
    <button type="button" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 8px 8px', color: 'var(--c-text-tertiary)', fontSize: 12, fontWeight: 600, letterSpacing: '-0.05px' }}>
      <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><ChevronMini /></span>
      {label}
    </button>
  );
}
function MenuRow({ icon, label, onClick, chevron, selected, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button" role="menuitem" onClick={onClick}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.985)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 6,
        background: hover ? WARM.hover : 'transparent', color: danger ? '#B91C1C' : 'var(--c-text-primary)',
        fontSize: 13, fontWeight: 500, letterSpacing: '-0.05px', textAlign: 'left',
        transition: 'background 120ms var(--ease-out), transform 120ms var(--ease-out)',
      }}
    >
      <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', color: danger ? '#B91C1C' : 'var(--c-text-secondary)' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {chevron && <span style={{ color: 'var(--c-text-muted)' }}><ChevronMini /></span>}
      {selected && (
        <span aria-hidden style={{ color: 'var(--c-text-action)' }}>
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      )}
    </button>
  );
}

function BarDateEditor({ bar, onBack, onApply }) {
  const [startDate, setStartDate] = useState(() => dayToDate(bar.startDay));
  const [endDate, setEndDate] = useState(() => dayToDate(bar.startDay + bar.spanDays));
  const [tab, setTab] = useState('start');
  const startDay = Math.round((startDate - EPOCH) / MS_DAY);
  const endDay = Math.round((endDate - EPOCH) / MS_DAY);
  const valid = endDay > startDay;
  return (
    <div>
      <MenuHeader label="Edit dates" onBack={onBack} />
      <div style={{ display: 'flex', gap: 4, padding: '0 10px 8px' }}>
        {[['start', 'Start', startDate], ['end', 'End', endDate]].map(([k, lbl, d]) => (
          <button
            key={k} type="button" onClick={() => setTab(k)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, padding: '6px 8px', borderRadius: 8,
              border: `1px solid ${tab === k ? 'var(--c-text-action)' : WARM.border}`, background: tab === k ? 'rgba(15,97,255,0.06)' : '#fff',
              transition: 'border-color 120ms var(--ease-out), background 120ms var(--ease-out)',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2px', color: 'var(--c-text-tertiary)', textTransform: 'uppercase' }}>{lbl}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtDay(d)}</span>
          </button>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${WARM.border}` }}>
        <Calendar selected={tab === 'start' ? startDate : endDate} onSelect={(d) => (tab === 'start' ? setStartDate(d) : setEndDate(d))} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '4px 12px 12px' }}>
        <DialogButton variant="ghost" onClick={onBack}>Cancel</DialogButton>
        <DialogButton variant="primary" disabled={!valid} onClick={() => onApply(startDay, endDay - startDay)}>Apply</DialogButton>
      </div>
    </div>
  );
}

// ─── Confirm dialog (centered modal) ──────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, tone, onConfirm, onCancel }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onConfirm, onCancel]);

  return createPortal(
    <div
      className="flow-pd"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(27, 20, 16, 0.28)', backdropFilter: 'blur(2px)', animation: 'flow-tt-fade 140ms var(--ease-out) both',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <div
        role="alertdialog"
        aria-label={title}
        style={{
          width: 360, maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 16, padding: 20,
          boxShadow: '0 24px 60px rgba(27,20,16,0.24), 0 8px 24px rgba(27,20,16,0.12)',
          animation: 'flow-pop-out 200ms var(--ease-out) both', transformOrigin: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `${tone}1A`, color: tone }}>
            <MergeMini />
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.2px', color: 'var(--c-text-primary)' }}>{title}</span>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: '19px', color: 'var(--c-text-secondary)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <DialogButton variant="ghost" onClick={onCancel}>Cancel</DialogButton>
          <DialogButton variant="primary" autoFocus onClick={onConfirm}>{confirmLabel}</DialogButton>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DialogButton({ children, variant = 'ghost', onClick, disabled, autoFocus }) {
  const [hover, setHover] = useState(false);
  const primary = variant === 'primary';
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} autoFocus={autoFocus}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{
        minWidth: 84, padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, letterSpacing: '-0.05px',
        background: primary ? (disabled ? 'var(--c-border-strong)' : hover ? '#23120A' : WARM.ink) : hover ? WARM.hover : WARM.bg,
        color: primary ? '#fff' : 'var(--c-text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer', flex: variant === 'primary' && !autoFocus ? 1 : '0 0 auto',
        transition: 'background 140ms var(--ease-out), transform 120ms var(--ease-out)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Month axis (with active-week highlight pill) ─────────────────────────
function MonthAxis({ months, activeWeekIndex }) {
  let weekOffset = 0;
  return (
    <div style={{ display: 'flex', borderTop: `1px solid ${WARM.border}`, background: WARM.bg, width: '100%' }}>
      {months.map((m, i) => {
        const monthStart = weekOffset;
        weekOffset += m.weeks;
        return (
          <div key={m.key} style={{ flex: '1 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 16px', borderRight: i < months.length - 1 ? `1px solid ${WARM.border}` : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              {Array.from({ length: m.weeks }).map((_, w) => {
                const isActive = monthStart + w === activeWeekIndex;
                return (
                  <span key={w} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* z-0 solid pill behind the label (26×20, centered), never clipped */}
                    {isActive && (
                      <span aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 26, height: 20, borderRadius: 4, background: WARM.subMuted, zIndex: 0 }} />
                    )}
                    <span style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--f-sans)', fontSize: 14, fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.1px', color: isActive ? WARM.bg : WARM.subMuted, fontVariantNumeric: 'tabular-nums' }}>W{w + 1}</span>
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', padding: '8px 0', width: '100%' }}>
              <span style={{ fontFamily: 'var(--f-sans)', fontSize: 14, fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.1px', color: 'var(--c-text-primary)' }}>{m.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Phase chip ───────────────────────────────────────────────────────────
// One unified card. Lane visibility (eye) drives bg + icons; node presence
// drives the diamond + subtitle. Icons only appear on hover.
function PhaseChip({ phaseKey, label, hasNodes, current, hidden, ranges = [], zIndex, onAdd, onToggleHidden }) {
  const [hover, setHover] = useState(false);
  const fg = color.phase[phaseKey];

  let sub;
  if (current) {
    sub = (
      <>
        <LiveDot />
        <span style={subStyle('var(--c-text-action)')}>Currently active</span>
      </>
    );
  } else if (ranges.length) {
    // One line per range — a multi-cluster phase shows each set, not the union.
    sub = (
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {ranges.map((r, i) => (
          <span key={i} style={{ ...subStyle(WARM.subMuted), lineHeight: '18px' }}>{fmtRangeCompact(r.startDay, r.spanDays)}</span>
        ))}
      </div>
    );
  } else {
    sub = <span style={subStyle(WARM.subMuted)}>No dates</span>;
  }

  return (
    <div
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        flex: '1 1 0', minWidth: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0,
        padding: 10, background: hidden ? WARM.bg : '#fff', border: `1px solid ${WARM.border}`, borderRadius: 8, zIndex,
        transition: 'background 180ms var(--ease-out)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minHeight: 20 }}>
        {hasNodes && <Diamond color={fg} />}
        <span style={{ flex: '1 1 0', minWidth: 0, fontFamily: 'var(--f-sans)', fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.1px', color: 'var(--c-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: hover ? 1 : 0, transform: hover ? 'translateX(0)' : 'translateX(2px)', pointerEvents: hover ? 'auto' : 'none', transition: 'opacity 160ms var(--ease-out), transform 180ms var(--ease-out)' }}>
          {hidden ? (
            <ChipIconBtn label={`Show ${label} on chart`} onClick={onToggleHidden}><EyeOffMini /></ChipIconBtn>
          ) : (
            <>
              <ChipIconBtn label={`Hide ${label} from chart`} onClick={onToggleHidden}><EyeMini /></ChipIconBtn>
              <ChipIconBtn label={`Add ${label} node`} onClick={onAdd}><PlusMini size={12} /></ChipIconBtn>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minHeight: 20 }}>{sub}</div>
    </div>
  );
}

function subStyle(c) {
  return { fontFamily: 'var(--f-sans)', fontSize: 12, fontWeight: 400, lineHeight: '20px', letterSpacing: '-0.1px', color: c, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 };
}

function LiveDot() {
  return <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--c-text-action)', boxShadow: '0 0 0 3px rgba(15, 97, 255, 0.18)', flexShrink: 0, display: 'inline-block' }} />;
}

function ChipIconBtn({ children, label, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{ width: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: hover ? WARM.hover : WARM.bg, color: WARM.ink, transition: 'background 120ms var(--ease-out), transform 120ms var(--ease-out)' }}
    >
      {children}
    </button>
  );
}

// ─── Inline icons ─────────────────────────────────────────────────────────
function PlusMini({ size = 12 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
function DotsH({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor"><circle cx="3.2" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="12.8" cy="8" r="1.4" /></svg>;
}
function EyeMini({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function EyeOffMini({ size = 13 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M6.3 6.3a2 2 0 0 0 2.8 2.8M3.2 4.4C2 5.4 1.5 8 1.5 8s2 4.5 6.5 4.5c1 0 1.9-.2 2.7-.6M6.5 3.7A6 6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a12 12 0 0 1-1.8 2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
function ChevronMini({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CalendarMini({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
function SwapMini({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 6h8l-2.2-2.2M13 10H5l2.2 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function TrashMini({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6.5 4V2.8h3V4M5 4.5l.5 8.2a1 1 0 0 0 1 .9h3a1 1 0 0 0 1-.9L11 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function MergeMini({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M5 2v3.5C5 8 7 8.5 9 9s3 1.5 3 4M5 2L3.3 3.8M5 2l1.7 1.8M12 13h-2.5M12 13v-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Diamond({ color: c, size = 9 }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: 2, background: c, transform: 'rotate(45deg)', flexShrink: 0, display: 'inline-block' }} />;
}
