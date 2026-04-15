// Flow — Summary View (Phase 2: full design-system compliance)
// Weekly operating snapshot — polished, cinematic, analytical
import React, { useState, useMemo } from "react";
import { c, typo, space, layout, motion, typeConfig, colWidths, shipPhases } from "../styles/theme";
import { Surface, Label, EmptyState } from "../components/shared";
import { KpiGrid, KpiCard, HealthGauge, SectionHead, Pill, PillRow, Sparkline } from "../components/kpi";
import { MiniBarChart, SparkLine, StackedBarChart } from "../components/chart";
import useDevLabel from "../hooks/useDevLabel";


// ═══════════════════════════════════════════════════════════════
// Chart primitives (MiniBarChart / SparkLine / StackedBarChart)
// live in src/components/chart.jsx — imported above.
// ═══════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════
// COMPUTE METRICS — business logic (unchanged)
// ═══════════════════════════════════════════════════════════════
function computeWeekMetrics(weekKey, { history, commitments, projects, people }) {
  const totalProjects = projects.length;
  const totalPeople = people.length;
  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))];

  if (weekKey === "current") {
    // Fix #3: filter out empty padding slots (commitments padded to 3)
    const items = commitments.flatMap(cm =>
      cm.items.filter((_, idx) => cm.deselected !== idx)
        .filter(it => it.title || it.project)
        .map(it => ({ ...it, person: cm.person }))
    );
    const totalCommits = items.length;
    const activeProjects = new Set(items.map(it => it.project).filter(Boolean)).size;
    // Exclude deprioritized projects from "no action" count
    const depriCount = projects.filter(p => p.status === "deprioritized").length;
    const noActionProjects = Math.max(0, totalProjects - depriCount - activeProjects);
    const shippedCount = projects.filter(p => shipPhases.includes(p.phase)).length;
    const peopleWithTasks = new Set(items.map(it => it.person)).size;
    const buildCount = items.filter(it => it.type === "BUILD").length;
    const jamCount = items.filter(it => it.type === "JAM").length;
    // Fix #1: carriedCount from actual outcomes, not JAM count
    const doneCount = items.filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
    const carriedCount = items.filter(it => it.outcome === "carry" || it.outcome === "done_carry").length;
    const blockedCount = items.filter(it => it.outcome === "blocked").length;
    // Fix #2: completionRate from outcomes, not BUILD ratio
    const completionRate = totalCommits > 0 ? Math.round((doneCount / totalCommits) * 100) : 0;
    const committedPeople = commitments.filter(cm => cm.items.some(it => it.title || it.project)).length;

    // Build project→squad lookup, and fall back to person's squad for items without a project
    const projSquadMap = {};
    projects.forEach(p => { projSquadMap[p.id] = p.squad; });
    const personSquadMap = {};
    people.forEach(p => { personSquadMap[p.name] = p.squad; });
    const getItemSquad = (it) => (it.project && projSquadMap[it.project]) || personSquadMap[it.person] || null;

    const squads = {};
    allSquads.forEach(sq => {
      const sqProjects = projects.filter(p => p.squad === sq);
      const sqPeople = people.filter(p => p.squad === sq);
      const sqItems = items.filter(it => getItemSquad(it) === sq);
      const sqActive = new Set(sqItems.map(it => it.project).filter(Boolean)).size;
      const sqMembersActive = sqPeople.filter(p => items.some(it => it.person === p.name)).length;
      const sqBuild = sqItems.filter(it => it.type === "BUILD").length;
      const sqDone = sqItems.filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
      const sqCarried = sqItems.filter(it => it.outcome === "carry" || it.outcome === "done_carry").length;
      const sqDepri = sqProjects.filter(p => p.status === "deprioritized").length;
      squads[sq] = {
        commits: sqItems.length, activeProjects: sqActive,
        noActionProjects: Math.max(0, sqProjects.length - sqDepri - sqActive), totalProjects: sqProjects.length,
        membersActive: sqMembersActive, totalPeople: sqPeople.length,
        buildCount: sqBuild, doneCount: sqDone, carriedCount: sqCarried,
        completionRate: sqItems.length > 0 ? Math.round((sqDone / sqItems.length) * 100) : 0,
        shippedCount: sqProjects.filter(p => shipPhases.includes(p.phase)).length,
      };
    });

    return {
      totalCommits, activeProjects, noActionProjects, totalProjects, shippedCount,
      peopleWithTasks, totalPeople, committedPeople,
      buildCount, jamCount, doneCount, carriedCount, blockedCount, completionRate, squads,
    };
  } else {
    const entries = [];
    Object.entries(history).forEach(([projId, weeks]) => {
      const weekData = weeks.find(w => w.week === weekKey);
      if (weekData) weekData.entries.forEach(e => entries.push({ ...e, project: projId }));
    });

    const totalCommits = entries.length;
    const activeProjects = new Set(entries.map(e => e.project)).size;
    // For historical weeks, only count projects that had any history entries that week
    // (we can't know the full roster at that point in time)
    const projectIdsInWeek = new Set();
    Object.entries(history).forEach(([projId, weeks]) => {
      if (weeks.some(w => w.week === weekKey)) projectIdsInWeek.add(projId);
    });
    const histProjectCount = projectIdsInWeek.size;
    const histDepriCount = projects.filter(p => projectIdsInWeek.has(p.id) && p.status === "deprioritized").length;
    const noActionProjects = Math.max(0, histProjectCount - histDepriCount - activeProjects);
    // Fix #5: derive shipped from entry stages for historical weeks
    const shippedCount = new Set(entries.filter(e => shipPhases.includes(e.stage)).map(e => e.project)).size;
    const peopleWithTasks = new Set(entries.map(e => e.person)).size;
    const buildCount = entries.filter(e => e.type === "BUILD").length;
    const jamCount = entries.filter(e => e.type === "JAM").length;
    const doneCount = entries.filter(e => e.outcome === "done" || e.outcome === "done_carry").length;
    const carriedCount = entries.filter(e => e.outcome === "carry" || e.outcome === "done_carry").length;
    const blockedCount = entries.filter(e => e.outcome === "blocked").length;
    const committedPeople = peopleWithTasks;
    const completionRate = totalCommits > 0 ? Math.round((doneCount / totalCommits) * 100) : 0;

    // Build lookups for squad resolution (same as current-week branch)
    const projSquadMap = {};
    projects.forEach(p => { projSquadMap[p.id] = p.squad; });
    const personSquadMap = {};
    people.forEach(p => { personSquadMap[p.name] = p.squad; });
    const getEntrySquad = (e) => (e.project && projSquadMap[e.project]) || personSquadMap[e.person] || null;

    const squads = {};
    allSquads.forEach(sq => {
      const sqHistProjects = projects.filter(p => p.squad === sq && projectIdsInWeek.has(p.id));
      const sqPeople = people.filter(p => p.squad === sq);
      const sqEntries = entries.filter(e => getEntrySquad(e) === sq);
      const sqActive = new Set(sqEntries.map(e => e.project)).size;
      const sqMembersActive = sqPeople.filter(p => entries.some(e => e.person === p.name)).length;
      const sqBuild = sqEntries.filter(e => e.type === "BUILD").length;
      const sqDone = sqEntries.filter(e => e.outcome === "done" || e.outcome === "done_carry").length;
      const sqCarried = sqEntries.filter(e => e.outcome === "carry" || e.outcome === "done_carry").length;
      const sqDepri = sqHistProjects.filter(p => p.status === "deprioritized").length;
      const sqTotal = sqHistProjects.length || projects.filter(p => p.squad === sq).length;
      squads[sq] = {
        commits: sqEntries.length, activeProjects: sqActive,
        noActionProjects: Math.max(0, sqTotal - sqDepri - sqActive), totalProjects: sqTotal,
        membersActive: sqMembersActive, totalPeople: sqPeople.length,
        buildCount: sqBuild, doneCount: sqDone, carriedCount: sqCarried,
        completionRate: sqEntries.length > 0 ? Math.round((sqDone / sqEntries.length) * 100) : 0,
        shippedCount: new Set(sqEntries.filter(e => shipPhases.includes(e.stage)).map(e => e.project)).size,
      };
    });

    return {
      totalCommits, activeProjects, noActionProjects, totalProjects: histProjectCount, shippedCount,
      peopleWithTasks, totalPeople, committedPeople,
      buildCount, jamCount, doneCount, carriedCount, blockedCount, completionRate, squads,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// SUMMARY VIEW
// ═══════════════════════════════════════════════════════════════
const SummaryView = ({ history, commitments, projects, people, selectedWeekKey, weekConfig: weekConfigProp, globalFilters }) => {
  const devRef = useDevLabel('SummaryView', 'src/views/SummaryView.jsx', 'Weekly operating snapshot with charts and KPIs');
  const weekConfig = weekConfigProp || { weeks: [], currentWeek: null, historyWeeks: [], weekOf: "This Week", weekStart: new Date().toISOString().split('T')[0], today: new Date().toISOString().split('T')[0] };
  const selectedWeek = selectedWeekKey || "current";
  const tc = typeConfig();

  // Apply global filters (squad, person, owner)
  const gf = globalFilters || {};
  const filteredProjects = useMemo(() => {
    let p = projects;
    if (gf.squad?.length) p = p.filter(x => gf.squad.includes(x.squad));
    if (gf.owner?.length) p = p.filter(x => gf.owner.includes(x.owner));
    return p;
  }, [projects, gf.squad, gf.owner]);
  const filteredPeople = useMemo(() => {
    let p = people;
    if (gf.squad?.length) p = p.filter(x => gf.squad.includes(x.squad));
    if (gf.person?.length) p = p.filter(x => gf.person.includes(x.name));
    return p;
  }, [people, gf.squad, gf.person]);
  const filteredCommitments = useMemo(() => {
    let result = commitments;
    // Filter by person/squad via people list
    if (gf.person?.length || gf.squad?.length) {
      const personNames = new Set(filteredPeople.map(p => p.name));
      result = result.filter(cm => personNames.has(cm.person));
    }
    // Filter by owner: only keep commitment items tied to owner-matched projects
    if (gf.owner?.length) {
      const ownerProjectIds = new Set(filteredProjects.map(p => p.id));
      result = result.map(cm => ({
        ...cm,
        items: cm.items.filter(it => !it.project || ownerProjectIds.has(it.project)),
      })).filter(cm => cm.items.length > 0);
    }
    return result;
  }, [commitments, filteredPeople, filteredProjects, gf.person, gf.squad, gf.owner]);

  // Week tabs — newest first, limited to last 6 weeks
  // Fix #4: include weekConfig in deps so tabs update when data loads
  const weeks = useMemo(() => {
    const tabs = [{ key: "current", label: weekConfig.weekOf, isCurrent: true }];
    const histWeeks = weekConfig.historyWeeks || [];
    const hist = [...histWeeks].reverse().slice(0, 5);
    tabs.push(...hist.map(w => ({ key: w, label: w })));
    return tabs;
  }, [weekConfig]);

  const dataCtx = useMemo(() => ({ history, commitments: filteredCommitments, projects: filteredProjects, people: filteredPeople }), [history, filteredCommitments, filteredProjects, filteredPeople]);

  // All 5 weeks in chronological order
  const allMetrics = useMemo(() => {
    const chrono = [...weeks].reverse();
    return chrono.map(w => ({
      weekKey: w.key, label: w.label, isCurrent: w.isCurrent || false,
      ...computeWeekMetrics(w.key, dataCtx),
    }));
  }, [weeks, dataCtx]);

  const rawIdx = allMetrics.findIndex(m => m.weekKey === selectedWeek);
  const selectedIdx = rawIdx >= 0 ? rawIdx : allMetrics.length - 1;
  const metrics = allMetrics[selectedIdx];
  const prev = selectedIdx > 0 ? allMetrics[selectedIdx - 1] : null;
  const weekLabels = allMetrics.map(m => m.isCurrent ? "Now" : m.label);
  const allSquads = [...new Set(filteredProjects.map(p => p.squad).filter(Boolean))].sort();
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("desc");

  // Chart data — use outcome-based metrics
  const pctDone = allMetrics.map(m => m.completionRate || 0);
  const pctCarried = allMetrics.map(m => m.totalCommits > 0 ? Math.round((m.carriedCount / m.totalCommits) * 100) : 0);
  const commitSeries = [
    { label: "BUILD", color: tc.BUILD?.color || c.green, values: allMetrics.map(m => m.buildCount) },
    { label: "JAM", color: tc.JAM?.color || c.accent, values: allMetrics.map(m => m.jamCount) },
  ];

  // ─── Table helpers (token-compliant) ───
  const thStyle = {
    padding: `${space[2]}px ${space[3]}px`, textAlign: "left",
    fontFamily: typo.bodyMd.font, fontSize: 12,
    fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase",
    color: c.textDim, borderBottom: `1px solid ${c.border}`,
    background: c.tableHeader, position: "sticky", top: "var(--flow-sticky-top, 0px)", zIndex: 2,
    whiteSpace: "nowrap",
  };
  const tdBase = {
    padding: `${space[2]}px ${space[3]}px`,
    fontFamily: typo.bodyMd.font, fontSize: 14,
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    textAlign: "center", borderBottom: `1px dotted ${c.border}`,
  };
  const pctPill = (val, color, muted) => (
    <span style={{
      fontFamily: typo.monoMd.font, fontSize: 14,
      fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
      color: muted ? c.textDim : color,
      background: muted ? "transparent" : `${color}10`,
      padding: `2px ${space[2]}px`, borderRadius: layout.radiusSm,
    }}>{val}%</span>
  );

  // Empty state: no data or filters yielded nothing
  const hasGlobalFilter = gf.squad?.length || gf.person?.length || gf.owner?.length;
  if (!metrics || (filteredProjects.length === 0 && filteredPeople.length === 0)) {
    return (
      <div ref={devRef} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 240px)" }}>
        <EmptyState
          title={hasGlobalFilter ? "No matching data" : "No data yet"}
          message={hasGlobalFilter
            ? "No projects or people match the current filters. Try adjusting your filters."
            : "Add people and projects to see your weekly operating snapshot."}
        />
      </div>
    );
  }

  return (
    <div ref={devRef} style={{
      display: "flex", flexDirection: "column", gap: space[3],
    }}>

      {/* ═══════════════════════════════════════════════════════════
          KPI GRID — 4-card strip per design-directions §KPI CARDS.
          Card 1 wide (1.5fr) with phase pill breakdown. Card 4 inverted
          HealthGauge using completionRate as portfolio health proxy.
          ═══════════════════════════════════════════════════════════ */}
      <KpiGrid>
        <KpiCard
          label="Active Projects"
          value={metrics.activeProjects}
          sub={`of ${metrics.totalProjects} tracked · ${metrics.noActionProjects} idle`}
          delta={prev ? metrics.activeProjects - prev.activeProjects : null}
          deltaLabel="vs prev"
        >
          <PillRow>
            <Pill count={metrics.activeProjects} label="active" color={c.green} />
            <Pill count={metrics.noActionProjects} label="idle" color={c.orange} />
            <Pill count={metrics.shippedCount} label="shipped" color={c.green} />
          </PillRow>
        </KpiCard>
        <KpiCard
          label="Shipped This Week"
          value={metrics.shippedCount}
          sub="reached Alpha / Beta / GA"
          delta={prev ? metrics.shippedCount - prev.shippedCount : null}
          deltaLabel="vs prev"
        >
          <Sparkline values={allMetrics.slice(-6).map(m => m.shippedCount || 0)} color={c.green} />
        </KpiCard>
        <KpiCard
          label="Done Rate"
          value={`${metrics.completionRate}%`}
          sub={metrics.completionRate >= 60 ? "on track" : metrics.completionRate >= 40 ? "behind pace" : "at risk"}
          delta={prev ? metrics.completionRate - prev.completionRate : null}
          deltaLabel="pts"
        >
          <Sparkline values={allMetrics.slice(-6).map(m => m.completionRate || 0)} color={c.accent} />
        </KpiCard>
        <HealthGauge
          value={metrics.completionRate}
          label="Portfolio Health"
          sub="done rate as health proxy"
        />
      </KpiGrid>

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT — charts + tables (only this area scrolls)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[7] }}>

        {/* ── Projects — bar charts ── */}
        <div>
        <SectionHead title="Projects" />
        <div className="flow-mission-grid" style={{ padding: `${space[6]}px`, background: c.surface, border: "none", borderRadius: layout.radiusLg, boxShadow: c.shadowCard }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: space[6], flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
              <MiniBarChart title="Active" color={c.green}
                data={allMetrics.map(m => m.activeProjects)} labels={weekLabels}
                highlightIndex={selectedIdx} />
              <MiniBarChart title="Idle" color={c.orange}
                data={allMetrics.map(m => m.noActionProjects)} labels={weekLabels}
                highlightIndex={selectedIdx} />
              <MiniBarChart title="Shipped" color={c.green}
                data={allMetrics.map(m => m.shippedCount)} labels={weekLabels}
                highlightIndex={selectedIdx} />
            </div>
          </div>
        </div>
        </div>

        {/* ── Commit — sparklines + stacked bar ── */}
        <div>
        <SectionHead title="Commit" />
        <div className="flow-mission-grid" style={{ padding: `${space[6]}px`, background: c.surface, border: "none", borderRadius: layout.radiusLg, boxShadow: c.shadowCard }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: space[6], flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
              <SparkLine title="Done %" color={c.green} suffix="%"
                data={pctDone} labels={weekLabels} highlightIndex={selectedIdx} />
              <SparkLine title="Carried %" color={c.cyan} suffix="%"
                data={pctCarried} labels={weekLabels} highlightIndex={selectedIdx} />
            </div>
            <div style={{ marginTop: space[6] }}>
              <Label>Commit Breakdown</Label>
              <div style={{ marginTop: space[3], fontVariantNumeric: "tabular-nums" }}>
                <StackedBarChart series={commitSeries} weekLabels={weekLabels} highlightIndex={selectedIdx} />
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* ── People — bar + sparkline ── */}
        <div>
        <SectionHead title="People" />
        <div className="flow-mission-grid" style={{ padding: `${space[6]}px`, background: c.surface, border: "none", borderRadius: layout.radiusLg, boxShadow: c.shadowCard }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: space[6], flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
              <MiniBarChart title="Active People" color={c.cyan}
                data={allMetrics.map(m => m.peopleWithTasks)} labels={weekLabels}
                highlightIndex={selectedIdx} />
              <SparkLine title="Committed" color={c.purple}
                data={allMetrics.map(m => m.committedPeople)} labels={weekLabels}
                highlightIndex={selectedIdx} />
            </div>
          </div>
        </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SQUAD BREAKDOWN — data table
            ═══════════════════════════════════════════════════════════ */}
        <div>
        <SectionHead title="Squad Performance" />
        <Surface variant="data" compact style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto", borderRadius: layout.radius }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                {/* Group label row */}
                <tr>
                  <th style={{ ...thStyle, borderBottom: "none", paddingBottom: 0 }} />
                  <th colSpan={4} style={{ ...thStyle, borderBottom: `2px solid ${c.green}30`, paddingBottom: space[1], textAlign: "center" }}>
                    <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 700, color: c.green }}>Projects</span>
                  </th>
                  <th colSpan={3} style={{ ...thStyle, borderBottom: `2px solid ${c.accent}30`, paddingBottom: space[1], textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 700, color: c.accent }}>Commit</span>
                  </th>
                  <th colSpan={2} style={{ ...thStyle, borderBottom: `2px solid ${c.cyan}30`, paddingBottom: space[1], textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 700, color: c.cyan }}>People</span>
                  </th>
                </tr>
                {/* Column header row — sortable */}
                <tr>
                  {[
                    { key: "squad", label: "Squad", align: "left", minW: colWidths.squad.min },
                    { key: "active", label: "Active", minW: colWidths.metric.min },
                    { key: "noAction", label: "Idle", minW: colWidths.metric.min },
                    { key: "shipped", label: "Shipped", minW: colWidths.metric.min },
                    { key: "pctActive", label: "% Active", minW: colWidths.pct.min },
                    { key: "commits", label: "Total", minW: colWidths.metric.min, borderL: true },
                    { key: "pctDone", label: "% Done", minW: colWidths.pct.min },
                    { key: "pctCarried", label: "% Carried", minW: colWidths.pct.min },
                    { key: "pplTotal", label: "Total", minW: colWidths.metric.min, borderL: true },
                    { key: "pctPpl", label: "% Engaged", minW: colWidths.pct.min },
                  ].map(col => (
                    <th key={col.key} style={{
                      ...thStyle,
                      textAlign: col.align || "center",
                      minWidth: col.minW,
                      cursor: "pointer",
                      userSelect: "none",
                      ...(col.borderL ? { borderLeft: `1px dotted ${c.border}` } : {}),
                    }} onClick={() => {
                      if (sortCol === col.key) setSortDir(d => d === "asc" ? "desc" : "asc");
                      else { setSortCol(col.key); setSortDir("desc"); }
                    }}>
                      {col.label}{sortCol === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Pre-compute row data for sorting
                  const rows = allSquads.map(sq => {
                    const d = metrics?.squads?.[sq];
                    if (!d) return null;
                    const sqShipped = d.shippedCount || 0;
                    const projBase = d.activeProjects + d.noActionProjects;
                    const pA = projBase > 0 ? Math.round((d.activeProjects / projBase) * 100) : 0;
                    const pPpl = d.totalPeople > 0 ? Math.round((d.membersActive / d.totalPeople) * 100) : 0;
                    const pD = d.completionRate || 0;
                    const pC = d.commits > 0 ? Math.round(((d.carriedCount || 0) / d.commits) * 100) : 0;
                    return { sq, d, sqShipped, pA, pPpl, pD, pC };
                  }).filter(Boolean);

                  if (sortCol) {
                    const valFor = (r) => {
                      switch (sortCol) {
                        case "squad": return r.sq;
                        case "active": return r.d.activeProjects;
                        case "noAction": return r.d.noActionProjects;
                        case "shipped": return r.sqShipped;
                        case "pctActive": return r.pA;
                        case "commits": return r.d.commits;
                        case "pctDone": return r.pD;
                        case "pctCarried": return r.pC;
                        case "pplTotal": return r.d.totalPeople;
                        case "pctPpl": return r.pPpl;
                        default: return 0;
                      }
                    };
                    rows.sort((a, b) => {
                      const av = valFor(a), bv = valFor(b);
                      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
                      return sortDir === "asc" ? cmp : -cmp;
                    });
                  }

                  if (rows.length === 0) return (
                    <tr><td colSpan={10} style={{ ...tdBase, textAlign: "center", color: c.textDim, padding: `${space[5]}px`, fontFamily: typo.bodyMd.font }}>No squad data for this selection</td></tr>
                  );

                  return rows.map((r, i) => {
                    const { sq, d, sqShipped, pA, pPpl, pD, pC } = r;
                    const actClr = pA >= 60 ? c.green : pA >= 40 ? c.orange : c.red;
                    const pplClr = pPpl >= 80 ? c.green : pPpl >= 50 ? c.orange : c.red;
                    return (
                      <tr key={sq} className="flow-row" style={{
                        animation: `rowSlideIn 0.3s ${motion.critical.easing} both`,
                        animationDelay: `${Math.min(i * 30, 300)}ms`,
                      }}>
                        <td style={{
                          ...tdBase, textAlign: "left",
                          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                          fontWeight: 600, color: c.text,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200,
                        }}>{sq}</td>
                        <td style={{ ...tdBase, color: c.green }}>{d.activeProjects}</td>
                        <td style={{ ...tdBase, color: d.noActionProjects > 0 ? c.orange : c.textDim }}>{d.noActionProjects}</td>
                        <td style={{ ...tdBase, color: sqShipped > 0 ? c.green : c.textDim }}>{sqShipped}</td>
                        <td style={{ ...tdBase }}>{pctPill(pA, actClr)}</td>
                        <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}`, color: c.text }}>{d.commits}</td>
                        <td style={{ ...tdBase }}>{pctPill(pD, c.green)}</td>
                        <td style={{ ...tdBase }}>{pctPill(pC, c.cyan)}</td>
                        <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}`, color: c.text }}>{d.totalPeople}</td>
                        <td style={{ ...tdBase }}>{pctPill(pPpl, pplClr)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </Surface>
        </div>

        </div>
      </div>
    </div>
  );
};

export default SummaryView;
