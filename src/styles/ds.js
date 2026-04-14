// Flow Design System v2 — Steel & Orange
// Single source of truth for all design tokens (colors, typography, spacing,
// elevation, radius, motion). `theme.js` consumes these for its light theme;
// the Terminal/Rant/Admin views keep their own dark theme from theme.js.
//
// Reference: DESIGN_SYSTEM.md

// ── Fonts ────────────────────────────────────────────────────────
export const fonts = {
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Menlo', monospace",
};

// ── Color system ─────────────────────────────────────────────────
export const color = {
  // Surfaces
  page:        "#EDEDF0",   // steel-gray aluminum canvas
  card:        "#FFFFFF",   // floating white card
  inset:       "#F3F3F6",   // recessed — inputs, segmented bg, search
  tableHeader: "#F7F7FA",   // column header row

  // Text
  textPrimary:   "#1A1A1E", // headings, KPI values, names
  textSecondary: "#4A4A52", // body, table cells
  textTertiary:  "#7E7E8A", // labels, placeholders, inactive nav
  textGhost:     "#AEAEB8", // decorative, kbd hints, disabled

  // Accent — orange
  accent:        "#E8590C",
  accentSoft:    "rgba(232,89,12,0.08)",
  accentMid:     "rgba(232,89,12,0.18)",
  accentGlow:    "rgba(232,89,12,0.25)",

  // Borders
  borderSubtle: "rgba(0,0,0,0.07)",
  borderMedium: "rgba(0,0,0,0.12)",

  // Semantic — data-only
  green:  "#059669", greenBg:  "#ECFDF5", greenDim:  "rgba(5,150,105,0.08)",
  red:    "#DC2626", redBg:    "#FEF2F2", redDim:    "rgba(220,38,38,0.08)",
  amber:  "#B45309", amberBg:  "#FFFBEB", amberDim:  "rgba(180,83,9,0.08)",
  purple: "#6D28D9", purpleBg: "#F5F3FF", purpleDim: "rgba(109,40,217,0.08)",
  blue:   "#1D4ED8", blueBg:   "#EFF6FF", blueDim:   "rgba(29,78,216,0.08)",
  cyan:   "#0E7490", cyanBg:   "#ECFEFF", cyanDim:   "rgba(14,116,144,0.08)",

  // Health thresholds — slightly brighter than token semantic
  healthGood: "#059669", // 75-100
  healthFair: "#D97706", // 40-74 (brighter amber for bars/numbers)
  healthLow:  "#DC2626", // 0-39
};

// Phase → color map
export const phaseColorMap = {
  PRD:    color.purple,
  Design: color.blue,
  Dev:    color.amber,
  QA:     color.cyan,
  Alpha:  color.green,
  Beta:   color.green,
  GA:     color.green,
};

// ── Spacing (4px base) ───────────────────────────────────────────
export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40,
};

// ── Border radius ────────────────────────────────────────────────
export const radius = {
  xs:   5,   // tags, phase pills
  sm:   8,   // buttons, inputs, small cards
  md:   12,  // segmented, dropdowns
  lg:   14,  // KPI cards, tables, commit cards, modals
  pill: 100, // pill buttons, avatar badges
};

// ── Elevation (4-tier layered shadows) ───────────────────────────
export const shadow = {
  none:     "none",
  sm:       "0 1px 2px rgba(0,0,0,0.04)",
  card:     "0 1px 3px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05)",
  elevated: "0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.07)",
  float:    "0 8px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
};

// ── Typography ───────────────────────────────────────────────────
// Hard rule: nothing below 11px.
export const typography = {
  kpiHero:      { font: fonts.mono, size: 36, weight: 700, tracking: "-0.03em", lineHeight: 1.1 },
  displayLg:    { font: fonts.sans, size: 24, weight: 700, tracking: "-0.02em", lineHeight: 1.15 },
  displayMd:    { font: fonts.sans, size: 20, weight: 700, tracking: "-0.02em", lineHeight: 1.2  },
  displaySm:    { font: fonts.sans, size: 16, weight: 700, tracking: "-0.01em", lineHeight: 1.3  },
  nav:          { font: fonts.sans, size: 13, weight: 600, tracking: "0",       lineHeight: 1.3  },
  bodyLg:       { font: fonts.sans, size: 15, weight: 500, tracking: "0",       lineHeight: 1.5  },
  body:         { font: fonts.sans, size: 14, weight: 500, tracking: "0",       lineHeight: 1.5  },
  bodySm:       { font: fonts.sans, size: 13, weight: 500, tracking: "0",       lineHeight: 1.5  },
  sectionTitle: { font: fonts.mono, size: 12, weight: 700, tracking: "0.08em",  lineHeight: 1.3,  transform: "uppercase" },
  tableHeader:  { font: fonts.sans, size: 12, weight: 600, tracking: "0.03em",  lineHeight: 1.3,  transform: "uppercase" },
  kpiLabel:     { font: fonts.sans, size: 12, weight: 600, tracking: "0.04em",  lineHeight: 1.3,  transform: "uppercase" },
  monoData:     { font: fonts.mono, size: 13, weight: 700, tracking: "0",       lineHeight: 1.3  },
  monoSm:       { font: fonts.mono, size: 12, weight: 700, tracking: "0.02em",  lineHeight: 1.3  },
  badge:        { font: fonts.sans, size: 12, weight: 700, tracking: "0",       lineHeight: 1.3  },
  tag:          { font: fonts.mono, size: 11, weight: 700, tracking: "0.04em",  lineHeight: 1.3  },
  micro:        { font: fonts.sans, size: 11, weight: 600, tracking: "0",       lineHeight: 1.3  },
};

// ── Motion ───────────────────────────────────────────────────────
export const motionTier = {
  instant: { duration: "100ms", easing: "ease-out" },
  fast:    { duration: "150ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  normal:  { duration: "250ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  slow:    { duration: "400ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
};

// Convenience bundle
export const ds = { color, space, radius, shadow, typography, fonts, motionTier, phaseColorMap };
export default ds;
