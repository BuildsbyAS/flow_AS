// Flow — Summary View (full-page weekly summary tab)
// Mirrors Pulse design language: mission-grid strip, compact tiles, dotted-border tables
import React, { useState, useMemo } from "react";
import { c, display, body, mono, typeConfig, layout } from "../styles/theme";
import { weekConfig } from "../data/seed";

// ─── Delta token (matches Pulse DeltaToken) ──────────────────
const Delta = ({ current, previous }) => {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  const up = diff > 0;
  const clr = up ? c.green : c.red;
  return (
    <span style={{
      fontFamily: mono, fontSize: 9, fontWeight: 700, color: clr,
      display: "inline-flex", alignItems: "center", gap: 1,
    }}>
      <span style={{ fontSize: 6 }}>{up ? "▲" : "▼"}</span>{up ? "+" : ""}{diff}
    </span>
  );
};

// ─── Summary Tile (matches Pulse SummaryTile) ────────────────
const Tile = ({ value, label, color, prevValue, active }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "10px 12px", minWidth: 56, borderRadius: 8, cursor: "default",
    background: active ? `${color}12` : "transparent",
    border: active ? `1px solid ${color}40` : "1px solid transparent",
    transition: "all 0.15s",
  }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      <span style={{
        fontFamily: display, fontSize: 20, fontWeight: 800, color: value > 0 ? color : c.textDim,
        lineHeight: 1, letterSpacing: "-0.02em",
      }}>{value}</span>
      {prevValue !== undefined && <Delta current={value} previous={prevValue} />}
    </div>
    <span style={{
      fontFamily: body, fontSize: 10, fontWeight: 700,
      color: active ? color : c.textMid, letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>{label}</span>
  </div>
);

// ─── Summary Metric (matches Pulse SummaryMetric) ────────────
const Metric = ({ value, label, color, prevValue }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 8px", minWidth: 48 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      <span style={{
        fontFamily: display, fontSize: 18, fontWeight: 800, color,
        lineHeight: 1, letterSpacing: "-0.02em",
      }}>{value}</span>
      {prevValue !== undefined && <Delta current={value} previous={prevValue} />}
    </div>
    <span style={{
      fontFamily: mono, fontSize: 8, fontWeight: 600, color: c.textDim,
      letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{label}</span>
  </div>
);

// ─── Vertical divider (matches Pulse summary strip) ──────────
const VDivider = () => (
  <div style={{ width: 1, height: 36, background: c.border, margin: "0 6px", flexShrink: 0 }} />
);

// ─── Section label (mono uppercase, Pulse-style) ─────────────
const SectionLabel = ({ children, color }) => (
  <span style={{
    fontFamily: mono, fontSize: 9, fontWeight: 700,
    color: color || c.textDim, letterSpacing: "0.08em",
    textTransform: "uppercase",
  }}>{children}</span>
);


// ═══════════════════════════════════════════════════════════════
// SVG CHART COMPONENTS — Pulse-themed
// ═══════════════════════════════════════════════════════════════

const MiniBarChart = ({ data, labels, color, highlightIndex, title, width = 300, height = 170 }) => {
  const padTop = 30, padBot = 24, padLR = 20;
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const max = Math.max(...data, 1) * 1.12;
  const gap = chartW / data.length;
  const barW = gap * 0.6;

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <SectionLabel>{title}</SectionLabel>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ marginTop: 8 }}>
        <defs>
          <filter id={`glow-${title.replace(/\s/g,"")}`}>
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.35" />
          </filter>
        </defs>
        {/* Baseline */}
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
                style={{ transition: "all 0.3s ease" }} />
              <text x={x + barW / 2} y={y - 8} textAnchor="middle"
                fill={active ? color : c.textDim}
                style={{ fontFamily: mono, fontSize: active ? 12 : 10, fontWeight: 700 }}>{val}</text>
              <text x={x + barW / 2} y={height - 4} textAnchor="middle"
                fill={active ? c.textMid : c.textDim}
                style={{ fontFamily: mono, fontSize: 9, fontWeight: active ? 600 : 400 }}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const SparkLine = ({ data, labels, color, title, suffix = "", highlightIndex, width = 300, height = 170 }) => {
  const padTop = 30, padBot = 24, padLR = 24;
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
      <SectionLabel>{title}</SectionLabel>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ marginTop: 8 }}>
        <defs>
          <linearGradient id={`area-${title.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
          <filter id={`dotglow-${title.replace(/\s/g,"")}`}>
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.4" />
          </filter>
        </defs>
        {/* Baseline */}
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={c.border} strokeWidth={0.5} />
        {/* Area fill with gradient */}
        <polygon points={areaPath} fill={`url(#area-${title.replace(/\s/g,"")})`} />
        {/* Line */}
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
                style={{ fontFamily: mono, fontSize: active ? 12 : 10, fontWeight: 700 }}>{p.val}{suffix}</text>
              <text x={p.x} y={height - 4} textAnchor="middle"
                fill={active ? c.textMid : c.textDim}
                style={{ fontFamily: mono, fontSize: 9, fontWeight: active ? 600 : 400 }}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const StackedBarChart = ({ series, weekLabels, highlightIndex, height = 200 }) => {
  const padTop = 12, padBot = 28, padLR = 20;
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
        {/* Baseline */}
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
                    style={{ transition: "all 0.3s ease" }} />
                ) : null;
              })}
              <text x={x + barW / 2} y={padTop + chartH - (weekTotals[wi] / maxTotal) * chartH - 8}
                textAnchor="middle" fill={active ? c.text : c.textDim}
                style={{ fontFamily: mono, fontSize: active ? 12 : 10, fontWeight: 700 }}>{weekTotals[wi]}</text>
              <text x={x + barW / 2} y={height - 6} textAnchor="middle"
                fill={active ? c.textMid : c.textDim}
                style={{ fontFamily: mono, fontSize: 9, fontWeight: active ? 600 : 400 }}>{label}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 8 }}>
        {series.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            <span style={{ fontFamily: body, fontSize: 11, fontWeight: 500, color: c.textMid }}>{s.label}</span>
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: s.color }}>
              {s.values.reduce((a, b) => a + b, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// COMPUTE METRICS
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

  // ─── Table helpers (Pulse-style) ───
  const thStyle = {
    padding: "8px 6px", textAlign: "left", fontFamily: body, fontSize: 10,
    fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
    color: c.textMid, borderBottom: `1px solid ${c.border}`,
    background: c.bg, position: "sticky", top: 0, zIndex: 2,
    whiteSpace: "nowrap",
  };
  const tdBase = {
    padding: "6px 6px", fontFamily: mono, fontSize: 12, fontWeight: 600,
    textAlign: "center", borderBottom: `1px dotted ${c.border}`,
  };
  const pctPill = (val, color, muted) => (
    <span style={{
      fontFamily: mono, fontSize: 10, fontWeight: 700,
      color: muted ? c.textDim : color,
      background: muted ? "transparent" : `${color}10`,
      padding: "2px 6px", borderRadius: layout.radiusSm,
    }}>{val}%</span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ═══════════════════════════════════════════════════════════
          STICKY HEADER — Week selector + Mission Grid
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position: "sticky", top: 92, zIndex: 10, background: c.bg, paddingBottom: 12,
      }}>

        {/* Week selector — Pulse toggle style */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            display: "flex", gap: 2, background: c.accentDim, borderRadius: 10, padding: 3,
          }}>
            {weeks.map(w => (
              <button key={w.key} onClick={() => setSelectedWeek(w.key)} style={{
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: selectedWeek === w.key ? c.accent : "transparent",
                color: selectedWeek === w.key ? "#fff" : c.accent,
                fontFamily: mono, fontSize: 11, fontWeight: selectedWeek === w.key ? 700 : 500,
                whiteSpace: "nowrap", transition: "all 0.15s",
                boxShadow: selectedWeek === w.key ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {w.label}
                {w.isCurrent && (
                  <span style={{
                    fontSize: 7, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                    background: selectedWeek === w.key ? "rgba(255,255,255,0.25)" : `${c.accent}30`,
                    color: selectedWeek === w.key ? "#fff" : c.accent,
                  }}>NOW</span>
                )}
              </button>
            ))}
          </div>
          {prev && (
            <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim }}>
              vs {prev.label}
            </span>
          )}
        </div>

        {/* Mission Grid — single strip with all metrics */}
        <div className="flow-mission-grid" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            {/* Projects group */}
            <Tile value={metrics.totalProjects} label="Total" color={c.text} />
            <Tile value={metrics.activeProjects} label="Active" color={c.green} prevValue={prev?.activeProjects} active />
            <Tile value={metrics.noActionProjects} label="No action" color={c.orange} prevValue={prev?.noActionProjects} />
            <Tile value={metrics.shippedCount} label="Shipped" color={c.green} prevValue={prev?.shippedCount} />

            <VDivider />

            {/* Focus metrics */}
            <Metric value={metrics.totalCommits} label="Commits" color={c.text} prevValue={prev?.totalCommits} />
            <Metric value={metrics.blockedCount} label="Blocked" color={metrics.blockedCount > 0 ? c.red : c.textDim} prevValue={prev?.blockedCount} />
            <Metric value={metrics.deliveryRate} label="Build %" color={metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red} />

            <VDivider />

            {/* People metrics */}
            <Metric value={metrics.totalPeople} label="People" color={c.text} />
            <Metric value={metrics.peopleWithTasks} label="Active" color={c.blue} prevValue={prev?.peopleWithTasks} />

            <VDivider />

            {/* Delivery Rate bar — matches Pulse RiskLevelBar pattern */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 120 }}>
              <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: "0.1em", flexShrink: 0 }}>DELIVERY</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: c.surfaceAlt, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(100, metrics.deliveryRate)}%`, height: "100%", borderRadius: 3,
                  background: `linear-gradient(90deg, ${metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red}80, ${metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red})`,
                  transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                }} />
              </div>
              <span style={{
                fontFamily: mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", flexShrink: 0,
                color: metrics.deliveryRate >= 50 ? c.green : metrics.deliveryRate >= 30 ? c.orange : c.red,
              }}>{metrics.deliveryRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CHARTS
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>

        {/* ── Projects — bar charts ── */}
        <div style={{
          borderRadius: layout.radius, border: `1px solid ${c.border}`,
          background: "transparent", padding: "14px 16px", overflow: "hidden",
        }}>
          <SectionLabel color={c.green}>Projects — Week over Week</SectionLabel>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <MiniBarChart title="Active" color={c.green}
              data={allMetrics.map(m => m.activeProjects)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <MiniBarChart title="No Action" color={c.orange}
              data={allMetrics.map(m => m.noActionProjects)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <MiniBarChart title="Shipped" color={c.blue}
              data={allMetrics.map(m => m.shippedCount)} labels={weekLabels}
              highlightIndex={selectedIdx} />
          </div>
        </div>

        {/* ── Focus — sparklines + stacked bar ── */}
        <div style={{
          borderRadius: layout.radius, border: `1px solid ${c.border}`,
          background: "transparent", padding: "14px 16px", overflow: "hidden",
        }}>
          <SectionLabel color={c.accent}>Focus — Week over Week</SectionLabel>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <SparkLine title="Delivery Rate" color={c.green} suffix="%"
              data={pctDone} labels={weekLabels} highlightIndex={selectedIdx} />
            <SparkLine title="Blocked %" color={c.red} suffix="%"
              data={pctBlocked} labels={weekLabels} highlightIndex={selectedIdx} />
            <SparkLine title="Carried %" color={c.accent} suffix="%"
              data={pctCarried} labels={weekLabels} highlightIndex={selectedIdx} />
          </div>
          <div style={{ marginTop: 16 }}>
            <SectionLabel>Commit Breakdown</SectionLabel>
            <div style={{ marginTop: 8 }}>
              <StackedBarChart series={commitSeries} weekLabels={weekLabels} highlightIndex={selectedIdx} />
            </div>
          </div>
        </div>

        {/* ── People — bar + sparkline ── */}
        <div style={{
          borderRadius: layout.radius, border: `1px solid ${c.border}`,
          background: "transparent", padding: "14px 16px", overflow: "hidden",
        }}>
          <SectionLabel color={c.blue}>People — Week over Week</SectionLabel>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <MiniBarChart title="Active People" color={c.blue}
              data={allMetrics.map(m => m.peopleWithTasks)} labels={weekLabels}
              highlightIndex={selectedIdx} />
            <SparkLine title="Committed" color={c.purple}
              data={allMetrics.map(m => m.committedPeople)} labels={weekLabels}
              highlightIndex={selectedIdx} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SQUAD BREAKDOWN — Pulse-style table
            ═══════════════════════════════════════════════════════════ */}
        <div style={{
          borderRadius: layout.radius, border: `1px solid ${c.border}`,
          overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}>
          <div style={{ overflowX: "auto", background: "transparent", borderRadius: layout.radius }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                {/* Group label row */}
                <tr>
                  <th style={{ ...thStyle, borderBottom: "none", paddingBottom: 0 }} />
                  <th colSpan={4} style={{ ...thStyle, borderBottom: `2px solid ${c.green}30`, paddingBottom: 4, textAlign: "center" }}>
                    <SectionLabel color={c.green}>Projects</SectionLabel>
                  </th>
                  <th colSpan={4} style={{ ...thStyle, borderBottom: `2px solid ${c.accent}30`, paddingBottom: 4, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <SectionLabel color={c.accent}>Focus</SectionLabel>
                  </th>
                  <th colSpan={2} style={{ ...thStyle, borderBottom: `2px solid ${c.blue}30`, paddingBottom: 4, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>
                    <SectionLabel color={c.blue}>People</SectionLabel>
                  </th>
                </tr>
                {/* Column header row */}
                <tr>
                  <th style={{ ...thStyle, textAlign: "left", minWidth: 90 }}>Squad</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 48 }}>Active</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 48 }}>No Act.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 40 }}>Ship</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 50 }}>% Act.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 40, borderLeft: `1px dotted ${c.border}` }}>Total</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 50 }}>% Comp.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 50 }}>% Blk.</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 50 }}>% Carry</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 40, borderLeft: `1px dotted ${c.border}` }}>Total</th>
                  <th style={{ ...thStyle, textAlign: "center", minWidth: 50 }}>% Active</th>
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
                      animation: `rowSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both`,
                      animationDelay: `${Math.min(i * 30, 300)}ms`,
                    }}>
                      <td style={{ ...tdBase, textAlign: "left", fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text }}>
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
        </div>

      </div>
    </div>
  );
};

export default SummaryView;
