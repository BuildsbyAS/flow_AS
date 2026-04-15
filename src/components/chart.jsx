// Flow — Steel & Orange chart primitives
//
// All charts live on white cards, render in inline SVG, and share the same
// rules: flat semantic colors (80% opacity baseline, 100% lit/current),
// rgba(0,0,0,0.04) grid hairlines, JetBrains Mono axis/value labels with
// tabular-nums. No drop-shadow glow. No rainbow gradients. Hover/highlight
// is single-property opacity+radius — no `transition: all`.
//
// Exports:
//   HealthBar        — inline 48×5 progress bar for table cells
//   ChartCard        — optional white card wrapper (shadowCard, radiusLg)
//   ChartLegend      — series legend: color dot + label
//   MiniBarChart     — N-bar weekly bar chart with value + week labels
//   SparkLine        — weekly line + area + dots
//   StackedBarChart  — multi-series vertical stacked bars with gridlines

import React, { useState } from "react";
import { c, typo, space, layout, motion } from "../styles/theme";

// ═══════════════════════════════════════════════════════════════
// Shared constants + label helpers
// ═══════════════════════════════════════════════════════════════

// Grid hairline color — used across every chart for axis + gridlines.
export const GRID_HAIRLINE = "rgba(0,0,0,0.04)";

// Common text-label styles (returned as style objects for SVG <text>).
const axisLabelStyle = {
  fontFamily: typo.monoSm.font,
  fontSize: 11,
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
};

const valueLabelStyle = (lit) => ({
  fontFamily: typo.monoLg.font,
  fontSize: lit ? typo.monoLg.size : typo.monoMd.size,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  transition: `font-size ${motion.fast.duration} ${motion.fast.easing}`,
});

// ═══════════════════════════════════════════════════════════════
// HealthBar — 48×5 inline progress bar for table cells (Pulse matrix,
// Projects registry). Semantic color + number + "Good / Fair / Poor" word.
// ═══════════════════════════════════════════════════════════════
export const HealthBar = ({ value, width = 48, height = 5 }) => {
  const pct = Math.max(0, Math.min(100, value));
  const color = value >= 70 ? c.green : value >= 40 ? c.orange : c.red;
  const word = value >= 70 ? "Good" : value >= 40 ? "Fair" : "Poor";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: space[2] }}>
      <div style={{
        width, height, borderRadius: layout.radiusXs,
        background: c.surfaceAlt, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color,
          transition: `width ${motion.normal.duration} ${motion.normal.easing}`,
        }} />
      </div>
      <span style={{
        fontFamily: typo.monoLg.font, fontSize: 13, fontWeight: 700,
        color, fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
      <span style={{
        fontFamily: typo.bodySm.font, fontSize: 11, fontWeight: 600,
        color: c.textDim,
      }}>{word}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// ChartCard — optional wrapper for a chart. Most callers wrap in a
// bigger KpiCard / Surface; this is for standalone chart sections.
// ═══════════════════════════════════════════════════════════════
export const ChartCard = ({ title, children, style: s }) => (
  <div style={{
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: layout.radiusLg,
    boxShadow: c.shadowCard,
    padding: space[6],
    ...s,
  }}>
    {title && (
      <div style={{
        fontFamily: typo.monoMd.font, fontSize: 12, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: c.textDim, marginBottom: space[3],
      }}>{title}</div>
    )}
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// ChartLegend — color dot + label row. Used under StackedBarChart
// (and any multi-series chart that needs a key).
// ═══════════════════════════════════════════════════════════════
export const ChartLegend = ({ series, style: s }) => (
  <div style={{
    display: "flex", gap: space[5], flexWrap: "wrap",
    marginTop: space[2], justifyContent: "center", ...s,
  }}>
    {series.map(seg => (
      <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: space[2] }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
        <span style={{
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
          fontWeight: 500, color: c.textMid,
        }}>{seg.label}</span>
      </div>
    ))}
  </div>
);

// Small sub-label rendered under a chart. Uppercase mono 12px 700 per mock.
const ChartSubLabel = ({ children }) => (
  <div style={{
    padding: `${space[2]}px ${space[3]}px`, marginTop: space[1],
    background: c.surfaceAlt, borderRadius: layout.radiusSm,
    textAlign: "center",
  }}>
    <span style={{
      fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
      fontWeight: 700, letterSpacing: "0.06em",
      color: c.textDim, textTransform: "uppercase",
    }}>{children}</span>
  </div>
);

// Empty state used inside charts when data is empty. Keeps the chart's
// dimensions so the layout doesn't jump.
const ChartEmpty = ({ height }) => (
  <div style={{
    flex: 1, minWidth: 180, height,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: c.textDim, fontFamily: typo.bodyMd.font, fontSize: 14,
  }}>No data</div>
);

// ═══════════════════════════════════════════════════════════════
// MiniBarChart — N-bar weekly bar chart.
// Props:
//   data:           number[]
//   labels:         string[] (same length as data)
//   color:          bar color
//   title?:         caption below the chart
//   highlightIndex: which bar is the "current/selected" week
//   width / height: SVG viewBox dimensions (scales responsive)
// ═══════════════════════════════════════════════════════════════
export const MiniBarChart = ({ data, labels, color, highlightIndex, title, width = 300, height = 170 }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data || data.length === 0) return <ChartEmpty height={height} />;

  const padTop = space[7], padBot = space[6], padLR = space[5];
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const max = Math.max(...data, 1) * 1.12;
  const gap = chartW / data.length;
  const barW = gap * 0.6;

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIdx(null)}>
        {/* Baseline */}
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={GRID_HAIRLINE} strokeWidth={1} />
        {data.map((val, i) => {
          const barH = Math.max(3, (val / max) * chartH);
          const x = padLR + i * gap + (gap - barW) / 2;
          const y = padTop + chartH - barH;
          const active = i === highlightIndex;
          const hovered = hoverIdx === i && !active;
          const lit = active || hovered;
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: "pointer" }}>
              {/* Full-column hit area */}
              <rect x={padLR + i * gap} y={padTop} width={gap} height={chartH + padBot} fill="transparent" />
              <rect x={x} y={y} width={barW} height={barH} rx={3}
                fill={color} opacity={lit ? 1 : 0.8}
                style={{ transition: `opacity ${motion.fast.duration} ${motion.fast.easing}` }} />
              <text x={x + barW / 2} y={y - 8} textAnchor="middle"
                fill={lit ? color : c.textDim}
                style={valueLabelStyle(lit)}>{val}</text>
              <text x={x + barW / 2} y={height - 4} textAnchor="middle"
                fill={c.textDim}
                style={axisLabelStyle}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      {title && <ChartSubLabel>{title}</ChartSubLabel>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SparkLine — line chart with light area fill + dot at each week.
// Props: same as MiniBarChart + `suffix` (e.g. "%").
// ═══════════════════════════════════════════════════════════════
export const SparkLine = ({ data, labels, color, title, suffix = "", highlightIndex, width = 300, height = 170 }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data || data.length === 0) return <ChartEmpty height={height} />;

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
  const areaPath = data.length > 1
    ? `${padLR},${padTop + chartH} ${linePath} ${padLR + chartW},${padTop + chartH}`
    : "";
  const hitZones = pts.map((p, i) => ({
    left:  i === 0                 ? padLR               : (pts[i - 1].x + p.x) / 2,
    right: i === pts.length - 1    ? padLR + chartW      : (p.x + pts[i + 1].x) / 2,
  }));

  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIdx(null)}>
        <line x1={padLR} y1={padTop + chartH} x2={width - padLR} y2={padTop + chartH}
          stroke={GRID_HAIRLINE} strokeWidth={1} />
        {areaPath && <polygon points={areaPath} fill={color} opacity={0.08} />}
        <polyline points={linePath} fill="none" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
        {pts.map((p, i) => {
          const active = i === highlightIndex;
          const hovered = hoverIdx === i && !active;
          const lit = active || hovered;
          const hz = hitZones[i];
          return (
            <g key={i} onMouseEnter={() => setHoverIdx(i)} style={{ cursor: "pointer" }}>
              <rect x={hz.left} y={padTop} width={hz.right - hz.left} height={chartH + padBot} fill="transparent" />
              {lit && <circle cx={p.x} cy={p.y} r={9} fill={color} opacity={0.1} />}
              <circle cx={p.x} cy={p.y} r={lit ? 5 : 3}
                fill={lit ? color : c.surface} stroke={color} strokeWidth={lit ? 2 : 1.5}
                style={{ transition: `r ${motion.fast.duration} ${motion.fast.easing}` }} />
              <text x={p.x} y={p.y - 12} textAnchor="middle"
                fill={lit ? color : c.textDim}
                style={valueLabelStyle(lit)}>{p.val}{suffix}</text>
              <text x={p.x} y={height - 4} textAnchor="middle"
                fill={c.textDim}
                style={axisLabelStyle}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      {title && <ChartSubLabel>{title}</ChartSubLabel>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// StackedBarChart — multi-series vertical stack across weeks.
// Props:
//   series:         [{ label, color, values: number[] }]
//   weekLabels:     string[]
//   highlightIndex: week index to highlight (full opacity)
//   height:         SVG height (default 220)
//   legend:         show color-dot legend under chart (default true)
// ═══════════════════════════════════════════════════════════════
export const StackedBarChart = ({ series, weekLabels, highlightIndex, height = 220, legend = true }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  const padTop = space[7], padBot = space[7], padLR = space[5] + 28;
  const width = 700;
  const chartW = width - padLR * 2;
  const chartH = height - padTop - padBot;
  const weekTotals = weekLabels.map((_, wi) => series.reduce((sum, s) => sum + (s.values[wi] || 0), 0));
  const maxTotal = Math.max(...weekTotals, 1);
  const gap = chartW / weekLabels.length;
  const barW = gap * 0.52;

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoverIdx(null)}>
        {/* Y-axis gridlines + labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const yVal = Math.round(maxTotal * pct);
          const y = padTop + chartH - pct * chartH;
          return (
            <g key={pct}>
              <line x1={padLR} y1={y} x2={width - padLR} y2={y}
                stroke={GRID_HAIRLINE} strokeWidth={1}
                strokeDasharray={pct === 0 ? "none" : "3,3"} />
              {pct > 0 && (
                <text x={padLR - 6} y={y + 3} textAnchor="end"
                  fill={c.textDim} style={axisLabelStyle}>{yVal}</text>
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
          const breakdown = series.map(s => `${s.label}: ${s.values[wi] || 0}`).join("  ·  ");
          return (
            <g key={wi} onMouseEnter={() => setHoverIdx(wi)} style={{ cursor: "pointer" }}>
              <rect x={padLR + wi * gap} y={padTop} width={gap} height={chartH + padBot} fill="transparent" />
              {series.map(s => {
                const val = s.values[wi] || 0;
                const segH = maxTotal > 0 ? (val / maxTotal) * chartH : 0;
                yOffset -= segH;
                return segH > 0 ? (
                  <rect key={s.label} x={x} y={yOffset} width={barW} height={segH} rx={3}
                    fill={s.color} opacity={lit ? 1 : 0.8}
                    style={{ transition: `opacity ${motion.fast.duration} ${motion.fast.easing}` }} />
                ) : null;
              })}
              <text x={x + barW / 2} y={padTop + chartH - (weekTotals[wi] / maxTotal) * chartH - 8}
                textAnchor="middle" fill={lit ? c.text : c.textDim}
                style={valueLabelStyle(lit)}>{weekTotals[wi]}</text>
              <text x={x + barW / 2} y={height - 6} textAnchor="middle"
                fill={c.textDim}
                style={axisLabelStyle}>{label}</text>
              <title>{`${label}: ${weekTotals[wi]} total\n${breakdown}`}</title>
            </g>
          );
        })}
      </svg>
      {legend && <ChartLegend series={series} />}
    </div>
  );
};
