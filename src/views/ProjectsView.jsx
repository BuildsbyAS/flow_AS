// Flow — Projects View (Rebuild v2: Pulse structural model + PeopleDeepDive history model)
// Two states: Registry (Pulse-style table with tabs) → Project Deep Dive (PeopleDeepDive-style)
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { c, typo, space, layout, motion, phaseNames, shipPhases, allPhases, commitPhases, typeConfig, phaseColors as getPhaseColors, phaseMids as getPhaseMids, phaseDims as getPhaseDims, statusColors, entityColors, colWidths, outcomeConfig } from "../styles/theme";
import { Badge, Tag, Modal, Label, Btn, Inp, Sel, SearchSelect, EmptyState, TelemetryLabel, Th as SharedTh, TableShell, StickyLeftTd } from "../components/shared";
import { KpiGrid, KpiCard, HealthGauge, SectionHead, SegmentedToggle, Pill, PillRow } from "../components/kpi";
import { HealthBar } from "../components/chart";
import useKeyboard from "../hooks/useKeyboard";
import useExitAnimation from "../hooks/useExitAnimation";
import GanttChart from "../components/GanttChart";
import FlowLogo from "../components/FlowLogo";
import ActivityTimeline from "../components/ActivityTimeline";
import { getProjectDependencies, deleteProjectFromDB } from "../lib/mutations";
import { supabase } from "../lib/supabase";
import useDevLabel from "../hooks/useDevLabel";

// Today's date — derived fresh per-render via weekConfig.today (no module-level mutable)

// Phase scope for the In Flight vs Shipped tab filter.
// Kept local to this view — `shipPhases` (Alpha/Beta/GA) in theme.js is
// unchanged and still correct for metrics, colors, and stage validation
// (where Alpha/Beta count as "released to users").
const IN_FLIGHT_PHASES = ["PRD", "Design", "Dev", "QA", "Alpha", "Beta"];
const SHIPPED_PHASES = ["GA"];

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

// WEEK_LABELS now computed inside components using weekConfig prop

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
        <span style={{
          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textGhost,
          display: "inline-block", lineHeight: 1,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: `transform ${motion.fast.duration} ${motion.fast.easing}`,
        }}>▼</span>
      </button>
      {anim.mounted && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 900,
          minWidth: 180, maxHeight: 260, overflowY: "auto",
          background: c.surface, border: `1px solid ${c.border}`,
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

/* ══════════════════════════════════════════════════════════════════
   DATA DERIVATION — full-history metrics per project
   ══════════════════════════════════════════════════════════════════ */
function deriveProjectMetrics(projects, commitments, history, today) {
  const pc = getPhaseColors();
  const tc = typeConfig();
  const map = {};

  for (const proj of projects) {
    const id = proj.id;
    const m = {
      historyTotal: 0, thisWeekTotal: 0, totalCommits: 0,
      phaseBreakdown: { PRD: 0, Design: 0, Dev: 0, QA: 0 },
      typeBreakdown: { BUILD: 0, JAM: 0 },
      people: new Set(),
      lastActivity: null,
      weeklyData: [],
      hasBlockedCommit: false,   // derived from actual commit outcomes
      endingSoon: false,
      overdue: false,
      atRisk: false,
    };

    // History data
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
          if (m.typeBreakdown[e.type] !== undefined) m.typeBreakdown[e.type]++;
          weekEntries.push(e);
        }
        m.weeklyData.push({ week: wk.week, entries: weekEntries });
      }
    }

    // Current-week commitments
    const currentItems = [];
    (commitments || []).forEach(cm => {
      cm.items.forEach((it, idx) => {
        if (cm.deselected !== idx && it.project === id) {
          currentItems.push({ ...it, person: cm.person });
          m.people.add(cm.person);
          m.thisWeekTotal++;
          const stage = it.stage || "PRD";
          if (m.phaseBreakdown[stage] !== undefined) m.phaseBreakdown[stage]++;
          if (m.typeBreakdown[it.type] !== undefined) m.typeBreakdown[it.type]++;
          if (it.outcome === "blocked") m.hasBlockedCommit = true;
        }
      });
    });
    if (currentItems.length > 0) {
      m.lastActivity = "This wk";
      m.weeklyData.push({ week: "This wk", entries: currentItems, isCurrent: true });
    }

    m.totalCommits = m.historyTotal + m.thisWeekTotal;
    m.peopleList = [...m.people];

    // Risk flags
    const daysToEnd = daysBetween(today, proj.endDate);
    const inShipPhase = shipPhases.includes(proj.phase);
    if (daysToEnd <= 14 && daysToEnd > 0 && !inShipPhase) m.endingSoon = true;
    if (daysToEnd < 0 && !inShipPhase) m.overdue = true;

    // Health (mirrors PulseView formula)
    const age = daysBetween(proj.startDate, today);
    const planned = daysBetween(proj.startDate, proj.endDate);
    const pctEl = planned > 0 ? age / planned : 0;
    let health = 100;
    if (planned > 0) { if (pctEl > 1) health -= 35; else if (pctEl > 0.85) health -= 20; else if (pctEl > 0.65) health -= 10; }
    if (daysToEnd != null && daysToEnd < 7 && daysToEnd >= 0 && !inShipPhase) health -= 5;
    if (m.thisWeekTotal === 0 && !inShipPhase) health -= 25;
    else { if (m.thisWeekTotal > 0 && !m.typeBreakdown.BUILD && m.typeBreakdown.JAM) health -= 10; }
    if (!proj.owner) health -= 20;
    if (m.hasBlockedCommit) health -= 15;
    m.health = Math.max(0, Math.min(100, health));

    // At risk is derived: overdue, OR past 85% of planned duration without shipping,
    // OR has a blocked commit this week. Purely proportional — no magic "age > 60".
    m.atRisk = !inShipPhase && proj.status !== "deprioritized" && (
      m.overdue || m.hasBlockedCommit || (planned > 0 && pctEl > 0.85)
    );

    map[id] = m;
  }
  return map;
}

/* ══════════════════════════════════════════════════════════════════
   SORT — mirrors Pulse sort pattern
   ══════════════════════════════════════════════════════════════════ */
function sortList(list, key, dir, metrics, weekLabels, today) {
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
      case "phase": return d * (allPhases.indexOf(a.phase) - allPhases.indexOf(b.phase));
      case "health": return d * ((metrics[a.id]?.health ?? 0) - (metrics[b.id]?.health ?? 0));
      case "total": return d * ((metrics[a.id]?.totalCommits || 0) - (metrics[b.id]?.totalCommits || 0));
      case "thisWk": return d * ((metrics[a.id]?.thisWeekTotal || 0) - (metrics[b.id]?.thisWeekTotal || 0));
      case "people": return d * ((metrics[a.id]?.peopleList.length || 0) - (metrics[b.id]?.peopleList.length || 0));
      case "last": {
        const order = {};
        (weekLabels || []).forEach((w, i) => { order[w] = i + 1; });
        return d * ((order[metrics[a.id]?.lastActivity] || 0) - (order[metrics[b.id]?.lastActivity] || 0));
      }
      case "timeline": return d * (daysBetween(today, a.endDate) - daysBetween(today, b.endDate));
      case "actualEnd": return d * ((a.actualEndDate || "").localeCompare(b.actualEndDate || ""));
      default: return 0;
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════════ */
export default function ProjectsView({
  projects: rawProjects, setProjects, commitments, people, squads, history,
  weekConfig: weekConfigProp,
  initialId, onNavigate, setDetailLabel, setGoBack, searchRef, globalFilters = {},
  suppressBackRef,
  isHistorical, selectedWeekKey,
}) {
  const devRef = useDevLabel('ProjectsView', 'src/views/ProjectsView.jsx', 'Project registry table with deep dive and Gantt chart');
  const weekConfig = weekConfigProp || { weeks: [], currentWeek: null };
  const WEEK_LABELS = useMemo(() => [...(weekConfig.historyWeeks || []), "This wk"], [weekConfig]);
  const projects = useMemo(() => rawProjects.map(ensureStatus), [rawProjects]);
  const today = weekConfig.today || new Date().toISOString().split('T')[0];
  const metrics = useMemo(() => deriveProjectMetrics(projects, commitments, history, today), [projects, commitments, history, today]);

  const [selectedProject, setSelectedProject] = useState(initialId || null);
  const [activeTab, setActiveTab] = useState("active");
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

  // Wire searchRef
  useEffect(() => {
    if (searchRef) searchRef.current = localSearchRef.current;
  }, [searchRef, selectedProject]);

  // Shipped tab defaults to newest-first by actual end date. Other tabs keep
  // the default squad sort when re-entered from Shipped.
  useEffect(() => {
    if (activeTab === "shipped") {
      setSortKey("actualEnd");
      setSortDir("desc");
    } else if (sortKey === "actualEnd") {
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
    if ((globalFilters.person || []).length > 0) {
      list = list.filter(p => globalFilters.person.some(fp => metrics[p.id]?.people.has(fp)));
    }
    return list;
  }, [projects, search, globalFilters, metrics]);

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
        case "active": list = filtered.filter(p => p.status === "active" && IN_FLIGHT_PHASES.includes(p.phase)); break;
        case "at_risk": list = filtered.filter(p => metrics[p.id]?.atRisk); break;
        case "overdue": list = filtered.filter(p => IN_FLIGHT_PHASES.includes(p.phase) && p.status !== "deprioritized" && metrics[p.id]?.overdue); break;
        case "shipped": list = filtered.filter(p => SHIPPED_PHASES.includes(p.phase)); break;
        case "deprioritized": list = filtered.filter(p => p.status === "deprioritized"); break;
        default: list = filtered;
      }
    }
    return sortList(list, sortKey, sortDir, metrics, WEEK_LABELS, today);
  }, [filtered, activeTab, sortKey, sortDir, metrics, WEEK_LABELS, today, search]);

  // ── KPI summary (from filtered data) ──
  // Health and risk are computed once in `deriveProjectMetrics`; this section
  // never re-derives them, so numbers stay consistent with the table + gauges.
  const summary = useMemo(() => {
    const active = filtered.filter(p => p.status === "active" && IN_FLIGHT_PHASES.includes(p.phase));
    const shipped = filtered.filter(p => SHIPPED_PHASES.includes(p.phase));
    const depri = filtered.filter(p => p.status === "deprioritized");
    const blockedCount = filtered.filter(p => metrics[p.id]?.hasBlockedCommit).length;
    const totalCommits = filtered.reduce((s, p) => s + (metrics[p.id]?.totalCommits || 0), 0);
    const overdueCount = active.filter(p => metrics[p.id]?.overdue).length;
    const atRiskCount = filtered.filter(p => metrics[p.id]?.atRisk).length;
    const avgHealth = active.length > 0
      ? Math.round(active.reduce((s, p) => s + (metrics[p.id]?.health ?? 100), 0) / active.length)
      : 0;
    const phaseCounts = {};
    ["PRD", "Design", "Dev", "QA"].forEach(ph => {
      phaseCounts[ph] = active.filter(p => p.phase === ph).length;
    });
    phaseCounts.Ship = active.filter(p => p.phase === "Alpha" || p.phase === "Beta").length;
    return { active: active.length, shipped: shipped.length, depri: depri.length, all: filtered.length, blockedCount, totalCommits, avgHealth, atRiskCount, overdueCount, phaseCounts };
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
    { key: "Escape", fn: () => { if (suppressBackRef?.current) return; if (boardFullscreen) { setBoardFullscreen(false); setViewMode("registry"); } else if (ganttFullscreen) { if (document.activeElement === ganttSearchRef.current) { ganttSearchRef.current.blur(); } else { setGanttFullscreen(false); setViewMode("registry"); } } else if (selectedProject) goBackToList(); else if (search) { setSearch(""); setFocusIdx(0); localSearchRef.current?.blur(); setKbActive(false); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); setKbActive(false); } else if (kbActive) { setKbActive(false); } }, force: true },
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
  ], [selectedProject, goBackToList, tabProjects.length, focusIdx, kbActive, ganttFullscreen, boardFullscreen, suppressBackRef]);

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

  // ═══════════════════════════════════════════════════════════
  // DETAIL STATE — Project Deep Dive
  // ═══════════════════════════════════════════════════════════
  if (selectedProject) {
    const proj = projects.find(p => p.id === selectedProject);
    if (!proj) return <EmptyState icon="🔍" title="Project not found" message="This project may have been removed." action="Back to overview" onAction={goBackToList} />;
    return <ProjectDeepDive proj={proj} metrics={metrics[proj.id]} history={history} commitments={commitments} projects={projects} setProjects={setProjects} people={people} squads={squads} onNavigate={onNavigate} goBack={goBackToList} pc={pc} pcMid={pcMid} pcDim={pcDim} sc={sc} tc={tc} ec={ec} weekLabels={WEEK_LABELS} isHistorical={isHistorical} today={today} weekStart={weekConfig.weekStart} leaving={detailLeaving} suppressBackRef={suppressBackRef} />;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRY STATE — Pulse structural model
  // ═══════════════════════════════════════════════════════════

  const TABS = [
    { key: "active", label: "In Flight", count: summary.active, color: c.cyan },
    { key: "shipped", label: "Shipped", count: summary.shipped, color: c.green },
    { key: "deprioritized", label: "Deprioritized", count: summary.depri, color: c.textDim },
    { key: "all", label: "All", count: summary.all, color: c.text },
  ];

  // Synthetic-tab label map for empty-state copy + current-tab chip
  const tabLabelMap = { at_risk: "at risk", overdue: "overdue", active: "in flight", shipped: "shipped", deprioritized: "deprioritized", all: "" };
  // Synthetic tabs narrow the table to a scope not directly represented in the
  // KPI row (at-risk, overdue, deprioritized). Show the "Showing: X" chip so the
  // user understands the KPIs above still reflect the project universe.
  const isSyntheticTab = activeTab === "at_risk" || activeTab === "overdue" || activeTab === "deprioritized";

  // ── Shared Th wrapper ──
  const Th = ({ col, children, style: s }) => (
    <SharedTh col={col} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
      style={s}>{children}</SharedTh>
  );

  return (
    <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: space[3] }}>

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
            background: "#FFFFFF",
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

      {/* ═══════════════════════════════════════════════════════════
          Summary + tabs — scrolls with the page
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", flexDirection: "column", gap: space[3],
      }}>

        {/* ═══════════════════════════════════════════════════════════
            KPI GRID — 4 cards (Active / At Risk / Overdue / Shipped)
            Steel & Orange pattern per design-directions.html §KPI CARDS
            ═══════════════════════════════════════════════════════════ */}
        <KpiGrid>
          <KpiCard
            index={0}
            label="In Flight"
            value={summary.active}
            sub="across all squads"
            onClick={() => setActiveTab("active")}
            active={activeTab === "active"}
          >
            <PillRow>
              {["PRD", "Design", "Dev", "QA", "Ship"].map(ph => (
                <Pill
                  key={ph}
                  count={summary.phaseCounts[ph] || 0}
                  label={ph}
                  color={ph === "Ship" ? c.green : (pc[ph] || c.textDim)}
                />
              ))}
            </PillRow>
          </KpiCard>
          <KpiCard
            index={1}
            label="At Risk"
            value={summary.atRiskCount}
            sub={summary.atRiskCount > 0 ? "need attention" : "all clear"}
            onClick={() => setActiveTab(activeTab === "at_risk" ? "active" : "at_risk")}
            active={activeTab === "at_risk"}
          />
          <KpiCard
            index={2}
            label="Overdue"
            value={summary.overdueCount}
            sub={summary.overdueCount > 0 ? "past end date" : "on schedule"}
            onClick={() => setActiveTab(activeTab === "overdue" ? "active" : "overdue")}
            active={activeTab === "overdue"}
          />
          <KpiCard
            index={3}
            label="Shipped"
            value={summary.shipped}
            sub="reached GA"
            onClick={() => setActiveTab("shipped")}
            active={activeTab === "shipped"}
          />
        </KpiGrid>

        {/* VIEW-SCOPE PILLS + view-mode toggle — replaces the old "Projects" section head.
            Left: 4 canonical scopes (In Flight / Shipped / Deprioritized / All) plus
            a "Showing: …" chip when a synthetic tab (at_risk / overdue) is active.
            Right: Table / Board / Gantt. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: space[2], alignItems: "center", flexWrap: "wrap" }}>
            {[
              { key: "active", label: "In Flight", count: summary.active },
              { key: "shipped", label: "Shipped", count: summary.shipped },
              { key: "deprioritized", label: "Deprioritized", count: summary.depri },
              { key: "all", label: "All", count: summary.all },
            ].map(opt => {
              // At Risk / Overdue are sub-filters of In Flight — surface that
              // parent scope visually so a pill is always highlighted.
              const parentScope = (activeTab === "at_risk" || activeTab === "overdue") ? "active" : activeTab;
              const isActive = parentScope === opt.key;
              return (
                <button
                  key={opt.key}
                  className="flow-btn"
                  onClick={() => setActiveTab(isActive && opt.key !== "active" ? "active" : opt.key)}
                  style={{
                    padding: `6px ${space[3]}px`,
                    borderRadius: layout.radiusSm,
                    border: `1px solid ${isActive ? c.accentMid : c.border}`,
                    background: isActive ? c.accentDim : c.surface,
                    color: isActive ? c.accent : c.textDim,
                    fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {opt.label}
                  <span style={{
                    fontFamily: typo.monoSm.font, fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}>{opt.count}</span>
                </button>
              );
            })}
          </div>
          <SegmentedToggle
            options={[
              { key: "registry", label: "Table" },
              { key: "board", label: "Board" },
              { key: "gantt", label: "Gantt" },
            ]}
            value={boardFullscreen ? "board" : ganttFullscreen ? "gantt" : "registry"}
            onChange={(k) => {
              if (k === "registry") { setViewMode("registry"); setBoardFullscreen(false); setGanttFullscreen(false); }
              else if (k === "board") { setBoardFullscreen(true); }
              else if (k === "gantt") { setGanttFullscreen(true); }
            }}
          />
        </div>

        {/* SEARCH ROW */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input ref={localSearchRef} value={search}
              onChange={e => { setSearch(e.target.value); setFocusIdx(0); }}
              onBlur={() => { setSearchGlow(false); if (searchGlowTimerRef.current) { clearTimeout(searchGlowTimerRef.current); searchGlowTimerRef.current = null; } }}
              placeholder="Search projects by name, ID, owner, or squad..."
              style={{
                width: "100%", height: 40,
                padding: `0 ${space[4]}px 0 38px`,
                borderRadius: layout.radiusSm,
                border: `1px solid ${searchGlow ? c.accent : c.border}`,
                background: c.surfaceAlt, color: c.text,
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                outline: "none", boxSizing: "border-box",
                boxShadow: searchGlow ? `0 0 0 3px ${c.accentDim}` : "none",
                transition: `border-color ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}`,
              }} />
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", transition: `stroke ${motion.fast.duration} ${motion.fast.easing}` }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchGlow ? c.accent : c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
            {!search && <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
              color: c.textDim, lineHeight: 1,
              padding: `3px 7px 4px`, borderRadius: layout.radiusXs,
              background: `linear-gradient(180deg, ${c.surfaceAlt} 0%, ${c.bg} 100%)`,
              border: `1px solid ${c.border}`,
              boxShadow: `0 2px 0 ${c.border}, 0 2px 3px ${c.shadow}`,
              pointerEvents: "none",
            }}>/</span>}
          </div>
        </div>
      </div>
      {/* end frozen top */}

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 1 }}>
      {tabProjects.length === 0 ? (() => {
        const hasGlobalFilter = (globalFilters.owner?.length || globalFilters.squad?.length || globalFilters.person?.length);
        const tabWord = tabLabelMap[activeTab] || "";
        let title = "No projects";
        let message = `No ${tabWord ? tabWord + " " : ""}projects found.`;
        // "Add project" never resolves synthetic-tab filters — hide it there.
        let action = !isHistorical && !isSyntheticTab ? "Add project" : (isSyntheticTab ? "Back to Active" : null);
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
        return <EmptyState icon="📂" title={title} message={message} action={action} onAction={onAction} />;
      })() : (
        <TableShell minWidth={900}>
            <thead>
                <tr>
                  <Th col="squad" style={{ position: "sticky", left: 0, top: "var(--flow-sticky-top, 0px)", background: c.tableHeader || c.surfaceAlt, zIndex: 3, minWidth: colWidths.squad.min }}>Squad</Th>
                  <Th col="project" style={{ minWidth: colWidths.identity.min, }}>Project</Th>
                  <Th col="owner" style={{ minWidth: colWidths.owner.min, }}>Owner</Th>
                  {activeTab === "all" && <Th col="status" style={{ minWidth: colWidths.status.min, textAlign: "center", }}>Status</Th>}
                  {activeTab !== "shipped" && <Th col="phase" style={{ minWidth: colWidths.phase.min, textAlign: "center", }}>Phase</Th>}
                  {activeTab !== "shipped" && activeTab !== "deprioritized" && <Th col="health" style={{ minWidth: 90, textAlign: "center", }}>Health</Th>}
                  <Th col="total" style={{ minWidth: colWidths.metric.min, textAlign: "center", }}>Total</Th>
                  {activeTab !== "shipped" && activeTab !== "deprioritized" && <Th col="thisWk" style={{ minWidth: colWidths.metric.min, textAlign: "center", }}>{isHistorical ? selectedWeekKey : "This Wk"}</Th>}
                  {activeTab !== "deprioritized" && <Th col="people" style={{ minWidth: colWidths.metric.min, textAlign: "center", }}>People</Th>}
                  {activeTab === "shipped" && <>
                    <Th col="planStart" style={{ minWidth: colWidths.date.min, textAlign: "center", }}>Plan Start</Th>
                    <Th col="planEnd" style={{ minWidth: colWidths.date.min, textAlign: "center", }}>Plan End</Th>
                    <Th col="actualStart" style={{ minWidth: colWidths.date.min, textAlign: "center", }}>Actual Start</Th>
                    <Th col="actualEnd" style={{ minWidth: colWidths.date.min, textAlign: "center", }}>Actual End</Th>
                    <Th col="planDays" style={{ minWidth: colWidths.metric.min, textAlign: "center", }}>Plan Days</Th>
                    <Th col="actualDays" style={{ minWidth: colWidths.metric.min, textAlign: "center", }}>Actual Days</Th>
                  </>}
                  {activeTab !== "shipped" && activeTab !== "deprioritized" && <Th col="last" style={{ minWidth: colWidths.date.min, textAlign: "center", }}>Last Active</Th>}
                  {activeTab !== "shipped" && activeTab !== "deprioritized" && <Th col="timeline" style={{ minWidth: colWidths.timeline.min, textAlign: "center", }}>Timeline</Th>}
                  {activeTab === "deprioritized" && <Th col="reason" style={{ minWidth: 200, }}>Reason</Th>}
                </tr>
              </thead>
              <tbody>
                {tabProjects.map((proj, fi) => {
                  const m = metrics[proj.id] || {};
                  const sCfg = sc[proj.status] || sc.active;
                  const allocated = daysBetween(proj.startDate, proj.endDate);
                  const elapsed = Math.max(0, Math.min(daysBetween(proj.startDate, weekConfig.today), allocated));
                  const pct = allocated > 0 ? Math.round((elapsed / allocated) * 100) : 0;
                  const isFocused = kbActive && fi === focusIdx;
                  const isHovered = hoveredProject === proj.id;
                  const isDimmed = activeTab === "all" && (proj.phase === "GA" || proj.status === "deprioritized");

                  const cellBorder = "1px solid rgba(0,0,0,0.03)";
                  const rowBg = isFocused ? `${c.accent}10` : isHovered ? "rgba(0,0,0,0.012)" : c.surface;
                  return (
                    <tr key={proj.id}
                      className={isFocused ? "flow-kb-focus" : undefined}
                      onMouseEnter={() => setHoveredProject(proj.id)}
                      onMouseLeave={() => setHoveredProject(null)}
                      onClick={() => openProject(proj.id)}
                      style={{
                        cursor: "pointer",
                        background: rowBg,
                        opacity: isDimmed ? 0.65 : 1,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, opacity ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                    >
                      {/* Squad — sticky left (Pulse pattern) */}
                      <td style={{
                        padding: `${space[3]}px ${space[4]}px`,
                        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                        fontWeight: 500, color: c.textMid,
                        borderBottom: cellBorder,
                        position: "sticky", left: 0, background: rowBg, zIndex: 1,
                        fontVariantNumeric: "tabular-nums",
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
                      }}>{proj.squad}</td>

                      {/* Project — ID + Name compound (Pulse pattern) */}
                      <td style={{
                        padding: `${space[3]}px ${space[4]}px`,
                        borderBottom: cellBorder,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                          <span style={{
                            fontFamily: typo.monoMd.font, fontSize: 12,
                            fontWeight: 700, letterSpacing: "0.02em",
                            color: ec.project, flexShrink: 0,
                          }}>{proj.id}</span>
                          <span style={{
                            fontFamily: typo.bodyMd.font, fontSize: 14,
                            fontWeight: 600, color: c.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            transition: `color ${motion.fast.duration} ${motion.fast.easing}`,
                          }}>{proj.name}</span>
                          {m.hasBlockedCommit && <Tag color={c.red} bg={c.redDim} style={{ flexShrink: 0 }}>BLOCKED</Tag>}
                          {!m.hasBlockedCommit && m.endingSoon && (() => {
                            const d = daysBetween(today, proj.endDate);
                            return <Tag color={c.amber} bg={c.amberDim} style={{ flexShrink: 0 }} title={`Ends in ${d} day${d === 1 ? "" : "s"} (${fmtDate(proj.endDate)})`}>ENDING SOON</Tag>;
                          })()}
                          {weekConfig.weekStart && proj.startDate && proj.startDate >= weekConfig.weekStart && !shipPhases.includes(proj.phase) && (
                            <Tag color={c.cyan} bg={c.cyanDim} style={{ flexShrink: 0 }} title={`Started ${fmtDate(proj.startDate)} — new this cycle`}>NEW</Tag>
                          )}
                          {shipPhases.includes(proj.phase) && <Tag color={c.green} bg={c.greenDim} style={{ flexShrink: 0 }} title={proj.phase}>SHIPPED</Tag>}
                        </div>
                      </td>

                      {/* Owner — person entity = cyan */}
                      <td style={{
                        padding: `${space[3]}px ${space[4]}px`,
                        borderBottom: cellBorder,
                        fontFamily: typo.bodyMd.font, fontSize: 14,
                        fontWeight: 500, color: proj.owner ? c.cyan : c.textDim,
                        whiteSpace: "nowrap",
                      }}>{proj.owner || "Unassigned"}</td>

                      {/* Status — only in "All" tab */}
                      {activeTab === "all" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                        borderBottom: cellBorder,
                      }}>
                        <span style={{
                          display: "inline-block", padding: `3px 10px`,
                          borderRadius: layout.radiusXs,
                          background: sCfg.bg, color: sCfg.color,
                          fontFamily: typo.bodyXs.font, fontSize: 12, fontWeight: 700,
                        }}>{sCfg.label}</span>
                      </td>}

                      {/* Phase — hidden in Completed tab */}
                      {activeTab !== "shipped" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`,
                        textAlign: "center",
                        borderBottom: cellBorder,
                      }}>
                        <span style={{
                          display: "inline-block", padding: `3px 10px`,
                          borderRadius: layout.radiusXs,
                          background: pcMid[proj.phase] || c.surfaceAlt,
                          color: pc[proj.phase] || c.textDim,
                          fontFamily: typo.bodyXs.font, fontSize: 12, fontWeight: 700,
                        }}>{proj.phase}</span>
                      </td>}

                      {/* Health — hidden on shipped + deprioritized tabs */}
                      {activeTab !== "shipped" && activeTab !== "deprioritized" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                        borderBottom: cellBorder,
                      }}>
                        <div style={{ display: "inline-flex", justifyContent: "center" }}>
                          <HealthBar value={m.health ?? 100} compact />
                        </div>
                      </td>}

                      {/* Total commits */}
                      <td style={{
                        padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                        borderBottom: cellBorder,
                        fontFamily: typo.monoMd.font, fontSize: 13,
                        color: m.totalCommits > 0 ? c.text : c.textDim, fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}>{m.totalCommits || "—"}</td>

                      {/* This week — hidden in Completed and Deprioritized tabs */}
                      {activeTab !== "shipped" && activeTab !== "deprioritized" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                        borderBottom: cellBorder,
                        fontFamily: typo.monoMd.font, fontSize: 13, fontWeight: 700,
                        color: m.thisWeekTotal > 0 ? c.cyan : c.textDim,
                        fontVariantNumeric: "tabular-nums",
                      }}>{m.thisWeekTotal || "—"}</td>}

                      {/* People — hidden in Deprioritized tab */}
                      {activeTab !== "deprioritized" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                        borderBottom: cellBorder,
                        fontFamily: typo.monoMd.font, fontSize: 13, fontWeight: 700,
                        color: m.peopleList?.length > 0 ? c.text : c.textDim,
                        fontVariantNumeric: "tabular-nums",
                      }}>{m.peopleList?.length || "—"}</td>}

                      {/* Shipped tab — plan/actual columns */}
                      {activeTab === "shipped" && <>
                        <td style={{
                          padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                          borderBottom: cellBorder,
                          fontFamily: typo.monoMd.font, fontSize: 12, color: c.textMid,
                          fontVariantNumeric: "tabular-nums",
                        }}>{fmtDate(proj.startDate)}</td>
                        <td style={{
                          padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                          borderBottom: cellBorder,
                          fontFamily: typo.monoMd.font, fontSize: 12, color: c.textMid,
                          fontVariantNumeric: "tabular-nums",
                        }}>{fmtDate(proj.endDate)}</td>
                        <td style={{
                          padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                          borderBottom: cellBorder,
                          fontFamily: typo.monoMd.font, fontSize: 12, color: c.textMid,
                          fontVariantNumeric: "tabular-nums",
                        }}>{fmtDate(proj.actualStartDate)}</td>
                        <td style={{
                          padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                          borderBottom: cellBorder,
                          fontFamily: typo.monoMd.font, fontSize: 12, color: c.textMid,
                          fontVariantNumeric: "tabular-nums",
                        }}>{fmtDate(proj.actualEndDate)}</td>
                        <td style={{
                          padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                          borderBottom: cellBorder,
                          fontFamily: typo.monoMd.font, fontSize: 13, color: c.text, fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                        }}>{allocated}</td>
                        {(() => {
                          const actualDays = proj.actualStartDate && proj.actualEndDate ? daysBetween(proj.actualStartDate, proj.actualEndDate) : 0;
                          const overPlan = actualDays > allocated;
                          return <td style={{
                            padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                            borderBottom: cellBorder,
                            fontFamily: typo.monoMd.font, fontSize: 13, fontWeight: 700,
                            color: overPlan ? c.amber : c.green,
                            fontVariantNumeric: "tabular-nums",
                          }}>{actualDays}</td>;
                        })()}
                      </>}

                      {/* Last activity — hidden in Completed and Deprioritized tabs */}
                      {activeTab !== "shipped" && activeTab !== "deprioritized" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`, textAlign: "center",
                        borderBottom: cellBorder,
                        fontFamily: typo.monoMd.font, fontSize: 12,
                        color: m.lastActivity === "This wk" ? c.cyan : m.lastActivity ? c.textMid : c.textDim,
                        fontWeight: m.lastActivity === "This wk" ? 700 : 500,
                        fontVariantNumeric: "tabular-nums",
                      }}>{m.lastActivity || "—"}</td>}

                      {/* Timeline — hidden in Completed and Deprioritized tabs */}
                      {activeTab !== "shipped" && activeTab !== "deprioritized" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`,
                        borderBottom: cellBorder,
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontVariantNumeric: "tabular-nums" }}>
                            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid }}>
                              {fmtDate(proj.startDate)}
                            </span>
                            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>→</span>
                            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid }}>
                              {fmtDate(proj.endDate)}
                            </span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: c.border, overflow: "hidden", width: "100%" }}>
                            <div style={{
                              height: "100%", borderRadius: 2, width: `${Math.min(pct, 100)}%`,
                              background: m.overdue ? c.red : pct > 85 ? c.amber : c.green,
                              transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
                            }} />
                          </div>
                        </div>
                      </td>}

                      {/* Reason — Deprioritized tab only */}
                      {activeTab === "deprioritized" && <td style={{
                        padding: `${space[3]}px ${space[4]}px`,
                        borderBottom: cellBorder,
                        fontFamily: typo.bodySm.font, fontSize: 13,
                        color: proj.depriReason ? c.textMid : c.textDim,
                        maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={proj.depriReason || ""}>{proj.depriReason || "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
        </TableShell>
      )}
      <div style={{ flexShrink: 0, height: space[8] }} />
      </div>

      {/* FAB — Add Project (hidden in historical mode) */}
      {!isHistorical && <button className="flow-btn" onClick={() => setShowCreate(true)} aria-label="Add project" style={{
        position: "fixed", bottom: space[7], right: space[7], zIndex: 50,
        height: 40, padding: `0 ${space[5]}px`, borderRadius: layout.radiusSm,
        border: "none", cursor: "pointer",
        background: c.accent, color: c.textOnAccent,
        fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: space[1],
        boxShadow: c.shadowFloat,
        transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = c.accentHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = c.accent; }}
      >Add project</button>}

      {/* Create Project Overlay */}
      {showCreate && <CreateProjectOverlay
        projects={projects} people={people} squads={squads} setProjects={setProjects}
        onClose={() => setShowCreate(false)}
      />}

      {/* ═══════════════════════════════════════════════════════════
          GANTT FULLSCREEN OVERLAY
          ═══════════════════════════════════════════════════════════ */}
      {ganttAnim.mounted && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: c.bg, display: "flex", flexDirection: "column",
          animation: `${ganttAnim.visible ? "fadeIn" : "fadeOut"} ${motion.normal.duration} ${motion.normal.easing} both`,
        }}>
          {/* Top bar */}
          <div style={{
            height: 56, flexShrink: 0, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: `0 ${space[5]}px`,
            borderBottom: `1px solid ${c.border}`, background: c.bg,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <FlowLogo size={28} />
              <span style={{ fontSize: typo.bodyLg.size, fontWeight: 700, color: c.text, letterSpacing: "-0.02em" }}>Flow</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              {/* Unified search + filters bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: space[2],
                background: c.surfaceAlt, borderRadius: layout.radiusMd,
                padding: `${space[1] + 1}px ${space[3]}px`,
                border: `1px solid ${c.border}`,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
                </svg>
                <input
                  ref={ganttSearchRef}
                  value={ganttSearch} onChange={e => setGanttSearch(e.target.value)}
                  placeholder="Search…"
                  style={{
                    width: 140, padding: `4px ${space[1]}px`,
                    border: "none", background: "transparent", color: c.text,
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, outline: "none",
                  }}
                />
                <div style={{ width: 1, height: 20, background: c.border, flexShrink: 0 }} />
                <GanttMultiFilter label="Squads" options={allSquads} selected={ganttSquads}
                  onToggle={val => toggleFilter(setGanttSquads, val)} onClear={() => setGanttSquads([])} />
                <GanttMultiFilter label="Owners" options={allOwners} selected={ganttOwners}
                  onToggle={val => toggleFilter(setGanttOwners, val)} onClear={() => setGanttOwners([])} />
                <GanttMultiFilter label="Phase" options={allPhases} selected={ganttPhases}
                  onToggle={val => toggleFilter(setGanttPhases, val)} onClear={() => setGanttPhases([])} />
                {(ganttSearch || ganttSquads.length > 0 || ganttOwners.length > 0 || ganttPhases.length > 0) && (
                  <button className="flow-btn" onClick={() => { setGanttSearch(""); setGanttSquads([]); setGanttOwners([]); setGanttPhases([]); }} style={{
                    padding: `3px ${space[2]}px`, borderRadius: layout.radiusSm,
                    border: `1px solid ${c.border}`,
                    background: c.surfaceAlt, color: c.textMid,
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, cursor: "pointer",
                  }}>Clear</button>
                )}
              </div>

              {/* Close button */}
              <button onClick={() => { setGanttFullscreen(false); setViewMode("registry"); }} aria-label="Close Gantt view" style={{
                width: 44, height: 44, borderRadius: layout.radiusSm,
                border: `1px solid ${c.border}`, background: c.surfaceAlt,
                color: c.textDim, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.border; e.currentTarget.style.color = c.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = c.surfaceAlt; e.currentTarget.style.color = c.textDim; }}
              onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${c.accentMid}`; }}
              onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
              title="Close (Esc)"
              >✕</button>
            </div>
          </div>

          {/* Gantt fills rest of screen */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <GanttChart
              projects={ganttProjects}
              weekConfig={weekConfig}
              onProjectClick={(id) => { setGanttFullscreen(false); openProject(id); }}
            />
          </div>

          {/* Search/filters moved to top bar */}
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════
          BOARD FULLSCREEN OVERLAY
          ═══════════════════════════════════════════════════════════ */}
      {boardAnim.mounted && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: c.bg, display: "flex", flexDirection: "column",
          animation: `${boardAnim.visible ? "fadeIn" : "fadeOut"} ${motion.normal.duration} ${motion.normal.easing} both`,
        }}>
          {/* Top bar */}
          <div style={{
            height: 56, flexShrink: 0, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: `0 ${space[5]}px`,
            borderBottom: `1px solid ${c.border}`, background: c.bg,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <FlowLogo size={28} />
              <span style={{ fontSize: typo.bodyLg.size, fontWeight: 700, color: c.text, letterSpacing: "-0.02em" }}>Flow</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              {/* Unified search + filters bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: space[2],
                background: c.surfaceAlt, borderRadius: layout.radiusMd,
                padding: `${space[1] + 1}px ${space[3]}px`,
                border: `1px solid ${c.border}`,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
                </svg>
                <input
                  ref={boardSearchRef}
                  value={boardSearch} onChange={e => setBoardSearch(e.target.value)}
                  placeholder="Search…"
                  style={{
                    width: 140, padding: `4px ${space[1]}px`,
                    border: "none", background: "transparent", color: c.text,
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, outline: "none",
                  }}
                />
                <div style={{ width: 1, height: 20, background: c.border, flexShrink: 0 }} />
                <GanttMultiFilter label="Squads" options={allSquads} selected={boardSquads}
                  onToggle={val => toggleFilter(setBoardSquads, val)} onClear={() => setBoardSquads([])} />
                <GanttMultiFilter label="Owners" options={allOwners} selected={boardOwners}
                  onToggle={val => toggleFilter(setBoardOwners, val)} onClear={() => setBoardOwners([])} />
                <GanttMultiFilter label="Phase" options={allPhases} selected={boardPhases}
                  onToggle={val => toggleFilter(setBoardPhases, val)} onClear={() => setBoardPhases([])} />
                {(boardSearch || boardSquads.length > 0 || boardOwners.length > 0 || boardPhases.length > 0) && (
                  <button className="flow-btn" onClick={() => { setBoardSearch(""); setBoardSquads([]); setBoardOwners([]); setBoardPhases([]); }} style={{
                    padding: `3px ${space[2]}px`, borderRadius: layout.radiusSm,
                    border: `1px solid ${c.border}`,
                    background: c.surfaceAlt, color: c.textMid,
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, cursor: "pointer",
                  }}>Clear</button>
                )}
              </div>

              {/* Close button */}
              <button onClick={() => { setBoardFullscreen(false); setViewMode("registry"); }} aria-label="Close Board view" style={{
                width: 44, height: 44, borderRadius: layout.radiusSm,
                border: `1px solid ${c.border}`, background: c.surfaceAlt,
                color: c.textDim, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.border; e.currentTarget.style.color = c.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = c.surfaceAlt; e.currentTarget.style.color = c.textDim; }}
              onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${c.accentMid}`; }}
              onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
              title="Close (Esc)"
              >✕</button>
            </div>
          </div>

          {/* Board columns */}
          <div style={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "hidden", padding: `${space[4]}px ${space[5]}px` }}>
            {(() => {
              const columns = allPhases;
              const columnProjects = {};
              columns.forEach(ph => { columnProjects[ph] = []; });
              boardProjects.forEach(proj => {
                const ph = proj.phase || "PRD";
                if (columnProjects[ph]) columnProjects[ph].push(proj);
              });

              return (
                <div style={{
                  display: "flex", gap: space[3],
                  minWidth: columns.length * 180, height: "100%",
                }}>
                  {columns.map(phase => {
                    const phColor = pc[phase] || c.textDim;
                    const cards = columnProjects[phase] || [];
                    return (
                      <div key={phase} style={{
                        flex: 1, minWidth: 180, display: "flex", flexDirection: "column",
                        borderRadius: layout.radiusLg,
                        background: c.surface,
                        border: `1px solid ${c.border}`,
                        boxShadow: c.shadowCard,
                      }}>
                        {/* Column header */}
                        <div style={{
                          padding: `${space[3]}px ${space[4]}px`,
                          borderBottom: `1px solid ${c.border}`,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: phColor }} />
                            <span style={{
                              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                              fontWeight: 700, letterSpacing: "0.06em",
                              color: phColor, textTransform: "uppercase",
                            }}>{phase}</span>
                          </div>
                          <span style={{
                            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                            fontWeight: 700, color: c.textMid,
                            background: c.surfaceAlt, padding: "2px 8px",
                            borderRadius: layout.radiusPill, border: `1px solid ${c.border}`,
                          }}>{cards.length}</span>
                        </div>

                        {/* Cards */}
                        <div style={{
                          flex: 1, overflowY: "auto", padding: space[3],
                          display: "flex", flexDirection: "column", gap: space[2],
                          scrollbarWidth: "thin", scrollbarColor: `${c.textDim}20 transparent`,
                        }}>
                          {cards.length === 0 && (
                            <div style={{
                              padding: `${space[6]}px ${space[3]}px`,
                              textAlign: "center",
                              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                              color: c.textGhost,
                            }}>No projects</div>
                          )}
                          {cards.map(proj => {
                            const m = metrics[proj.id] || {};
                            const health = m.health ?? 0;
                            return (
                              <div
                                key={proj.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => { setBoardFullscreen(false); openProject(proj.id); }}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBoardFullscreen(false); openProject(proj.id); } }}
                                onMouseEnter={e => { const el = e.currentTarget; el.style.willChange = "transform, box-shadow"; el.style.transform = "translateY(-2px) scale(1.01)"; el.style.boxShadow = c.shadowElevated; }}
                                onMouseLeave={e => { const el = e.currentTarget; el.style.transform = "translateY(0) scale(1)"; el.style.boxShadow = c.shadowCard; setTimeout(() => { if (el) el.style.willChange = "auto"; }, 160); }}
                                onMouseDown={e => { e.currentTarget.style.transform = "translateY(0) scale(0.99)"; }}
                                onMouseUp={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1.01)"; }}
                                style={{
                                  padding: 16,
                                  borderRadius: layout.radiusLg,
                                  background: c.surface,
                                  border: `1px solid ${c.border}`,
                                  boxShadow: c.shadowCard,
                                  cursor: "pointer",
                                  display: "flex", flexDirection: "column", gap: space[2],
                                  transition: `box-shadow ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`,
                                }}
                              >
                                {/* ID + health bar */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{
                                    fontFamily: typo.monoMd.font, fontSize: 12,
                                    fontWeight: 700, letterSpacing: "0.02em",
                                    color: ec.project,
                                  }}>{proj.id}</span>
                                  <HealthBar value={health} compact />
                                </div>

                                {/* Name */}
                                <div style={{
                                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                                  fontWeight: 600, color: c.text, lineHeight: typo.bodySm.lineHeight,
                                }}>{proj.name}</div>

                                {/* Owner + squad */}
                                <div style={{
                                  display: "flex", alignItems: "center", gap: space[1],
                                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim,
                                }}>
                                  <span>{proj.owner || "—"}</span>
                                  <span style={{ color: c.textGhost }}>·</span>
                                  <span>{proj.squad}</span>
                                </div>

                                {/* Commits this week */}
                                <span style={{
                                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                                  fontWeight: 500,
                                  color: (m.thisWeekTotal || 0) > 0 ? c.cyan : c.textDim,
                                }}>{(m.thisWeekTotal || 0)} {(m.thisWeekTotal || 0) === 1 ? "commit" : "commits"} this week</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   CREATE PROJECT OVERLAY
   ══════════════════════════════════════════════════════════════════ */
function CreateProjectOverlay({ projects, people, squads, setProjects, onClose }) {
  useDevLabel('CreateProjectOverlay', 'src/views/ProjectsView.jsx', 'Modal overlay form for creating new projects with all field inputs');
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [squad, setSquad] = useState("");
  const [phase, setPhase] = useState("PRD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Prefer the canonical squads list from App.jsx so newly-created squads
  // that haven't been assigned to any project yet still appear here.
  const allSquads = squads && squads.length
    ? [...squads].sort()
    : [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();
  const allOwners = people ? people.map(p => p.name).sort() : [...new Set(projects.map(p => p.owner).filter(Boolean))].sort();

  // Display-only preview — real ID is generated server-side
  const previewId = useMemo(() => {
    const nums = projects.map(p => parseInt(p.id.replace(/\D/g, ""), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `X${String(max + 1).padStart(2, "0")}`;
  }, [projects]);

  const canSave = name.trim() && owner && squad && startDate && endDate && endDate > startDate;

  const handleCreate = () => {
    if (!canSave || saving) return;
    setSaving(true);
    // Use a temp ID for optimistic UI; server will assign the real one
    const tempId = `_tmp_${Date.now()}`;
    setProjects(prev => [...prev, {
      id: tempId, name: name.trim(), owner, squad, phase,
      startDate, endDate, status: "active",
    }]);
    onClose();
  };

  const inputStyle = {
    width: "100%", height: 40, padding: `0 ${space[3]}px`,
    borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
    background: c.surfaceAlt, color: c.text,
    fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
    outline: "none", boxSizing: "border-box",
  };


  const fieldLabel = { fontFamily: typo.bodyXs.font, fontSize: 12, fontWeight: 600, color: c.textMid, marginBottom: space[1], letterSpacing: 0 };

  return (
    <Modal open onClose={onClose} blur={8} width={520} title="New project">
      <div data-suppress-shortcuts style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: space[4] }}>
          <div style={{ fontFamily: typo.bodySm.font, fontSize: 13, color: c.textMid }}>
            Create a new project for your squad
          </div>
          <span style={{
            fontFamily: typo.monoMd.font, fontSize: 12, fontWeight: 700,
            color: c.amber, letterSpacing: "0.02em",
            padding: `3px 8px`, borderRadius: layout.radiusXs,
            background: c.amberDim,
          }}>{previewId}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          {/* Name */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={fieldLabel}>Name</div>
              <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: name.length > 100 ? c.red : c.textDim, fontVariantNumeric: "tabular-nums" }}>{name.length}/100</span>
            </div>
            <Inp value={name} onChange={e => { if (e.target.value.length <= 100) setName(e.target.value); }} placeholder="e.g. Checkout Redesign" style={{ width: "100%" }} autoFocus maxLength={100} />
          </div>

          {/* Owner + Squad */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
            <div>
              <div style={fieldLabel}>Owner</div>
              <SearchSelect value={owner} onChange={setOwner} options={allOwners} placeholder="Search people..." />
            </div>
            <div>
              <div style={fieldLabel}>Squad</div>
              <SearchSelect value={squad} onChange={setSquad} options={allSquads} placeholder="Search squads..." />
            </div>
          </div>

          {/* Phase */}
          <div>
            <div style={fieldLabel}>Phase</div>
            <Sel value={phase} onChange={e => setPhase(e.target.value)} style={{ width: "100%" }}>
              {allPhases.map(p => <option key={p} value={p}>{p}</option>)}
            </Sel>
          </div>

          {/* Duration — start → end inline */}
          <div>
            <div style={fieldLabel}>Duration</div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <span style={{ fontFamily: typo.bodyMd.font, fontSize: 14, color: c.textDim, flexShrink: 0 }}>→</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
            {startDate && endDate && endDate <= startDate && (
              <div style={{ fontFamily: typo.bodySm.font, fontSize: 13, color: c.red, marginTop: space[1] }}>End date must be after start date</div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: space[2], marginTop: space[3] }}>
            <Btn variant="secondary" size="sm" onClick={onClose}>Cancel</Btn>
            <button onClick={handleCreate} disabled={!canSave || saving} style={{
              height: 36, padding: `0 ${space[4]}px`, borderRadius: layout.radiusSm,
              border: "none", cursor: canSave && !saving ? "pointer" : "default",
              background: canSave && !saving ? c.accent : c.surfaceAlt,
              color: canSave && !saving ? c.textOnAccent : c.textDim,
              fontFamily: typo.bodyMd.font, fontSize: 14, fontWeight: 600,
              opacity: canSave && !saving ? 1 : 0.6,
              transition: `background ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, opacity ${motion.fast.duration} ${motion.fast.easing}`,
            }}>{saving ? "Creating..." : "Create project"}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECT DEEP DIVE — PeopleDeepDive structural model
   De-cluttered: hero → history → ledger → supporting metadata
   ══════════════════════════════════════════════════════════════════ */
function ProjectDeepDive({ proj, metrics: m, history, commitments, projects, setProjects, people, squads, onNavigate, goBack, pc, pcMid, pcDim, sc, tc, ec, weekLabels: WEEK_LABELS, isHistorical, today, weekStart, leaving = false, suppressBackRef }) {
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
  // Reset edit state from fresh proj data when entering edit mode
  const setEditing = useCallback((val) => {
    if (val) {
      setEditName(proj.name);
      setEditOwner(proj.owner); setEditSquad(proj.squad);
      setEditPhase(proj.phase); setEditStatus(proj.status || "active");
      setEditStart(proj.startDate || ""); setEditEnd(proj.endDate || "");
      setEditActualStart(proj.actualStartDate || ""); setEditActualEnd(proj.actualEndDate || "");
    }
    setEditingRaw(val);
  }, [proj.name, proj.owner, proj.squad, proj.phase, proj.status, proj.startDate, proj.endDate, proj.actualStartDate, proj.actualEndDate]);
  const [depriReasonModal, setDepriReasonModal] = useState(false);
  const [depriReasonText, setDepriReasonText] = useState("");
  const [reactivateModal, setReactivateModal] = useState(false);
  const [retroDateModal, setRetroDateModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(null); // cached overrides when a retro-date confirmation is open
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteDeps, setDeleteDeps] = useState(null); // { commitmentCount, peopleNames }
  const [deleting, setDeleting] = useState(false);
  const [depsLoading, setDepsLoading] = useState(false);
  const [depsError, setDepsError] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [phaseTransitions, setPhaseTransitions] = useState([]);
  const editBtnRef = useRef(null);
  const nameInpRef = useRef(null);

  // Tell App.jsx's global Escape handler to stand down whenever this deep-dive
  // is in edit mode or has a modal open — otherwise pressing Escape to close
  // the edit form would also navigate back to the project list.
  useEffect(() => {
    if (!suppressBackRef) return;
    suppressBackRef.current = !!(editing || deleteModal || depriReasonModal || reactivateModal || retroDateModal);
    return () => { if (suppressBackRef) suppressBackRef.current = false; };
  }, [editing, deleteModal, depriReasonModal, reactivateModal, retroDateModal, suppressBackRef]);

  // Fetch phase-change history from activity_log for this project.
  // edit_project rows carry details.phase whenever phase was changed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("activity_log")
          .select("created_at, user_name, details")
          .eq("entity_type", "project")
          .eq("entity_id", proj.id)
          .eq("action", "edit_project")
          .order("created_at", { ascending: true });
        if (error || cancelled || !data) return;
        const transitions = data
          .filter(r => r.details && typeof r.details === "object" && r.details.phase)
          .map(r => ({ at: r.created_at, phase: r.details.phase, by: r.user_name }));
        setPhaseTransitions(transitions);
      } catch {
        /* swallow — transitions are a nice-to-have */
      }
    })();
    return () => { cancelled = true; };
  }, [proj.id]);

  // Safe default so missing metrics don't crash the view (e.g. first-render
  // race or brand-new project with no commits yet).
  if (!m) m = { totalCommits: 0, peopleList: [], weeklyData: [], typeBreakdown: {}, health: null, overdue: false, atRisk: false, hasBlockedCommit: false };

  const [justSaved, setJustSaved] = useState(false);
  const justSavedTimerRef = useRef(null);
  useEffect(() => () => { if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current); }, []);

  // Enter edit mode: scroll to top + focus Name input
  const enterEdit = useCallback(() => {
    if (isHistorical) return;
    setEditing(true);
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    // Wait for form mount before focusing the name input
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { nameInpRef.current?.focus({ preventScroll: true }); } catch { nameInpRef.current?.focus(); }
      nameInpRef.current?.select?.();
    }));
  }, [isHistorical, setEditing]);

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
    if (isHistorical) return;
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
    } : p));
    exitEdit();
    setJustSaved(true);
    if (justSavedTimerRef.current) clearTimeout(justSavedTimerRef.current);
    justSavedTimerRef.current = setTimeout(() => setJustSaved(false), 900);
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
  // alters health/overdue calculations for those frozen weeks.
  const pastHistoryWeekCount = useMemo(() => {
    const projHist = history[proj.id] || [];
    if (!weekStart) return projHist.filter(w => w.entries?.length > 0).length;
    return projHist.filter(w => w.entries?.length > 0 && w.week && w.week < weekStart).length;
  }, [history, proj.id, weekStart]);
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
    // that health/overdue for those frozen weeks will shift.
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
    const allWeeks = WEEK_LABELS;
    // Commits carry work-function stages only (PRD/Design/Dev/QA). Alpha/Beta/GA
    // are project lifecycle states shown by the PROGRESS bar, not commit stages.
    // Any legacy/seed commits with those stages fall into the "Other" bucket.
    const knownPhases = commitPhases;
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
    const projHist = history[proj.id] || [];
    for (const wk of projHist) {
      for (const e of wk.entries) place(wk.week, e);
    }
    commitments.forEach(cm => {
      cm.items.forEach((it, idx) => {
        if (cm.deselected !== idx && it.project === proj.id) {
          place("This wk", { ...it, person: cm.person });
        }
      });
    });
    return { weekPhaseMatrix: matrix, hasOtherBucket: otherSeen };
  }, [proj.id, history, commitments, WEEK_LABELS]);

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
  // Only fall back to date-elapsed % when there's no planned health signal AND dates exist.
  const healthVal = m.health != null ? m.health : (hasPlannedDates ? pct : null);
  const healthSub = m.health != null ? "project health score"
    : hasPlannedDates ? "planned vs actual"
    : "not enough signal";
  const fmtShort = (d) => { if (!d) return "—"; const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };

  // ── Risk tier (critical/warning/healthy) derived from metrics ──
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: space[4], paddingBottom: 96,
      animation: leaving
        ? `fadeScaleOut ${motion.fast.duration} cubic-bezier(0.4, 0, 1, 1) both`
        : `viewMorphIn ${motion.normal.duration} ${motion.normal.easing} both`,
      transformOrigin: "center top",
    }}>

      {/* ═══ STATE BANNERS — historical / deprioritized / blocked ═══ */}
      {isHistorical && (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
          background: c.surfaceAlt, border: `1px solid ${c.border}`,
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid,
          display: "flex", alignItems: "center", gap: space[2],
        }}>
          <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Historical week
          </span>
          <span>— viewing read-only. Edits are disabled.</span>
        </div>
      )}
      {proj.status === "deprioritized" && (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
          background: c.amberDim, border: `1px solid ${c.amberBorder}`,
          display: "flex", alignItems: "flex-start", gap: space[3],
        }}>
          <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.amber, letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0, paddingTop: 2 }}>
            Deprioritized
          </span>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.5, flex: 1 }}>
            {proj.depriReason || <span style={{ color: c.textDim, fontStyle: "italic" }}>No reason provided.</span>}
          </div>
        </div>
      )}
      {m.hasBlockedCommit && proj.status !== "deprioritized" && (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
          background: c.redDim, border: `1px solid ${c.redBorder}`,
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.red,
          display: "flex", alignItems: "center", gap: space[2],
        }}>
          <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Blocked
          </span>
          <span style={{ color: c.textMid }}>— at least one commitment is blocked this week.</span>
        </div>
      )}

      {/* ═══ IDENTITY HEADER — project id + name + phase badge ═══ */}
      <div style={{
        padding: space[6], borderRadius: layout.radiusLg,
        background: c.surface,
        border: `1px solid ${justSaved ? c.green : c.border}`,
        boxShadow: justSaved ? `${c.shadowCard || ""}, 0 0 0 3px ${c.greenDim}` : c.shadowCard,
        transition: `border-color ${motion.normal.duration} ${motion.normal.easing}, box-shadow ${motion.normal.duration} ${motion.normal.easing}`,
      }}>
        {!editing ? (
          <div key="read" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[4],
            animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: space[3], flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size,
                  fontWeight: typo.displayLg.weight, color: c.text,
                  letterSpacing: typo.displayLg.tracking, lineHeight: 1.15,
                }}>{proj.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: space[3], marginTop: space[2], flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[1] }}>
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Owner</span>
                  <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600, color: proj.owner ? c.text : c.textMid, fontStyle: proj.owner ? "normal" : "italic" }}>{proj.owner || "Unassigned"}</span>
                </div>
                {proj.squad && (
                  <div style={{ display: "flex", alignItems: "center", gap: space[1] }}>
                    <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Squad</span>
                    <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600, color: c.text }}>{proj.squad}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2], flexShrink: 0 }}>
              {!isHistorical && (
                <button
                  ref={editBtnRef}
                  onClick={enterEdit}
                  aria-label="Edit project (E)"
                  title="Edit (E)"
                  className="flow-btn"
                  onMouseEnter={e => { e.currentTarget.style.background = c.surfaceAlt; e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.borderMedium; }}
                  onMouseLeave={e => { e.currentTarget.style.background = c.surface; e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = c.border; }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  onFocus={e => { e.currentTarget.style.outline = `2px solid ${c.accent}`; e.currentTarget.style.outlineOffset = "2px"; }}
                  onBlur={e => { e.currentTarget.style.outline = "none"; e.currentTarget.style.outlineOffset = "0"; }}
                  style={{
                    width: 36, height: 36, padding: 0,
                    borderRadius: layout.radiusSm,
                    border: `1px solid ${c.border}`,
                    background: c.surface,
                    color: c.textMid,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: `background ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`,
                  }}
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              <span style={{
                fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: 700,
                letterSpacing: typo.monoLg.tracking, color: ec.project,
                fontVariantNumeric: "tabular-nums",
                padding: `${space[2]}px ${space[3]}px`,
                background: c.amberDim,
                borderRadius: layout.radiusSm,
              }}>{proj.id}</span>
            </div>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: space[3] }}>
              <div style={{ position: "relative", zIndex: 4 }}>
                <Label style={{ marginBottom: space[1] }}>Owner</Label>
                <SearchSelect value={editOwner} onChange={setEditOwner} options={allOwners} placeholder="Search people..." />
              </div>
              <div style={{ position: "relative", zIndex: 3 }}>
                <Label style={{ marginBottom: space[1] }}>Squad</Label>
                <SearchSelect value={editSquad} onChange={setEditSquad} options={allSquads} placeholder="Search squads..." />
              </div>
              <div style={{ position: "relative", zIndex: 2 }}>
                <Label style={{ marginBottom: space[1] }}>Phase</Label>
                <Sel value={editPhase} onChange={e => setEditPhase(e.target.value)} style={{ width: "100%" }}>
                  {allPhases.map(p => <option key={p} value={p}>{p}</option>)}
                </Sel>
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <Label style={{ marginBottom: space[1] }}>Status</Label>
                <Sel value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ width: "100%" }}>
                  <option value="active">Active</option>
                  <option value="deprioritized">Deprioritized</option>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: space[2], marginTop: space[2] }}>
              <div style={{ display: "flex", gap: space[2] }}>
                <Btn variant="command" size="sm" onClick={saveEdits} disabled={!canSaveEdits} style={{ borderColor: canSaveEdits ? c.greenBorder : c.border, color: canSaveEdits ? c.green : c.textDim, opacity: canSaveEdits ? 1 : 0.6, cursor: canSaveEdits ? "pointer" : "not-allowed" }}>Save</Btn>
                <Btn variant="secondary" size="sm" onClick={cancelEdits}>Cancel</Btn>
              </div>
              <Btn variant="secondary" size="sm" onClick={handleDeleteClick} style={{ borderColor: c.redBorder, color: c.red }}>Delete</Btn>
            </div>
          </div>
        )}
      </div>

      {/* ═══ PHASE PROGRESS — linear tracker through PRD → Design → Dev → QA → Ship.
             Transition dates from activity_log render below each past/current pill. ═══ */}
      {(() => {
        const allP = [...phaseNames, ...shipPhases];
        const currentIdx = allP.indexOf(proj.phase);
        if (currentIdx < 0) return null;
        // First transition per phase (in case of duplicates).
        const enteredAt = {};
        phaseTransitions.forEach(t => { if (!enteredAt[t.phase]) enteredAt[t.phase] = t; });
        return (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: c.inset, border: `1px solid ${c.border}`,
            display: "flex", alignItems: "flex-start", gap: space[2], flexWrap: "wrap",
          }}>
            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: space[2], marginTop: 7 }}>
              Progress
            </span>
            <div style={{ display: "flex", alignItems: "flex-start", gap: space[1], flex: 1, flexWrap: "wrap" }}>
              {allP.map((ph, idx) => {
                const isPast = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const color = isCurrent ? (pc[ph] || c.accent) : isPast ? c.textMid : c.textGhost;
                const bg = isCurrent ? (pcDim[ph] || c.accentDim) : isPast ? c.surfaceAlt : "transparent";
                const border = isCurrent ? `1px solid ${pc[ph] || c.accent}` : isPast ? `1px solid ${c.border}` : `1px dashed ${c.border}`;
                const entered = enteredAt[ph];
                const tooltip = entered
                  ? `Entered ${ph} on ${fmtShort(entered.at.slice(0, 10))}${entered.by ? ` · by ${entered.by}` : ""}`
                  : undefined;
                return (
                  <React.Fragment key={ph}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 52 }}>
                      <span title={tooltip} style={{
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700,
                        letterSpacing: "0.04em", textTransform: "uppercase",
                        padding: `${space[1]}px ${space[2]}px`, borderRadius: layout.radiusXs,
                        background: bg, color, border,
                        cursor: tooltip ? "help" : "default",
                      }}>{ph}</span>
                      <span style={{
                        fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 500,
                        color: isCurrent ? (pc[ph] || c.textMid) : c.textDim,
                        letterSpacing: "0.02em",
                        minHeight: 12,
                      }}>
                        {entered ? fmtShort(entered.at.slice(0, 10)) : ""}
                      </span>
                    </div>
                    {idx < allP.length - 1 && (
                      <span aria-hidden="true" style={{ width: 16, height: 2, background: idx < currentIdx ? c.textMid : c.border, borderRadius: 1, marginTop: 11, flexShrink: 0 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ═══ SCHEDULE — plan vs actual with actual as the primary fact ═══ */}
      {inShip && (proj.actualStartDate || proj.actualEndDate) && (() => {
        const startSlip = proj.actualStartDate && proj.startDate ? daysBetween(proj.startDate, proj.actualStartDate) : null;
        const endSlip = proj.actualEndDate && proj.endDate ? daysBetween(proj.endDate, proj.actualEndDate) : null;
        const slipCfg = (d) => {
          if (d == null) return null;
          if (d === 0) return { label: "on plan", color: c.textMid, bg: c.surfaceAlt };
          if (d > 0) return { label: `${d} day${d === 1 ? "" : "s"} late`, color: c.red, bg: c.redDim };
          return { label: `${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} early`, color: c.green, bg: c.greenDim };
        };
        const Column = ({ head, planDate, actualDate, slip }) => (
          <div>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: space[1] }}>
              {head}
            </div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: 15, fontWeight: 700, color: c.text, lineHeight: 1.2 }}>
              {actualDate ? fmtShort(actualDate) : "—"}
            </div>
            {planDate && (
              <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, marginTop: 2 }}>
                planned <span style={{ color: c.textMid, fontWeight: 500 }}>{fmtShort(planDate)}</span>
              </div>
            )}
            {slip && (
              <span style={{
                display: "inline-block", marginTop: space[1] + 2,
                padding: `2px ${space[2]}px`, borderRadius: layout.radiusXs,
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700,
                color: slip.color, background: slip.bg,
              }}>
                {slip.label}
              </span>
            )}
          </div>
        );
        return (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: c.surfaceAlt, border: `1px solid ${c.border}`,
            display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: space[5], alignItems: "center",
          }}>
            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Schedule
            </span>
            <Column head="Start" planDate={proj.startDate} actualDate={proj.actualStartDate} slip={slipCfg(startSlip)} />
            <Column head="End" planDate={proj.endDate} actualDate={proj.actualEndDate} slip={slipCfg(endSlip)} />
          </div>
        );
      })()}

      {/* ═══ KPI GRID — 4 cards: Commits / Contributors / Remaining / Health ═══ */}
      <KpiGrid cols="1fr 1fr 1fr 1fr">
        <KpiCard
          label="Total Commits"
          value={m.totalCommits}
          sub={(() => {
            const b = m.typeBreakdown?.BUILD || 0;
            const j = m.typeBreakdown?.JAM || 0;
            if (m.totalCommits === 0) return "no activity logged";
            return `${b} BUILD · ${j} JAM`;
          })()}
        />
        <KpiCard
          label="Contributors"
          value={m.peopleList?.length || 0}
          sub={m.peopleList?.length ? "people involved" : "no contributors yet"}
        />
        <KpiCard
          label={isDepri ? "Plan ended" : "Remaining"}
          value={remainingValue}
          sub={`${fmtShort(proj.startDate)} → ${fmtShort(proj.endDate)} · ${elapsedLabel}`}
        />
        {healthVal == null ? (
          <KpiCard label="Health" value="—" sub={healthSub} />
        ) : (
          <HealthGauge value={healthVal} label="Health" sub={healthSub} />
        )}
      </KpiGrid>

      {/* ═══ WEEKLY COMMITS — roadmap lane ═══ */}
      <div>
        <SectionHead title="Weekly Commits" />
        <div style={{
          padding: space[6], borderRadius: layout.radiusLg,
          background: c.surface, border: `1px solid ${c.border}`, boxShadow: c.shadowCard,
        }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `96px repeat(${WEEK_LABELS.length}, minmax(56px, 1fr))`, gap: space[1], marginBottom: space[2], borderBottom: `1px solid ${c.border}`, paddingBottom: space[1] }}>
              <span />
              {WEEK_LABELS.map(w => (
                <span key={w} style={{
                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                  color: w === "This wk" ? c.accent : c.textDim, textAlign: "center",
                  fontWeight: w === "This wk" ? 700 : 500,
                  fontVariantNumeric: "tabular-nums",
                }}>{w}</span>
              ))}
            </div>
            {(() => {
              const canonicalPhases = commitPhases;
              const anyActivity = canonicalPhases.some(phase => WEEK_LABELS.some(w => (weekPhaseMatrix[w]?.[phase] || []).length > 0)) || hasOtherBucket;
              if (!anyActivity) {
                return (
                  <div style={{ padding: `${space[4]}px 0`, textAlign: "center", fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>
                    No commits logged against this project yet.
                  </div>
                );
              }
              const activePhases = [...canonicalPhases, ...(hasOtherBucket ? ["Other"] : [])];
              return activePhases.map(phase => {
              const color = phase === "Other" ? c.textDim : (pc[phase] || c.textDim);
              const midBg = phase === "Other" ? c.surfaceAlt : (pcMid[phase] || c.surfaceAlt);
              return (
                <div key={phase} style={{
                  display: "grid", gridTemplateColumns: `96px repeat(${WEEK_LABELS.length}, minmax(56px, 1fr))`,
                  gap: 2, marginBottom: space[1],
                }}>
                  <span
                    title={phase === "Other" ? "Commits with an unrecognized phase (legacy data or migration artifacts)" : undefined}
                    style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color, display: "flex", alignItems: "center", cursor: phase === "Other" ? "help" : "default" }}>
                    {phase}{phase === "Other" && <span aria-hidden="true" style={{ marginLeft: 4, fontSize: 10 }}>ⓘ</span>}
                  </span>
                  {WEEK_LABELS.map(w => {
                    const entries = weekPhaseMatrix[w]?.[phase] || [];
                    const hasActivity = entries.length > 0;
                    return (
                      <div key={w} style={{
                        height: 32, borderRadius: layout.radiusXs,
                        background: hasActivity ? midBg : c.surfaceAlt,
                        borderLeft: hasActivity ? `3px solid ${color}` : "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {hasActivity && (
                          <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{entries.length}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
            })()}
          </div>
        </div>
      </div>

      {/* ═══ ACTIVITY TIMELINE — shared across Projects + People deep-dives.
             See src/components/ActivityTimeline.jsx. ═══ */}
      <div>
        <SectionHead title="Activity Timeline" />
        <div style={{
          borderRadius: layout.radiusLg,
          background: c.surface, border: `1px solid ${c.border}`, boxShadow: c.shadowCard,
          overflow: "clip",
        }}>
          <div style={{ maxHeight: 720, overflowY: "auto" }}>
            <ActivityTimeline
              subject="project"
              weeks={m.weeklyData.map(wk => ({
                week: wk.week,
                isCurrent: wk.isCurrent,
                entries: wk.isCurrent ? wk.entries : wk.entries.filter(e => [...phaseNames, ...shipPhases].includes(e.stage || "")),
              }))}
              weekLabels={WEEK_LABELS}
              currentWeekStart={weekStart}
              onPersonNavigate={(name) => onNavigate && onNavigate("people", name)}
              titleStripId={proj.id}
              titleStripName={proj.name}
              emptyMessage="No activity yet"
            />
          </div>
        </div>
      </div>

      {/* ═══ PEOPLE INVOLVED ═══ */}
      <div>
        <SectionHead title="People Involved" />
        <div style={{
          padding: space[6], borderRadius: layout.radiusLg,
          background: c.surface, border: `1px solid ${c.border}`, boxShadow: c.shadowCard,
        }}>
          {m.peopleList?.length > 0 ? (
            <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
              {m.peopleList.map(name => (
                <button type="button" key={name}
                  onClick={() => onNavigate && onNavigate("people", name)}
                  aria-label={`View ${name}`}
                  onMouseEnter={e => { e.currentTarget.style.background = c.cyanMid || c.cyan + "30"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = c.cyanDim; e.currentTarget.style.transform = "scale(1)"; }}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  style={{
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                    fontWeight: 600, color: c.cyan, cursor: "pointer",
                    padding: `${space[1]}px ${space[3]}px`,
                    background: c.cyanDim, border: "none", borderRadius: layout.radiusPill,
                    transition: `background ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                  }}>{name}</button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: `${space[3]}px 0`, display: "flex", flexDirection: "column", alignItems: "center", gap: space[2] }}>
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, lineHeight: 1.5 }}>
                No one has committed to this project yet.
              </div>
            </div>
          )}
        </div>
      </div>


      {/* FAB removed — edit is now the pencil icon in the header; delete lives in the edit panel. */}

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

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      <Modal open={deleteModal} onClose={() => {
        if (deleting) return;
        setDeleteModal(false);
        setDeleteConfirmText("");
        setDeleteDeps(null);
        setDepsError(null);
      }} title="Delete project?" accent={c.red} width={480}>
        {depsLoading ? (
          <div style={{ padding: `${space[4]}px 0`, textAlign: "center", color: c.textDim, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size }}>
            Checking dependencies…
          </div>
        ) : (
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[4] }}>
            This will permanently delete <strong style={{ color: c.text }}>{proj.id} — {proj.name}</strong> and all its history data. This cannot be undone.
          </div>
        )}
        {deleteDeps && deleteDeps.commitmentCount > 0 && (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: c.redDim, border: `1px solid ${c.redBorder}`, marginBottom: space[4],
          }}>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600, color: c.red, marginBottom: space[1] }}>
              {deleteDeps.commitmentCount} active commitment{deleteDeps.commitmentCount !== 1 ? "s" : ""} reference this project
            </div>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.5 }}>
              {deleteDeps.peopleNames.length > 0
                ? `Affected: ${deleteDeps.peopleNames.join(", ")}. Their commitment items will have the project link removed.`
                : "Commitment items will have their project link removed."}
            </div>
          </div>
        )}
        {deleteDeps && deleteDeps.commitmentCount === 0 && (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: c.greenDim, border: `1px solid ${c.greenBorder}`, marginBottom: space[4],
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid,
          }}>
            No active commitments reference this project. Safe to delete.
          </div>
        )}
        {depsError && (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: c.redDim, border: `1px solid ${c.redBorder}`, marginBottom: space[4],
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: space[3],
          }}>
            <span>{depsError}</span>
            <Btn variant="ghost" size="sm" onClick={handleDeleteClick}>Retry</Btn>
          </div>
        )}
        {!depsLoading && !depsError && deleteDeps && (
          <div style={{ marginBottom: space[4] }}>
            <Label style={{ marginBottom: space[1] }}>
              Type <span style={{ fontFamily: typo.monoSm.font, color: c.red }}>{proj.id}</span> to confirm
            </Label>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, marginBottom: space[1] }}>
              Case-insensitive.
            </div>
            <Inp
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={proj.id}
              style={{ width: "100%", fontFamily: typo.monoMd.font }}
              disabled={deleting}
            />
          </div>
        )}
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={() => setDeleteModal(false)} disabled={deleting}>Cancel</Btn>
          <Btn variant="danger" size="sm"
            onClick={confirmDelete}
            disabled={deleting || depsLoading || !deleteDeps || deleteConfirmText.trim().toLowerCase() !== (proj.id || "").toLowerCase()}>
            {deleting ? "Deleting..." : "Delete permanently"}
          </Btn>
        </div>
      </Modal>

      {/* ═══ RETROACTIVE DATE-CHANGE WARNING ═══ */}
      <Modal open={retroDateModal} onClose={() => { setRetroDateModal(false); setPendingSave(null); }} title="Change affects past weeks?" accent={c.amber}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          This project has <strong style={{ color: c.text }}>{pastHistoryWeekCount}</strong> {pastHistoryWeekCount === 1 ? "week" : "weeks"} of historical activity. Changing the plan dates will retroactively alter health, overdue, and timeline calculations for those frozen weeks.
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
    </div>
  );
}

