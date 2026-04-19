/**
 * QA Review — interactive before/after review tool.
 *
 * Query-param gated at /?qaReview=1. Renders each QA theme from the
 * April 2026 QA pass as a card with live "Current" vs "Proposed" mocks
 * built from Flow primitives. Decisions persist to localStorage. Export
 * generates a markdown punch-list of only the Approved themes so the
 * builder ships only what's approved.
 */

import React, { useState, useEffect } from "react";
import { c, space, typo, layout, motion, typeConfig } from "../styles/theme";
import { Surface, Badge, Btn } from "../components/shared";

const STORAGE_KEY = "flow-qa-decisions-v1";
const body = typo.bodyMd.font;
const mono = typo.monoMd.font;

/* ════════════════════════════════════════════════════════════════════
   CURRENT vs PROPOSED MOCKS
   Each mock is a self-contained React component. Kept small and
   data-faithful rather than exhaustive.
   ════════════════════════════════════════════════════════════════════ */

// ── Shared tiny KPI card primitives used by several mocks ─────────────
const KPIMini = ({ label, value, sub, subColor, arrow, bg, border }) => (
  <div style={{
    padding: space[3], borderRadius: layout.radiusSm,
    background: bg || c.surface, border: `1px solid ${border || c.border}`,
    minHeight: 64,
  }}>
    <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: c.textDim, textTransform: "uppercase" }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 4 }}>
      {arrow && <span style={{ color: subColor || c.text, fontSize: 14, fontWeight: 700 }}>{arrow}</span>}
      <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: c.text, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
    {sub && <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: subColor || c.textDim, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{sub}</div>}
  </div>
);

// #1 — KPI deltas ─────────────────────────────────────────────────────
const KpiCurrent = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[2] }}>
    <KPIMini label="Projects"  value="+22 projects" />
    <KPIMini label="People"    value="-3 people" />
    <KPIMini label="Done Rate" value="-47 pts" />
    <KPIMini label="Idle"      value="-8 pts" />
  </div>
);
const KpiProposed = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[2] }}>
    <KPIMini label="Projects"  value="22" arrow="↑" sub="+12% WoW" subColor={c.green} />
    <KPIMini label="People"    value="3"  arrow="↓" sub="-8% WoW"  subColor={c.red} />
    <KPIMini label="Done Rate" value="47" arrow="↓" sub="pts · baseline 82" subColor={c.red} />
    <KPIMini label="Idle"      value="8"  arrow="↓" sub="pts · good"  subColor={c.green} />
  </div>
);

// #2 — Responsive ─────────────────────────────────────────────────────
const NavStrip = ({ truncated }) => {
  const items = truncated
    ? ["Summa…", "Proje…", "Peo…", "Pul…", "ts", "Comm", "Guid"]
    : ["Summary", "Projects", "People", "Pulse", "Commit", "Guide"];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: space[2],
      padding: `${space[2]}px ${space[3]}px`,
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: layout.radiusSm,
      overflow: truncated ? "hidden" : undefined,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.accent, flexShrink: 0 }} />
      <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.text, flexShrink: 0 }}>FLOW</span>
      <div style={{ width: 1, height: 16, background: c.border, flexShrink: 0 }} />
      {items.map((it, i) => (
        <span key={i} style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.textMid, whiteSpace: "nowrap" }}>{it}</span>
      ))}
      {truncated && <span style={{ fontFamily: body, fontSize: 12, color: c.textDim, marginLeft: "auto" }}>↔ scroll</span>}
    </div>
  );
};
const RespCurrent = () => (
  <div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginBottom: 4 }}>VIEWPORT 1100px</div>
    <NavStrip truncated />
    <div style={{ marginTop: 6, fontFamily: mono, fontSize: 10, color: c.red }}>labels clipped · horizontal scroll at 768px</div>
  </div>
);
const RespProposed = () => (
  <div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginBottom: 4 }}>VIEWPORT 1100px</div>
    <div style={{
      display: "flex", alignItems: "center", gap: space[2],
      padding: `${space[2]}px ${space[3]}px`,
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: layout.radiusSm,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.accent }} />
      <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.text }}>FLOW</span>
      <div style={{ width: 1, height: 16, background: c.border }} />
      <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text }}>Summary</span>
      <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.textMid }}>Projects</span>
      <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.textMid }}>People</span>
      <span style={{
        marginLeft: "auto", padding: "2px 8px", fontFamily: body, fontSize: 12,
        border: `1px solid ${c.border}`, borderRadius: 4, color: c.textMid,
      }}>More ▾</span>
    </div>
    <div style={{ marginTop: 6, fontFamily: mono, fontSize: 10, color: c.green }}>overflow menu below 1100px · reflow at 768px</div>
  </div>
);

// #3 — Placeholder data ───────────────────────────────────────────────
const PersonCardMini = ({ name, role, squad, flag }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: space[2],
    padding: space[3], background: c.surface, border: `1px solid ${c.border}`,
    borderRadius: layout.radiusSm,
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: c.accentDim, border: `1px solid ${c.accent}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent,
    }}>{name.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text }}>{name}</div>
      <div style={{ fontFamily: body, fontSize: 11, color: c.textMid }}>{role} · {squad}</div>
    </div>
    {flag && <Badge color={c.red} bg={c.redDim}>{flag}</Badge>}
  </div>
);
const DataCurrent = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
    <PersonCardMini name="AJ" role="AJ" squad="Core" flag="TEST" />
    <div style={{
      padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
      display: "flex", alignItems: "center", gap: space[2],
    }}>
      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent }}>X105</span>
      <span style={{ fontFamily: body, fontSize: 13, color: c.text, fontWeight: 600 }}>abc</span>
      <span style={{ marginLeft: "auto", fontFamily: body, fontSize: 11, color: c.textDim }}>owner: AJ</span>
    </div>
    <div style={{
      padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
      display: "flex", alignItems: "center", gap: space[2],
    }}>
      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent }}>X106</span>
      <span style={{ fontFamily: body, fontSize: 13, color: c.text, fontWeight: 600 }}>test test testing</span>
    </div>
  </div>
);
const DataProposed = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
    <PersonCardMini name="Anmol Jain" role="PM" squad="Core" />
    <div style={{
      padding: space[3], background: c.surfaceAlt, border: `1px dashed ${c.border}`, borderRadius: layout.radiusSm,
      textAlign: "center", fontFamily: body, fontSize: 12, color: c.textDim,
    }}>Test data filtered · 3 rows hidden (X105, X106, X107)</div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.green, textAlign: "center" }}>seed marked with is_test flag · production-clean</div>
  </div>
);

// #4 — Global nav on detail views ─────────────────────────────────────
const DetailHeaderCurrent = () => (
  <div style={{
    padding: `${space[2]}px ${space[3]}px`,
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
    display: "flex", alignItems: "center", gap: space[2],
  }}>
    <span style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>‹ Commit</span>
    <span style={{ fontFamily: body, fontSize: 12, color: c.textDim }}>›</span>
    <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text }}>Faisal M.</span>
    <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10, color: c.red }}>no global nav · keyboard trap</div>
  </div>
);
const DetailHeaderProposed = () => (
  <div style={{
    padding: `${space[2]}px ${space[3]}px`,
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
    display: "flex", alignItems: "center", gap: space[2],
  }}>
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.accent }} />
    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.text }}>FLOW</span>
    <span style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>Summary</span>
    <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.accent }}>Commit</span>
    <span style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>Guide</span>
    <span style={{ fontFamily: body, fontSize: 12, color: c.textDim, marginLeft: space[3] }}>· Faisal M.</span>
  </div>
);

// #5 — Name format ────────────────────────────────────────────────────
const nameRow = (name, first) => (
  <div key={name} style={{
    padding: `${space[2]}px ${space[3]}px`, background: c.surface,
    borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: space[2],
    fontFamily: body, fontSize: 13,
  }}>
    <span style={{
      width: 24, height: 24, borderRadius: "50%", background: c.accentDim,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.accent,
    }}>{first}</span>
    <span style={{ color: c.text }}>{name}</span>
  </div>
);
const NameCurrent = () => (
  <div style={{ border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, overflow: "hidden" }}>
    {nameRow("Ibrahim K.", "I")}
    {nameRow("Ayush Kapoor", "A")}
    {nameRow("Mariam Rashid", "M")}
    {nameRow("Karthik S.", "K")}
    {nameRow("Zain Q.", "Z")}
  </div>
);
const NameProposed = () => (
  <div style={{ border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, overflow: "hidden" }}>
    {nameRow("Ibrahim Khan", "IK")}
    {nameRow("Ayush Kapoor", "AK")}
    {nameRow("Mariam Rashid", "MR")}
    {nameRow("Karthik Suresh", "KS")}
    {nameRow("Zain Qureshi", "ZQ")}
  </div>
);

// #6 — Status glued to project names ──────────────────────────────────
const ProjectRow = ({ id, name, inline, pill, pillColor }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: space[2],
    padding: `${space[2]}px ${space[3]}px`,
    background: c.surface, borderBottom: `1px solid ${c.border}`,
  }}>
    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent }}>{id}</span>
    <span style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text }}>
      {name}{inline && <span style={{ color: c.red, fontWeight: 700 }}> {inline}</span>}
    </span>
    {pill && <Badge color={pillColor} bg={`${pillColor}18`} style={{ marginLeft: "auto" }}>{pill}</Badge>}
  </div>
);
const StatusCurrent = () => (
  <div style={{ border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, overflow: "hidden" }}>
    <ProjectRow id="X08" name="Store Locator" inline="ENDING SOON" />
    <ProjectRow id="X12" name="Loyalty V2"    inline="ENDING SOON" />
    <ProjectRow id="X21" name="SMS Notifications" inline="SHIPPED" />
  </div>
);
const StatusProposed = () => (
  <div style={{ border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, overflow: "hidden" }}>
    <ProjectRow id="X08" name="Store Locator"     pill="Ending soon" pillColor={c.orange} />
    <ProjectRow id="X12" name="Loyalty V2"        pill="Ending soon" pillColor={c.orange} />
    <ProjectRow id="X21" name="SMS Notifications" pill="Shipped"     pillColor={c.green} />
  </div>
);

// #7 — ARIA on stepper / segmented ────────────────────────────────────
const StepperCurrent = () => (
  <div style={{ display: "flex", gap: space[1] }}>
    {[1, 2, 3].map(n => (
      <button key={n} style={{
        padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm,
        border: `1px solid ${n === 1 ? c.accent : c.border}`,
        background: n === 1 ? `${c.accent}12` : c.surface,
        color: n === 1 ? c.accent : c.textMid,
        fontFamily: mono, fontSize: 12, fontWeight: 700,
        cursor: "pointer",
      }}>{n}</button>
    ))}
    <span style={{ fontFamily: mono, fontSize: 10, color: c.red, marginLeft: space[2], alignSelf: "center" }}>no role · arrows don't work</span>
  </div>
);
const StepperProposed = () => (
  <div role="tablist" aria-label="Commit slots" style={{ display: "flex", gap: space[1] }}>
    {[1, 2, 3].map(n => (
      <button key={n} role="tab" aria-selected={n === 1} aria-current={n === 1 ? "step" : undefined} style={{
        padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm,
        border: `1px solid ${n === 1 ? c.accent : c.border}`,
        background: n === 1 ? `${c.accent}12` : c.surface,
        color: n === 1 ? c.accent : c.textMid,
        fontFamily: mono, fontSize: 12, fontWeight: 700,
        cursor: "pointer", outline: n === 1 ? `2px solid ${c.accent}40` : undefined,
      }}>{n}</button>
    ))}
    <span style={{ fontFamily: mono, fontSize: 10, color: c.green, marginLeft: space[2], alignSelf: "center" }}>role=tablist · ← → arrow nav · aria-current</span>
  </div>
);

// #8 — Week indicator ─────────────────────────────────────────────────
const WeekCurrent = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: space[2],
    padding: `${space[2]}px ${space[3]}px`,
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
  }}>
    <button style={{ border: "none", background: "transparent", color: c.textMid, cursor: "pointer", padding: 4 }}>◂</button>
    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.text }}>Apr 13, 2026</span>
    <span style={{ fontFamily: body, fontSize: 11, color: c.textDim, marginLeft: space[2] }}>Already on current week</span>
  </div>
);
const WeekProposed = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: space[2],
    padding: `${space[2]}px ${space[3]}px`,
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
  }}>
    <button style={{ border: "none", background: "transparent", color: c.textMid, cursor: "pointer", padding: 4 }}>◂</button>
    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.text }}>Apr 13 – Apr 19, 2026</span>
    <button disabled style={{ border: "none", background: "transparent", color: c.textDim, cursor: "not-allowed", padding: 4, opacity: 0.4 }}>▸</button>
  </div>
);

// #9 — Squad Performance table density ────────────────────────────────
const squadCell = (val, color) => (
  <td style={{
    padding: `${space[1]}px ${space[2]}px`, fontFamily: mono, fontSize: 11,
    color: color || c.text, borderBottom: `1px solid ${c.border}`, fontVariantNumeric: "tabular-nums",
  }}>{val}</td>
);
const SquadCurrent = () => (
  <div style={{ border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, overflow: "hidden" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", background: c.surface }}>
      <thead>
        <tr style={{ background: c.surfaceAlt }}>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>SQUAD</th>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>PROJECTS</th>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>PEOPLE</th>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>COMMIT</th>
        </tr>
      </thead>
      <tbody>
        <tr>{squadCell("Customer")}{squadCell("14")}{squadCell("7")}{squadCell("82%")}</tr>
        <tr>{squadCell("AI")}{squadCell("")}{squadCell("")}{squadCell("")}</tr>
        <tr>{squadCell("Core")}{squadCell("")}{squadCell("")}{squadCell("")}</tr>
        <tr>{squadCell("Gaming")}{squadCell("")}{squadCell("")}{squadCell("")}</tr>
      </tbody>
    </table>
  </div>
);
const SquadProposed = () => (
  <div style={{ border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, overflow: "hidden" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", background: c.surface }}>
      <thead>
        <tr style={{ background: c.surfaceAlt }}>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>SQUAD ↓</th>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>PROJECTS</th>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>PEOPLE</th>
          <th style={{ padding: space[2], textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>COMMIT</th>
        </tr>
      </thead>
      <tbody>
        <tr>{squadCell("Customer")}{squadCell("14")}{squadCell("7")}{squadCell("82%")}</tr>
        <tr style={{ opacity: 0.5 }}>{squadCell("AI", c.textDim)}{squadCell("—", c.textDim)}{squadCell("—", c.textDim)}{squadCell("—", c.textDim)}</tr>
      </tbody>
    </table>
    <div style={{ padding: space[2], background: c.surfaceAlt, borderTop: `1px solid ${c.border}`, fontFamily: body, fontSize: 11, color: c.textDim, textAlign: "center" }}>
      8 inactive squads hidden · <span style={{ color: c.accent, cursor: "pointer", textDecoration: "underline" }}>Show all</span>
    </div>
  </div>
);

// #10 — Colour-only encoding on Phase pills ───────────────────────────
const phasePill = (label, color, letter, withLetter) => (
  <span key={label} style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 8px", borderRadius: 4,
    background: `${color}18`, border: `1px solid ${color}35`,
    fontFamily: mono, fontSize: 11, fontWeight: 700, color,
  }}>
    {withLetter && <span style={{ fontWeight: 800, opacity: 0.7 }}>{letter}</span>}
    {label}
  </span>
);
const PhaseCurrent = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: space[1] }}>
    {phasePill("PRD",    "#6D28D9", "P", false)}
    {phasePill("DESIGN", "#1D4ED8", "D", false)}
    {phasePill("DEV",    "#B45309", "V", false)}
    {phasePill("QA",     "#0E7490", "Q", false)}
    {phasePill("ALPHA",  "#059669", "A", false)}
    {phasePill("BETA",   "#059669", "B", false)}
    {phasePill("GA",     "#059669", "G", false)}
  </div>
);
const PhaseProposed = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: space[1] }}>
    {phasePill("PRD",    "#6D28D9", "◆", true)}
    {phasePill("DESIGN", "#1D4ED8", "◇", true)}
    {phasePill("DEV",    "#B45309", "▲", true)}
    {phasePill("QA",     "#0E7490", "◐", true)}
    {phasePill("ALPHA",  "#059669", "α", true)}
    {phasePill("BETA",   "#059669", "β", true)}
    {phasePill("GA",     "#059669", "✓", true)}
  </div>
);

// #11 — Header density + Terminal rename ──────────────────────────────
const HeaderCurrent = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <div style={{
      padding: `${space[2]}px ${space[3]}px`, background: c.surface,
      border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
      display: "flex", alignItems: "center", gap: space[2],
    }}>
      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700 }}>FLOW</span>
      <span style={{ fontFamily: body, fontSize: 11, color: c.textMid }}>Summary · Projects · People · Pulse · Commit · Guide</span>
      <span style={{ marginLeft: "auto", fontFamily: body, fontSize: 11, color: c.textDim }}>🔍</span>
      <span style={{ fontFamily: body, fontSize: 11, color: c.textDim, border: `1px solid ${c.border}`, padding: "2px 6px", borderRadius: 4 }}>Terminal</span>
    </div>
    <div style={{
      padding: `${space[2]}px ${space[3]}px`, background: c.surfaceAlt,
      border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
      display: "flex", alignItems: "center", gap: space[2], fontSize: 11,
    }}>
      <span style={{ fontFamily: mono, color: c.textMid }}>WK ◂ Apr 13 ▸</span>
      <span style={{ fontFamily: body, color: c.textDim, fontStyle: "italic" }}>Click to learn more in the Guide</span>
      <span style={{ fontFamily: body, color: c.orange }}>Rest day</span>
      <span style={{ marginLeft: "auto", fontFamily: body, color: c.textMid }}>= Filters</span>
    </div>
  </div>
);
const HeaderProposed = () => (
  <div style={{
    padding: `${space[2]}px ${space[3]}px`, background: c.surface,
    border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
    display: "flex", alignItems: "center", gap: space[2],
  }}>
    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700 }}>FLOW</span>
    <span style={{ fontFamily: body, fontSize: 11, color: c.text, fontWeight: 600 }}>Summary</span>
    <span style={{ fontFamily: body, fontSize: 11, color: c.textMid }}>Projects · People · Pulse · Commit · Guide</span>
    <span style={{ fontFamily: mono, fontSize: 11, color: c.textMid, marginLeft: space[3] }}>WK ◂ Apr 13 – 19 ▸</span>
    <span style={{ marginLeft: "auto", display: "flex", gap: space[2], alignItems: "center" }}>
      <span style={{ fontFamily: body, fontSize: 11, color: c.textDim }}>Filters</span>
      <span style={{ fontFamily: body, fontSize: 11, color: c.textDim, border: `1px solid ${c.border}`, padding: "2px 6px", borderRadius: 4 }}>Command ⌘K</span>
    </span>
  </div>
);

// #12 — Pulse identity (A/B) ───────────────────────────────────────────
const PulseOptionA = () => (
  <div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginBottom: 4 }}>OPTION A · LIVE / NOW</div>
    <div style={{ padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, display: "flex", flexDirection: "column", gap: space[2] }}>
      <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.green, animation: "pulse 2s infinite" }} />
        <span style={{ fontFamily: mono, fontSize: 11, color: c.green, letterSpacing: "0.08em" }}>LIVE · 3 min ago</span>
      </div>
      <div style={{ fontFamily: body, fontSize: 12, color: c.text }}><b>Mariam R.</b> · moved X12 to Design stage</div>
      <div style={{ fontFamily: body, fontSize: 12, color: c.text }}><b>Ayush K.</b> · closed commit on X46</div>
      <div style={{ fontFamily: body, fontSize: 12, color: c.textMid }}><b>Hamza T.</b> · 12 min ago · locked week</div>
    </div>
  </div>
);
const PulseOptionB = () => (
  <div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginBottom: 4 }}>OPTION B · MERGE WITH PROJECTS</div>
    <div style={{ padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, display: "flex", flexDirection: "column", gap: space[2] }}>
      <div style={{ display: "flex", gap: space[1] }}>
        <span style={{ padding: "2px 10px", background: `${c.accent}15`, border: `1px solid ${c.accent}35`, color: c.accent, fontFamily: mono, fontSize: 11, fontWeight: 700, borderRadius: 4 }}>Live pulse</span>
        <span style={{ padding: "2px 10px", background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.textMid, fontFamily: mono, fontSize: 11, fontWeight: 700, borderRadius: 4 }}>All</span>
        <span style={{ padding: "2px 10px", background: c.surfaceAlt, border: `1px solid ${c.border}`, color: c.textMid, fontFamily: mono, fontSize: 11, fontWeight: 700, borderRadius: 4 }}>At risk</span>
      </div>
      <div style={{ fontFamily: body, fontSize: 11, color: c.textDim }}>Pulse becomes a <i>filter</i> on Projects, not a separate page. One portfolio table, multiple lenses.</div>
    </div>
  </div>
);

// #13 — Rest day meaning (A/B) ─────────────────────────────────────────
const RestDayA = () => (
  <div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginBottom: 4 }}>OPTION A · PERSONAL STATUS</div>
    <div style={{ padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, display: "flex", alignItems: "center", gap: space[2] }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: c.accentDim, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent }}>AJ</div>
      <span style={{ fontFamily: body, fontSize: 12, color: c.text }}>Anmol Jain</span>
      <Badge color={c.orange} bg={c.orangeDim}>💤 Rest day</Badge>
    </div>
    <div style={{ fontFamily: body, fontSize: 11, color: c.textDim, marginTop: 4 }}>Marks you out for the week. Your 3 slots zero out.</div>
  </div>
);
const RestDayB = () => (
  <div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginBottom: 4 }}>OPTION B · DAY-OF-WEEK CONTEXT</div>
    <div style={{ padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, display: "flex", alignItems: "center", gap: space[2] }}>
      <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.text }}>Sat · Apr 19</span>
      <span style={{ width: 1, height: 14, background: c.border }} />
      <Badge color={c.orange} bg={c.orangeDim}>Rest day</Badge>
    </div>
    <div style={{ fontFamily: body, fontSize: 11, color: c.textDim, marginTop: 4 }}>Calendar signal: Mon=Focus, Tue/Wed=Sprint, Thu=Release, Fri=Review, Sat/Sun=Rest.</div>
  </div>
);

// #14 — Board view keyboard trap ──────────────────────────────────────
const BoardCurrent = () => (
  <div style={{
    padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
    display: "flex", alignItems: "center", gap: space[2],
  }}>
    <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text }}>Board View</span>
    <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 14, color: c.textMid, cursor: "pointer" }}>✕</span>
    <div style={{ width: "100%", fontFamily: mono, fontSize: 10, color: c.red }}>only way out · no ESC · no breadcrumb · global nav hidden</div>
  </div>
);
const BoardProposed = () => (
  <div style={{
    padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
    display: "flex", alignItems: "center", gap: space[2],
  }}>
    <span style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>‹ Projects</span>
    <span style={{ fontFamily: body, fontSize: 12, color: c.textDim }}>›</span>
    <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text }}>Board View</span>
    <span style={{ marginLeft: "auto", fontFamily: mono, fontSize: 10, color: c.textDim, border: `1px solid ${c.border}`, padding: "2px 6px", borderRadius: 4 }}>esc</span>
    <span style={{ fontFamily: mono, fontSize: 14, color: c.textMid, cursor: "pointer" }}>✕</span>
  </div>
);

// #15 — Guide mini-previews as deep-links ─────────────────────────────
const GuideMiniCurrent = () => (
  <div style={{ padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm }}>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginBottom: space[1] }}>SUMMARY · KPI PREVIEW</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: space[2] }}>
      <KPIMini label="In Flight" value="78" sub="+3" />
      <KPIMini label="Idle" value="22" sub="-2" />
      <KPIMini label="Done" value="63%" sub="+5" />
    </div>
    <div style={{ fontFamily: mono, fontSize: 10, color: c.red, marginTop: space[2] }}>no link · purely decorative</div>
  </div>
);
const GuideMiniProposed = () => (
  <div style={{ padding: space[3], background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm }}>
    <div style={{ display: "flex", alignItems: "center", marginBottom: space[1] }}>
      <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>SUMMARY · KPI PREVIEW</span>
      <span style={{ marginLeft: "auto", fontFamily: body, fontSize: 11, color: c.accent, cursor: "pointer" }}>Open Summary →</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: space[2] }}>
      <KPIMini label="In Flight" value="78" arrow="↑" sub="+3 WoW" subColor={c.green} />
      <KPIMini label="Idle" value="22" arrow="↓" sub="-2 WoW" subColor={c.green} />
      <KPIMini label="Done" value="63%" arrow="↑" sub="+5 pts WoW" subColor={c.green} />
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   ITEMS
   ════════════════════════════════════════════════════════════════════ */
const ITEMS = [
  {
    id: 1, title: "KPI deltas need direction · unit · colour",
    tier: "P0", score: 4.5, impact: 3, effort: 2, breadth: 3,
    why: "Mixing signs and units without direction or colour prevents skimming. Standard: value · arrow · semantic colour · unit · baseline.",
    resolves: ["Summary #3", "Summary #4", "Commit #1", "Commit #2", "Commit #3", "Pulse #4", "Guide #5", "Guide #6"],
    mode: "fix", before: KpiCurrent, after: KpiProposed,
  },
  {
    id: 2, title: "Responsive breakpoints · nav overflow + reflow",
    tier: "P0", score: 3.0, impact: 3, effort: 3, breadth: 3,
    why: "Page horizontally overflows at 768px with no reflow. Nav labels clip below 1100px. Needs an overflow menu + a real mobile layout.",
    resolves: ["A11y #1", "§8 · 6 items (tablet/mobile)"],
    mode: "fix", before: RespCurrent, after: RespProposed,
  },
  {
    id: 3, title: "Purge placeholder / test data from production",
    tier: "P0", score: 9.0, impact: 3, effort: 1, breadth: 3,
    why: "Rows like AJ/AJ/Core, X105 'abc', X106 'test test testing' expose seed data. Trust-destroying on a tool pitched as team-wide.",
    resolves: ["Projects #2", "People #4", "Commit #7"],
    mode: "fix", before: DataCurrent, after: DataProposed,
  },
  {
    id: 4, title: "Keep global nav visible on detail views",
    tier: "P0", score: 6.0, impact: 3, effort: 1, breadth: 2,
    why: "Drilling into a person or commit replaces the full nav with just a breadcrumb — you can't jump to Summary/Pulse/Guide without clicking back. Keyboard-trap for a11y.",
    resolves: ["People #10", "Commit #10", "A11y #2"],
    mode: "fix", before: DetailHeaderCurrent, after: DetailHeaderProposed,
  },
  {
    id: 5, title: "Standardise name format",
    tier: "P0", score: 6.0, impact: 2, effort: 1, breadth: 3,
    why: "'Ibrahim K.' vs 'Ayush Kapoor' in the same list — pick one (full name + full-initial avatar) and apply globally via a helper.",
    resolves: ["Projects #7", "People #3", "Commit #8"],
    mode: "fix", before: NameCurrent, after: NameProposed,
  },
  {
    id: 6, title: "Promote inline status text to proper pills",
    tier: "P0", score: 4.0, impact: 2, effort: 1, breadth: 2,
    why: "'Store Locator ENDING SOON' is inline text glued into the name. Breaks alphabetical sort, not scannable. Lift into a Badge.",
    resolves: ["Projects #3", "Pulse #6"],
    mode: "fix", before: StatusCurrent, after: StatusProposed,
  },
  {
    id: 7, title: "ARIA roles on shared primitives",
    tier: "P1", score: 3.0, impact: 2, effort: 2, breadth: 3,
    why: "Stepper needs role=tablist + aria-current. Segmented chips need role=radiogroup/aria-pressed. Progress bars need role=progressbar. Fix once in shared.jsx, applies everywhere.",
    resolves: ["Commit #11", "Commit #13", "A11y #7", "A11y #8", "A11y #9"],
    mode: "fix", before: StepperCurrent, after: StepperProposed,
  },
  {
    id: 8, title: "Week indicator shows a range + symmetric arrows",
    tier: "P1", score: 2.0, impact: 2, effort: 1, breadth: 1,
    why: "'Apr 13, 2026' doesn't say whether it's start/end/label. 'Already on current week' is text where an arrow should be.",
    resolves: ["Summary #1"],
    mode: "fix", before: WeekCurrent, after: WeekProposed,
  },
  {
    id: 9, title: "Squad Performance · tame the empty rows",
    tier: "P1", score: 2.0, impact: 2, effort: 2, breadth: 2,
    why: "Nine squads show blank cells that read as either zero or missing. Show '—' or hide inactive squads behind a toggle. Sticky first column on horizontal scroll.",
    resolves: ["Summary #7", "Summary #8", "Summary #9"],
    mode: "fix", before: SquadCurrent, after: SquadProposed,
  },
  {
    id: 10, title: "Pair colour with icon/letter on Phase pills",
    tier: "P1", score: 4.0, impact: 2, effort: 1, breadth: 2,
    why: "Seven phases use seven pill colours — colour-blind users have no backup encoding. Add an icon or glyph prefix.",
    resolves: ["Guide #7", "A11y #13"],
    mode: "fix", before: PhaseCurrent, after: PhaseProposed,
  },
  {
    id: 11, title: "Collapse header clutter · rename Terminal → Command",
    tier: "P1", score: 2.0, impact: 2, effort: 1, breadth: 1,
    why: "'Terminal' implies a dev console — it's a command palette. Rename + show shortcut. Collapse the 'Click to learn more' hint into a (?) icon.",
    resolves: ["Summary #11", "Summary #12"],
    mode: "fix", before: HeaderCurrent, after: HeaderProposed,
  },
  {
    id: 12, title: "Pulse's identity — product call",
    tier: "Needs product call", score: 1.3, impact: 2, effort: 3, breadth: 2,
    why: "Pulse's Project Matrix duplicates ~80% of the Projects table. Either lean into live/now (A) or merge into Projects as a filter (B).",
    resolves: ["Pulse #1"],
    mode: "ab", optionA: PulseOptionA, optionB: PulseOptionB,
    optionALabel: "Live / now feed", optionBLabel: "Merge into Projects",
  },
  {
    id: 13, title: "'Rest day' — personal or calendar? — product call",
    tier: "Needs product call", score: 4.0, impact: 2, effort: 1, breadth: 2,
    why: "Currently floats in the header with no referent. Pick one: personal status (anchors to user chip, zeroes out slots) or day-of-week context (anchors to date).",
    resolves: ["Summary #2", "Commit #18", "Open Q #1"],
    mode: "ab", optionA: RestDayA, optionB: RestDayB,
    optionALabel: "Personal status", optionBLabel: "Calendar context",
  },
  {
    id: 14, title: "Board view · ESC + breadcrumb",
    tier: "P2", score: 2.0, impact: 2, effort: 1, breadth: 1,
    why: "Board opens as a full-screen overlay with X as the only exit. Add ESC and a breadcrumb so keyboard users don't feel trapped.",
    resolves: ["Projects #8"],
    mode: "fix", before: BoardCurrent, after: BoardProposed,
  },
  {
    id: 15, title: "Guide mini-previews as deep-links",
    tier: "P2", score: 1.0, impact: 1, effort: 2, breadth: 2,
    why: "The KPI tile, Gantt strip, and stepper in the Guide are decorative. Make them deep-links to the real surface.",
    resolves: ["Guide #4", "Summary #14 (partial)"],
    mode: "fix", before: GuideMiniCurrent, after: GuideMiniProposed,
  },
];

/* ════════════════════════════════════════════════════════════════════
   MAIN VIEW
   ════════════════════════════════════════════════════════════════════ */

const TIER_COLORS = {
  "P0": c.red,
  "P1": c.orange,
  "P2": c.textMid,
  "Needs product call": c.purple || "#6D28D9",
};

const DECISION_COLORS = {
  approve: c.green,
  optionA: c.accent,
  optionB: c.accent,
  skip:    c.textMid,
  defer:   c.orange,
};

function useDecisions() {
  const [decisions, setDecisions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  }, [decisions]);
  const set = (id, val) => setDecisions(prev => ({ ...prev, [id]: val }));
  const clear = () => setDecisions({});
  return [decisions, set, clear];
}

function DecisionButton({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      padding: `${space[2]}px ${space[4]}px`,
      borderRadius: layout.radiusSm,
      border: `1px solid ${active ? color : c.border}`,
      background: active ? `${color}15` : c.surface,
      color: active ? color : c.textMid,
      fontFamily: body, fontSize: 13, fontWeight: 600,
      cursor: "pointer",
      transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
    }}>{children}</button>
  );
}

function Card({ item, decision, onDecide }) {
  const BeforeC = item.before;
  const AfterC = item.after;
  const OptA = item.optionA;
  const OptB = item.optionB;
  const tierColor = TIER_COLORS[item.tier] || c.textMid;

  return (
    <Surface style={{
      maxWidth: 1040, margin: "0 auto", marginBottom: space[5],
      padding: space[6],
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: space[3], marginBottom: space[3], flexWrap: "wrap" }}>
        <span style={{
          fontFamily: mono, fontSize: 11, fontWeight: 800, color: c.textDim,
          padding: `2px 8px`, border: `1px solid ${c.border}`, borderRadius: 4,
        }}>#{item.id}</span>
        <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, flex: 1, minWidth: 0 }}>
          {item.title}
        </span>
        <Badge color={tierColor} bg={`${tierColor}15`} style={{ border: `1px solid ${tierColor}25` }}>{item.tier}</Badge>
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.textDim }}>
          impact {item.impact} · effort {item.effort} · breadth {item.breadth} · score {item.score}
        </span>
      </div>

      {/* Why */}
      <div style={{ fontFamily: body, fontSize: 13, color: c.textMid, lineHeight: 1.5, marginBottom: space[4] }}>
        {item.why}
      </div>

      {/* Before / After or A / B */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[4], marginBottom: space[4] }}>
        {item.mode === "fix" ? (
          <>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: c.red, marginBottom: space[2] }}>── CURRENT ──</div>
              <BeforeC />
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: c.green, marginBottom: space[2] }}>── PROPOSED ──</div>
              <AfterC />
            </div>
          </>
        ) : (
          <>
            <div><OptA /></div>
            <div><OptB /></div>
          </>
        )}
      </div>

      {/* Resolves */}
      <div style={{ display: "flex", gap: space[1], flexWrap: "wrap", marginBottom: space[4] }}>
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.08em" }}>RESOLVES:</span>
        {item.resolves.map(r => (
          <span key={r} style={{
            fontFamily: mono, fontSize: 10, fontWeight: 600, color: c.textDim,
            padding: "1px 6px", background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 4,
          }}>{r}</span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
        {item.mode === "fix" ? (
          <>
            <DecisionButton active={decision === "approve"} onClick={() => onDecide("approve")} color={DECISION_COLORS.approve}>✓ Approve</DecisionButton>
            <DecisionButton active={decision === "skip"}    onClick={() => onDecide("skip")}    color={DECISION_COLORS.skip}>Skip</DecisionButton>
            <DecisionButton active={decision === "defer"}   onClick={() => onDecide("defer")}   color={DECISION_COLORS.defer}>Defer</DecisionButton>
          </>
        ) : (
          <>
            <DecisionButton active={decision === "optionA"} onClick={() => onDecide("optionA")} color={DECISION_COLORS.optionA}>Choose A · {item.optionALabel}</DecisionButton>
            <DecisionButton active={decision === "optionB"} onClick={() => onDecide("optionB")} color={DECISION_COLORS.optionB}>Choose B · {item.optionBLabel}</DecisionButton>
            <DecisionButton active={decision === "skip"}    onClick={() => onDecide("skip")}    color={DECISION_COLORS.skip}>Skip for now</DecisionButton>
          </>
        )}
      </div>
    </Surface>
  );
}

export default function QAReviewView() {
  const [decisions, setDecision, clearAll] = useDecisions();
  const decided = Object.values(decisions).filter(Boolean).length;
  const approved = ITEMS.filter(i => decisions[i.id] === "approve" || decisions[i.id] === "optionA" || decisions[i.id] === "optionB");
  const skipped  = ITEMS.filter(i => decisions[i.id] === "skip");
  const deferred = ITEMS.filter(i => decisions[i.id] === "defer");

  const exportMd = () => {
    const lines = ["# Flow QA Review — Approved Punch-List", ""];
    lines.push(`**Reviewed:** ${new Date().toLocaleDateString()}  `);
    lines.push(`**Approved:** ${approved.length}  ·  **Skipped:** ${skipped.length}  ·  **Deferred:** ${deferred.length}`);
    lines.push("");
    if (approved.length) {
      lines.push("## Ship");
      approved.forEach(i => {
        const dec = decisions[i.id];
        const choice = dec === "optionA" ? ` — Option A (${i.optionALabel})` : dec === "optionB" ? ` — Option B (${i.optionBLabel})` : "";
        lines.push(`- [${i.tier}] #${i.id} · **${i.title}**${choice}`);
        lines.push(`  - Resolves: ${i.resolves.join(", ")}`);
      });
      lines.push("");
    }
    if (deferred.length) {
      lines.push("## Defer");
      deferred.forEach(i => lines.push(`- #${i.id} · ${i.title}`));
      lines.push("");
    }
    if (skipped.length) {
      lines.push("## Skip");
      skipped.forEach(i => lines.push(`- #${i.id} · ${i.title}`));
      lines.push("");
    }
    const md = lines.join("\n");
    navigator.clipboard?.writeText(md).catch(() => {});
    return md;
  };

  const [copied, setCopied] = useState(false);
  const onExport = () => {
    exportMd();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
      padding: `${space[7]}px ${space[5]}px ${space[8] + 40}px`,
    }}>
      {/* Top header */}
      <div style={{ maxWidth: 1040, margin: "0 auto", marginBottom: space[6] }}>
        <div style={{ fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: c.accent, textTransform: "uppercase", marginBottom: space[1] }}>QA Review · April 2026</div>
        <h1 style={{ fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight, letterSpacing: typo.displayLg.tracking, color: c.text, margin: 0, marginBottom: space[2] }}>
          Approve, skip, or defer each theme
        </h1>
        <div style={{ fontFamily: body, fontSize: 15, color: c.textMid, lineHeight: 1.5, marginBottom: space[4] }}>
          {ITEMS.length} themes · collapses ~89 atomic QA items · decisions persist locally. Export to copy a markdown punch-list of approved items.
        </div>

        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3], marginBottom: space[3] }}>
          <div style={{ flex: 1, height: 6, background: c.surfaceAlt, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(decided / ITEMS.length) * 100}%`, height: "100%", background: c.accent, transition: "width 0.3s ease" }} />
          </div>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.text, fontVariantNumeric: "tabular-nums" }}>
            {decided} / {ITEMS.length}
          </span>
        </div>

        {/* Summary chips */}
        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap", marginBottom: space[4] }}>
          <span style={{ padding: "4px 10px", background: `${c.green}15`, border: `1px solid ${c.green}30`, borderRadius: 4, fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.green }}>✓ APPROVED {approved.length}</span>
          <span style={{ padding: "4px 10px", background: `${c.orange}15`, border: `1px solid ${c.orange}30`, borderRadius: 4, fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.orange }}>⏸ DEFERRED {deferred.length}</span>
          <span style={{ padding: "4px 10px", background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 4, fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.textMid }}>— SKIPPED {skipped.length}</span>
          <span style={{ flex: 1 }} />
          <Btn variant="secondary" size="sm" onClick={clearAll}>Reset all</Btn>
          <Btn variant="primary" size="sm" onClick={onExport}>{copied ? "Copied ✓" : "Export markdown"}</Btn>
        </div>
      </div>

      {/* Cards */}
      {ITEMS.map(item => (
        <Card key={item.id} item={item} decision={decisions[item.id]} onDecide={val => setDecision(item.id, val)} />
      ))}

      {/* Footer */}
      <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center", paddingTop: space[5], borderTop: `1px solid ${c.border}` }}>
        <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: c.textDim, letterSpacing: "0.08em" }}>
          ?qaReview=1 · decisions persist to localStorage · clear cache to reset
        </div>
      </div>
    </div>
  );
}
