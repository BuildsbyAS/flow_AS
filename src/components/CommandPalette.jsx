import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { c, display, body, mono, motion } from "../styles/theme";
import { NAV } from "./AppShell";

// ═══════════════════════════════════════════════════════════════
// UNIVERSAL SEARCH — F / Cmd+K
// Search projects, people, navigation, settings, and actions
// ═══════════════════════════════════════════════════════════════

// ── Category color mapping ──
const CAT_COLORS = () => ({
  all:        { color: c.accent, dim: c.accentDim },
  projects:   { color: c.cyan,   dim: c.cyanDim   },
  people:     { color: c.green,  dim: c.greenDim   },
  navigation: { color: c.orange, dim: c.orangeDim  },
  settings:   { color: c.purple, dim: c.purpleDim  },
});

// ── Section color mapping ──
const SECTION_COLORS = () => ({
  Navigation: c.accent,
  Actions:    c.orange,
  Projects:   c.cyan,
  People:     c.green,
  Settings:   c.purple,
});

const CATEGORIES = [
  { key: "all",        label: "All",        icon: "◎" },
  { key: "projects",   label: "Projects",   icon: "◆" },
  { key: "people",     label: "People",     icon: "●" },
  { key: "navigation", label: "Navigate",   icon: "→" },
  { key: "settings",   label: "Settings",   icon: "⚙" },
];

// Section ordering for "All" mode
const SECTION_ORDER = ["Navigation", "Actions", "Projects", "People", "Settings"];

// ── Scoring helper ──
function scoreMatch(query, text) {
  if (!text) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  return 0;
}

function multiWordMatch(query, ...fields) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 100;
  const combined = fields.filter(Boolean).join(" ").toLowerCase();
  let total = 0;
  for (const w of words) {
    if (!combined.includes(w)) return 0;
    total += combined.startsWith(w) ? 80 : 60;
  }
  return total / words.length;
}


const CommandPalette = ({ open, onClose, onTabSwitch, projects, people, onNavigate, darkMode, onToggleTheme }) => {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [category, setCategory] = useState("all");
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const catColors = CAT_COLORS();
  const secColors = SECTION_COLORS();

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setCategory("all");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build full command list
  const commands = useMemo(() => {
    const cmds = [];

    // ── Navigation ──
    NAV.forEach(tab => {
      cmds.push({
        id: `nav-${tab.key}`,
        label: tab.label.replace("⚙️ ", ""),
        hint: `Go to ${tab.label.replace("⚙️ ", "")} view`,
        section: "Navigation",
        cat: "navigation",
        icon: String(tab.num),
        iconColor: c.accent,
        kbd: String(tab.num),
        action: () => { onTabSwitch(tab.key); onClose(); },
      });
    });

    // ── Actions ──
    cmds.push({
      id: "toggle-theme",
      label: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
      hint: "Toggle color theme",
      section: "Actions",
      cat: "navigation",
      icon: darkMode ? "☀" : "◑",
      iconColor: c.orange,
      kbd: "D",
      action: () => { onToggleTheme(); onClose(); },
    });

    // ── Projects (ALL) ──
    if (projects) {
      projects.forEach(p => {
        cmds.push({
          id: `proj-${p.id}`,
          label: `${p.id} — ${p.name}`,
          hint: `${p.squad} · ${p.owner || "No owner"} · ${p.phase}`,
          section: "Projects",
          cat: "projects",
          icon: p.id.slice(0, 3),
          iconColor: c.cyan,
          action: () => { if (onNavigate) onNavigate("projects", p.id); onClose(); },
        });
      });
    }

    // ── People (ALL) ──
    if (people) {
      people.forEach(p => {
        cmds.push({
          id: `person-${p.name}`,
          label: p.name,
          hint: `${p.role} · ${p.squad}`,
          section: "People",
          cat: "people",
          icon: p.name.split(" ").map(w => w[0]).join(""),
          iconColor: c.green,
          action: () => { if (onNavigate) onNavigate("people", p.name); onClose(); },
        });
      });
    }

    // ── Settings sub-tabs ──
    const settingsTabs = [
      { id: "settings-projects", label: "Projects Config", hint: "Manage project data grid", icon: "◆" },
      { id: "settings-people",   label: "People Config",   hint: "Manage people directory", icon: "●" },
      { id: "settings-squads",   label: "Squads Config",   hint: "Configure squad definitions", icon: "◫" },
      { id: "settings-roles",    label: "Roles Config",    hint: "Configure role definitions", icon: "◈" },
      { id: "settings-audit",    label: "Audit Log",       hint: "View event stream & changes", icon: "◷" },
    ];
    settingsTabs.forEach(st => {
      cmds.push({
        id: st.id,
        label: st.label,
        hint: st.hint,
        section: "Settings",
        cat: "settings",
        icon: st.icon,
        iconColor: c.purple,
        action: () => { onTabSwitch("settings"); onClose(); },
      });
    });

    return cmds;
  }, [projects, people, darkMode, onTabSwitch, onNavigate, onToggleTheme, onClose]);

  // Filter + rank
  const filtered = useMemo(() => {
    let pool = commands;
    if (category !== "all") {
      pool = pool.filter(cmd => cmd.cat === category);
    }
    if (query.trim()) {
      pool = pool
        .map(cmd => ({
          ...cmd,
          _score: Math.max(
            multiWordMatch(query, cmd.label, cmd.hint),
            scoreMatch(query, cmd.section),
          ),
        }))
        .filter(cmd => cmd._score > 0)
        .sort((a, b) => b._score - a._score);
    }
    return pool.slice(0, 24);
  }, [query, commands, category]);

  useEffect(() => { setActiveIdx(0); }, [filtered.length, query, category]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // Keyboard
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(filtered.length - 1, i + 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIdx]) filtered[activeIdx].action();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const idx = CATEGORIES.findIndex(cat => cat.key === category);
      const next = e.shiftKey
        ? (idx - 1 + CATEGORIES.length) % CATEGORIES.length
        : (idx + 1) % CATEGORIES.length;
      setCategory(CATEGORIES[next].key);
    }
  }, [filtered, activeIdx, onClose, category]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  // Group by section for display
  const sections = [];
  let currentSection = null;
  const sectionOrder = [...SECTION_ORDER];
  const ordered = [...filtered].sort((a, b) => {
    const ai = sectionOrder.indexOf(a.section);
    const bi = sectionOrder.indexOf(b.section);
    if (ai !== bi) return ai - bi;
    return 0;
  });

  let globalIdx = 0;
  ordered.forEach((cmd) => {
    if (cmd.section !== currentSection) {
      currentSection = cmd.section;
      sections.push({ type: "header", label: currentSection });
    }
    sections.push({ type: "item", cmd, idx: globalIdx });
    globalIdx++;
  });

  // Active category color
  const activeCatColor = catColors[category]?.color || c.accent;

  return (
    <div className="flow-cmd-overlay" onClick={onClose}>
      <div className="flow-cmd-box" onClick={e => e.stopPropagation()} style={{ width: 600, maxHeight: 540 }}>

        {/* ── Gradient top accent bar ── */}
        <div className="flow-cmd-topbar" />

        {/* ── Search input ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px 14px",
        }}>
          {/* Animated search indicator */}
          <div className="flow-cmd-search-glow" style={{
            width: 20, height: 20, borderRadius: "50%",
            background: `radial-gradient(circle, ${activeCatColor}30 0%, transparent 70%)`,
            border: `1.5px solid ${activeCatColor}60`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: activeCatColor, lineHeight: 1 }}>
              {query ? "◉" : "⊙"}
            </span>
          </div>

          <input
            ref={inputRef}
            className="flow-cmd-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, people, settings..."
            style={{
              flex: 1, padding: 0, border: "none", background: "transparent",
              fontFamily: body, fontSize: 15, fontWeight: 500,
              color: c.text, outline: "none", lineHeight: 1.4,
            }}
          />
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 700,
            color: c.textDim, background: `${c.surfaceAlt}`,
            border: `1px solid ${c.border}`, padding: "2px 7px", borderRadius: 4,
            flexShrink: 0, letterSpacing: "0.02em",
          }}>ESC</span>
        </div>

        {/* ── Gradient divider ── */}
        <div style={{
          height: 1, margin: "0 20px",
          background: `linear-gradient(90deg, transparent, ${activeCatColor}40, ${c.border}, ${c.purple}30, transparent)`,
        }} />

        {/* ── Category pills ── */}
        <div style={{
          display: "flex", gap: 4, padding: "10px 20px",
        }}>
          {CATEGORIES.map(cat => {
            const active = category === cat.key;
            const cc = catColors[cat.key] || catColors.all;
            return (
              <button key={cat.key} onClick={() => setCategory(cat.key)}
                className="flow-cmd-category-pill"
                style={{
                  padding: "4px 12px", borderRadius: 8, cursor: "pointer",
                  border: active ? `1px solid ${cc.color}40` : "1px solid transparent",
                  background: active ? cc.dim : "transparent",
                  fontFamily: body, fontSize: 11, fontWeight: active ? 700 : 500,
                  color: active ? cc.color : c.textDim,
                  transition: "all 0.15s ease",
                  letterSpacing: "0.01em",
                  position: "relative",
                }}>
                <span style={{
                  marginRight: 5, fontSize: 9,
                  opacity: active ? 1 : 0.5,
                  color: active ? cc.color : c.textDim,
                }}>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Divider ── */}
        <div style={{
          height: 1, margin: "0 20px",
          background: `linear-gradient(90deg, transparent, ${c.border}, transparent)`,
        }} />

        {/* ── Results ── */}
        <div ref={listRef} className="flow-cmd-results" style={{
          overflowY: "auto", maxHeight: 370, padding: "6px 0",
        }}>
          {sections.length === 0 && (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              fontFamily: body, fontSize: 13, color: c.textDim,
            }}>
              <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>⊘</div>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {sections.map((entry, si) => {
            if (entry.type === "header") {
              const sColor = secColors[entry.label] || c.accent;
              return (
                <div key={`hdr-${entry.label}`} className="flow-cmd-section-header" style={{
                  padding: "12px 20px 5px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {/* Colored accent dot */}
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: sColor,
                    boxShadow: `0 0 6px ${sColor}60`,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: mono, fontSize: 9, fontWeight: 700,
                    color: sColor, letterSpacing: "0.1em",
                    textTransform: "uppercase", opacity: 0.85,
                  }}>{entry.label}</span>
                  <div style={{
                    flex: 1, height: 1,
                    background: `linear-gradient(90deg, ${sColor}25, transparent)`,
                  }} />
                </div>
              );
            }

            const { cmd, idx } = entry;
            const isActive = idx === activeIdx;
            const iColor = cmd.iconColor || c.accent;

            return (
              <div
                key={cmd.id}
                data-active={isActive ? "true" : undefined}
                className={`flow-cmd-item${isActive ? " flow-cmd-active" : ""}`}
                onClick={cmd.action}
                onMouseEnter={() => setActiveIdx(idx)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "8px 20px", cursor: "pointer", margin: "0 6px",
                  borderRadius: isActive ? 10 : 8,
                  background: isActive
                    ? `linear-gradient(135deg, ${iColor}12, ${iColor}06)`
                    : "transparent",
                  borderLeft: isActive ? `2.5px solid ${iColor}` : "2.5px solid transparent",
                  transition: "all 0.1s ease",
                  position: "relative",
                }}
              >
                {/* Active glow effect */}
                {isActive && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 10,
                    boxShadow: `inset 0 0 20px ${iColor}08, 0 0 12px ${iColor}06`,
                    pointerEvents: "none",
                  }} />
                )}

                {/* Icon badge — always colored */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: isActive
                    ? `linear-gradient(135deg, ${iColor}25, ${iColor}10)`
                    : `${iColor}10`,
                  border: `1px solid ${isActive ? iColor + "50" : iColor + "20"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: mono, fontSize: 9, fontWeight: 700,
                  color: isActive ? iColor : `${iColor}CC`,
                  flexShrink: 0,
                  transition: "all 0.12s ease",
                  letterSpacing: "-0.02em",
                  boxShadow: isActive ? `0 0 10px ${iColor}20` : "none",
                }}>{cmd.icon}</div>

                {/* Label + hint */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: body, fontSize: 13, fontWeight: isActive ? 600 : 500,
                    color: isActive ? c.text : c.textMid,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.3,
                  }}>{cmd.label}</div>
                  <div style={{
                    fontFamily: mono, fontSize: 10,
                    color: isActive ? `${iColor}99` : c.textDim,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.3, marginTop: 1,
                  }}>{cmd.hint}</div>
                </div>

                {/* Keyboard shortcut badge */}
                {cmd.kbd && (
                  <span style={{
                    fontFamily: mono, fontSize: 9, fontWeight: 600,
                    color: isActive ? iColor : c.textDim,
                    background: isActive ? `${iColor}12` : c.surfaceAlt,
                    border: `1px solid ${isActive ? iColor + "30" : c.border}`,
                    padding: "2px 6px", borderRadius: 4,
                    flexShrink: 0, lineHeight: 1.4,
                    transition: "all 0.1s ease",
                  }}>{cmd.kbd}</span>
                )}

                {/* Enter indicator */}
                {isActive && (
                  <span style={{
                    fontFamily: mono, fontSize: 11, color: iColor,
                    flexShrink: 0, opacity: 0.8,
                  }}>↵</span>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};


export default CommandPalette;
