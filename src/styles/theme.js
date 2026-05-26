// Flow Design System — Light theme bridge to ds.js
// `ds.js` is the source of truth. This file keeps the existing API
// (themes.light, themes.dark, c, typo, layout, motion, setTheme) but the
// light theme now pulls its values from ds.js. The dark theme is retained
// for the Terminal / Rant / Admin exceptions.

import { color as dsColor, fonts as dsFonts, radius as dsRadius, shadow as dsShadow, terminal as dsTerminal, terminalRadius as dsTerminalRadius } from "./ds";

// ── Terminal Dark palette + radii (DESIGN_SYSTEM.md §12) ──
// Re-exported from ds.js. The Terminal / Rant / Admin views import these
// directly rather than going through `c.*`, since each view elects its
// own primary accent and the global theme bridge doesn't model that.
export const terminal = dsTerminal;
export const terminalRadius = dsTerminalRadius;

// ── Font stack ──────────────────────────────────────────────────
// Steel & Orange uses a two-font system: Inter for prose/UI, JetBrains Mono
// for numbers, IDs, labels, and section titles. Callers pick by token.
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
// Semantic accents: cyan=info, green=success, orange=warning, red=critical
export const themes = {

  dark: {
    // Backgrounds — deep navy with blue undertone
    bg: "#06090F", surface: "#0B1322", surfaceAlt: "#0A1020",
    surfaceSolid: "#0A0E17",
    // Surface variants
    surfaceHero: "#0D1729",      // hero panels with accent glow
    surfaceData: "#0A111E",      // flatter tables/grids
    surfaceOverlay: "#0D1324",   // command palette, modal, side panel
    glass: "#0C1628", glassData: "#091018",
    // Borders
    border: "rgba(255,255,255,0.10)", borderHover: "rgba(255,255,255,0.18)",
    // Text
    text: "#ECF0F6", textMid: "#A8B0C6", textDim: "#6E7894",
    textCrit: "#FFFFFF",
    // Primary accent — electric blue
    accent: "#3B82F6", accentDim: "rgba(59,130,246,0.12)", accentMid: "rgba(59,130,246,0.30)",
    // Semantic: Success — lime green
    green: "#84FF95", greenDim: "rgba(132,255,149,0.12)",
    // Semantic: Info — cyan
    blue: "#22D3EE", blueDim: "rgba(34,211,238,0.12)",
    cyan: "#22D3EE", cyanDim: "rgba(34,211,238,0.12)",
    // Semantic: Planning — purple
    purple: "#A78BFA", purpleDim: "rgba(167,139,250,0.12)",
    // Semantic: Critical — red
    red: "#FF6B6B", redDim: "rgba(255,107,107,0.12)",
    // Semantic: Warning — amber
    orange: "#FBBF24", orangeDim: "rgba(251,191,36,0.12)",
    // Semantic: Project entity reference — gold
    projectGold: "#FFCC33", projectGoldDim: "rgba(255,204,51,0.12)",
    // Glow colors for volumetric blobs
    glow1: "rgba(59,130,246,0.08)",   // blue glow
    glow2: "rgba(34,211,238,0.05)",   // cyan glow
    glow3: "rgba(167,139,250,0.04)",  // purple glow
    gradient: "linear-gradient(145deg, #04070D 0%, #080C16 35%, #0A0F1A 65%, #04070D 100%)",
    inputScheme: "dark",
    shadow: "rgba(0,0,0,0.5)",
    // Elevation / overlay shadows
    shadowOverlay: "0 8px 30px rgba(0,0,0,0.5)",
    shadowCard: "none",
    shadowHero: "0 4px 20px rgba(0,0,0,0.35)",
  },
  // ── Steel & Orange light theme (default, consumed by everything except Terminal) ──
  light: {
    // Surfaces
    bg:             dsColor.page,         // steel-gray canvas
    surface:        dsColor.card,         // white floating card
    surfaceAlt:     dsColor.inset,        // recessed — inputs, segmented bg
    surfaceSolid:   dsColor.card,
    surfaceHero:    dsColor.card,
    surfaceData:    dsColor.card,
    surfaceOverlay: dsColor.card,
    tableHeader:    dsColor.tableHeader,
    // Glass is legacy — alias to card + inset for backwards compat
    glass:          dsColor.card,
    glassData:      dsColor.inset,
    // Borders
    border:         dsColor.borderSubtle,
    borderHover:    dsColor.borderMedium,
    borderMedium:   dsColor.borderMedium,
    // Text
    text:           dsColor.textPrimary,
    textMid:        dsColor.textSecondary,
    textDim:        dsColor.textTertiary,
    textGhost:      dsColor.textGhost,
    textCrit:       "#FFFFFF",            // text on accent bg
    // Accent — orange
    accent:         dsColor.accent,
    accentHover:    dsColor.accentHover,
    accentDim:      dsColor.accentSoft,
    accentMid:      dsColor.accentMid,
    accentGlow:     dsColor.accentGlow,
    textOnAccent:   dsColor.textOnAccent,
    surfaceInverse:     dsColor.surfaceInverse,
    insetInverse:       dsColor.insetInverse,
    textOnInverse:      dsColor.textOnInverse,
    textMidOnInverse:   dsColor.textMidOnInverse,
    textGhostOnInverse: dsColor.textGhostOnInverse,
    // Semantic — data only. Family: <color> / <color>Dim (8%) / <color>Mid (18%) / <color>Border (25%).
    green:          dsColor.green,        greenDim:  dsColor.greenDim,  greenMid:  dsColor.greenMid,  greenBorder:  dsColor.greenBorder,
    red:            dsColor.red,          redDim:    dsColor.redDim,    redMid:    dsColor.redMid,    redBorder:    dsColor.redBorder,
    orange:         dsColor.amber,        orangeDim: dsColor.amberDim,  // "orange" = amber in Steel & Orange
    amber:          dsColor.amber,        amberDim:  dsColor.amberDim,  amberMid:  dsColor.amberMid,  amberBorder:  dsColor.amberBorder,
    blue:           dsColor.blue,         blueDim:   dsColor.blueDim,   blueMid:   dsColor.blueMid,   blueBorder:   dsColor.blueBorder,
    cyan:           dsColor.cyan,         cyanDim:   dsColor.cyanDim,   cyanMid:   dsColor.cyanMid,   cyanBorder:   dsColor.cyanBorder,
    purple:         dsColor.purple,       purpleDim: dsColor.purpleDim, purpleMid: dsColor.purpleMid, purpleBorder: dsColor.purpleBorder,
    // Entity references
    projectGold:    dsColor.amber,        projectGoldDim: dsColor.amberDim,
    // Legacy glow tokens — kept near-zero so any stale consumer doesn't emit neon
    glow1:          "rgba(232,89,12,0.04)",
    glow2:          "rgba(14,116,144,0.03)",
    glow3:          "rgba(109,40,217,0.02)",
    gradient:       `linear-gradient(145deg, ${dsColor.page} 0%, ${dsColor.page} 100%)`,
    inputScheme:    "light",
    // Shadows (elevation tiers from DESIGN_SYSTEM.md §4)
    shadow:         "rgba(0,0,0,0.06)",
    shadowSm:       dsShadow.sm,
    shadowCard:     dsShadow.card,
    shadowElevated: dsShadow.elevated,
    shadowFloat:    dsShadow.float,
    shadowOverlay:  dsShadow.elevated,    // legacy alias
    shadowHero:     dsShadow.card,        // legacy alias
  },
};

export const phaseNames = ["PRD", "Design", "Dev", "QA"];
export const shipPhases = ["Alpha", "Beta", "GA"];
export const allPhases = [...phaseNames, ...shipPhases];
export const commitPhases = ["PRD", "Design", "Dev", "QA"]; // Work activities only — no lifecycle stages
export const trackNames = ["PRD", "Design", "Dev", "QA", "Alpha", "Beta"];

// Mutable color reference - updated on theme change.
// Default is LIGHT (Steel & Orange). Dark is reserved for Terminal/Rant/Admin.
export let c = themes.light;
export function setTheme(isDark) {
  c = isDark ? themes.dark : themes.light;
  return c;
}

// ── Canonical status semantics (consistent across all screens) ──
export const typeConfig = () => ({
  BUILD: { color: c.green, bg: c.greenDim, emoji: "~", label: "BUILD" },
  JAM: { color: c.accent, bg: c.accentDim, emoji: "~", label: "JAM" },
});

// ── Canonical outcome semantics ──
export const outcomeConfig = () => ({
  done: { color: c.green, bg: c.greenDim, label: "Done", icon: "✓" },
  partial: { color: c.orange, bg: c.orangeDim, label: "Partial", icon: "◐" },
  carry: { color: c.orange, bg: c.orangeDim, label: "Carried", icon: "→" },
  done_carry: { color: c.orange, bg: c.orangeDim, label: "Done + Carried", icon: "✓→" },
  blocked: { color: c.red, bg: c.redDim, label: "Blocked", icon: "✕" },
});

// ── Canonical risk semantics ──
export const riskConfig = () => ({
  healthy: { color: c.green, label: "On Track" },
  warning: { color: c.orange, label: "At Risk" },
  critical: { color: c.red, label: "Critical" },
});

export const phaseColors = () => ({
  PRD: c.purple, Design: c.blue, Dev: c.orange, QA: c.cyan,
  Alpha: "#6BCB77", Beta: "#36AE7C", GA: "#1FAA59",
});

// Phase → tinted background (18% alpha) and soft background (8% alpha).
// Use phaseMids for cell highlights; phaseDims for tag / pill backgrounds.
export const phaseMids = () => ({
  PRD: c.purpleMid, Design: c.blueMid, Dev: c.amberMid, QA: c.cyanMid,
  Alpha: c.greenMid, Beta: c.greenMid, GA: c.greenMid,
});
export const phaseDims = () => ({
  PRD: c.purpleDim, Design: c.blueDim, Dev: c.amberDim, QA: c.cyanDim,
  Alpha: c.greenDim, Beta: c.greenDim, GA: c.greenDim,
});

// ── Canonical project status semantics ──
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

// ── Canonical entity reference color ──
// Project references always use orange. Person references always use cyan.
export const entityColors = () => ({ project: c.orange, person: c.cyan });

// ── Canonical typography ramp ─────────────────────────────────
// Every text style in the product must map to one of these tokens.
// Steel & Orange type scale. Mono is data-only (numbers, IDs, labels,
// section titles). Everything else uses Inter. Minimum 11px everywhere.
export const typo = {
  // Display — page titles, hero numbers, KPI values
  displayHero: { font: mono,    size: 36, weight: 700, tracking: "-0.03em", lineHeight: 1.1  }, // KPI hero numbers
  displayXl:   { font: display, size: 28, weight: 700, tracking: "-0.02em", lineHeight: 1.1  },
  displayLg:   { font: display, size: 24, weight: 700, tracking: "-0.02em", lineHeight: 1.15 }, // page titles
  displayMd:   { font: display, size: 20, weight: 700, tracking: "-0.02em", lineHeight: 1.2  }, // detail names
  displaySm:   { font: display, size: 16, weight: 700, tracking: "-0.01em", lineHeight: 1.3  }, // card headers
  // Body — Inter, rest of the app
  bodyXl:      { font: body,    size: 16, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodyLg:      { font: body,    size: 15, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodyMd:      { font: body,    size: 14, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodySm:      { font: body,    size: 13, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodyXs:      { font: body,    size: 12, weight: 500, tracking: "0",       lineHeight: 1.4 },
  // Mono — numbers, IDs, section titles
  monoLg:      { font: mono,    size: 13, weight: 700, tracking: "0",       lineHeight: 1.3 },
  monoMd:      { font: mono,    size: 12, weight: 700, tracking: "0.02em",  lineHeight: 1.3 },
  monoSm:      { font: mono,    size: 11, weight: 700, tracking: "0.04em",  lineHeight: 1.3 },

  // ── Legacy aliases — map old names to Steel & Orange tokens ──
  metric:      { font: mono,    size: 24, weight: 700, tracking: "-0.02em", lineHeight: 1.1 },
  metricLg:    { font: mono,    size: 28, weight: 700, tracking: "-0.03em", lineHeight: 1.1 },
  sectionLbl:  { font: mono,    size: 12, weight: 700, tracking: "0.08em",  lineHeight: 1.3 }, // section titles → mono uppercase
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

// ── Layout tokens (Steel & Orange radii from ds.js) ───────────
export const layout = {
  radiusLg: dsRadius.lg,  // 14 — cards, tables, commit cards, modals
  radius:   dsRadius.lg,  // alias
  radiusMd: dsRadius.md,  // 12 — segmented, dropdowns
  radiusSm: dsRadius.sm,  //  8 — buttons, inputs
  radiusXs: dsRadius.xs,  //  5 — tags, phase pills
  radiusTag: dsRadius.xs, //  5 — legacy alias
  radiusPill: dsRadius.pill,
  padCard: 24,
  padSection: 20,
  padCompact: 16,
};

// ── Button variant tokens (Steel & Orange, per DESIGN_SYSTEM.md §7.6) ──
export const btnVariants = () => ({
  primary:   { bg: c.accent,      color: "#FFFFFF",    border: "none",                              hoverBg: c.accent },
  secondary: { bg: c.surface,     color: c.textMid,    border: `1px solid ${c.border}`,             hoverBg: c.surfaceAlt },
  ghost:     { bg: "transparent", color: c.textDim,    border: "1px solid transparent",             hoverBg: c.surfaceAlt },
  danger:    { bg: c.redDim,      color: c.red,        border: `1px solid ${c.red}30`,              hoverBg: `${c.red}18` },
  command:   { bg: c.surface,     color: c.accent,     border: `1px solid ${c.border}`,             hoverBg: c.accentDim },
  success:   { bg: c.greenDim,    color: c.green,      border: `1px solid ${c.green}30`,            hoverBg: `${c.green}18` },
});

// ── Elevation tokens ──────────────────────────────────────────
export const elevation = () => ({
  card:    { shadow: c.shadowCard,    bg: c.surface },
  hero:    { shadow: c.shadowHero,    bg: c.surfaceHero },
  overlay: { shadow: c.shadowOverlay, bg: c.surfaceOverlay },
});

// ── Filter chip tokens ────────────────────────────────────────
export const filterChipTokens = () => ({
  active:   { bg: c.accentDim, color: c.accent, border: `1px solid ${c.accent}25` },
  inactive: { bg: c.surfaceAlt, color: c.textMid, border: `1px solid ${c.border}` },
});

// ── Data grid tokens ──────────────────────────────────────────
export const dataGridTokens = () => ({
  headerBg:    c.surfaceData,
  headerColor: c.text,
  rowBg:       "transparent",
  rowHoverBg:  c.surface,
  stripedBg:   c.surfaceAlt,
  cellPadding: "10px 14px",
});

// ── Table column width archetypes ─────────────────────────────
// Shared across all table families for width consistency.
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

// ── Motion tiers ──────────────────────────────────────────────
// ambient:     slow, continuous, background feel (blobs, breathe)
// interaction: snappy user feedback (hover, click, toggle)
// critical:    attention-grabbing (alerts, errors, lock)
// Steel & Orange motion tiers (DESIGN_SYSTEM.md §6.1)
export const motion = {
  instant:     { duration: "100ms", easing: "ease-out" },
  fast:        { duration: "150ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  normal:      { duration: "250ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  slow:        { duration: "400ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  // ── Legacy aliases for existing callers ──
  ambient:     { duration: "4s",    easing: "ease-in-out" },
  interaction: { duration: "150ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  critical:    { duration: "300ms", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
};
