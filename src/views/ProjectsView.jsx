// Flow — Projects View (Rebuild v2: Pulse structural model + PeopleDeepDive history model)
// Two states: Registry (Pulse-style table with tabs) → Project Deep Dive (PeopleDeepDive-style)
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { c, typo, space, layout, motion, phaseNames, typeConfig, phaseColors as getPhaseColors, statusColors, entityColors, colWidths } from "../styles/theme";
import { Badge, Tag, Surface, Label, Btn, Inp, Sel, SearchSelect, EmptyState, TelemetryLabel, SectionDivider, StatCell, MetricCompact, SummaryTile, VDivider, Th as SharedTh } from "../components/shared";
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

const fmtDate = (d) => {
  if (!d) return "—";
  const [, m, day] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`;
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
      phaseBreakdown: { PRD: 0, Design: 0, Dev: 0, QA: 0 },
      typeBreakdown: { BUILD: 0, JAM: 0, BLOCKED: 0 },
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
  isHistorical, selectedWeekKey,
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
  const [searchGlow, setSearchGlow] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
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
    const avgAge = active.length > 0 ? Math.round(active.reduce((s, p) => s + daysBetween(p.startDate, weekConfig.today), 0) / active.length) : 0;
    return { active: active.length, complete: complete.length, depri: depri.length, all: filtered.length, blockedCount, totalCommits, avgPeople, avgAge };
  }, [filtered, metrics]);

  // ── Sort handler (Pulse pattern) ──
  const toggleSort = useCallback((col) => {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("asc"); }
  }, [sortKey]);
  const sortIcon = (col) => sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  // ── Keyboard ──
  useKeyboard([
    { key: "Escape", fn: () => { if (selectedProject) goBackToList(); else if (search) { setSearch(""); setFocusIdx(0); localSearchRef.current?.blur(); setKbActive(false); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); setKbActive(false); } else if (kbActive) { setKbActive(false); } }, force: true },
    { key: "ArrowUp", fn: () => { if (!selectedProject) { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } }, force: true },
    { key: "ArrowDown", fn: () => { if (!selectedProject) { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.min(tabProjects.length - 1, i + 1)); } }, force: true },
    { key: "Enter", fn: () => { if (!selectedProject && kbActive && tabProjects[focusIdx]) openProject(tabProjects[focusIdx].id); }, force: true },
    { key: "/", fn: (e) => { if (!selectedProject) { e.preventDefault(); localSearchRef.current?.focus(); setSearchGlow(true); setKbActive(false); setTimeout(() => setSearchGlow(false), 1200); } }, force: true },
  ], [selectedProject, goBackToList, tabProjects.length, focusIdx, kbActive]);

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
    return <ProjectDeepDive proj={proj} metrics={metrics[proj.id]} history={history} commitments={commitments} projects={projects} setProjects={setProjects} people={people} onNavigate={onNavigate} goBack={goBackToList} pc={pc} sc={sc} tc={tc} ec={ec} />;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRY STATE — Pulse structural model
  // ═══════════════════════════════════════════════════════════

  const TABS = [
    { key: "active", label: "Active", count: summary.active, color: c.cyan },
    { key: "complete", label: "Completed", count: summary.complete, color: c.green },
    { key: "deprioritized", label: "Deprioritized", count: summary.depri, color: c.orange },
    { key: "all", label: "All", count: summary.all, color: c.text },
  ];

  // ── Shared Th wrapper ──
  const Th = ({ col, children, style: s }) => (
    <SharedTh col={col} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}
      style={s}>{children}</SharedTh>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 128px)", marginBottom: -60 }}>

      {/* ═══════════════════════════════════════════════════════════
          FROZEN TOP — summary + tabs (never scrolls)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0,
        paddingBottom: space[3],
        display: "flex", flexDirection: "column", gap: space[3] - 2,
      }}>

        {/* SUMMARY STRIP — full-width grid */}
        <div className="flow-mission-grid" style={{ padding: `${space[3]}px ${space[4]}px` }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto 1fr 1fr 1fr 1fr",
            alignItems: "center", gap: space[2],
            position: "relative", zIndex: 1,
          }}>
            <SummaryTile
              value={summary.active} label="Active" color={c.cyan}
              active={activeTab === "active"}
              onClick={() => setActiveTab("active")}
            />
            <SummaryTile
              value={summary.complete} label="Completed" color={c.green}
              active={activeTab === "complete"}
              onClick={() => setActiveTab("complete")}
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

            <VDivider />

            <MetricCompact value={summary.totalCommits} label="Total Commits" color={c.text} />
            <MetricCompact value={summary.blockedCount} label="Blocked" color={summary.blockedCount > 0 ? c.red : c.textDim} />
            <MetricCompact value={summary.avgPeople} label="Avg Team Size" color={c.accent} />
            <MetricCompact value={`${summary.avgAge}d`} label="Avg Age" color={c.text} />
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

        {/* SEARCH */}
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
              boxShadow: searchGlow ? `0 0 0 3px ${c.accent}25, 0 0 12px ${c.accent}15` : "none",
              transition: `border-color 0.3s ease, box-shadow 0.3s ease`,
            }} />
          {/* Search icon — minimal line SVG */}
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", transition: "opacity 0.3s ease" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchGlow ? c.accent : c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
          {/* Keycap hint */}
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
      </div>
      {/* end frozen top */}

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT — table (only this area scrolls)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", position: "relative", zIndex: 1 }}>
      {tabProjects.length === 0 ? (
        <EmptyState icon="📂" title="No projects" message={search ? "No projects match your search." : `No ${activeTab === "all" ? "" : activeTab + " "}projects found.`}
          action={search ? "Clear search" : null} onAction={() => setSearch("")} />
      ) : (
        <Surface variant="data" compact style={{ padding: 0 }}>
          <div style={{ borderRadius: layout.radius }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: colWidths.squad.min }}>Squad</Th>
                  <Th col="project" style={{ minWidth: colWidths.identity.min, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                  <Th col="owner" style={{ minWidth: colWidths.owner.min, borderLeft: `1px dotted ${c.border}` }}>Owner</Th>
                  {activeTab === "all" && <Th col="status" style={{ minWidth: colWidths.status.min, borderLeft: `1px dotted ${c.border}` }}>Status</Th>}
                  {activeTab !== "complete" && <Th col="phase" style={{ minWidth: colWidths.phase.min, borderLeft: `1px dotted ${c.border}` }}>Phase</Th>}
                  <Th col="total" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Commits</Th>
                  {activeTab !== "complete" && <Th col="thisWk" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>{isHistorical ? selectedWeekKey : "This Wk"}</Th>}
                  <Th col="people" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>People</Th>
                  {activeTab === "complete" && <>
                    <Th col="planStart" style={{ minWidth: colWidths.date.min, borderLeft: `1px dotted ${c.border}` }}>Plan Start</Th>
                    <Th col="actualStart" style={{ minWidth: colWidths.date.min, borderLeft: `1px dotted ${c.border}` }}>Actual Start</Th>
                    <Th col="planDays" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Plan Days</Th>
                    <Th col="actualDays" style={{ minWidth: colWidths.metric.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Actual Days</Th>
                  </>}
                  {activeTab !== "complete" && <Th col="last" style={{ minWidth: colWidths.date.min, borderLeft: `1px dotted ${c.border}` }}>Last Active</Th>}
                  {activeTab !== "complete" && <Th col="timeline" style={{ minWidth: colWidths.timeline.min, borderLeft: `1px dotted ${c.border}` }}>Timeline</Th>}
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
                            fontWeight: 600, color: c.text,
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

                      {/* Status — only in "All" tab */}
                      {activeTab === "all" && <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <Badge color={sCfg.color} bg={sCfg.bg}>{sCfg.label}</Badge>
                      </td>}

                      {/* Phase — hidden in Completed tab */}
                      {activeTab !== "complete" && <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <Badge color={pc[proj.phase] || c.textDim} bg={`${pc[proj.phase] || c.textDim}18`}>{proj.phase}</Badge>
                      </td>}

                      {/* Total commits */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: m.totalCommits > 0 ? c.text : c.textDim, fontWeight: 600,
                      }}>{m.totalCommits || "—"}</td>

                      {/* This week — hidden in Completed tab */}
                      {activeTab !== "complete" && <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: m.thisWeekTotal > 0 ? c.cyan : c.textDim,
                      }}>{m.thisWeekTotal || "—"}</td>}

                      {/* People */}
                      <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: m.peopleList?.length > 0 ? c.text : c.textDim,
                      }}>{m.peopleList?.length || "—"}</td>

                      {/* Completed tab — plan/actual columns */}
                      {activeTab === "complete" && <>
                        <td style={{
                          padding: `${space[1]}px ${space[2] - 2}px`,
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid,
                        }}>{fmtDate(proj.startDate)}</td>
                        <td style={{
                          padding: `${space[1]}px ${space[2] - 2}px`,
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid,
                        }}>{fmtDate(proj.actualStartDate)}</td>
                        <td style={{
                          padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.text, fontWeight: 600,
                        }}>{allocated}</td>
                        {(() => {
                          const actualDays = proj.actualStartDate && proj.actualEndDate ? daysBetween(proj.actualStartDate, proj.actualEndDate) : 0;
                          const overPlan = actualDays > allocated;
                          return <td style={{
                            padding: `${space[1]}px ${space[2] - 2}px`, textAlign: "center",
                            borderBottom: `1px dotted ${c.border}`,
                            borderLeft: `1px dotted ${c.border}`,
                            fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 600,
                            color: overPlan ? c.orange : c.green,
                          }}>{actualDays}</td>;
                        })()}
                      </>}

                      {/* Last activity — hidden in Completed tab */}
                      {activeTab !== "complete" && <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                        color: m.lastActivity === "This wk" ? c.cyan : m.lastActivity ? c.textMid : c.textDim,
                        fontWeight: m.lastActivity === "This wk" ? 700 : 500,
                      }}>{m.lastActivity || "—"}</td>}

                      {/* Timeline — hidden in Completed tab */}
                      {activeTab !== "complete" && <td style={{
                        padding: `${space[1]}px ${space[2] - 2}px`,
                        borderBottom: `1px dotted ${c.border}`,
                        borderLeft: `1px dotted ${c.border}`,
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid }}>
                              {fmtDate(proj.startDate)}
                            </span>
                            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>→</span>
                            <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid }}>
                              {fmtDate(proj.endDate)}
                            </span>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: c.border, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2, width: `${Math.min(pct, 100)}%`,
                              background: m.overdue ? c.red : pct > 85 ? c.orange : c.green,
                            }} />
                          </div>
                        </div>
                      </td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
      <div style={{ flexShrink: 0, height: space[8] }} />
      </div>{/* end scrollable content */}

      {/* FAB — Add Project */}
      <button onClick={() => setShowCreate(true)} style={{
        position: "fixed", bottom: space[7], right: space[7], zIndex: 50,
        padding: `${space[2]}px ${space[4]}px`, borderRadius: layout.radiusMd,
        border: "none", cursor: "pointer",
        background: c.orange, color: c.bg,
        fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: space[1],
        boxShadow: `0 4px 16px ${c.orange}40, 0 2px 4px ${c.shadow}`,
        transition: `transform ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration}`,
      }}>Add</button>

      {/* Create Project Overlay */}
      {showCreate && <CreateProjectOverlay
        projects={projects} people={people} setProjects={setProjects}
        onClose={() => setShowCreate(false)}
      />}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════
   CREATE PROJECT OVERLAY
   ══════════════════════════════════════════════════════════════════ */
function CreateProjectOverlay({ projects, people, setProjects, onClose }) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [squad, setSquad] = useState("");
  const [phase, setPhase] = useState("PRD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();
  const allOwners = people ? people.map(p => p.name).sort() : [...new Set(projects.map(p => p.owner).filter(Boolean))].sort();

  const nextId = useMemo(() => {
    const nums = projects.map(p => parseInt(p.id.replace(/\D/g, ""), 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `X${String(max + 1).padStart(2, "0")}`;
  }, [projects]);

  const canSave = name.trim() && owner && squad && startDate && endDate;

  const handleCreate = () => {
    if (!canSave) return;
    setProjects(prev => [...prev, {
      id: nextId, name: name.trim(), owner, squad, phase,
      startDate, endDate, ship: false, status: "active",
    }]);
    onClose();
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inputStyle = {
    width: "100%", height: 40, padding: `0 ${space[3]}px`,
    borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
    background: c.surfaceAlt, color: c.text,
    fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
    outline: "none", boxSizing: "border-box",
  };

  const monoLabel = { fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600, color: c.textDim, marginBottom: space[1] };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} className="flow-terminal-log" style={{
        width: "100%", maxWidth: 520, opacity: 1,
        animation: `rowSlideIn 0.3s ${motion.critical.easing} both`,
      }}>
        {/* Terminal header bar */}
        <div className="flow-terminal-header" style={{ padding: `${space[2]}px ${space[4]}px` }}>
          <div className="flow-terminal-dot" style={{ background: c.red }} />
          <div className="flow-terminal-dot" style={{ background: c.orange }} />
          <div className="flow-terminal-dot" style={{ background: c.green }} />
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size + 1, fontWeight: 600, color: c.textMid, marginLeft: space[2] }}>
            create@flow
          </span>
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.orange, marginLeft: "auto" }}>
            {nextId}
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
              <div style={monoLabel}>--name</div>
              <Inp value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Checkout Redesign" style={{ width: "100%", fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size }} autoFocus />
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
                {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
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
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: space[2], marginTop: space[3] }}>
              <Btn variant="secondary" size="sm" onClick={onClose}>Abort</Btn>
              <button onClick={handleCreate} style={{
                padding: `${space[2]}px ${space[5]}px`, borderRadius: layout.radiusMd,
                border: "none", cursor: canSave ? "pointer" : "default",
                background: canSave ? c.green : c.surfaceAlt,
                color: canSave ? c.bg : c.textDim,
                fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700,
                opacity: canSave ? 1 : 0.5,
                boxShadow: canSave ? `0 2px 8px ${c.green}30` : "none",
                transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              }}>Execute</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECT DEEP DIVE — PeopleDeepDive structural model
   De-cluttered: hero → history → ledger → supporting metadata
   ══════════════════════════════════════════════════════════════════ */
function ProjectDeepDive({ proj, metrics: m, history, commitments, projects, setProjects, people, onNavigate, goBack, pc, sc, tc, ec }) {
  const [editing, setEditing] = useState(false);
  const [editOwner, setEditOwner] = useState(proj.owner);
  const [editSquad, setEditSquad] = useState(proj.squad);
  const [editPhase, setEditPhase] = useState(proj.phase);
  const [editStatus, setEditStatus] = useState(proj.status || "active");

  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();
  const allOwners = people ? people.map(p => p.name).sort() : [...new Set(projects.map(p => p.owner).filter(Boolean))].sort();

  const saveEdits = () => {
    setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, owner: editOwner, squad: editSquad, phase: editPhase, status: editStatus } : p));
    setEditing(false);
  };
  const cancelEdits = () => {
    setEditOwner(proj.owner); setEditSquad(proj.squad); setEditPhase(proj.phase); setEditStatus(proj.status || "active");
    setEditing(false);
  };

  const sCfg = sc[editStatus] || sc[proj.status] || sc.active;
  const allocated = daysBetween(proj.startDate, proj.endDate);
  const elapsed = Math.max(0, Math.min(daysBetween(proj.startDate, weekConfig.today), allocated));

  // Build full weekly matrix for phase timeline
  const weekPhaseMatrix = useMemo(() => {
    const allWeeks = WEEK_LABELS;
    const matrix = {};
    for (const w of allWeeks) {
      matrix[w] = { PRD: [], Design: [], Dev: [], QA: [] };
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

      {/* ═══ HERO — Telemetry Panel (People tab pattern) ═══ */}
      <div className="flow-telemetry-panel" style={{ padding: `${space[6]}px ${space[7]}px` }}>
        {/* Identity (left) + status highlight (right) */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space[5], position: "relative", zIndex: 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <div style={{ fontFamily: typo.displayXl.font, fontSize: typo.displayXl.size, fontWeight: typo.displayXl.weight, color: c.text, letterSpacing: typo.displayXl.tracking, lineHeight: 1.15 }}>{proj.name}</div>
              {!editing && (
                <button onClick={() => setEditing(true)} className="flow-btn" style={{
                  padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusMd,
                  border: `1px solid ${c.border}`, background: c.surfaceAlt, cursor: "pointer",
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
                  color: c.textMid, transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                }}>Edit</button>
              )}
            </div>

            {!editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: space[2], marginTop: space[2] }}>
                <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, letterSpacing: typo.monoLg.tracking, color: ec.project }}>{proj.id}</span>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>·</span>
                <span style={{ fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size, fontWeight: typo.bodyLg.weight, color: c.textMid }}>{proj.owner}</span>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>·</span>
                <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, letterSpacing: typo.monoLg.tracking, color: c.accent }}>{proj.squad}</span>
                {m.isBlocked && <Badge color={c.red} bg={c.redDim}>Blocked</Badge>}
                {m.overdue && <Badge color={c.red} bg={c.redDim}>Overdue</Badge>}
                {m.endingSoon && <Badge color={c.orange} bg={c.orangeDim}>Ending soon</Badge>}
                {proj.ship && <Badge color={c.green} bg={c.greenDim}>Shipped</Badge>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: space[3], marginTop: space[3] }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: space[3] }}>
                  <div>
                    <Label style={{ marginBottom: space[1] }}>Owner</Label>
                    <SearchSelect value={editOwner} onChange={setEditOwner} options={allOwners} placeholder="Search people..." />
                  </div>
                  <div>
                    <Label style={{ marginBottom: space[1] }}>Squad</Label>
                    <SearchSelect value={editSquad} onChange={setEditSquad} options={allSquads} placeholder="Search squads..." />
                  </div>
                  <div>
                    <Label style={{ marginBottom: space[1] }}>Phase</Label>
                    <Sel value={editPhase} onChange={e => setEditPhase(e.target.value)} style={{ width: "100%" }}>
                      {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <Label style={{ marginBottom: space[1] }}>Status</Label>
                    <Sel value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ width: "100%" }}>
                      <option value="active">Active</option>
                      <option value="complete">Complete</option>
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
            <div style={{ textAlign: "center", padding: `${space[2]}px ${space[4]}px`, borderRadius: layout.radiusMd, background: sCfg.bg, border: `1px solid ${sCfg.color}20`, flexShrink: 0 }}>
              <div style={{ fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight, color: sCfg.color, lineHeight: 1 }}>{proj.phase}</div>
              <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, marginTop: space[1] }}>{sCfg.label}</div>
            </div>
          )}
        </div>

        {/* Project details — below separator */}
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: space[4], position: "relative", zIndex: 1 }}>
          <Label style={{ marginBottom: space[3] }}>Project Details</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: space[3] }}>
            <StatCell value={fmtDate(proj.startDate)} label="Start" color={c.text} style={{ textAlign: "left" }} />
            <StatCell value={fmtDate(proj.endDate)} label="End" color={c.text} style={{ textAlign: "left" }} />
            <StatCell value={`${allocated}d`} label="Duration" color={c.text} style={{ textAlign: "left" }} />
            <StatCell value={`${elapsed}d`} label="Elapsed" color={elapsed >= allocated ? c.orange : c.text} style={{ textAlign: "left" }} />
            <StatCell value={m.peopleList?.length || 0} label="Contributors" color={c.accent} style={{ textAlign: "left" }} />
          </div>
        </div>
      </div>

      {/* ═══ METRICS — stat rail ═══ */}
      <Surface variant="panel" style={{ padding: `${space[4]}px ${space[5]}px` }}>
        <Label style={{ marginBottom: space[3] }}>Activity</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: space[3] }}>
          <StatCell value={m.totalCommits} label="Total Commits" color={c.text} style={{ textAlign: "left" }} />
          <StatCell value={m.thisWeekTotal} label="This Week" color={c.cyan} style={{ textAlign: "left" }} />
          <StatCell value={m.lastActivity || "—"} label="Last Active" color={m.lastActivity === "This wk" ? c.cyan : c.textMid} style={{ textAlign: "left" }} />
          <StatCell value={m.historyTotal} label="History" color={c.text} style={{ textAlign: "left" }} />
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
