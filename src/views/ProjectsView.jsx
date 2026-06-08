// Flow — Projects View (Rebuild v2: Pulse structural model + PeopleDeepDive history model)
// Two states: Registry (Pulse-style table with tabs) → Project Deep Dive (PeopleDeepDive-style)
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion as Motion } from "framer-motion";
import { createPortal } from "react-dom";
import { c, isDark, typo, space, layout, motion, phaseNames, shipPhases, allPhases, trackNames, typeConfig, phaseColors as getPhaseColors, phaseMids as getPhaseMids, phaseDims as getPhaseDims, statusColors, statusConfig, entityColors, colWidths } from "../styles/theme";
import { Badge, Tag, Modal, SideSheet, Tooltip, Label, Btn, Inp, Sel, SearchSelect, EmptyState, TelemetryLabel, Th as SharedTh, TableShell, StickyLeftTd } from "../components/shared";
import { KpiGrid, KpiCard, SectionHead, SegmentedToggle, Pill, PillRow } from "../components/kpi";
import { Icon } from "../components/icons";
import useKeyboard from "../hooks/useKeyboard";
import useExitAnimation from "../hooks/useExitAnimation";
import GanttChart from "../components/GanttChart";
import FlowLogo from "../components/FlowLogo";
import ProjectActivity from "../components/ProjectActivity";
import ProjectTimeline from "../components/ProjectTimeline";
import TrackGantt from "../components/TrackGantt";
import ProjectDetailSheet from "../components/project-detail/ProjectDetailSheet.jsx";
import { mapProjectSections } from "../components/project-detail/mapProject.js";
import { isDevSeedMode, devStore } from "../data/devSeed";
import { getProjectRole, can as defaultCan } from "../lib/permissions";
import { initialsOf } from "../lib/names";
import { timeAgo, isStale, fmtAbsolute } from "../lib/time";
import { getProjectDependencies, deleteProjectFromDB, updateProjectInDB, addProjectLinkToDB, deleteProjectLinkFromDB, startTrackInDB, completeTrackInDB, reopenTrackInDB, shipProjectInDB } from "../lib/mutations";
import { getActiveTracks, getTrackStatus, getTrackActiveDays, getCompletedTracks, derivePrimaryPhase } from "../lib/tracks";
import { supabase } from "../lib/supabase";
import useDevLabel from "../hooks/useDevLabel";


// Phase scope for the In Flight vs Shipped tab filter.
// Kept local to this view — `shipPhases` (Alpha/Beta/GA) in theme.js is
// unchanged and still correct for metrics, colors, and stage validation
// (where Alpha/Beta count as "released to users").
const IN_FLIGHT_PHASES = ["PRD", "Design", "Dev", "QA"];
const SHIPPED_PHASES = ["Alpha", "Beta", "GA"];

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */
const ensureStatus = (p) => ({ ...p, status: p.status || "active" });

const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
};

const fmtDate = (d) => {
  if (!d) return "—";
  const [, m, day] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]}`;
};

// statusColors imported from theme.js


/* ══════════════════════════════════════════════════════════════════
   GANTT MULTI-SELECT FILTER — dropdown with checkboxes
   ══════════════════════════════════════════════════════════════════ */
function GanttMultiFilter({ label, options, selected, onToggle, onClear }) {
  useDevLabel('GanttMultiFilter', 'src/views/ProjectsView.jsx', 'Multi-select dropdown filter with checkboxes for Gantt chart filtering');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const active = selected.length > 0;
  const anim = useExitAnimation(open, 180);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="flow-btn" onClick={() => setOpen(o => !o)} style={{
        padding: `${space[1]}px ${space[2]}px`,
        borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
        background: active ? c.accentDim : c.surfaceAlt,
        color: active ? c.accent : c.textDim,
        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
        cursor: "pointer", outline: "none",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {active ? `${label} (${selected.length})` : `All ${label}`}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={active ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: `transform ${motion.fast.duration} ${motion.fast.easing}` }}>
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>
      {anim.mounted && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 900,
          minWidth: 180, maxHeight: 260, overflowY: "auto",
          background: c.surfaceSolid, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusMd, boxShadow: c.shadowFloat,
          padding: `${space[1]}px 0`,
          animation: `${anim.visible ? "fadeScaleIn" : "fadeScaleOut"} ${motion.fast.duration} ${motion.fast.easing} both`,
          transformOrigin: "top left",
        }}>
          {active && (
            <button type="button" onClick={() => { onClear(); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: `${space[1]}px ${space[3]}px`, cursor: "pointer",
              fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
              color: c.textMid, fontWeight: 600, borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: `1px solid ${c.border}`,
              marginBottom: space[1], background: "transparent",
            }}>Clear all</button>
          )}
          {options.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <button type="button" key={opt} onClick={() => onToggle(opt)}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = c.surfaceAlt; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                style={{
                width: "100%", textAlign: "left", border: "none",
                padding: `${space[1]}px ${space[3]}px`, cursor: "pointer",
                display: "flex", alignItems: "center", gap: space[2],
                background: isSelected ? c.surfaceAlt : "transparent",
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                color: isSelected ? c.text : c.textMid,
                transition: `background ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: layout.radiusXs,
                  border: `1px solid ${isSelected ? c.accent : c.textDim}`,
                  background: isSelected ? c.accent : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: c.textOnAccent, fontWeight: 700,
                }}>{isSelected ? "✓" : ""}</span>
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Complexity-based phase thresholds (days). No threshold for Alpha/Beta/GA.
const COMPLEXITY_THRESHOLDS = {
  S:  { PRD: 3,  Design: 3,  Dev: 7,  QA: 3 },
  M:  { PRD: 5,  Design: 10, Dev: 14, QA: 5 },
  L:  { PRD: 10, Design: 14, Dev: 21, QA: 7 },
  XL: { PRD: 10, Design: 14, Dev: 21, QA: 7 },
};
const DEFAULT_THRESHOLDS = COMPLEXITY_THRESHOLDS.M;
function getPhaseThreshold(complexity, phase) {
  const map = COMPLEXITY_THRESHOLDS[complexity] || DEFAULT_THRESHOLDS;
  return map[phase] ?? null;
}

/* ══════════════════════════════════════════════════════════════════
   DATA DERIVATION — full-history metrics per project
   ══════════════════════════════════════════════════════════════════ */
function deriveProjectMetrics(projects, history, today) {
  const map = {};

  for (const proj of projects) {
    const id = proj.id;
    const m = {
      historyTotal: 0,
      phaseBreakdown: { PRD: 0, Design: 0, Dev: 0, QA: 0 },
      people: new Set(),
      lastActivity: null,
      weeklyData: [],
      isBlocked: !!proj.isBlocked,
      endingSoon: false,
      overdue: false,
      atRisk: false,
      isStale: false,
      noActivityWeek: false,
      teamMembers: [], // filled below from devStore
    };

    if (proj.status === "upcoming") { map[id] = m; continue; }

    const projHist = history[id] || [];
    for (const wk of projHist) {
      const entries = wk.entries || [];
      if (entries.length > 0) {
        m.lastActivity = wk.week;
        m.historyTotal += entries.length;
        const weekEntries = [];
        for (const e of entries) {
          if (e.person) m.people.add(e.person);
          const stage = e.stage || "PRD";
          if (m.phaseBreakdown[stage] !== undefined) m.phaseBreakdown[stage]++;
          weekEntries.push(e);
        }
        m.weeklyData.push({ week: wk.week, entries: weekEntries });
      }
    }

    m.peopleList = [...m.people];

    // Team members from devStore (includes owner)
    if (isDevSeedMode()) {
      const members = devStore.listMembers(proj.id) || [];
      m.teamMembers = members.map(mem => mem.person_id);
    }

    // Staleness checks
    const daysSinceActivity = proj.lastActivityAt
      ? Math.round((new Date(today + "T00:00:00") - new Date(proj.lastActivityAt)) / 86400000)
      : 999;
    m.isStale = daysSinceActivity > 14;
    m.noActivityWeek = daysSinceActivity > 7;

    // Risk flags
    const daysToEnd = daysBetween(today, proj.endDate);
    const isShipped = proj.status === "shipped";
    if (daysToEnd <= 14 && daysToEnd > 0 && !isShipped) m.endingSoon = true;
    if (daysToEnd < 0 && !isShipped) m.overdue = true;

    // Active tracks
    m.activeTracks = getActiveTracks(proj);

    // Phase overstay tracking (per-track: use longest active track)
    const overrides = proj.phaseDurationOverrides || {};
    {
      let maxDaysInTrack = 0;
      let trackThreshold = null;
      if (m.activeTracks.length > 0) {
        for (const t of m.activeTracks) {
          const days = getTrackActiveDays(proj, t);
          const th = overrides[t] ?? getPhaseThreshold(proj.complexity, t);
          if (days > maxDaysInTrack) {
            maxDaysInTrack = days;
            trackThreshold = th;
          }
        }
      } else {
        const age = daysBetween(proj.startDate, today);
        maxDaysInTrack = age;
        trackThreshold = overrides[proj.phase] ?? getPhaseThreshold(proj.complexity, proj.phase);
      }
      m.daysInPhase = maxDaysInTrack;
      m.phaseThreshold = trackThreshold;
    }

    // At Risk: overdue OR no activity in 1 week OR blocked
    m.atRisk = proj.status !== "deprioritized" && !isShipped && proj.status !== "upcoming" && (
      m.overdue || m.noActivityWeek || m.isBlocked
    );

    map[id] = m;
  }
  return map;
}

/* ══════════════════════════════════════════════════════════════════
   SORT — mirrors Pulse sort pattern
   ══════════════════════════════════════════════════════════════════ */
function sortList(list, key, dir, metrics, today) {
  if (!key) return [...list].sort((a, b) => (a.squad || "").localeCompare(b.squad || "") || (a.name || "").localeCompare(b.name || ""));
  const d = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (key) {
      case "squad": return d * (a.squad || "").localeCompare(b.squad || "");
      case "project": {
        const aN = parseInt((a.id || "").replace(/\D/g, ""), 10) || 0;
        const bN = parseInt((b.id || "").replace(/\D/g, ""), 10) || 0;
        return d * (aN - bN);
      }
      case "owner": return d * (a.owner || "").localeCompare(b.owner || "");
      case "status": return d * (a.status || "active").localeCompare(b.status || "active");
      case "phase":
      case "tracks": return d * (allPhases.indexOf(a.phase) - allPhases.indexOf(b.phase));
      case "total": return d * ((metrics[a.id]?.historyTotal || 0) - (metrics[b.id]?.historyTotal || 0));
      case "priority": {
        const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
        return d * ((order[a.priority] ?? 2) - (order[b.priority] ?? 2));
      }
      case "people": return d * ((metrics[a.id]?.teamMembers.length || 0) - (metrics[b.id]?.teamMembers.length || 0));
      case "updated": {
        const aT = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bT = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return d * (aT - bT);
      }
      case "last": {
        // Sort by the project's actual lastActivityAt timestamp (newest first
        // when dir=asc=−1). Missing timestamps sort to the end.
        const aT = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bT = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return d * (aT - bT);
      }
      case "daysInPhase": return d * ((metrics[a.id]?.daysInPhase ?? 0) - (metrics[b.id]?.daysInPhase ?? 0));
      case "timeline": return d * (daysBetween(today, a.endDate) - daysBetween(today, b.endDate));
      case "actualEnd": return d * ((a.actualEndDate || "").localeCompare(b.actualEndDate || ""));
      case "createdAt": return d * ((a.createdAt || "").localeCompare(b.createdAt || ""));
      case "startDate": return d * ((a.startDate || a.tentativeStartDate || "").localeCompare(b.startDate || b.tentativeStartDate || ""));
      default: return 0;
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   FIELD DESIGN SYSTEM — tokens + helpers for the Projects page
   (pixel-matched to Figma node 152:5047). Geist type throughout.
   ══════════════════════════════════════════════════════════════════ */
// Convert a hex/rgb color to an rgba() string with the given alpha (used for
// the prairie background gradient so it fades cleanly into the surface color).
function rgbaFromColor(col, a) {
  if (typeof col !== "string") return `rgba(255,255,255,${a})`;
  let h = col.trim();
  if (h.startsWith("rgb")) {
    const n = h.replace(/rgba?\(|\)/g, "").split(",").map(s => s.trim());
    return `rgba(${n[0]},${n[1]},${n[2]},${a})`;
  }
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map(x => x + x).join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

// Field tokens, resolved from the live theme (`c`) so the Projects tab follows
// light/dark mode automatically. In light these equal the Field palette exactly.
const FD = {
  get textPrimary() { return c.text; },
  get textSecondary() { return c.textMid; },
  get textTertiary() { return c.textDim; },
  get textMuted() { return c.textGhost || c.textDim; },
  get action() { return c.blue; },
  get actionSubtle() { return c.blueDim; },
  get success() { return c.green; },
  get successSubtle() { return c.greenDim; },
  get error() { return c.red; },
  get errorSubtle() { return c.redDim; },
  get warning() { return c.amber; },
  get warningSubtle() { return c.amberDim; },
  get surface() { return c.surface; },
  get surface2() { return c.surfaceAlt; },
  get surface3() { return c.surfaceAlt; },
  get border() { return c.border; },
  get borderDark() { return c.text; },
  get accent() { return c.accent || "#E8590C"; },
};

// Track icons — shared by the registry "Status" cells and the Track filter chips
const TRACK_GLYPHS = {
  PRD: <svg width="15" height="15" viewBox="0 0 24 24" fill="#2D7FF9"><path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" opacity="0.18"/><path d="M14 2v4a2 2 0 0 0 2 2h4" fill="none" stroke="#2D7FF9" strokeWidth="1.6"/><path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="none" stroke="#2D7FF9" strokeWidth="1.6"/><line x1="8" y1="13" x2="16" y2="13" stroke="#2D7FF9" strokeWidth="1.6" strokeLinecap="round"/><line x1="8" y1="16.5" x2="13.5" y2="16.5" stroke="#2D7FF9" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Design: <svg width="14" height="14" viewBox="0 0 38 57"><path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/><path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z"/><path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z"/><path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/><path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/></svg>,
  Dev: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  QA: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9747FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>,
  Alpha: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F8857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>,
  Beta: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F8857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>,
};

// ── Project deep-dive sidebar card (Figma): header (title + Add) · divider · body ──
function SidebarCard({ title, onAdd, children }) {
  return (
    <div style={{ width: "100%", background: FD.surface, border: `1px solid ${FD.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: FD.textPrimary }}>{title}</span>
        {onAdd && (
          <button type="button" onClick={onAdd} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: FD.textSecondary, fontSize: 14, fontWeight: 500, padding: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add
          </button>
        )}
      </div>
      <div style={{ height: 1, background: FD.border, width: "100%" }} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

// Phase code → display label per the Noon Field design (Design→UXD, QA→DQA)
const FD_PHASE_LABEL = { PRD: "PRD", Design: "UXD", Dev: "DEV", QA: "DQA", Alpha: "Alpha", Beta: "Beta", GA: "GA" };
// Priority → { color, bg } — getters so they resolve against the live theme (dark/light)
const FD_PRIORITY = {
  get P0() { return { color: FD.error, bg: FD.errorSubtle }; },
  get P1() { return { color: FD.textTertiary, bg: FD.surface3 }; },
  get P2() { return { color: FD.textTertiary, bg: FD.surface3 }; },
  get P3() { return { color: FD.textTertiary, bg: FD.surface3 }; },
};

const FD_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fdDate(d) {
  if (!d) return "—";
  const dt = new Date(String(d).slice(0, 10) + "T00:00:00");
  if (isNaN(dt)) return "—";
  return `${FD_MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}

// Status icons (18px) — FILLED. "progress" renders a dynamic donut by % complete.
const FdStatusIcon = ({ kind, pct = 0 }) => {
  if (kind === "shipped") return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill={FD.success} />
      <path d="M7.4 12.4l2.9 2.9 6.2-6.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (kind === "blocked") return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill={FD.error} />
      <path d="M8.4 8.4l7.2 7.2M15.6 8.4l-7.2 7.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
  if (kind === "atrisk") return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M12 2.8l9.63 16.7a1.05 1.05 0 0 1-.9 1.57H3.27a1.05 1.05 0 0 1-.9-1.57z" fill={FD.error} />
      <path d="M12 8.8v4.4" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1.15" fill="#fff" />
    </svg>
  );
  // In progress — dynamic donut sized to the project's progress
  const r = 8, C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, (Number(pct) || 0) / 100));
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r={r} fill="none" stroke={FD.action} strokeOpacity="0.25" strokeWidth="3.4" />
      <circle cx="12" cy="12" r={r} fill="none" stroke={FD.action} strokeWidth="3.4" strokeLinecap="round"
        strokeDasharray={`${(C * p).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 12 12)" />
    </svg>
  );
};

// Derive the Field status from a Flow project + metrics
function fdStatus(proj, m) {
  m = m || {};
  if (proj.status === "blocked" || m.isBlocked) return { kind: "blocked", label: "Blocked" };
  if (proj.status === "shipped" || ["Alpha", "Beta", "GA"].includes(proj.phase)) return { kind: "shipped", label: "Shipped" };
  if (m.atRisk || m.overdue) return { kind: "atrisk", label: "At Risk" };
  return { kind: "progress", label: "In progress" };
}

// Status → display + colour + which filter tab it maps to.
// One source of truth shared by the table status icon AND the overview widget.
const FD_STATUS_META = {
  progress:      { label: "In progress",  tab: "active",         get color() { return FD.action; } },
  shipped:       { label: "Shipped",       tab: "shipped",        get color() { return FD.success; } },
  atrisk:        { label: "At Risk",       tab: "at_risk",        get color() { return FD.warning; } },
  blocked:       { label: "Blocked",       tab: "blocked",        get color() { return FD.error; } },
  deprioritized: { label: "Deprioritised", tab: "deprioritized",  get color() { return FD.textTertiary; } },
};
const FD_STATUS_ORDER = ["progress", "shipped", "atrisk", "blocked", "deprioritized"];

// Full status key for the overview widget (adds the Paused/deprioritised bucket)
function projStatusKey(proj, m) {
  if (proj.status === "deprioritized") return "deprioritized";
  return fdStatus(proj, m).kind;
}

// GitHub-style overview: one square per project, coloured by status, grouped.
// Hover a square → tooltip with the status + its total; click → filter the table.
function FdStatusGrid({ projects, metrics, onPick }) {
  const buckets = {};
  FD_STATUS_ORDER.forEach(k => { buckets[k] = []; });
  (projects || []).forEach(p => {
    const k = projStatusKey(p, metrics[p.id] || {});
    (buckets[k] || (buckets[k] = [])).push(p);
  });
  const total = (projects || []).length;
  const present = FD_STATUS_ORDER.filter(k => buckets[k] && buckets[k].length);

  return (
    <div style={{ width: "100%", background: FD.surface, border: `1px solid ${FD.border}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: FD.textTertiary }}>{total} projects</span>
        <div style={{ flex: 1 }} />
        {present.map(k => {
          const meta = FD_STATUS_META[k];
          return (
            <button key={k} onClick={() => onPick(meta.tab)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: meta.color }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: FD.textSecondary }}>{meta.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: FD.textTertiary }}>{buckets[k].length}</span>
            </button>
          );
        })}
      </div>
      {/* Squares — one per project, grouped by status */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {FD_STATUS_ORDER.flatMap(k => buckets[k].map((p, i) => {
          const meta = FD_STATUS_META[k];
          return (
            <Tooltip key={p.id || `${k}-${i}`} label={`${meta.label} • ${buckets[k].length} project${buckets[k].length !== 1 ? "s" : ""}`}>
              <button
                onClick={() => onPick(meta.tab)}
                aria-label={`${p.name} — ${meta.label}`}
                style={{ width: 16, height: 16, borderRadius: 4, border: "none", padding: 0, cursor: "pointer", background: meta.color, transition: "transform 120ms ease, box-shadow 120ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.18)"; e.currentTarget.style.boxShadow = `0 0 0 2px ${FD.surface}, 0 0 0 3px ${meta.color}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </Tooltip>
          );
        }))}
        {total === 0 && <span style={{ fontSize: 13, color: FD.textTertiary }}>No projects</span>}
      </div>
    </div>
  );
}

const FD_RHYTHM = [
  { d: "Sun", label: "Focus day", icon: "target" },
  { d: "Mon", label: "Focus day", icon: "target" },
  { d: "Tue", label: "Sprint day", icon: "zap" },
  { d: "Wed", label: "Sprint day", icon: "zap" },
  { d: "Thu", label: "Release day", icon: "rocket" },
  { d: "Fri", label: "Review day", icon: "check" },
  { d: "Sat", label: "Rest day", icon: "moon" },
];

// Sprint-day pill with the weekly-rhythm dropdown (from the initial build)
function FdSprintDayPill() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const today = new Date().getDay();
  const cur = FD_RHYTHM[today] || FD_RHYTHM[2];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        height: 44, padding: "0 16px", borderRadius: 8, background: FD.surface,
        border: `1px solid ${FD.border}`, cursor: "pointer", minWidth: 160,
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: FD.textPrimary }}>Today's {cur.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={FD.textTertiary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 900, minWidth: 224, background: FD.surface, border: `1px solid ${FD.border}`, borderRadius: 12, boxShadow: "0 8px 24px rgba(16,22,40,0.12)", padding: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: FD.textTertiary, padding: "4px 8px" }}>Weekly rhythm</div>
          {FD_RHYTHM.map((r, i) => {
            const isToday = i === today;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: isToday ? FD.surface2 : "transparent" }}>
                <span style={{ width: 34, fontSize: 12, fontWeight: isToday ? 600 : 400, color: isToday ? FD.textPrimary : FD.textTertiary }}>{r.d}</span>
                <span style={{ display: "inline-flex", color: isToday ? FD.textPrimary : FD.textTertiary }}><Icon name={r.icon} size={13} /></span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: isToday ? 600 : 500, color: isToday ? FD.textPrimary : FD.textSecondary }}>{r.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// KPI card — white card, 28px value, grey footer with colored count pills.
// Getters so colors resolve against the live theme (light/dark).
const FD_TONE = {
  get action() { return { c: FD.action, bg: FD.actionSubtle }; },
  get success() { return { c: FD.success, bg: FD.successSubtle }; },
  get error() { return { c: FD.error, bg: FD.errorSubtle }; },
  get warning() { return { c: FD.warning, bg: FD.warningSubtle }; },
};
function FdKpiCard({ label, value, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      width: 128, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8,
      justifyContent: "center", alignItems: "flex-end",
      background: FD.surface2, border: `1px solid ${active ? FD.borderDark : FD.border}`,
      borderRadius: 16, padding: "12px 16px 16px", overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
    }}>
      <span style={{ fontFamily: "Geist, system-ui, -apple-system, sans-serif", fontSize: 13, fontWeight: 500, lineHeight: "16px", whiteSpace: "nowrap", color: FD.textMuted || FD.textTertiary }}>{label}</span>
      <span style={{ minWidth: "100%", textAlign: "right", fontSize: 28, fontWeight: 700, lineHeight: "36px", letterSpacing: "-0.25px", color: FD.textPrimary }}>{value}</span>
    </div>
  );
}

/* ── Quarter / timeframe picker — functional dropdown (theme-aware) ── */
const FD_QUARTERS = [
  { q: "Q1", months: "Jan – Mar", start: "-01-01", end: "-03-31" },
  { q: "Q2", months: "Apr – Jun", start: "-04-01", end: "-06-30" },
  { q: "Q3", months: "Jul – Sep", start: "-07-01", end: "-09-30" },
  { q: "Q4", months: "Oct – Dec", start: "-10-01", end: "-12-31" },
];

function FdQuarterPicker({ timeframe, setTimeframe }) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [yearOffset, setYearOffset] = useState(0);
  const [cStart, setCStart] = useState(timeframe?.start || "");
  const [cEnd, setCEnd] = useState(timeframe?.end || "");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setCustomMode(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQ = Math.floor(now.getMonth() / 3);
  const baseYear = currentYear + yearOffset;

  const pick = (qi) => {
    const qm = FD_QUARTERS[qi];
    setTimeframe?.({ label: qm.q, year: baseYear, start: `${baseYear}${qm.start}`, end: `${baseYear}${qm.end}` });
    setOpen(false); setCustomMode(false);
  };
  const applyCustom = () => {
    if (!cStart || !cEnd || cStart > cEnd) return;
    const s = new Date(cStart), e = new Date(cEnd);
    const sM = s.toLocaleDateString("en-US", { month: "short" });
    const eM = e.toLocaleDateString("en-US", { month: "short" });
    setTimeframe?.({
      label: `${sM} – ${eM}`,
      year: s.getFullYear() === e.getFullYear() ? s.getFullYear() : `${s.getFullYear()}–${e.getFullYear()}`,
      start: cStart, end: cEnd,
    });
    setOpen(false); setCustomMode(false);
  };

  const navBtn = {
    border: "none", background: "transparent", cursor: "pointer",
    fontSize: 16, lineHeight: 1, color: FD.textSecondary, padding: "2px 8px", borderRadius: 6,
  };
  const dateInput = {
    fontSize: 12, color: FD.textPrimary, padding: "6px 8px", borderRadius: 8,
    border: `1px solid ${FD.border}`, background: FD.surface2, outline: "none", width: "100%",
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: 4, height: 44, padding: "0 12px",
        borderRadius: 8, background: "#FBF9F8", border: "1px solid #F1EAE4", cursor: "pointer",
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: FD.textPrimary }}>{timeframe.label} {timeframe.year}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={FD.textTertiary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: FD.surface, border: `1px solid ${FD.border}`, borderRadius: 12,
          boxShadow: c.shadowFloat || "0 12px 40px rgba(0,0,0,0.18)", minWidth: 264, overflow: "hidden",
        }}>
          {!customMode ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${FD.border}`, background: FD.surface2 }}>
                <button type="button" onClick={() => setYearOffset(y => y - 1)} style={navBtn}>‹</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: FD.textPrimary }}>{baseYear}</span>
                <button type="button" onClick={() => setYearOffset(y => y + 1)} style={navBtn}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 8 }}>
                {FD_QUARTERS.map((qm, qi) => {
                  const sel = timeframe.label === qm.q && timeframe.year === baseYear;
                  const cur = baseYear === currentYear && qi === currentQ;
                  return (
                    <button key={qm.q} type="button" onClick={() => pick(qi)} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 8px",
                      borderRadius: 8, cursor: "pointer",
                      border: sel ? "1.5px solid #8F583D" : cur ? `1px solid ${FD.border}` : "1px solid transparent",
                      background: sel ? "#FBF9F8" : "transparent",
                    }}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = FD.surface2; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: sel ? "#58270E" : FD.textPrimary }}>{qm.q}</span>
                      <span style={{ fontSize: 11, color: sel ? "#8F583D" : FD.textTertiary }}>{qm.months}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: "4px 8px 8px", borderTop: `1px solid ${FD.border}` }}>
                <button type="button" onClick={() => { setCustomMode(true); setCStart(timeframe.start); setCEnd(timeframe.end); }} style={{
                  width: "100%", padding: 8, border: "none", background: "transparent", cursor: "pointer", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, color: FD.textSecondary, textAlign: "center",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = FD.surface2; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  Custom range…
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: FD.textPrimary }}>Custom range</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: FD.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em" }}>From</label>
                  <input type="date" value={cStart} onChange={e => setCStart(e.target.value)} style={dateInput} />
                </div>
                <span style={{ fontSize: 11, color: FD.textTertiary, paddingBottom: 8 }}>to</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: FD.textTertiary, textTransform: "uppercase", letterSpacing: "0.06em" }}>To</label>
                  <input type="date" value={cEnd} onChange={e => setCEnd(e.target.value)} style={dateInput} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setCustomMode(false)} style={{
                  padding: "6px 14px", borderRadius: 8, border: `1px solid ${FD.border}`, background: "transparent",
                  fontSize: 13, fontWeight: 600, color: FD.textSecondary, cursor: "pointer",
                }}>Back</button>
                <button type="button" onClick={applyCustom} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", background: FD.action, color: c.textOnAccent || "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!cStart || !cEnd || cStart > cEnd) ? 0.4 : 1,
                }}>Apply</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════════ */
export default function ProjectsView({
  projects: rawProjects, setProjects, people, squads, history,
  personProfile, isAdmin = false, permCan,
  initialId, onNavigate, setDetailLabel, setGoBack, searchRef, globalFilters = {},
  suppressBackRef,
  projectLinks, setProjectLinks, phaseDurationDefaults,
  myLens = false, toggleMyLens, followedProjects = [], toggleFollowProject,
  timeframe, setTimeframe,
}) {
  const can = permCan || defaultCan;
  const devRef = useDevLabel('ProjectsView', 'src/views/ProjectsView.jsx', 'Project registry table with deep dive and Gantt chart');
  const projects = useMemo(() => rawProjects.map(ensureStatus), [rawProjects]);
  const today = new Date().toISOString().split('T')[0];
  const metrics = useMemo(() => deriveProjectMetrics(projects, history, today), [projects, history, today]);

  const [selectedProject, setSelectedProject] = useState(initialId || null);

  // ── URL sync: mirror selectedProject → ?id= ──
  // Lets users copy a project deep-dive URL and reopen it directly.
  // App.jsx owns `?tab=projects`; this effect only touches `id`.
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (selectedProject) params.set("id", selectedProject);
      else params.delete("id");
      const qs = params.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
      if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(window.history.state, "", url);
      }
    } catch { /* best-effort */ }
  }, [selectedProject]);

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [createError, setCreateError] = useState(null);
  const createErrorTimerRef = useRef(null);
  const [createSuccess, setCreateSuccess] = useState(null);
  const createSuccessTimerRef = useRef(null);

  // Listen for optimistic-create failures from useSyncedSetters.
  // Single timer held in a ref so rapid re-failures don't cut the message short.
  useEffect(() => {
    const handler = (e) => {
      const nm = e?.detail?.name || "project";
      setCreateError(`Failed to create "${nm}". Please try again.`);
      if (createErrorTimerRef.current) clearTimeout(createErrorTimerRef.current);
      createErrorTimerRef.current = setTimeout(() => {
        setCreateError(null);
        createErrorTimerRef.current = null;
      }, 5000);
    };
    const updateHandler = (e) => {
      const nm = e?.detail?.name || "project";
      setCreateError(`Failed to save changes to "${nm}". Please try again.`);
      if (createErrorTimerRef.current) clearTimeout(createErrorTimerRef.current);
      createErrorTimerRef.current = setTimeout(() => {
        setCreateError(null);
        createErrorTimerRef.current = null;
      }, 5000);
    };
    const successHandler = (e) => {
      const nm = e?.detail?.name || "project";
      const id = e?.detail?.id || "";
      setCreateSuccess({ name: nm, id });
      if (createSuccessTimerRef.current) clearTimeout(createSuccessTimerRef.current);
      createSuccessTimerRef.current = setTimeout(() => {
        setCreateSuccess(null);
        createSuccessTimerRef.current = null;
      }, 4500);
    };
    window.addEventListener('flow:project-create-failed', handler);
    window.addEventListener('flow:project-update-failed', updateHandler);
    window.addEventListener('flow:project-create-succeeded', successHandler);
    return () => {
      window.removeEventListener('flow:project-create-failed', handler);
      window.removeEventListener('flow:project-update-failed', updateHandler);
      window.removeEventListener('flow:project-create-succeeded', successHandler);
      if (createErrorTimerRef.current) clearTimeout(createErrorTimerRef.current);
      if (createSuccessTimerRef.current) clearTimeout(createSuccessTimerRef.current);
    };
  }, []);
  const [sortKey, setSortKey] = useState("squad");
  const [sortDir, setSortDir] = useState("asc");
  const [hoveredProject, setHoveredProject] = useState(null);
  // Project detail side sheet (ported from flow_AS) — opens on row click
  const [detailSheetId, setDetailSheetId] = useState(null);
  useEffect(() => {
    if (!detailSheetId) return;
    const onKey = (e) => { if (e.key === "Escape") setDetailSheetId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailSheetId]);
  const [activityTip, setActivityTip] = useState(null); // { projId, rect }
  const activityTipTimer = useRef(null);
  const showActivityTip = (data) => { clearTimeout(activityTipTimer.current); setActivityTip(data); };
  const hideActivityTip = () => { activityTipTimer.current = setTimeout(() => setActivityTip(null), 120); };
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const [searchGlow, setSearchGlow] = useState(false);
  const searchGlowTimerRef = useRef(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState("registry"); // "registry" | "board" | "timeline"
  const [ganttFullscreen, setGanttFullscreen] = useState(false);
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const ganttAnim = useExitAnimation(ganttFullscreen, 250);
  const boardAnim = useExitAnimation(boardFullscreen, 250);
  const toastAnim = useExitAnimation(!!createError, 150);
  const successToastAnim = useExitAnimation(!!createSuccess, 200);
  const [listSquadFilter, setListSquadFilter] = useState("");
  // ── Registry filter dropdown (Squad / Owner / Track / Status) ──
  const [filterOpen, setFilterOpen] = useState(false);
  const [fSquads, setFSquads] = useState([]);
  const [fOwners, setFOwners] = useState([]);
  const [fTracks, setFTracks] = useState([]);
  const [fStatuses, setFStatuses] = useState([]);
  const filterRef = useRef(null);
  const activeFilterCount = fSquads.length + fOwners.length + fTracks.length + fStatuses.length;
  const clearAllFilters = () => { setFSquads([]); setFOwners([]); setFTracks([]); setFStatuses([]); };
  useEffect(() => {
    if (!filterOpen) return;
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filterOpen]);
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem("flow_pinned_projects") || "[]")); }
    catch { return new Set(); }
  });
  const togglePin = useCallback((id, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      sessionStorage.setItem("flow_pinned_projects", JSON.stringify([...next]));
      return next;
    });
  }, []);
  // watchlist filter removed
  const [boardSearch, setBoardSearch] = useState("");
  const [boardSquads, setBoardSquads] = useState([]);
  const [boardOwners, setBoardOwners] = useState([]);
  const [boardPhases, setBoardPhases] = useState([]);
  const boardSearchRef = useRef(null);
  const [ganttSearch, setGanttSearch] = useState("");
  const [ganttSquads, setGanttSquads] = useState([]);
  const [ganttOwners, setGanttOwners] = useState([]);
  const [ganttPhases, setGanttPhases] = useState([]);
  const toggleFilter = (setter, val) => setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  const ganttSearchRef = useRef(null);
  const localSearchRef = useRef(null);
  // Drag-and-drop state for board view (must be at component level, not inside conditional IIFE)
  const colRefs = useRef({});
  const [dragOverPhase, setDragOverPhaseRaw] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragOverRef = useRef(null);
  // Board-level reopen modal (separate from detail-view reopen modal)
  const [boardReopenModal, setBoardReopenModal] = useState(null); // { projId, fromTrack, toTrack }
  const [boardReopenReason, setBoardReopenReason] = useState("");
  const [boardHoverId, setBoardHoverId] = useState(null); // which card is hovered (for Done btn)
  const [listStartNowId, setListStartNowId] = useState(null);
  const [listStartNowTracks, setListStartNowTracks] = useState(["PRD"]);
  const [listStartNowEndDate, setListStartNowEndDate] = useState("");

  // Wire searchRef
  useEffect(() => {
    if (searchRef) searchRef.current = localSearchRef.current;
  }, [searchRef, selectedProject]);

  // Shipped tab defaults to newest-first by actual end date. Other tabs keep
  // the default squad sort when re-entered from Shipped.
  useEffect(() => {
    if (activeTab === "shipped") {
      setSortKey("timeline");
      setSortDir("desc");
    } else if (sortKey === "timeline" && activeTab !== "all") {
      setSortKey("squad");
      setSortDir("asc");
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Breadcrumb / detail mode (copied from PeopleDeepDive pattern) ──
  const [detailLeaving, setDetailLeaving] = useState(false);
  const goBackToList = useCallback(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      setDetailLeaving(false);
      setSelectedProject(null);
      if (setDetailLabel) setDetailLabel(null);
      if (setGoBack) setGoBack(null);
    };
    if (reduce) { finish(); return; }
    setDetailLeaving(true);
    setTimeout(finish, 180);
  }, [setDetailLabel, setGoBack]);

  const openProject = useCallback((id) => {
    setSelectedProject(id);
    const p = projects.find(pr => pr.id === id);
    if (p && setDetailLabel) setDetailLabel(`${p.id} / ${p.name}`);
    if (setGoBack) setGoBack(goBackToList);
    // Reset scroll to top so the deep-dive opens at the header (not mid-list)
    if (typeof window !== "undefined") {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "instant" });
    }
  }, [projects, setDetailLabel, setGoBack, goBackToList]);

  useEffect(() => {
    if (initialId) {
      const p = projects.find(pr => pr.id === initialId);
      if (p && setDetailLabel) setDetailLabel(`${p.id} / ${p.name}`);
      if (setGoBack) setGoBack(goBackToList);
    }
  }, [initialId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter (search + global) ──
  const filtered = useMemo(() => {
    let list = projects;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) ||
        (p.owner || "").toLowerCase().includes(q) || (p.squad || "").toLowerCase().includes(q)
      );
    }
    if ((globalFilters.owner || []).length > 0) list = list.filter(p => globalFilters.owner.includes(p.owner));
    if ((globalFilters.squad || []).length > 0) list = list.filter(p => globalFilters.squad.includes(p.squad));
    if (listSquadFilter) list = list.filter(p => p.squad === listSquadFilter);
    if ((globalFilters.person || []).length > 0) {
      list = list.filter(p => globalFilters.person.some(fp => metrics[p.id]?.people.has(fp)));
    }
    if ((globalFilters.track || []).length > 0) {
      list = list.filter(p => globalFilters.track.some(t => (metrics[p.id]?.activeTracks || []).includes(t)));
    }
    // Registry filter dropdown (view-local: Squad / Owner / Track / Status)
    if (fSquads.length) list = list.filter(p => fSquads.includes(p.squad));
    if (fOwners.length) list = list.filter(p => fOwners.includes(p.owner));
    if (fTracks.length) list = list.filter(p => fTracks.some(t => (metrics[p.id]?.activeTracks || []).includes(t)));
    if (fStatuses.length) list = list.filter(p => fStatuses.some(s =>
      s === "blocked" ? (p.status === "blocked" || metrics[p.id]?.isBlocked) : p.status === s));
    // My Lens: show only followed projects (auto-followed squad + explicit follows)
    if (myLens) {
      list = list.filter(p => followedProjects.includes(p.id));
    }
    // Timeframe filter: project overlaps with the selected range
    if (timeframe?.start && timeframe?.end) {
      list = list.filter(p => {
        const pStart = p.startDate || p.tentativeStartDate || p.createdAt?.slice(0, 10);
        const pEnd = p.endDate || p.shipped_at?.slice(0, 10);
        if (!pStart) return true; // no dates at all, include
        // Project starts before timeframe ends AND (project ends after timeframe starts OR project has no end and is still active)
        const startsBeforeEnd = pStart <= timeframe.end;
        const endsAfterStart = pEnd ? pEnd >= timeframe.start : true; // no end date = still running
        return startsBeforeEnd && endsAfterStart;
      });
    }
    return list;
  }, [projects, search, globalFilters, metrics, listSquadFilter, fSquads, fOwners, fTracks, fStatuses, myLens, personProfile, followedProjects, timeframe]);

  // ── Tab splits ──
  // When a search query is active, bypass the tab filter so results surface
  // regardless of tab (searching "X99" while on "Active" tab would otherwise hide
  // shipped/deprioritized matches even though the search matched them).
  const tabProjects = useMemo(() => {
    let list;
    if (search.trim()) {
      list = filtered;
    } else {
      switch (activeTab) {
        case "active": list = filtered.filter(p => p.status === "in_flight"); break;
        case "at_risk": list = filtered.filter(p => metrics[p.id]?.atRisk); break;
        case "shipped": list = filtered.filter(p => p.status === "shipped"); break;
        case "blocked": list = filtered.filter(p => p.status === "blocked" || metrics[p.id]?.isBlocked); break;
        case "deprioritized": list = filtered.filter(p => p.status === "deprioritized"); break;
        case "upcoming": list = filtered.filter(p => p.status === "upcoming").sort((a, b) =>
          (a.tentativeStartDate || "9999").localeCompare(b.tentativeStartDate || "9999")
        ); break;
        case "overdue": list = filtered.filter(p => p.status === "in_flight" && metrics[p.id]?.overdue); break;
        default: list = filtered;
      }
    }
    const sorted = sortList(list, sortKey, sortDir, metrics, today);
    const pinned = sorted.filter(p => pinnedIds.has(p.id));
    const shipped = sorted.filter(p => !pinnedIds.has(p.id) && p.status === "shipped");
    const regular = sorted.filter(p => !pinnedIds.has(p.id) && p.status === "in_flight");
    const blocked = sorted.filter(p => !pinnedIds.has(p.id) && p.status === "blocked");
    const depri = sorted.filter(p => !pinnedIds.has(p.id) && p.status === "deprioritized");
    const upcoming = sorted.filter(p => !pinnedIds.has(p.id) && p.status === "upcoming")
      .sort((a, b) => (a.tentativeStartDate || "9999").localeCompare(b.tentativeStartDate || "9999"));
    const ordered = [...pinned, ...shipped, ...regular, ...blocked, ...depri, ...upcoming];
    // Demo arrangement: surface "Refund automation" (X13) as the 7th row.
    if (!search.trim() && activeTab === "all") {
      const i = ordered.findIndex(p => p.id === "X13");
      if (i > -1 && ordered.length >= 7) {
        const [x] = ordered.splice(i, 1);
        ordered.splice(6, 0, x);
      }
    }
    return ordered;
  }, [filtered, activeTab, sortKey, sortDir, metrics, today, search, pinnedIds]);

  // ── KPI summary (from filtered data) ──
  // Risk is computed once in `deriveProjectMetrics`; this section
  // never re-derives it, so numbers stay consistent with the table.
  const summary = useMemo(() => {
    const active = filtered.filter(p => p.status === "in_flight");
    const shipped = filtered.filter(p => p.status === "shipped");
    const depri = filtered.filter(p => p.status === "deprioritized");
    const upcomingProjs = filtered.filter(p => p.status === "upcoming");
    const blockedProjs = filtered.filter(p => p.status === "blocked" || metrics[p.id]?.isBlocked);
    const atRiskCount = blockedProjs.length + active.filter(p => metrics[p.id]?.overdue).length;
    // Track distribution: how many in-flight projects have each track active
    const trackCounts = {};
    trackNames.forEach(t => {
      trackCounts[t] = active.filter(p => (metrics[p.id]?.activeTracks || []).includes(t)).length;
    });
    const overdueCount = active.filter(p => metrics[p.id]?.overdue).length;
    // Projects with Alpha or Beta tracks active count toward "shipping" bucket
    const alphaActive = active.filter(p => (metrics[p.id]?.activeTracks || []).includes("Alpha")).length;
    const betaActive = active.filter(p => (metrics[p.id]?.activeTracks || []).includes("Beta")).length;
    const shippedTotal = shipped.length + alphaActive + betaActive;
    return { active: active.length, shipped: shipped.length, shippedTotal, alphaActive, betaActive, depri: depri.length, upcoming: upcomingProjs.length, blocked: blockedProjs.length, overdue: overdueCount, all: filtered.length, atRiskCount, atRisk: filtered.filter(p => metrics[p.id]?.atRisk).length, trackCounts };
  }, [filtered, metrics, today]);

  // ── Gantt-specific filter (separate from registry filters) ──
  // Prefer the canonical squads list passed from App.jsx so newly-created
  // squads that haven't been assigned to any project yet still show up in
  // filters/pickers. Fall back to project-derived names only if absent.
  const allSquads = useMemo(
    () => squads && squads.length
      ? [...squads].sort()
      : [...new Set(projects.map(p => p.squad).filter(Boolean))].sort(),
    [squads, projects]
  );
  const allOwners = useMemo(() => people ? people.map(p => p.name).sort() : [...new Set(projects.map(p => p.owner).filter(Boolean))].sort(), [projects, people]);
  // Options for the registry filter dropdown
  const filterSections = useMemo(() => [
    { key: "squad", label: "Squad", selected: fSquads, setter: setFSquads, options: allSquads.map(s => ({ value: s, label: s })) },
    { key: "owner", label: "Owner", selected: fOwners, setter: setFOwners, options: allOwners.map(o => ({ value: o, label: o })) },
    { key: "track", label: "Track", selected: fTracks, setter: setFTracks, options: trackNames.map(t => ({ value: t, label: t })) },
    { key: "status", label: "Status", selected: fStatuses, setter: setFStatuses, options: [
      { value: "in_flight", label: "Active" },
      { value: "upcoming", label: "Upcoming" },
      { value: "blocked", label: "Blocked" },
      { value: "shipped", label: "Shipped" },
      { value: "deprioritized", label: "Deprioritised" },
    ] },
  ], [allSquads, allOwners, fSquads, fOwners, fTracks, fStatuses]);
  const ganttProjects = useMemo(() => {
    let list = projects;
    if (ganttSearch.trim()) {
      const q = ganttSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) ||
        (p.owner || "").toLowerCase().includes(q) || (p.squad || "").toLowerCase().includes(q));
    }
    if (ganttSquads.length > 0) list = list.filter(p => ganttSquads.includes(p.squad));
    if (ganttOwners.length > 0) list = list.filter(p => ganttOwners.includes(p.owner));
    if (ganttPhases.length > 0) list = list.filter(p => ganttPhases.includes(p.phase));
    return list;
  }, [projects, ganttSearch, ganttSquads, ganttOwners, ganttPhases]);

  // ── Board-specific filter (excludes deprioritized) ──
  const boardProjects = useMemo(() => {
    let list = projects.filter(p => p.status !== "deprioritized");
    if (boardSearch.trim()) {
      const q = boardSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) ||
        (p.owner || "").toLowerCase().includes(q) || (p.squad || "").toLowerCase().includes(q));
    }
    if (boardSquads.length > 0) list = list.filter(p => boardSquads.includes(p.squad));
    if (boardOwners.length > 0) list = list.filter(p => boardOwners.includes(p.owner));
    if (boardPhases.length > 0) list = list.filter(p => boardPhases.includes(p.phase));
    return list;
  }, [projects, boardSearch, boardSquads, boardOwners, boardPhases]);

  // ── Sort handler (Pulse pattern) ──
  const toggleSort = useCallback((col) => {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("asc"); }
  }, [sortKey]);
  const sortIcon = (col) => sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── Keyboard ──
  useKeyboard([
    { key: "Escape", fn: () => { if (suppressBackRef?.current) return; if (ganttFullscreen) { if (document.activeElement === ganttSearchRef.current) { ganttSearchRef.current.blur(); } else { setGanttFullscreen(false); setViewMode("registry"); } } else if (viewMode === "board") { setViewMode("registry"); } else if (selectedProject) goBackToList(); else if (search) { setSearch(""); setFocusIdx(0); localSearchRef.current?.blur(); setKbActive(false); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); setKbActive(false); } else if (kbActive) { setKbActive(false); } }, force: true },
    // First arrow press activates kb-focus mode WITHOUT moving, so the highlight
    // lands on the current focusIdx (row 0 on fresh load). Subsequent presses
    // step through rows.
    { key: "ArrowUp", fn: () => { if (!ganttFullscreen && !selectedProject) { localSearchRef.current?.blur(); if (!kbActive) { setKbActive(true); return; } setFocusIdx(i => Math.max(0, i - 1)); } }, force: true },
    { key: "ArrowDown", fn: () => { if (!ganttFullscreen && !selectedProject) { localSearchRef.current?.blur(); if (!kbActive) { setKbActive(true); return; } setFocusIdx(i => Math.min(tabProjects.length - 1, i + 1)); } }, force: true },
    { key: "Enter", fn: () => { if (!ganttFullscreen && !selectedProject && kbActive && tabProjects[focusIdx]) openProject(tabProjects[focusIdx].id); }, force: true },
    { key: "/", fn: (e) => { e.preventDefault(); if (ganttFullscreen) { ganttSearchRef.current?.focus(); } else if (!selectedProject) { localSearchRef.current?.focus(); setSearchGlow(true); setKbActive(false); if (searchGlowTimerRef.current) clearTimeout(searchGlowTimerRef.current); searchGlowTimerRef.current = setTimeout(() => { setSearchGlow(false); searchGlowTimerRef.current = null; }, 1200); } } },
    // Gantt "F to focus search" — only when Gantt is fullscreen AND the user
    // isn't already typing in an input. `force: false` (default) lets the
    // useKeyboard input-guard skip this when focus is in an <input>/textarea,
    // which is what we want: typing 'f' in the create-project Name field or
    // any other overlay input should go to the input, not hijack to Gantt.
    { key: "f", fn: (e) => { if (ganttFullscreen) { e.preventDefault(); ganttSearchRef.current?.focus(); } } },
  ], [selectedProject, goBackToList, tabProjects.length, focusIdx, kbActive, ganttFullscreen, viewMode, suppressBackRef]);

  useEffect(() => {
    if (focusIdx >= tabProjects.length && tabProjects.length > 0) setFocusIdx(tabProjects.length - 1);
  }, [tabProjects.length, focusIdx]);

  useEffect(() => () => { if (searchGlowTimerRef.current) clearTimeout(searchGlowTimerRef.current); }, []);

  const pc = getPhaseColors();
  const pcMid = getPhaseMids();
  const pcDim = getPhaseDims();
  const sc = statusColors();
  const tc = typeConfig();
  const ec = entityColors();

  // People lookup for team column
  const peopleById = useMemo(() => {
    const m = new Map();
    (people || []).forEach(p => m.set(p.id, p));
    return m;
  }, [people]);

  // Precompute latest activity (comment or event) per project for list hover tooltip
  const latestActivity = useMemo(() => {
    const map = {};
    const actionLabel = (ev) => {
      const d = ev.details || {};
      const who = ev.user_name || "Someone";
      switch (ev.action) {
        case "project_created":         return `${who} created this project`;
        case "project_started":         return `${who} started the project in ${d.phase || "?"} phase`;
        case "project_phase_changed": {
          const to = d.to || "?";
          if (["Alpha", "Beta", "GA"].includes(to)) return `${who} shipped the project to ${to}`;
          return `${who} moved the project from ${d.from || "?"} to ${to}`;
        }
        case "project_status_changed": {
          if (d.to === "deprioritized") return `${who} deprioritized the project`;
          if (d.from === "deprioritized") return `${who} moved the project back to active`;
          return `${who} changed the project status to ${d.to || "?"}`;
        }
        case "project_blocked":         return `${who} marked the project as blocked${d.reason ? ` — ${d.reason}` : ""}`;
        case "project_unblocked":       return `${who} unblocked the project`;
        case "project_updated":         return `${who} updated the project details`;
        case "edit_project":            return `${who} edited the project details`;
        case "project_owner_changed":   return `${who} changed the owner to ${d.to || "—"}`;
        case "project_squad_changed":   return `${who} moved the project to ${d.to || "—"} squad`;
        case "project_start_date_moved": return `${who} moved the tentative start date to ${d.to || "—"}`;
        case "member_added":            return `${who} added ${d.person_name || "a member"} to the team`;
        case "member_removed":          return `${who} removed ${d.person_name || "a member"} from the team`;
        case "resource_added":          return `${who} added a ${d.label || "resource"} link`;
        case "resource_removed":        return `${who} removed a resource link`;
        default:                        return `${who} · ${ev.action}`;
      }
    };
    if (isDevSeedMode()) {
      for (const proj of projects) {
        const comments = devStore.listComments(proj.id);
        const events = devStore.listEvents(proj.id);
        // Merge into a single feed sorted by time descending, pick the latest
        const items = [];
        (comments || []).forEach(cmt => {
          if (!cmt.deleted_at) {
            const author = peopleById.get(cmt.author_id);
            items.push({ kind: "comment", ts: cmt.created_at, body: cmt.body, author: author?.name || "Unknown" });
          }
        });
        (events || []).forEach(ev => {
          if (ev.action === "shoutout" || ev.action === "feedback" || ev.action === "project_shipped") return;
          items.push({ kind: "event", ts: ev.created_at, body: actionLabel(ev) });
        });
        items.sort((a, b) => new Date(b.ts) - new Date(a.ts));
        if (items.length > 0) map[proj.id] = items[0];
      }
    }
    return map;
  }, [projects, peopleById]);

  // ── Parallax: drift the prairie background slower than the foreground ──
  const bgRef = useRef(null);
  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let scroller = el.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    if (!scroller) return;
    let raf = 0;
    const apply = () => { raf = 0; el.style.transform = `translate3d(0, ${scroller.scrollTop * 0.4}px, 0)`; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => { scroller.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [selectedProject, viewMode]);

  // ═══════════════════════════════════════════════════════════
  // DETAIL STATE — Project Deep Dive
  // ═══════════════════════════════════════════════════════════
  if (selectedProject) {
    const proj = projects.find(p => p.id === selectedProject);
    if (!proj) return <EmptyState icon="search" title="Project not found" message="This project may have been removed." action="Back to overview" onAction={goBackToList} />;
    return <ProjectDeepDive proj={proj} metrics={metrics[proj.id]} history={history} projects={projects} setProjects={setProjects} people={people} squads={squads} personProfile={personProfile} isAdmin={isAdmin} can={can} onNavigate={onNavigate} goBack={goBackToList} pc={pc} pcMid={pcMid} pcDim={pcDim} sc={sc} tc={tc} ec={ec} today={today} leaving={detailLeaving} suppressBackRef={suppressBackRef} projectLinks={projectLinks} setProjectLinks={setProjectLinks} phaseDurationDefaults={phaseDurationDefaults} followedProjects={followedProjects} toggleFollowProject={toggleFollowProject} />;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRY STATE — Pulse structural model
  // ═══════════════════════════════════════════════════════════

  const TABS = [
    { key: "all", label: "All", count: summary.all },
    { key: "active", label: "In Flight", count: summary.active },
    { key: "shipped", label: "Shipped", count: summary.shipped },
    { key: "blocked", label: "Blocked", count: summary.blocked },
    { key: "deprioritized", label: "Deprioritized", count: summary.depri },
    { key: "upcoming", label: "Upcoming", count: summary.upcoming },
    { key: "overdue", label: "Overdue", count: summary.overdue },
  ];

  const tabLabelMap = { at_risk: "at risk", active: "in flight", shipped: "shipped", blocked: "blocked", deprioritized: "deprioritized", upcoming: "upcoming", overdue: "overdue", all: "" };
  const isSyntheticTab = activeTab === "at_risk";

  // ── Shared Th wrapper ──
  const Th = ({ col, children, style: s }) => (
    <SharedTh col={col} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
      style={s}>{children}</SharedTh>
  );

  return (
    <div ref={devRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4, ["--flow-sticky-top"]: "142px" }}>

      {/* ── GRAPH-PAPER GRID BACKGROUND — behind the PROJECTS headline ── */}
      {viewMode !== "board" && viewMode !== "gantt" && (
        <div ref={bgRef} aria-hidden="true" style={{
          position: "absolute", top: -24, left: -24, right: -24, height: 220,
          overflow: "hidden", pointerEvents: "none", zIndex: 0, lineHeight: 0,
          backgroundImage: `linear-gradient(${FD.border} 1px, transparent 1px), linear-gradient(90deg, ${FD.border} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          backgroundPosition: "-1px -1px",
          opacity: 0.6,
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(to bottom, ${rgbaFromColor(c.surface, 0)} 0%, ${rgbaFromColor(c.surface, 0)} 40%, ${c.surface} 100%)`,
          }} />
        </div>
      )}

      {toastAnim.mounted && (
        <div role="alert" aria-live="assertive" style={{
          position: "fixed", bottom: space[5], left: 0, right: 0, zIndex: 200,
          display: "flex", justifyContent: "center", pointerEvents: "none",
          animation: `${toastAnim.visible ? "slideUp" : "slideDownOut"} ${toastAnim.visible ? motion.normal.duration : motion.fast.duration} ${toastAnim.visible ? motion.normal.easing : "cubic-bezier(0.4, 0, 1, 1)"} both`,
        }}>
        <div style={{
          background: c.redDim, border: `1px solid ${c.red}`, borderRadius: layout.radiusMd,
          padding: `${space[2]}px ${space[4]}px`,
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red,
          boxShadow: c.shadowFloat, display: "flex", alignItems: "center", gap: space[3],
          pointerEvents: "auto",
        }}>
          <span>{createError}</span>
          <button onClick={() => { setCreateError(null); if (createErrorTimerRef.current) clearTimeout(createErrorTimerRef.current); }}
            aria-label="Dismiss"
            style={{ background: "transparent", border: "none", color: c.red, cursor: "pointer", fontSize: 14, fontWeight: 700, padding: space[1], lineHeight: 1, borderRadius: layout.radiusXs }}>
            ✕
          </button>
        </div>
        </div>
      )}

      {successToastAnim.mounted && createSuccess && (
        <div role="status" aria-live="polite" style={{
          position: "fixed", bottom: space[5], left: 0, right: 0, zIndex: 201,
          display: "flex", justifyContent: "center", pointerEvents: "none",
          animation: `${successToastAnim.visible ? "slideUp" : "slideDownOut"} ${successToastAnim.visible ? motion.slow.duration : motion.fast.duration} ${successToastAnim.visible ? motion.slow.easing : "cubic-bezier(0.4, 0, 1, 1)"} both`,
        }}>
          <div style={{
            background: c.surfaceSolid,
            border: `1.5px solid ${c.green}`,
            borderLeft: `6px solid ${c.green}`,
            borderRadius: layout.radiusMd,
            padding: `${space[3]}px ${space[4]}px`,
            boxShadow: `0 12px 32px rgba(5,150,105,0.22), 0 4px 12px rgba(15,23,42,0.12)`,
            display: "flex", alignItems: "center", gap: space[3],
            pointerEvents: "auto",
            minWidth: 380, maxWidth: 560,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: c.green, color: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 800, flexShrink: 0,
              boxShadow: `0 0 0 4px ${c.greenDim}`,
            }}>✓</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: typo.bodyMd.font, fontSize: 15, fontWeight: 700,
                color: c.text, letterSpacing: "-0.01em", lineHeight: 1.2,
              }}>
                Project created
              </div>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: 13, color: c.textMid,
                display: "flex", alignItems: "center", gap: space[2], overflow: "hidden",
              }}>
                <span style={{
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontWeight: 600, color: c.text,
                }}>{createSuccess.name}</span>
                {createSuccess.id && (
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                    color: c.amber, background: c.amberDim,
                    padding: "2px 7px", borderRadius: layout.radiusXs,
                    letterSpacing: "0.02em", flexShrink: 0,
                  }}>{createSuccess.id}</span>
                )}
              </div>
            </div>
            <button onClick={() => { setCreateSuccess(null); if (createSuccessTimerRef.current) clearTimeout(createSuccessTimerRef.current); }}
              aria-label="Dismiss"
              style={{
                background: "transparent", border: "none", color: c.textDim,
                cursor: "pointer", fontSize: 14, fontWeight: 700,
                padding: space[1], lineHeight: 1, borderRadius: layout.radiusXs,
                flexShrink: 0,
              }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── PAGE TITLE — pixel-mosaic "PROJECTS" SVG over the grid ── */}
      <Motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", minHeight: 92 }}>
        <img src="/projects-title.svg?v=2" alt="Projects" style={{ height: 84, width: "auto", display: "block" }} />
      </Motion.div>

      {/* ── HEADER ROW — full-width search · quarter · view · filter · add (sticky, white bar) ── */}
      <Motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
        style={{
        position: "sticky", top: 0, zIndex: 60,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: 16,
        margin: "0 -24px",
        background: FD.surface,
      }}>
          {/* Search — fixed width, rest of cluster pushed right */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", width: 532, marginRight: "auto" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FD.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, pointerEvents: "none" }}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              className="flow-search-input"
              ref={localSearchRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFocusIdx(0); }}
              placeholder="Search across projects, people & more"
              style={{
                height: 48,
                width: "100%",
                padding: "0 56px 0 42px",
                borderRadius: 12,
                border: `1px solid ${searchGlow ? "#8F583D" : "#F8F4F1"}`,
                background: "#FBF9F8",
                fontSize: 14,
                color: "#58270E",
                outline: "none",
                transition: `border-color ${motion.fast.duration} ${motion.fast.easing}`,
              }}
            />
            <span style={{ position: "absolute", right: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, fontWeight: 500, color: "#6E5649", padding: "4px 8px", borderRadius: 8, background: "#F4EEEB" }}>⌘K</span>
          </div>
          {/* Quarter picker */}
          {timeframe && (
            <FdQuarterPicker timeframe={timeframe} setTimeframe={setTimeframe} />
          )}
          {/* View switch */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, padding: 4, borderRadius: 8, background: "#FBF9F8", border: "1px solid #F8F4F1" }}>
            {[
              { key: "registry", icon: <><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></> },
              { key: "board", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></> },
              { key: "gantt", icon: <><line x1="6" y1="20" x2="6" y2="11"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></> },
            ].map(v => {
              const on = viewMode === v.key;
              return (
                <button key={v.key} onClick={() => { setViewMode(v.key); setBoardFullscreen(false); setGanttFullscreen(false); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 8, borderRadius: 6, border: "none", cursor: "pointer",
                    background: on ? FD.surface : "transparent", boxShadow: on ? "0 1px 1px rgba(14,14,14,0.08)" : "none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={on ? FD.textPrimary : FD.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{v.icon}</svg>
                </button>
              );
            })}
          </div>
          {/* My Lens pill — far right */}
          {toggleMyLens && (
            <button
              type="button"
              onClick={toggleMyLens}
              title={myLens ? "My Lens ON — showing your squad + followed projects" : "My Lens — filter to your squad + followed projects"}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                height: 44, padding: "0 6px 0 14px",
                borderRadius: 8,
                border: "1px solid transparent",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14, fontWeight: 500,
                color: FD.textPrimary,
              }}
            >
              <span>My Lens</span>
              <span style={{
                display: "inline-block",
                width: 34, height: 20, borderRadius: 4,
                background: myLens ? "#280E01" : "#F4EEEB",
                position: "relative",
                transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
              }}>
                <span style={{
                  position: "absolute", top: 2, left: myLens ? 16 : 2,
                  width: 16, height: 16, borderRadius: 2,
                  background: "#fff",
                  boxShadow: "0 0 4.8px rgba(14,14,14,0.07)",
                  transition: `left ${motion.fast.duration} ${motion.fast.easing}`,
                }} />
              </span>
            </button>
          )}
      </Motion.div>

      {/* ═══════════════════════════════════════════════════════════
          Filter tabs — sticky below the toolbar
          ═══════════════════════════════════════════════════════════ */}
        {/* ── FILTER DROPDOWN + TABS + NEW PROJECT (sticky below the toolbar) ── */}
        <Motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          style={{
            position: "sticky", top: 80, zIndex: 55,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            padding: "10px 24px", margin: "0 -24px",
            background: FD.surface,
          }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter dropdown — Squad / Owner / Track / Status */}
            <div ref={filterRef} style={{ position: "relative" }}>
              <button type="button" onClick={() => setFilterOpen(o => !o)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 10px", borderRadius: 12, cursor: "pointer",
                border: `1px solid ${activeFilterCount ? "#8F583D" : "#F1EAE4"}`,
                background: activeFilterCount ? "#FBF4EF" : FD.surface,
                fontSize: 14, fontWeight: 400, color: "#7E5E4E",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>
                Filter
                {activeFilterCount > 0 && (
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, fontWeight: 600, lineHeight: 1, color: "#fff", background: "#8F583D", borderRadius: 9999, minWidth: 16, height: 16, padding: "0 5px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{activeFilterCount}</span>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7E5E4E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: filterOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {filterOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 200,
                  background: FD.surface, border: "1px solid #F1EAE4", borderRadius: 14,
                  boxShadow: c.shadowFloat || "0 12px 40px rgba(14,14,14,0.16)",
                  width: 308, maxHeight: 480, display: "flex", flexDirection: "column", overflow: "hidden",
                }}>
                  <div style={{ overflowY: "auto", padding: "6px 6px 2px" }}>
                    {filterSections.map(sec => (
                      <div key={sec.key} style={{ padding: "8px 8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#9C8576" }}>{sec.label}</span>
                          {sec.selected.length > 0 && (
                            <button type="button" onClick={() => sec.setter([])} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "#8F583D", padding: 0 }}>Clear</button>
                          )}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {sec.options.map(opt => {
                            const on = sec.selected.includes(opt.value);
                            return (
                              <button key={opt.value} type="button" onClick={() => toggleFilter(sec.setter, opt.value)} style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "5px 10px", borderRadius: 9999, cursor: "pointer",
                                border: `1px solid ${on ? "#8F583D" : "#F1EAE4"}`,
                                background: on ? "#280E01" : FD.surface,
                                color: on ? "#fff" : "#7E5E4E",
                                fontSize: 13, fontWeight: on ? 500 : 400, lineHeight: 1.4,
                                transition: "background 120ms, border-color 120ms",
                              }}>{sec.key === "track" && TRACK_GLYPHS[opt.value]}{opt.label}</button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #F4EEEB", background: "#FBF9F8" }}>
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, color: "#6E5649" }}>{tabProjects.length} project{tabProjects.length === 1 ? "" : "s"}</span>
                    <button type="button" onClick={clearAllFilters} disabled={!activeFilterCount} style={{
                      border: "none", background: "transparent",
                      cursor: activeFilterCount ? "pointer" : "default",
                      fontSize: 13, fontWeight: 500, color: activeFilterCount ? "#8F583D" : "#C9BAB0", padding: 0,
                    }}>Clear all</button>
                  </div>
                </div>
              )}
            </div>
            {[
              { key: "all", label: "All", count: summary.all },
              { key: "active", label: "Active", count: summary.active },
              { key: "shipped", label: "Shipped", count: summary.shipped },
              { key: "blocked", label: "Blocked", count: summary.blocked },
              { key: "deprioritized", label: "Deprioritised", count: summary.depri },
              { key: "overdue", label: "Overdue", count: summary.overdue },
            ].map(opt => {
              const isActive = activeTab === opt.key;
              return (
                <Motion.button key={opt.key} onClick={() => setActiveTab(opt.key)}
                  whileTap={{ scale: 0.94 }}
                  whileHover={isActive ? undefined : { y: -1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                  position: "relative",
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 8px 8px 12px", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${isActive ? "transparent" : "#F1EAE4"}`,
                  background: isActive ? "transparent" : FD.surface,
                  fontSize: 14, fontWeight: isActive ? 500 : 400, letterSpacing: "-0.1px",
                  color: isActive ? "#58270E" : "#7E5E4E",
                }}>
                  {isActive && (
                    <Motion.span layoutId="tabActiveHighlight"
                      transition={{ type: "spring", stiffness: 480, damping: 38 }}
                      style={{ position: "absolute", inset: 0, borderRadius: 12, border: "1px solid #8F583D", background: "#FBF9F8", zIndex: 0 }} />
                  )}
                  <span style={{ position: "relative", zIndex: 1 }}>{opt.label}</span>
                  <span style={{ position: "relative", zIndex: 1, padding: "2px 8px", borderRadius: 9999, background: "#F4EEEB", fontSize: 13, fontWeight: isActive ? 500 : 400, color: "#6E5649" }}>{opt.count}</span>
                </Motion.button>
              );
            })}
          </div>
          {/* New Project */}
          <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 16px", borderRadius: 8, border: "none", background: "#280E01", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#fff", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        </Motion.div>
      {/* end frozen top */}

      {/* Project detail side sheet (ported from flow_AS) — opens on row click with the real project's data, closes on backdrop/Esc */}
      {detailSheetId && (() => {
        const p = projects.find(x => x.id === detailSheetId);
        if (!p) return null;
        const statusMap = { in_flight: "inflight", shipped: "done", blocked: "paused", deprioritized: "cancelled", upcoming: "discovery" };
        const sheetProject = {
          name: p.name,
          code: p.id,
          updatedAt: p.lastActivityAt ? timeAgo(p.lastActivityAt) : "just now",
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          dueDate: p.endDate ? new Date(p.endDate) : null,
          statusKey: statusMap[p.status] || "inflight",
          squads: p.squad ? [p.squad] : [],
          bookmarked: (followedProjects || []).includes(p.id),
          ...mapProjectSections(p, metrics[p.id], people, projectLinks),
        };
        return createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 999, pointerEvents: "none" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.14)", backdropFilter: "blur(0.5px)" }} />
            <ProjectDetailSheet project={sheetProject} onClose={() => setDetailSheetId(null)} />
          </div>,
          document.body
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 1, marginTop: -4 }}>

      {/* ── INLINE BOARD VIEW ── */}
      {viewMode === "board" ? (() => {
        // Columns = the 6 tracks (no GA)
        const columns = trackNames;
        // Build column data: a project appears in every column where it has an active track
        const columnProjects = {};
        columns.forEach(t => { columnProjects[t] = []; });
        const upcomingBoardProjects = [];
        const shippedBoardProjects = [];
        tabProjects.forEach(proj => {
          if (proj.status === "upcoming") { upcomingBoardProjects.push(proj); return; }
          if (proj.status === "shipped" || proj.status === "complete") { shippedBoardProjects.push(proj); return; }
          const active = getActiveTracks(proj);
          if (active.length === 0) return; // no active tracks, skip
          active.forEach(t => { if (columnProjects[t]) columnProjects[t].push(proj); });
        });

        // Drag helpers
        const setDragOverPhase = (ph) => { dragOverRef.current = ph; setDragOverPhaseRaw(ph); };

        const handleDragStart = (e, projId, fromTrack) => {
          e.dataTransfer.setData("text/plain", JSON.stringify({ projId, fromTrack }));
          e.dataTransfer.effectAllowed = "move";
          setDraggingId(projId);
          requestAnimationFrame(() => {
            e.target.style.opacity = "0.3";
            e.target.style.pointerEvents = "none";
          });
        };
        const handleDragEnd = (e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.pointerEvents = "auto";
          setDraggingId(null);
          setDragOverPhase(null);
        };
        const handleDragOver = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const mouseX = e.clientX;
          for (const [ph, el] of Object.entries(colRefs.current)) {
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (mouseX >= rect.left && mouseX <= rect.right) {
              if (dragOverRef.current !== ph) setDragOverPhase(ph);
              return;
            }
          }
        };
        const handleDrop = (e, targetTrack) => {
          e.preventDefault();
          const actualTarget = dragOverRef.current || targetTrack;
          setDragOverPhase(null);
          setDraggingId(null);
          let payload;
          try { payload = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
          const { projId, fromTrack } = payload;
          if (!projId || fromTrack === actualTarget) return;
          const proj = projects.find(p => p.id === projId);
          if (!proj) return;
          // Permission check
          const dropMemberIds = isDevSeedMode() ? new Set((devStore.listMembers(proj.id) || []).map(m => m.person_id)) : new Set();
          const dropRole = getProjectRole(personProfile?.id, proj, dropMemberIds, isAdmin);
          if (!can.manageTracks(dropRole)) return;

          // Upcoming project → just start the target track, change status to in_flight
          if (fromTrack === "__upcoming__") {
            const todayStr = new Date().toISOString().slice(0, 10);
            startTrackInDB(proj.id, actualTarget, projects);
            updateProjectInDB(proj.id, { status: "in_flight", startDate: todayStr, tentativeStartDate: null });
            setProjects(prev => prev.map(p => {
              if (p.id !== projId) return p;
              const updated = { ...p, tracks: { ...p.tracks }, status: "in_flight", startDate: todayStr, tentativeStartDate: null, lastActivityAt: new Date().toISOString() };
              if (!updated.tracks[actualTarget]) updated.tracks[actualTarget] = { periods: [], owner: null };
              updated.tracks[actualTarget] = { ...updated.tracks[actualTarget], periods: [...updated.tracks[actualTarget].periods, { started_at: new Date().toISOString(), completed_at: null }] };
              updated.phase = derivePrimaryPhase(updated);
              return updated;
            }));
            window.__flowToast?.(`<b>${proj.name}</b> started with ${actualTarget} track`);
            return;
          }

          // Check if target track is already active
          const targetStatus = getTrackStatus(proj, actualTarget);
          if (targetStatus === "active") {
            window.__flowToast?.({ message: `${actualTarget} track already open on <b>${proj.name}</b>`, icon: "warn" });
            return;
          }

          // If target track was previously completed, show reopen modal
          if (targetStatus === "completed") {
            setBoardReopenModal({ projId, fromTrack, toTrack: actualTarget });
            setBoardReopenReason("");
            return;
          }

          // Normal: complete fromTrack, start toTrack
          completeTrackInDB(proj.id, fromTrack, projects);
          startTrackInDB(proj.id, actualTarget, projects);
          setProjects(prev => prev.map(p => {
            if (p.id !== projId) return p;
            const updated = { ...p, tracks: { ...p.tracks }, lastActivityAt: new Date().toISOString() };
            // Complete fromTrack
            if (updated.tracks[fromTrack]) {
              const periods = [...updated.tracks[fromTrack].periods];
              const last = periods[periods.length - 1];
              if (last && !last.completed_at) periods[periods.length - 1] = { ...last, completed_at: new Date().toISOString() };
              updated.tracks[fromTrack] = { ...updated.tracks[fromTrack], periods };
            }
            // Start toTrack
            if (!updated.tracks[actualTarget]) updated.tracks[actualTarget] = { periods: [], owner: null };
            updated.tracks[actualTarget] = { ...updated.tracks[actualTarget], periods: [...updated.tracks[actualTarget].periods, { started_at: new Date().toISOString(), completed_at: null }] };
            updated.phase = derivePrimaryPhase(updated);
            return updated;
          }));
          window.__flowToast?.(`<b>${proj.name}</b> ${fromTrack} completed & ${actualTarget} started`);
        };

        // Complete a single track on hover-click
        const handleBoardDone = (e, proj, trackName) => {
          e.stopPropagation();
          const doneMemIds = isDevSeedMode() ? new Set((devStore.listMembers(proj.id) || []).map(m => m.person_id)) : new Set();
          const doneRole = getProjectRole(personProfile?.id, proj, doneMemIds, isAdmin);
          if (!can.manageTracks(doneRole)) return;
          completeTrackInDB(proj.id, trackName, projects);
          setProjects(prev => prev.map(p => {
            if (p.id !== proj.id) return p;
            const updated = { ...p, tracks: { ...p.tracks }, lastActivityAt: new Date().toISOString() };
            if (updated.tracks[trackName]) {
              const periods = [...updated.tracks[trackName].periods];
              const last = periods[periods.length - 1];
              if (last && !last.completed_at) periods[periods.length - 1] = { ...last, completed_at: new Date().toISOString() };
              updated.tracks[trackName] = { ...updated.tracks[trackName], periods };
            }
            updated.phase = derivePrimaryPhase(updated);
            return updated;
          }));
          window.__flowToast?.(`<b>${proj.name}</b> ${trackName} track completed`);
        };

        return (
          <div style={{
            display: "flex", flexDirection: "column", gap: space[4],
            minWidth: columns.length * 180,
            padding: `${space[2]}px 0`,
          }}>
            {/* Track columns */}
            <div style={{
              display: "flex", gap: space[3],
              maxHeight: "calc(100vh - 280px)", minHeight: 400,
            }}>
            {columns.map(track => {
              const phColor = pc[track] || c.textDim;
              const cards = columnProjects[track] || [];
              const isOver = dragOverPhase === track;
              return (
                <div key={track}
                  ref={el => { colRefs.current[track] = el; }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, track)}
                  style={{
                    flex: 1, minWidth: 180, display: "flex", flexDirection: "column",
                    borderRadius: 16,
                    background: isOver ? FD.surface2 : FD.surface,
                    border: `1px solid ${isOver ? FD.borderDark : FD.border}`,
                    boxShadow: "none",
                    transform: isOver ? "scale(1.01)" : "scale(1)",
                    transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`,
                  }}
                >
                  {/* Column header */}
                  <div style={{
                    padding: `${space[3]}px ${space[4]}px`,
                    borderBottom: `1px solid ${FD.border}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: phColor }} />
                      <span style={{
                        fontSize: 14, fontWeight: 600, letterSpacing: "-0.1px",
                        color: FD.textPrimary,
                      }}>{track}</span>
                    </div>
                    <span style={{
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                      fontWeight: 600, color: FD.textTertiary,
                      background: FD.surface2, padding: "2px 8px",
                      borderRadius: layout.radiusPill,
                    }}>{cards.length}</span>
                  </div>

                  {/* Cards */}
                  <div style={{
                    flex: 1, overflowY: "auto", padding: space[3],
                    display: "flex", flexDirection: "column", gap: space[2],
                    scrollbarWidth: "thin", scrollbarColor: `${c.textDim}20 transparent`,
                    minHeight: 80,
                  }}>
                    {cards.length === 0 && (
                      <div style={{
                        padding: `${space[6]}px ${space[3]}px`,
                        textAlign: "center",
                        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                        color: FD.textTertiary,
                        border: `2px dashed ${FD.border}`, borderRadius: 12,
                        pointerEvents: "none",
                      }}>Drop here</div>
                    )}
                    {cards.map(proj => {
                      const m = metrics[proj.id] || {};
                      const active = getActiveTracks(proj);
                      const otherTracks = active.filter(t => t !== track);
                      const isHovered = boardHoverId === `${proj.id}-${track}`;

                      return (
                        <div
                          key={`${proj.id}-${track}`}
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(e) => handleDragStart(e, proj.id, track)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openProject(proj.id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProject(proj.id); } }}
                          onMouseEnter={(e) => { setBoardHoverId(`${proj.id}-${track}`); const el = e.currentTarget; el.style.transform = "scale(1.01)"; el.style.borderColor = FD.textSecondary; }}
                          onMouseLeave={(e) => { setBoardHoverId(null); const el = e.currentTarget; el.style.transform = "scale(1)"; el.style.borderColor = FD.border; }}
                          style={{
                            padding: 14, position: "relative", overflow: "hidden",
                            borderRadius: 12,
                            background: FD.surface,
                            border: `1px solid ${FD.border}`,
                            borderLeft: `3px solid ${phColor}`,
                            boxShadow: "none",
                            cursor: "grab",
                            display: "flex", flexDirection: "column", gap: space[2],
                            transition: `border-color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`,
                          }}
                        >
                          {/* Done button — appears on hover */}
                          {isHovered && (
                            <button type="button"
                              onClick={(e) => handleBoardDone(e, proj, track)}
                              title={`Complete ${track} track`}
                              style={{
                                position: "absolute", top: 6, right: 6, zIndex: 2,
                                width: 22, height: 22, borderRadius: 6,
                                background: FD.success, border: "none",
                                color: "#fff", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, lineHeight: 1, fontWeight: 700,
                                transition: `opacity ${motion.fast.duration}`,
                                opacity: 0.95,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.95"; }}
                            >✓</button>
                          )}

                          {/* ID + priority + blocked */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                              <span style={{
                                fontFamily: typo.monoMd.font, fontSize: 11,
                                fontWeight: 600, letterSpacing: "0.02em",
                                color: FD.textTertiary,
                              }}>{proj.id}</span>
                              {proj.priority && (() => {
                                const pri = FD_PRIORITY[proj.priority] || FD_PRIORITY.P2;
                                return <Tag color={pri.color} bg={pri.bg} style={{ fontSize: 9, padding: "1px 5px" }}>{proj.priority}</Tag>;
                              })()}
                            </div>
                            {m.overdue && <span title="Overdue" style={{ display: "inline-flex", color: FD.warning }}><Icon name="alert-triangle" size={12} /></span>}
                            {m.isBlocked && <Tag color={FD.error} bg={FD.errorSubtle} style={{ fontSize: 9, padding: "1px 5px", fontWeight: 700 }}>BLOCKED</Tag>}
                          </div>

                          {/* Name */}
                          <div style={{
                            fontSize: 14, fontWeight: 600, color: FD.textPrimary, lineHeight: 1.4,
                          }}>{proj.name}</div>

                          {/* Owner + squad */}
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            fontSize: 12, color: FD.textSecondary,
                          }}>
                            <span style={{ fontWeight: 500 }}>{proj.owner || "—"}</span>
                            <span style={{
                              padding: "1px 7px", borderRadius: 999,
                              background: FD.surface2,
                              fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 600, color: FD.textTertiary,
                            }}>{proj.squad}</span>
                          </div>

                          {/* Other active tracks indicator */}
                          {otherTracks.length > 0 && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
                              borderTop: `1px solid ${FD.border}`,
                              paddingTop: space[2], marginTop: 2,
                            }}>
                              <span style={{ fontFamily: typo.monoSm.font, fontSize: 9, color: FD.textTertiary, fontWeight: 600 }}>also:</span>
                              {otherTracks.map(t => (
                                <span key={t} style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  padding: "1px 6px", borderRadius: layout.radiusXs,
                                  background: FD.surface2,
                                  color: FD.textTertiary,
                                  fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 600,
                                }}>
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: pc[t] || c.textDim }} />
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            </div>

            {/* Shipped — horizontal strip */}
            {shippedBoardProjects.length > 0 && (
              <div style={{
                background: FD.surface,
                borderRadius: 16,
                border: `1px solid ${FD.border}`,
              }}>
                <div style={{
                  padding: `${space[3]}px ${space[4]}px`,
                  borderBottom: `1px solid ${FD.border}`,
                  display: "flex", alignItems: "center", gap: space[2],
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: FD.success }} />
                  <span style={{
                    fontSize: 14, fontWeight: 600, letterSpacing: "-0.1px",
                    color: FD.textPrimary,
                  }}>Shipped</span>
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                    fontWeight: 600, color: FD.textTertiary,
                    background: FD.surface2, padding: "2px 8px",
                    borderRadius: layout.radiusPill,
                  }}>{shippedBoardProjects.length}</span>
                </div>
                <div style={{
                  display: "flex", gap: space[3], padding: space[3],
                  overflowX: "auto",
                  scrollbarWidth: "thin", scrollbarColor: `${c.textDim}20 transparent`,
                }}>
                  {shippedBoardProjects.map(proj => (
                    <div key={proj.id} role="button" tabIndex={0}
                      onClick={() => openProject(proj.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProject(proj.id); } }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.01)"; e.currentTarget.style.borderColor = FD.textSecondary; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = FD.border; }}
                      style={{
                        minWidth: 220, maxWidth: 260, padding: 14, borderRadius: 12,
                        background: FD.surface, border: `1px solid ${FD.border}`,
                        borderLeft: `3px solid ${FD.success}`,
                        boxShadow: "none", cursor: "pointer",
                        display: "flex", flexDirection: "column", gap: space[2], flexShrink: 0,
                        transition: `border-color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                        <span style={{ fontFamily: typo.monoMd.font, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", color: FD.textTertiary }}>{proj.id}</span>
                        <Tag color={FD.success} bg={FD.successSubtle} style={{ fontSize: 9, padding: "1px 6px", fontWeight: 700 }}>SHIPPED</Tag>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: FD.textPrimary, lineHeight: 1.4 }}>{proj.name}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: FD.textSecondary }}>
                        <span style={{ fontWeight: 500 }}>{proj.owner || "—"}</span>
                        <span style={{ padding: "1px 7px", borderRadius: 999, background: FD.surface2, fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 600, color: FD.textTertiary }}>{proj.squad}</span>
                      </div>
                      {proj.shipped_at && (
                        <div style={{ fontFamily: typo.monoSm.font, fontSize: 9, color: FD.textTertiary, borderTop: `1px solid ${FD.border}`, paddingTop: space[1], marginTop: 2 }}>
                          Shipped {fmtDate(proj.shipped_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming — horizontal strip at bottom */}
            {upcomingBoardProjects.length > 0 && (
              <div style={{
                background: FD.surface,
                borderRadius: 16,
                border: `1px solid ${FD.border}`,
              }}>
                <div style={{
                  padding: `${space[3]}px ${space[4]}px`,
                  borderBottom: `1px solid ${FD.border}`,
                  display: "flex", alignItems: "center", gap: space[2],
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: FD.textTertiary }} />
                  <span style={{
                    fontSize: 14, fontWeight: 600, letterSpacing: "-0.1px",
                    color: FD.textPrimary,
                  }}>Upcoming</span>
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                    fontWeight: 600, color: FD.textTertiary,
                    background: FD.surface2, padding: "2px 8px",
                    borderRadius: layout.radiusPill,
                  }}>{upcomingBoardProjects.length}</span>
                </div>
                <div style={{
                  display: "flex", gap: space[3], padding: space[3],
                  overflowX: "auto",
                  scrollbarWidth: "thin", scrollbarColor: `${c.textDim}20 transparent`,
                }}>
                  {upcomingBoardProjects.map(proj => (
                    <div key={proj.id} role="button" tabIndex={0}
                      draggable
                      onDragStart={(e) => handleDragStart(e, proj.id, "__upcoming__")}
                      onDragEnd={handleDragEnd}
                      onClick={() => openProject(proj.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProject(proj.id); } }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.01)"; e.currentTarget.style.borderColor = FD.textSecondary; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = FD.border; }}
                      style={{
                        minWidth: 220, maxWidth: 260, padding: 14, borderRadius: 12,
                        background: FD.surface2, border: `1px solid ${FD.border}`,
                        boxShadow: "none", cursor: "pointer",
                        display: "flex", flexDirection: "column", gap: space[2], flexShrink: 0,
                        transition: `border-color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                        <span style={{ fontFamily: typo.monoMd.font, fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", color: FD.textTertiary }}>{proj.id}</span>
                        {proj.priority && (() => {
                          const pri = FD_PRIORITY[proj.priority] || FD_PRIORITY.P2;
                          return <Tag color={pri.color} bg={pri.bg} style={{ fontSize: 9, padding: "1px 5px" }}>{proj.priority}</Tag>;
                        })()}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: FD.textPrimary, lineHeight: 1.4 }}>{proj.name}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: FD.textSecondary }}>
                        <span style={{ fontWeight: 500 }}>{proj.owner || "—"}</span>
                        <span style={{ padding: "1px 7px", borderRadius: 999, background: FD.surface, fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 600, color: FD.textTertiary }}>{proj.squad}</span>
                      </div>
                      {proj.tentativeStartDate && (
                        <div style={{ fontFamily: typo.monoSm.font, fontSize: 9, color: FD.textTertiary, borderTop: `1px solid ${FD.border}`, paddingTop: space[1], marginTop: 2 }}>
                          Starts {fmtDate(proj.tentativeStartDate)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Board reopen modal */}
            {boardReopenModal && (() => {
              const proj = projects.find(p => p.id === boardReopenModal.projId);
              if (!proj) return null;
              const { fromTrack, toTrack } = boardReopenModal;
              return (
                <Modal open onClose={() => setBoardReopenModal(null)} title={`Reopen ${toTrack} track`} accent={c.amber}>
                  <div style={{ display: "flex", flexDirection: "column", gap: space[3], padding: `${space[2]}px 0` }}>
                    <Body style={{ color: c.textMid }}>
                      <B>{toTrack}</B> was previously completed on <B color={ec.project}>{proj.id}</B>. This will complete <B>{fromTrack}</B> and reopen <B>{toTrack}</B>.
                    </Body>
                    <input
                      placeholder="Reason for reopening (optional)"
                      value={boardReopenReason}
                      onChange={e => setBoardReopenReason(e.target.value)}
                      style={{
                        fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                        padding: `${space[2]}px ${space[3]}px`, borderRadius: layout.radiusSm,
                        border: `1px solid ${c.border}`, background: c.surfaceAlt,
                        color: c.text, outline: "none",
                      }}
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("board-reopen-confirm")?.click(); } }}
                    />
                    <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end" }}>
                      <Btn variant="secondary" size="sm" onClick={() => setBoardReopenModal(null)}>Cancel</Btn>
                      <Btn id="board-reopen-confirm" variant="command" size="sm" style={{ borderColor: `${c.amber}60`, color: c.amber }} onClick={() => {
                        const reasonVal = boardReopenReason.trim() || null;
                        // Complete fromTrack
                        completeTrackInDB(proj.id, fromTrack, projects);
                        // Reopen toTrack
                        reopenTrackInDB(proj.id, toTrack, projects, { reason: reasonVal });
                        setProjects(prev => prev.map(p => {
                          if (p.id !== proj.id) return p;
                          const updated = { ...p, tracks: { ...p.tracks }, lastActivityAt: new Date().toISOString() };
                          // Complete fromTrack
                          if (updated.tracks[fromTrack]) {
                            const periods = [...updated.tracks[fromTrack].periods];
                            const last = periods[periods.length - 1];
                            if (last && !last.completed_at) periods[periods.length - 1] = { ...last, completed_at: new Date().toISOString() };
                            updated.tracks[fromTrack] = { ...updated.tracks[fromTrack], periods };
                          }
                          // Reopen toTrack
                          if (updated.tracks[toTrack]) {
                            updated.tracks[toTrack] = { ...updated.tracks[toTrack], periods: [...updated.tracks[toTrack].periods, { started_at: new Date().toISOString(), completed_at: null }] };
                          }
                          updated.phase = derivePrimaryPhase(updated);
                          return updated;
                        }));
                        window.__flowToast?.(`<b>${proj.name}</b> ${fromTrack} completed & ${toTrack} reopened`);
                        setBoardReopenModal(null);
                      }}>
                        Reopen {toTrack}
                      </Btn>
                    </div>
                  </div>
                </Modal>
              );
            })()}
          </div>
        );
      })() :

      /* ── INLINE TIMELINE VIEW ── */
      viewMode === "gantt" ? (
        <div style={{ minHeight: 500, border: `1px solid ${c.border}`, borderRadius: layout.radiusLg, overflow: "hidden" }}>
          <GanttChart
            projects={tabProjects}
            today={today}
            onProjectClick={(id) => openProject(id)}
          />
        </div>
      ) :

      /* ── LIST VIEW ── */
      tabProjects.length === 0 ? (() => {
        const hasGlobalFilter = (globalFilters.owner?.length || globalFilters.squad?.length || globalFilters.person?.length);
        const tabWord = tabLabelMap[activeTab] || "";
        let title = "No projects";
        let message = `No ${tabWord ? tabWord + " " : ""}projects found.`;
        // "Add project" never resolves synthetic-tab filters — hide it there.
        let action = !isSyntheticTab ? "Add project" : (isSyntheticTab ? "Back to Active" : null);
        let onAction = isSyntheticTab ? () => setActiveTab("active") : () => setShowCreate(true);
        if (search) {
          title = "No matches";
          message = "No projects match your search.";
          action = "Clear search"; onAction = () => setSearch("");
        } else if (hasGlobalFilter) {
          title = "No matching projects";
          message = "No projects match the current filters. Try adjusting or clearing filters.";
          action = null;
        } else if (projects.length === 0) {
          message = "Add your first project to start tracking work.";
        }
        return <EmptyState icon="folder" title={title} message={message} action={action} onAction={onAction} />;
      })() : (
        <div style={{ marginTop: 0, marginLeft: -24, marginRight: -24, overflow: "visible" }}>
          <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse" }}>
            <thead>
                <tr>
                  {[
                    { label: "Project Name", w: null, col: "project" },
                    { label: "Squad", w: 148, col: "squad" },
                    { label: "Team", w: 220, col: "people" },
                    { label: "Status", w: 140, col: "tracks" },
                    { label: "Timeline", w: 168, col: "timeline" },
                    { label: "Updated", w: 130, col: "updated" },
                  ].map((h, hi, arr) => {
                    const sortable = !!h.col;
                    const sorted = sortable && sortKey === h.col;
                    const isFirst = hi === 0;
                    const isLast = hi === arr.length - 1;
                    return (
                    <th key={h.col || `c${hi}`} onClick={sortable ? () => toggleSort(h.col) : undefined} style={{
                      position: "sticky", top: "var(--flow-sticky-top, 0px)", zIndex: 50,
                      width: h.w || undefined, textAlign: "left",
                      padding: `12px ${isLast ? 34 : 10}px 12px ${isFirst ? 34 : 10}px`,
                      background: "#FBF9F8", color: sorted ? "#58270E" : "#7E5E4E",
                      fontSize: 13, fontWeight: 500, letterSpacing: "-0.1px",
                      whiteSpace: "nowrap", cursor: sortable ? "pointer" : "default", userSelect: "none",
                    }}>
                      {h.label}
                    </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {tabProjects.map((proj, fi) => {
                  const m = metrics[proj.id] || {};
                  const isFocused = kbActive && fi === focusIdx;
                  const isHovered = hoveredProject === proj.id;
                  const isFollowed = (followedProjects || []).includes(proj.id);
                  const isDimmed = proj.status === "deprioritized";
                  const st = fdStatus(proj, m);
                  const pri = proj.priority || "P2";
                  const priStyle = FD_PRIORITY[pri] || FD_PRIORITY.P2;
                  const isShipped = proj.status === "shipped" || ["Alpha", "Beta", "GA"].includes(proj.phase);
                  const displayEnd = isShipped && proj.shipped_at ? proj.shipped_at.slice(0, 10) : proj.endDate;
                  const tracks = (m.activeTracks && m.activeTracks.length ? m.activeTracks : getActiveTracks(proj)) || [];
                  const stale = isStale(proj.lastActivityAt);
                  // Project progress (elapsed share of the timeline) — drives the in-progress donut
                  const allocatedDays = daysBetween(proj.startDate, displayEnd);
                  const elapsedDays = Math.max(0, Math.min(daysBetween(proj.startDate, today), allocatedDays));
                  const progressPct = allocatedDays > 0 ? Math.round((elapsedDays / allocatedDays) * 100) : 0;

                  // Team = owner + members
                  const ownerPerson = (people || []).find(p => p.id === proj.owner_id);
                  const memberIds = m.teamMembers || [];
                  const allTeam = [];
                  if (ownerPerson) allTeam.push(ownerPerson);
                  memberIds.forEach(mid => {
                    if (mid !== proj.owner_id) {
                      const p = peopleById.get(mid);
                      if (p) allTeam.push(p);
                    }
                  });
                  const showTeam = allTeam.slice(0, 1);
                  const extra = allTeam.length - showTeam.length;

                  const rowBg = isFocused ? FD.actionSubtle : isHovered ? FD.surface2 : FD.surface;
                  const cell = { padding: "0 10px", height: 60, color: FD.textSecondary, fontSize: 14, letterSpacing: "-0.1px", verticalAlign: "middle" };
                  const cellFirst = { ...cell, padding: "0 10px 0 34px" };
                  const cellLast = { ...cell, padding: "0 34px 0 10px" };
                  const isWatched = (followedProjects || []).includes(proj.id);

                  return (
                    <Motion.tr
                      key={proj.id}
                      ref={el => { if (el) el.__projId = proj.id; }}
                      {...(fi === 0 ? { "data-tour": "project-row" } : {})}
                      className={isFocused ? "flow-kb-focus" : undefined}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: isDimmed ? 0.55 : 1, y: 0 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: Math.min(fi * 0.022, 0.45) }}
                      onMouseEnter={() => setHoveredProject(proj.id)}
                      onMouseLeave={() => setHoveredProject(null)}
                      onClick={() => setDetailSheetId(proj.id)}
                      style={{ cursor: "pointer", background: rowBg, transition: `background ${motion.fast.duration} ${motion.fast.easing}` }}
                    >
                      {/* Name = status icon + ID + project name (+ at-risk badge if applicable) */}
                      <td style={cellFirst}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
                          <Tooltip label={st.label}>
                            <FdStatusIcon kind={st.kind} pct={progressPct} />
                          </Tooltip>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: FD.textPrimary }}>
                            <span style={{ fontWeight: 600, opacity: 0.7 }}>{proj.id}</span>
                            <span style={{ fontWeight: 500 }}>{proj.name}</span>
                          </span>
                          {st.kind === "atrisk" && (
                            <Tooltip label={m.overdue ? "Overdue — past expected end date" : "At risk — phase is running longer than the healthy threshold"}>
                              <span style={{
                                flexShrink: 0,
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "rgba(220, 38, 38, 0.10)",
                                color: FD.error,
                                border: "none",
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: "0.2px",
                                textTransform: "uppercase",
                                cursor: "default",
                              }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: FD.error }} />
                                At risk
                              </span>
                            </Tooltip>
                          )}
                        </span>
                      </td>

                      {/* Squad — leading squad + collaborating squads overflow */}
                      <td style={cell}>
                        {(() => {
                          const collab = (proj.collabSquads || []).filter(s => s && s !== proj.squad);
                          if (!proj.squad) return "—";
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 400 }}>{proj.squad}</span>
                              {collab.length > 0 && (
                                <Tooltip label={
                                  <span style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
                                    <span style={{ fontWeight: 600 }}>Also collaborating</span>
                                    {collab.map(s => <span key={s} style={{ fontWeight: 400 }}>{s}</span>)}
                                  </span>
                                }>
                                  <span style={{
                                    flexShrink: 0,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: 28, height: 28, borderRadius: "50%",
                                    border: "1px dashed #D0D4DD",
                                    background: "transparent",
                                    color: FD.textPrimary,
                                    fontSize: 12,
                                    fontWeight: 400,
                                    cursor: "default",
                                  }}>+{collab.length}</span>
                                </Tooltip>
                              )}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Team — lead avatar + lead name + remaining members count */}
                      <td style={cell}>
                        {(() => {
                          const leadName = ownerPerson?.name || proj.owner;
                          const others = allTeam.filter(p => !ownerPerson || p.id !== ownerPerson.id);
                          if (!leadName && allTeam.length === 0) return <span style={{ color: FD.textTertiary }}>—</span>;
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                              <Tooltip label={
                                <span style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
                                  <span style={{ fontWeight: 600 }}>{leadName} · Lead</span>
                                  {ownerPerson?.role && <span style={{ fontWeight: 400, opacity: 0.7 }}>{ownerPerson.role}</span>}
                                </span>
                              }>
                                <span style={{ fontWeight: 400 }}>{leadName || "—"}</span>
                              </Tooltip>
                              {others.length > 0 && (
                                <Tooltip label={
                                  <span style={{ display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
                                    {others.map(p => <span key={p.id} style={{ fontWeight: 500 }}>{p.name}</span>)}
                                  </span>
                                }>
                                  <span style={{
                                    flexShrink: 0,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: 28, height: 28, borderRadius: "50%",
                                    border: "1px dashed #D0D4DD",
                                    background: "transparent",
                                    color: FD.textPrimary,
                                    fontSize: 12,
                                    fontWeight: 400,
                                    cursor: "default",
                                  }}>+{others.length}</span>
                                </Tooltip>
                              )}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Active Tracks — dashed chips with phase-colour icon (shipped = green tag) */}
                      <td style={cell}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                          {st.kind === "shipped" && (
                            <Tooltip label="Shipped">
                              <span style={{
                                flexShrink: 0,
                                display: "inline-flex", alignItems: "center", gap: 5,
                                padding: "3px 10px",
                                borderRadius: 8,
                                background: "rgba(5, 150, 105, 0.06)",
                                color: FD.success,
                                fontSize: 13,
                                fontWeight: 500,
                                letterSpacing: "-0.1px",
                                cursor: "default",
                              }}>
                                Shipped
                              </span>
                            </Tooltip>
                          )}
                          {st.kind !== "shipped" && tracks.length === 0 && <span style={{ color: FD.textTertiary }}>—</span>}
                          {st.kind !== "shipped" && trackNames.filter(t => tracks.includes(t)).map(t => {
                            const glyph = TRACK_GLYPHS[t];
                            return (
                              <Tooltip key={t} label={`${t} — in progress`}>
                                <span style={{
                                  flexShrink: 0,
                                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                                  width: 34, height: 34,
                                  borderRadius: "50%",
                                  background: FD.surface,
                                  border: "1px dashed #EEE4DD",
                                  cursor: "default",
                                }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, flexShrink: 0 }}>{glyph}</span>
                                </span>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </td>

                      {/* Timeline — matches secondary text (shipped final date keeps a tooltip) */}
                      <td style={cell}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: FD.textSecondary, fontWeight: 400, whiteSpace: "nowrap" }}>
                          <span>{fdDate(proj.startDate)} – {st.kind === "shipped" ? (
                            <Tooltip label={`Successfully published on ${fdDate(displayEnd)}`}>
                              <span>{fdDate(displayEnd)}</span>
                            </Tooltip>
                          ) : fdDate(displayEnd)}</span>
                        </span>
                      </td>

                      {/* Last updated — always visible */}
                      <td style={{ ...cellLast, position: "relative" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: stale ? FD.error : FD.textSecondary, whiteSpace: "nowrap" }}>
                          <span title={proj.lastActivityAt ? fmtAbsolute(proj.lastActivityAt) : "No activity yet"}>{proj.lastActivityAt ? timeAgo(proj.lastActivityAt) : "—"}</span>
                          {latestActivity[proj.id] && (
                            <span
                              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15, opacity: 0.55, cursor: "default", flexShrink: 0 }}
                              onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.opacity = "0.9"; showActivityTip({ projId: proj.id, rect: e.currentTarget.getBoundingClientRect() }); }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.55"; hideActivityTip(); }}
                            >
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5" /><line x1="8" y1="7" x2="8" y2="11" /><circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" /></svg>
                            </span>
                          )}
                        </span>
                        {/* My Lens star — follow toggle, revealed on row hover (stays filled when followed) */}
                        {(isHovered || isFollowed) && (
                          <button
                            type="button"
                            title={isFollowed ? "Remove from My Lens" : "Add to My Lens"}
                            aria-label={isFollowed ? "Remove from My Lens" : "Add to My Lens"}
                            aria-pressed={isFollowed}
                            onClick={(e) => { e.stopPropagation(); toggleFollowProject?.(proj.id); }}
                            style={{
                              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                              width: 32, height: 32, flexShrink: 0,
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              border: "none", borderRadius: "50%", cursor: "pointer", padding: 0,
                              background: isFollowed ? "#F4EEEB" : "transparent",
                              transition: "background 120ms ease, transform 120ms ease",
                            }}
                            onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.background = "#F4EEEB"; e.currentTarget.style.transform = "translateY(-50%) scale(1.08)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = isFollowed ? "#F4EEEB" : "transparent"; e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                          >
                            <svg width="12" height="14" viewBox="0 0 14 16.5" fill={isFollowed ? "#8F583D" : "none"} stroke="#8F583D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11.6611 1.01867C12.5783 1.12511 13.25 1.91583 13.25 2.83916V15.75L7 12.625L0.75 15.75V2.83916C0.75 1.91583 1.42173 1.12511 2.3389 1.01867C3.86797 0.841221 5.42333 0.75 7 0.75C8.57667 0.75 10.132 0.841222 11.6611 1.01867Z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </Motion.tr>
                  );
                })}
              </tbody>
          </table>
        </div>
      )}
      <div style={{ flexShrink: 0, height: space[8] }} />
      </div>

      {/* Activity peek tooltip — portal to body so it escapes table overflow:clip */}
      {activityTip && (() => {
        const act = latestActivity[activityTip.projId];
        if (!act) return null;
        const r = activityTip.rect;
        const tipW = 280;
        const cx = r.left + r.width / 2;
        const idealLeft = cx - tipW / 2;
        const clampedLeft = Math.max(12, Math.min(idealLeft, window.innerWidth - tipW - 12));
        const arrowLeft = cx - clampedLeft;
        return createPortal(
          <div
            onMouseEnter={() => clearTimeout(activityTipTimer.current)}
            onMouseLeave={() => hideActivityTip()}
            style={{
              position: "fixed",
              top: r.bottom + 8, left: clampedLeft,
              background: c.surfaceSolid, border: `1px solid ${c.border}`,
              borderRadius: layout.radiusSm, boxShadow: c.shadowFloat,
              padding: `${space[2]}px ${space[3]}px`,
              width: tipW, zIndex: 10000,
              animation: `fadeScaleIn ${motion.fast.duration} ${motion.fast.easing} both`,
              transformOrigin: "top center",
            }}
          >
            <div style={{
              position: "absolute", top: -4, left: `${arrowLeft}px`, transform: "translateX(-50%) rotate(45deg)",
              width: 8, height: 8, background: c.surface,
              borderLeft: `1px solid ${c.border}`, borderTop: `1px solid ${c.border}`,
            }} />
            {act.kind === "comment" ? (<>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ display: "inline-flex", flexShrink: 0, color: c.textMid }}><Icon name="message-circle" size={12} /></span>
                <span style={{ fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.text }}>{act.author}</span>
              </div>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: 12, lineHeight: 1.4, color: c.textMid,
                overflow: "hidden", display: "-webkit-box",
                WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>{act.body}</div>
            </>) : (
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: 12, lineHeight: 1.4, color: c.textDim, fontStyle: "italic",
              }}>{act.body}</div>
            )}
          </div>,
          document.body
        );
      })()}

      {/* Create Project Overlay */}
      {showCreate && <CreateProjectOverlay
        projects={projects} people={people} squads={squads} setProjects={setProjects}
        personProfile={personProfile}
        onClose={() => setShowCreate(false)}
        onCreated={(id, name) => {
          setCreateSuccess({ name, id });
          if (createSuccessTimerRef.current) clearTimeout(createSuccessTimerRef.current);
          createSuccessTimerRef.current = setTimeout(() => { setCreateSuccess(null); createSuccessTimerRef.current = null; }, 4500);
          setSelectedProject(id);
        }}
      />}

      {/* ═══ LIST-LEVEL START NOW MODAL ═══ */}
      {listStartNowId && (() => {
        const targetProj = projects.find(p => p.id === listStartNowId);
        if (!targetProj) return null;
        return (
          <Modal open={true} onClose={() => { setListStartNowId(null); setListStartNowEndDate(""); }} title="Start this project" accent={c.accent}>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[4] }}>
              Select tracks to start for <strong style={{ color: c.text }}>{targetProj.name}</strong>. The start date will be set to today.
            </div>
            <div style={{ display: "flex", gap: space[2], flexWrap: "wrap", marginBottom: space[4] }}>
              {trackNames.map(t => {
                const sel = listStartNowTracks.includes(t);
                const phColor = pc[t] || c.textDim;
                return (
                  <button key={t} type="button" onClick={() => setListStartNowTracks(prev => sel ? prev.filter(x => x !== t) : [...prev, t])} style={{
                    padding: `8px 16px`, borderRadius: layout.radiusSm,
                    background: sel ? phColor + "18" : c.surfaceAlt,
                    border: `1.5px solid ${sel ? phColor : c.border}`,
                    color: sel ? phColor : c.textMid,
                    fontFamily: typo.monoSm.font, fontSize: 12, fontWeight: 700,
                    letterSpacing: "0.04em", cursor: "pointer",
                    transition: `all ${motion.fast.duration} ${motion.fast.easing}`,
                  }}>{t}</button>
                );
              })}
            </div>
            {/* Tentative end date */}
            <div style={{ marginBottom: space[5] }}>
              <label style={{ fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid, letterSpacing: "0.03em", display: "block", marginBottom: 6 }}>
                TENTATIVE END DATE
              </label>
              <input
                type="date"
                value={listStartNowEndDate}
                onChange={e => setListStartNowEndDate(e.target.value)}
                min={today}
                style={{
                  width: "100%", boxSizing: "border-box", height: 40,
                  borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                  background: c.surfaceSolid, fontFamily: typo.bodyMd.font, fontSize: 14,
                  color: listStartNowEndDate ? c.text : c.textDim,
                  padding: `0 ${space[3]}px`, outline: "none",
                  colorScheme: "light",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
              <Btn variant="ghost" size="sm" onClick={() => { setListStartNowId(null); setListStartNowEndDate(""); }}>Cancel</Btn>
              <Btn variant="primary" size="sm" disabled={listStartNowTracks.length === 0} onClick={() => {
                const todayStr = today;
                const now = new Date().toISOString();
                const newTracks = {};
                for (const t of listStartNowTracks) {
                  newTracks[t] = { periods: [{ started_at: now, completed_at: null }], owner: null };
                }
                const primaryPhase = listStartNowTracks[listStartNowTracks.length - 1];
                const endDateVal = listStartNowEndDate || null;
                setProjects(prev => prev.map(p => p.id === listStartNowId ? { ...p, status: "in_flight", phase: primaryPhase, tracks: newTracks, startDate: todayStr, tentativeStartDate: null, endDate: endDateVal } : p));
                updateProjectInDB(listStartNowId, { status: "in_flight", phase: primaryPhase, startDate: todayStr, tentativeStartDate: null, endDate: endDateVal });
                if (isDevSeedMode()) {
                  const proj = rawProjects.find(p => p.id === listStartNowId);
                  if (proj) { proj.tracks = newTracks; proj.status = "in_flight"; proj.phase = primaryPhase; proj.startDate = todayStr; proj.endDate = endDateVal; devStore.persistProjects(rawProjects); }
                  const viewerName = personProfile?.name || "AJ";
                  devStore.logEvent({ projectId: listStartNowId, action: "project_started", userName: viewerName, details: { tracks: listStartNowTracks.join(", ") } });
                }
                window.__flowToast?.(`${targetProj.name} started with ${listStartNowTracks.join(", ")}`);
                setListStartNowId(null);
                setListStartNowTracks(["PRD"]);
                setListStartNowEndDate("");
              }}>Start Project</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* Board and Gantt fullscreen overlays removed — both are now inline */}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   CREATE PROJECT OVERLAY
   ══════════════════════════════════════════════════════════════════ */
function CreateProjectOverlay({ projects, people, squads, setProjects, onClose, onCreated, personProfile }) {
  useDevLabel('CreateProjectOverlay', 'src/views/ProjectsView.jsx', 'Modal overlay form for creating new projects with all field inputs');
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(personProfile?.name || "");
  const [squad, setSquad] = useState(personProfile?.squad || "");
  const [priority, setPriority] = useState("P2");
  const [tentativeStart, setTentativeStart] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dependencies, setDependencies] = useState([]);
  const [depSearch, setDepSearch] = useState("");
  const [depOpen, setDepOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const allSquads = squads && squads.length
    ? [...squads].sort()
    : [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();
  const allOwners = people ? people.map(p => p.name).sort() : [...new Set(projects.map(p => p.owner).filter(Boolean))].sort();

  const previewId = useMemo(() => {
    const nums = projects.map(p => parseInt(p.id.replace(/\D/g, ""), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `X${String(max + 1).padStart(2, "0")}`;
  }, [projects]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const startDate = tentativeStart;
  const canSave = name.trim() && owner && squad;

  const handleCreate = () => {
    if (!canSave || saving) return;
    setSaving(true);
    const tempId = previewId;
    const now = new Date().toISOString();
    const newProj = {
      id: tempId, name: name.trim(), description: null,
      owner, squad, phase: null, startDate: null, endDate: endDate || null,
      status: "upcoming",
      tracks: {},
      tentativeStartDate: tentativeStart || null,
      priority, complexity: null,
      isBlocked: false, blockedReason: null, blockedAt: null,
      lastActivityAt: now, createdAt: now,
      phaseDurationOverrides: null,
      dependencies: dependencies.length > 0 ? dependencies : null,
    };
    setProjects(prev => [...prev, newProj]);
    onClose();
    if (onCreated) onCreated(tempId, name.trim());
  };

  // Warm "brown tone" palette — matches the Projects toolbar / filter dropdown
  const B = {
    ink: "#58270E",       // headings + input text
    body: "#7E5E4E",      // labels + secondary text
    muted: "#9C8576",     // optional suffixes + counters
    border: "#F1EAE4",    // input + chip borders
    inset: "#FBF9F8",     // input background
    insetAlt: "#F4EEEB",  // disabled / muted chip background
    surface: "#FFFFFF",   // unselected chip background
    accent: "#8F583D",    // warm accent
    primary: "#280E01",   // primary button + selected chip
  };
  const brownTone = { border: B.border, bg: B.inset, text: B.ink, muted: B.muted, accent: B.accent, accentDim: B.insetAlt, fieldBg: B.inset };

  const inputStyle = {
    width: "100%", height: 40, padding: `0 ${space[3]}px`,
    borderRadius: layout.radiusSm, border: `1px solid ${B.border}`,
    background: B.inset, color: B.ink,
    fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
    outline: "none", boxSizing: "border-box",
  };

  const fieldLabel = { fontFamily: typo.bodyXs.font, fontSize: 12, fontWeight: 600, color: B.ink, marginBottom: space[1], letterSpacing: 0 };

  const PillSelector = ({ options, value, onChange }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: space[1] }}>
      {options.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontFamily: typo.bodySm.font,
              fontSize: 13,
              fontWeight: 600,
              border: `1px solid ${selected ? B.primary : B.border}`,
              background: selected ? B.primary : B.surface,
              color: selected ? "#fff" : B.body,
              cursor: "pointer",
              transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
              lineHeight: 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  const priorityOpts = [
    { value: "P0", label: "Critical", color: c.red },
    { value: "P1", label: "P1", color: c.amber },
    { value: "P2", label: "P2", color: c.textMid },
    { value: "P3", label: "P3", color: c.textDim },
  ];

  const complexityOpts = [
    { value: "S", label: "Low", color: c.green },
    { value: "M", label: "Med", color: c.amber },
    { value: "L", label: "High", color: c.red },
  ];

  const depCandidates = useMemo(() => {
    const filtered = projects.filter(p =>
      p.id !== previewId &&
      !dependencies.includes(p.id) &&
      (depSearch === "" || p.name.toLowerCase().includes(depSearch.toLowerCase()) || p.id.toLowerCase().includes(depSearch.toLowerCase()))
    );
    // Squad projects first, then the rest
    const mySquad = squad || personProfile?.squad;
    if (!mySquad) return filtered;
    const inSquad = filtered.filter(p => p.squad === mySquad);
    const rest = filtered.filter(p => p.squad !== mySquad);
    return [...inSquad, ...rest];
  }, [projects, previewId, dependencies, depSearch, squad, personProfile]);

  const depRef = useRef(null);
  useEffect(() => {
    if (!depOpen) return;
    const handler = (e) => { if (depRef.current && !depRef.current.contains(e.target)) setDepOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [depOpen]);

  return (
    <SideSheet open onClose={onClose} width={540} title="New project" floating>
      <div data-suppress-shortcuts style={{ width: "100%", minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          {/* Name */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={fieldLabel}>Name</div>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: name.length > 100 ? c.red : B.muted, fontVariantNumeric: "tabular-nums" }}>{name.length}/100</span>
            </div>
            <Inp value={name} onChange={e => { if (e.target.value.length <= 100) setName(e.target.value); }} placeholder="e.g. Checkout Redesign" style={{ width: "100%", border: `1px solid ${B.border}`, background: B.inset, color: B.ink }} autoFocus maxLength={100} />
          </div>

          {/* Owner + Squad */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
            <div>
              <div style={fieldLabel}>Owner</div>
              <SearchSelect value={owner} onChange={setOwner} options={allOwners} placeholder="Search people..." tone={brownTone} />
            </div>
            <div>
              <div style={fieldLabel}>Squad</div>
              <SearchSelect value={squad} onChange={setSquad} options={allSquads} placeholder="Search squads..." tone={brownTone} />
            </div>
          </div>

          {/* Tentative dates */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
              <div>
                <div style={fieldLabel}>Tentative start date <span style={{ fontWeight: 400, color: B.muted }}>— optional</span></div>
                <input type="date" value={tentativeStart} onChange={e => setTentativeStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <div style={fieldLabel}>Tentative end date <span style={{ fontWeight: 400, color: B.muted }}>— optional</span></div>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || undefined} style={inputStyle} />
              </div>
            </div>
            {startDate && endDate && endDate <= startDate && (
              <div style={{ fontFamily: typo.bodySm.font, fontSize: 13, color: c.red, marginTop: space[1] }}>End date must be after start date</div>
            )}
          </div>
        </div>

        {/* Actions — pinned to the bottom of the sheet */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: space[2], marginTop: "auto", paddingTop: space[5] }}>
          <Btn variant="secondary" size="sm" onClick={onClose} style={{ border: `1px solid ${B.border}`, background: B.surface, color: B.body }}>Cancel</Btn>
          <button onClick={handleCreate} disabled={!canSave || saving} style={{
            height: 40, padding: "0 16px", borderRadius: 8,
            border: "none", cursor: canSave && !saving ? "pointer" : "default",
            background: canSave && !saving ? B.primary : B.insetAlt,
            color: canSave && !saving ? "#fff" : B.muted,
            fontFamily: "Geist, system-ui, -apple-system, sans-serif", fontSize: 14, fontWeight: 600,
            opacity: canSave && !saving ? 1 : 0.6,
            transition: `background ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, opacity ${motion.fast.duration} ${motion.fast.easing}`,
          }}>{saving ? "Creating..." : "Create project"}</button>
        </div>
      </div>
    </SideSheet>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECT DEEP DIVE — PeopleDeepDive structural model
   De-cluttered: hero → history → ledger → supporting metadata
   ══════════════════════════════════════════════════════════════════ */
function ProjectDeepDive({ proj, metrics: m, history, projects, setProjects, people, squads, personProfile, isAdmin = false, can: canProp, onNavigate, goBack, pc, pcMid, pcDim, sc, tc, ec, today, leaving = false, suppressBackRef, projectLinks = [], setProjectLinks, phaseDurationDefaults, followedProjects = [], toggleFollowProject }) {
  const can = canProp || defaultCan;
  useDevLabel('ProjectDeepDive', 'src/views/ProjectsView.jsx', 'Full project detail view with hero telemetry, timeline, and history');
  const [editing, setEditingRaw] = useState(false);
  const [editName, setEditName] = useState(proj.name);
  const [editOwner, setEditOwner] = useState(proj.owner);
  const [editSquad, setEditSquad] = useState(proj.squad);
  const [editPhase, setEditPhase] = useState(proj.phase);
  const [editStatus, setEditStatus] = useState(proj.status || "active");
  const [editStart, setEditStart] = useState(proj.startDate || "");
  const [editEnd, setEditEnd] = useState(proj.endDate || "");
  const [editActualStart, setEditActualStart] = useState(proj.actualStartDate || "");
  const [editActualEnd, setEditActualEnd] = useState(proj.actualEndDate || "");
  const [editPriority, setEditPriority] = useState(proj.priority || "P2");
  const [editComplexity, setEditComplexity] = useState(proj.complexity || "");
  const [editPhaseOverrides, setEditPhaseOverrides] = useState(proj.phaseDurationOverrides || {});
  const setEditing = useCallback((val) => {
    if (val) {
      setEditName(proj.name);
      setEditOwner(proj.owner); setEditSquad(proj.squad);
      setEditPhase(proj.phase); setEditStatus(proj.status || "active");
      setEditStart(proj.startDate || ""); setEditEnd(proj.endDate || "");
      setEditActualStart(proj.actualStartDate || ""); setEditActualEnd(proj.actualEndDate || "");
      setEditPriority(proj.priority || "P2"); setEditComplexity(proj.complexity || "");
    }
    setEditingRaw(val);
  }, [proj.name, proj.owner, proj.squad, proj.phase, proj.status, proj.startDate, proj.endDate, proj.actualStartDate, proj.actualEndDate, proj.priority, proj.complexity]);
  const [depriReasonModal, setDepriReasonModal] = useState(false);
  const [depriReasonText, setDepriReasonText] = useState("");
  const [blockedReasonModal, setBlockedReasonModal] = useState(false);
  const [blockedReasonText, setBlockedReasonText] = useState("");
  const [showOverrides, setShowOverrides] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [startNowModal, setStartNowModal] = useState(false);
  const [startNowTracks, setStartNowTracks] = useState(["PRD"]);
  const [startNowEndDate, setStartNowEndDate] = useState("");
  // Ship-phase modals: Alpha/Beta note + GA release note
  const [shipPhaseModal, setShipPhaseModal] = useState(null); // { phase, from }
  const [shipNote, setShipNote] = useState("");
  const [shipPct, setShipPct] = useState("");
  const [gaReleaseNote, setGaReleaseNote] = useState("");
  const [gaFeatureType, setGaFeatureType] = useState("New");
  const [showConfetti, setShowConfetti] = useState(false);
  const [trackReopenModal, setTrackReopenModal] = useState(false);
  const [trackReopenReason, setTrackReopenReason] = useState("");
  const [trackReopenTarget, setTrackReopenTarget] = useState(null);
  const [shipProjectModal, setShipProjectModal] = useState(false);
  const [shipProjectNote, setShipProjectNote] = useState("");
  const [shipProjectFeatureType, setShipProjectFeatureType] = useState("New");

  // Helper: log an event to activity feed, update lastActivityAt, show toast
  const recordAction = useCallback((action, details, toastMsg) => {
    const now = new Date().toISOString();
    // Update lastActivityAt
    setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, lastActivityAt: now } : p));
    // Log to activity feed
    if (isDevSeedMode()) {
      devStore.logEvent({ projectId: proj.id, action, details });
    }
    // Show toast
    if (toastMsg) window.__flowToast?.(toastMsg);
  }, [proj.id, setProjects]);
  const [reactivateModal, setReactivateModal] = useState(false);
  const [retroDateModal, setRetroDateModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(null); // cached overrides when a retro-date confirmation is open
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteDeps, setDeleteDeps] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsError, setDepsError] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [phaseTransitions, setPhaseTransitions] = useState([]);
  // Resources IIFE states — hoisted to component level to avoid conditional hook ordering
  const [resAdding, setResAdding] = useState(false);
  const [resNewType, setResNewType] = useState("prd");
  const [resNewLabel, setResNewLabel] = useState("");
  const [resNewUrl, setResNewUrl] = useState("");
  const [resTypeDropOpen, setResTypeDropOpen] = useState(false);
  const resTypeDropRef = useRef(null);
  const editBtnRef = useRef(null);
  const nameInpRef = useRef(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const feedbackFileRef = useRef(null);
  const [feedbackFileName, setFeedbackFileName] = useState("");
  const [shoutouts, setShoutouts] = useState([]);
  const [feedbackEvents, setFeedbackEvents] = useState([]);
  const feedbackSectionRef = useRef(null);

  const memberIds = useMemo(() => {
    if (isDevSeedMode()) {
      return new Set((devStore.listMembers(proj.id) || []).map(m => m.person_id));
    }
    return new Set();
  }, [proj.id]);

  const projRole = getProjectRole(personProfile?.id, proj, memberIds, isAdmin);

  useEffect(() => {
    const target = sessionStorage.getItem("flow_scroll_to");
    if (target === "feedback" && feedbackSectionRef.current) {
      sessionStorage.removeItem("flow_scroll_to");
      setTimeout(() => feedbackSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, []);

  useEffect(() => {
    if (!isDevSeedMode() || proj.status !== "shipped") return;
    const refresh = () => {
      const events = devStore.listEvents(proj.id) || [];
      setShoutouts(events.filter(e => e.action === "shoutout"));
      setFeedbackEvents(events.filter(e => e.action === "feedback"));
    };
    refresh();
    const unsub = devStore.subscribe((change) => {
      if (change.type === "events" && change.projectId === proj.id) refresh();
    });
    return unsub;
  }, [proj.id, proj.status]);


  // Tell App.jsx's global Escape handler to stand down whenever this deep-dive
  // is in edit mode or has a modal open — otherwise pressing Escape to close
  // the edit form would also navigate back to the project list.
  useEffect(() => {
    if (!suppressBackRef) return;
    suppressBackRef.current = !!(editing || deleteModal || depriReasonModal || blockedReasonModal || reactivateModal || retroDateModal || shipPhaseModal || trackReopenModal || shipProjectModal);
    return () => { if (suppressBackRef) suppressBackRef.current = false; };
  }, [editing, deleteModal, depriReasonModal, blockedReasonModal, reactivateModal, retroDateModal, shipPhaseModal, trackReopenModal, shipProjectModal, suppressBackRef]);

  // Fetch phase-change history from activity_log for this project.
  // Two formats coexist:
  //   • Legacy `edit_project` with details.phase   (pre-rewrite)
  //   • New     `project_phase_changed` with details.to  (post-rewrite)
  // Both get mapped to { at, phase, by } so the timeline component
  // doesn't need to know which format produced the row. In dev seed
  // mode we read from the in-memory devStore instead of Supabase.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let rows;
        if (isDevSeedMode()) {
          rows = devStore.listEvents(proj.id)
            .slice()
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else {
          const { data, error } = await supabase
            .from("activity_log")
            .select("created_at, user_name, action, details")
            .eq("entity_type", "project")
            .eq("entity_id", proj.id)
            .in("action", ["edit_project", "project_phase_changed", "project_created"])
            .order("created_at", { ascending: true });
          if (error || cancelled || !data) return;
          rows = data;
        }
        const transitions = (rows || [])
          .map(r => {
            const d = r.details || {};
            if (r.action === "project_phase_changed") {
              return d.to ? { at: r.created_at, phase: d.to, by: r.user_name } : null;
            }
            if (r.action === "edit_project" && d.phase) {
              return { at: r.created_at, phase: d.phase, by: r.user_name };
            }
            if (r.action === "project_created") {
              // Project starts in PRD by default; use creation timestamp.
              return { at: r.created_at, phase: "PRD", by: r.user_name };
            }
            return null;
          })
          .filter(Boolean);
        if (cancelled) return;
        setPhaseTransitions(transitions);
      } catch {
        /* swallow — transitions are a nice-to-have */
      }
    })();
    return () => { cancelled = true; };
  }, [proj.id]);

  // Safe default so missing metrics don't crash the view (e.g. first-render
  // race or brand-new project with no commits yet).
  if (!m) m = { historyTotal: 0, peopleList: [], weeklyData: [], overdue: false, atRisk: false, isBlocked: false, isStale: false };

  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef(null);
  useEffect(() => () => { if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current); }, []);

  // Enter edit mode: scroll to top + focus Name input
  const enterEdit = useCallback(() => {
    setEditing(true);
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { nameInpRef.current?.focus({ preventScroll: true }); } catch { nameInpRef.current?.focus(); }
      nameInpRef.current?.select?.();
    }));
  }, [setEditing]);

  // Exit edit mode: return focus to the Edit FAB (screen-reader / keyboard users)
  const exitEdit = useCallback(() => {
    setEditing(false);
    setTimeout(() => editBtnRef.current?.focus(), 0);
  }, [setEditing]);

  // Keyboard: E = enter edit, Esc = cancel (when form is open and no modal above)
  useKeyboard([
    { key: "e", fn: () => { if (!editing && !deleteModal && !depriReasonModal && !reactivateModal && !retroDateModal) enterEdit(); } },
    { key: "Escape", force: true, fn: () => { if (editing && !deleteModal && !depriReasonModal && !reactivateModal && !retroDateModal) { cancelEdits(); exitEdit(); } } },
  ], [editing, deleteModal, depriReasonModal, reactivateModal, retroDateModal, enterEdit, exitEdit]);

  const allSquads = useMemo(
    () => squads && squads.length
      ? [...squads].sort()
      : [...new Set(projects.map(p => p.squad).filter(Boolean))].sort(),
    [squads, projects]
  );
  const allOwners = useMemo(() => (people ? people.map(p => p.name).sort() : [...new Set(projects.map(p => p.owner).filter(Boolean))].sort()), [people, projects]);

  const doSave = (overrides = {}) => {
    const finalStatus = overrides.status ?? editStatus;
    const finalReason = overrides.depriReason !== undefined ? overrides.depriReason : proj.depriReason;
    const name = (editName || "").trim() || proj.name;
    // Sync toast is triggered by useSyncedSetters onSyncDone callback — no fake timer
    setProjects(prev => prev.map(p => p.id === proj.id ? {
      ...p,
      name,
      owner: editOwner, squad: editSquad, phase: editPhase,
      status: finalStatus, depriReason: finalReason,
      startDate: editStart || null, endDate: editEnd || null,
      actualStartDate: shipPhases.includes(editPhase) ? (editActualStart || null) : null,
      actualEndDate: shipPhases.includes(editPhase) ? (editActualEnd || null) : null,
      priority: editPriority, complexity: editComplexity || null,
      phaseDurationOverrides: Object.keys(editPhaseOverrides).length ? editPhaseOverrides : null,
    } : p));
    exitEdit();
    setJustSaved(true);
    if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
    justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 900);
    // Log edit save to activity + toast (unless a more specific action already fired one)
    if (!overrides.status) {
      recordAction("project_updated", { fields: "details" }, "Project updated");
    }
  };

  // Dates must be set together (can't have start without end or vice versa),
  // and end must be strictly after start.
  const dateError = (() => {
    if (!editStart && !editEnd) return null;
    if (!editStart) return "Start date is required when end date is set";
    if (!editEnd) return "End date is required when start date is set";
    if (editEnd < editStart) return "End date must be on or after start date";
    return null;
  })();
  const canSaveEdits = (editName || "").trim().length > 0 && !dateError;

  // Does this project have any history entries from past weeks (i.e., before
  // the current week's start)? If so, changing start/end dates retroactively
  // alters overdue calculations for those frozen weeks.
  const pastHistoryWeekCount = useMemo(() => {
    const projHist = history[proj.id] || [];
    return projHist.filter(w => w.entries?.length > 0).length;
  }, [history, proj.id]);
  const datesChanged = (editStart !== (proj.startDate || "")) || (editEnd !== (proj.endDate || ""));

  const saveEdits = () => {
    if (!canSaveEdits) return;
    // If status is changing to deprioritized, prompt for reason
    if (editStatus === "deprioritized" && proj.status !== "deprioritized") {
      setDepriReasonText("");
      setDepriReasonModal(true);
      return;
    }
    // If reactivating, confirm before clearing the reason (audit affordance).
    // If dates ALSO changed retroactively, the reactivate modal will chain into
    // the retro-date warning before saving (see reactivateModal handler).
    if (editStatus === "active" && proj.status === "deprioritized") {
      setReactivateModal(true);
      return;
    }
    // If plan dates change on a project with prior-week history, warn
    // that overdue status for those frozen weeks will shift.
    if (datesChanged && pastHistoryWeekCount > 0) {
      setPendingSave({});
      setRetroDateModal(true);
      return;
    }
    doSave();
  };
  const cancelEdits = () => {
    setEditName(proj.name);
    setEditOwner(proj.owner); setEditSquad(proj.squad); setEditPhase(proj.phase); setEditStatus(proj.status || "active");
    setEditStart(proj.startDate || ""); setEditEnd(proj.endDate || "");
    setEditActualStart(proj.actualStartDate || ""); setEditActualEnd(proj.actualEndDate || "");
    setEditPriority(proj.priority || "P2"); setEditComplexity(proj.complexity || "");
    exitEdit();
  };

  // ── Delete flow ──
  const handleDeleteClick = async () => {
    setDeleteModal(true);
    setDepsLoading(true);
    setDepsError(null);
    setDeleteDeps(null);
    setDeleteConfirmText("");
    try {
      const deps = await getProjectDependencies(proj.id);
      setDeleteDeps(deps);
    } catch (err) {
      setDepsError(err?.message || "Failed to check dependencies");
    } finally {
      setDepsLoading(false);
    }
  };
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const ok = await deleteProjectFromDB(proj.id);
      if (ok) {
        setProjects(prev => prev.filter(p => p.id !== proj.id));
        setDeleteModal(false);
        goBack();
      } else {
        setDepsError("Delete failed. Please try again.");
        setDeleting(false);
      }
    } catch (err) {
      setDepsError(err?.message || "Delete failed");
      setDeleting(false);
    }
  };

  const sCfg = sc[editStatus] || sc[proj.status] || sc.active;
  const allocated = daysBetween(proj.startDate, proj.endDate);
  const elapsed = Math.max(0, Math.min(daysBetween(proj.startDate, today), allocated));

  // Build full weekly matrix for phase timeline.
  // Entries with an unrecognized stage fall into an "Other" bucket so they're
  // still visible — previously they were silently dropped.
  const { weekPhaseMatrix, hasOtherBucket } = useMemo(() => {
    const projHist = history[proj.id] || [];
    const allWeeks = projHist.map(wk => wk.week);
    const knownPhases = ["PRD", "Design", "Dev", "QA"];
    const matrix = {};
    for (const w of allWeeks) {
      matrix[w] = {};
      for (const ph of knownPhases) matrix[w][ph] = [];
      matrix[w].Other = [];
    }
    let otherSeen = false;
    const place = (weekKey, entry) => {
      if (!matrix[weekKey]) return;
      const stage = entry.stage || "PRD";
      if (matrix[weekKey][stage]) {
        matrix[weekKey][stage].push(entry);
      } else {
        matrix[weekKey].Other.push({ ...entry, _unknownStage: entry.stage });
        otherSeen = true;
      }
    };
    for (const wk of projHist) {
      for (const e of wk.entries) place(wk.week, e);
    }
    return { weekPhaseMatrix: matrix, hasOtherBucket: otherSeen };
  }, [proj.id, history]);

  // ── Derived metrics for hero KPI grid ──
  const remaining = proj.endDate ? daysBetween(today, proj.endDate) : null;
  const hasPlannedDates = allocated > 0;
  const pct = hasPlannedDates ? Math.min(100, Math.round((elapsed / allocated) * 100)) : null;
  const daysUntilStart = proj.startDate ? daysBetween(today, proj.startDate) : 0;
  const notStarted = daysUntilStart > 0;
  const inShip = shipPhases.includes(proj.phase);
  const isDepri = proj.status === "deprioritized";
  const isOverdue = remaining != null && remaining < 0 && !inShip;
  const elapsedLabel = !hasPlannedDates ? "dates not set"
    : notStarted ? `starts in ${daysUntilStart}d`
    : isOverdue ? `${Math.abs(remaining)}d overdue`
    : `${pct}% elapsed`;
  const remainingValue = remaining == null ? "—"
    : notStarted ? `in ${daysUntilStart}d`
    : isDepri ? (remaining < 0 ? `ended ${Math.abs(remaining)}d ago` : `${remaining}d left`)
    : remaining < 0 ? (inShip ? `${Math.abs(remaining)}d past plan` : `${Math.abs(remaining)}d over`)
    : `${remaining}d`;
  const fmtShort = (d) => { if (!d) return "—"; const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };

  // ── Figma deep-dive: long date "May 12, 2026" ──
  const fmtLong = (d) => {
    if (!d) return null;
    const dt = new Date(String(d).slice(0, 10) + "T00:00:00");
    if (isNaN(dt)) return null;
    return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  // ── Figma deep-dive hero: status pill spec (blocked / deprioritized / shipped / upcoming) ──
  const heroPill = (() => {
    if (proj.isBlocked && proj.status !== "deprioritized" && proj.status !== "shipped") {
      return { tone: "error", text: proj.blockedReason || "Blocked", icon: "error" };
    }
    if (proj.status === "deprioritized") {
      return { tone: "warning", text: proj.depriReason || "Deprioritised", icon: "warning" };
    }
    if (proj.status === "shipped") {
      const when = proj.shippedAt || proj.gaEnteredAt;
      const whenLabel = when ? fmtLong(when) : null;
      return { tone: "success", text: whenLabel ? `Project shipped ${whenLabel}` : "Project shipped", icon: "rocket" };
    }
    if (proj.status === "upcoming") {
      return { tone: "neutral", text: "Upcoming", icon: null };
    }
    return null;
  })();

  // ── Figma deep-dive hero: primary action button (maps to existing handlers) ──
  const heroPrimary = (() => {
    if (!can.changeStatus(projRole)) {
      // viewers can still Edit if permitted
      if (!editing && can.editProject(projRole)) return { label: "Edit project", fn: enterEdit };
      return null;
    }
    if (proj.isBlocked && proj.status !== "deprioritized" && proj.status !== "shipped") {
      return {
        label: "Unblock",
        fn: () => {
          setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, isBlocked: false, blockedReason: null, blockedAt: null } : p));
          updateProjectInDB(proj.id, { isBlocked: false, blockedReason: null, blockedAt: null });
          recordAction("project_unblocked", { reason: proj.blockedReason }, "Project unblocked");
        },
      };
    }
    if (proj.status === "deprioritized") {
      return {
        label: "Move to active",
        fn: () => {
          setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, status: "in_flight", depriReason: null } : p));
          updateProjectInDB(proj.id, { status: "in_flight", depriReason: null });
          recordAction("project_status_changed", { from: "deprioritized", to: "in_flight" }, "Project moved back to in flight");
        },
      };
    }
    if (proj.status === "upcoming") {
      return { label: "Start now", fn: () => { setStartNowTracks(["PRD"]); setStartNowModal(true); } };
    }
    if (can.editProject(projRole)) return { label: "Edit project", fn: enterEdit };
    return null;
  })();

  // ── Figma deep-dive: meta fields row (only render fields with values) ──
  const complexityLabel = { S: "Low", M: "Med", L: "High", XL: "High" }[proj.complexity] || null;
  const heroFields = [
    proj.priority && { label: "Priority", value: proj.priority, accent: proj.priority === "P0" },
    proj.owner && { label: "Owner", value: proj.owner },
    proj.squad && { label: "Squad", value: proj.squad },
    complexityLabel && { label: "Complexity", value: complexityLabel },
    proj.createdAt && fmtLong(proj.createdAt) && { label: "Created on", value: fmtLong(proj.createdAt) },
  ].filter(Boolean);

  // ── Figma deep-dive sidebar: derive milestones from track period dates ──
  const heroMilestones = (() => {
    const trackStart = (t) => {
      const periods = proj.tracks?.[t]?.periods;
      if (!periods || !periods.length) return null;
      return periods[0].started_at;
    };
    const trackDone = (t) => getTrackStatus(proj, t) === "completed";
    const defs = [
      { label: "Kickoff", date: trackStart("PRD") || proj.startDate, done: !!trackStart("PRD") },
      { label: "PRD sign-off", date: proj.tracks?.PRD?.periods?.[0]?.completed_at, done: trackDone("PRD") },
      { label: "Design review", date: trackStart("Design"), done: trackDone("Design"), atRisk: getTrackStatus(proj, "Design") === "active" },
      { label: "Dev complete", date: proj.tracks?.Dev?.periods?.slice(-1)[0]?.completed_at, done: trackDone("Dev") },
      { label: "Launch readiness", date: proj.endDate, done: proj.status === "shipped" },
    ];
    return defs.map(d => ({
      label: d.label,
      date: d.date ? fdDate(d.date) : null,
      state: d.done ? "done" : d.atRisk ? "atrisk" : "future",
    }));
  })();

  // ── Resource link handlers (lifted to component scope so the sidebar card can use them) ──
  const RES_TYPE_OPTIONS = [
    { value: "prd", label: "PRD", icon: "file-text" },
    { value: "figma", label: "Figma", icon: "image" },
    { value: "qa_testcases", label: "QA Testcases", icon: "check-square" },
    { value: "gchat", label: "GChat Space", icon: "message-circle" },
    { value: "jira", label: "Jira Board", icon: "ticket" },
    { value: "custom", label: "Custom", icon: "link" },
  ];
  const RES_TYPE_LABELS = { prd: "PRD", figma: "Figma", qa_testcases: "QA Testcases", gchat: "GChat Space", jira: "Jira Board", custom: "Custom" };
  const addResourceLink = async () => {
    if (!resNewUrl.trim()) return;
    const result = await addProjectLinkToDB(proj.id, resNewType, resNewType === "custom" ? resNewLabel : null, resNewUrl.trim());
    if (result.ok && result.row && setProjectLinks) setProjectLinks(prev => [...prev, result.row]);
    const label = resNewType === "custom" && resNewLabel ? resNewLabel : RES_TYPE_LABELS[resNewType] || resNewType;
    recordAction("resource_added", { type: resNewType, label, url: resNewUrl.trim() }, `${label} resource added`);
    setResNewType("prd"); setResNewLabel(""); setResNewUrl(""); setResAdding(false);
  };

  // ── Risk tier derived from metrics ──
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: space[3], paddingBottom: 96,
      animation: leaving
        ? `fadeScaleOut ${motion.fast.duration} cubic-bezier(0.4, 0, 1, 1) both`
        : `viewMorphIn ${motion.normal.duration} ${motion.normal.easing} both`,
      transformOrigin: "center top",
    }}>

      {/* State (blocked / deprioritized / shipped / upcoming) is shown as the
          inline hero pill + primary action button — no separate top banners. */}

      {/* ═══ ALPHA / BETA RELEASE NOTE — above hero card ═══ */}
      {(() => {
        const hasAlphaOrBeta = (proj.shipNote || proj.shipPct != null) &&
          (proj.phase === "Alpha" || proj.phase === "Beta" ||
           proj.tracks?.Alpha?.periods?.some(p => !p.completed_at) ||
           proj.tracks?.Beta?.periods?.some(p => !p.completed_at));
        if (!hasAlphaOrBeta) return null;
        const releasePhase = proj.tracks?.Beta?.periods?.some(p => !p.completed_at) ? "Beta"
          : proj.tracks?.Alpha?.periods?.some(p => !p.completed_at) ? "Alpha"
          : proj.phase === "Beta" ? "Beta" : "Alpha";
        return (
          <div style={{
            padding: `${space[4]}px ${space[5]}px`,
            borderRadius: layout.radiusSm, background: c.greenDim,
            border: `1px solid ${c.green}20`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[2] }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700, color: c.green, letterSpacing: "0.08em", textTransform: "uppercase" }}>{releasePhase} Release</span>
              {proj.shipPct != null && (
                <span style={{
                  fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                  color: c.green, background: c.surface, padding: `2px 8px`,
                  borderRadius: layout.radiusXs, border: `1px solid ${c.green}30`,
                  marginLeft: "auto",
                }}>{proj.shipPct}% rollout</span>
              )}
              <button type="button" onClick={() => {
                setShipNote(proj.shipNote || "");
                setShipPct(proj.shipPct != null ? String(proj.shipPct) : "");
                setShipPhaseModal({ phase: releasePhase, from: releasePhase });
              }} style={{
                background: "none", border: "none", cursor: "pointer",
                color: c.textDim, fontSize: 11, fontWeight: 600,
                fontFamily: typo.bodySm.font, textDecoration: "underline",
                flexShrink: 0, marginLeft: proj.shipPct == null ? "auto" : 0,
              }}>Edit</button>
            </div>
            {proj.shipNote && (
              <div style={{ fontFamily: typo.bodyMd.font, fontSize: 14, color: c.textMid, lineHeight: 1.55 }}>
                {proj.shipNote}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ IDENTITY HEADER — project id + name + owner|squad + status + freshness ═══ */}
      {/* In read mode the hero sits on the bare page background (Figma); in edit mode it keeps card chrome. */}
      <div data-tour="project-hero" style={editing ? {
        padding: `${space[5]}px ${space[6]}px`, borderRadius: layout.radiusLg,
        background: c.surface,
        border: `1px solid ${justSaved ? c.green : c.border}`,
        boxShadow: justSaved ? `${c.shadowCard || ""}, 0 0 0 3px ${c.greenDim}` : c.shadowCard,
        transition: `border-color ${motion.normal.duration} ${motion.normal.easing}, box-shadow ${motion.normal.duration} ${motion.normal.easing}`,
        position: "relative", zIndex: 10,
      } : {
        position: "relative", zIndex: 10,
      }}>
        {!editing ? (
          <div key="read" style={{
            animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both`,
          }}>
            {/* ── Figma hero: meta line · title + status pill + actions · meta fields ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Meta line: id · squad/category · updated */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: FD.textTertiary }}>{proj.id}</span>
                {(proj.squad || proj.category) && (
                  <>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: FD.textTertiary, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: FD.textPrimary }}>{proj.squad || proj.category}</span>
                  </>
                )}
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: FD.textTertiary, flexShrink: 0 }} />
                {(() => {
                  const stale = isStale(proj.lastActivityAt);
                  const label = proj.lastActivityAt ? `Updated ${timeAgo(proj.lastActivityAt)}` : "No activity yet";
                  return (
                    <span title={proj.lastActivityAt ? fmtAbsolute(proj.lastActivityAt) : ""}
                      style={{ fontSize: 14, fontWeight: 500, color: stale ? FD.error : FD.textTertiary, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {stale && proj.lastActivityAt && <Icon name="alert-triangle" size={13} />}{label}
                    </span>
                  );
                })()}
              </div>

              {/* Title row: name + follow toggle + status pill — actions pinned right */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <h1 style={{
                  margin: 0, fontFamily: typo.displayLg.font,
                  fontSize: 40, fontWeight: 500, letterSpacing: "-1px", lineHeight: 1.1,
                  color: FD.textPrimary,
                }}>{proj.name}</h1>
                {heroPill && (() => {
                  const toneMap = {
                    error: { bg: FD.errorSubtle, fg: FD.error },
                    warning: { bg: FD.warningSubtle, fg: FD.warning },
                    success: { bg: FD.successSubtle, fg: FD.success },
                    neutral: { bg: FD.surface2, fg: FD.textSecondary },
                  };
                  const t = toneMap[heroPill.tone];
                  return (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 10px 8px 8px", borderRadius: 8,
                      background: t.bg, color: t.fg,
                      fontSize: 14, fontWeight: 500, maxWidth: 460,
                    }}>
                      {heroPill.icon === "error" && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      )}
                      {heroPill.icon === "warning" && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      )}
                      {heroPill.icon === "rocket" && <span style={{ display: "inline-flex", flexShrink: 0 }}><Icon name="rocket" size={16} color={t.fg} /></span>}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{heroPill.text}</span>
                    </span>
                  );
                })()}

                {/* Action buttons pinned right */}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {proj.status === "shipped" && (
                    <button type="button" onClick={() => {
                      const viewerName = personProfile?.name || "AJ";
                      if (isDevSeedMode()) {
                        devStore.logEvent({ projectId: proj.id, action: "shoutout", userName: viewerName, details: { from: viewerName, projectName: proj.name } });
                      }
                      window.__flowToast?.(`Shoutout sent for ${proj.name}!`);
                    }} style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      height: 40, padding: "0 16px", borderRadius: 10,
                      background: FD.surface, border: `1px solid ${FD.border}`,
                      color: FD.textPrimary, fontSize: 14, fontWeight: 500, cursor: "pointer",
                      transition: `border-color ${motion.fast.duration} ${motion.fast.easing}`,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = FD.textSecondary; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = FD.border; }}
                    >
                      <span style={{ display: "inline-flex" }}><Icon name="clap" size={15} /></span>
                      Give shoutout
                    </button>
                  )}
                  {toggleFollowProject && (() => {
                    const watching = followedProjects.includes(proj.id);
                    return (
                      <button type="button" onClick={() => toggleFollowProject(proj.id)} style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        height: 40, padding: "0 16px", borderRadius: 10,
                        background: FD.surface, border: `1px solid ${FD.border}`,
                        color: FD.textPrimary, fontSize: 14, fontWeight: 500, cursor: "pointer",
                        transition: `border-color ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = FD.textSecondary; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = FD.border; }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                        {watching ? "Watching" : "Watch this project"}
                      </button>
                    );
                  })()}
                  {heroPrimary && (
                    <button type="button" onClick={heroPrimary.fn} style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      height: 40, padding: "0 18px", borderRadius: 10,
                      background: FD.textPrimary, border: "none",
                      color: c.textOnAccent || c.surface, fontSize: 14, fontWeight: 500, cursor: "pointer",
                      transition: `opacity ${motion.fast.duration} ${motion.fast.easing}`,
                    }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                    >{heroPrimary.label}</button>
                  )}
                </div>
              </div>

              {/* Meta fields row */}
              {heroFields.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 64, flexWrap: "wrap" }}>
                  {heroFields.map(f => (
                    <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 400, color: FD.textTertiary }}>{f.label}</span>
                      <span style={{ fontSize: 16, fontWeight: f.accent ? 700 : 500, color: f.accent ? FD.error : FD.textPrimary }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Row 4: Active Tracks + quick-actions — hidden for upcoming and shipped */}
            {proj.status !== "upcoming" && proj.status !== "shipped" && <div style={{ marginTop: space[4], display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: space[3] }}>
              <div>
                <span style={{
                  fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase", color: c.textDim,
                  display: "block", marginBottom: space[1],
                }}>Active Tracks</span>
                <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
                  {(() => {
                    const activeTracks = getActiveTracks(proj);
                    const phColors = getPhaseColors();
                    const phMids = getPhaseMids();
                    return (
                      <>
                        {activeTracks.length > 0 ? activeTracks.map(t => (
                          <span key={t} style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: `4px 12px`, borderRadius: 999,
                            background: phMids[t] || c.surfaceAlt, color: phColors[t] || c.textMid,
                            fontFamily: typo.monoSm.font, fontSize: 12, fontWeight: 700,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            border: `1px solid ${(phColors[t] || c.textMid) + "30"}`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: phColors[t] || c.textMid }} />
                            {t}
                            <span style={{ fontFamily: typo.monoSm.font, fontSize: 10, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>
                              {getTrackActiveDays(proj, t)}d
                            </span>
                          </span>
                        )) : proj.status !== "shipped" ? (
                          <span style={{ fontFamily: typo.bodySm.font, fontSize: 12, color: c.textDim, fontStyle: "italic" }}>No active tracks</span>
                        ) : null}
                        {/* + Track button */}
                        {proj.status !== "shipped" && can.manageTracks(projRole) && (
                          <button id="add-track-btn" type="button" onClick={() => setStagePickerOpen(v => !v)} style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: `4px 10px`, borderRadius: 999,
                            background: "transparent", border: `1px dashed ${c.border}`,
                            color: c.textDim, fontFamily: typo.bodySm.font, fontSize: 11, fontWeight: 600,
                            cursor: "pointer", transition: "border-color 120ms ease, color 120ms ease",
                          }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.color = c.accent; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textDim; }}
                          >+ Track</button>
                        )}
                      </>
                    );
                  })()}
                  {stagePickerOpen && createPortal(
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 99999 }} onClick={() => setStagePickerOpen(false)} />
                      <div style={{
                        position: "fixed", zIndex: 100000,
                        top: (() => { const btn = document.getElementById("add-track-btn"); return btn ? btn.getBoundingClientRect().bottom + 4 : 0; })(),
                        left: (() => { const btn = document.getElementById("add-track-btn"); return btn ? btn.getBoundingClientRect().left : 0; })(),
                        background: c.surfaceSolid, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
                        boxShadow: c.shadowElevated, padding: space[1], minWidth: 140,
                        display: "flex", flexDirection: "column",
                      }}>
                        {trackNames.map(t => {
                          const tStatus = getTrackStatus(proj, t);
                          const phColor = getPhaseColors()[t] || c.textMid;
                          const isActive = tStatus === "active";
                          return (
                            <button key={t} type="button" onClick={() => {
                              if (!isActive) {
                                setStagePickerOpen(false);
                                if (t === "Alpha" || t === "Beta") {
                                  setShipNote(proj.shipNote || "");
                                  setShipPct(proj.shipPct != null ? String(proj.shipPct) : "");
                                  setShipPhaseModal({ phase: t, from: proj.phase, isTrackStart: true });
                                  return;
                                }
                                startTrackInDB(proj.id, t, projects);
                                setProjects(prev => {
                                  const copy = prev.map(p => {
                                    if (p.id !== proj.id) return p;
                                    const updated = { ...p, tracks: { ...p.tracks } };
                                    if (!updated.tracks[t]) updated.tracks[t] = { periods: [], owner: null };
                                    updated.tracks[t] = { ...updated.tracks[t], periods: [...updated.tracks[t].periods, { started_at: new Date().toISOString(), completed_at: null }] };
                                    updated.phase = derivePrimaryPhase(updated);
                                    if (updated.status === "upcoming") updated.status = "in_flight";
                                    return updated;
                                  });
                                  return copy;
                                });
                                window.__flowToast?.(`${t} track started`);
                              }
                              setStagePickerOpen(false);
                            }} disabled={isActive} style={{
                              padding: `6px 12px`, borderRadius: layout.radiusXs,
                              background: isActive ? c.surfaceAlt : "transparent",
                              border: "none", cursor: isActive ? "default" : "pointer", textAlign: "left",
                              fontFamily: typo.monoSm.font, fontSize: 12, fontWeight: isActive ? 700 : 500,
                              color: isActive ? phColor : c.text,
                              opacity: isActive ? 0.5 : 1,
                              display: "flex", alignItems: "center", gap: space[2],
                              transition: "background 80ms ease",
                            }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = c.surfaceAlt; }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                            >
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: phColor, flexShrink: 0 }} />
                              {t}
                              {isActive && <span style={{ marginLeft: "auto", fontSize: 10, color: c.textDim }}>active</span>}
                              {tStatus === "completed" && <span style={{ marginLeft: "auto", fontSize: 10, color: c.green }}>done</span>}
                            </button>
                          );
                        })}
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              </div>
              {can.changeStatus(projRole) && <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                {/* Ship Project */}
                {proj.status === "in_flight" && (
                  <button type="button" onClick={() => {
                    setShipProjectNote("");
                    setShipProjectFeatureType("New");
                    setShipProjectModal(true);
                  }} style={{
                    padding: `4px 10px`, borderRadius: 999,
                    background: c.greenDim, border: `1px solid ${c.green}40`,
                    color: c.green, fontFamily: typo.bodySm.font, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "background 120ms ease",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = c.green; e.currentTarget.style.color = c.surface; }}
                    onMouseLeave={e => { e.currentTarget.style.background = c.greenDim; e.currentTarget.style.color = c.green; }}
                  >Ship Project</button>
                )}
                {!proj.isBlocked && proj.status !== "deprioritized" && proj.status !== "shipped" && (
                  <button type="button" onClick={() => { setBlockedReasonText(""); setBlockedReasonModal(true); }} style={{
                    padding: `4px 10px`, borderRadius: 999,
                    background: "transparent", border: `1px solid ${c.border}`,
                    color: c.textDim, fontFamily: typo.bodySm.font, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "border-color 120ms ease, color 120ms ease",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.red; e.currentTarget.style.color = c.red; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textDim; }}
                  >Mark blocked</button>
                )}
                {proj.status !== "deprioritized" && proj.status !== "shipped" && (
                  <button type="button" onClick={() => { setDepriReasonText(""); setDepriReasonModal(true); }} style={{
                    padding: `4px 10px`, borderRadius: 999,
                    background: "transparent", border: `1px solid ${c.border}`,
                    color: c.textDim, fontFamily: typo.bodySm.font, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", transition: "border-color 120ms ease, color 120ms ease",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.amber; e.currentTarget.style.color = c.amber; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textDim; }}
                  >Deprioritize</button>
                )}
              </div>}
            </div>}

            {/* Completed Tracks Summary */}
            {proj.status !== "upcoming" && (() => {
              const completed = getCompletedTracks(proj);
              if (completed.length === 0) return null;
              const phColors = getPhaseColors();
              return (
                <div style={{ marginTop: space[2], display: "flex", alignItems: "center", gap: space[3], flexWrap: "wrap" }}>
                  {completed.map(({ name, days, cycles }) => (
                    <span key={name} style={{
                      fontFamily: typo.bodySm.font, fontSize: 11, color: c.textMid, lineHeight: 1.4,
                    }}>
                      <span style={{ color: phColors[name] || c.textMid, fontWeight: 600 }}>{name}</span>
                      {" "}completed in {days}d
                      {cycles > 1 && <span style={{ color: c.textDim }}>{" "}&middot; {cycles} cycles</span>}
                    </span>
                  ))}
                </div>
              );
            })()}

            {/* Tentative start date for upcoming projects */}
            {proj.status === "upcoming" && (
              <div style={{ marginTop: space[4], display: "flex", alignItems: "center", gap: space[3] }}>
                <span style={{ fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.textDim }}>Tentative Start</span>
                {can.editProject(projRole) ? (
                  <input type="date" value={proj.tentativeStartDate || ""}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const oldDate = proj.tentativeStartDate || "";
                      setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, tentativeStartDate: newDate || null } : p));
                      updateProjectInDB(proj.id, { tentativeStartDate: newDate || null });
                      recordAction("project_start_date_moved", { from: oldDate, to: newDate }, `Start date moved to ${newDate || "none"}`);
                    }}
                    style={{
                      height: 32, padding: `0 ${space[2]}px`, borderRadius: layout.radiusXs,
                      border: `1px solid ${c.border}`, background: c.surfaceSolid, color: c.text,
                      fontFamily: typo.monoSm.font, fontSize: 12,
                    }}
                  />
                ) : (
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: 12, color: c.text }}>
                    {proj.tentativeStartDate ? fmtDate(proj.tentativeStartDate) : "—"}
                  </span>
                )}
              </div>
            )}


          </div>
        ) : (
          <div key="edit" data-suppress-shortcuts style={{
            display: "flex", flexDirection: "column", gap: space[3], position: "relative", zIndex: 60,
            animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both`,
          }}>
            <div>
              <Label style={{ marginBottom: space[1] }}>Name</Label>
              <Inp ref={nameInpRef} value={editName} onChange={e => setEditName(e.target.value)} placeholder="Project name" style={{ width: "100%" }} maxLength={100} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
              <div style={{ position: "relative", zIndex: 6 }}>
                <Label style={{ marginBottom: space[1] }}>Owner</Label>
                <SearchSelect value={editOwner} onChange={setEditOwner} options={allOwners} placeholder="Search people..." />
              </div>
              <div style={{ position: "relative", zIndex: 5 }}>
                <Label style={{ marginBottom: space[1] }}>Squad</Label>
                <SearchSelect value={editSquad} onChange={setEditSquad} options={allSquads} placeholder="Search squads..." />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
              <div style={{ position: "relative", zIndex: 4 }}>
                <Label style={{ marginBottom: space[1] }}>Priority</Label>
                <Sel value={editPriority} onChange={e => setEditPriority(e.target.value)} style={{ width: "100%" }}>
                  <option value="P0">P0 — Critical</option>
                  <option value="P1">P1 — High</option>
                  <option value="P2">P2 — Medium</option>
                  <option value="P3">P3 — Low</option>
                </Sel>
              </div>
              <div>
                <Label style={{ marginBottom: space[1] }}>Complexity</Label>
                <Sel value={editComplexity} onChange={e => setEditComplexity(e.target.value)} style={{ width: "100%" }}>
                  <option value="">Not set</option>
                  <option value="S">Low</option>
                  <option value="M">Medium</option>
                  <option value="L">High</option>
                  <option value="XL">Very High</option>
                </Sel>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
              <div>
                <Label style={{ marginBottom: space[1] }}>Start date</Label>
                <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} style={{
                  width: "100%", height: 40, padding: `0 ${space[3]}px`,
                  borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                  background: c.surfaceAlt, color: c.text,
                  fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                  outline: "none", boxSizing: "border-box",
                }} />
              </div>
              <div>
                <Label style={{ marginBottom: space[1] }}>End date</Label>
                <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} style={{
                  width: "100%", height: 40, padding: `0 ${space[3]}px`,
                  borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                  background: c.surfaceAlt, color: c.text,
                  fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                  outline: "none", boxSizing: "border-box",
                }} />
              </div>
            </div>
            {dateError && (
              <div role="alert" style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600, color: c.red, display: "flex", alignItems: "center", gap: space[2], padding: `${space[2]}px ${space[3]}px`, background: c.redDim, border: `1px solid ${c.redBorder}`, borderRadius: layout.radiusSm }}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {dateError}
              </div>
            )}
            {shipPhases.includes(editPhase) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
                <div>
                  <Label style={{ marginBottom: space[1] }}>Actual start (optional)</Label>
                  <input type="date" value={editActualStart} onChange={e => setEditActualStart(e.target.value)} style={{
                    width: "100%", height: 40, padding: `0 ${space[3]}px`,
                    borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                    background: c.surfaceAlt, color: c.text,
                    fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                    outline: "none", boxSizing: "border-box",
                  }} />
                </div>
                <div>
                  <Label style={{ marginBottom: space[1] }}>Actual end (optional)</Label>
                  <input type="date" value={editActualEnd} onChange={e => setEditActualEnd(e.target.value)} style={{
                    width: "100%", height: 40, padding: `0 ${space[3]}px`,
                    borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                    background: c.surfaceAlt, color: c.text,
                    fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                    outline: "none", boxSizing: "border-box",
                  }} />
                </div>
              </div>
            )}
            {/* Per-project phase threshold overrides */}
            {(() => {
              const existingCount = Object.keys(proj.phaseDurationOverrides || {}).length;
              const updateOverride = (phase, val) => {
                const v = val === "" ? undefined : parseInt(val, 10);
                setEditPhaseOverrides(prev => {
                  const next = { ...prev };
                  if (v === undefined || isNaN(v)) delete next[phase];
                  else next[phase] = v;
                  return next;
                });
              };
              return (
                <div style={{ marginTop: space[2] }}>
                  <button className="flow-btn" onClick={() => setShowOverrides(!showOverrides)} style={{
                    padding: `${space[1]}px ${space[2]}px`, borderRadius: layout.radiusXs,
                    border: `1px solid ${c.border}`, background: "transparent",
                    color: c.textMid, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Phase thresholds
                    {existingCount > 0 && <span style={{ color: c.accent, fontFamily: typo.monoSm.font }}>{existingCount}</span>}
                  </button>
                  {showOverrides && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: space[2], marginTop: space[2] }}>
                      {["PRD", "Design", "Dev", "QA"].map(phase => {
                        const complexityDefault = getPhaseThreshold(editComplexity || proj.complexity, phase);
                        return (
                          <div key={phase} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <Label style={{ fontSize: 10 }}>{phase}</Label>
                            <input type="number" min="0" max="365"
                              value={editPhaseOverrides[phase] ?? ""}
                              placeholder={complexityDefault != null ? String(complexityDefault) : "—"}
                              onChange={e => updateOverride(phase, e.target.value)}
                              style={{
                                width: "100%", height: 32, padding: `0 ${space[2]}px`,
                                borderRadius: layout.radiusXs, border: `1px solid ${c.border}`,
                                background: c.surfaceAlt, color: c.text,
                                fontFamily: typo.monoSm.font, fontSize: 12,
                                textAlign: "center", outline: "none", boxSizing: "border-box",
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: space[2], marginTop: space[2] }}>
              <div style={{ display: "flex", gap: space[2] }}>
                <Btn variant="command" size="sm" onClick={saveEdits} disabled={!canSaveEdits} style={{ borderColor: canSaveEdits ? c.greenBorder : c.border, color: canSaveEdits ? c.green : c.textDim, opacity: canSaveEdits ? 1 : 0.6, cursor: canSaveEdits ? "pointer" : "not-allowed" }}>Save</Btn>
                <Btn variant="secondary" size="sm" onClick={cancelEdits}>Cancel</Btn>
              </div>
              <Btn variant="secondary" size="sm" onClick={handleDeleteClick} style={{ borderColor: c.redBorder, color: c.red }}>Delete project</Btn>
            </div>
          </div>
        )}

        {/* ═══ RESOURCES — relocated to the right sidebar card (Figma redesign) ═══ */}
        {false && (() => {
          const links = (projectLinks || []).filter(l => l.project_id === proj.id);
          const adding = resAdding, setAdding = setResAdding;
          const newType = resNewType, setNewType = setResNewType;
          const newLabel = resNewLabel, setNewLabel = setResNewLabel;
          const newUrl = resNewUrl, setNewUrl = setResNewUrl;
          const typeIcons = { prd: "file-text", figma: "palette", qa_testcases: "check-square", gchat: "message-circle", jira: "ticket", custom: "link" };
          const typeLabels = { prd: "PRD", figma: "Figma", qa_testcases: "QA", gchat: "GChat Space", jira: "Jira Board", custom: "Custom" };
          const addLink = async () => {
            if (!newUrl.trim()) return;
            const result = await addProjectLinkToDB(proj.id, newType, newType === "custom" ? newLabel : null, newUrl.trim());
            if (result.ok && result.row && setProjectLinks) {
              setProjectLinks(prev => [...prev, result.row]);
            }
            const label = newType === "custom" && newLabel ? newLabel : typeLabels[newType] || newType;
            recordAction("resource_added", { type: newType, label, url: newUrl.trim() }, `${label} resource added`);
            setNewType("prd"); setNewLabel(""); setNewUrl(""); setAdding(false);
          };
          const removeLink = async (linkId) => {
            const link = links.find(l => l.id === linkId);
            const result = await deleteProjectLinkFromDB(linkId);
            if (result.ok && setProjectLinks) {
              setProjectLinks(prev => prev.filter(l => l.id !== linkId));
            }
            recordAction("resource_removed", { type: link?.type }, "Resource removed");
          };
          if (editing) return null;
          return (
            <div style={{ marginTop: space[4], paddingTop: space[3], borderTop: `1px solid ${c.border}` }}>
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", color: c.textDim,
                display: "block", marginBottom: space[2],
              }}>Resources</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: space[2], alignItems: "center" }}>
                {links.map(link => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: `6px 12px 6px 8px`, borderRadius: 12,
                      background: c.surfaceAlt, border: `1px solid ${c.border}`,
                      textDecoration: "none", cursor: "pointer",
                      transition: "border-color 120ms ease",
                      position: "relative",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.textMid; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; }}
                  >
                    <span style={{ display: "inline-flex", flexShrink: 0, color: c.textMid }}><Icon name={typeIcons[link.type] || "link"} size={14} /></span>
                    <span style={{ fontFamily: typo.bodyMd.font, fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: "nowrap" }}>
                      {link.label || typeLabels[link.type] || link.type}
                    </span>
                    {can.addResources(projRole) && <button onClick={e => { e.preventDefault(); e.stopPropagation(); removeLink(link.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: c.textGhost, padding: 0, fontSize: 11, lineHeight: 1, marginLeft: 2 }}
                      title="Remove"
                    >✕</button>}
                  </a>
                ))}
                {!adding && can.addResources(projRole) && (
                  <button onClick={() => setAdding(true)} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: `6px 12px`, borderRadius: 12,
                    background: "transparent", border: `1px dashed ${c.border}`,
                    cursor: "pointer", color: c.textDim,
                    fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600,
                    transition: "border-color 120ms ease, color 120ms ease",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.color = c.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textDim; }}
                  >
                    <span style={{ fontSize: 13, lineHeight: 1 }}>+</span> Add link
                  </button>
                )}
              </div>
              {adding && (
                <div style={{ display: "flex", alignItems: "center", gap: space[2], marginTop: space[2], flexWrap: "wrap" }}>
                  {/* Custom styled type selector */}
                  {(() => {
                    const TYPE_OPTIONS = [
                      { value: "prd", label: "PRD", icon: "file-text" },
                      { value: "figma", label: "Figma", icon: "palette" },
                      { value: "qa_testcases", label: "QA Testcases", icon: "check-square" },
                      { value: "gchat", label: "GChat Space", icon: "message-circle" },
                      { value: "jira", label: "Jira Board", icon: "ticket" },
                      { value: "custom", label: "Custom", icon: "link" },
                    ];
                    const selected = TYPE_OPTIONS.find(o => o.value === newType) || TYPE_OPTIONS[0];
                    return (
                      <div ref={resTypeDropRef} style={{ position: "relative" }}>
                        <button id="res-type-picker-btn" type="button" onClick={() => setResTypeDropOpen(o => !o)} style={{
                          height: 32, padding: `0 ${space[2]}px 0 ${space[2]}px`,
                          borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                          background: c.surfaceSolid, color: c.text, cursor: "pointer",
                          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 6, minWidth: 140,
                          transition: `border-color ${motion.fast.duration} ${motion.fast.easing}`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = c.textMid; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; }}
                        >
                          <span style={{ display: "inline-flex", color: c.textMid }}><Icon name={selected.icon} size={14} /></span>
                          <span style={{ flex: 1, textAlign: "left" }}>{selected.label}</span>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0, transform: resTypeDropOpen ? "rotate(180deg)" : "rotate(0deg)", transition: `transform ${motion.fast.duration} ${motion.fast.easing}` }}>
                            <polyline points="4 6 8 10 12 6" />
                          </svg>
                        </button>
                        {resTypeDropOpen && createPortal(
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 99999 }} onClick={() => setResTypeDropOpen(false)} />
                            <div style={{
                              position: "fixed", zIndex: 100000,
                              top: (() => { const btn = document.getElementById("res-type-picker-btn"); return btn ? btn.getBoundingClientRect().bottom + 4 : 0; })(),
                              left: (() => { const btn = document.getElementById("res-type-picker-btn"); return btn ? btn.getBoundingClientRect().left : 0; })(),
                              minWidth: 170, background: c.surfaceSolid, border: `1px solid ${c.border}`,
                              borderRadius: layout.radiusMd, boxShadow: c.shadowFloat,
                              padding: `${space[1]}px 0`, overflow: "hidden",
                            }}>
                              {TYPE_OPTIONS.map(opt => (
                                <button key={opt.value} type="button" onClick={() => { setNewType(opt.value); setResTypeDropOpen(false); }} style={{
                                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                                  padding: `${space[2]}px ${space[3]}px`, border: "none",
                                  background: opt.value === newType ? c.accentDim : "transparent",
                                  color: opt.value === newType ? c.accent : c.text, cursor: "pointer",
                                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500,
                                  textAlign: "left",
                                  transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
                                }}
                                onMouseEnter={e => { if (opt.value !== newType) e.currentTarget.style.background = c.surfaceAlt; }}
                                onMouseLeave={e => { if (opt.value !== newType) e.currentTarget.style.background = "transparent"; }}
                                >
                                  <span style={{ display: "inline-flex", justifyContent: "center", width: 18, color: c.textMid }}><Icon name={opt.icon} size={14} /></span>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>,
                          document.body
                        )}
                      </div>
                    );
                  })()}
                  {newType === "custom" && <Inp value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label" style={{ width: 120, height: 32 }} />}
                  <Inp value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL" style={{ flex: 1, minWidth: 200, height: 32 }} />
                  <Btn variant="command" size="sm" onClick={addLink} disabled={!newUrl.trim()}>Add</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => { setAdding(false); setNewUrl(""); setNewLabel(""); }}>Cancel</Btn>
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ DEPENDENCIES — pill-format links subsection inside header card ═══ */}
        {proj.dependencies && proj.dependencies.length > 0 && !editing && (
          <div style={{ marginTop: space[4], paddingTop: space[3], borderTop: `1px solid ${c.border}` }}>
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", color: c.textDim,
              display: "block", marginBottom: space[2],
            }}>Dependencies</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: space[2], alignItems: "center" }}>
              {proj.dependencies.map(depId => {
                const dp = projects.find(p => p.id === depId);
                if (!dp) return null;
                const depPhaseColor = getPhaseColors()[dp.phase] || c.textDim;
                return (
                  <button
                    key={depId}
                    onClick={() => { if (onNavigate) onNavigate("projects", depId); }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: `6px 12px 6px 8px`, borderRadius: 12,
                      background: c.surfaceAlt, border: `1px solid ${c.border}`,
                      cursor: "pointer", textDecoration: "none",
                      transition: "border-color 120ms ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.textMid; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; }}
                  >
                    <span style={{ fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700, color: c.amber }}>{depId}</span>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: 13, fontWeight: 600, color: c.text }}>{dp.name}</span>
                    <span style={{
                      fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 600,
                      padding: "2px 6px", borderRadius: layout.radiusXs,
                      background: `${depPhaseColor}18`, color: depPhaseColor,
                    }}>{dp.phase || "—"}</span>
                    {dp.isBlocked && <span style={{ fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700, color: c.red }}>BLOCKED</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ TEAM — inline inside header card ═══ */}
        {!editing && (
          <div style={{ marginTop: space[4], paddingTop: space[3], borderTop: `1px solid ${c.border}` }}>
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", color: c.textDim,
              display: "block", marginBottom: space[2],
            }}>Team</span>
            <ProjectActivity
              project={proj}
              people={people}
              currentPerson={personProfile}
              isAppOwner={isAdmin}
              onPersonNavigate={(name) => onNavigate && onNavigate("people", name)}
              membersOnly
              membersInline
              canManageMembers={can.addMembers(projRole)}
              canRemoveMembers={can.removeMembers(projRole)}
            />
          </div>
        )}
      </div>

      {/* ═══ Divider under hero (Figma) ═══ */}
      {!editing && <div style={{ height: 1, background: FD.border, width: "100%" }} />}

      {/* Team section moved into hero card below */}

      {/* ═══ SHOUTOUTS — displayed for shipped projects ═══ */}
      {proj.status === "shipped" && shoutouts.length > 0 && (
          <div>
            <SectionHead title="Shoutouts" />
            <div style={{ display: "flex", flexDirection: "column", gap: space[1] }}>
              {shoutouts.map(s => (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: space[3],
                  padding: `${space[2] + 2}px ${space[3]}px`,
                  borderRadius: layout.radiusSm,
                  background: c.surfaceAlt, border: `1px solid ${c.border}`,
                }}>
                  <span style={{ display: "inline-flex", flexShrink: 0, color: c.textMid }}><Icon name="clap" size={18} /></span>
                  <div style={{ flex: 1, fontFamily: typo.bodyMd.font, fontSize: 13, color: c.text }}>
                    <span style={{ fontWeight: 600 }}>{s.details?.from || s.user_name || "Someone"}</span>
                    {" gave a shoutout!"}
                  </div>
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: 11, color: c.textDim, flexShrink: 0,
                  }}>{(() => {
                    const d = new Date(s.created_at);
                    const diff = Date.now() - d.getTime();
                    if (diff < 60000) return "just now";
                    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                    return `${Math.floor(diff / 86400000)}d ago`;
                  })()}</span>
                </div>
              ))}
            </div>
          </div>
      )}

      {/* ═══ FEEDBACK — shipped projects ═══ */}
      {proj.status === "shipped" && (
        <div ref={feedbackSectionRef}>
          <SectionHead title="Feedback" />
          <div style={{
            padding: `${space[4]}px`,
            borderRadius: layout.radiusSm,
            background: c.surface, border: `1px solid ${c.border}`,
          }}>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Share your feedback on this shipped project..."
              rows={3}
              style={{
                width: "100%", padding: `${space[3]}px`,
                borderRadius: layout.radiusSm,
                border: `1px solid ${c.border}`, background: c.surfaceAlt,
                color: c.text, fontFamily: typo.bodyMd.font, fontSize: 13,
                resize: "vertical", outline: "none", boxSizing: "border-box",
                lineHeight: 1.5,
              }}
              onFocus={e => e.currentTarget.style.borderColor = c.accent}
              onBlur={e => e.currentTarget.style.borderColor = c.border}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: space[2] }}>
              <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                <input ref={feedbackFileRef} type="file" style={{ display: "none" }} onChange={e => {
                  const f = e.target.files?.[0];
                  setFeedbackFileName(f ? f.name : "");
                }} />
                <button type="button" onClick={() => feedbackFileRef.current?.click()} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: `4px 10px`, borderRadius: layout.radiusXs,
                  background: "transparent", border: `1px solid ${c.border}`,
                  color: c.textMid, fontFamily: typo.bodySm.font, fontSize: 11, fontWeight: 600,
                  cursor: "pointer",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  Attach file
                </button>
                {feedbackFileName && (
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: 11, color: c.textMid,
                    maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{feedbackFileName}
                    <button type="button" onClick={() => { setFeedbackFileName(""); if (feedbackFileRef.current) feedbackFileRef.current.value = ""; }} style={{
                      background: "transparent", border: "none", color: c.textDim, cursor: "pointer",
                      fontFamily: typo.monoSm.font, fontSize: 11, padding: "0 4px",
                    }}>✕</button>
                  </span>
                )}
              </div>
              <button type="button" disabled={!feedbackText.trim() || feedbackSubmitting}
                onClick={() => {
                  if (!feedbackText.trim()) return;
                  setFeedbackSubmitting(true);
                  if (isDevSeedMode()) {
                    devStore.addComment(proj.id, "viewer", feedbackText.trim());
                    const viewerName = personProfile?.name || "AJ";
                    devStore.logEvent({
                      projectId: proj.id, action: "feedback",
                      userName: viewerName,
                      details: { from: viewerName, projectName: proj.name, comment: feedbackText.trim(), attachment: feedbackFileName || null },
                    });
                  }
                  window.__flowToast?.("Feedback submitted!");
                  setFeedbackText(""); setFeedbackFileName("");
                  if (feedbackFileRef.current) feedbackFileRef.current.value = "";
                  setFeedbackSubmitting(false);
                }}
                style={{
                  padding: `6px 16px`, borderRadius: layout.radiusSm,
                  background: feedbackText.trim() && !feedbackSubmitting ? c.accent : c.surfaceAlt,
                  color: feedbackText.trim() && !feedbackSubmitting ? "#fff" : c.textDim,
                  border: "none", fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600,
                  cursor: feedbackText.trim() && !feedbackSubmitting ? "pointer" : "not-allowed",
                  transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
                }}
              >Submit feedback</button>
            </div>

            {/* Previous feedback */}
            {feedbackEvents.length > 0 && (
                <div style={{ marginTop: space[3], paddingTop: space[3], borderTop: `1px solid ${c.border}` }}>
                  {feedbackEvents.map(fb => (
                    <div key={fb.id} style={{
                      display: "flex", alignItems: "flex-start", gap: space[3],
                      padding: `${space[2]}px 0`,
                      borderBottom: `1px solid ${c.border}`,
                    }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: c.cyanDim || c.surfaceAlt,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: c.cyan, flexShrink: 0,
                        fontFamily: typo.monoSm.font,
                      }}>{(fb.details?.from || fb.user_name || "?")[0]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: typo.bodyMd.font, fontSize: 13, color: c.text }}>
                          <span style={{ fontWeight: 600 }}>{fb.details?.from || fb.user_name || "Someone"}</span>
                          <span style={{ color: c.textDim, fontSize: 11, marginLeft: space[2] }}>
                            {(() => {
                              const d = new Date(fb.created_at);
                              const diff = Date.now() - d.getTime();
                              if (diff < 60000) return "just now";
                              if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                              if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                              return `${Math.floor(diff / 86400000)}d ago`;
                            })()}
                          </span>
                        </div>
                        <div style={{ fontFamily: typo.bodyMd.font, fontSize: 13, color: c.textMid, lineHeight: 1.5, marginTop: 2 }}>
                          {fb.details?.comment}
                        </div>
                        {fb.details?.attachment && (
                          <div style={{
                            marginTop: space[1], fontFamily: typo.monoSm.font, fontSize: 11, color: c.accent,
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            {fb.details.attachment}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TWO-COLUMN: timeline (left) + sidebar cards (right) ═══ */}
      {!editing && (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
      {/* ═══ TIMELINE — TrackGantt then alerts below ═══ */}
      {proj.status !== "upcoming" ? <div data-tour="track-gantt">
        <SectionHead title="Timeline" />

        {/* ── Track Gantt (parallel tracks) ── */}
        <TrackGantt
          proj={proj}
          canManage={can.manageTracks(projRole)}
          onStartTrack={(trackName) => {
            if (trackName === "Alpha" || trackName === "Beta") {
              setShipNote(proj.shipNote || "");
              setShipPct(proj.shipPct != null ? String(proj.shipPct) : "");
              setShipPhaseModal({ phase: trackName, from: proj.phase, isTrackStart: true });
              return;
            }
            startTrackInDB(proj.id, trackName, projects);
            setProjects(prev => prev.map(p => {
              if (p.id !== proj.id) return p;
              const updated = { ...p, tracks: { ...p.tracks } };
              if (!updated.tracks[trackName]) updated.tracks[trackName] = { periods: [], owner: null };
              updated.tracks[trackName] = { ...updated.tracks[trackName], periods: [...updated.tracks[trackName].periods, { started_at: new Date().toISOString(), completed_at: null }] };
              updated.phase = derivePrimaryPhase(updated);
              if (updated.status === "upcoming") updated.status = "in_flight";
              return updated;
            }));
            window.__flowToast?.(`${trackName} track started`);
          }}
          onCompleteTrack={(trackName) => {
            completeTrackInDB(proj.id, trackName, projects);
            setProjects(prev => prev.map(p => {
              if (p.id !== proj.id) return p;
              const updated = { ...p, tracks: { ...p.tracks } };
              if (updated.tracks[trackName]) {
                const periods = [...updated.tracks[trackName].periods];
                const last = periods[periods.length - 1];
                if (last && last.completed_at === null) periods[periods.length - 1] = { ...last, completed_at: new Date().toISOString() };
                updated.tracks[trackName] = { ...updated.tracks[trackName], periods };
              }
              updated.phase = derivePrimaryPhase(updated);
              return updated;
            }));
            window.__flowToast?.(`${trackName} track completed`);
          }}
          onReopenTrack={(trackName) => {
            setTrackReopenTarget(trackName);
            setTrackReopenReason("");
            setTrackReopenModal(true);
          }}
        />

        {/* ── Track overstay + overdue alerts (below timeline) ── */}
        {(() => {
          const projOverrides = proj.phaseDurationOverrides || {};
          const alerts = [];

          if (phaseTransitions.length > 0) {
            for (let i = 0; i < phaseTransitions.length; i++) {
              const seg = phaseTransitions[i];
              const nextAt = i < phaseTransitions.length - 1
                ? phaseTransitions[i + 1].at
                : new Date().toISOString();
              const days = Math.round(
                (new Date(nextAt) - new Date(seg.at)) / 86400000
              );
              const threshold = projOverrides[seg.phase] ?? getPhaseThreshold(proj.complexity, seg.phase);
              if (threshold && days > threshold) {
                const isCurrentPhase = i === phaseTransitions.length - 1;
                alerts.push({
                  type: "overstay",
                  message: isCurrentPhase
                    ? `${seg.phase} phase has gone beyond the ${threshold}-day threshold (${days}d). Needs attention!`
                    : `${seg.phase} phase took ${days}d — more than the ${threshold}-day standard threshold.`,
                });
              }
            }
          }

          const inShipPhase = proj.status === "shipped";
          if (proj.endDate && !inShipPhase) {
            const overdueDays = Math.round(
              (new Date(today + "T00:00:00") - new Date(proj.endDate + "T00:00:00")) / 86400000
            );
            if (overdueDays > 0) {
              alerts.push({
                type: "overdue",
                message: `The project is overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}. Take action!`,
              });
            }
          }

          if (alerts.length === 0) return null;

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: space[2], marginTop: space[3] }}>
              {alerts.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: space[2],
                    padding: `${space[2]}px ${space[3]}px`,
                    borderRadius: layout.radiusSm,
                    background: a.type === "overdue" ? c.redDim : c.amberDim,
                    border: `1px solid ${a.type === "overdue" ? c.red : c.amber}25`,
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                    color: a.type === "overdue" ? c.red : c.amber,
                    fontWeight: 600, lineHeight: 1.45,
                  }}
                >
                  <span style={{ flexShrink: 0, display: "inline-flex", color: c.amber }}><Icon name="alert-triangle" size={14} /></span>
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div> : <div style={{ fontSize: 14, color: FD.textTertiary, padding: "8px 0" }}>Timeline begins once the project is started.</div>}
        </div>{/* end left column */}

        {/* ── RIGHT SIDEBAR: Resources / Milestones / External resources ── */}
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Resources card */}
          {(() => {
            const links = (projectLinks || []).filter(l => l.project_id === proj.id);
            const typeIcons = { prd: "file-text", figma: "image", qa_testcases: "check-square", gchat: "message-circle", jira: "ticket", custom: "link" };
            const typeLabels = { prd: "PRD", figma: "Figma", qa_testcases: "QA Testcases", gchat: "GChat Space", jira: "Jira Board", custom: "Custom" };
            const canAdd = can.addResources(projRole);
            return (
              <SidebarCard title="Resources" onAdd={canAdd && !resAdding ? () => setResAdding(true) : null}>
                {links.length === 0 && !resAdding ? (
                  <span style={{ fontSize: 14, color: FD.textTertiary }}>No resources yet.</span>
                ) : links.map((link, i) => (
                  <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", cursor: "pointer", flex: 1, minWidth: 0 }}>
                      <span style={{ display: "inline-flex", justifyContent: "center", width: 18, flexShrink: 0, color: c.textMid }}><Icon name={typeIcons[link.type] || "link"} size={16} /></span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: FD.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {link.label || typeLabels[link.type] || link.type}
                      </span>
                      {i === 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FD.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      )}
                    </a>
                    {canAdd && (
                      <button type="button" onClick={async () => {
                        const result = await deleteProjectLinkFromDB(link.id);
                        if (result.ok && setProjectLinks) setProjectLinks(prev => prev.filter(l => l.id !== link.id));
                        recordAction("resource_removed", { type: link.type }, "Resource removed");
                      }} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: FD.textTertiary, padding: 0, fontSize: 13, lineHeight: 1, flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                ))}
                {resAdding && canAdd && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: links.length ? 4 : 0 }}>
                    <select value={resNewType} onChange={e => setResNewType(e.target.value)} style={{
                      height: 34, padding: "0 8px", borderRadius: 8, border: `1px solid ${FD.border}`,
                      background: FD.surface2, color: FD.textPrimary, fontSize: 13, outline: "none",
                    }}>
                      {RES_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {resNewType === "custom" && (
                      <input value={resNewLabel} onChange={e => setResNewLabel(e.target.value)} placeholder="Label" style={{
                        height: 34, padding: "0 10px", borderRadius: 8, border: `1px solid ${FD.border}`,
                        background: FD.surface2, color: FD.textPrimary, fontSize: 13, outline: "none",
                      }} />
                    )}
                    <input value={resNewUrl} onChange={e => setResNewUrl(e.target.value)} placeholder="URL" style={{
                      height: 34, padding: "0 10px", borderRadius: 8, border: `1px solid ${FD.border}`,
                      background: FD.surface2, color: FD.textPrimary, fontSize: 13, outline: "none",
                    }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={addResourceLink} disabled={!resNewUrl.trim()} style={{
                        flex: 1, height: 34, borderRadius: 8, border: "none", cursor: resNewUrl.trim() ? "pointer" : "not-allowed",
                        background: FD.textPrimary, color: c.textOnAccent || c.surface, fontSize: 13, fontWeight: 500, opacity: resNewUrl.trim() ? 1 : 0.5,
                      }}>Add</button>
                      <button type="button" onClick={() => { setResAdding(false); setResNewUrl(""); setResNewLabel(""); }} style={{
                        flex: 1, height: 34, borderRadius: 8, border: `1px solid ${FD.border}`, cursor: "pointer",
                        background: "transparent", color: FD.textSecondary, fontSize: 13, fontWeight: 500,
                      }}>Cancel</button>
                    </div>
                  </div>
                )}
              </SidebarCard>
            );
          })()}

          {/* Milestones card */}
          <SidebarCard title="Milestones">
            {heroMilestones.map((mile, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{
                    width: 7, height: 7, transform: "rotate(45deg)", flexShrink: 0,
                    background: mile.state === "done" ? FD.textPrimary : mile.state === "atrisk" ? FD.warning : FD.border,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: mile.state === "future" ? FD.textTertiary : FD.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mile.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {mile.state === "done" && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FD.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  )}
                  {mile.state === "atrisk" && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FD.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  )}
                  {mile.date && <span style={{ fontSize: 14, color: FD.textTertiary }}>{mile.date}</span>}
                </div>
              </div>
            ))}
          </SidebarCard>

          {/* External resources card (same renderer as Milestones for now) */}
          <SidebarCard title="External resources">
            {heroMilestones.map((mile, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{
                    width: 7, height: 7, transform: "rotate(45deg)", flexShrink: 0,
                    background: mile.state === "done" ? FD.textPrimary : mile.state === "atrisk" ? FD.warning : FD.border,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: mile.state === "future" ? FD.textTertiary : FD.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mile.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {mile.state === "done" && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FD.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  )}
                  {mile.state === "atrisk" && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FD.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  )}
                  {mile.date && <span style={{ fontSize: 14, color: FD.textTertiary }}>{mile.date}</span>}
                </div>
              </div>
            ))}
          </SidebarCard>
        </div>{/* end right sidebar */}
      </div>
      )}

      {/* ═══ ACTIVITY — composer + comments + auto-events ═══ */}
      <div data-tour="activity">
        <SectionHead title="Activity" />
        <ProjectActivity
          project={proj}
          people={people}
          currentPerson={personProfile}
          isAppOwner={isAdmin}
          onPersonNavigate={(name) => onNavigate && onNavigate("people", name)}
          hideMembers
        />
      </div>

      {/* ═══ Edit Project pill — matches "Add project" style. Permission-gated. ═══ */}
      {!editing && can.editProject(projRole) && (() => {
        if (typeof document === "undefined") return null;
        return createPortal(
          <button
            type="button"
            className="flow-btn"
            onClick={enterEdit}
            aria-label="Edit project"
            title="Edit project (E)"
            style={{
              position: "fixed", right: space[7], bottom: space[7], zIndex: 40,
              height: 40, padding: `0 ${space[5]}px`, borderRadius: layout.radiusSm,
              background: c.accent, color: c.textOnAccent, border: "none",
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600,
              boxShadow: c.shadowFloat,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: space[2],
              transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = c.accentHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = c.accent; }}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit project
          </button>,
          document.body
        );
      })()}


      {/* FAB removed — edit is now the pencil icon in the header; delete lives in the edit panel. */}

      {/* ═══ START NOW MODAL — pick tracks to begin ═══ */}
      <Modal open={startNowModal} onClose={() => { setStartNowModal(false); setStartNowEndDate(""); }} title="Start this project" accent={c.accent}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[4] }}>
          Select tracks to start for <strong style={{ color: c.text }}>{proj.name}</strong>. The start date will be set to today.
        </div>
        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap", marginBottom: space[4] }}>
          {trackNames.map(t => {
            const sel = startNowTracks.includes(t);
            const phColor = pc[t] || c.textDim;
            return (
              <button key={t} type="button" onClick={() => setStartNowTracks(prev => sel ? prev.filter(x => x !== t) : [...prev, t])} style={{
                padding: `8px 16px`, borderRadius: layout.radiusSm,
                background: sel ? phColor + "18" : c.surfaceAlt,
                border: `1.5px solid ${sel ? phColor : c.border}`,
                color: sel ? phColor : c.textMid,
                fontFamily: typo.monoSm.font, fontSize: 12, fontWeight: 700,
                letterSpacing: "0.04em", cursor: "pointer",
                transition: `all ${motion.fast.duration} ${motion.fast.easing}`,
              }}>{t}</button>
            );
          })}
        </div>
        {/* Tentative end date */}
        <div style={{ marginBottom: space[5] }}>
          <label style={{ fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid, letterSpacing: "0.03em", display: "block", marginBottom: 6 }}>
            TENTATIVE END DATE
          </label>
          <input
            type="date"
            value={startNowEndDate}
            onChange={e => setStartNowEndDate(e.target.value)}
            min={today}
            style={{
              width: "100%", boxSizing: "border-box", height: 40,
              borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
              background: c.surfaceSolid, fontFamily: typo.bodyMd.font, fontSize: 14,
              color: startNowEndDate ? c.text : c.textDim,
              padding: `0 ${space[3]}px`, outline: "none",
              colorScheme: "light",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={() => { setStartNowModal(false); setStartNowEndDate(""); }}>Cancel</Btn>
          <Btn variant="primary" size="sm" disabled={startNowTracks.length === 0} onClick={() => {
            const todayStr = today;
            const now = new Date().toISOString();
            const newTracks = {};
            for (const t of startNowTracks) {
              newTracks[t] = { periods: [{ started_at: now, completed_at: null }], owner: null };
            }
            const primaryPhase = startNowTracks[startNowTracks.length - 1];
            const endDateVal = startNowEndDate || null;
            setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, status: "in_flight", phase: primaryPhase, tracks: newTracks, startDate: todayStr, tentativeStartDate: null, endDate: endDateVal } : p));
            updateProjectInDB(proj.id, { status: "in_flight", phase: primaryPhase, startDate: todayStr, tentativeStartDate: null, endDate: endDateVal });
            if (isDevSeedMode()) {
              const raw = projects.find(p => p.id === proj.id);
              if (raw) { raw.tracks = newTracks; raw.status = "in_flight"; raw.phase = primaryPhase; raw.startDate = todayStr; raw.endDate = endDateVal; devStore.persistProjects(projects); }
              for (const t of startNowTracks) {
                devStore.logEvent({ projectId: proj.id, action: "track_started", details: { track: t } });
              }
            }
            recordAction("project_started", { tracks: startNowTracks }, `Project started with ${startNowTracks.join(", ")}`);
            setStartNowModal(false);
            setStartNowEndDate("");
          }}>Start Project</Btn>
        </div>
      </Modal>

      {/* ═══ DEPRIORITIZATION REASON MODAL ═══ */}
      <Modal open={!!depriReasonModal} onClose={() => setDepriReasonModal(false)} title="Why is this being deprioritized?" accent={c.amber}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          Provide context so your team understands why <strong style={{ color: c.text }}>{proj.name}</strong> is being deprioritized.
        </div>
        <div style={{ marginBottom: space[3] }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: space[1] }}>
            <TelemetryLabel color={c.amber}>Reason</TelemetryLabel>
            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>
              {depriReasonText.length}/200
            </span>
          </div>
          <textarea
            data-autofocus
            value={depriReasonText}
            onChange={e => setDepriReasonText(e.target.value.slice(0, 200))}
            placeholder="e.g. Redirecting team to higher-priority work..."
            rows={3}
            maxLength={200}
            style={{
              width: "100%", padding: `${space[2]}px ${space[3]}px`,
              borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
              background: c.surfaceAlt, color: c.text, resize: "vertical",
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setDepriReasonModal(false)}>Cancel</Btn>
          <Btn variant="secondary" style={{ borderColor: c.amberBorder, color: c.amber }}
            disabled={!depriReasonText.trim()}
            onClick={() => {
              const overrides = { status: "deprioritized", depriReason: depriReasonText.trim() };
              setDepriReasonModal(false);
              recordAction("project_status_changed", { from: "active", to: "deprioritized", reason: depriReasonText.trim() }, "Project deprioritized");
              if (datesChanged && pastHistoryWeekCount > 0) {
                setPendingSave(overrides);
                setRetroDateModal(true);
              } else {
                doSave(overrides);
              }
            }}>
            Deprioritize
          </Btn>
        </div>
      </Modal>

      {/* ═══ BLOCKED REASON MODAL ═══ */}
      <Modal open={!!blockedReasonModal} onClose={() => setBlockedReasonModal(false)} title="Why is this project blocked?" accent={c.red}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          Describe what's blocking <strong style={{ color: c.text }}>{proj.name}</strong> so your team knows what needs to be resolved.
        </div>
        <div style={{ marginBottom: space[3] }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: space[1] }}>
            <TelemetryLabel color={c.red}>Reason</TelemetryLabel>
            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>
              {blockedReasonText.length}/200
            </span>
          </div>
          <textarea
            data-autofocus
            value={blockedReasonText}
            onChange={e => setBlockedReasonText(e.target.value.slice(0, 200))}
            placeholder="e.g. Waiting on API access from partner team..."
            rows={3}
            maxLength={200}
            style={{
              width: "100%", padding: `${space[2]}px ${space[3]}px`,
              borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
              background: c.surfaceAlt, color: c.text, resize: "vertical",
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setBlockedReasonModal(false)}>Cancel</Btn>
          <Btn variant="secondary" style={{ borderColor: c.redBorder, color: c.red }}
            disabled={!blockedReasonText.trim()}
            onClick={() => {
              const now = new Date().toISOString();
              const changes = { isBlocked: true, blockedReason: blockedReasonText.trim(), blockedAt: now };
              setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, ...changes } : p));
              updateProjectInDB(proj.id, changes);
              recordAction("project_blocked", { reason: blockedReasonText.trim() }, "Project marked as blocked");
              setBlockedReasonModal(false);
            }}>
            Mark blocked
          </Btn>
        </div>
      </Modal>

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      <Modal open={deleteModal} onClose={() => {
        if (deleting) return;
        setDeleteModal(false);
      }} title="Delete project?" accent={c.red} width={420}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[4] }}>
          Are you sure you want to delete <strong style={{ color: c.text }}>{proj.id} — {proj.name}</strong>? This action cannot be undone.
        </div>
        {depsError && (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: c.redDim, border: `1px solid ${c.redBorder}`, marginBottom: space[4],
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red,
          }}>
            {depsError}
          </div>
        )}
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={() => setDeleteModal(false)} disabled={deleting}>Cancel</Btn>
          <Btn variant="danger" size="sm"
            onClick={confirmDelete}
            disabled={deleting}>
            {deleting ? "Deleting..." : "Delete project"}
          </Btn>
        </div>
      </Modal>

      {/* ═══ RETROACTIVE DATE-CHANGE WARNING ═══ */}
      <Modal open={retroDateModal} onClose={() => { setRetroDateModal(false); setPendingSave(null); }} title="Change affects past weeks?" accent={c.amber}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          This project has <strong style={{ color: c.text }}>{pastHistoryWeekCount}</strong> {pastHistoryWeekCount === 1 ? "week" : "weeks"} of historical activity. Changing the plan dates will retroactively alter overdue and timeline calculations for those frozen weeks.
        </div>
        <div style={{
          padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
          background: c.amberDim, border: `1px solid ${c.amberBorder}`, marginBottom: space[4],
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.amber, lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: space[1] }}>
            {proj.startDate ? fmtShort(proj.startDate) : "—"} → {proj.endDate ? fmtShort(proj.endDate) : "—"}
            <span style={{ color: c.textDim, fontWeight: 500 }}> becomes </span>
            {editStart ? fmtShort(editStart) : "—"} → {editEnd ? fmtShort(editEnd) : "—"}
          </div>
          <div style={{ color: c.textMid }}>
            Commitment items and outcomes are unchanged. Only derived metrics shift.
          </div>
        </div>
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={() => { setRetroDateModal(false); setPendingSave(null); }}>Cancel</Btn>
          <Btn variant="secondary" size="sm" style={{ borderColor: c.amberBorder, color: c.amber }}
            onClick={() => { doSave(pendingSave || {}); setRetroDateModal(false); setPendingSave(null); }}>
            Save anyway
          </Btn>
        </div>
      </Modal>

      {/* ═══ REACTIVATE CONFIRMATION MODAL — clears depriReason ═══ */}
      <Modal open={reactivateModal} onClose={() => setReactivateModal(false)} title="Reactivate project?" accent={c.green}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          <strong style={{ color: c.text }}>{proj.id} — {proj.name}</strong> will move back to Active.
        </div>
        {proj.depriReason && (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: c.surfaceAlt, border: `1px solid ${c.border}`, marginBottom: space[4],
          }}>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: space[1] }}>
              Current reason (will be cleared)
            </div>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.5 }}>
              {proj.depriReason}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={() => setReactivateModal(false)}>Cancel</Btn>
          <Btn variant="command" size="sm"
            style={{ borderColor: c.greenBorder, color: c.green }}
            onClick={() => {
              setReactivateModal(false);
              if (datesChanged && pastHistoryWeekCount > 0) {
                setPendingSave({ depriReason: null });
                setRetroDateModal(true);
              } else {
                doSave({ depriReason: null });
              }
            }}>
            Reactivate
          </Btn>
        </div>
      </Modal>

      {/* ═══ ALPHA / BETA — note + optional rollout % ═══ */}
      <Modal open={!!shipPhaseModal && shipPhaseModal.phase !== "GA"} onClose={() => setShipPhaseModal(null)} title={`Start ${shipPhaseModal?.phase || ""} Track`} accent={c.green}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <div>
            <Label style={{ marginBottom: space[1] }}>Note</Label>
            <textarea
              value={shipNote}
              onChange={e => setShipNote(e.target.value)}
              placeholder={`What's going into ${shipPhaseModal?.phase || "this phase"}?`}
              rows={3}
              style={{
                width: "100%", padding: `${space[2]}px ${space[3]}px`,
                borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                background: c.surfaceAlt, color: c.text, resize: "vertical",
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <Label style={{ marginBottom: space[1] }}>Rollout % <span style={{ color: c.textDim, fontWeight: 400 }}>(optional)</span></Label>
            <Inp
              type="number" min="0" max="100"
              value={shipPct}
              onChange={e => setShipPct(e.target.value)}
              placeholder="e.g. 10"
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShipPhaseModal(null)}>Cancel</Btn>
            <Btn variant="command" size="sm" style={{ borderColor: c.greenBorder, color: c.green }} onClick={() => {
              const ph = shipPhaseModal.phase;
              const now = new Date().toISOString();
              if (shipPhaseModal.isTrackStart) {
                const noteVal = shipNote.trim() || null;
                const pctVal = shipPct ? Number(shipPct) : null;
                startTrackInDB(proj.id, ph, projects, { note: noteVal, rolloutPct: pctVal });
                setProjects(prev => prev.map(p => {
                  if (p.id !== proj.id) return p;
                  const updated = { ...p, tracks: { ...p.tracks }, lastActivityAt: now,
                    shipNote: noteVal, shipPct: pctVal };
                  if (!updated.tracks[ph]) updated.tracks[ph] = { periods: [], owner: null };
                  updated.tracks[ph] = { ...updated.tracks[ph], periods: [...updated.tracks[ph].periods, { started_at: now, completed_at: null }] };
                  updated.phase = derivePrimaryPhase(updated);
                  if (updated.status === "upcoming") updated.status = "in_flight";
                  return updated;
                }));
                window.__flowToast?.(`${ph} track started`);
              } else {
                const oldPhase = shipPhaseModal.from;
                setProjects(prev => prev.map(p => p.id === proj.id ? {
                  ...p, phase: ph, lastActivityAt: now,
                  shipNote: shipNote.trim() || null,
                  shipPct: shipPct ? Number(shipPct) : null,
                } : p));
                updateProjectInDB(proj.id, { phase: ph });
                recordAction("project_phase_changed", { from: oldPhase, to: ph, note: shipNote.trim() || null, rolloutPct: shipPct || null }, `Stage updated to ${ph}`);
              }
              setShipPhaseModal(null);
            }}>
              {`Start ${shipPhaseModal?.phase} Track`}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ GA — release note + feature type + confetti ═══ */}
      <Modal open={!!shipPhaseModal && shipPhaseModal?.phase === "GA"} onClose={() => setShipPhaseModal(null)} title="Ship to GA" accent={c.green}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <div>
            <Label style={{ marginBottom: space[1] }}>Release note</Label>
            <textarea
              value={gaReleaseNote}
              onChange={e => setGaReleaseNote(e.target.value)}
              placeholder="What shipped? Write a brief release note..."
              rows={3}
              style={{
                width: "100%", padding: `${space[2]}px ${space[3]}px`,
                borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                background: c.surfaceAlt, color: c.text, resize: "vertical",
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <Label style={{ marginBottom: space[1] }}>Feature type</Label>
            <Sel value={gaFeatureType} onChange={e => setGaFeatureType(e.target.value)} style={{ width: "100%" }}>
              <option value="New">New Feature</option>
              <option value="Fix">Bug Fix</option>
              <option value="Enhancement">Enhancement</option>
              <option value="UI/UX">UI/UX Improvement</option>
            </Sel>
          </div>
          <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShipPhaseModal(null)}>Cancel</Btn>
            <Btn variant="command" size="sm" style={{ borderColor: c.greenBorder, color: c.green }} onClick={() => {
              const oldPhase = shipPhaseModal.from;
              const now = new Date().toISOString();
              setProjects(prev => prev.map(p => p.id === proj.id ? {
                ...p, phase: "GA", lastActivityAt: now,
                gaEnteredAt: now.split("T")[0],
                gaReleaseNote: gaReleaseNote.trim() || null,
                gaFeatureType: gaFeatureType,
              } : p));
              updateProjectInDB(proj.id, { phase: "GA" });
              recordAction("project_phase_changed", {
                from: oldPhase, to: "GA",
                releaseNote: gaReleaseNote.trim() || null,
                featureType: gaFeatureType,
              }, `${proj.name} shipped to GA!`);
              setShipPhaseModal(null);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 4000);
            }}>
              Ship it!
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ REOPEN TRACK — reason modal ═══ */}
      <Modal open={trackReopenModal} onClose={() => setTrackReopenModal(false)} title={`Reopen ${trackReopenTarget || ""} track`} accent={c.amber}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <div>
            <Label style={{ marginBottom: space[1] }}>Why is this track being reopened?</Label>
            <textarea
              value={trackReopenReason}
              onChange={e => setTrackReopenReason(e.target.value)}
              placeholder="e.g. QA found regressions, scope change..."
              rows={3}
              style={{
                width: "100%", padding: `${space[2]}px ${space[3]}px`,
                borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                background: c.surfaceAlt, color: c.text, resize: "vertical",
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setTrackReopenModal(false)}>Cancel</Btn>
            <Btn variant="command" size="sm" style={{ borderColor: `${c.amber}60`, color: c.amber }} onClick={() => {
              const trackName = trackReopenTarget;
              const reasonVal = trackReopenReason.trim() || null;
              reopenTrackInDB(proj.id, trackName, projects, { reason: reasonVal });
              setProjects(prev => prev.map(p => {
                if (p.id !== proj.id) return p;
                const updated = { ...p, tracks: { ...p.tracks }, lastActivityAt: new Date().toISOString() };
                if (updated.tracks[trackName]) {
                  updated.tracks[trackName] = { ...updated.tracks[trackName], periods: [...updated.tracks[trackName].periods, { started_at: new Date().toISOString(), completed_at: null }] };
                }
                updated.phase = derivePrimaryPhase(updated);
                return updated;
              }));
              window.__flowToast?.(`${trackName} track reopened`);
              setTrackReopenModal(false);
            }}>
              Reopen {trackReopenTarget}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ SHIP PROJECT — release note + feature type + confetti (replaces GA) ═══ */}
      <Modal open={shipProjectModal} onClose={() => setShipProjectModal(false)} title="Ship Project" accent={c.green}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <div>
            <Label style={{ marginBottom: space[1] }}>Release note</Label>
            <textarea
              value={shipProjectNote}
              onChange={e => setShipProjectNote(e.target.value)}
              placeholder="What shipped? Write a brief release note..."
              rows={3}
              style={{
                width: "100%", padding: `${space[2]}px ${space[3]}px`,
                borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                background: c.surfaceAlt, color: c.text, resize: "vertical",
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <Label style={{ marginBottom: space[1] }}>Feature type</Label>
            <Sel value={shipProjectFeatureType} onChange={e => setShipProjectFeatureType(e.target.value)} style={{ width: "100%" }}>
              <option value="New">New Feature</option>
              <option value="Fix">Bug Fix</option>
              <option value="Enhancement">Enhancement</option>
              <option value="UI/UX">UI/UX Improvement</option>
            </Sel>
          </div>
          <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end" }}>
            <Btn variant="secondary" size="sm" onClick={() => setShipProjectModal(false)}>Cancel</Btn>
            <Btn variant="command" size="sm" style={{ borderColor: c.greenBorder, color: c.green }} onClick={() => {
              const now = new Date().toISOString();
              shipProjectInDB(proj.id, projects);
              setProjects(prev => prev.map(p => {
                if (p.id !== proj.id) return p;
                const newTracks = { ...p.tracks };
                for (const name of Object.keys(newTracks)) {
                  const periods = [...newTracks[name].periods];
                  const last = periods[periods.length - 1];
                  if (last && last.completed_at === null) {
                    periods[periods.length - 1] = { ...last, completed_at: now };
                  }
                  newTracks[name] = { ...newTracks[name], periods };
                }
                return { ...p, status: "shipped", shippedAt: now, tracks: newTracks,
                  phase: derivePrimaryPhase({ ...p, tracks: newTracks }),
                  gaReleaseNote: shipProjectNote.trim() || null,
                  gaFeatureType: shipProjectFeatureType,
                };
              }));
              recordAction("project_shipped", {
                releaseNote: shipProjectNote.trim() || null,
                featureType: shipProjectFeatureType,
              }, `${proj.name} shipped!`);
              setShipProjectModal(false);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 4000);
            }}>
              Ship it!
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ CONFETTI + CELEBRATION TOAST ═══ */}
      {showConfetti && createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, pointerEvents: "none", overflow: "hidden" }}>
          <style>{`
            @keyframes confetti-fall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            @keyframes celebration-in {
              0% { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
              100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            @keyframes celebration-out {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
            }
          `}</style>
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} style={{
              position: "absolute",
              top: -10,
              left: `${Math.random() * 100}%`,
              width: Math.random() * 8 + 4,
              height: Math.random() * 8 + 4,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              background: ["#E8590C", "#059669", "#1D4ED8", "#6D28D9", "#B45309", "#DC2626", "#0E7490", "#F59E0B"][i % 8],
              animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.8}s both`,
            }} />
          ))}
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: c.surfaceSolid, borderRadius: layout.radiusLg,
            boxShadow: "0 24px 80px rgba(0,0,0,0.2)", border: `2px solid ${c.green}`,
            padding: `${space[6]}px ${space[7]}px`, textAlign: "center",
            maxWidth: 420, width: "90%",
            animation: "celebration-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both, celebration-out 0.4s cubic-bezier(0.4, 0, 1, 1) 3s both",
            pointerEvents: "auto",
          }}>
            <div style={{ marginBottom: space[3], color: c.textGhost || c.textDim }}><Icon name="rocket" size={48} strokeWidth={1.5} /></div>
            <div style={{
              fontFamily: typo.displayLg.font, fontSize: 22, fontWeight: 700,
              color: c.text, marginBottom: space[2],
            }}>Amazing! Congrats on shipping!</div>
            <div style={{
              fontFamily: typo.bodyMd.font, fontSize: 14, color: c.textMid,
              lineHeight: 1.5,
            }}>
              <strong>{proj.name}</strong> is now live. Keep an eye out for feedback from others on this.
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

