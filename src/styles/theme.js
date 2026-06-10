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
    // Absolute neutrals — pure greyscale, no blue/navy undertone
    bg: "#0a0a0a", surface: "#161616", surfaceAlt: "#202020",
    surfaceSolid: "#161616",
    surfaceHero: "#161616",
    surfaceData: "#161616",
    surfaceOverlay: "#1c1c1c",
    tableHeader: "#202020",
    glass: "#161616", glassData: "#202020",
    glassBg: "#161616", glassBorder: "rgba(255,255,255,0.05)",
    glassOverlay: "#1c1c1c", glassDark: "rgba(0,0,0,0.7)", glassDarkBorder: "rgba(255,255,255,0.05)",
    headerBg: "#000000", headerText: "#fafafa", headerTextDim: "rgba(255,255,255,0.55)",
    // Low-contrast borders — barely separated from surfaces
    border: "rgba(255,255,255,0.05)", borderHover: "rgba(255,255,255,0.09)", borderMedium: "rgba(255,255,255,0.08)",
    text: "#fafafa", textMid: "#a3a3a3", textDim: "#737373", textGhost: "#525252",
    textCrit: "#FFFFFF",
    // Neutral accent (no Field blue) — light grey on dark
    accent: "#e5e5e5", accentHover: "#ffffff",
    accentDim: "rgba(255,255,255,0.10)", accentMid: "rgba(255,255,255,0.20)", accentGlow: "rgba(255,255,255,0.14)",
    textOnAccent: "#0a0a0a",
    coral: "#f87171", coralHover: "#ef4444", coralDim: "rgba(248,113,113,0.14)", coralMid: "rgba(248,113,113,0.22)",
    surfaceInverse: "#fafafa", insetInverse: "#e5e5e5", textOnInverse: "#0a0a0a", textMidOnInverse: "#525252", textGhostOnInverse: "#737373",
    // Semantic (kept for data/status legibility, brightened for dark)
    green: "#34d399", greenBg: "rgba(52,211,153,0.12)", greenDim: "rgba(52,211,153,0.14)", greenMid: "rgba(52,211,153,0.22)", greenBorder: "rgba(52,211,153,0.30)",
    red: "#f87171", redBg: "rgba(248,113,113,0.12)", redDim: "rgba(248,113,113,0.14)", redMid: "rgba(248,113,113,0.22)", redBorder: "rgba(248,113,113,0.30)",
    amber: "#fbbf24", amberBg: "rgba(251,191,36,0.12)", amberDim: "rgba(251,191,36,0.14)", amberMid: "rgba(251,191,36,0.22)", amberBorder: "rgba(251,191,36,0.30)",
    orange: "#fbbf24", orangeDim: "rgba(251,191,36,0.14)",
    blue: "#60a5fa", blueBg: "rgba(96,165,250,0.12)", blueDim: "rgba(96,165,250,0.14)", blueMid: "rgba(96,165,250,0.22)", blueBorder: "rgba(96,165,250,0.30)",
    cyan: "#22d3ee", cyanDim: "rgba(34,211,238,0.14)", cyanMid: "rgba(34,211,238,0.22)", cyanBorder: "rgba(34,211,238,0.30)",
    purple: "#a78bfa", purpleDim: "rgba(167,139,250,0.14)", purpleMid: "rgba(167,139,250,0.22)", purpleBorder: "rgba(167,139,250,0.30)",
    projectGold: "#fbbf24", projectGoldDim: "rgba(251,191,36,0.14)",
    healthGood: "#34d399", healthFair: "#fbbf24", healthLow: "#f87171",
    glow1: "rgba(255,255,255,0.03)", glow2: "rgba(255,255,255,0.02)", glow3: "rgba(255,255,255,0.015)",
    gradient: "linear-gradient(145deg, #0a0a0a 0%, #0a0a0a 100%)",
    inputScheme: "dark",
    shadow: "rgba(0,0,0,0.5)",
    shadowSm: "none", shadowGlass: "none",
    shadowOverlay: "0 8px 30px rgba(0,0,0,0.55)",
    shadowElevated: "0 8px 24px rgba(0,0,0,0.55)", shadowFloat: "0 12px 32px rgba(0,0,0,0.55)",
    shadowCard: "none",
    shadowHero: "none",
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
export let isDark = false;
export function setTheme(dark) {
  isDark = !!dark;
  c = dark ? themes.dark : themes.light;
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
  primary:   { bg: "#3D1602",     color: c.textOnAccent, border: "none",                            hoverBg: "#52210A" },
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
