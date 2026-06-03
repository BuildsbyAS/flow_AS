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
  sans: "'Geist', system-ui, -apple-system, sans-serif",
  mono: "'Geist', system-ui, -apple-system, sans-serif",
};

// ── Color system ─────────────────────────────────────────────────
// Field design tokens (Noon) — applied product-wide.
export const color = {
  // Surfaces
  page:        "#f2f3f7",   // grey app canvas (surface/tertiary)
  card:        "#ffffff",   // solid white container
  cardSolid:   "#ffffff",
  inset:       "#f9f9fb",   // recessed — inputs, table header (surface/secondary)
  tableHeader: "#f9f9fb",

  // Header / inverted dark (terminal + dark buttons)
  headerBg:    "#101628",
  headerText:  "#ffffff",
  headerTextDim: "rgba(255,255,255,0.55)",

  // Text — Field neutral ramp
  textPrimary:   "#1d2539", // text-n-icon/primary
  textSecondary: "#475067", // text-n-icon/secondary
  textTertiary:  "#666d85", // text-n-icon/tertiary
  textGhost:     "#989fb3", // text-n-icon/muted

  // Primary accent — NEUTRAL (actions/toggles/selected states use neutral tones)
  accent:        "#1d2539",
  accentHover:   "#344054",
  accentSoft:    "#f2f3f7",            // neutral light fill for selected/active
  accentMid:     "rgba(29,37,57,0.16)",
  accentGlow:    "rgba(29,37,57,0.12)",

  // Secondary accent — error/destructive
  coral:         "#d92626",
  coralHover:    "#b91c1c",
  coralSoft:     "#fff0f0",
  coralMid:      "rgba(217,38,38,0.14)",

  textOnAccent:  "#ffffff",

  // Inverted surface family (HealthGauge / dark)
  surfaceInverse:       "#101628",
  insetInverse:         "#1d2539",
  textOnInverse:        "#ffffff",
  textMidOnInverse:     "#989fb3",
  textGhostOnInverse:   "#666d85",

  // Borders — Field
  borderSubtle: "#eaecf0",  // border/primary
  borderMedium: "#d0d5dd",

  // Semantic — Field tokens
  green:  "#0f8857", greenBg:  "#e3fcf2", greenDim:  "#e3fcf2",                  greenMid:  "rgba(15,136,87,0.18)",   greenBorder:  "rgba(15,136,87,0.25)",
  red:    "#d92626", redBg:    "#fff0f0", redDim:    "#fff0f0",                  redMid:    "rgba(217,38,38,0.18)",   redBorder:    "rgba(217,38,38,0.25)",
  amber:  "#e5641a", amberBg:  "#fff1e0", amberDim:  "#fff1e0",                  amberMid:  "rgba(229,100,26,0.18)",  amberBorder:  "rgba(229,100,26,0.25)",
  purple: "#6d28d9", purpleBg: "#f5f3ff", purpleDim: "rgba(109,40,217,0.10)",   purpleMid: "rgba(109,40,217,0.18)",  purpleBorder: "rgba(109,40,217,0.25)",
  blue:   "#0f61ff", blueBg:   "#ebf4ff", blueDim:   "#ebf4ff",                 blueMid:   "rgba(15,97,255,0.18)",   blueBorder:   "rgba(15,97,255,0.25)",
  cyan:   "#0e7490", cyanBg:   "#ecfeff", cyanDim:   "rgba(14,116,144,0.10)",   cyanMid:   "rgba(14,116,144,0.18)",  cyanBorder:   "rgba(14,116,144,0.25)",

  // Health thresholds
  healthGood: "#0f8857",
  healthFair: "#e5641a",
  healthLow:  "#d92626",

  // Glass — flattened to solid white on the Field theme
  glassBg:      "#ffffff",
  glassBorder:  "#eaecf0",
  glassOverlay: "#ffffff",
  glassBlur:    "0px",
  glassSaturate: "1",
  glassDark:       "rgba(16,22,40,0.65)",
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
// Field look is flat / border-based — cards carry no shadow.
export const shadow = {
  none:     "none",
  sm:       "none",
  card:     "none",
  elevated: "0 8px 24px rgba(16,22,40,0.10), 0 2px 8px rgba(16,22,40,0.06)",
  float:    "0 12px 32px rgba(16,22,40,0.12), 0 4px 12px rgba(16,22,40,0.06)",
  glass:    "none",
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
