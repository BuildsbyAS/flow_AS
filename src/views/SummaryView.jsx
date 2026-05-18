// Flow — Summary View
// Weekly operating snapshot — the team-lead home. Answers in 30s:
//   1) where is the team this week? 2) who's stuck? 3) what's shipping?
import React, { useState, useMemo, useEffect, useRef } from "react";
import { c, typo, space, layout, motion, colWidths, shipPhases, phaseColors } from "../styles/theme";
import { Surface, Label, EmptyState } from "../components/shared";
import { KpiGrid, KpiCard, SectionHead, Pill, PillRow, Sparkline } from "../components/kpi";
import { MiniBarChart, SparkLine, StackedBarChart } from "../components/chart";
import useDevLabel from "../hooks/useDevLabel";


// ═══════════════════════════════════════════════════════════════
// COMPUTE METRICS — disjoint outcome slices; done_carry rolls into "done"
// for completion math, so Done+Partial+Carry+Blocked ≤ 100%.
// Rollover (carry + done_carry) is tracked separately for "moving to next week".
// ═══════════════════════════════════════════════════════════════
function computeWeekMetrics(weekKey, { history, commitments, projects, people }) {
  const totalProjects = projects.length;
  const totalPeople = people.length;
  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))];

  const isCurrent = weekKey === "current";

  // Normalize items from either source so the rest of the function is shared.
  let items = [];
  let projectIdsInWeek = null;

  if (isCurrent) {
    items = commitments.flatMap(cm =>
      cm.items.filter((_, idx) => cm.deselected !== idx)
        .filter(it => it.title || it.project)
        .map(it => ({ ...it, person: cm.person }))
    );
  } else {
    projectIdsInWeek = new Set();
    Object.entries(history).forEach(([projId, weeks]) => {
      const weekData = weeks.find(w => w.week === weekKey);
      if (!weekData) return;
      projectIdsInWeek.add(projId);
      weekData.entries.forEach(e => items.push({ ...e, project: projId }));
    });
  }

  // Outcome tallies — disjoint. done_carry counts as done; carry is pure-carry.
  const totalCommits = items.length;
  const doneCount    = items.filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
  const carriedCount = items.filter(it => it.outcome === "carry").length;      // pure carry only
  const blockedCount = items.filter(it => it.outcome === "blocked").length;
  const partialCount = items.filter(it => it.outcome === "partial").length;
  const doneCarryCount = items.filter(it => it.outcome === "done_carry").length;
  const outcomeLoggedCount = items.filter(it => it.outcome).length;
  const rolloverCount = carriedCount + doneCarryCount; // items continuing next week

  const buildCount = items.filter(it => it.type === "BUILD").length;
  const jamCount   = items.filter(it => it.type === "JAM").length;

  // Project surfaces
  const activeProjects = new Set(items.map(it => it.project).filter(Boolean)).size;
  const histProjectCount = isCurrent ? totalProjects : projectIdsInWeek.size;
  const depriCount = isCurrent
    ? projects.filter(p => p.status === "deprioritized").length
    : projects.filter(p => projectIdsInWeek.has(p.id) && p.status === "deprioritized").length;
  const noActionProjects = Math.max(0, histProjectCount - depriCount - activeProjects);
  const shippedCount = isCurrent
    ? projects.filter(p => shipPhases.includes(p.phase)).length
    : new Set(items.filter(it => shipPhases.includes(it.stage)).map(it => it.project)).size;
  const shipPhaseBreakdown = shipPhases.reduce((acc, ph) => {
    acc[ph] = isCurrent
      ? projects.filter(p => p.phase === ph).length
      : new Set(items.filter(it => it.stage === ph).map(it => it.project)).size;
    return acc;
  }, {});

  // People coverage
  const peopleWithTasks = new Set(items.map(it => it.person)).size;
  const committedPeople = isCurrent
    ? commitments.filter(cm => cm.items.some(it => it.title || it.project)).length
    : peopleWithTasks;
  const blockedPeople = new Set(items.filter(it => it.outcome === "blocked").map(it => it.person)).size;

  // Squad resolution
  const projSquadMap = {};
  projects.forEach(p => { projSquadMap[p.id] = p.squad; });
  const personSquadMap = {};
  people.forEach(p => { personSquadMap[p.name] = p.squad; });
  const getItemSquad = (it) => (it.project && projSquadMap[it.project]) || personSquadMap[it.person] || null;

  const squads = {};
  allSquads.forEach(sq => {
    const sqAllProjects = projects.filter(p => p.squad === sq);
    const sqProjects = isCurrent ? sqAllProjects : sqAllProjects.filter(p => projectIdsInWeek.has(p.id));
    const sqPeople = people.filter(p => p.squad === sq);
    const sqItems = items.filter(it => getItemSquad(it) === sq);
    const sqActive = new Set(sqItems.map(it => it.project).filter(Boolean)).size;
    const sqMembersActive = sqPeople.filter(p => items.some(it => it.person === p.name)).length;
    const sqDone = sqItems.filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
    const sqCarried = sqItems.filter(it => it.outcome === "carry").length;
    const sqBlocked = sqItems.filter(it => it.outcome === "blocked").length;
    const sqOutcomeLogged = sqItems.filter(it => it.outcome).length;
    const sqDepri = sqProjects.filter(p => p.status === "deprioritized").length;
    const sqTotal = isCurrent ? sqProjects.length : (sqProjects.length || sqAllProjects.length);
    squads[sq] = {
      commits: sqItems.length, activeProjects: sqActive,
      noActionProjects: Math.max(0, sqTotal - sqDepri - sqActive), totalProjects: sqTotal,
      membersActive: sqMembersActive, totalPeople: sqPeople.length,
      doneCount: sqDone, carriedCount: sqCarried, blockedCount: sqBlocked,
      outcomeLoggedCount: sqOutcomeLogged,
      completionRate: sqItems.length > 0 ? Math.round((sqDone / sqItems.length) * 100) : 0,
      shippedCount: isCurrent
        ? sqProjects.filter(p => shipPhases.includes(p.phase)).length
        : new Set(sqItems.filter(it => shipPhases.includes(it.stage)).map(it => it.project)).size,
    };
  });

  const completionRate = totalCommits > 0 ? Math.round((doneCount / totalCommits) * 100) : 0;

  return {
    totalCommits, activeProjects, noActionProjects, totalProjects: histProjectCount, shippedCount, shipPhaseBreakdown,
    peopleWithTasks, totalPeople, committedPeople, blockedPeople,
    buildCount, jamCount,
    doneCount, carriedCount, blockedCount, partialCount, doneCarryCount,
    outcomeLoggedCount, rolloverCount, completionRate, squads,
  };
}


// ═══════════════════════════════════════════════════════════════
// SUMMARY VIEW
// ═══════════════════════════════════════════════════════════════
const SummaryView = ({
  loading, error,
  history, commitments, projects, people, squads,
  selectedWeekKey, weekConfig: weekConfigProp, globalFilters,
  isHistorical, onNavigate,
}) => {
  const devRef = useDevLabel('SummaryView', 'src/views/SummaryView.jsx', 'Weekly operating snapshot with charts and KPIs');
  const weekConfig = weekConfigProp || { weeks: [], currentWeek: null, historyWeeks: [], weekOf: "This Week" };
  const selectedWeek = selectedWeekKey || "current";

  // Apply global filters
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
    if (gf.person?.length || gf.squad?.length) {
      const personNames = new Set(filteredPeople.map(p => p.name));
      result = result.filter(cm => personNames.has(cm.person));
    }
    if (gf.owner?.length) {
      const ownerProjectIds = new Set(filteredProjects.map(p => p.id));
      result = result.map(cm => ({
        ...cm,
        items: cm.items.filter(it => !it.project || ownerProjectIds.has(it.project)),
      })).filter(cm => cm.items.length > 0);
    }
    return result;
  }, [commitments, filteredPeople, filteredProjects, gf.person, gf.squad, gf.owner]);

  // Weeks tab strip — 6 most-recent weeks, newest first
  const weeks = useMemo(() => {
    const tabs = [{ key: "current", label: weekConfig.weekOf, isCurrent: true }];
    const histWeeks = weekConfig.historyWeeks || [];
    const hist = [...histWeeks].reverse().slice(0, 5);
    tabs.push(...hist.map(w => ({ key: w, label: w })));
    return tabs;
  }, [weekConfig]);

  const dataCtx = useMemo(
    () => ({ history, commitments: filteredCommitments, projects: filteredProjects, people: filteredPeople }),
    [history, filteredCommitments, filteredProjects, filteredPeople]
  );

  // Chronological (oldest → newest) for charts
  const allMetrics = useMemo(() => {
    const chrono = [...weeks].reverse();
    return chrono.map(w => ({
      weekKey: w.key, label: w.label, isCurrent: w.isCurrent || false,
      ...computeWeekMetrics(w.key, dataCtx),
    }));
  }, [weeks, dataCtx]);

  const rawIdx = allMetrics.findIndex(m => m.weekKey === selectedWeek);
  const isOutOfRange = rawIdx < 0 && selectedWeek !== "current";
  const selectedIdx = rawIdx >= 0 ? rawIdx : allMetrics.length - 1;
  const metrics = allMetrics[selectedIdx];
  const prev = selectedIdx > 0 ? allMetrics[selectedIdx - 1] : null;
  const weekLabels = allMetrics.map(m => m.label);
  // Prefer the canonical squads list from App.jsx so newly-created squads
  // with no projects yet still appear in the Squad Performance table.
  const allSquads = squads && squads.length
    ? [...squads].sort()
    : [...new Set(filteredProjects.map(p => p.squad).filter(Boolean))].sort();
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("desc");
  // Hide squads with no projects / people / commits by default — they
  // read as "missing data" and bloat the table. Toggled via footer link.
  const [showInactive, setShowInactive] = useState(false);

  // Row animation plays only on the first mount per selectedWeek change,
  // not on every sort / filter re-render (P11).
  const animKeyRef = useRef(selectedWeek);
  const [animKey, setAnimKey] = useState(selectedWeek);
  useEffect(() => {
    if (animKeyRef.current !== selectedWeek) {
      animKeyRef.current = selectedWeek;
      setAnimKey(selectedWeek);
    }
  }, [selectedWeek]);

  // BUILD/JAM use hues distinct from Done=green / Blocked=red so they
  // don't collide semantically with the adjacent outcome stack.
  const tc = { BUILD: { color: c.purple }, JAM: { color: c.cyan } };

  // ─── Chart data ───
  const pctDone = allMetrics.map(m => m.completionRate || 0);
  const pctCarried = allMetrics.map(m => m.totalCommits > 0 ? Math.round((m.carriedCount / m.totalCommits) * 100) : 0);

  // Outcome breakdown — disjoint slices. done_carry is folded into done.
  // Colors track `outcomeConfig()` in theme.js: carry = orange, blocked = red.
  const outcomeSeries = [
    // Partial and Carry would both resolve to amber in Steel & Orange
    // (c.orange aliases amber), making stack segments indistinguishable.
    // Partial → blue (neutral in-progress), Carry → amber (rollover warning).
    { label: "Done",    color: c.green, values: allMetrics.map(m => m.doneCount) },
    { label: "Partial", color: c.blue,  values: allMetrics.map(m => m.partialCount) },
    { label: "Carry",   color: c.amber, values: allMetrics.map(m => m.carriedCount) },
    { label: "Blocked", color: c.red,   values: allMetrics.map(m => m.blockedCount) },
  ];
  const commitSeries = [
    { label: "BUILD", color: tc.BUILD.color, values: allMetrics.map(m => m.buildCount) },
    { label: "JAM",   color: tc.JAM.color,   values: allMetrics.map(m => m.jamCount) },
  ];

  // ─── Table helpers ───
  const thStyle = {
    padding: `${space[2]}px ${space[3]}px`, textAlign: "left",
    fontFamily: typo.bodyMd.font, fontSize: 12,
    fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase",
    color: c.textDim, borderBottom: `1px solid ${c.border}`,
    background: c.tableHeader,
    whiteSpace: "nowrap",
  };
  const tdBase = {
    padding: `${space[2]}px ${space[3]}px`,
    fontFamily: typo.monoMd.font, fontSize: 13,
    fontWeight: 600, letterSpacing: "0.02em",
    fontVariantNumeric: "tabular-nums",
    textAlign: "center", borderBottom: `1px dotted ${c.border}`,
  };
  const pctPill = (val, color, muted) => (
    <span style={{
      fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
      fontWeight: 700, letterSpacing: typo.monoMd.tracking,
      fontVariantNumeric: "tabular-nums",
      color: muted ? c.textDim : color,
      background: muted ? "transparent" : `${color}1a`,
      padding: `${space[1]}px ${space[2]}px`, borderRadius: layout.radiusXs,
    }}>{val}%</span>
  );

  const handleSortKey = (key) => {
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("desc"); }
  };

  // ─── Guard states ───
  if (loading) {
    return (
      <div ref={devRef} style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 240px)", flexDirection: "column", gap: space[3],
        animation: `fadeIn 200ms ${motion.fast.easing} 200ms both`,
      }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${c.borderMedium || c.border}`, borderTopColor: c.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid }}>Loading summary…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={devRef} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 240px)" }}>
        <EmptyState
          icon="⚠"
          title="Failed to load summary"
          message={typeof error === "string" ? error : "An unexpected error occurred."}
          action="Retry"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const hasGlobalFilter = Boolean(gf.squad?.length || gf.person?.length || gf.owner?.length);

  // No data at all
  if (!metrics || (filteredProjects.length === 0 && filteredPeople.length === 0)) {
    return (
      <div ref={devRef} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 240px)" }}>
        <EmptyState
          title={hasGlobalFilter ? "No matching data" : "No data yet"}
          message={hasGlobalFilter
            ? "No projects or people match the current filters. Try adjusting your filters."
            : "Add people and projects to see your weekly operating snapshot."}
          action={!hasGlobalFilter && onNavigate ? "Add people" : null}
          onAction={!hasGlobalFilter && onNavigate ? () => onNavigate("people") : null}
        />
      </div>
    );
  }

  // Filtered down to a cohort with no commitments this week
  const filteredToNoCommits = Boolean(hasGlobalFilter && metrics.totalCommits === 0 && filteredPeople.length > 0);

  // People in scope without any commitment (attention)
  const commitPersonSet = new Set(filteredCommitments.filter(cm => cm.items.some(it => it.title || it.project)).map(cm => cm.person));
  const uncommittedPeople = selectedWeek === "current"
    ? filteredPeople.filter(p => !commitPersonSet.has(p.name))
    : [];

  // "Awaiting close" gating — Done Rate is meaningless until enough
  // outcomes are logged. Require ≥20% of items logged before we start
  // showing the rate, so a single Friday-morning close doesn't sink the
  // card to "3% · at risk". During the close cycle stage, always show it.
  const outcomeProgress = metrics.totalCommits > 0
    ? metrics.outcomeLoggedCount / metrics.totalCommits
    : 0;
  // Commit cycle was retired; Summary stays in the pre-close interpretation
  // until enough outcomes (≥20%) have been logged.
  const awaitingClose = metrics.totalCommits > 0 && (outcomeProgress < 0.2);

  const doneRateSub = metrics.totalCommits === 0
    ? "no commitments yet"
    : awaitingClose
      ? "awaiting Friday close"
      : metrics.completionRate >= 60
        ? "on track"
        : metrics.completionRate >= 40
          ? "behind pace"
          : "at risk";

  return (
    <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: space[4] }}>

      {/* ── Historical / out-of-range banner ── */}
      {isHistorical && (
        <div role="status" className="flow-banner-enter" style={{
          background: c.orangeDim, border: `1px solid ${c.orange}66`, borderRadius: layout.radiusLg,
          padding: `${space[3]}px ${space[4]}px`, marginBottom: space[2],
          display: "flex", alignItems: "center", gap: space[2],
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.orange,
        }}>
          <span style={{ fontWeight: 700 }}>Historical view</span>
          <span style={{ color: c.textMid }}>— viewing {selectedWeek === "current" ? weekConfig.weekOf : selectedWeek} (read-only)</span>
        </div>
      )}
      {isOutOfRange && (
        <div role="status" className="flow-banner-enter" style={{
          background: c.redDim, border: `1px solid ${c.red}66`, borderRadius: layout.radiusLg,
          padding: `${space[3]}px ${space[4]}px`, marginBottom: space[2],
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.red,
        }}>
          <span style={{ fontWeight: 700 }}>Out of range</span>
          <span style={{ color: c.textMid, marginLeft: space[2] }}>
            — the Summary page only keeps the last 6 weeks. Showing the most recent available week.
          </span>
        </div>
      )}

      {/* ── Filtered-to-empty banner ── */}
      {filteredToNoCommits && (
        <div role="status" className="flow-banner-enter" style={{
          background: c.surfaceAlt, border: `1px dashed ${c.border}`, borderRadius: layout.radiusLg,
          padding: `${space[3]}px ${space[4]}px`, marginBottom: space[2],
          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid,
        }}>
          Filters match {filteredPeople.length} {filteredPeople.length === 1 ? "person" : "people"} but no commitments this week.
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          KPI GRID — 4 cards: In Ship Phases · Coverage · Done Rate · Active People
          ═══════════════════════════════════════════════════════════ */}
      <KpiGrid>
        <KpiCard
          index={0}
          label="In Ship Phases"
          value={metrics.shippedCount}
          sub="projects in Alpha / Beta / GA"
          delta={prev ? metrics.shippedCount - prev.shippedCount : null}
          deltaLabel="projects"
        >
          <PillRow>
            {shipPhases.map(ph => (
              <Pill key={ph} count={metrics.shipPhaseBreakdown[ph] || 0} label={ph} color={phaseColors()[ph]} />
            ))}
          </PillRow>
        </KpiCard>
        <KpiCard
          index={1}
          label="Commit Coverage"
          value={`${metrics.committedPeople}/${filteredPeople.length}`}
          sub={filteredPeople.length > 0
            ? `${Math.round((metrics.committedPeople / filteredPeople.length) * 100)}% committed · ${metrics.totalCommits} items`
            : "no people in scope"}
          delta={prev ? metrics.committedPeople - prev.committedPeople : null}
          deltaLabel="people"
        >
          <PillRow>
            <Pill count={metrics.committedPeople} label="committed" color={c.green} />
            <Pill count={Math.max(0, filteredPeople.length - metrics.committedPeople)} label="no commit" color={c.textDim} />
          </PillRow>
          {metrics.blockedPeople > 0 && (
            <div style={{ marginTop: space[2] }}>
              <Pill count={metrics.blockedPeople} label="with blocked items" color={c.red} />
            </div>
          )}
        </KpiCard>
        <KpiCard
          index={2}
          label="Done Rate"
          value={awaitingClose ? "—" : `${metrics.completionRate}%`}
          sub={doneRateSub}
          delta={prev && !awaitingClose ? metrics.completionRate - prev.completionRate : null}
          deltaLabel="pts"
        >
          <Sparkline values={allMetrics.slice(-6).map(m => m.completionRate || 0)} color={c.accent} />
        </KpiCard>
        {(() => {
          const activePct = filteredPeople.length > 0
            ? Math.round((metrics.peopleWithTasks / filteredPeople.length) * 100)
            : 0;
          const prevActivePct = prev && prev.totalPeople > 0
            ? Math.round((prev.peopleWithTasks / prev.totalPeople) * 100)
            : null;
          return (
            <KpiCard
              index={3}
              label="Active People"
              value={`${activePct}%`}
              sub={filteredPeople.length > 0
                ? `${metrics.peopleWithTasks}/${filteredPeople.length} with tasks`
                : "no people in scope"}
              delta={prevActivePct != null ? activePct - prevActivePct : null}
              deltaLabel="pts"
            >
              <Sparkline
                values={allMetrics.slice(-6).map(m =>
                  m.totalPeople > 0 ? Math.round((m.peopleWithTasks / m.totalPeople) * 100) : 0
                )}
                color={c.cyan}
              />
            </KpiCard>
          );
        })()}
      </KpiGrid>

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT — charts + tables
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[7] }}>

        {/* ── Projects — bar charts ── */}
        <div>
        <SectionHead title="Projects" />
        <div style={{ padding: `${space[6]}px`, background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusLg, boxShadow: c.shadowCard }}>
          {selectedWeek === "current" && metrics.totalCommits === 0 && (
            <div style={{
              marginBottom: space[4],
              padding: `${space[2]}px ${space[3]}px`,
              background: c.surfaceAlt, border: `1px dashed ${c.border}`,
              borderRadius: layout.radiusSm,
              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid,
            }}>
              Cycle hasn't started — every project will show as Idle until the team declares commitments.
            </div>
          )}
          <div style={{ display: "flex", gap: space[6], flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
            <MiniBarChart title="Active" color={c.green}
              data={allMetrics.map(m => m.activeProjects)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <MiniBarChart title="Idle" color={c.orange}
              data={allMetrics.map(m => m.noActionProjects)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <MiniBarChart title="In Ship Phases" color={c.green}
              data={allMetrics.map(m => m.shippedCount)} labels={weekLabels}
              highlightIndex={selectedIdx} />
          </div>
        </div>
        </div>

        {/* ── People — coverage + attention ── */}
        <div>
        <SectionHead title="People" />
        <div style={{ padding: `${space[6]}px`, background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusLg, boxShadow: c.shadowCard }}>
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

        {/* ── Commit — input (BUILD/JAM mix) first, then outcomes ── */}
        <div>
        <SectionHead title="Commit" />
        <div style={{ padding: `${space[6]}px`, background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusLg, boxShadow: c.shadowCard }}>
          <div>
            <Label>Commit Mix (BUILD / JAM)</Label>
            <div style={{ marginTop: space[3], fontVariantNumeric: "tabular-nums" }}>
              <StackedBarChart series={commitSeries} weekLabels={weekLabels} highlightIndex={selectedIdx} />
            </div>
          </div>
          <div style={{ marginTop: space[6] }}>
            <Label>Outcomes</Label>
            <div style={{ marginTop: space[3], display: "flex", gap: space[6], flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
              <SparkLine title="Done %" color={c.green} suffix="%"
                data={pctDone} labels={weekLabels} highlightIndex={selectedIdx} />
              <SparkLine title="Carried %" color={c.orange} suffix="%"
                data={pctCarried} labels={weekLabels} highlightIndex={selectedIdx} />
            </div>
            <div style={{ marginTop: space[5], fontVariantNumeric: "tabular-nums" }}>
              <StackedBarChart series={outcomeSeries} weekLabels={weekLabels} highlightIndex={selectedIdx} />
            </div>
          </div>
        </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SQUAD BREAKDOWN — data table
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ minWidth: 0 }}>
        <SectionHead title="Squad Performance" />
        <Surface variant="data" compact style={{ padding: 0, overflow: "hidden", maxWidth: "100%" }}>
          <div style={{ overflowX: "auto", maxWidth: "100%", borderRadius: layout.radius, WebkitOverflowScrolling: "touch" }}>
            {allSquads.length === 0 ? (
              <div style={{ padding: space[7], textAlign: "center", fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid }}>
                No squads defined yet.
              </div>
            ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                {/* Group label row — non-sticky; only column-header row sticks so they don't overlap on scroll */}
                <tr>
                  <th aria-label="Squad" style={{ ...thStyle, position: "static", borderBottom: `2px solid ${c.border}`, paddingBottom: space[2] }} />
                  <th colSpan={4} style={{ ...thStyle, position: "static", borderBottom: `2px solid ${c.green}66`, paddingBottom: space[2], textAlign: "center" }}>
                    <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: c.green }}>Projects</span>
                  </th>
                  <th colSpan={2} style={{ ...thStyle, position: "static", borderBottom: `2px solid ${c.cyan}66`, paddingBottom: space[2], textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: c.cyan }}>People</span>
                  </th>
                  <th colSpan={4} style={{ ...thStyle, position: "static", borderBottom: `2px solid ${c.accent}66`, paddingBottom: space[2], textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: c.accent }}>Commit</span>
                  </th>
                </tr>
                {/* Column header row — sortable, keyboard-accessible */}
                <tr>
                  {[
                    { key: "squad", label: "Squad", align: "left", minW: colWidths.squad.min, tip: "Squad name" },
                    { key: "active", label: "Active", minW: colWidths.metric.min, tip: "Projects with at least one commitment this week" },
                    { key: "noAction", label: "Idle", minW: colWidths.metric.min, tip: "Projects with no commitment this week" },
                    { key: "shipped", label: "Shipped", minW: colWidths.metric.min, tip: "Projects currently in Alpha/Beta/GA" },
                    { key: "pctActive", label: "% Active", minW: colWidths.pct.min, tip: "Share of squad's projects that have a commitment" },
                    { key: "pplTotal", label: "Total", minW: colWidths.metric.min, borderL: true, tip: "People in this squad" },
                    { key: "pctPpl", label: "% Engaged", minW: colWidths.pct.min, tip: "Share of squad actively committing" },
                    { key: "commits", label: "Total", minW: colWidths.metric.min, borderL: true, tip: "Commitment items in this squad" },
                    { key: "pctDone", label: "% Done", minW: colWidths.pct.min, tip: "Items with outcome Done (includes Done+Carry)" },
                    { key: "pctBlocked", label: "% Blocked", minW: colWidths.pct.min, tip: "Items marked Blocked" },
                    { key: "pctCarried", label: "% Carried", minW: colWidths.pct.min, tip: "Items marked Carry (pure carry, not Done+Carry)" },
                  ].map(col => {
                    const isSorted = sortCol === col.key;
                    // First column (Squad) gets sticky-left so it stays
                    // visible during horizontal scroll on tablet/mobile.
                    const isSquadCol = col.key === "squad";
                    return (
                      <th
                        key={col.key}
                        role="button"
                        tabIndex={0}
                        className="flow-sort-th"
                        aria-sort={isSorted ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                        title={col.tip}
                        onClick={() => handleSortKey(col.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSortKey(col.key);
                          }
                        }}
                        style={{
                          ...thStyle,
                          textAlign: col.align || "center",
                          minWidth: col.minW,
                          cursor: "pointer",
                          userSelect: "none",
                          ...(col.borderL ? { borderLeft: `1px dotted ${c.border}` } : {}),
                          ...(isSorted ? { color: c.accent } : {}),
                          ...(isSquadCol ? {
                            position: "sticky", left: 0, zIndex: 2,
                            background: c.surfaceAlt || c.surface,
                            boxShadow: `1px 0 0 ${c.border}`,
                          } : {}),
                        }}
                      >
                        {col.label}
                        <span aria-hidden="true" style={{ display: "inline-block", width: 10, marginLeft: 4, opacity: isSorted ? 1 : 0.25 }}>
                          {isSorted ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody key={animKey}>
                {(() => {
                  // Zero-filled fallback so squads with no projects yet (e.g.
                  // a freshly-created squad) still render as an empty row
                  // rather than being dropped from the table.
                  const EMPTY_METRICS = {
                    activeProjects: 0, noActionProjects: 0, shippedCount: 0,
                    commits: 0, outcomeLoggedCount: 0, completionRate: 0,
                    carriedCount: 0, blockedCount: 0,
                    totalPeople: 0, membersActive: 0,
                  };
                  const rowsAll = allSquads.map(sq => {
                    const d = metrics?.squads?.[sq] || EMPTY_METRICS;
                    const sqShipped = d.shippedCount || 0;
                    const projBase = d.activeProjects + d.noActionProjects;
                    const pA = projBase > 0 ? Math.round((d.activeProjects / projBase) * 100) : 0;
                    const pPpl = d.totalPeople > 0 ? Math.round((d.membersActive / d.totalPeople) * 100) : 0;
                    const pD = d.outcomeLoggedCount > 0 ? (d.completionRate || 0) : null;
                    const pC = d.commits > 0 ? Math.round(((d.carriedCount || 0) / d.commits) * 100) : 0;
                    const pB = d.commits > 0 ? Math.round(((d.blockedCount || 0) / d.commits) * 100) : 0;
                    // Inactive = no projects, no commits, no people. These
                    // squads read as either zero or missing — collapse them
                    // behind a footer toggle and render '—' in metric cells.
                    const isInactive = d.activeProjects === 0 && d.noActionProjects === 0 && sqShipped === 0 && d.commits === 0 && d.totalPeople === 0;
                    return { sq, d, sqShipped, pA, pPpl, pD, pC, pB, isInactive };
                  });
                  const inactiveCount = rowsAll.filter(r => r.isInactive).length;
                  const rows = showInactive ? rowsAll : rowsAll.filter(r => !r.isInactive);

                  if (sortCol) {
                    const valFor = (r) => {
                      switch (sortCol) {
                        case "squad": return r.sq;
                        case "active": return r.d.activeProjects;
                        case "noAction": return r.d.noActionProjects;
                        case "shipped": return r.sqShipped;
                        case "pctActive": return r.pA;
                        case "commits": return r.d.commits;
                        case "pctDone": return r.pD ?? -1;
                        case "pctBlocked": return r.pB;
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
                    <tr><td colSpan={11} style={{ ...tdBase, textAlign: "center", color: c.textMid, padding: `${space[7]}px`, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 500, letterSpacing: 0 }}>No squad data for this selection</td></tr>
                  );

                  // Em-dash placeholder for inactive-row metric cells, with
                  // a tooltip so hover reveals WHY it's blank.
                  const emDash = (tip) => (
                    <span title={tip || "No data this week"} style={{ color: c.textDim }}>—</span>
                  );
                  const rendered = rows.map((r, i) => {
                    const { sq, d, sqShipped, pA, pPpl, pD, pC, pB, isInactive } = r;
                    const actClr = pA >= 60 ? c.green : pA >= 40 ? c.orange : c.red;
                    const pplClr = pPpl >= 80 ? c.green : pPpl >= 50 ? c.orange : c.red;
                    const rowOpacity = isInactive ? 0.55 : 1;
                    return (
                      <tr key={sq} className="flow-row" style={{
                        animation: `rowSlideIn 0.3s ${motion.normal.easing} both`,
                        animationDelay: `${Math.min(i * 50, 300)}ms`,
                        opacity: rowOpacity,
                      }}>
                        {/* Sticky first column — stays pinned during horizontal
                            scroll on tablet/mobile where the table overflows. */}
                        <td title={sq} style={{
                          ...tdBase, textAlign: "left",
                          fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                          fontWeight: 600, color: c.text,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200,
                          position: "sticky", left: 0, background: c.surface, zIndex: 1,
                          boxShadow: `1px 0 0 ${c.border}`,
                        }}>{sq}</td>
                        {isInactive ? (
                          <>
                            <td style={{ ...tdBase }}>{emDash("No projects this week")}</td>
                            <td style={{ ...tdBase }}>{emDash("No projects this week")}</td>
                            <td style={{ ...tdBase }}>{emDash("No projects this week")}</td>
                            <td style={{ ...tdBase }}>{emDash("No projects this week")}</td>
                            <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}` }}>{emDash("No people assigned")}</td>
                            <td style={{ ...tdBase }}>{emDash("No people assigned")}</td>
                            <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}` }}>{emDash("No commits this week")}</td>
                            <td style={{ ...tdBase }}>{emDash("No commits this week")}</td>
                            <td style={{ ...tdBase }}>{emDash("No commits this week")}</td>
                            <td style={{ ...tdBase }}>{emDash("No commits this week")}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ ...tdBase, color: c.green }}>{d.activeProjects}</td>
                            <td style={{ ...tdBase, color: d.noActionProjects > 0 ? c.orange : c.textDim }}>{d.noActionProjects}</td>
                            <td style={{ ...tdBase, color: sqShipped > 0 ? c.green : c.textDim }}>{sqShipped}</td>
                            <td style={{ ...tdBase }}>{pctPill(pA, actClr)}</td>
                            <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}`, color: c.text }}>{d.totalPeople}</td>
                            <td style={{ ...tdBase }}>{pctPill(pPpl, pplClr)}</td>
                            <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}`, color: c.text }}>{d.commits}</td>
                            <td style={{ ...tdBase }}>{pD == null ? <span style={{ color: c.textDim }}>—</span> : pctPill(pD, c.green)}</td>
                            <td style={{ ...tdBase }}>{pB > 0 ? pctPill(pB, c.red) : pctPill(0, c.red, true)}</td>
                            <td style={{ ...tdBase }}>{pctPill(pC, c.orange, pC === 0)}</td>
                          </>
                        )}
                      </tr>
                    );
                  });
                  // Footer toggle — surfaces hidden-count and lets the user
                  // expand inactive squads without cluttering the table.
                  if (inactiveCount > 0 && !showInactive) {
                    rendered.push(
                      <tr key="__inactive_toggle__">
                        <td colSpan={11} style={{
                          ...tdBase, textAlign: "center",
                          padding: `${space[3]}px`,
                          background: c.surfaceAlt || c.surface,
                          borderTop: `1px solid ${c.border}`,
                          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                          color: c.textDim, fontWeight: 500, letterSpacing: 0,
                        }}>
                          {inactiveCount} inactive squad{inactiveCount === 1 ? "" : "s"} hidden ·{" "}
                          <button
                            onClick={() => setShowInactive(true)}
                            style={{
                              background: "transparent", border: "none", padding: 0,
                              color: c.accent, textDecoration: "underline", cursor: "pointer",
                              fontFamily: "inherit", fontSize: "inherit", fontWeight: 600,
                            }}
                          >Show all</button>
                        </td>
                      </tr>
                    );
                  } else if (showInactive && inactiveCount > 0) {
                    rendered.push(
                      <tr key="__inactive_toggle__">
                        <td colSpan={11} style={{
                          ...tdBase, textAlign: "center",
                          padding: `${space[3]}px`,
                          background: c.surfaceAlt || c.surface,
                          borderTop: `1px solid ${c.border}`,
                          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                          color: c.textDim, fontWeight: 500, letterSpacing: 0,
                        }}>
                          <button
                            onClick={() => setShowInactive(false)}
                            style={{
                              background: "transparent", border: "none", padding: 0,
                              color: c.accent, textDecoration: "underline", cursor: "pointer",
                              fontFamily: "inherit", fontSize: "inherit", fontWeight: 600,
                            }}
                          >Hide inactive squads</button>
                        </td>
                      </tr>
                    );
                  }
                  return rendered;
                })()}
              </tbody>
            </table>
            )}
          </div>
        </Surface>
        </div>

        {/* ── Needs Attention — uncommitted is current-only (not knowable historically); blocked works any week ── */}
        {(uncommittedPeople.length > 0 || metrics.blockedCount > 0) && (
          <div>
            <SectionHead title="Needs Attention" />
            <div style={{ padding: `${space[6]}px`, background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusLg, boxShadow: c.shadowCard, display: "grid", gridTemplateColumns: selectedWeek === "current" ? "repeat(auto-fit, minmax(260px, 1fr))" : "1fr", gap: space[6] }}>
              {selectedWeek === "current" && (
              <div>
                <Label>No Commitments Yet</Label>
                <div style={{ marginTop: space[3] }}>
                  {uncommittedPeople.length === 0 ? (
                    <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid }}>
                      Everyone has committed.
                    </span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: space[2] }}>
                      {uncommittedPeople.slice(0, 24).map(p => (
                        <button
                          key={p.id || p.name}
                          onClick={() => onNavigate && onNavigate("commit", { person: p.name })}
                          className="flow-chip-btn"
                          style={{
                            fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 500,
                            color: c.text, background: c.surfaceAlt,
                            border: `1px solid ${c.border}`, borderRadius: layout.radiusXs,
                            padding: `${space[2]}px ${space[3]}px`, cursor: "pointer",
                          }}
                          title={`Open ${p.name}'s commitments`}
                        >{p.name}</button>
                      ))}
                      {uncommittedPeople.length > 24 && (
                        <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid, alignSelf: "center" }}>
                          +{uncommittedPeople.length - 24} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )}
              <div>
                <Label>Blocked This Week</Label>
                <div style={{ marginTop: space[3] }}>
                  {metrics.blockedCount === 0 ? (
                    <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid }}>
                      Nothing blocked.
                    </span>
                  ) : (
                    <button
                      onClick={() => onNavigate && onNavigate("pulse", { outcome: "blocked" })}
                      className="flow-chip-btn-danger"
                      aria-label={`${metrics.blockedCount} blocked ${metrics.blockedCount === 1 ? "item" : "items"}, open Pulse`}
                      style={{
                        fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600,
                        color: c.red, background: c.redDim,
                        border: `1px solid ${c.red}66`, borderRadius: layout.radiusSm,
                        padding: `${space[2]}px ${space[4]}px`, cursor: "pointer",
                      }}
                    >
                      {metrics.blockedCount} blocked {metrics.blockedCount === 1 ? "item" : "items"}
                      {metrics.blockedPeople > 0 && ` · ${metrics.blockedPeople} ${metrics.blockedPeople === 1 ? "person" : "people"}`}
                      <span style={{ marginLeft: space[2], color: c.textMid, fontWeight: 500 }}>→ Pulse</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
};

export default SummaryView;
