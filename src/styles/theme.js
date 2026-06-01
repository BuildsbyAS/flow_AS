// Flow Design System — Light theme bridge to ds.js (Obsidian)
// `ds.js` is the source of truth. This file keeps the existing API
// (themes.light, themes.dark, c, typo, layout, motion, setTheme) but the
// light theme now pulls its values from ds.js. The dark theme is retained
// for the Terminal / Rant / Admin exceptions.

import { color as dsColor, fonts as dsFonts, radius as dsRadius, shadow as dsShadow, terminal as dsTerminal, terminalRadius as dsTerminalRadius, motionTier as dsMotion } from "./ds";

// ── Terminal Dark palette + radii (DESIGN_SYSTEM.md §12) ──
export const terminal = dsTerminal;
export const terminalRadius = dsTerminalRadius;

// ── Font stack ──────────────────────────────────────────────────
export const display = dsFonts.sans;
export const body = dsFonts.sans;
export const mono = dsFonts.mono;

// ── Spacing scale (4px base) ──
export const space = {
  1: 4,   2: 8,   3: 12,  4: 16,
  5: 20,  6: 24,  7: 32,  8: 40,
};

// ── Density scale ──
export const density = {
  executive:    { rowPad: "14px 20px", cellPad: "12px 16px", gap: 16, fontSize: 16, headerSize: 14 },
  comfortable:  { rowPad: "12px 16px", cellPad: "10px 14px", gap: 12, fontSize: 14, headerSize: 13 },
  compact:      { rowPad: "8px 12px",  cellPad: "6px 10px",  gap: 6,  fontSize: 13, headerSize: 12 },
};

// ── Color system ────────────────────────────────────────────────
export const themes = {

  dark: {
    // Backgrounds — deep navy with blue undertone
    bg: "#06090F", surface: "#0B1322", surfaceAlt: "#0A1020",
    surfaceSolid: "#0A0E17",
    surfaceHero: "#0D1729",
    surfaceData: "#0A111E",
    surfaceOverlay: "#0D1324",
    glass: "#0C1628", glassData: "#091018",
    border: "rgba(255,255,255,0.10)", borderHover: "rgba(255,255,255,0.18)",
    text: "#ECF0F6", textMid: "#A8B0C6", textDim: "#6E7894",
    textCrit: "#FFFFFF",
    accent: "#3B82F6", accentDim: "rgba(59,130,246,0.12)", accentMid: "rgba(59,130,246,0.30)",
    green: "#84FF95", greenDim: "rgba(132,255,149,0.12)",
    blue: "#22D3EE", blueDim: "rgba(34,211,238,0.12)",
    cyan: "#22D3EE", cyanDim: "rgba(34,211,238,0.12)",
    purple: "#A78BFA", purpleDim: "rgba(167,139,250,0.12)",
    red: "#FF6B6B", redDim: "rgba(255,107,107,0.12)",
    orange: "#FBBF24", orangeDim: "rgba(251,191,36,0.12)",
    projectGold: "#FFCC33", projectGoldDim: "rgba(255,204,51,0.12)",
    glow1: "rgba(59,130,246,0.08)",
    glow2: "rgba(34,211,238,0.05)",
    glow3: "rgba(167,139,250,0.04)",
    gradient: "linear-gradient(145deg, #04070D 0%, #080C16 35%, #0A0F1A 65%, #04070D 100%)",
    inputScheme: "dark",
    shadow: "rgba(0,0,0,0.5)",
    shadowOverlay: "0 8px 30px rgba(0,0,0,0.5)",
    shadowCard: "none",
    shadowHero: "0 4px 20px rgba(0,0,0,0.35)",
  },

  // ── Obsidian light theme (default, consumed by everything except Terminal) ──
  light: {
    // Surfaces — glass-first
    bg:             dsColor.page,          // warm grey canvas
    surface:        dsColor.card,          // frosted glass card
    surfaceAlt:     dsColor.inset,         // recessed
    surfaceSolid:   dsColor.cardSolid,     // solid white when needed
    surfaceHero:    dsColor.card,
    surfaceData:    dsColor.card,
    surfaceOverlay: dsColor.glassOverlay,
    tableHeader:    dsColor.tableHeader,
    // Glass
    glass:          dsColor.glassBg,
    glassData:      dsColor.inset,
    glassBg:        dsColor.glassBg,
    glassBorder:    dsColor.glassBorder,
    glassOverlay:   dsColor.glassOverlay,
    glassDark:      dsColor.glassDark,
    glassDarkBorder: dsColor.glassDarkBorder,
    // Header
    headerBg:       dsColor.headerBg,
    headerText:     dsColor.headerText,
    headerTextDim:  dsColor.headerTextDim,
    // Borders
    border:         dsColor.borderSubtle,
    borderHover:    dsColor.borderMedium,
    borderMedium:   dsColor.borderMedium,
    // Text
    text:           dsColor.textPrimary,
    textMid:        dsColor.textSecondary,
    textDim:        dsColor.textTertiary,
    textGhost:      dsColor.textGhost,
    textCrit:       "#FFFFFF",
    // Primary accent — black
    accent:         dsColor.accent,
    accentHover:    dsColor.accentHover,
    accentDim:      dsColor.accentSoft,
    accentMid:      dsColor.accentMid,
    accentGlow:     dsColor.accentGlow,
    textOnAccent:   dsColor.textOnAccent,
    // Secondary accent — coral (for destructive/urgent)
    coral:          dsColor.coral,
    coralHover:     dsColor.coralHover,
    coralDim:       dsColor.coralSoft,
    coralMid:       dsColor.coralMid,
    // Glassmorphism (legacy compat)
    glassWhite:     dsColor.glassBg,
    surfaceInverse:     dsColor.surfaceInverse,
    insetInverse:       dsColor.insetInverse,
    textOnInverse:      dsColor.textOnInverse,
    textMidOnInverse:   dsColor.textMidOnInverse,
    textGhostOnInverse: dsColor.textGhostOnInverse,
    // Semantic
    green:          dsColor.green,        greenDim:  dsColor.greenDim,  greenMid:  dsColor.greenMid,  greenBorder:  dsColor.greenBorder,
    red:            dsColor.red,          redDim:    dsColor.redDim,    redMid:    dsColor.redMid,    redBorder:    dsColor.redBorder,
    orange:         dsColor.amber,        orangeDim: dsColor.amberDim,
    amber:          dsColor.amber,        amberDim:  dsColor.amberDim,  amberMid:  dsColor.amberMid,  amberBorder:  dsColor.amberBorder,
    blue:           dsColor.blue,         blueDim:   dsColor.blueDim,   blueMid:   dsColor.blueMid,   blueBorder:   dsColor.blueBorder,
    cyan:           dsColor.cyan,         cyanDim:   dsColor.cyanDim,   cyanMid:   dsColor.cyanMid,   cyanBorder:   dsColor.cyanBorder,
    purple:         dsColor.purple,       purpleDim: dsColor.purpleDim, purpleMid: dsColor.purpleMid, purpleBorder: dsColor.purpleBorder,
    projectGold:    dsColor.amber,        projectGoldDim: dsColor.amberDim,
    // Legacy glow tokens
    glow1:          "rgba(0,0,0,0.02)",
    glow2:          "rgba(0,0,0,0.015)",
    glow3:          "rgba(0,0,0,0.01)",
    gradient:       `linear-gradient(145deg, ${dsColor.page} 0%, ${dsColor.page} 100%)`,
    inputScheme:    "light",
    // Shadows
    shadow:         "rgba(0,0,0,0.06)",
    shadowSm:       dsShadow.sm,
    shadowCard:     dsShadow.card,
    shadowGlass:    dsShadow.glass,
    shadowElevated: dsShadow.elevated,
    shadowFloat:    dsShadow.float,
    shadowOverlay:  dsShadow.elevated,
    shadowHero:     dsShadow.card,
  },
};

export const phaseNames = ["PRD", "Design", "Dev", "QA"];
export const shipPhases = ["Alpha", "Beta", "GA"];
export const allPhases = [...phaseNames, ...shipPhases];
export const commitPhases = ["PRD", "Design", "Dev", "QA"];
export const trackNames = ["PRD", "Design", "Dev", "QA", "Alpha", "Beta"];

// Mutable color reference - updated on theme change.
export let c = themes.light;
export function setTheme(isDark) {
  c = isDark ? themes.dark : themes.light;
  return c;
}

// ── Canonical status semantics ──
export const typeConfig = () => ({
  BUILD: { color: c.green, bg: c.greenDim, emoji: "~", label: "BUILD" },
  JAM: { color: c.accent, bg: c.accentDim, emoji: "~", label: "JAM" },
});

export const outcomeConfig = () => ({
  done: { color: c.green, bg: c.greenDim, label: "Done", icon: "✓" },
  partial: { color: c.orange, bg: c.orangeDim, label: "Partial", icon: "◐" },
  carry: { color: c.orange, bg: c.orangeDim, label: "Carried", icon: "→" },
  done_carry: { color: c.orange, bg: c.orangeDim, label: "Done + Carried", icon: "✓→" },
  blocked: { color: c.red, bg: c.redDim, label: "Blocked", icon: "✕" },
});

export const riskConfig = () => ({
  healthy: { color: c.green, label: "On Track" },
  warning: { color: c.orange, label: "At Risk" },
  critical: { color: c.red, label: "Critical" },
});

export const phaseColors = () => ({
  PRD: c.purple, Design: c.blue, Dev: c.orange, QA: c.cyan,
  Alpha: "#6BCB77", Beta: "#36AE7C", GA: "#1FAA59",
});

export const phaseMids = () => ({
  PRD: c.purpleMid, Design: c.blueMid, Dev: c.amberMid, QA: c.cyanMid,
  Alpha: c.greenMid, Beta: c.greenMid, GA: c.greenMid,
});
export const phaseDims = () => ({
  PRD: c.purpleDim, Design: c.blueDim, Dev: c.amberDim, QA: c.cyanDim,
  Alpha: c.greenDim, Beta: c.greenDim, GA: c.greenDim,
});

export const statusColors = () => ({
  active:        { color: c.cyan,   bg: c.cyanDim,   label: "Active" },
  deprioritized: { color: c.orange, bg: c.orangeDim, label: "Depri" },
});

export const statusConfig = () => ({
  in_flight:     { color: c.accent, bg: c.accentDim, label: "In Flight" },
  shipped:       { color: c.green,  bg: c.greenDim,  label: "Shipped" },
  blocked:       { color: c.red,    bg: c.redDim,    label: "Blocked" },
  deprioritized: { color: c.orange, bg: c.orangeDim, label: "Deprioritized" },
  upcoming:      { color: c.textMid, bg: c.surfaceAlt, label: "Upcoming" },
});

export const entityColors = () => ({ project: c.orange, person: c.cyan });

// ── Typography ramp ─────────────────────────────────────────────
export const typo = {
  displayHero: { font: mono,    size: 36, weight: 700, tracking: "-0.03em", lineHeight: 1.1  },
  displayXl:   { font: display, size: 28, weight: 700, tracking: "-0.02em", lineHeight: 1.1  },
  displayLg:   { font: display, size: 24, weight: 700, tracking: "-0.02em", lineHeight: 1.15 },
  displayMd:   { font: display, size: 20, weight: 700, tracking: "-0.02em", lineHeight: 1.2  },
  displaySm:   { font: display, size: 16, weight: 700, tracking: "-0.01em", lineHeight: 1.3  },
  bodyXl:      { font: body,    size: 16, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodyLg:      { font: body,    size: 15, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodyMd:      { font: body,    size: 14, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodySm:      { font: body,    size: 13, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodyXs:      { font: body,    size: 12, weight: 500, tracking: "0",       lineHeight: 1.4 },
  monoLg:      { font: mono,    size: 13, weight: 700, tracking: "0",       lineHeight: 1.3 },
  monoMd:      { font: mono,    size: 12, weight: 700, tracking: "0.02em",  lineHeight: 1.3 },
  monoSm:      { font: mono,    size: 11, weight: 700, tracking: "0.04em",  lineHeight: 1.3 },
  metric:      { font: mono,    size: 24, weight: 700, tracking: "-0.02em", lineHeight: 1.1 },
  metricLg:    { font: mono,    size: 28, weight: 700, tracking: "-0.03em", lineHeight: 1.1 },
  sectionLbl:  { font: mono,    size: 12, weight: 700, tracking: "0.08em",  lineHeight: 1.3 },
  rowText:     { font: body,    size: 14, weight: 600, tracking: "0",       lineHeight: 1.5 },
  rowSub:      { font: body,    size: 13, weight: 500, tracking: "0",       lineHeight: 1.5 },
  helper:      { font: body,    size: 12, weight: 500, tracking: "0",       lineHeight: 1.4 },
  fieldLbl:    { font: mono,    size: 12, weight: 600, tracking: "0.04em",  lineHeight: 1.3 },
  badge:       { font: body,    size: 12, weight: 700, tracking: "0",       lineHeight: 1.3 },
  tag:         { font: mono,    size: 11, weight: 700, tracking: "0.04em",  lineHeight: 1.3 },
  mono9:       { font: mono,    size: 11, weight: 700, tracking: "0.04em",  lineHeight: 1.3 },
  mono10:      { font: mono,    size: 12, weight: 700, tracking: "0.02em",  lineHeight: 1.3 },
  tele:        { font: mono,    size: 12, weight: 700, tracking: "0.02em",  lineHeight: 1.3 },
  teleLg:      { font: mono,    size: 13, weight: 700, tracking: "0",       lineHeight: 1.3 },
};

// ── Layout tokens ───────────
export const layout = {
  radiusLg: dsRadius.lg,    // 18
  radius:   dsRadius.lg,
  radiusMd: dsRadius.md,    // 14
  radiusSm: dsRadius.sm,    // 10
  radiusXs: dsRadius.xs,    //  6
  radiusTag: dsRadius.xs,
  radiusPill: dsRadius.pill,
  radiusXl: dsRadius.xl,    // 24
  padCard: 24,
  padSection: 20,
  padCompact: 16,
};

// ── Button variant tokens ──
export const btnVariants = () => ({
  primary:   { bg: c.accent,      color: "#FFFFFF",    border: "none",                              hoverBg: c.accentHover },
  secondary: { bg: c.surfaceSolid, color: c.textMid,   border: `1px solid ${c.border}`,             hoverBg: c.surfaceAlt },
  ghost:     { bg: "transparent", color: c.textDim,    border: "1px solid transparent",             hoverBg: c.surfaceAlt },
  danger:    { bg: c.redDim,      color: c.red,        border: `1px solid ${c.red}30`,              hoverBg: `${c.red}18` },
  command:   { bg: c.surfaceSolid, color: c.accent,    border: `1px solid ${c.border}`,             hoverBg: c.accentDim },
  success:   { bg: c.greenDim,    color: c.green,      border: `1px solid ${c.green}30`,            hoverBg: `${c.green}18` },
});

export const elevation = () => ({
  card:    { shadow: c.shadowCard,    bg: c.surface },
  hero:    { shadow: c.shadowHero,    bg: c.surfaceHero },
  overlay: { shadow: c.shadowOverlay, bg: c.surfaceOverlay },
});

export const filterChipTokens = () => ({
  active:   { bg: c.accentDim, color: c.accent, border: `1px solid ${c.accent}25` },
  inactive: { bg: c.surfaceAlt, color: c.textMid, border: `1px solid ${c.border}` },
});

export const dataGridTokens = () => ({
  headerBg:    c.surfaceData,
  headerColor: c.text,
  rowBg:       "transparent",
  rowHoverBg:  c.surface,
  stripedBg:   c.surfaceAlt,
  cellPadding: "10px 14px",
});

export const colWidths = {
  squad:    { min: 70 },
  identity: { min: 140 },
  owner:    { min: 80 },
  person:   { min: 80 },
  status:   { min: 60 },
  phase:    { min: 60 },
  metric:   { min: 50 },
  pct:      { min: 50 },
  role:     { min: 90 },
  date:     { min: 60 },
  timeline: { min: 90 },
  actions:  { min: 60 },
  commit:   { min: 140 },
};

// ── Motion tiers ──
export const motion = {
  instant:     dsMotion.instant,
  fast:        dsMotion.fast,
  normal:      dsMotion.normal,
  slow:        dsMotion.slow,
  spring:      dsMotion.spring,
  ambient:     { duration: "4s",    easing: "ease-in-out" },
  interaction: dsMotion.fast,
  critical:    { duration: "300ms", easing: dsMotion.normal.easing },
};
