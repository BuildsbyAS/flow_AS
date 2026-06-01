// Flow Design System v3 — Obsidian
// Monochrome glass aesthetic: black header, frosted glass cards, warm grey canvas.
// Inspired by SmartThings glass panels, SugarCRM card hierarchy, Twisty dashboard.
//
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
  page:        "#E8E8E8",   // warm neutral grey canvas
  card:        "rgba(255,255,255,0.62)", // frosted glass card
  cardSolid:   "#FFFFFF",   // when glass isn't suitable (modals, inputs)
  inset:       "rgba(0,0,0,0.04)",       // recessed — inputs, segmented bg, search
  tableHeader: "rgba(0,0,0,0.03)",       // column header row

  // Header
  headerBg:    "#111111",   // solid black header
  headerText:  "#FFFFFF",   // white text on header
  headerTextDim: "rgba(255,255,255,0.55)", // secondary text on header

  // Text — pure monochrome hierarchy
  textPrimary:   "#111111", // headings, KPI values, names
  textSecondary: "#555555", // body, table cells
  textTertiary:  "#999999", // labels, placeholders, inactive nav
  textGhost:     "#CCCCCC", // decorative, kbd hints, disabled

  // Primary accent — black (monochrome primary CTA)
  accent:        "#111111",
  accentHover:   "#333333",
  accentSoft:    "rgba(0,0,0,0.06)",
  accentMid:     "rgba(0,0,0,0.12)",
  accentGlow:    "rgba(0,0,0,0.18)",

  // Secondary accent — none (keeping monochrome). Use semantic colors for pops.
  coral:         "#E11D48",   // kept for destructive / urgent (rose-600)
  coralHover:    "#BE123C",
  coralSoft:     "rgba(225,29,72,0.08)",
  coralMid:      "rgba(225,29,72,0.14)",

  // Text on colored surfaces
  textOnAccent:  "#FFFFFF",   // text on accent bg (primary buttons, etc.)

  // Inverted surface family (HealthGauge — the only inverted card)
  surfaceInverse:       "#111111",
  insetInverse:         "#222222",
  textOnInverse:        "#F5F5F5",
  textMidOnInverse:     "#999999",
  textGhostOnInverse:   "#666666",

  // Borders — monochrome
  borderSubtle: "rgba(0,0,0,0.07)",
  borderMedium: "rgba(0,0,0,0.13)",

  // Semantic — data-only
  green:  "#059669", greenBg:  "#ECFDF5", greenDim:  "rgba(5,150,105,0.08)",   greenMid:  "rgba(5,150,105,0.18)",   greenBorder:  "rgba(5,150,105,0.25)",
  red:    "#DC2626", redBg:    "#FEF2F2", redDim:    "rgba(220,38,38,0.08)",   redMid:    "rgba(220,38,38,0.18)",   redBorder:    "rgba(220,38,38,0.25)",
  amber:  "#B45309", amberBg:  "#FFFBEB", amberDim:  "rgba(180,83,9,0.08)",    amberMid:  "rgba(180,83,9,0.18)",    amberBorder:  "rgba(180,83,9,0.25)",
  purple: "#6D28D9", purpleBg: "#F5F3FF", purpleDim: "rgba(109,40,217,0.08)",  purpleMid: "rgba(109,40,217,0.18)",  purpleBorder: "rgba(109,40,217,0.25)",
  blue:   "#1D4ED8", blueBg:   "#EFF6FF", blueDim:   "rgba(29,78,216,0.08)",   blueMid:   "rgba(29,78,216,0.18)",   blueBorder:   "rgba(29,78,216,0.25)",
  cyan:   "#0E7490", cyanBg:   "#ECFEFF", cyanDim:   "rgba(14,116,144,0.08)",  cyanMid:   "rgba(14,116,144,0.18)",  cyanBorder:   "rgba(14,116,144,0.25)",

  // Health thresholds
  healthGood: "#059669",
  healthFair: "#D97706",
  healthLow:  "#DC2626",

  // Glassmorphism
  glassBg:      "rgba(255,255,255,0.62)",
  glassBorder:  "rgba(255,255,255,0.45)",
  glassOverlay: "rgba(255,255,255,0.82)",
  glassBlur:    "20px",
  glassSaturate: "1.4",
  // Dark glass (for overlays on dark surfaces)
  glassDark:       "rgba(0,0,0,0.65)",
  glassDarkBorder: "rgba(255,255,255,0.08)",
};

// ── Terminal Dark palette ────────────────────────────────────────
export const terminal = {
  bg:            "#0D0F0D",
  surfaceDeep:   "#060A12",
  gradientStart: "#0a0e14",
  gradientEnd:   "#111820",
  green:     "#00ff41",
  greenDeep: "#00cc33",
  gold:      "#FBBF24",
  goldDeep:  "#F59E0B",
  pink:    "#FF2D78",
  coral:   "#FF6B35",
  red:     "#FF4D6A",
  redDeep: "#cc3355",
  success: "#84FF95",
  cyan:    "#22D3EE",
  purple:  "#A78BFA",
  text:      "#FFFFFF",
  textMid:   "#FFFFFFCC",
  textDim:   "#FFFFFFBB",
  textGhost: "#FFFFFFAA",
  textFaint: "#FFFFFF80",
};

export const terminalRadius = {
  xs: 3, sm: 4, md: 6, lg: 12,
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

export const phaseMidMap = {
  PRD:    color.purpleMid,
  Design: color.blueMid,
  Dev:    color.amberMid,
  QA:     color.cyanMid,
  Alpha:  color.greenMid,
  Beta:   color.greenMid,
  GA:     color.greenMid,
};

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

// ── Border radius — rounder for glass feel ───────────────────────
export const radius = {
  xs:   6,    // tags, phase pills
  sm:   10,   // buttons, inputs, small cards
  md:   14,   // segmented, dropdowns
  lg:   18,   // KPI cards, tables, commit cards, modals
  xl:   24,   // hero cards, feature panels
  pill: 100,  // pill buttons, avatar badges
};

// ── Elevation (glass-appropriate layered shadows) ────────────────
export const shadow = {
  none:     "none",
  sm:       "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
  card:     "0 2px 8px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)",
  elevated: "0 8px 24px rgba(0,0,0,0.08), 0 24px 64px rgba(0,0,0,0.12)",
  float:    "0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
  glass:    "0 4px 30px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.3)",
};

// ── Typography ───────────────────────────────────────────────────
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

// ── Motion — spring-feel expo.out easing ─────────────────────────
export const motionTier = {
  instant: { duration: "100ms", easing: "ease-out" },
  fast:    { duration: "180ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  normal:  { duration: "280ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  slow:    { duration: "450ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  spring:  { duration: "500ms", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
};

// Convenience bundle
export const ds = { color, space, radius, shadow, typography, fonts, motionTier, phaseColorMap, phaseMidMap, phaseDimMap };
export default ds;
