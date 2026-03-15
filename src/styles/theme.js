// Flow Design System — Phase 1: Global Foundations
// Bold futuristic palette · semantic accents · motion tiers · telemetry type

// ── Font stack ──────────────────────────────────────────────────
// Display: Space Grotesk — geometric, futuristic, expressive
// Body:    Inter — clean, neutral, high readability
// Mono:    JetBrains Mono — hard telemetry font for data/labels
export const display = "'Space Grotesk', 'Figtree', sans-serif";
export const body = "'Inter', 'Figtree', sans-serif";
export const mono = "'JetBrains Mono', monospace";

// ── Density scale ──
export const density = {
  comfortable: { rowPad: "12px 16px", cellPad: "10px 14px", gap: 12, fontSize: 13, headerSize: 11 },
  compact: { rowPad: "8px 12px", cellPad: "6px 10px", gap: 6, fontSize: 12, headerSize: 10 },
};

// ── Color system ────────────────────────────────────────────────
// Semantic accents: cyan=info, lime=success, amber=warning, red=critical
export const themes = {

  dark: {
    // Backgrounds — deep navy with blue undertone
    bg: "#06090F", surface: "rgba(255,255,255,0.05)", surfaceAlt: "rgba(255,255,255,0.03)",
    surfaceSolid: "#0A0E17",
    glass: "rgba(255,255,255,0.07)", glassData: "rgba(255,255,255,0.04)",
    // Borders
    border: "rgba(255,255,255,0.08)", borderHover: "rgba(255,255,255,0.16)",
    // Text
    text: "#ECF0F6", textMid: "#8B92A8", textDim: "#515972",
    textCrit: "#FFFFFF",
    // Primary accent — electric blue
    accent: "#3B82F6", accentDim: "rgba(59,130,246,0.12)", accentMid: "rgba(59,130,246,0.30)",
    // Semantic: Success — lime green
    green: "#84FF95", greenDim: "rgba(132,255,149,0.12)",
    // Semantic: Info — cyan
    blue: "#22D3EE", blueDim: "rgba(34,211,238,0.12)",
    cyan: "#22D3EE", cyanDim: "rgba(34,211,238,0.12)",
    // Semantic: Decorative — purple
    purple: "#A78BFA", purpleDim: "rgba(167,139,250,0.12)",
    // Semantic: Critical — red
    red: "#FF6B6B", redDim: "rgba(255,107,107,0.12)",
    // Semantic: Warning — amber
    orange: "#FBBF24", orangeDim: "rgba(251,191,36,0.12)",
    // Glow colors for volumetric blobs
    glow1: "rgba(59,130,246,0.08)",   // blue glow
    glow2: "rgba(34,211,238,0.05)",   // cyan glow
    glow3: "rgba(167,139,250,0.04)",  // purple glow
    gradient: "linear-gradient(145deg, #04070D 0%, #080C16 35%, #0A0F1A 65%, #04070D 100%)",
    inputScheme: "dark",
    shadow: "rgba(0,0,0,0.5)",
  },
  light: {
    bg: "#F0F2F7", surface: "rgba(255,255,255,0.90)", surfaceAlt: "rgba(255,255,255,0.65)",
    surfaceSolid: "#FFFFFF",
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
    glow1: "rgba(37,99,235,0.04)",
    glow2: "rgba(8,145,178,0.03)",
    glow3: "rgba(124,58,237,0.02)",
    gradient: "linear-gradient(145deg, #ECF0F6 0%, #EEF0F4 35%, #F0F2F7 65%, #ECF0F6 100%)",
    inputScheme: "light",
    shadow: "rgba(0,0,0,0.08)",
  },
};

export const phaseNames = ["PRD", "Design", "Engineering", "QA"];

// Mutable color reference - updated on theme change
export let c = themes.dark;
export function setTheme(isDark) {
  c = isDark ? themes.dark : themes.light;
  return c;
}

// ── Canonical status semantics (consistent across all screens) ──
export const typeConfig = () => ({
  BUILD: { color: c.green, bg: c.greenDim, emoji: "~", label: "Build" },
  JAM: { color: c.blue, bg: c.blueDim, emoji: "~", label: "Jam" },
  COMMIT: { color: c.purple, bg: c.purpleDim, emoji: "~", label: "Commit" },
  BLOCKED: { color: c.red, bg: c.redDim, emoji: "!", label: "Blocked" },
});

// ── Canonical outcome semantics ──
export const outcomeConfig = () => ({
  done: { color: c.green, bg: c.greenDim, label: "Completed", icon: "✓" },
  partial: { color: c.orange, bg: c.orangeDim, label: "Partial", icon: "◐" },
  carry: { color: c.blue, bg: c.blueDim, label: "Carry", icon: "→" },
});

// ── Canonical risk semantics ──
export const riskConfig = () => ({
  healthy: { color: c.green, label: "On Track" },
  warning: { color: c.orange, label: "At Risk" },
  critical: { color: c.red, label: "Critical" },
});

export const phaseColors = () => ({ PRD: c.purple, Design: c.blue, Engineering: c.green, QA: c.cyan });

// ── Typography hierarchy ──────────────────────────────────────
export const typo = {
  metric:     { font: display, size: 24, weight: 700, tracking: "-0.02em" },
  metricLg:   { font: display, size: 28, weight: 800, tracking: "-0.03em" },
  sectionLbl: { font: display, size: 15, weight: 700, tracking: "-0.01em" },
  rowText:    { font: body,    size: 13, weight: 600, tracking: "0" },
  rowSub:     { font: body,    size: 12, weight: 400, tracking: "0" },
  helper:     { font: body,    size: 11, weight: 400, tracking: "0" },
  fieldLbl:   { font: mono,    size: 9,  weight: 500, tracking: "0.08em" },
  badge:      { font: body,    size: 11, weight: 600, tracking: "0.02em" },
  tag:        { font: mono,    size: 9,  weight: 700, tracking: "0.04em" },
  mono9:      { font: mono,    size: 9,  weight: 500, tracking: "0.04em" },
  mono10:     { font: mono,    size: 10, weight: 600, tracking: "0" },
  // New — telemetry readout style
  tele:       { font: mono,    size: 10, weight: 600, tracking: "0.06em" },
  teleLg:     { font: mono,    size: 12, weight: 700, tracking: "0.04em" },
};

// ── Layout tokens ─────────────────────────────────────────────
export const layout = {
  radius: 12,
  radiusSm: 6,
  radiusPill: 20,
  radiusTag: 3,
  padCard: 16,
  padSection: 20,
  padCompact: 12,
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
