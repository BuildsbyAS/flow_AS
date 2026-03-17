// Flow — Projects View (Rebuild v2: Pulse structural model + PeopleDeepDive history model)
// Two states: Registry (Pulse-style table with tabs) → Project Deep Dive (PeopleDeepDive-style)
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { c, typo, space, layout, motion, phaseNames, typeConfig, phaseColors as getPhaseColors, statusColors, entityColors, colWidths } from "../styles/theme";
import { Badge, Tag, Surface, Label, Btn, EmptyState, TelemetryLabel, SectionDivider, StatCell, MetricCompact, SummaryTile, VDivider, Th as SharedTh } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import { weekConfig } from "../data/seed";

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */
const ensureStatus = (p) => ({ ...p, status: p.status || "active" });

const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
};

// statusColors imported from theme.js

const WEEK_LABELS = [...weekConfig.historyWeeks, "This wk"];

/* ══════════════════════════════════════════════════════════════════
   DATA DERIVATION — full-history metrics per project
   ══════════════════════════════════════════════════════════════════ */
function deriveProjectMetrics(projects, commitments, history) {
  const pc = getPhaseColors();
  const tc = typeConfig();
  const map = {};

  for (const proj of projects) {
    const id = proj.id;
    const m = {
      historyTotal: 0, thisWeekTotal: 0, totalCommits: 0,
      phaseBreakdown: { PRD: 0, Design: 0, Engineering: 0, QA: 0 },
      typeBreakdown: { BUILD: 0, JAM: 0, COMMIT: 0, BLOCKED: 0 },
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
    commitments.forEach(cm => {
      cm.items.forEach((it, idx) => {
        if (cm.deselected !== idx && it.project === id) {
          currentItems.push({ ...it, person: cm.person });
          m.people.add(cm.person);
          m.thisWeekTotal++;
          const stage = it.stage || "PRD";
          if (m.phaseBreakdown[stage] !== undefined) m.phaseBreakdown[stage]++;
          if (m.typeBreakdown[it.type] !== undefined) m.typeBreakdown[it.type]++;
          if (it.type === "BLOCKED") m.isBlocked = true;
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
    const daysToEnd = daysBetween(weekConfig.today, proj.endDate);
    if (daysToEnd <= 14 && daysToEnd > 0 && proj.status !== "complete") m.endingSoon = true;
    if (daysToEnd < 0 && proj.status !== "complete") m.overdue = true;

    map[id] = m;
  }
  return map;
}

/* ══════════════════════════════════════════════════════════════════
   SORT — mirrors Pulse sort pattern
   ══════════════════════════════════════════════════════════════════ */
function sortList(list, key, dir, metrics) {
  if (!key) return [...list].sort((a, b) => (a.squad || "").localeCompare(b.squad || "") || (a.name || "").localeCompare(b.name || ""));
  const d = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    switch (key) {
      case "squad": return d * (a.squad || "").localeCompare(b.squad || "");
      case "project": return d * (a.name || "").localeCompare(b.name || "");
      case "owner": return d * (a.owner || "").localeCompare(b.owner || "");
      case "status": return d * (a.status || "active").localeCompare(b.status || "active");
      case "phase": return d * (phaseNames.indexOf(a.phase) - phaseNames.indexOf(b.phase));
      case "total": return d * ((metrics[a.id]?.totalCommits || 0) - (metrics[b.id]?.totalCommits || 0));
      case "thisWk": return d * ((metrics[a.id]?.thisWeekTotal || 0) - (metrics[b.id]?.thisWeekTotal || 0));
      case "people": return d * ((metrics[a.id]?.peopleList.length || 0) - (metrics[b.id]?.peopleList.length || 0));
      case "last": {
        const order = { "This wk": 5, "Mar 3": 4, "Feb 24": 3, "Feb 17": 2, "Feb 10": 1 };
        return d * ((order[metrics[a.id]?.lastActivity] || 0) - (order[metrics[b.id]?.lastActivity] || 0));
      }
      case "timeline": return d * (daysBetween(weekConfig.today, a.endDate) - daysBetween(weekConfig.today, b.endDate));
      default: return 0;
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════════ */
export default function ProjectsView({
  projects: rawProjects, setProjects, commitments, people, history,
  initialId, onNavigate, setDetailLabel, setGoBack, searchRef, globalFilters = {},
}) {
  const projects = useMemo(() => rawProjects.map(ensureStatus), [rawProjects]);
  const metrics = useMemo(() => deriveProjectMetrics(projects, commitments, history), [projects, commitments, history]);

  const [selectedProject, setSelectedProject] = useState(initialId || null);
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("squad");
  const [sortDir, setSortDir] = useState("asc");
  const [hoveredProject, setHoveredProject] = useState(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
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
  }, []);

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
    if (globalFilters.owner) list = list.filter(p => p.owner === globalFilters.owner);
    if (globalFilters.squad) list = list.filter(p => p.squad === globalFilters.squad);
    if (globalFilters.person) {
      list = list.filter(p => metrics[p.id]?.people.has(globalFilters.person));
    }
    return list;
  }, [projects, search, globalFilters, metrics]);

  // ── Tab splits ──
  const tabProjects = useMemo(() => {
    let list;
    switch (activeTab) {
      case "active": list = filtered.filter(p => p.status === "active" || p.status === "blocked"); break;
      case "complete": list = filtered.filter(p => p.status === "complete"); break;
      case "deprioritized": list = filtered.filter(p => p.status === "deprioritized"); break;
      default: list = filtered;
    }
    return sortList(list, sortKey, sortDir, metrics);
  }, [filtered, activeTab, sortKey, sortDir, metrics]);

  // ── KPI summary (from filtered data) ──
  const summary = useMemo(() => {
    const active = filtered.filter(p => p.status === "active" || p.status === "blocked");
    const complete = filtered.filter(p => p.status === "complete");
    const depri = filtered.filter(p => p.status === "deprioritized");
    const blockedCount = active.filter(p => p.status === "blocked" || metrics[p.id]?.isBlocked).length;
    const totalCommits = filtered.reduce((s, p) => s + (metrics[p.id]?.totalCommits || 0), 0);
    const avgPeople = filtered.length > 0 ? Math.round(filtered.reduce((s, p) => s + (metrics[p.id]?.peopleList.length || 0), 0) / filtered.length) : 0;
    return { active: active.length, complete: complete.length, depri: depri.length, all: filtered.length, blockedCount, totalCommits, avgPeople };
  }, [filtered, metrics]);

  // ── Sort handler (Pulse pattern) ──
  const toggleSort = useCallback((col) => {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("asc"); }
  }, [sortKey]);
  const sortIcon = (col) => sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── Keyboard ──
  useKeyboard([
    { key: "Escape", fn: () => { if (selectedProject) goBackToList(); }, force: true },
    { key: "ArrowUp", fn: () => { if (!selectedProject) { setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } } },
    { key: "ArrowDown", fn: () => { if (!selectedProject) { setKbActive(true); setFocusIdx(i => Math.min(tabProjects.length - 1, i + 1)); } } },
    { key: "Enter", fn: () => { if (!selectedProject && tabProjects[focusIdx]) openProject(tabProjects[focusIdx].id); } },
  ], [selectedProject, goBackToList, tabProjects.length, focusIdx]);

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
    return <ProjectDeepDive proj={proj} metrics={metrics[proj.id]} history={history} commitments={commitments} projects={projects} onNavigate={onNavigate} goBack={goBackToList} pc={pc} sc={sc} tc={tc} ec={ec} />;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRY STATE — Pulse structural model
  // ═══════════════════════════════════════════════════════════

  const TABS = [
    { key: "active", label: "Active Projects", count: summary.active, color: c.cyan },
    { key: "complete", label: "Completed Projects", count: summary.complete, color: c.green },
    { key: "deprioritized", label: "Deprioritized Projects", count: summary.depri, color: c.orange },
    { key: "all", label: "All Projects", count: summary.all, color: c.text },
  ];

  // ── Shared Th wrapper ──
  const Th = ({ col, children, style: s }) => (
    <SharedTh col={col} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
      style={s}>{children}</SharedTh>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ═══════════════════════════════════════════════════════════
          STICKY TOP — summary + tabs (Pulse pattern)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position: "sticky", top: 92, zIndex: 10,
        background: c.bg, paddingBottom: space[3],
        display: "flex", flexDirection: "column", gap: space[3] - 2,
      }}>

        {/* SUMMARY STRIP — Pulse-style SummaryTile + MetricCompact + VDivider */}
        <div className="flow-mission-grid" style={{ padding: `${space[3]}px ${space[4]}px` }}>
          <div style={{
            display: "flex", alignItems: "center", gap: space[1],
            flexWrap: "wrap", position: "relative", zIndex: 1,
          }}>
            {/* Status tiles — clickable, switch tab */}
            <SummaryTile
              value={summary.active} label="Active" color={c.cyan}
              active={activeTab === "active"}
              onClick={() => setActiveTab("active")}
            />
            <SummaryTile
              value={summary.complete} label="Complete" color={c.green}
              active={activeTab === "complete"}
              onClick={() => setActiveTab("complete")}
            />
            <SummaryTile
              value={summary.depri} label="Depri" color={c.orange}
              active={activeTab === "deprioritized"}
              onClick={() => setActiveTab("deprioritized")}
            />
            <SummaryTile
              value={summary.all} label="All" color={c.text}
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            />

            <VDivider />

            {/* KPI metrics */}
            <MetricCompact value={summary.totalCommits} label="Total Commits" color={c.text} />
            <MetricCompact value={summary.blockedCount} label="Blocked" color={summary.blockedCount > 0 ? c.red : c.textDim} />
            <MetricCompact value={summary.avgPeople} label="Avg People" color={c.accent} />
          </div>
        </div>

        {/* TAB SWITCHER — Pulse segmented toggle pattern */}
        <div style={{
          display: "flex", gap: 2,
          background: c.accentDim, borderRadius: layout.radiusMd, padding: 3,
        }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: `${space[2]}px ${space[4]}px`,
              borderRadius: layout.radiusMd, border: "none", cursor: "pointer",
              background: activeTab === tab.key ? c.accent : "transparent",
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? c.textCrit : c.accent,
              transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              boxShadow: activeTab === tab.key ? `0 1px 3px ${c.shadow}` : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: space[2],
            }}>
              {tab.label}
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700,
                padding: "1px 5px", borderRadius: layout.radiusTag + 1,
                background: activeTab === tab.key ? "rgba(255,255,255,0.2)" : `${c.accent}15`,
                color: activeTab === tab.key ? c.textCrit : c.accent,
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* SEARCH — Pulse-aligned */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input ref={localSearchRef} value={search} onChange={e => { setSearch(e.target.value); setFocusIdx(0); }}
              className="flow-input"
              placeholder="Search projects by name, ID, owner, or squad..."
              style={{
                width: "100%", padding: `${space[3]}px ${space[4]}px ${space[3]}px 38px`,
                borderRadius: layout.radiusMd, border: `1px solid ${c.border}`,
                background: c.surfaceAlt, color: c.text,
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                outline: "none", boxSizing: "border-box",
              }} />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: c.textMid, pointerEvents: "none" }}>🔍</span>
          </div>
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textMid, whiteSpace: "nowrap", flexShrink: 0 }}>
            {tabProjects.length}<span style={{ color: c.textMid + "80" }}>/{filtered.length}</span>
          </span>
        </div>
      </div>
      {/* end sticky top */}

      {/* ═══════════════════════════════════════════════════════════
          REGISTRY TABLE — Pulse table architecture
          ═══════════════════════════════════════════════════════════ */}
      {tabProjects.length === 0 ? (
        <EmptyState icon="📂" title="No projects" message={search ? "No projects match your search." : `No ${activeTab === "all" ? "" : activeTab + " "}projects found.`}
          action={search ? "Clear search" : null} onAction={() => setSearch("")} />
      ) : (
        <Surface variant="data" compact style={{ padding: 0, overflow: "hidden", boxShadow: c.shadowCard }}>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh", borderRadius: layout.radius }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: colWidths.squad.min }}>Squad</Th>
                  <Th col="project" style={{ minWidth: colWidths.identity.min, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                  <Th col="owner" style={{ minWidth: colWidths.owner.min, borderLeft: `1px dotted ${c.border}` }}>Owner</Th>
                  <Th col="status" style={{ minWidth: colWidths.status.min, borderLeft: `1px dotted ${c.border}` }}>Status</Th>
                  <Th col="phase" style={{ minWidth: colWidths.phase.min, borderLeft: `1px dotted ${c.border}` }}>Phase</Th>
                  <Th col="total" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Total</Th>
                  <Th col="thisWk" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>This Wk</Th>
                  <Th col="people" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>People</Th>
                  <Th col="last" style={{ minWidth: colWidths.date.min, borderLeft: `1px dotted ${c.border}` }}>Last</Th>
                  <Th col="timeline" style={{ minWidth: colWidths.timeline.min, borderLeft: `1px dotted ${c.border}` }}>Timeline</Th>
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
                  const isDimmed = activeTab === "all" && (proj.status === "complete" || proj.status === "deprioritized");

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
                        animation: `rowSlideIn 0.3s ${motion.critical.easing} both`,
                        animationDelay: `${Math.min(fi * 30, 600)}ms`,
                      }}
                    >
                      {/* Squad — sticky left (Pulse pattern) */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                        fontWeight: 600, color: c.textMid,
                        borderBottom: `1px dotted ${c.border}`,
                        position: "sticky", left: 0, background: c.bg, zIndex: 1,
                      }}>{proj.squad}</td>

                      {/* Project — ID + Name compound (Pulse pattern) */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{
                            fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                            fontWeight: 700, color: ec.project, flexShrink: 0,
                          }}>{proj.id}</span>
                          <span style={{
                            fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                            fontWeight: 600, color: isHovered ? ec.project : c.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            transition: `color ${motion.interaction.duration}`,
                          }}>{proj.name}</span>
                          {m.isBlocked && <Badge color={c.red} bg={c.redDim} style={{ flexShrink: 0 }}>!</Badge>}
                          {proj.ship && <span style={{ fontSize: 12, flexShrink: 0 }} title="Shipped">🚀</span>}
                        </div>
                      </td>

                      {/* Owner */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                        fontWeight: 500, color: proj.owner ? c.textMid : c.red,
                        whiteSpace: "nowrap",
                      }}>{proj.owner || "—"}</td>

                      {/* Status */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <Badge color={sCfg.color} bg={sCfg.bg}>{sCfg.label}</Badge>
                      </td>

                      {/* Phase */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <Badge color={pc[proj.phase] || c.textDim} bg={`${pc[proj.phase] || c.textDim}18`}>{proj.phase}</Badge>
                      </td>

                      {/* Total commits */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: m.totalCommits > 0 ? c.text : c.textDim, fontWeight: 600,
                      }}>{m.totalCommits || "—"}</td>

                      {/* This week */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: m.thisWeekTotal > 0 ? c.cyan : c.textDim,
                      }}>{m.thisWeekTotal || "—"}</td>

                      {/* People */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: m.peopleList?.length > 0 ? c.text : c.textDim,
                      }}>{m.peopleList?.length || "—"}</td>

                      {/* Last activity */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                        color: m.lastActivity === "This wk" ? c.cyan : m.lastActivity ? c.textMid : c.textDim,
                        fontWeight: m.lastActivity === "This wk" ? 700 : 500,
                      }}>{m.lastActivity || "—"}</td>

                      {/* Timeline — compact dates + progress bar */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>
                            {proj.startDate?.slice(5)} → {proj.endDate?.slice(5)}
                          </span>
                          <div style={{ height: 3, borderRadius: 2, background: c.border, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2, width: `${Math.min(pct, 100)}%`,
                              background: m.overdue ? c.red : pct > 85 ? c.orange : c.green,
                            }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   PROJECT DEEP DIVE — PeopleDeepDive structural model
   De-cluttered: hero → history → ledger → supporting metadata
   ══════════════════════════════════════════════════════════════════ */
function ProjectDeepDive({ proj, metrics: m, history, commitments, projects, onNavigate, goBack, pc, sc, tc, ec }) {
  const sCfg = sc[proj.status] || sc.active;
  const allocated = daysBetween(proj.startDate, proj.endDate);
  const elapsed = Math.max(0, Math.min(daysBetween(proj.startDate, weekConfig.today), allocated));

  // Build full weekly matrix for phase timeline
  const weekPhaseMatrix = useMemo(() => {
    const allWeeks = WEEK_LABELS;
    const matrix = {};
    for (const w of allWeeks) {
      matrix[w] = { PRD: [], Design: [], Engineering: [], QA: [] };
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

      {/* ═══ HERO — Telemetry Panel (PeopleDeepDive pattern) ═══ */}
      <div className="flow-telemetry-panel" style={{ padding: `${space[6]}px ${space[7]}px` }}>
        {/* Tier 1: Project identity — dominant read */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space[5], position: "relative", zIndex: 1 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: space[3], marginBottom: space[2] }}>
              <span style={{
                fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size + 2,
                fontWeight: 700, color: ec.project,
              }}>{proj.id}</span>
              <span style={{
                fontFamily: typo.displayXl.font, fontSize: typo.displayXl.size,
                fontWeight: typo.displayXl.weight, color: c.text,
                letterSpacing: typo.displayXl.tracking, lineHeight: 1.15,
              }}>{proj.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
              <Badge color={sCfg.color} bg={sCfg.bg}>{sCfg.label}</Badge>
              <Badge color={pc[proj.phase] || c.textDim} bg={`${pc[proj.phase] || c.textDim}18`}>{proj.phase}</Badge>
              {proj.ship && <Badge color={c.green} bg={c.greenDim}>🚀 Shipped</Badge>}
              {m.isBlocked && <Badge color={c.red} bg={c.redDim}>Blocked</Badge>}
              {m.overdue && <Badge color={c.red} bg={c.redDim}>Overdue</Badge>}
              {m.endingSoon && <Badge color={c.orange} bg={c.orangeDim}>Ending soon</Badge>}
            </div>
          </div>
        </div>

        {/* Tier 2: Stat rail — key metrics (PeopleDeepDive StatCell grid) */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: space[3],
          position: "relative", zIndex: 1, borderTop: `1px solid ${c.border}`, paddingTop: space[5],
        }}>
          <StatCell value={m.totalCommits} label="Total Commits" color={c.text} />
          <StatCell value={m.thisWeekTotal} label="This Week" color={c.cyan} />
          <StatCell value={m.peopleList?.length || 0} label="Contributors" color={c.accent} />
          <StatCell value={m.lastActivity || "—"} label="Last Active" color={m.lastActivity === "This wk" ? c.cyan : c.textMid} />
          <StatCell value={`${allocated}d`} label="Duration" color={c.text} />
        </div>
      </div>

      {/* ═══ SUPPORTING META — compact secondary surface ═══ */}
      <Surface variant="panel" style={{ padding: `${space[4]}px ${space[5]}px` }}>
        <div style={{ display: "flex", gap: space[5], flexWrap: "wrap" }}>
          <MetaItem label="Owner" value={proj.owner} />
          <MetaItem label="Squad" value={proj.squad} />
          <MetaItem label="Start" value={proj.startDate} />
          <MetaItem label="End" value={proj.endDate} />
          <MetaItem label="Elapsed" value={`${elapsed}d / ${allocated}d`} />
        </div>
      </Surface>

      {/* ═══ PHASE TIMELINE — roadmap lane ═══ */}
      <Surface compact>
        <Label>Phase Timeline</Label>
        <div style={{ overflowX: "auto" }}>
          {/* Week headers */}
          <div style={{ display: "grid", gridTemplateColumns: `80px repeat(${WEEK_LABELS.length}, 1fr)`, gap: 2, marginBottom: space[1] }}>
            <span />
            {WEEK_LABELS.map(w => (
              <span key={w} style={{
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                color: w === "This wk" ? c.cyan : c.textDim, textAlign: "center",
                fontWeight: w === "This wk" ? 700 : 500,
              }}>{w}</span>
            ))}
          </div>
          {/* Phase rows */}
          {phaseNames.map(phase => {
            const color = pc[phase] || c.textDim;
            return (
              <div key={phase} style={{
                display: "grid", gridTemplateColumns: `80px repeat(${WEEK_LABELS.length}, 1fr)`,
                gap: 2, marginBottom: 4,
              }}>
                <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700, color, display: "flex", alignItems: "center" }}>{phase}</span>
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

      {/* ═══ ACTIVITY TIMELINE DIVIDER ═══ */}
      <SectionDivider label="Activity Timeline" count={m.weeklyData.length + " weeks"} />

      {/* ═══ ACTIVITY LEDGER — Terminal Log (PeopleDeepDive pattern) ═══ */}
      <div className="flow-terminal-log" style={{ opacity: 0.9 }}>
        <div className="flow-terminal-header">
          <div className="flow-terminal-dot" style={{ background: c.red }} />
          <div className="flow-terminal-dot" style={{ background: c.orange }} />
          <div className="flow-terminal-dot" style={{ background: c.green }} />
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size + 1, fontWeight: 600, color: c.textMid, marginLeft: space[2] }}>
            timeline@{proj.id.toLowerCase()}
          </span>
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim, marginLeft: "auto" }}>
            {m.weeklyData.length} weeks
          </span>
        </div>
        <div style={{ padding: `${space[2]}px 0`, maxHeight: 500, overflowY: "auto" }}>
          {m.weeklyData.length === 0 ? (
            <div style={{ padding: `${space[5]}px ${space[4]}px`, textAlign: "center", fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.textDim }}>
              $ no activity logged<span className="flow-terminal-cursor" />
            </div>
          ) : (
            [...m.weeklyData].reverse().map((wk, wi) => (
              <React.Fragment key={wi}>
                {/* Week separator — current week emphasized */}
                <div style={{ padding: `${space[2]}px ${space[4]}px ${space[1]}px`, display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{
                    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                    fontWeight: 700, color: wk.isCurrent ? c.accent : c.textDim,
                  }}>
                    {wk.isCurrent ? "▸ THIS WEEK" : `▸ ${wk.week.toUpperCase()}`}
                  </span>
                  <div style={{ flex: 1, height: 1, background: wk.isCurrent ? `${c.accent}30` : c.border }} />
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>{wk.entries.length} entries</span>
                </div>
                {wk.entries.map((entry, ei) => (
                  <div key={`${wi}-${ei}`} className="flow-terminal-line" style={{
                    animationDelay: `${(wi * 3 + ei) * 0.04}s`,
                    opacity: wk.isCurrent ? 1 : 0.8,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: tc[entry.type]?.color || c.textDim,
                      boxShadow: wk.isCurrent ? `0 0 6px ${tc[entry.type]?.color || c.textDim}40` : "none",
                      flexShrink: 0, marginTop: 5,
                    }} />
                    <span style={{
                      fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                      color: c.textDim, flexShrink: 0, width: 52, marginTop: 1,
                    }}>
                      {wk.isCurrent ? "now" : wk.week.split(" ")[0].substring(0, 3)}
                    </span>
                    <Tag color={tc[entry.type]?.color} bg={tc[entry.type]?.bg}>{entry.type}</Tag>
                    <Tag color={pc[entry.stage] || c.textDim} bg={(pc[entry.stage] || c.textDim) + "12"}>{entry.stage || "—"}</Tag>
                    <span style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      color: wk.isCurrent ? c.text : c.textMid, flex: 1, minWidth: 0,
                    }}>
                      {entry.task || entry.title || "—"}
                    </span>
                    <span onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate("people", entry.person); }}
                      style={{
                        fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                        fontWeight: typo.monoLg.weight, color: c.cyan, cursor: "pointer", flexShrink: 0,
                      }}>
                      {entry.person}
                    </span>
                  </div>
                ))}
              </React.Fragment>
            ))
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

      {/* ═══ PHASE BREAKDOWN — compact secondary ═══ */}
      <Surface variant="panel" style={{ padding: `${space[4]}px ${space[5]}px` }}>
        <Label style={{ marginBottom: space[2] }}>Phase Breakdown</Label>
        <div style={{ display: "flex", gap: space[4], flexWrap: "wrap" }}>
          {phaseNames.map(ph => m.phaseBreakdown[ph] > 0 && (
            <div key={ph} style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: pc[ph] }} />
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: pc[ph], fontWeight: 700 }}>{ph}</span>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.text }}>{m.phaseBreakdown[ph]}</span>
            </div>
          ))}
        </div>
      </Surface>
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
