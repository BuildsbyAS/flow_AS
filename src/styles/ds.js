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
  accentHover:   "#D24E0A",   // slightly darker — primary CTA hover
  accentSoft:    "rgba(232,89,12,0.08)",
  accentMid:     "rgba(232,89,12,0.18)",
  accentGlow:    "rgba(232,89,12,0.25)",

  // Text on colored surfaces
  textOnAccent:  "#FFFFFF",   // text on accent bg (primary buttons, etc.)

  // Inverted surface family (HealthGauge — the only inverted card)
  // Text tokens bumped 2026-04 for readability: previous #6B6B78/#4A4A52
  // had ~3.5:1 / ~1.7:1 contrast against #1A1A1E bg, failing WCAG AA.
  // New values land at ~6:1 / ~4:1 and keep the three-tier hierarchy.
  surfaceInverse:       "#1A1A1E",
  insetInverse:         "#2E2E36",
  textOnInverse:        "#F0F0F4",
  textMidOnInverse:     "#A5A5B2",
  textGhostOnInverse:   "#8F8F9A",

  // Borders
  borderSubtle: "rgba(0,0,0,0.07)",
  borderMedium: "rgba(0,0,0,0.12)",

  // Semantic — data-only
  // Family: <color> (full), <color>Bg (full light bg), <color>Dim (8% alpha tint),
  // <color>Mid (18% alpha — phase-tinted cell bg), <color>Border (25% alpha — card border).
  green:  "#059669", greenBg:  "#ECFDF5", greenDim:  "rgba(5,150,105,0.08)",   greenMid:  "rgba(5,150,105,0.18)",   greenBorder:  "rgba(5,150,105,0.25)",
  red:    "#DC2626", redBg:    "#FEF2F2", redDim:    "rgba(220,38,38,0.08)",   redMid:    "rgba(220,38,38,0.18)",   redBorder:    "rgba(220,38,38,0.25)",
  amber:  "#B45309", amberBg:  "#FFFBEB", amberDim:  "rgba(180,83,9,0.08)",    amberMid:  "rgba(180,83,9,0.18)",    amberBorder:  "rgba(180,83,9,0.25)",
  purple: "#6D28D9", purpleBg: "#F5F3FF", purpleDim: "rgba(109,40,217,0.08)",  purpleMid: "rgba(109,40,217,0.18)",  purpleBorder: "rgba(109,40,217,0.25)",
  blue:   "#1D4ED8", blueBg:   "#EFF6FF", blueDim:   "rgba(29,78,216,0.08)",   blueMid:   "rgba(29,78,216,0.18)",   blueBorder:   "rgba(29,78,216,0.25)",
  cyan:   "#0E7490", cyanBg:   "#ECFEFF", cyanDim:   "rgba(14,116,144,0.08)",  cyanMid:   "rgba(14,116,144,0.18)",  cyanBorder:   "rgba(14,116,144,0.25)",

  // Health thresholds — slightly brighter than token semantic
  healthGood: "#059669", // 75-100
  healthFair: "#D97706", // 40-74 (brighter amber for bars/numbers)
  healthLow:  "#DC2626", // 0-39
};

// ── Terminal Dark palette ────────────────────────────────────────
// The Terminal / Rant / Admin views run a dedicated dark theme
// (DESIGN_SYSTEM.md §12). Retro phosphor aesthetic: pure-black canvas,
// glowing monochrome accents per view. Tints use hex-alpha suffix,
// e.g. `${terminal.green}20` = 12% opacity.
export const terminal = {
  // Surfaces
  bg:            "#0D0F0D",   // pure near-black canvas
  surfaceDeep:   "#060A12",   // recessed panels (log viewer, auth box)
  gradientStart: "#0a0e14",   // hero gradient start
  gradientEnd:   "#111820",   // hero gradient end

  // Primary accents — each view elects one as its "phosphor" color
  green:     "#00ff41",   // Terminal shell, Rant form
  greenDeep: "#00cc33",   // gradient stop for green hero
  gold:      "#FBBF24",   // Admin settings, Terminal admin path
  goldDeep:  "#F59E0B",   // gradient stop for gold hero

  // Semantic accents — chips, category tags, status pills on dark
  pink:    "#FF2D78",   // rant category
  coral:   "#FF6B35",   // bug category
  red:     "#FF4D6A",   // errors, destructive
  redDeep: "#cc3355",   // gradient stop for red toast
  success: "#84FF95",   // approved, replied
  cyan:    "#22D3EE",   // shipped, info
  purple:  "#A78BFA",   // feature request

  // Text on dark
  text:      "#FFFFFF",
  textMid:   "#FFFFFFCC",
  textDim:   "#FFFFFFBB",
  textGhost: "#FFFFFFAA",
  textFaint: "#FFFFFF80",
};

// Terminal Dark uses a tighter radius scale than the main app — the retro
// phosphor aesthetic reads "sharper" at smaller radii.
export const terminalRadius = {
  xs: 3,    // tightest — inline ID/status chips
  sm: 4,    // chips, inputs, secondary buttons (the default)
  md: 6,    // cards, primary CTAs, image thumbs
  lg: 12,   // floating toasts, notification pills
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

// Phase → tinted background (18% alpha) — for phase-colored cell backgrounds
export const phaseMidMap = {
  PRD:    color.purpleMid,
  Design: color.blueMid,
  Dev:    color.amberMid,
  QA:     color.cyanMid,
  Alpha:  color.greenMid,
  Beta:   color.greenMid,
  GA:     color.greenMid,
};

// Phase → soft background (8% alpha) — for phase-colored pills and tags
export const phaseDimMap = {
  PRD:    color.purpleDim,
  Design: color.blueDim,
  Dev:    color.amberDim,
  QA:     color.cyanDim,
  Alpha:  color.greenDim,
  Beta:   color.greenDim,
  GA:     color.greenDim,
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
export const ds = { color, space, radius, shadow, typography, fonts, motionTier, phaseColorMap, phaseMidMap, phaseDimMap };
export default ds;
