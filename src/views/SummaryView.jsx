// Flow — Summary View (Phase 2: full design-system compliance)
// Weekly operating snapshot — polished, cinematic, analytical
import React, { useState, useMemo } from "react";
import { c, typo, space, layout, motion, typeConfig, colWidths, shipPhases } from "../styles/theme";
import { Surface, Label, DeltaIndicator, VDivider, TelemetryLabel, MetricCompact, SummaryTile, KPIBar, EmptyState } from "../components/shared";
import useDevLabel from "../hooks/useDevLabel";


// ═══════════════════════════════════════════════════════════════
// SVG CHART COMPONENTS — token-compliant
// ═══════════════════════════════════════════════════════════════

const MiniBarChart = ({ data, labels, color, highlightIndex, title, width = 300, height = 170 }) => {
  const devRef = useDevLabel('MiniBarChart', 'src/views/SummaryView.jsx', 'SVG bar chart comparing KPI values across weeks');
  const [hoverIdx, setHoverIdx] = useState(null);
  if (data.length === 0) return <div style={{ flex: 1, minWidth: 180, height, display: "flex", alignItems: "center", justifyContent: "center", color: c.textDim, fontFamily: typo.bodyMd.font, fontSize: 14 }}>No data</div>;

  const padTop = space[7], padBot = space[6], padLR = space[5];
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const max = Math.max(...data, 1) * 1.12;
  const gap = chartW / data.length;
  const barW = gap * 0.6;
  const filterId = `glow-${title.replace(/[^a-zA-Z0-9]/g,"")}`;

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIdx(null)}>
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={c.border} strokeWidth={0.5} />
        {data.map((val, i) => {
          const barH = Math.max(3, (val / max) * chartH);
          const x = padLR + i * gap + (gap - barW) / 2;
          const y = padTop + chartH - barH;
          const active = i === highlightIndex;
          const hovered = hoverIdx === i && !active;
          const lit = active || hovered;
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: "pointer" }}>
              {/* Invisible hit area spanning full column height */}
              <rect x={padLR + i * gap} y={padTop} width={gap} height={chartH + padBot}
                fill="transparent" />
              <rect x={x} y={y} width={barW} height={barH} rx={2}
                fill={color} opacity={lit ? 0.9 : 0.35}
                style={{ transition: `opacity ${motion.fast.duration} ${motion.fast.easing}` }} />
              <text x={x + barW / 2} y={y - 8} textAnchor="middle"
                fill={lit ? color : c.textDim}
                style={{ fontFamily: typo.monoLg.font, fontSize: lit ? typo.monoLg.size : typo.monoMd.size, fontWeight: 700, transition: `all ${motion.interaction.duration}` }}>{val}</text>
              <text x={x + barW / 2} y={height - 4} textAnchor="middle"
                fill={lit ? c.textMid : c.textDim}
                style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: lit ? 600 : 400, transition: `all ${motion.interaction.duration}` }}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      <div style={{
        padding: `${space[2]}px ${space[3]}px`, marginTop: space[1],
        background: c.surfaceAlt, borderRadius: layout.radiusSm,
        textAlign: "center",
      }}>
        <TelemetryLabel>{title}</TelemetryLabel>
      </div>
    </div>
  );
};

const SparkLine = ({ data, labels, color, title, suffix = "", highlightIndex, width = 300, height = 170 }) => {
  const devRef = useDevLabel('SparkLine', 'src/views/SummaryView.jsx', 'SVG sparkline with gradient area fill and interactive data points');
  const [hoverIdx, setHoverIdx] = useState(null);
  const padTop = space[7], padBot = space[6], padLR = space[6];
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const max = Math.max(...data, 1) * 1.1;
  const min = Math.min(...data, 0) * 0.9;
  const range = max - min || 1;
  const safeTitle = title.replace(/[^a-zA-Z0-9]/g,"");

  if (data.length === 0) return <div style={{ flex: 1, minWidth: 180, height, display: "flex", alignItems: "center", justifyContent: "center", color: c.textDim, fontFamily: typo.bodyMd.font, fontSize: 14 }}>No data</div>;

  const pts = data.map((val, i) => ({
    x: padLR + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: padTop + chartH - ((val - min) / range) * chartH,
    val,
  }));
  const linePath = pts.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = data.length > 1 ? `${padLR},${padTop + chartH} ${linePath} ${padLR + chartW},${padTop + chartH}` : "";
  // Compute hit zone boundaries for each point
  const hitZones = pts.map((p, i) => {
    const left = i === 0 ? padLR : (pts[i - 1].x + p.x) / 2;
    const right = i === pts.length - 1 ? padLR + chartW : (p.x + pts[i + 1].x) / 2;
    return { left, right };
  });

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id={`area-${safeTitle}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={c.border} strokeWidth={0.5} />
        {areaPath && <polygon points={areaPath} fill={`url(#area-${safeTitle})`} />}
        <polyline points={linePath} fill="none" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
        {pts.map((p, i) => {
          const active = i === highlightIndex;
          const hovered = hoverIdx === i && !active;
          const lit = active || hovered;
          const hz = hitZones[i];
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: "pointer" }}>
              {/* Invisible hit area */}
              <rect x={hz.left} y={padTop} width={hz.right - hz.left} height={chartH + padBot}
                fill="transparent" />
              {lit && <circle cx={p.x} cy={p.y} r={9} fill={color} opacity={0.1} />}
              <circle cx={p.x} cy={p.y} r={lit ? 5 : 3}
                fill={lit ? color : c.surface} stroke={color} strokeWidth={lit ? 2 : 1.5}
                style={{ transition: `r ${motion.fast.duration} ${motion.fast.easing}` }} />
              <text x={p.x} y={p.y - 12} textAnchor="middle"
                fill={lit ? color : c.textDim}
                style={{ fontFamily: typo.monoLg.font, fontSize: lit ? typo.monoLg.size : typo.monoMd.size, fontWeight: 700, transition: `all ${motion.interaction.duration}` }}>{p.val}{suffix}</text>
              <text x={p.x} y={height - 4} textAnchor="middle"
                fill={lit ? c.textMid : c.textDim}
                style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: lit ? 600 : 400, transition: `all ${motion.interaction.duration}` }}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      <div style={{
        padding: `${space[2]}px ${space[3]}px`, marginTop: space[1],
        background: c.surfaceAlt, borderRadius: layout.radiusSm,
        textAlign: "center",
      }}>
        <TelemetryLabel>{title}</TelemetryLabel>
      </div>
    </div>
  );
};

const StackedBarChart = ({ series, weekLabels, highlightIndex, height = 220 }) => {
  const devRef = useDevLabel('StackedBarChart', 'src/views/SummaryView.jsx', 'Stacked bar chart showing commit breakdown by BUILD and JAM types');
  const [hoverIdx, setHoverIdx] = useState(null);
  const padTop = space[7], padBot = space[7], padLR = space[5] + 28;
  const width = 700;
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const weekTotals = weekLabels.map((_, wi) =>
    series.reduce((sum, s) => sum + (s.values[wi] || 0), 0)
  );
  const maxTotal = Math.max(...weekTotals, 1);
  const gap = chartW / weekLabels.length;
  const barW = gap * 0.52;

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIdx(null)}>
        {/* Y-axis gridlines & labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const yVal = Math.round(maxTotal * pct);
          const y = padTop + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={padLR} y1={y} x2={width - padLR} y2={y}
                stroke={c.border} strokeWidth={0.5} strokeDasharray={pct === 0 ? "none" : "3,3"} opacity={pct === 0 ? 1 : 0.5} />
              {pct > 0 && (
                <text x={padLR - 6} y={y + 3} textAnchor="end"
                  fill={c.textDim} style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 400 }}>
                  {yVal}
                </text>
              )}
            </g>
          );
        })}
        {weekLabels.map((label, wi) => {
          const x = padLR + wi * gap + (gap - barW) / 2;
          const active = wi === highlightIndex;
          const hovered = hoverIdx === wi && !active;
          const lit = active || hovered;
          let yOffset = padTop + chartH;
          // Build tooltip with per-series breakdown
          const breakdown = series.map(s => `${s.label}: ${s.values[wi] || 0}`).join("  ·  ");
          return (
            <g key={wi} onMouseEnter={() => setHoverIdx(wi)} style={{ cursor: "pointer" }}>
              {/* Invisible hit area spanning full column */}
              <rect x={padLR + wi * gap} y={padTop} width={gap} height={chartH + padBot}
                fill="transparent" />
              {series.map(s => {
                const val = s.values[wi] || 0;
                const segH = maxTotal > 0 ? (val / maxTotal) * chartH : 0;
                yOffset -= segH;
                return segH > 0 ? (
                  <rect key={s.label} x={x} y={yOffset} width={barW} height={segH} rx={layout.radiusTag}
                    fill={s.color} opacity={lit ? 0.95 : 0.22}
                    style={{ transition: `all ${motion.critical.duration} ${motion.critical.easing}` }} />
                ) : null;
              })}
              <text x={x + barW / 2} y={padTop + chartH - (weekTotals[wi] / maxTotal) * chartH - 8}
                textAnchor="middle" fill={lit ? c.text : c.textDim}
                style={{ fontFamily: typo.monoLg.font, fontSize: lit ? typo.monoLg.size : typo.monoMd.size, fontWeight: 700, transition: `all ${motion.interaction.duration}` }}>{weekTotals[wi]}</text>
              <text x={x + barW / 2} y={height - 6} textAnchor="middle"
                fill={lit ? c.textMid : c.textDim}
                style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: lit ? 600 : 400, transition: `all ${motion.interaction.duration}` }}>{label}</text>
              {/* Native tooltip with breakdown */}
              <title>{`${label}: ${weekTotals[wi]} total\n${breakdown}`}</title>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: space[5], flexWrap: "wrap", marginTop: space[2], justifyContent: "center" }}>
        {series.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{
              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
              fontWeight: 500, color: c.textMid,
            }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


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
    fontFamily: typo.bodyMd.font, fontSize: 16,
    fontWeight: 600, letterSpacing: "0",
    color: c.textMid, borderBottom: `1px solid ${c.border}`,
    background: c.bg, position: "sticky", top: "var(--flow-sticky-top, 0px)", zIndex: 2,
    whiteSpace: "nowrap",
  };
  const tdBase = {
    padding: `${space[2]}px ${space[3]}px`,
    fontFamily: typo.monoLg.font, fontSize: 14,
    fontWeight: typo.monoLg.weight,
    textAlign: "center", borderBottom: `1px dotted ${c.border}`,
  };
  const pctPill = (val, color, muted) => (
    <span style={{
      fontFamily: typo.monoMd.font, fontSize: 14,
      fontWeight: 700,
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
          KPI strip — scrolls with the page
          ═══════════════════════════════════════════════════════════ */}
      <KPIBar>
          <SummaryTile value={metrics.activeProjects} prevValue={prev?.activeProjects} label="Active Projects" color={c.green} />
          <SummaryTile value={metrics.noActionProjects} prevValue={prev?.noActionProjects} label="Idle Projects" color={metrics.noActionProjects > 0 ? c.orange : c.textDim} />
          <SummaryTile value={metrics.totalCommits} prevValue={prev?.totalCommits} label="Total Commits" color={c.accent} />
          <SummaryTile value={metrics.completionRate} prevValue={prev?.completionRate} label="Done Rate" suffix="%" color={metrics.completionRate >= 60 ? c.green : c.orange} />
          <SummaryTile value={metrics.peopleWithTasks} prevValue={prev?.peopleWithTasks} label="Active People" color={c.cyan} />
          <SummaryTile value={metrics.shippedCount} prevValue={prev?.shippedCount} label="Shipped" color={metrics.shippedCount > 0 ? c.green : c.textDim} />
      </KPIBar>

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT — charts + tables (only this area scrolls)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[7] }}>

        {/* ── Projects — bar charts ── */}
        <div className="flow-mission-grid" style={{ padding: `${space[6]}px` }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <Label style={{ color: c.green }}>Projects</Label>
            <div style={{ display: "flex", gap: space[6], marginTop: space[4], flexWrap: "wrap" }}>
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

        {/* ── Commit — sparklines + stacked bar ── */}
        <div className="flow-mission-grid" style={{ padding: `${space[6]}px` }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <Label style={{ color: c.accent }}>Commit</Label>
            <div style={{ display: "flex", gap: space[6], marginTop: space[4], flexWrap: "wrap" }}>
              <SparkLine title="Done %" color={c.green} suffix="%"
                data={pctDone} labels={weekLabels} highlightIndex={selectedIdx} />
              <SparkLine title="Carried %" color={c.cyan} suffix="%"
                data={pctCarried} labels={weekLabels} highlightIndex={selectedIdx} />
            </div>
            <div style={{ marginTop: space[6] }}>
              <Label>Commit Breakdown</Label>
              <div style={{ marginTop: space[3] }}>
                <StackedBarChart series={commitSeries} weekLabels={weekLabels} highlightIndex={selectedIdx} />
              </div>
            </div>
          </div>
        </div>

        {/* ── People — bar + sparkline ── */}
        <div className="flow-mission-grid" style={{ padding: `${space[6]}px` }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <Label style={{ color: c.cyan }}>People</Label>
            <div style={{ display: "flex", gap: space[6], marginTop: space[4], flexWrap: "wrap" }}>
              <MiniBarChart title="Active People" color={c.cyan}
                data={allMetrics.map(m => m.peopleWithTasks)} labels={weekLabels}
                highlightIndex={selectedIdx} />
              <SparkLine title="Committed" color={c.purple}
                data={allMetrics.map(m => m.committedPeople)} labels={weekLabels}
                highlightIndex={selectedIdx} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SQUAD BREAKDOWN — data table
            ═══════════════════════════════════════════════════════════ */}
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
  );
};

export default SummaryView;
