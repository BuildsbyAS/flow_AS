// Flow — Summary View (Phase 2: full design-system compliance)
// Weekly operating snapshot — polished, cinematic, analytical
import React, { useState, useMemo } from "react";
import { c, typo, space, layout, motion, typeConfig, colWidths } from "../styles/theme";
import { Surface, Label, DeltaIndicator, VDivider, TelemetryLabel, MetricCompact, SummaryTile } from "../components/shared";
import { weekConfig } from "../data/seed";


// ═══════════════════════════════════════════════════════════════
// SVG CHART COMPONENTS — token-compliant
// ═══════════════════════════════════════════════════════════════

const MiniBarChart = ({ data, labels, color, highlightIndex, title, width = 300, height = 170 }) => {
  const padTop = space[7], padBot = space[6], padLR = space[5];
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const max = Math.max(...data, 1) * 1.12;
  const gap = chartW / data.length;
  const barW = gap * 0.6;

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <TelemetryLabel>{title}</TelemetryLabel>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ marginTop: space[2] }}>
        <defs>
          <filter id={`glow-${title.replace(/\s/g,"")}`}>
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.35" />
          </filter>
        </defs>
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={c.border} strokeWidth={0.5} />
        {data.map((val, i) => {
          const barH = Math.max(3, (val / max) * chartH);
          const x = padLR + i * gap + (gap - barW) / 2;
          const y = padTop + chartH - barH;
          const active = i === highlightIndex;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={4}
                fill={color} opacity={active ? 0.95 : 0.22}
                filter={active ? `url(#glow-${title.replace(/\s/g,"")})` : undefined}
                style={{ transition: `all ${motion.critical.duration} ${motion.critical.easing}` }} />
              <text x={x + barW / 2} y={y - 8} textAnchor="middle"
                fill={active ? color : c.textDim}
                style={{ fontFamily: typo.monoLg.font, fontSize: active ? typo.monoLg.size : typo.monoMd.size, fontWeight: 700 }}>{val}</text>
              <text x={x + barW / 2} y={height - 4} textAnchor="middle"
                fill={active ? c.textMid : c.textDim}
                style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: active ? 600 : 400 }}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const SparkLine = ({ data, labels, color, title, suffix = "", highlightIndex, width = 300, height = 170 }) => {
  const padTop = space[7], padBot = space[6], padLR = space[6];
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const max = Math.max(...data, 1) * 1.1;
  const min = Math.min(...data, 0) * 0.9;
  const range = max - min || 1;

  const pts = data.map((val, i) => ({
    x: padLR + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: padTop + chartH - ((val - min) / range) * chartH,
    val,
  }));
  const linePath = pts.map(p => `${p.x},${p.y}`).join(" ");
  const areaPath = `${padLR},${padTop + chartH} ${linePath} ${padLR + chartW},${padTop + chartH}`;

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <TelemetryLabel>{title}</TelemetryLabel>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ marginTop: space[2] }}>
        <defs>
          <linearGradient id={`area-${title.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
          <filter id={`dotglow-${title.replace(/\s/g,"")}`}>
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.4" />
          </filter>
        </defs>
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={c.border} strokeWidth={0.5} />
        <polygon points={areaPath} fill={`url(#area-${title.replace(/\s/g,"")})`} />
        <polyline points={linePath} fill="none" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
        {pts.map((p, i) => {
          const active = i === highlightIndex;
          return (
            <g key={i}>
              {active && <circle cx={p.x} cy={p.y} r={9} fill={color} opacity={0.1} />}
              <circle cx={p.x} cy={p.y} r={active ? 5 : 3}
                fill={active ? color : c.bg} stroke={color} strokeWidth={active ? 2 : 1.5}
                filter={active ? `url(#dotglow-${title.replace(/\s/g,"")})` : undefined} />
              <text x={p.x} y={p.y - 12} textAnchor="middle"
                fill={active ? color : c.textDim}
                style={{ fontFamily: typo.monoLg.font, fontSize: active ? typo.monoLg.size : typo.monoMd.size, fontWeight: 700 }}>{p.val}{suffix}</text>
              <text x={p.x} y={height - 4} textAnchor="middle"
                fill={active ? c.textMid : c.textDim}
                style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: active ? 600 : 400 }}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const StackedBarChart = ({ series, weekLabels, highlightIndex, height = 200 }) => {
  const padTop = space[3], padBot = space[7], padLR = space[5];
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
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={c.border} strokeWidth={0.5} />
        {weekLabels.map((label, wi) => {
          const x = padLR + wi * gap + (gap - barW) / 2;
          const active = wi === highlightIndex;
          let yOffset = padTop + chartH;
          return (
            <g key={wi}>
              {series.map(s => {
                const val = s.values[wi] || 0;
                const segH = maxTotal > 0 ? (val / maxTotal) * chartH : 0;
                yOffset -= segH;
                return segH > 0 ? (
                  <rect key={s.label} x={x} y={yOffset} width={barW} height={segH} rx={3}
                    fill={s.color} opacity={active ? 0.95 : 0.22}
                    style={{ transition: `all ${motion.critical.duration} ${motion.critical.easing}` }} />
                ) : null;
              })}
              <text x={x + barW / 2} y={padTop + chartH - (weekTotals[wi] / maxTotal) * chartH - 8}
                textAnchor="middle" fill={active ? c.text : c.textDim}
                style={{ fontFamily: typo.monoLg.font, fontSize: active ? typo.monoLg.size : typo.monoMd.size, fontWeight: 700 }}>{weekTotals[wi]}</text>
              <text x={x + barW / 2} y={height - 6} textAnchor="middle"
                fill={active ? c.textMid : c.textDim}
                style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: active ? 600 : 400 }}>{label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: space[5] - 2, flexWrap: "wrap", marginTop: space[2] }}>
        {series.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: space[2] - 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{
              fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
              fontWeight: typo.bodyXs.weight, color: c.textMid,
            }}>{s.label}</span>
            <span style={{
              fontFamily: typo.monoLg.font, fontSize: typo.bodyXs.size,
              fontWeight: 700, color: s.color,
            }}>
              {s.values.reduce((a, b) => a + b, 0)}
            </span>
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
    const items = commitments.flatMap(cm =>
      cm.items.filter((_, idx) => cm.deselected !== idx).map(it => ({ ...it, person: cm.person }))
    );
    const totalCommits = items.length;
    const activeProjects = new Set(items.map(it => it.project)).size;
    const noActionProjects = totalProjects - activeProjects;
    const shippedCount = projects.filter(p => p.ship).length;
    const peopleWithTasks = new Set(items.map(it => it.person)).size;
    const blockedCount = items.filter(it => it.type === "BLOCKED").length;
    const buildCount = items.filter(it => it.type === "BUILD").length;
    const jamCount = items.filter(it => it.type === "JAM").length;
    const commitCount = items.filter(it => it.type === "COMMIT").length;
    const carriedCount = jamCount + commitCount;
    const deliveryRate = totalCommits > 0 ? Math.round((buildCount / totalCommits) * 100) : 0;
    const committedPeople = commitments.filter(cm => cm.items.length > 0).length;

    const squads = {};
    allSquads.forEach(sq => {
      const sqProjects = projects.filter(p => p.squad === sq);
      const sqPeople = people.filter(p => p.squad === sq);
      const sqItems = items.filter(it => {
        const proj = projects.find(p => p.id === it.project);
        return proj?.squad === sq;
      });
      const sqActive = new Set(sqItems.map(it => it.project)).size;
      const sqMembersActive = sqPeople.filter(p => items.some(it => it.person === p.name)).length;
      const sqBuild = sqItems.filter(it => it.type === "BUILD").length;
      const sqBlocked = sqItems.filter(it => it.type === "BLOCKED").length;
      squads[sq] = {
        commits: sqItems.length, activeProjects: sqActive,
        noActionProjects: sqProjects.length - sqActive, totalProjects: sqProjects.length,
        membersActive: sqMembersActive, totalPeople: sqPeople.length,
        buildCount: sqBuild, blockedCount: sqBlocked,
        deliveryRate: sqItems.length > 0 ? Math.round((sqBuild / sqItems.length) * 100) : 0,
      };
    });

    return {
      totalCommits, activeProjects, noActionProjects, totalProjects, shippedCount,
      peopleWithTasks, totalPeople, committedPeople,
      blockedCount, buildCount, jamCount, commitCount, carriedCount, deliveryRate, squads,
    };
  } else {
    const entries = [];
    Object.entries(history).forEach(([projId, weeks]) => {
      const weekData = weeks.find(w => w.week === weekKey);
      if (weekData) weekData.entries.forEach(e => entries.push({ ...e, project: projId }));
    });

    const totalCommits = entries.length;
    const activeProjects = new Set(entries.map(e => e.project)).size;
    const noActionProjects = totalProjects - activeProjects;
    const shippedCount = projects.filter(p => p.ship).length;
    const peopleWithTasks = new Set(entries.map(e => e.person)).size;
    const blockedCount = entries.filter(e => e.type === "BLOCKED").length;
    const buildCount = entries.filter(e => e.type === "BUILD").length;
    const jamCount = entries.filter(e => e.type === "JAM").length;
    const commitCount = entries.filter(e => e.type === "COMMIT").length;
    const carriedCount = jamCount + commitCount;
    const committedPeople = peopleWithTasks;
    const deliveryRate = totalCommits > 0 ? Math.round((buildCount / totalCommits) * 100) : 0;

    const squads = {};
    allSquads.forEach(sq => {
      const sqProjects = projects.filter(p => p.squad === sq);
      const sqPeople = people.filter(p => p.squad === sq);
      const sqEntries = entries.filter(e => {
        const proj = projects.find(p => p.id === e.project);
        return proj?.squad === sq;
      });
      const sqActive = new Set(sqEntries.map(e => e.project)).size;
      const sqMembersActive = sqPeople.filter(p => entries.some(e => e.person === p.name)).length;
      const sqBuild = sqEntries.filter(e => e.type === "BUILD").length;
      const sqBlocked = sqEntries.filter(e => e.type === "BLOCKED").length;
      squads[sq] = {
        commits: sqEntries.length, activeProjects: sqActive,
        noActionProjects: sqProjects.length - sqActive, totalProjects: sqProjects.length,
        membersActive: sqMembersActive, totalPeople: sqPeople.length,
        buildCount: sqBuild, blockedCount: sqBlocked,
        deliveryRate: sqEntries.length > 0 ? Math.round((sqBuild / sqEntries.length) * 100) : 0,
      };
    });

    return {
      totalCommits, activeProjects, noActionProjects, totalProjects, shippedCount,
      peopleWithTasks, totalPeople, committedPeople,
      blockedCount, buildCount, jamCount, commitCount, carriedCount, deliveryRate, squads,
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// SUMMARY VIEW
// ═══════════════════════════════════════════════════════════════
const SummaryView = ({ history, commitments, projects, people }) => {
  const [selectedWeek, setSelectedWeek] = useState("current");
  const tc = typeConfig();

  // Week tabs — newest first
  const weeks = useMemo(() => {
    const tabs = [{ key: "current", label: weekConfig.weekOf, isCurrent: true }];
    tabs.push(...[...weekConfig.historyWeeks].reverse().map(w => ({ key: w, label: w })));
    return tabs;
  }, []);

  const dataCtx = useMemo(() => ({ history, commitments, projects, people }), [history, commitments, projects, people]);

  // All 5 weeks in chronological order
  const allMetrics = useMemo(() => {
    const chrono = [...weeks].reverse();
    return chrono.map(w => ({
      weekKey: w.key, label: w.label, isCurrent: w.isCurrent || false,
      ...computeWeekMetrics(w.key, dataCtx),
    }));
  }, [weeks, dataCtx]);

  const selectedIdx = allMetrics.findIndex(m => m.weekKey === selectedWeek);
  const metrics = allMetrics[selectedIdx] || allMetrics[allMetrics.length - 1];
  const prev = selectedIdx > 0 ? allMetrics[selectedIdx - 1] : null;
  const weekLabels = allMetrics.map(m => m.isCurrent ? "Now" : m.label);
  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();

  // Chart data
  const pctDone = allMetrics.map(m => m.totalCommits > 0 ? Math.round((m.buildCount / m.totalCommits) * 100) : 0);
  const pctBlocked = allMetrics.map(m => m.totalCommits > 0 ? Math.round((m.blockedCount / m.totalCommits) * 100) : 0);
  const pctCarried = allMetrics.map(m => m.totalCommits > 0 ? Math.round((m.carriedCount / m.totalCommits) * 100) : 0);
  const commitSeries = [
    { label: "Build", color: tc.BUILD?.color || c.green, values: allMetrics.map(m => m.buildCount) },
    { label: "Jam", color: tc.JAM?.color || c.blue, values: allMetrics.map(m => m.jamCount) },
    { label: "Commit", color: tc.COMMIT?.color || c.purple, values: allMetrics.map(m => m.commitCount) },
    { label: "Blocked", color: tc.BLOCKED?.color || c.red, values: allMetrics.map(m => m.blockedCount) },
  ];

  // ─── Table helpers (token-compliant) ───
  const thStyle = {
    padding: `${space[2]}px ${space[2] - 2}px`, textAlign: "left",
    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
    fontWeight: 600, letterSpacing: "0",
    color: c.textMid, borderBottom: `1px solid ${c.border}`,
    background: c.bg, position: "sticky", top: 0, zIndex: 2,
    whiteSpace: "nowrap",
  };
  const tdBase = {
    padding: `${space[2] - 2}px ${space[2] - 2}px`,
    fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
    fontWeight: typo.monoLg.weight,
    textAlign: "center", borderBottom: `1px dotted ${c.border}`,
  };
  const pctPill = (val, color, muted) => (
    <span style={{
      fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
      fontWeight: 700,
      color: muted ? c.textDim : color,
      background: muted ? "transparent" : `${color}10`,
      padding: `2px ${space[2] - 2}px`, borderRadius: layout.radiusSm,
    }}>{val}%</span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ═══════════════════════════════════════════════════════════
          STICKY HEADER — Week selector + Mission Grid
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position: "sticky", top: 92, zIndex: 10,
        background: c.bg, paddingBottom: space[3],
      }}>

        {/* Week selector */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3] - 2, marginBottom: space[3] }}>
          <div style={{
            display: "flex", gap: 2, background: c.accentDim,
            borderRadius: layout.radiusMd, padding: 3,
          }}>
            {weeks.map(w => (
              <button key={w.key} onClick={() => setSelectedWeek(w.key)} style={{
                padding: `${space[2] - 2}px ${space[3]}px`,
                borderRadius: layout.radiusMd, border: "none", cursor: "pointer",
                background: selectedWeek === w.key ? c.accent : "transparent",
                color: selectedWeek === w.key ? c.textCrit : c.accent,
                fontFamily: typo.monoMd.font, fontSize: typo.bodyXs.size,
                fontWeight: selectedWeek === w.key ? 700 : 500,
                letterSpacing: typo.monoMd.tracking,
                whiteSpace: "nowrap",
                transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                boxShadow: selectedWeek === w.key ? `0 1px 3px ${c.shadow}` : "none",
                display: "flex", alignItems: "center", gap: space[1],
              }}>
                {w.label}
                {w.isCurrent && (
                  <span style={{
                    fontSize: typo.monoSm.size, fontWeight: 700,
                    padding: `1px ${space[1]}px`, borderRadius: layout.radiusTag,
                    background: selectedWeek === w.key ? `${c.textCrit}25` : `${c.accent}30`,
                    color: selectedWeek === w.key ? c.textCrit : c.accent,
                  }}>NOW</span>
                )}
              </button>
            ))}
          </div>
          {prev && (
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
              fontWeight: typo.monoSm.weight, color: c.textDim,
            }}>
              vs {prev.label}
            </span>
          )}
        </div>

        {/* Mission Grid — hero strip with group labels */}
        <div className="flow-mission-grid" style={{ padding: `${space[3]}px ${space[4]}px` }}>
          <div style={{
            display: "flex", alignItems: "center", gap: space[1],
            flexWrap: "wrap", position: "relative", zIndex: 1,
          }}>
            {/* Projects group */}
            <TelemetryLabel style={{ marginRight: space[1] }}>Projects</TelemetryLabel>
            <SummaryTile value={metrics.totalProjects} label="Total" color={c.text} />
            <SummaryTile value={metrics.activeProjects} label="Active" color={c.green} prevValue={prev?.activeProjects} active />
            <SummaryTile value={metrics.noActionProjects} label="No action" color={c.orange} prevValue={prev?.noActionProjects} />
            <SummaryTile value={metrics.shippedCount} label="Shipped" color={c.green} prevValue={prev?.shippedCount} />

            <VDivider />

            {/* Focus metrics */}
            <TelemetryLabel style={{ marginRight: space[1] }}>Focus</TelemetryLabel>
            <MetricCompact value={metrics.totalCommits} label="Commits" color={c.text} prevValue={prev?.totalCommits} />
            <MetricCompact value={metrics.blockedCount} label="Blocked" color={metrics.blockedCount > 0 ? c.red : c.textDim} prevValue={prev?.blockedCount} />
            <MetricCompact value={metrics.deliveryRate} label="Build %" color={metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red} />

            <VDivider />

            {/* People metrics */}
            <TelemetryLabel style={{ marginRight: space[1] }}>People</TelemetryLabel>
            <MetricCompact value={metrics.totalPeople} label="Total" color={c.text} />
            <MetricCompact value={metrics.peopleWithTasks} label="Active" color={c.cyan} prevValue={prev?.peopleWithTasks} />

            <VDivider />

            {/* Delivery Rate bar */}
            <div style={{ display: "flex", alignItems: "center", gap: space[2], flex: 1, minWidth: 120 }}>
              <TelemetryLabel style={{ flexShrink: 0 }}>Delivery</TelemetryLabel>
              <div style={{
                flex: 1, height: 6, borderRadius: layout.radiusTag,
                background: c.surfaceAlt, overflow: "hidden",
              }}>
                <div style={{
                  width: `${Math.min(100, metrics.deliveryRate)}%`, height: "100%",
                  borderRadius: layout.radiusTag,
                  background: `linear-gradient(90deg, ${metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red}80, ${metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red})`,
                  transition: `width ${motion.critical.duration} ${motion.critical.easing}`,
                }} />
              </div>
              <span style={{
                fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                fontWeight: 800, letterSpacing: typo.monoMd.tracking, flexShrink: 0,
                color: metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red,
              }}>{metrics.deliveryRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CHARTS
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: space[4], marginTop: space[1] }}>

        {/* ── Projects — bar charts ── */}
        <Surface variant="data" style={{ padding: `${space[4] - 2}px ${space[4]}px`, overflow: "hidden" }}>
          <Label style={{ color: c.green }}>Projects — Week over Week</Label>
          <div style={{ display: "flex", gap: space[5], marginTop: space[3] }}>
            <MiniBarChart title="Active" color={c.green}
              data={allMetrics.map(m => m.activeProjects)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <MiniBarChart title="No Action" color={c.orange}
              data={allMetrics.map(m => m.noActionProjects)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <MiniBarChart title="Shipped" color={c.cyan}
              data={allMetrics.map(m => m.shippedCount)} labels={weekLabels}
              highlightIndex={selectedIdx} />
          </div>
        </Surface>

        {/* ── Focus — sparklines + stacked bar ── */}
        <Surface variant="data" style={{ padding: `${space[4] - 2}px ${space[4]}px`, overflow: "hidden" }}>
          <Label style={{ color: c.accent }}>Focus — Week over Week</Label>
          <div style={{ display: "flex", gap: space[5], marginTop: space[3] }}>
            <SparkLine title="Delivery Rate" color={c.green} suffix="%"
              data={pctDone} labels={weekLabels} highlightIndex={selectedIdx} />
            <SparkLine title="Blocked %" color={c.red} suffix="%"
              data={pctBlocked} labels={weekLabels} highlightIndex={selectedIdx} />
            <SparkLine title="Carried %" color={c.accent} suffix="%"
              data={pctCarried} labels={weekLabels} highlightIndex={selectedIdx} />
          </div>
          <div style={{ marginTop: space[4] }}>
            <Label>Commit Breakdown</Label>
            <div style={{ marginTop: space[2] }}>
              <StackedBarChart series={commitSeries} weekLabels={weekLabels} highlightIndex={selectedIdx} />
            </div>
          </div>
        </Surface>

        {/* ── People — bar + sparkline ── */}
        <Surface variant="data" style={{ padding: `${space[4] - 2}px ${space[4]}px`, overflow: "hidden" }}>
          <Label style={{ color: c.cyan }}>People — Week over Week</Label>
          <div style={{ display: "flex", gap: space[5], marginTop: space[3] }}>
            <MiniBarChart title="Active People" color={c.cyan}
              data={allMetrics.map(m => m.peopleWithTasks)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <SparkLine title="Committed" color={c.purple}
              data={allMetrics.map(m => m.committedPeople)} labels={weekLabels}
              highlightIndex={selectedIdx} />
          </div>
        </Surface>

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
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.green }}>Projects</span>
                  </th>
                  <th colSpan={4} style={{ ...thStyle, borderBottom: `2px solid ${c.accent}30`, paddingBottom: space[1], textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.accent }}>Focus</span>
                  </th>
                  <th colSpan={2} style={{ ...thStyle, borderBottom: `2px solid ${c.cyan}30`, paddingBottom: space[1], textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.cyan }}>People</span>
                  </th>
                </tr>
                {/* Column header row */}
                <tr>
                  <th style={{ ...thStyle, textAlign: "left", minWidth: colWidths.squad.min }}>Squad</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.metric.min }}>Active</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.metric.min }}>No Act.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.metric.min }}>Ship</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.pct.min }}>% Act.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.metric.min, borderLeft: `1px dotted ${c.border}` }}>Total</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.pct.min }}>% Comp.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.pct.min }}>% Blk.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.pct.min }}>% Carry</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.metric.min, borderLeft: `1px dotted ${c.border}` }}>Total</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: colWidths.pct.min }}>% Active</th>
                </tr>
              </thead>
              <tbody>
                {allSquads.map((sq, i) => {
                  const d = metrics.squads[sq];
                  if (!d) return null;
                  const sqProjects = projects.filter(p => p.squad === sq);
                  const sqShipped = sqProjects.filter(p => p.ship).length;
                  const sqCarried = Math.max(0, d.commits - d.buildCount - d.blockedCount);
                  const projBase = d.activeProjects + d.noActionProjects;
                  const pA = projBase > 0 ? Math.round((d.activeProjects / projBase) * 100) : 0;
                  const pPpl = d.totalPeople > 0 ? Math.round((d.membersActive / d.totalPeople) * 100) : 0;
                  const pD = d.commits > 0 ? Math.round((d.buildCount / d.commits) * 100) : 0;
                  const pB = d.commits > 0 ? Math.round((d.blockedCount / d.commits) * 100) : 0;
                  const pC = d.commits > 0 ? Math.round((sqCarried / d.commits) * 100) : 0;
                  const actClr = pA >= 60 ? c.green : pA >= 40 ? c.orange : c.red;
                  const pplClr = pPpl >= 80 ? c.green : pPpl >= 50 ? c.orange : c.red;

                  return (
                    <tr key={sq} className="flow-row" style={{
                      animation: `rowSlideIn 0.3s ${motion.critical.easing} both`,
                      animationDelay: `${Math.min(i * 30, 300)}ms`,
                    }}>
                      <td style={{
                        ...tdBase, textAlign: "left",
                        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                        fontWeight: 600, color: c.text,
                      }}>
                        {sq}
                      </td>
                      <td style={{ ...tdBase, color: c.green }}>{d.activeProjects}</td>
                      <td style={{ ...tdBase, color: d.noActionProjects > 0 ? c.orange : c.textDim }}>{d.noActionProjects}</td>
                      <td style={{ ...tdBase, color: sqShipped > 0 ? c.green : c.textDim }}>{sqShipped}</td>
                      <td style={{ ...tdBase }}>{pctPill(pA, actClr)}</td>
                      <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}`, color: c.text }}>{d.commits}</td>
                      <td style={{ ...tdBase }}>{pctPill(pD, c.green)}</td>
                      <td style={{ ...tdBase }}>{pctPill(pB, c.red, d.blockedCount === 0)}</td>
                      <td style={{ ...tdBase }}>{pctPill(pC, c.accent)}</td>
                      <td style={{ ...tdBase, borderLeft: `1px dotted ${c.border}`, color: c.text }}>{d.totalPeople}</td>
                      <td style={{ ...tdBase }}>{pctPill(pPpl, pplClr)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Surface>

      </div>
    </div>
  );
};

export default SummaryView;
