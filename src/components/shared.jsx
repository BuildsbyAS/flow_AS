import React from "react";
import { c, display, body, mono, typo, layout } from "../styles/theme";

// ══════════════════════════════════════════════════════════════
// Badge — semantic color pill (uppercase, rounded)
// Use for: status labels, outcome markers, role indicators
// ══════════════════════════════════════════════════════════════
export const Badge = ({ color, bg, children, style: s }) => (
  <span style={{
    fontSize: typo.badge.size, fontFamily: typo.badge.font, fontWeight: typo.badge.weight,
    letterSpacing: typo.badge.tracking, textTransform: "uppercase",
    color, background: bg, padding: "4px 11px", borderRadius: layout.radiusPill, ...s,
  }}>{children}</span>
);

// ══════════════════════════════════════════════════════════════
// Tag — compact mono tag (small, tight, for inline metadata)
// Use for: type indicators, phase labels, quality flags, counts
// ══════════════════════════════════════════════════════════════
export const Tag = ({ color, bg, children, style: s }) => (
  <span style={{
    fontSize: typo.tag.size, fontFamily: typo.tag.font, fontWeight: typo.tag.weight,
    letterSpacing: typo.tag.tracking, textTransform: "uppercase",
    color, background: bg, padding: "2px 6px", borderRadius: layout.radiusTag, ...s,
  }}>{children}</span>
);

// ══════════════════════════════════════════════════════════════
// Surface — standard container (no blur, no glass)
// Use for: any card, panel, section wrapper
// accent?: color string for colored left border
// ══════════════════════════════════════════════════════════════
export const Surface = ({ children, style: s, accent, className = "", compact = false }) => (
  <div className={`flow-card ${className}`} style={{
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderLeft: accent ? `3px solid ${accent}` : `1px solid ${c.border}`,
    borderRadius: layout.radius,
    padding: compact ? layout.padCompact : layout.padCard,
    ...s,
  }}>{children}</div>
);

// ══════════════════════════════════════════════════════════════
// Glass — LEGACY alias → Surface. Kept for import compatibility.
// Blur is removed everywhere. Use Surface for new code.
// ══════════════════════════════════════════════════════════════
export const Glass = ({ children, style: s, className = "", dataMode = false }) => (
  <Surface compact={dataMode} style={s} className={className}>{children}</Surface>
);

// ══════════════════════════════════════════════════════════════
// Card — alias for Surface
// ══════════════════════════════════════════════════════════════
export const Card = ({ children, style: s, dataMode = false, accent }) => (
  <Surface compact={dataMode} accent={accent} style={s}>{children}</Surface>
);

// ══════════════════════════════════════════════════════════════
// Label — section header with accent bar
// ══════════════════════════════════════════════════════════════
export const Label = ({ children, style: s }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8,
    fontFamily: typo.sectionLbl.font, fontSize: typo.sectionLbl.size,
    fontWeight: typo.sectionLbl.weight, color: c.text, marginBottom: 12, ...s,
  }}>
    <div style={{ width: 3, height: 16, borderRadius: 2, background: c.accent }} />
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════
// Inp — text input
// ══════════════════════════════════════════════════════════════
export const Inp = ({ style: s, ...rest }) => (
  <input {...rest} className="flow-input" style={{
    padding: "10px 14px", borderRadius: layout.radiusSm,
    border: `1px solid ${c.border}`, background: c.surfaceAlt,
    color: c.text, fontFamily: body, fontSize: 13,
    outline: "none", boxSizing: "border-box", ...s,
  }} />
);

// ══════════════════════════════════════════════════════════════
// Sel — select dropdown
// ══════════════════════════════════════════════════════════════
export const Sel = ({ children, style: s, ...rest }) => (
  <select {...rest} className="flow-input" style={{
    padding: "10px 12px", borderRadius: layout.radiusSm,
    border: `1px solid ${c.border}`, background: c.surfaceAlt,
    color: c.text, fontFamily: body, fontSize: 13,
    cursor: "pointer", appearance: "auto",
    boxSizing: "border-box", ...s,
  }}>{children}</select>
);

// ══════════════════════════════════════════════════════════════
// EmptyState — with explicit next-action
// ══════════════════════════════════════════════════════════════
export const EmptyState = ({ icon = "📭", title, message, action, onAction }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: `${layout.padSection * 2}px ${layout.padSection}px`,
    borderRadius: layout.radius, border: `1px dashed ${c.border}`,
    background: c.surfaceAlt, textAlign: "center",
  }}>
    <span style={{ fontSize: 32, marginBottom: 12, opacity: 0.7 }}>{icon}</span>
    <div style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 4 }}>{title}</div>
    <div style={{ fontFamily: body, fontSize: 13, color: c.textDim, maxWidth: 320, lineHeight: 1.5, marginBottom: action ? 16 : 0 }}>{message}</div>
    {action && onAction && (
      <button onClick={onAction} className="flow-btn" style={{
        padding: "8px 20px", borderRadius: layout.radiusSm, border: "none",
        background: c.accentDim, cursor: "pointer",
        fontFamily: body, fontSize: 12, fontWeight: 600, color: c.accent,
      }}>{action}</button>
    )}
  </div>
);

// ══════════════════════════════════════════════════════════════
// KbdHint — inline keyboard shortcut hint
// ══════════════════════════════════════════════════════════════
export const KbdHint = ({ keys, label, style: s }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    fontFamily: mono, fontSize: 9, color: c.textDim, opacity: 0.7, ...s,
  }}>
    {keys.map((k, i) => (
      <span key={i} style={{
        background: c.surfaceAlt, border: `1px solid ${c.border}`,
        padding: "1px 5px", borderRadius: layout.radiusTag, fontSize: 8, fontWeight: 600,
      }}>{k}</span>
    ))}
    {label && <span style={{ marginLeft: 2 }}>{label}</span>}
  </span>
);
