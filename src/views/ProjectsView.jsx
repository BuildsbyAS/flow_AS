// Flow — Projects View (Rebuild v2: Pulse structural model + PeopleDeepDive history model)
// Two states: Registry (Pulse-style table with tabs) → Project Deep Dive (PeopleDeepDive-style)
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { c, typo, space, layout, motion, phaseNames, shipPhases, allPhases, typeConfig, phaseColors as getPhaseColors, statusColors, entityColors, colWidths, outcomeConfig } from "../styles/theme";
import { Badge, Tag, Surface, Modal, Label, Btn, Inp, Sel, SearchSelect, EmptyState, TelemetryLabel, SectionDivider, StatCell, MetricCompact, SummaryTile, KPIBar, VDivider, Th as SharedTh } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import GanttChart from "../components/GanttChart";
import FlowLogo from "../components/FlowLogo";
import { logProjectEdit, logProjectCreate } from "../lib/activityLog";
import { getProjectDependencies, deleteProjectFromDB } from "../lib/mutations";
import useDevLabel from "../hooks/useDevLabel";

// Today's date — derived fresh per-render via weekConfig.today (no module-level mutable)

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

  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        padding: `${space[1]}px ${space[2]}px`,
        borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
        background: active ? c.accentDim : c.surfaceAlt,
        color: active ? c.accent : c.textDim,
        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
        cursor: "pointer", outline: "none",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {active ? `${label} (${selected.length})` : `All ${label}`}
        <span style={{ fontSize: 11, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 900,
          minWidth: 180, maxHeight: 260, overflowY: "auto",
          background: c.surfaceOverlay, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusMd, boxShadow: c.shadowOverlay,
          padding: `${space[1]}px 0`,
        }}>
          {active && (
            <div onClick={() => { onClear(); }} style={{
              padding: `${space[1]}px ${space[3]}px`, cursor: "pointer",
              fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
              color: c.red, fontWeight: 600, borderBottom: `1px solid ${c.border}`,
              marginBottom: space[1],
            }}>Clear all</div>
          )}
          {options.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <div key={opt} onClick={() => onToggle(opt)} style={{
                padding: `${space[1]}px ${space[3]}px`, cursor: "pointer",
                display: "flex", alignItems: "center", gap: space[2],
                background: isSelected ? `${c.accent}10` : "transparent",
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                color: isSelected ? c.text : c.textMid,
              }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: `1.5px solid ${isSelected ? c.accent : c.textDim}`,
                  background: isSelected ? c.accent : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: c.bg, fontWeight: 700,
                }}>{isSelected ? "✓" : ""}</span>
                {opt}
              </div>
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
      isBlocked: false,
      endingSoon: false,
      overdue: false,
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
    if (daysToEnd <= 14 && daysToEnd > 0 && !shipPhases.includes(proj.phase)) m.endingSoon = true;
    if (daysToEnd < 0 && !shipPhases.includes(proj.phase)) m.overdue = true;

    // Health (mirrors PulseView formula)
    const age = daysBetween(proj.startDate, today);
    const planned = daysBetween(proj.startDate, proj.endDate);
    let health = 100;
    if (planned > 0) { const pctEl = age / planned; if (pctEl > 1) health -= 35; else if (pctEl > 0.85) health -= 20; else if (pctEl > 0.65) health -= 10; }
    if (daysToEnd != null && daysToEnd < 7 && daysToEnd >= 0 && !shipPhases.includes(proj.phase)) health -= 5;
    if (m.thisWeekTotal === 0 && !shipPhases.includes(proj.phase)) health -= 25;
    else { if (m.thisWeekTotal > 0 && !m.typeBreakdown.BUILD && m.typeBreakdown.JAM) health -= 10; }
    if (!proj.owner) health -= 20;
    m.health = Math.max(0, Math.min(100, health));

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
      case "project": return d * (a.name || "").localeCompare(b.name || "");
      case "owner": return d * (a.owner || "").localeCompare(b.owner || "");
      case "status": return d * (a.status || "active").localeCompare(b.status || "active");
      case "phase": return d * (allPhases.indexOf(a.phase) - allPhases.indexOf(b.phase));
      case "total": return d * ((metrics[a.id]?.totalCommits || 0) - (metrics[b.id]?.totalCommits || 0));
      case "thisWk": return d * ((metrics[a.id]?.thisWeekTotal || 0) - (metrics[b.id]?.thisWeekTotal || 0));
      case "people": return d * ((metrics[a.id]?.peopleList.length || 0) - (metrics[b.id]?.peopleList.length || 0));
      case "last": {
        const order = {};
        (weekLabels || []).forEach((w, i) => { order[w] = i + 1; });
        return d * ((order[metrics[a.id]?.lastActivity] || 0) - (order[metrics[b.id]?.lastActivity] || 0));
      }
      case "timeline": return d * (daysBetween(today, a.endDate) - daysBetween(today, b.endDate));
      default: return 0;
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════════ */
export default function ProjectsView({
  projects: rawProjects, setProjects, commitments, people, history,
  weekConfig: weekConfigProp,
  initialId, onNavigate, setDetailLabel, setGoBack, searchRef, globalFilters = {},
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
  const [sortKey, setSortKey] = useState("squad");
  const [sortDir, setSortDir] = useState("asc");
  const [hoveredProject, setHoveredProject] = useState(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const [searchGlow, setSearchGlow] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState("registry"); // "registry" | "board" | "timeline"
  const [ganttFullscreen, setGanttFullscreen] = useState(false);
  const [boardFullscreen, setBoardFullscreen] = useState(false);
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

  // ── Breadcrumb / detail mode (copied from PeopleDeepDive pattern) ──
  const goBackToList = useCallback(() => {
    setSelectedProject(null);
    if (setDetailLabel) setDetailLabel(null);
    if (setGoBack) setGoBack(null);
  }, [setDetailLabel, setGoBack]);

  const openProject = useCallback((id) => {
    setSelectedProject(id);
    const p = projects.find(pr => pr.id === id);
    if (p && setDetailLabel) setDetailLabel(`${p.id} / ${p.name}`);
    if (setGoBack) setGoBack(goBackToList);
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
  const tabProjects = useMemo(() => {
    let list;
    switch (activeTab) {
      case "active": list = filtered.filter(p => (p.status === "active" || p.status === "blocked") && !shipPhases.includes(p.phase)); break;
      case "at_risk": list = filtered.filter(p => {
        if (shipPhases.includes(p.phase) || p.status === "deprioritized") return false;
        const age = daysBetween(p.startDate, today);
        const m = metrics[p.id];
        return m?.overdue || age > 60 || m?.isBlocked;
      }); break;
      case "overdue": list = filtered.filter(p => !shipPhases.includes(p.phase) && p.status !== "deprioritized" && metrics[p.id]?.overdue); break;
      case "shipped": list = filtered.filter(p => shipPhases.includes(p.phase)); break;
      case "deprioritized": list = filtered.filter(p => p.status === "deprioritized"); break;
      default: list = filtered;
    }
    return sortList(list, sortKey, sortDir, metrics, WEEK_LABELS, today);
  }, [filtered, activeTab, sortKey, sortDir, metrics, WEEK_LABELS, today]);

  // ── KPI summary (from filtered data) ──
  const summary = useMemo(() => {
    const active = filtered.filter(p => (p.status === "active" || p.status === "blocked") && !shipPhases.includes(p.phase));
    const shipped = filtered.filter(p => shipPhases.includes(p.phase));
    const depri = filtered.filter(p => p.status === "deprioritized");
    const blockedCount = active.filter(p => p.status === "blocked" || metrics[p.id]?.isBlocked).length;
    const totalCommits = filtered.reduce((s, p) => s + (metrics[p.id]?.totalCommits || 0), 0);
    const overdueCount = active.filter(p => metrics[p.id]?.overdue).length;
    const atRiskCount = active.filter(p => {
      const age = daysBetween(p.startDate, today);
      const m = metrics[p.id];
      return m?.overdue || age > 60 || m?.isBlocked;
    }).length;
    // Simple health: 100 base, -20 if overdue, -15 if blocked, -10 if age > 60
    const avgHealth = active.length > 0 ? Math.round(active.reduce((s, p) => {
      let h = 100;
      const m = metrics[p.id];
      if (m?.overdue) h -= 20;
      if (m?.isBlocked) h -= 15;
      const age = daysBetween(p.startDate, today);
      if (age > 60) h -= 10;
      else if (age > 30) h -= 5;
      return s + Math.max(0, h);
    }, 0) / active.length) : 0;
    return { active: active.length, shipped: shipped.length, depri: depri.length, all: filtered.length, blockedCount, totalCommits, avgHealth, atRiskCount, overdueCount };
  }, [filtered, metrics, today]);

  // ── Gantt-specific filter (separate from registry filters) ──
  const allSquads = useMemo(() => [...new Set(projects.map(p => p.squad).filter(Boolean))].sort(), [projects]);
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
    { key: "Escape", fn: () => { if (boardFullscreen) { setBoardFullscreen(false); } else if (ganttFullscreen) { if (document.activeElement === ganttSearchRef.current) { ganttSearchRef.current.blur(); } else { setGanttFullscreen(false); } } else if (selectedProject) goBackToList(); else if (search) { setSearch(""); setFocusIdx(0); localSearchRef.current?.blur(); setKbActive(false); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); setKbActive(false); } else if (kbActive) { setKbActive(false); } }, force: true },
    { key: "ArrowUp", fn: () => { if (!ganttFullscreen && !selectedProject) { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } }, force: true },
    { key: "ArrowDown", fn: () => { if (!ganttFullscreen && !selectedProject) { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.min(tabProjects.length - 1, i + 1)); } }, force: true },
    { key: "Enter", fn: () => { if (!ganttFullscreen && !selectedProject && kbActive && tabProjects[focusIdx]) openProject(tabProjects[focusIdx].id); }, force: true },
    { key: "/", fn: (e) => { e.preventDefault(); if (ganttFullscreen) { ganttSearchRef.current?.focus(); } else if (!selectedProject) { localSearchRef.current?.focus(); setSearchGlow(true); setKbActive(false); setTimeout(() => setSearchGlow(false), 1200); } } },
    { key: "f", fn: (e) => { if (ganttFullscreen && document.activeElement !== ganttSearchRef.current) { e.preventDefault(); ganttSearchRef.current?.focus(); } }, force: true },
  ], [selectedProject, goBackToList, tabProjects.length, focusIdx, kbActive, ganttFullscreen, boardFullscreen]);

  useEffect(() => {
    if (focusIdx >= tabProjects.length && tabProjects.length > 0) setFocusIdx(tabProjects.length - 1);
  }, [tabProjects.length, focusIdx]);

  const pc = getPhaseColors();
  const sc = statusColors();
  const tc = typeConfig();
  const ec = entityColors();

  // ═══════════════════════════════════════════════════════════
  // DETAIL STATE — Project Deep Dive
  // ═══════════════════════════════════════════════════════════
  if (selectedProject) {
    const proj = projects.find(p => p.id === selectedProject);
    if (!proj) return <EmptyState icon="🔍" title="Project not found" message="This project may have been removed." action="Back to overview" onAction={goBackToList} />;
    return <ProjectDeepDive proj={proj} metrics={metrics[proj.id]} history={history} commitments={commitments} projects={projects} setProjects={setProjects} people={people} onNavigate={onNavigate} goBack={goBackToList} pc={pc} sc={sc} tc={tc} ec={ec} weekLabels={WEEK_LABELS} isHistorical={isHistorical} today={today} />;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRY STATE — Pulse structural model
  // ═══════════════════════════════════════════════════════════

  const TABS = [
    { key: "active", label: "Active", count: summary.active, color: c.cyan },
    { key: "shipped", label: "Shipped", count: summary.shipped, color: c.green },
    { key: "deprioritized", label: "Deprioritized", count: summary.depri, color: c.orange },
    { key: "all", label: "All", count: summary.all, color: c.text },
  ];

  // ── Shared Th wrapper ──
  const Th = ({ col, children, style: s }) => (
    <SharedTh col={col} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
      style={s}>{children}</SharedTh>
  );

  return (
    <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: space[3] }}>

      {/* ═══════════════════════════════════════════════════════════
          Summary + tabs — scrolls with the page
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", flexDirection: "column", gap: space[3],
      }}>

        {/* SUMMARY STRIP — full-width grid */}
        <KPIBar>
            <SummaryTile
              value={summary.active} label="Active" color={c.cyan}
              active={activeTab === "active"}
              onClick={() => setActiveTab("active")}
            />
            <SummaryTile
              value={summary.atRiskCount} label="At Risk" color={summary.atRiskCount > 0 ? c.orange : c.textDim}
              active={activeTab === "at_risk"}
              onClick={() => setActiveTab(activeTab === "at_risk" ? "active" : "at_risk")}
            />
            <SummaryTile
              value={summary.overdueCount} label="Overdue" color={summary.overdueCount > 0 ? c.red : c.textDim}
              active={activeTab === "overdue"}
              onClick={() => setActiveTab(activeTab === "overdue" ? "active" : "overdue")}
            />
            <SummaryTile
              value={summary.shipped} label="Shipped" color={c.green}
              active={activeTab === "shipped"}
              onClick={() => setActiveTab("shipped")}
            />
            <SummaryTile
              value={summary.depri} label="Deprioritized" color={c.orange}
              active={activeTab === "deprioritized"}
              onClick={() => setActiveTab("deprioritized")}
            />
            <SummaryTile
              value={summary.all} label="All" color={c.text}
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            />
        </KPIBar>

        {/* SEARCH + VIEW TOGGLE on same row */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input ref={localSearchRef} value={search}
              onChange={e => { setSearch(e.target.value); setFocusIdx(0); }}
              onBlur={() => setSearchGlow(false)}
              placeholder="Search projects by name, ID, owner, or squad..."
              style={{
                width: "100%", padding: `${space[3]}px ${space[4]}px ${space[3]}px 38px`,
                borderRadius: layout.radiusMd,
                border: `1px solid ${searchGlow ? c.accent : c.border}`,
                background: c.surfaceAlt, color: c.text,
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                outline: "none", boxSizing: "border-box",
                boxShadow: searchGlow ? `0 0 0 3px ${c.accentDim}` : "none",
                transition: `border-color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}`,
              }} />
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", transition: "opacity 0.3s ease" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchGlow ? c.accent : c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
            {!search && <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
              color: c.textDim, lineHeight: 1,
              padding: `3px 7px 4px`, borderRadius: 4,
              background: `linear-gradient(180deg, ${c.surfaceAlt} 0%, ${c.bg} 100%)`,
              border: `1px solid ${c.border}`,
              boxShadow: `0 2px 0 ${c.border}, 0 2px 3px ${c.shadow}`,
              pointerEvents: "none",
            }}>/</span>}
          </div>
          <div style={{
            display: "flex", background: c.surfaceAlt, borderRadius: layout.radiusMd,
            border: `1px solid ${c.border}`, overflow: "hidden", flexShrink: 0,
            alignSelf: "stretch",
          }}>
            <button onClick={() => { setViewMode("registry"); setBoardFullscreen(false); setGanttFullscreen(false); }} style={{
              padding: `0 ${space[4]}px`, fontSize: typo.bodySm.size, fontWeight: 600,
              fontFamily: typo.bodySm.font, border: "none", cursor: "pointer",
              background: !boardFullscreen && !ganttFullscreen ? c.accent : "transparent",
              color: !boardFullscreen && !ganttFullscreen ? "#fff" : c.textDim,
              transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              letterSpacing: typo.bodySm.tracking,
            }}>Table</button>
            <button onClick={() => setBoardFullscreen(true)} style={{
              padding: `0 ${space[4]}px`, fontSize: typo.bodySm.size, fontWeight: 600,
              fontFamily: typo.bodySm.font, border: "none", cursor: "pointer",
              background: boardFullscreen ? c.accent : "transparent",
              color: boardFullscreen ? "#fff" : c.textDim,
              transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              letterSpacing: typo.bodySm.tracking, outline: "none",
            }}>Board</button>
            <button onClick={() => setGanttFullscreen(true)} style={{
              padding: `0 ${space[4]}px`, fontSize: typo.bodySm.size, fontWeight: 600,
              fontFamily: typo.bodySm.font, border: "none", cursor: "pointer",
              background: ganttFullscreen ? c.accent : "transparent",
              color: ganttFullscreen ? "#fff" : c.textDim,
              transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              letterSpacing: typo.bodySm.tracking, outline: "none",
            }}>Gantt</button>
          </div>
        </div>
      </div>
      {/* end frozen top */}

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 1 }}>
      {tabProjects.length === 0 ? (
        <EmptyState icon="📂" title="No projects" message={search ? "No projects match your search." : `No ${activeTab === "all" ? "" : ({ at_risk: "at risk", active: "active", shipped: "shipped", deprioritized: "deprioritized", overdue: "overdue" }[activeTab] || activeTab) + " "}projects found.`}
          action={search ? "Clear search" : (!isHistorical ? "Add project" : null)} onAction={() => { if (search) setSearch(""); else setShowCreate(true); }} />
      ) : (
        <Surface variant="data" compact style={{ padding: 0 }}>
          <div style={{ borderRadius: layout.radius }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <Th col="squad" style={{ position: "sticky", left: 0, top: "var(--flow-sticky-top, 0px)", background: c.tableHeader || c.surfaceAlt, zIndex: 3, minWidth: colWidths.squad.min }}>Squad</Th>
                  <Th col="project" style={{ minWidth: colWidths.identity.min, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                  <Th col="owner" style={{ minWidth: colWidths.owner.min, borderLeft: `1px dotted ${c.border}` }}>Owner</Th>
                  {activeTab === "all" && <Th col="status" style={{ minWidth: colWidths.status.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Status</Th>}
                  {activeTab !== "shipped" && <Th col="phase" style={{ minWidth: colWidths.phase.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Phase</Th>}
                  <Th col="total" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Commits</Th>
                  {activeTab !== "shipped" && activeTab !== "deprioritized" && <Th col="thisWk" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>{isHistorical ? selectedWeekKey : "This Wk"}</Th>}
                  {activeTab !== "deprioritized" && <Th col="people" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>People</Th>}
                  {activeTab === "shipped" && <>
                    <Th col="planStart" style={{ minWidth: colWidths.date.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Plan Start</Th>
                    <Th col="actualStart" style={{ minWidth: colWidths.date.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Actual Start</Th>
                    <Th col="planDays" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Plan Days</Th>
                    <Th col="actualDays" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Actual Days</Th>
                  </>}
                  {activeTab !== "shipped" && activeTab !== "deprioritized" && <Th col="last" style={{ minWidth: colWidths.date.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Last Active</Th>}
                  {activeTab !== "shipped" && activeTab !== "deprioritized" && <Th col="timeline" style={{ minWidth: colWidths.timeline.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Timeline</Th>}
                  {activeTab === "deprioritized" && <Th col="reason" style={{ minWidth: 200, borderLeft: `1px dotted ${c.border}` }}>Reason</Th>}
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
                  const isDimmed = activeTab === "all" && (shipPhases.includes(proj.phase) || proj.status === "deprioritized");

                  return (
                    <tr key={proj.id}
                      className={`flow-row${isFocused ? " flow-kb-focus" : ""}`}
                      onMouseEnter={() => setHoveredProject(proj.id)}
                      onMouseLeave={() => setHoveredProject(null)}
                      onClick={() => openProject(proj.id)}
                      style={{
                        cursor: "pointer",
                        background: isFocused ? `${c.accent}08` : isHovered ? c.surfaceAlt : "transparent",
                        opacity: isDimmed ? 0.65 : 1,
                        transition: `background ${motion.interaction.duration}`,
                        animation: `rowSlideIn ${motion.interaction.duration} ${motion.interaction.easing} both`,
                        animationDelay: `${Math.min(fi * 30, 600)}ms`,
                      }}
                    >
                      {/* Squad — sticky left (Pulse pattern) */}
                      <td style={{
                        padding: `${space[2]}px ${space[3]}px`,
                        fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                        fontWeight: 600, color: c.textMid,
                        borderBottom: `1px dotted ${c.border}`,
                        position: "sticky", left: 0, background: c.bg, zIndex: 1,
                      }}>{proj.squad}</td>

                      {/* Project — ID + Name compound (Pulse pattern) */}
                      <td style={{
                        padding: `${space[2]}px ${space[3]}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                          <span style={{
                            fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                            fontWeight: 700, color: ec.project, flexShrink: 0,
                          }}>{proj.id}</span>
                          <span style={{
                            fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                            fontWeight: 600, color: c.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            transition: `color ${motion.interaction.duration}`,
                          }}>{proj.name}</span>
                          {m.isBlocked && <Badge color={c.red} bg={c.redDim} style={{ flexShrink: 0 }}>!</Badge>}
                          {shipPhases.includes(proj.phase) && <span style={{ fontSize: 12, flexShrink: 0 }} title={proj.phase}>🚀</span>}
                        </div>
                      </td>

                      {/* Owner */}
                      <td style={{
                        padding: `${space[2]}px ${space[3]}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                        fontWeight: 500, color: proj.owner ? c.textMid : c.red,
                        whiteSpace: "nowrap",
                      }}>{proj.owner || "—"}</td>

                      {/* Status — only in "All" tab */}
                      {activeTab === "all" && <td style={{
                        padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <Badge color={sCfg.color} bg={sCfg.bg}>{sCfg.label}</Badge>
                      </td>}

                      {/* Phase — hidden in Completed tab */}
                      {activeTab !== "shipped" && <td style={{
                        padding: `${space[2]}px ${space[3]}px`,
                        textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <Badge color={pc[proj.phase] || c.textDim} bg={`${pc[proj.phase] || c.textDim}18`}>{proj.phase}</Badge>
                      </td>}

                      {/* Total commits */}
                      <td style={{
                        padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                        color: m.totalCommits > 0 ? c.text : c.textDim, fontWeight: 600,
                      }}>{m.totalCommits || "—"}</td>

                      {/* This week — hidden in Completed and Deprioritized tabs */}
                      {activeTab !== "shipped" && activeTab !== "deprioritized" && <td style={{
                        padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                        color: m.thisWeekTotal > 0 ? c.cyan : c.textDim,
                      }}>{m.thisWeekTotal || "—"}</td>}

                      {/* People — hidden in Deprioritized tab */}
                      {activeTab !== "deprioritized" && <td style={{
                        padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                        color: m.peopleList?.length > 0 ? c.text : c.textDim,
                      }}>{m.peopleList?.length || "—"}</td>}

                      {/* Completed tab — plan/actual columns */}
                      {activeTab === "shipped" && <>
                        <td style={{
                          padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.textMid,
                        }}>{fmtDate(proj.startDate)}</td>
                        <td style={{
                          padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.textMid,
                        }}>{fmtDate(proj.actualStartDate)}</td>
                        <td style={{
                          padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.text, fontWeight: 600,
                        }}>{allocated}</td>
                        {(() => {
                          const actualDays = proj.actualStartDate && proj.actualEndDate ? daysBetween(proj.actualStartDate, proj.actualEndDate) : 0;
                          const overPlan = actualDays > allocated;
                          return <td style={{
                            padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                            borderBottom: `1px dotted ${c.border}`,
                            borderLeft: `1px dotted ${c.border}`,
                            fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: 600,
                            color: overPlan ? c.orange : c.green,
                          }}>{actualDays}</td>;
                        })()}
                      </>}

                      {/* Last activity — hidden in Completed and Deprioritized tabs */}
                      {activeTab !== "shipped" && activeTab !== "deprioritized" && <td style={{
                        padding: `${space[2]}px ${space[3]}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                        color: m.lastActivity === "This wk" ? c.cyan : m.lastActivity ? c.textMid : c.textDim,
                        fontWeight: m.lastActivity === "This wk" ? 700 : 500,
                      }}>{m.lastActivity || "—"}</td>}

                      {/* Timeline — hidden in Completed and Deprioritized tabs */}
                      {activeTab !== "shipped" && activeTab !== "deprioritized" && <td style={{
                        padding: `${space[2]}px ${space[3]}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
                              background: m.overdue ? c.red : pct > 85 ? c.orange : c.green,
                            }} />
                          </div>
                        </div>
                      </td>}

                      {/* Reason — Deprioritized tab only */}
                      {activeTab === "deprioritized" && <td style={{
                        padding: `${space[2]}px ${space[3]}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                        color: proj.depriReason ? c.textMid : c.textDim,
                        maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }} title={proj.depriReason || ""}>{proj.depriReason || "—"}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
      <div style={{ flexShrink: 0, height: space[8] }} />
      </div>

      {/* FAB — Add Project (hidden in historical mode) */}
      {!isHistorical && <button onClick={() => setShowCreate(true)} aria-label="Add project" style={{
        position: "fixed", bottom: space[7], right: space[7], zIndex: 50,
        padding: `${space[3]}px ${space[5]}px`, borderRadius: layout.radiusMd,
        border: "none", cursor: "pointer",
        background: c.orange, color: c.bg,
        fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: space[1],
        boxShadow: `0 4px 16px ${c.orange}40, 0 2px 4px ${c.shadow}`,
        transition: `transform ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration}`,
      }}>Add</button>}

      {/* Create Project Overlay */}
      {showCreate && <CreateProjectOverlay
        projects={projects} people={people} setProjects={setProjects}
        onClose={() => setShowCreate(false)}
      />}

      {/* ═══════════════════════════════════════════════════════════
          GANTT FULLSCREEN OVERLAY
          ═══════════════════════════════════════════════════════════ */}
      {ganttFullscreen && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: c.bg, display: "flex", flexDirection: "column",
          animation: "ganttFadeIn 0.25s ease-out both",
        }}>
          {/* Top bar */}
          <div style={{
            height: 56, flexShrink: 0, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: `0 ${space[5]}px`,
            borderBottom: `1px solid ${c.border}`, background: c.bg,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <FlowLogo size={28} />
              <span style={{ fontSize: typo.bodyLg.size, fontWeight: 700, color: c.text, letterSpacing: "-0.3px" }}>Flow</span>
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
                  <button onClick={() => { setGanttSearch(""); setGanttSquads([]); setGanttOwners([]); setGanttPhases([]); }} style={{
                    padding: `3px ${space[2]}px`, borderRadius: layout.radiusSm, border: "none",
                    background: `${c.red}20`, color: c.red,
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, cursor: "pointer",
                  }}>Clear</button>
                )}
              </div>

              {/* Close button */}
              <button onClick={() => setGanttFullscreen(false)} aria-label="Close Gantt view" style={{
                width: 44, height: 44, borderRadius: layout.radiusSm,
                border: `1px solid ${c.border}`, background: c.surfaceAlt,
                color: c.textDim, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: `all ${motion.interaction.duration}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.red; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = c.red; }}
              onMouseLeave={e => { e.currentTarget.style.background = c.surfaceAlt; e.currentTarget.style.color = c.textDim; e.currentTarget.style.borderColor = c.border; }}
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

          <style>{`
            @keyframes ganttFadeIn {
              from { opacity: 0; transform: scale(0.98); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════
          BOARD FULLSCREEN OVERLAY
          ═══════════════════════════════════════════════════════════ */}
      {boardFullscreen && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: c.bg, display: "flex", flexDirection: "column",
          animation: "ganttFadeIn 0.25s ease-out both",
        }}>
          {/* Top bar */}
          <div style={{
            height: 56, flexShrink: 0, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: `0 ${space[5]}px`,
            borderBottom: `1px solid ${c.border}`, background: c.bg,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <FlowLogo size={28} />
              <span style={{ fontSize: typo.bodyLg.size, fontWeight: 700, color: c.text, letterSpacing: "-0.3px" }}>Flow</span>
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
                  <button onClick={() => { setBoardSearch(""); setBoardSquads([]); setBoardOwners([]); setBoardPhases([]); }} style={{
                    padding: `3px ${space[2]}px`, borderRadius: layout.radiusSm, border: "none",
                    background: `${c.red}20`, color: c.red,
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, cursor: "pointer",
                  }}>Clear</button>
                )}
              </div>

              {/* Close button */}
              <button onClick={() => setBoardFullscreen(false)} aria-label="Close Board view" style={{
                width: 44, height: 44, borderRadius: layout.radiusSm,
                border: `1px solid ${c.border}`, background: c.surfaceAlt,
                color: c.textDim, fontSize: 18, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: `all ${motion.interaction.duration}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.red; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = c.red; }}
              onMouseLeave={e => { e.currentTarget.style.background = c.surfaceAlt; e.currentTarget.style.color = c.textDim; e.currentTarget.style.borderColor = c.border; }}
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
                  minWidth: columns.length * 220, height: "100%",
                }}>
                  {columns.map(phase => {
                    const phColor = pc[phase] || c.textDim;
                    const cards = columnProjects[phase] || [];
                    return (
                      <div key={phase} style={{
                        flex: 1, minWidth: 200, display: "flex", flexDirection: "column",
                        borderRadius: layout.radiusMd,
                        background: `${phColor}04`,
                        border: `1px solid ${phColor}15`,
                      }}>
                        {/* Column header */}
                        <div style={{
                          padding: `${space[3]}px ${space[4]}px`,
                          borderBottom: `2px solid ${phColor}25`,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: phColor }} />
                            <span style={{
                              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                              fontWeight: 700, letterSpacing: "0.06em",
                              color: phColor, textTransform: "uppercase",
                            }}>{phase}</span>
                          </div>
                          <span style={{
                            fontFamily: typo.monoSm.font, fontSize: 11,
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
                              color: c.textDim, opacity: 0.4,
                            }}>No projects</div>
                          )}
                          {cards.map(proj => {
                            const m = metrics[proj.id] || {};
                            const health = m.health ?? 0;
                            const hColor = health >= 70 ? c.green : health >= 40 ? c.orange : c.red;
                            return (
                              <div
                                key={proj.id}
                                onClick={() => { setBoardFullscreen(false); openProject(proj.id); }}
                                className="flow-row"
                                style={{
                                  padding: `${space[4]}px`,
                                  borderRadius: layout.radiusMd,
                                  background: c.surface,
                                  border: `1px solid ${c.border}`,
                                  cursor: "pointer",
                                  display: "flex", flexDirection: "column", gap: space[2],
                                  transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                                }}
                              >
                                {/* ID + health bar */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{
                                    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                                    fontWeight: 700, letterSpacing: typo.monoMd.tracking,
                                    color: ec.project,
                                  }}>{proj.id}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <div style={{
                                      width: 24, height: 4, borderRadius: 2, background: c.surfaceAlt, overflow: "hidden",
                                    }}>
                                      <div style={{ width: `${health}%`, height: "100%", borderRadius: 2, background: hColor }} />
                                    </div>
                                    <span style={{
                                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                                      fontWeight: 700, color: hColor,
                                    }}>{health}</span>
                                  </div>
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
                                  <span style={{ opacity: 0.3 }}>·</span>
                                  <span>{proj.squad}</span>
                                </div>

                                {/* Commits this week */}
                                <span style={{
                                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                                  fontWeight: 500,
                                  color: (m.thisWeekTotal || 0) > 0 ? c.cyan : c.textDim,
                                }}>{(m.thisWeekTotal || 0)} {(m.thisWeekTotal || 0) === 1 ? "Commit" : "Commits"} this week</span>
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
function CreateProjectOverlay({ projects, people, setProjects, onClose }) {
  useDevLabel('CreateProjectOverlay', 'src/views/ProjectsView.jsx', 'Modal overlay form for creating new projects with all field inputs');
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [squad, setSquad] = useState("");
  const [phase, setPhase] = useState("PRD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();
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

  const monoLabel = { fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600, color: c.textDim, marginBottom: space[1] };

  return (
    <Modal open onClose={onClose} blur={8} width={520} style={{
      padding: 0, border: "none", borderRadius: 0, background: "transparent", boxShadow: "none",
    }}>
      <div data-suppress-shortcuts className="flow-terminal-log" style={{
        width: "100%", opacity: 1,
        animation: `rowSlideIn 0.3s ${motion.critical.easing} both`,
      }}>
        {/* Terminal header bar */}
        <div className="flow-terminal-header" style={{ padding: `${space[2]}px ${space[4]}px` }}>
          <div className="flow-terminal-dot" style={{ background: c.red }} />
          <div className="flow-terminal-dot" style={{ background: c.orange }} />
          <div className="flow-terminal-dot" style={{ background: c.green }} />
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoLg.size, fontWeight: 600, color: c.textMid, marginLeft: space[2] }}>
            create@flow
          </span>
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.orange, marginLeft: "auto" }}>
            {previewId}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: `${space[5]}px ${space[5]}px ${space[6]}px` }}>
          {/* Command prompt */}
          <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, marginBottom: space[1] }}>
            $ flow create --project
          </div>
          <div style={{ fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight, color: c.orange, marginBottom: space[5] }}>
            Initialize new project
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            {/* Name */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={monoLabel}>--name</div>
                <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: name.length > 35 ? c.red : c.textDim }}>{name.length}/35</span>
              </div>
              <Inp value={name} onChange={e => { if (e.target.value.length <= 35) setName(e.target.value); }} placeholder="e.g. Checkout Redesign" style={{ width: "100%", fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size }} autoFocus maxLength={35} />
            </div>

            {/* Owner + Squad */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3] }}>
              <div>
                <div style={monoLabel}>--owner</div>
                <SearchSelect value={owner} onChange={setOwner} options={allOwners} placeholder="Search people..." />
              </div>
              <div>
                <div style={monoLabel}>--squad</div>
                <SearchSelect value={squad} onChange={setSquad} options={allSquads} placeholder="Search squads..." />
              </div>
            </div>

            {/* Phase */}
            <div>
              <div style={monoLabel}>--phase</div>
              <Sel value={phase} onChange={e => setPhase(e.target.value)} style={{ width: "100%" }}>
                {allPhases.map(p => <option key={p} value={p}>{p}</option>)}
              </Sel>
            </div>

            {/* Duration — start → end inline */}
            <div>
              <div style={monoLabel}>--duration</div>
              <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim, flexShrink: 0 }}>→</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              </div>
              {startDate && endDate && endDate <= startDate && (
                <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red, marginTop: space[1] }}>End date must be after start date</div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: space[2], marginTop: space[3] }}>
              <Btn variant="secondary" size="sm" onClick={onClose}>Abort</Btn>
              <button onClick={handleCreate} disabled={!canSave || saving} style={{
                padding: `${space[2]}px ${space[5]}px`, borderRadius: layout.radiusMd,
                border: "none", cursor: canSave && !saving ? "pointer" : "default",
                background: canSave && !saving ? c.green : c.surfaceAlt,
                color: canSave && !saving ? c.bg : c.textDim,
                fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700,
                opacity: canSave && !saving ? 1 : 0.5,
                boxShadow: canSave && !saving ? `0 2px 8px ${c.green}30` : "none",
                transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              }}>{saving ? "Creating..." : "Execute"}</button>
            </div>
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
function ProjectDeepDive({ proj, metrics: m, history, commitments, projects, setProjects, people, onNavigate, goBack, pc, sc, tc, ec, weekLabels: WEEK_LABELS, isHistorical, today }) {
  useDevLabel('ProjectDeepDive', 'src/views/ProjectsView.jsx', 'Full project detail view with hero telemetry, timeline, and history');
  const [editing, setEditingRaw] = useState(false);
  const [editOwner, setEditOwner] = useState(proj.owner);
  const [editSquad, setEditSquad] = useState(proj.squad);
  const [editPhase, setEditPhase] = useState(proj.phase);
  const [editStatus, setEditStatus] = useState(proj.status || "active");
  // Reset edit state from fresh proj data when entering edit mode
  const setEditing = useCallback((val) => {
    if (val) {
      setEditOwner(proj.owner); setEditSquad(proj.squad);
      setEditPhase(proj.phase); setEditStatus(proj.status || "active");
    }
    setEditingRaw(val);
  }, [proj.owner, proj.squad, proj.phase, proj.status]);
  const [depriReasonModal, setDepriReasonModal] = useState(false);
  const [depriReasonText, setDepriReasonText] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteDeps, setDeleteDeps] = useState(null); // { commitmentCount, peopleNames }
  const [deleting, setDeleting] = useState(false);

  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();
  const allOwners = people ? people.map(p => p.name).sort() : [...new Set(projects.map(p => p.owner).filter(Boolean))].sort();

  const doSave = (overrides = {}) => {
    const finalStatus = overrides.status ?? editStatus;
    const finalReason = overrides.depriReason !== undefined ? overrides.depriReason : proj.depriReason;
    // Sync toast is triggered by useSyncedSetters onSyncDone callback — no fake timer
    setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, owner: editOwner, squad: editSquad, phase: editPhase, status: finalStatus, depriReason: finalReason } : p));
    setEditing(false);
  };

  const saveEdits = () => {
    // If status is changing to deprioritized, prompt for reason
    if (editStatus === "deprioritized" && proj.status !== "deprioritized") {
      setDepriReasonText("");
      setDepriReasonModal(true);
      return;
    }
    // If reactivating, clear reason
    if (editStatus === "active" && proj.status === "deprioritized") {
      doSave({ depriReason: null });
      return;
    }
    doSave();
  };
  const cancelEdits = () => {
    setEditOwner(proj.owner); setEditSquad(proj.squad); setEditPhase(proj.phase); setEditStatus(proj.status || "active");
    setEditing(false);
  };

  // ── Delete flow ──
  const handleDeleteClick = async () => {
    const deps = await getProjectDependencies(proj.id);
    setDeleteDeps(deps);
    setDeleteModal(true);
  };
  const confirmDelete = async () => {
    setDeleting(true);
    const ok = await deleteProjectFromDB(proj.id);
    if (ok) {
      setProjects(prev => prev.filter(p => p.id !== proj.id));
      setDeleteModal(false);
      goBack();
    } else {
      setDeleting(false);
    }
  };

  const sCfg = sc[editStatus] || sc[proj.status] || sc.active;
  const allocated = daysBetween(proj.startDate, proj.endDate);
  const elapsed = Math.max(0, Math.min(daysBetween(proj.startDate, today), allocated));

  // Build full weekly matrix for phase timeline
  const weekPhaseMatrix = useMemo(() => {
    const allWeeks = WEEK_LABELS;
    const matrix = {};
    for (const w of allWeeks) {
      matrix[w] = {};
      for (const ph of [...phaseNames, ...shipPhases]) matrix[w][ph] = [];
    }
    const projHist = history[proj.id] || [];
    for (const wk of projHist) {
      if (matrix[wk.week]) {
        for (const e of wk.entries) {
          const stage = e.stage || "PRD";
          if (matrix[wk.week][stage]) matrix[wk.week][stage].push(e);
        }
      }
    }
    commitments.forEach(cm => {
      cm.items.forEach((it, idx) => {
        if (cm.deselected !== idx && it.project === proj.id) {
          const stage = it.stage || "PRD";
          if (matrix["This wk"]?.[stage]) matrix["This wk"][stage].push({ ...it, person: cm.person });
        }
      });
    });
    return matrix;
  }, [proj.id, history, commitments]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>

      {/* ═══ HERO — Telemetry Panel ═══ */}
      <div className="flow-telemetry-panel" style={{ padding: `${space[6]}px ${space[7]}px` }}>
        {/* ── Row 1: Identity ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
          <div style={{ flex: 1 }}>
            {!editing ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: space[3], marginBottom: space[1] + 2 }}>
                  <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.displaySm.size, fontWeight: 700, letterSpacing: typo.monoLg.tracking, color: ec.project }}>{proj.id}</span>
                  <span style={{ fontFamily: typo.displayXl.font, fontSize: typo.displayXl.size, fontWeight: typo.displayXl.weight, color: c.text, letterSpacing: typo.displayXl.tracking, lineHeight: 1.15 }}>{proj.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: space[2], marginTop: space[2] }}>
                  <span style={{ fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size, fontWeight: typo.bodyLg.weight, color: proj.owner ? c.textMid : c.red }}>{proj.owner || "Unassigned"}</span>
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>·</span>
                  <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.cyan }}>{proj.squad}</span>
                </div>
              </>
            ) : (
              <div data-suppress-shortcuts style={{ display: "flex", flexDirection: "column", gap: space[3], position: "relative", zIndex: 60 }}>
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
                <div style={{ display: "flex", gap: space[2] }}>
                  <Btn variant="command" size="sm" onClick={saveEdits} style={{ borderColor: c.green + "60", color: c.green }}>Save</Btn>
                  <Btn variant="secondary" size="sm" onClick={cancelEdits}>Cancel</Btn>
                </div>
              </div>
            )}
          </div>

          {!editing && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <Badge color={sCfg.color} bg={`${sCfg.color}15`} style={{ fontSize: 14, fontWeight: 800, padding: `5px ${space[4]}px`, letterSpacing: "0.06em" }}>{proj.phase}</Badge>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 500, color: c.textDim, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 4 }}>Phase</div>
            </div>
          )}
        </div>

        {/* ── Row 2: Timeline (left) + Activity (right) ── */}
        {(() => {
          const remaining = proj.endDate ? Math.ceil((new Date(proj.endDate) - new Date(today)) / 86400000) : null;
          const pct = allocated > 0 ? Math.min(100, Math.round((elapsed / allocated) * 100)) : 0;
          const overdue = remaining != null && remaining < 0;
          const ageColor = elapsed > 60 ? c.red : elapsed > 30 ? c.orange : c.cyan;
          const remColor = remaining != null ? (remaining < 0 ? c.red : remaining < 7 ? c.orange : c.green) : c.textDim;
          const barColor = overdue ? c.red : pct > 75 ? c.orange : c.cyan;
          const fmtShort = (d) => { if (!d) return "—"; const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
          const healthVal = m.health != null ? m.health : 0;
          const healthColor = healthVal >= 70 ? c.green : healthVal >= 40 ? c.orange : c.red;

          return (
            <div style={{ borderTop: `1px solid ${c.border}`, marginTop: space[4], paddingTop: space[4], display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: space[5], position: "relative", zIndex: 1 }}>
              {/* Left: Timeline */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                <div style={{ display: "flex", gap: space[2] }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${space[2] + 2}px ${space[3]}px`, background: `${ageColor}10`, borderRadius: layout.radiusMd, border: `1px solid ${ageColor}20` }}>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim }}>Age</span>
                    <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.bodyLg.size, fontWeight: 700, color: ageColor }}>{elapsed}d</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${space[2] + 2}px ${space[3]}px`, background: `${remColor}10`, borderRadius: layout.radiusMd, border: `1px solid ${remColor}20` }}>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim }}>Remaining</span>
                    <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.bodyLg.size, fontWeight: 700, color: remColor }}>{remaining != null ? `${remaining}d` : "—"}</span>
                  </div>
                </div>
                <div>
                  <div style={{ position: "relative", height: 6, borderRadius: 3, background: c.border, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(pct, 100)}%`, borderRadius: 3, background: barColor, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: space[2] }}>
                    <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.text }}>{fmtShort(proj.startDate)}</span>
                    <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.text }}>{fmtShort(proj.endDate)}</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ background: c.border }} />

              {/* Right: Activity */}
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[3], alignContent: "center", height: "100%" }}>
                  {[
                    { label: "Total Commits", value: m.totalCommits, color: c.text },
                    { label: "Health", value: healthVal, color: healthColor },
                    { label: "Contributors", value: m.peopleList?.length || 0, color: c.text },
                    { label: "Last Active", value: m.lastActivity || "—", color: m.lastActivity === "This wk" ? c.cyan : c.textMid },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight, letterSpacing: typo.displayLg.tracking, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, marginTop: 3 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ═══ WEEKLY COMMITS — roadmap lane ═══ */}
      <Surface compact>
        <Label>Weekly Commits</Label>
        <div style={{ overflowX: "auto" }}>
          {/* Week headers */}
          <div style={{ display: "grid", gridTemplateColumns: `80px repeat(${WEEK_LABELS.length}, 1fr)`, gap: 2, marginBottom: space[1] }}>
            <span />
            {WEEK_LABELS.map(w => (
              <span key={w} style={{
                fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                color: w === "This wk" ? c.cyan : c.textDim, textAlign: "center",
                fontWeight: w === "This wk" ? 700 : 500,
              }}>{w}</span>
            ))}
          </div>
          {/* Phase rows (all phases including ship) */}
          {[...phaseNames, ...shipPhases].map(phase => {
            const color = pc[phase] || c.textDim;
            return (
              <div key={phase} style={{
                display: "grid", gridTemplateColumns: `80px repeat(${WEEK_LABELS.length}, 1fr)`,
                gap: 2, marginBottom: 4,
              }}>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color, display: "flex", alignItems: "center" }}>{phase}</span>
                {WEEK_LABELS.map(w => {
                  const entries = weekPhaseMatrix[w]?.[phase] || [];
                  const hasActivity = entries.length > 0;
                  return (
                    <div key={w} style={{
                      height: 30, borderRadius: 3,
                      background: hasActivity ? `${color}25` : `${c.border}20`,
                      borderLeft: hasActivity ? `3px solid ${color}` : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {hasActivity && (
                        <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color, fontWeight: 700 }}>{entries.length}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Surface>

      {/* ═══ ACTIVITY TIMELINE — Terminal Log ═══ */}
      <div className="flow-terminal-log">
        <div className="flow-terminal-header">
          <div className="flow-terminal-dot" style={{ background: c.red }} />
          <div className="flow-terminal-dot" style={{ background: c.orange }} />
          <div className="flow-terminal-dot" style={{ background: c.green }} />
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoLg.size, fontWeight: 600, color: c.textMid, marginLeft: space[2] }}>
            Activity Timeline
          </span>
        </div>
        <div style={{ padding: `${space[2]}px 0`, maxHeight: 500, overflowY: "auto" }}>
          {m.weeklyData.length === 0 ? (
            <div style={{ padding: `${space[5]}px ${space[4]}px`, textAlign: "center", fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.textDim }}>
              $ no activity logged<span className="flow-terminal-cursor" />
            </div>
          ) : (
            [...m.weeklyData].reverse().map((wk, wi) => {
              // Only show entries that have a valid stage matching the heatmap phases
              const validEntries = wk.entries.filter(e => {
                const stage = e.stage || "";
                return stage && [...phaseNames, ...shipPhases].includes(stage);
              });
              if (validEntries.length === 0 && !wk.isCurrent) return null;
              const entriesToShow = wk.isCurrent ? wk.entries : validEntries;
              return (
              <React.Fragment key={wi}>
                {/* Week separator */}
                <div style={{ padding: `${space[2]}px ${space[4]}px ${space[1]}px`, display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{
                    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                    fontWeight: 700, color: wk.isCurrent ? c.accent : c.textDim,
                  }}>
                    {wk.isCurrent ? "▸ THIS WEEK" : `▸ ${wk.week.toUpperCase()}`}
                  </span>
                  <div style={{ flex: 1, height: 1, background: wk.isCurrent ? `${c.accent}30` : c.border }} />
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>{entriesToShow.length}</span>
                </div>
                {entriesToShow.map((entry, ei) => (
                  <div key={`${wi}-${ei}`} style={{
                    display: "grid",
                    gridTemplateColumns: "52px 1fr 90px 52px 64px",
                    alignItems: "center",
                    gap: space[2],
                    padding: `${space[1] + 2}px ${space[4]}px`,
                    borderBottom: `1px solid ${c.border}`,
                    opacity: wk.isCurrent ? 1 : 0.8,
                    animationDelay: `${(wi * 3 + ei) * 0.04}s`,
                  }}>
                    {/* Stage */}
                    <Tag color={pc[entry.stage] || c.textDim} bg={(pc[entry.stage] || c.textDim) + "12"} style={{ textAlign: "center", justifySelf: "start" }}>{entry.stage || "—"}</Tag>
                    {/* Task */}
                    <span style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      color: wk.isCurrent ? c.text : c.textMid,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {entry.task || entry.title || "—"}
                    </span>
                    {/* Person */}
                    <span onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate("people", entry.person); }}
                      style={{
                        fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                        fontWeight: typo.monoLg.weight, color: c.cyan, cursor: "pointer",
                        textAlign: "right",
                      }}>
                      {entry.person}
                    </span>
                    {/* Type */}
                    <Tag color={tc[entry.type]?.color} bg={tc[entry.type]?.bg} style={{ textAlign: "center", justifySelf: "center" }}>{tc[entry.type]?.label || entry.type}</Tag>
                    {/* Outcome */}
                    {entry.outcome ? (() => { const oc = outcomeConfig(); const cfg = oc[entry.outcome]; return cfg ? (
                      <span style={{
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700,
                        color: cfg.color, background: cfg.bg,
                        padding: "1px 6px", borderRadius: 4,
                        letterSpacing: "0.04em", textAlign: "center", justifySelf: "center",
                      }}>
                        {cfg.icon} {entry.outcome.toUpperCase()}
                      </span>
                    ) : null; })() : (
                      <span />
                    )}
                  </div>
                ))}
              </React.Fragment>
              );
            })
          )}
          {m.weeklyData.length > 0 && (
            <div style={{ padding: `${space[2]}px ${space[4]}px`, display: "flex", alignItems: "center", gap: space[1] + 2 }}>
              <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.accent }}>$</span>
              <span className="flow-terminal-cursor" />
            </div>
          )}
        </div>
      </div>

      {/* ═══ PEOPLE INVOLVED ═══ */}
      {m.peopleList?.length > 0 && (
        <Surface compact>
          <Label>People Involved</Label>
          <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
            {m.peopleList.map(name => (
              <span key={name} onClick={() => onNavigate && onNavigate("people", name)} style={{
                fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                fontWeight: 500, color: c.cyan, cursor: "pointer",
                padding: `3px ${space[2]}px`,
                background: c.cyanDim, borderRadius: layout.radiusPill,
              }}>{name}</span>
            ))}
          </div>
        </Surface>
      )}


      {/* ═══ FLOATING ACTION BUTTONS (hidden in historical mode) ═══ */}
      {!editing && !isHistorical && (
        <div style={{ position: "fixed", bottom: space[7], right: space[7], zIndex: 50, display: "flex", gap: space[2], alignItems: "center" }}>
          <button onClick={handleDeleteClick} className="flow-btn" style={{
            padding: `${space[2]}px ${space[3]}px`, borderRadius: layout.radiusMd,
            border: `1px solid ${c.red}30`, cursor: "pointer",
            background: `${c.red}10`, color: c.red,
            fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: space[1],
            transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            Delete
          </button>
          <button onClick={() => setEditing(true)} className="flow-btn" style={{
            padding: `${space[2]}px ${space[4]}px`, borderRadius: layout.radiusMd,
            border: "none", cursor: "pointer",
            background: c.orange, color: c.bg,
            fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: space[1],
            boxShadow: `0 4px 16px ${c.orange}40, 0 2px 4px ${c.shadow}`,
            transition: `transform ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration}`,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        </div>
      )}

      {/* ═══ DEPRIORITIZATION REASON MODAL ═══ */}
      <Modal open={!!depriReasonModal} onClose={() => setDepriReasonModal(false)} title="Why is this being deprioritized?" accent={c.orange}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          Provide context so your team understands why <strong style={{ color: c.text }}>{proj.name}</strong> is being deprioritized.
        </div>
        <div style={{ marginBottom: space[3] }}>
          <TelemetryLabel color={c.orange} style={{ marginBottom: space[1] }}>Reason</TelemetryLabel>
          <textarea
            data-autofocus
            value={depriReasonText}
            onChange={e => setDepriReasonText(e.target.value)}
            placeholder="e.g. Redirecting team to higher-priority work..."
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
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setDepriReasonModal(false)}>Cancel</Btn>
          <Btn variant="secondary" style={{ borderColor: c.orange + "40", color: c.orange }}
            disabled={!depriReasonText.trim()}
            onClick={() => {
              doSave({ status: "deprioritized", depriReason: depriReasonText.trim() });
              setDepriReasonModal(false);
            }}>
            Deprioritize
          </Btn>
        </div>
      </Modal>

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      <Modal open={deleteModal} onClose={() => { if (!deleting) setDeleteModal(false); }} title="Delete project?" accent={c.red} width={480}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.6, marginBottom: space[4] }}>
          This will permanently delete <strong style={{ color: c.text }}>{proj.id} — {proj.name}</strong> and all its history data.
        </div>
        {deleteDeps && deleteDeps.commitmentCount > 0 && (
          <div style={{
            padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusSm,
            background: `${c.red}08`, border: `1px solid ${c.red}20`, marginBottom: space[4],
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
            background: `${c.green}08`, border: `1px solid ${c.green}20`, marginBottom: space[4],
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid,
          }}>
            No active commitments reference this project. Safe to delete.
          </div>
        )}
        {!deleteDeps && (
          <div style={{ padding: space[4], textAlign: "center", color: c.textDim, fontSize: typo.bodyMd.size }}>
            Checking dependencies...
          </div>
        )}
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" onClick={() => setDeleteModal(false)} disabled={deleting}>Cancel</Btn>
          <Btn variant="danger" size="sm" onClick={confirmDelete} disabled={deleting || !deleteDeps}>
            {deleting ? "Deleting..." : "Delete permanently"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ── Small inline helper ── */
function MetaItem({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TelemetryLabel>{label}</TelemetryLabel>
      <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text }}>{value}</span>
    </div>
  );
}
