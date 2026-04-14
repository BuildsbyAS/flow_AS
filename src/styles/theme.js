// Flow Design System — Phase 1: Global Foundations
// Bold futuristic palette · semantic accents · motion tiers · telemetry type

// ── Font stack ──────────────────────────────────────────────────
// Single-font product: all visible UI uses one canonical family.
// Technical feel comes from weight, spacing, tracking, and casing.
const _uiFont = "'Inter', 'Figtree', sans-serif";
export const display = _uiFont;
export const body = _uiFont;
export const mono = _uiFont;

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
  light: {
    bg: "#F0F2F7", surface: "rgba(255,255,255,0.90)", surfaceAlt: "rgba(255,255,255,0.65)",
    surfaceSolid: "#FFFFFF",
    surfaceHero: "rgba(255,255,255,0.95)",
    surfaceData: "rgba(255,255,255,0.75)",
    surfaceOverlay: "#FFFFFF",
    glass: "rgba(255,255,255,0.80)", glassData: "rgba(255,255,255,0.60)",
    border: "rgba(0,0,0,0.07)", borderHover: "rgba(0,0,0,0.14)",
    text: "#0F172A", textMid: "#475569", textDim: "#94A3B8",
    textCrit: "#111827",
    accent: "#2563EB", accentDim: "rgba(37,99,235,0.08)", accentMid: "rgba(37,99,235,0.18)",
    green: "#059669", greenDim: "rgba(5,150,105,0.08)",
    blue: "#0891B2", blueDim: "rgba(8,145,178,0.08)",
    cyan: "#0891B2", cyanDim: "rgba(8,145,178,0.08)",
    purple: "#7C3AED", purpleDim: "rgba(124,58,237,0.08)",
    red: "#DC2626", redDim: "rgba(220,38,38,0.08)",
    orange: "#D97706", orangeDim: "rgba(217,119,6,0.08)",
    projectGold: "#B8860B", projectGoldDim: "rgba(184,134,11,0.08)",
    glow1: "rgba(37,99,235,0.04)",
    glow2: "rgba(8,145,178,0.03)",
    glow3: "rgba(124,58,237,0.02)",
    gradient: "linear-gradient(145deg, #ECF0F6 0%, #EEF0F4 35%, #F0F2F7 65%, #ECF0F6 100%)",
    inputScheme: "light",
    shadow: "rgba(0,0,0,0.08)",
    shadowOverlay: "0 8px 30px rgba(0,0,0,0.12)",
    shadowCard: "0 2px 8px rgba(0,0,0,0.06)",
    shadowHero: "0 4px 20px rgba(0,0,0,0.10)",
  },
};

export const phaseNames = ["PRD", "Design", "Dev", "QA"];
export const shipPhases = ["Alpha", "Beta", "GA"];
export const allPhases = [...phaseNames, ...shipPhases];
export const commitPhases = ["PRD", "Design", "Dev", "QA"]; // Work activities only — no lifecycle stages

// Mutable color reference - updated on theme change
export let c = themes.dark;
export function setTheme(isDark) {
  c = isDark ? themes.dark : themes.light;
  return c;
}

// ── Canonical status semantics (consistent across all screens) ──
export const typeConfig = () => ({
  BUILD: { color: c.green, bg: c.greenDim, emoji: "~", label: "Build" },
  JAM: { color: c.accent, bg: c.accentDim, emoji: "~", label: "Jam" },
});

// ── Canonical outcome semantics ──
export const outcomeConfig = () => ({
  done: { color: c.green, bg: c.greenDim, label: "Completed", icon: "✓" },
  partial: { color: c.orange, bg: c.orangeDim, label: "Partial", icon: "◐" },
  carry: { color: c.orange, bg: c.orangeDim, label: "Carry", icon: "→" },
  done_carry: { color: c.orange, bg: c.orangeDim, label: "Done + Carry", icon: "✓→" },
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

// ── Canonical project status semantics ──
export const statusColors = () => ({
  active:        { color: c.cyan,   bg: c.cyanDim,   label: "Active" },
  deprioritized: { color: c.orange, bg: c.orangeDim, label: "Depri" },
});

// ── Canonical entity reference color ──
// Project references always use orange. Person references always use cyan.
export const entityColors = () => ({ project: c.orange, person: c.cyan });

// ── Canonical typography ramp ─────────────────────────────────
// Every text style in the product must map to one of these tokens.
export const typo = {
  // Display — page titles, hero numbers, KPI values
  displayHero: { font: display, size: 36, weight: 800, tracking: "-0.04em", lineHeight: 1.1 },
  displayXl:   { font: display, size: 28, weight: 800, tracking: "-0.03em", lineHeight: 1.1 },
  displayLg:   { font: display, size: 24, weight: 700, tracking: "-0.02em", lineHeight: 1.1 },
  displayMd:   { font: display, size: 20, weight: 700, tracking: "-0.02em", lineHeight: 1.1 },
  displaySm:   { font: display, size: 16, weight: 700, tracking: "-0.02em", lineHeight: 1.15 },
  // Body — tables, paragraphs, buttons, forms, labels
  bodyLg:      { font: body,    size: 16, weight: 600, tracking: "0",       lineHeight: 1.5 },
  bodyMd:      { font: body,    size: 14, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodySm:      { font: body,    size: 13, weight: 500, tracking: "0",       lineHeight: 1.5 },
  bodyXs:      { font: body,    size: 12, weight: 400, tracking: "0",       lineHeight: 1.4 },
  // Mono — telemetry labels, chips, timestamps, counters
  monoLg:      { font: mono,    size: 13, weight: 700, tracking: "0.04em",  lineHeight: 1.35 },
  monoMd:      { font: mono,    size: 12, weight: 600, tracking: "0.05em",  lineHeight: 1.3 },
  monoSm:      { font: mono,    size: 11, weight: 600, tracking: "0.06em",  lineHeight: 1.25 },

  // ── Legacy aliases (map to canonical tokens) ──
  metric:      { font: display, size: 24, weight: 700, tracking: "-0.02em", lineHeight: 1.1 },
  metricLg:    { font: display, size: 28, weight: 800, tracking: "-0.03em", lineHeight: 1.1 },
  sectionLbl:  { font: display, size: 16, weight: 700, tracking: "-0.02em", lineHeight: 1.15 },
  rowText:     { font: body,    size: 14, weight: 600, tracking: "0",       lineHeight: 1.5 },
  rowSub:      { font: body,    size: 13, weight: 500, tracking: "0",       lineHeight: 1.5 },
  helper:      { font: body,    size: 12, weight: 400, tracking: "0",       lineHeight: 1.4 },
  fieldLbl:    { font: mono,    size: 11, weight: 600, tracking: "0.06em",  lineHeight: 1.25 },
  badge:       { font: body,    size: 12, weight: 600, tracking: "0.02em",  lineHeight: 1.4 },
  tag:         { font: mono,    size: 11, weight: 700, tracking: "0.04em",  lineHeight: 1.25 },
  mono9:       { font: mono,    size: 11, weight: 600, tracking: "0.04em",  lineHeight: 1.25 },
  mono10:      { font: mono,    size: 12, weight: 600, tracking: "0",       lineHeight: 1.3 },
  tele:        { font: mono,    size: 12, weight: 600, tracking: "0.05em",  lineHeight: 1.3 },
  teleLg:      { font: mono,    size: 13, weight: 700, tracking: "0.04em",  lineHeight: 1.35 },
};

// ── Layout tokens ─────────────────────────────────────────────
export const layout = {
  radiusLg: 12,
  radius: 12,      // alias for radiusLg — cards, panels, dialogs
  radiusMd: 8,     // controls, sub-panels, rows
  radiusSm: 6,     // inputs, icon buttons
  radiusPill: 20,  // rounded pills
  radiusTag: 3,    // compact tags
  padCard: 24,     // space-6 — design mandate: card padding >= 24px
  padSection: 20,  // space-5
  padCompact: 16,  // space-4
};

// ── Button variant tokens ─────────────────────────────────────
export const btnVariants = () => ({
  primary:   { bg: c.accent,    color: "#FFFFFF",   border: "none",                  hoverBg: c.accentMid },
  secondary: { bg: c.surfaceAlt, color: c.text,     border: `1px solid ${c.border}`, hoverBg: c.surface },
  ghost:     { bg: "transparent", color: c.textMid, border: "1px solid transparent", hoverBg: c.surfaceAlt },
  danger:    { bg: c.redDim,     color: c.red,      border: `1px solid ${c.red}30`,  hoverBg: `${c.red}18` },
  command:   { bg: c.surfaceAlt, color: c.accent,   border: `1px solid ${c.border}`, hoverBg: c.accentDim },
  success:   { bg: `${c.green}18`, color: c.green,  border: `1px solid ${c.green}30`, hoverBg: `${c.green}25` },
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
export const motion = {
  ambient:     { duration: "4s",    easing: "ease-in-out" },
  interaction: { duration: "0.15s", easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  critical:    { duration: "0.3s",  easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
};
