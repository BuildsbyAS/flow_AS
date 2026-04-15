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
  <div style={{ display: "grid", gridTemplateColumns: cols, gap, ...s }}>{children}</div>
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
export const KpiCard = ({ label, value, sub, delta, deltaLabel, children, onClick, active, style: s }) => {
  const devRef = useDevLabel('KpiCard', 'src/components/kpi.jsx', 'Steel & Orange KPI card per mock §kpi-card');
  return (
    <div
      ref={devRef}
      onClick={onClick}
      style={{
        padding: space[6], borderRadius: layout.radiusLg,
        background: c.surface,
        border: `1px solid ${active ? c.accent + "30" : c.border}`,
        boxShadow: c.shadowCard,
        cursor: onClick ? "pointer" : "default",
        display: "flex", flexDirection: "column",
        transition: `border-color ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}`,
        ...s,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{
          fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600,
          color: c.textDim, letterSpacing: "0.04em", textTransform: "uppercase",
        }}>{label}</span>
        {delta != null && Number.isFinite(Number(delta)) && (
          <span style={{
            fontFamily: typo.monoSm.font, fontSize: 12, fontWeight: 700,
            color: delta > 0 ? c.green : delta < 0 ? c.red : c.textGhost,
            fontVariantNumeric: "tabular-nums",
          }}>{delta > 0 ? "+" : ""}{delta}{deltaLabel ? ` ${deltaLabel}` : ""}</span>
        )}
      </div>
      <div style={{
        fontFamily: typo.displayHero.font, fontSize: 36, fontWeight: 700,
        color: c.text, letterSpacing: "-0.03em", lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: typo.bodySm.font, fontSize: 13, fontWeight: 500,
          color: c.textDim, marginTop: 6,
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
export const HealthGauge = ({ value, label = "Avg Health", sub = "portfolio health score" }) => (
  <div style={{
    padding: space[6], borderRadius: layout.radiusLg,
    background: "#1A1A1E", border: "1px solid #1A1A1E",
    boxShadow: c.shadowCard,
    display: "flex", flexDirection: "column",
  }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{
        fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600,
        color: "#6B6B78", letterSpacing: "0.04em", textTransform: "uppercase",
      }}>{label}</span>
    </div>
    <div style={{
      fontFamily: typo.displayHero.font, fontSize: 36, fontWeight: 700,
      color: "#F0F0F4", letterSpacing: "-0.03em", lineHeight: 1,
      fontVariantNumeric: "tabular-nums",
    }}>{value}</div>
    <div style={{
      fontFamily: typo.bodySm.font, fontSize: 13, fontWeight: 500,
      color: "#6B6B78", marginTop: 6,
    }}>{sub}</div>
    <div style={{
      height: 4, borderRadius: 2, background: "#2E2E36",
      marginTop: 16, overflow: "hidden", position: "relative",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${Math.max(0, Math.min(100, value))}%`,
        borderRadius: 2,
        background: "linear-gradient(90deg, #DC2626 0%, #F59E0B 50%, #10B981 100%)",
        transition: `width ${motion.normal.duration} ${motion.normal.easing}`,
      }} />
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
      {[0, 25, 50, 75, 100].map(t => (
        <span key={t} style={{
          fontFamily: typo.monoSm.font, fontSize: 11, color: "#4A4A52",
          fontVariantNumeric: "tabular-nums",
        }}>{t}</span>
      ))}
    </div>
  </div>
);

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
      fontFamily: typo.monoMd.font, fontSize: 12, fontWeight: 700,
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
        <button key={opt.key} onClick={() => onChange(opt.key)} style={{
          padding: `6px ${space[4]}px`,
          borderRadius: layout.radiusSm, border: "none", cursor: "pointer",
          background: active ? c.surface : "transparent",
          fontFamily: typo.bodyMd.font, fontSize: 13, fontWeight: 600,
          color: active ? c.text : c.textDim,
          boxShadow: active ? c.shadowSm : "none",
          outline: "none",
          transition: `background ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
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
    style={{
      padding: "5px 11px", borderRadius: 6,
      fontSize: 12, fontWeight: 700,
      display: "flex", alignItems: "center", gap: 5,
      background: `${color}12`,
      border: `1px solid ${active ? color + "60" : "transparent"}`,
      color,
      cursor: onClick ? "pointer" : "default",
      fontFamily: typo.bodyMd.font,
      transition: `border-color ${motion.fast.duration} ${motion.fast.easing}`,
      ...s,
    }}
  >
    <span style={{ fontFamily: typo.monoSm.font, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{count}</span>
    {label}
  </button>
);

// PillRow — horizontal flex container for Pills. 6px gap per mock.
export const PillRow = ({ children, style: s }) => (
  <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap", ...s }}>{children}</div>
);
