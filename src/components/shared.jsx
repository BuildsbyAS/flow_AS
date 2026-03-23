import React from "react";
import ReactDOM from "react-dom";
import { c, typo, layout, space, motion, btnVariants, entityColors } from "../styles/theme";

// ══════════════════════════════════════════════════════════════
// Badge — semantic color pill (uppercase, rounded)
// Use for: status labels, outcome markers, role indicators
// ══════════════════════════════════════════════════════════════
export const Badge = ({ color, bg, children, style: s }) => (
  <span style={{
    fontSize: typo.badge.size, fontFamily: typo.badge.font, fontWeight: typo.badge.weight,
    letterSpacing: typo.badge.tracking, lineHeight: typo.badge.lineHeight,
    color, background: bg, padding: `${space[1]}px ${space[3] - 1}px`,
    borderRadius: layout.radiusPill, ...s,
  }}>{children}</span>
);

// ══════════════════════════════════════════════════════════════
// Tag — compact mono tag (small, tight, for inline metadata)
// Use for: type indicators, phase labels, quality flags, counts
// ══════════════════════════════════════════════════════════════
export const Tag = ({ color, bg, children, uppercase = true, style: s }) => (
  <span style={{
    fontSize: typo.tag.size, fontFamily: typo.tag.font, fontWeight: typo.tag.weight,
    letterSpacing: typo.tag.tracking, lineHeight: typo.tag.lineHeight,
    textTransform: uppercase ? "uppercase" : "none",
    color, background: bg, padding: `2px ${space[2] - 2}px`,
    borderRadius: layout.radiusTag, ...s,
  }}>{children}</span>
);

// ══════════════════════════════════════════════════════════════
// Surface — standard container
// variant: "panel" (default) | "data" | "hero" | "overlay"
// accent?: color string for colored left border
// ══════════════════════════════════════════════════════════════
const SURFACE_BG = {
  panel:   () => c.surface,
  data:    () => c.surfaceData,
  hero:    () => c.surfaceHero,
  overlay: () => c.surfaceOverlay,
};

export const Surface = ({ children, style: s, accent, className = "", compact = false, variant = "panel", id }) => {
  const bgFn = SURFACE_BG[variant] || SURFACE_BG.panel;
  return (
    <div id={id} className={`flow-card ${className}`} style={{
      background: bgFn(),
      border: `1px solid ${c.border}`,
      borderLeft: accent ? `3px solid ${accent}` : `1px solid ${c.border}`,
      borderRadius: layout.radius,
      overflow: "clip",
      padding: compact ? layout.padCompact : layout.padCard,
      ...(variant === "hero" ? { boxShadow: c.shadowHero } : {}),
      ...(variant === "overlay" ? { boxShadow: c.shadowOverlay } : {}),
      ...s,
    }}>{children}</div>
  );
};

// ══════════════════════════════════════════════════════════════
// Glass — LEGACY alias → Surface. Kept for import compatibility.
// Blur is removed everywhere. Use Surface for new code.
// ══════════════════════════════════════════════════════════════
export const Glass = ({ children, style: s, className = "", dataMode = false }) => (
  <Surface compact={dataMode} variant={dataMode ? "data" : "panel"} style={s} className={className}>{children}</Surface>
);

// ══════════════════════════════════════════════════════════════
// Card — alias for Surface with variant support
// ══════════════════════════════════════════════════════════════
export const Card = ({ children, style: s, dataMode = false, accent, variant }) => (
  <Surface compact={dataMode} accent={accent} variant={variant || (dataMode ? "data" : "panel")} style={s}>{children}</Surface>
);

// ══════════════════════════════════════════════════════════════
// Label — section header with accent bar (uses displaySm)
// ══════════════════════════════════════════════════════════════
export const Label = ({ children, style: s }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: space[2],
    fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
    fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
    lineHeight: typo.displaySm.lineHeight,
    color: c.text, marginBottom: space[3], ...s,
  }}>
    <div style={{ width: 3, height: space[4], borderRadius: 2, background: c.accent }} />
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════
// Btn — system button with variant support
// variant: "primary" | "secondary" | "ghost" | "danger" | "command"
// size: "default" | "sm"
// ══════════════════════════════════════════════════════════════
export const Btn = ({ children, variant = "secondary", size = "default", style: s, ...rest }) => {
  const v = (btnVariants() || {})[variant] || btnVariants().secondary;
  const isSm = size === "sm";
  return (
    <button {...rest} className="flow-btn" style={{
      padding: isSm ? `${space[1]}px ${space[3]}px` : `${space[2]}px ${space[5]}px`,
      borderRadius: layout.radiusSm,
      border: v.border,
      background: v.bg,
      color: v.color,
      fontFamily: typo.bodyMd.font,
      fontSize: isSm ? typo.bodySm.size : typo.bodyMd.size,
      fontWeight: 600,
      cursor: rest.disabled ? "default" : "pointer",
      opacity: rest.disabled ? 0.5 : 1,
      transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
      boxSizing: "border-box",
      display: "inline-flex", alignItems: "center", gap: space[2],
      ...s,
    }}>{children}</button>
  );
};

// ══════════════════════════════════════════════════════════════
// Inp — text input (38–42px height per spec)
// ══════════════════════════════════════════════════════════════
export const Inp = ({ style: s, ...rest }) => (
  <input {...rest} className="flow-input" style={{
    height: 40, padding: `0 ${space[4] - 2}px`,
    borderRadius: layout.radiusSm,
    border: `1px solid ${c.border}`, background: c.surfaceAlt,
    color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
    outline: "none", boxSizing: "border-box",
    transition: `border-color ${motion.interaction.duration} ${motion.interaction.easing}`,
    ...s,
  }} />
);

// ══════════════════════════════════════════════════════════════
// TextArea — multi-line text input (matches Inp styling)
// Use for: deliverable descriptions, notes, any multi-line entry
// ══════════════════════════════════════════════════════════════
export const TextArea = ({ style: s, ...rest }) => (
  <textarea {...rest} className="flow-input" style={{
    width: "100%", padding: `${space[2]}px ${space[3]}px`,
    borderRadius: layout.radiusSm,
    border: `1px solid ${c.border}`, background: c.surfaceAlt,
    color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
    fontWeight: typo.bodyMd.weight, lineHeight: typo.bodyMd.lineHeight,
    outline: "none", boxSizing: "border-box",
    resize: "vertical", minHeight: 72,
    transition: `border-color ${motion.interaction.duration} ${motion.interaction.easing}`,
    ...s,
  }} />
);

// ══════════════════════════════════════════════════════════════
// ChoiceGroup — single-select toggle button group
// Use for: stage, type, duration pickers in Commit cards
// mono: true → uses monoMd tokens (for type codes); false → bodySm (for labels)
// ══════════════════════════════════════════════════════════════
export const ChoiceGroup = ({ options, value, onChange, mono = false }) => {
  const font = mono ? typo.monoMd : typo.bodySm;
  return (
    <div style={{ display: "flex", gap: space[1], flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = value === opt.value;
        const clr = opt.color || c.accent;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} className="flow-btn" style={{
            padding: `${space[1] + 1}px ${space[3] - 2}px`, borderRadius: layout.radiusSm,
            border: `1px solid ${active ? clr + "40" : c.border}`,
            background: active ? (opt.bg || clr + "12") : "transparent",
            color: active ? clr : c.textDim,
            fontFamily: font.font, fontSize: font.size, fontWeight: mono ? font.weight : 600,
            letterSpacing: font.tracking || "0",
            cursor: "pointer",
            transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
          }}>{opt.label}</button>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// Sel — select dropdown (matches Inp height)
// ══════════════════════════════════════════════════════════════
export const Sel = ({ children, style: s, ...rest }) => (
  <select {...rest} className="flow-input" style={{
    height: 40, padding: `0 ${space[3]}px`,
    borderRadius: layout.radiusSm,
    border: `1px solid ${c.border}`, background: c.surfaceAlt,
    color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
    cursor: "pointer", appearance: "auto",
    boxSizing: "border-box",
    transition: `border-color ${motion.interaction.duration} ${motion.interaction.easing}`,
    ...s,
  }}>{children}</select>
);

// ══════════════════════════════════════════════════════════════
// SearchSelect — filterable dropdown with keyboard nav
// ══════════════════════════════════════════════════════════════
export const SearchSelect = ({ value, onChange, options, placeholder = "Search..." }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [focusIdx, setFocusIdx] = React.useState(0);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const dropdownRef = React.useRef(null);

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  React.useEffect(() => { setFocusIdx(0); }, [query]);
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = (val) => { onChange(val); setOpen(false); setQuery(""); };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusIdx(i => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocusIdx(i => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && filtered[focusIdx]) { e.preventDefault(); select(filtered[focusIdx]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };

  // Scroll active item into view
  React.useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[focusIdx];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [focusIdx]);

  // Calculate dropdown position relative to viewport
  const [dropPos, setDropPos] = React.useState({ top: 0, left: 0, width: 0 });
  React.useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} className="flow-input" style={{
        width: "100%", height: 40, padding: `0 ${space[3]}px`,
        borderRadius: layout.radiusSm,
        border: `1px solid ${open ? c.accent : c.border}`, background: c.surfaceAlt,
        color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
        cursor: "pointer", textAlign: "left", boxSizing: "border-box",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: `border-color ${motion.interaction.duration} ${motion.interaction.easing}`,
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder}</span>
        <span style={{ color: c.textDim, fontSize: 10, marginLeft: space[2], flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && ReactDOM.createPortal(
        <div ref={dropdownRef} style={{
          position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width,
          background: c.surfaceOverlay, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusSm, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          zIndex: 10000, maxHeight: 240, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: `${space[2]}px ${space[2]}px 0` }}>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              style={{
                width: "100%", padding: `${space[2]}px ${space[3]}px`,
                borderRadius: layout.radiusTag + 2,
                border: `1px solid ${c.border}`, background: c.bg,
                color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodySm.size,
                outline: "none", boxSizing: "border-box",
              }} />
          </div>
          <div ref={listRef} style={{ overflowY: "auto", padding: `${space[1]}px 0`, flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: `${space[3]}px ${space[4]}px`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, textAlign: "center" }}>No matches</div>
            )}
            {filtered.map((opt, i) => (
              <div key={opt} onClick={() => select(opt)}
                onMouseEnter={() => setFocusIdx(i)}
                style={{
                  padding: `${space[2]}px ${space[4]}px`, cursor: "pointer",
                  background: i === focusIdx ? c.accentDim : opt === value ? `${c.accent}08` : "transparent",
                  fontFamily: typo.bodyMd.font, fontSize: typo.bodySm.size,
                  color: opt === value ? c.accent : c.text,
                  fontWeight: opt === value ? 600 : 400,
                  transition: `background ${motion.interaction.duration} ${motion.interaction.easing}`,
                }}>{opt}</div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// EmptyState — with explicit next-action
// ══════════════════════════════════════════════════════════════
export const EmptyState = ({ icon = "📭", title, message, action, onAction }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: `${space[8]}px ${space[5]}px`,
    borderRadius: layout.radius, border: `1px dashed ${c.border}`,
    background: c.surfaceAlt, textAlign: "center",
  }}>
    <span style={{ fontSize: 32, marginBottom: space[3], opacity: 0.7 }}>{icon}</span>
    <div style={{
      fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
      fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[1],
    }}>{title}</div>
    <div style={{
      fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
      color: c.textMid, maxWidth: 320, lineHeight: typo.bodyMd.lineHeight,
      marginBottom: action ? space[4] : 0,
    }}>{message}</div>
    {action && onAction && (
      <Btn variant="command" size="sm" onClick={onAction}>{action}</Btn>
    )}
  </div>
);

// ══════════════════════════════════════════════════════════════
// KbdHint — inline keyboard shortcut hint
// ══════════════════════════════════════════════════════════════
export const KbdHint = ({ keys, label, style: s }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
    letterSpacing: typo.monoMd.tracking,
    color: c.textMid, ...s,
  }}>
    {keys.map((k, i) => (
      <span key={i} style={{
        background: c.surfaceAlt, border: `1px solid ${c.border}`,
        padding: "1px 5px", borderRadius: layout.radiusTag,
        fontSize: typo.monoMd.size, fontWeight: 600, lineHeight: 1.4,
        boxShadow: `0 1px 0 ${c.border}`,
      }}>{k}</span>
    ))}
    {label && <span style={{ marginLeft: 2 }}>{label}</span>}
  </span>
);

// ══════════════════════════════════════════════════════════════
// FilterChip — active filter indicator (distinct from Badge)
// ══════════════════════════════════════════════════════════════
export const FilterChip = ({ label, active = true, onClick, style: s }) => (
  <span onClick={onClick} style={{
    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
    fontWeight: typo.monoMd.weight, letterSpacing: typo.monoMd.tracking,
    color: active ? c.accent : c.textMid,
    background: active ? c.accentDim : c.surfaceAlt,
    padding: `2px ${space[2]}px`, borderRadius: layout.radiusTag + 1,
    border: active ? `1px solid ${c.accent}25` : `1px solid ${c.border}`,
    whiteSpace: "nowrap",
    cursor: onClick ? "pointer" : "default",
    transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
    ...s,
  }}>{label}</span>
);

// ══════════════════════════════════════════════════════════════
// MetricCompact — secondary inline metric (smaller than KPI tiles)
// Use for: supporting metrics in hero strips, summary rails
// Shared across Summary (prev-week diff) and Pulse (commits/blocked/health)
// ══════════════════════════════════════════════════════════════
export const MetricCompact = ({ value, label, color, prevValue, hero }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: `${space[3] - 2}px ${space[2]}px`, minWidth: 48,
  }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      <span style={{
        fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
        fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
        color, lineHeight: 1,
      }}>{value}</span>
      {prevValue !== undefined && <DeltaIndicator value={value - prevValue} />}
    </div>
    <span style={{
      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
      fontWeight: hero ? 700 : 500, letterSpacing: "0",
      color: hero ? c.text : c.textMid, whiteSpace: "nowrap",
    }}>{label}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
// DeltaIndicator — directional change indicator (+N / -N)
// Use for: week-over-week deltas, KPI comparisons, scope changes
// Shared across Summary (prev-week diff) and Pulse (scope churn)
// ══════════════════════════════════════════════════════════════
export const DeltaIndicator = ({ value, style: s }) => {
  if (value === 0 || value === null || value === undefined) return null;
  const up = value > 0;
  const clr = up ? c.green : c.red;
  return (
    <span style={{
      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
      fontWeight: 700, color: clr, letterSpacing: typo.monoSm.tracking,
      display: "inline-flex", alignItems: "center", gap: 1, ...s,
    }}>
      <span style={{ fontSize: 6 }}>{up ? "▲" : "▼"}</span>{up ? "+" : ""}{value}
    </span>
  );
};

// ══════════════════════════════════════════════════════════════
// VDivider — vertical separator for KPI strips and metric rails
// ══════════════════════════════════════════════════════════════
export const VDivider = ({ height = 36, style: s }) => (
  <div style={{
    width: 1, height, background: c.border,
    margin: `0 ${space[2] - 2}px`, flexShrink: 0, ...s,
  }} />
);

// ══════════════════════════════════════════════════════════════
// TelemetryLabel — mono uppercase label for section/field headers
// Use for: telemetry sections, field labels, system metadata headers
// ══════════════════════════════════════════════════════════════
export const TelemetryLabel = ({ children, color, style: s }) => (
  <span style={{
    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
    fontWeight: typo.monoMd.weight, letterSpacing: "0.06em",
    color: color || c.textMid, textTransform: "uppercase", ...s,
  }}>{children}</span>
);

// ══════════════════════════════════════════════════════════════
// StatCell — compact metric cell for hero stat rails
// Use for: Projects command card metrics, People telemetry metrics
// Shared across both deep-dive hero panels
// ══════════════════════════════════════════════════════════════
export const StatCell = ({ value, label, color, highlight, highlightBg, style: s }) => (
  <div style={{
    textAlign: "center", padding: `${space[3]}px ${space[2]}px`,
    borderRadius: layout.radiusMd,
    background: highlight ? (highlightBg || "transparent") : "transparent",
    border: highlight ? `1px solid ${color}20` : "none",
    ...s,
  }}>
    <div style={{
      fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size,
      fontWeight: typo.displayLg.weight, letterSpacing: typo.displayLg.tracking,
      color, lineHeight: 1,
    }}>{value}</div>
    <div style={{
      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
      fontWeight: 500, letterSpacing: "0",
      color: c.textMid, marginTop: space[1] + 2,
    }}>{label}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// SectionDivider — structural separator between current and history
// Use for: separating current-week content from historical content
// Shared across Projects (evidence/history) and People (timeline)
// ══════════════════════════════════════════════════════════════
export const SectionDivider = ({ label, count, color, style: s }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: space[2],
    padding: `${space[3]}px 0`, ...s,
  }}>
    <div style={{ flex: 1, height: 1, background: c.border }} />
    <span style={{
      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
      fontWeight: 600, letterSpacing: "0",
      color: color || c.textMid,
    }}>{label}</span>
    {count !== undefined && (
      <span style={{
        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
        color: c.textMid,
      }}>{count}</span>
    )}
    <div style={{ flex: 1, height: 1, background: c.border }} />
  </div>
);

// ══════════════════════════════════════════════════════════════
// SummaryTile — compact inline tile for KPI/status summary strips
// Use for: phase counts, status counts, clickable filter tiles
// Shared across Pulse (phase/ship/no-action) and Commit (locked/ready/partial/empty)
// ══════════════════════════════════════════════════════════════
export const SummaryTile = ({ value, label, color, active, onClick, icon, prevValue, hero }) => (
  <div
    onClick={onClick}
    className="flow-glass-tile"
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: space[1],
      padding: `${space[3] - 2}px ${space[3]}px`, minWidth: 56,
      borderRadius: layout.radiusMd, cursor: onClick ? "pointer" : "default",
      background: active ? `${color}12` : "transparent",
      border: `1px solid ${active ? color + "40" : "transparent"}`,
      transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
    }}
  >
    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
      <span style={{
        fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
        fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
        color: active ? color : (value > 0 ? c.text : c.textDim),
        lineHeight: 1,
      }}>{value}</span>
      {prevValue !== undefined && <DeltaIndicator value={value - prevValue} />}
    </div>
    <span style={{
      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
      fontWeight: hero ? 700 : 500, letterSpacing: "0",
      color: hero ? c.text : (active ? color : c.textMid),
      whiteSpace: "nowrap",
    }}>{icon ? `${icon} ` : ""}{label}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════
// Th — shared sortable table header cell
// Use for: all sortable table headers across Registry, Analytics, Admin tables
// Props: col (sort key), sortKey, sortDir, onSort, children, style
// ══════════════════════════════════════════════════════════════
export const Th = ({ col, sortKey, sortDir, onSort, children, style: s }) => (
  <th onClick={() => onSort && onSort(col)} style={{
    padding: `${space[2]}px ${space[2] - 2}px`, textAlign: "left",
    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
    fontWeight: 600, letterSpacing: "0",
    cursor: onSort ? "pointer" : "default", userSelect: "none",
    borderBottom: `1px solid ${c.border}`,
    background: c.bg, color: sortKey === col ? c.accent : c.textMid,
    transition: `color ${motion.interaction.duration}`,
    position: "sticky", top: 0, zIndex: 2,
    whiteSpace: "nowrap", ...s,
  }}>{children}{sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
);

// ══════════════════════════════════════════════════════════════
// EntityLink — clickable cross-reference for project or person entities
// Use for: project IDs/names and person names that navigate on click
// type: "project" | "person"
// ══════════════════════════════════════════════════════════════
export const EntityLink = ({ children, type = "project", onClick, underline = false, style: s }) => {
  const ec = entityColors();
  const color = type === "person" ? ec.person : ec.project;
  return (
    <span onClick={onClick} style={{
      color,
      cursor: onClick ? "pointer" : "default",
      textDecoration: underline ? "underline" : "none",
      textDecorationColor: underline ? color + "40" : undefined,
      textUnderlineOffset: underline ? 2 : undefined,
      ...s,
    }}>{children}</span>
  );
};
