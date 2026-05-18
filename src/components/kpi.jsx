// Flow — Steel & Orange KPI primitives
//
// Shared building blocks for the 4-card KPI grid pattern used in
// Pulse / Summary / Projects / Humans / People.
//
// Reference: design-directions.html §KPI CARDS + §sec-head
// Spec:      DESIGN_SYSTEM.md §7.3 KPI Cards, §8.1 Layout

import React from "react";
import { c, typo, layout, space, motion } from "../styles/theme";
import useDevLabel from "../hooks/useDevLabel";

// ═══════════════════════════════════════════════════════════════
// KpiGrid — 4-column responsive grid. Default weights 1.5fr/1fr/1fr/1fr
// match the mock (wide first card + 3 equal). Callers can override cols.
// ═══════════════════════════════════════════════════════════════
export const KpiGrid = ({ children, cols = "1.5fr 1fr 1fr 1fr", gap = space[4], style: s }) => (
  <div className="flow-kpi-grid" style={{ display: "grid", gridTemplateColumns: cols, gap, ...s }}>{children}</div>
);

// ═══════════════════════════════════════════════════════════════
// KpiCard — white card with an uppercase label, optional delta in the
// top-right, a 36px mono value, an optional sub caption, and an optional
// children slot (for pill rows, sparklines, etc).
//
// Props:
//   label:   string — uppercase label per §7.3
//   value:   node — primary metric (36px mono, tabular-nums)
//   sub:     string — 13px caption under the value
//   delta:   number — positive green / negative red / zero ghost
//   deltaLabel: optional string appended to delta (e.g. "vs prev")
//   onClick, active: clickable filter tile behavior
//   children: slot for PhasePills / Sparkline / tick bar
// ═══════════════════════════════════════════════════════════════
export const KpiCard = ({ label, value, sub, delta, deltaLabel, children, onClick, active, style: s, index }) => {
  const devRef = useDevLabel('KpiCard', 'src/components/kpi.jsx', 'Steel & Orange KPI card per mock §kpi-card');
  const handleKey = onClick ? (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); }
  } : undefined;
  return (
    <div
      ref={devRef}
      onClick={onClick}
      onKeyDown={handleKey}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flow-kpi-card${onClick ? " clickable" : ""}${active ? " is-active" : ""}`}
      style={{
        animationDelay: index != null ? `${index * 40}ms` : undefined,
        padding: space[6], borderRadius: layout.radiusLg,
        // Active state: a single accent border, no tint, no ring. The
        // earlier ring + tinted background read as jarring on light-mode
        // cards, especially in the KPI grid where multiple cards sit
        // side by side.
        background: c.surface,
        border: `1px solid ${active ? c.accent : c.border}`,
        boxShadow: c.shadowCard,
        cursor: onClick ? "pointer" : "default",
        display: "flex", flexDirection: "column",
        transition: "border-color 150ms ease",
        ...s,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: space[2] + 2 }}>
        <span style={{
          fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700,
          color: c.textMid, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{label}</span>
        {delta != null && Number.isFinite(Number(delta)) && (
          <span style={{
            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
            color: delta > 0 ? c.green : delta < 0 ? c.red : c.textGhost,
            fontVariantNumeric: "tabular-nums",
          }}>{delta > 0 ? "+" : ""}{delta}{deltaLabel ? ` ${deltaLabel}` : ""}</span>
        )}
      </div>
      <div style={{
        fontFamily: typo.displayHero.font, fontSize: typo.displayHero.size, fontWeight: typo.displayHero.weight,
        color: c.text, letterSpacing: typo.displayHero.tracking, lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: typo.bodySm.weight,
          color: c.textMid, marginTop: space[1] + 2,
        }}>{sub}</div>
      )}
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// HealthGauge — inverted dark KPI card (mock §.kpi-card.health).
// Gradient red→amber→green track, 0/25/50/75/100 tick marks.
// Use as the 4th card of a KpiGrid wherever there's an aggregate health.
// ═══════════════════════════════════════════════════════════════
export const HealthGauge = ({ value, label = "Avg Health", sub = "portfolio health score" }) => {
  // Solid semantic fill — matches HealthBar thresholds (≥70 green, ≥40 amber, <40 red).
  // Rainbow gradient fills are explicitly banned (DESIGN_SYSTEM.md §10).
  const fill = value >= 70 ? c.green : value >= 40 ? c.orange : c.red;
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped}% · ${sub}`}
      aria-label={label}
      style={{
        padding: space[6], borderRadius: layout.radiusLg,
        background: c.surfaceInverse, border: `1px solid ${c.surfaceInverse}`,
        boxShadow: c.shadowCard,
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: space[2] + 2 }}>
        <span style={{
          fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700,
          color: c.textMidOnInverse, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: typo.displayHero.font, fontSize: typo.displayHero.size, fontWeight: typo.displayHero.weight,
        color: c.textOnInverse, letterSpacing: typo.displayHero.tracking, lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
        <span style={{ fontSize: "0.55em", marginLeft: 2, color: c.textMidOnInverse, fontWeight: 600 }}>%</span>
      </div>
      <div style={{
        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: typo.bodySm.weight,
        color: c.textMidOnInverse, marginTop: space[1] + 2,
      }}>{sub}</div>
      <div aria-hidden style={{
        height: 4, borderRadius: 2, background: c.insetInverse,
        marginTop: 16, overflow: "hidden", position: "relative",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, right: 0, bottom: 0,
          borderRadius: 2,
          background: fill,
          transformOrigin: "left center",
          transform: `scaleX(${clamped / 100})`,
          transition: `transform ${motion.normal.duration} ${motion.normal.easing}, background ${motion.fast.duration} ${motion.fast.easing}`,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {[0, 25, 50, 75, 100].map(t => (
          <span key={t} style={{
            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textGhostOnInverse,
            fontVariantNumeric: "tabular-nums",
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SectionHead — "Project Matrix" / "People" / etc title on the left,
// arbitrary right slot (segmented toggle, filter chip, etc).
// Mock §sec-head: 12px mono 700 uppercase 0.08em, 16px bottom margin.
// ═══════════════════════════════════════════════════════════════
export const SectionHead = ({ title, right, style: s }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginTop: space[5], marginBottom: space[3],
    ...s,
  }}>
    <span style={{
      fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight,
      letterSpacing: "0.08em", textTransform: "uppercase", color: c.text,
    }}>{title}</span>
    {right}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SegmentedToggle — reusable pill-inside-inset-container toggle.
// DESIGN_SYSTEM.md §7.8: inset bg, white card active with shadowSm.
// ═══════════════════════════════════════════════════════════════
export const SegmentedToggle = ({ options, value, onChange }) => (
  <div style={{
    display: "flex", gap: 2,
    background: c.surfaceAlt, borderRadius: layout.radiusMd, padding: 3,
    border: `1px solid ${c.border}`,
  }}>
    {options.map(opt => {
      const active = value === opt.key;
      return (
        <button key={opt.key} onClick={() => onChange(opt.key)} className={`flow-seg-btn${active ? " active" : ""}`} style={{
          padding: `${space[1] + 2}px ${space[4]}px`,
          borderRadius: layout.radiusSm, border: "none", cursor: "pointer",
          background: active ? c.surface : "transparent",
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
          color: active ? c.text : c.textDim,
          boxShadow: active ? c.shadowSm : "none",
          outline: "none",
          transition: `background ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}`,
        }}>{opt.label}</button>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// Pill — chip for PhasePills / OutcomePills / any clickable
// semantic-colored pill row inside a KpiCard.
// Mock §.pp (padding 5/11, radius 6, 12px 700, mono count + label).
// ═══════════════════════════════════════════════════════════════
export const Pill = ({ count, label, color, active, onClick, style: s }) => (
  <button
    onClick={onClick}
    className={onClick ? "flow-pill-clickable" : undefined}
    style={{
      padding: `${space[1] + 1}px ${space[3]}px`, borderRadius: layout.radiusSm,
      fontSize: typo.bodyXs.size, fontWeight: 700,
      display: "flex", alignItems: "center", gap: space[1] + 1,
      background: `${color}12`,
      border: `1px solid ${active ? color + "60" : "transparent"}`,
      color,
      cursor: onClick ? "pointer" : "default",
      fontFamily: typo.bodyMd.font,
      transition: `border-color ${motion.fast.duration} ${motion.fast.easing}, background ${motion.fast.duration} ${motion.fast.easing}, filter ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`,
      ...s,
    }}
  >
    <span style={{ fontFamily: typo.monoSm.font, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    {label}
  </button>
);

// PillRow — horizontal flex container for Pills. 6px gap per mock.
export const PillRow = ({ children, style: s }) => (
  <div style={{ display: "flex", gap: space[1] + 2, marginTop: space[4], flexWrap: "wrap", ...s }}>{children}</div>
);

// ═══════════════════════════════════════════════════════════════
// Sparkline — bar chart inside a KpiCard (mock §.spark).
// 6 bars by default, 3px gap, 40px height, last bar full opacity = current.
// values: array of numbers (oldest first, current last)
// color:  bar color (defaults to accent)
// muted:  if true, use inset bg for non-current bars (Deprioritized variant)
// ═══════════════════════════════════════════════════════════════
export const Sparkline = ({ values, color, muted = false, height = 40, label }) => {
  if (!values || values.length === 0) return null;
  const max = Math.max(1, ...values);
  const accent = color || c.accent;
  const lastIdx = values.length - 1;
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 3,
        marginTop: 16, height,
      }}>
        {values.map((v, i) => {
          const isCurrent = i === lastIdx;
          const pct = Math.max(0.04, v / max); // ensure visible min
          const bg = isCurrent ? accent : muted ? c.surfaceAlt : accent;
          const opacity = isCurrent ? 1 : muted ? 1 : 0.45;
          return (
            <div key={i} className="flow-spark-bar" style={{
              flex: 1, borderRadius: 3, minHeight: 4,
              height: `${pct * 100}%`,
              background: bg,
              opacity,
              animationDelay: `${Math.min(i * 50, 250)}ms`,
              ["--spark-opacity"]: opacity,
            }} />
          );
        })}
      </div>
      {label && (
        <div style={{
          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textMid,
          marginTop: space[1], textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}>{label}</div>
      )}
    </div>
  );
};
