import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { c, typo, layout, space, motion } from "../styles/theme";
import { NAV } from "./AppShell";
import useDevLabel from "../hooks/useDevLabel";

// ═══════════════════════════════════════════════════════════════
// UNIVERSAL SEARCH — F / Cmd+K
// Search projects, people, navigation, settings, and actions
// ═══════════════════════════════════════════════════════════════

// ── Category color mapping ──
const CAT_COLORS = () => ({
  all:        { color: c.accent, dim: c.accentDim },
  projects:   { color: c.projectGold, dim: c.projectGoldDim },
  people:     { color: c.cyan,   dim: c.cyanDim    },
  navigation: { color: c.orange, dim: c.orangeDim  },
  settings:   { color: c.purple, dim: c.purpleDim  },
});

// ── Section color mapping ──
const SECTION_COLORS = () => ({
  Navigation: c.accent,
  Actions:    c.orange,
  Projects:   c.projectGold,
  People:     c.cyan,
  Settings:   c.purple,
});

const CATEGORIES = [
  { key: "all",        label: "All",        icon: "◎" },
  { key: "people",     label: "People",     icon: "●" },
  { key: "projects",   label: "Projects",   icon: "◆" },
  { key: "navigation", label: "Navigate",   icon: "→" },
  { key: "settings",   label: "Settings",   icon: "⚙" },
];

// Section ordering for "All" mode
const SECTION_ORDER = ["People", "Projects", "Navigation", "Actions", "Settings"];

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


const CommandPalette = ({ open, onClose, onTabSwitch, projects, people, onNavigate }) => {
  const devRef = useDevLabel("CommandPalette", "src/components/CommandPalette.jsx", "Universal search palette triggered by Cmd+K for projects, people, and navigation");
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
    NAV.filter(tab => !tab.separator).forEach(tab => {
      cmds.push({
        id: `nav-${tab.key}`,
        label: tab.label.replace("⚙️ ", ""),
        hint: "",
        section: "Navigation",
        cat: "navigation",
        icon: tab.num != null ? String(tab.num) : tab.key === "settings" ? "⚙" : tab.key === "logs" ? "◉" : tab.key === "rant" ? "🔥" : "·",
        iconColor: c.accent,
        kbd: tab.num != null ? String(tab.num) : "",
        action: () => { onTabSwitch(tab.key); onClose(); },
      });
    });

    // ── Projects (ALL) ──
    if (projects) {
      projects.forEach(p => {
        cmds.push({
          id: `proj-${p.id}`,
          label: `${p.id} — ${p.name}`,
          hint: `${p.squad || "No squad"} · ${p.owner || "No owner"} · ${p.phase || ""}`,
          section: "Projects",
          cat: "projects",
          icon: p.id.slice(0, 3),
          iconColor: c.projectGold,
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
          hint: `${p.role || "No role"} · ${p.squad || "No squad"}`,
          section: "People",
          cat: "people",
          icon: p.name.split(" ").filter(Boolean).map(w => w?.[0] || "").join(""),
          iconColor: c.cyan,
          action: () => { if (onNavigate) onNavigate("commit", p.name); onClose(); },
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
  }, [projects, people, onTabSwitch, onNavigate, onClose]);

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
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
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
    <div ref={devRef} className="flow-cmd-overlay" onClick={onClose}>
      <div className="flow-cmd-box" role="dialog" aria-modal="true" aria-label="Command palette" onClick={e => e.stopPropagation()} style={{ width: 600, maxHeight: 540 }}>

        {/* ── Gradient top accent bar ── */}
        <div className="flow-cmd-topbar" />

        {/* ── Search input ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: space[3],
          padding: `${space[4]}px ${space[5]}px ${space[4] - 2}px`,
        }}>
          {/* Animated search indicator */}
          <div className="flow-cmd-search-glow" style={{
            width: 20, height: 20, borderRadius: "50%",
            background: `radial-gradient(circle, ${activeCatColor}30 0%, transparent 70%)`,
            border: `1.5px solid ${activeCatColor}60`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: typo.monoMd.size, color: activeCatColor, lineHeight: 1 }}>
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
              fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size, fontWeight: typo.bodyMd.weight,
              color: c.text, outline: "none", lineHeight: 1.4,
            }}
          />
          <span style={{
            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
            fontWeight: 700, letterSpacing: typo.monoSm.tracking,
            color: c.textDim, background: c.surfaceAlt,
            border: `1px solid ${c.border}`, padding: "2px 7px",
            borderRadius: layout.radiusTag + 1,
            flexShrink: 0,
          }}>ESC</span>
        </div>

        {/* ── Gradient divider ── */}
        <div style={{
          height: 1, margin: `0 ${space[5]}px`,
          background: `linear-gradient(90deg, transparent, ${activeCatColor}40, ${c.border}, ${c.purple}30, transparent)`,
        }} />

        {/* ── Category pills ── */}
        <div style={{
          display: "flex", gap: space[1], padding: `${space[3] - 2}px ${space[5]}px`,
        }}>
          {CATEGORIES.map(cat => {
            const active = category === cat.key;
            const cc = catColors[cat.key] || catColors.all;
            return (
              <button key={cat.key} onClick={() => setCategory(cat.key)}
                className="flow-cmd-category-pill"
                style={{
                  padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusMd,
                  cursor: "pointer",
                  border: active ? `1px solid ${cc.color}40` : "1px solid transparent",
                  background: active ? cc.dim : "transparent",
                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                  fontWeight: active ? 700 : 500,
                  color: active ? cc.color : c.textMid,
                  transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                  letterSpacing: typo.bodyXs.tracking,
                  position: "relative",
                }}>
                <span style={{
                  marginRight: 5, fontSize: typo.monoSm.size,
                  opacity: active ? 1 : 0.6,
                  color: active ? cc.color : c.textMid,
                }}>{cat.icon}</span>
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* ── Divider ── */}
        <div style={{
          height: 1, margin: `0 ${space[5]}px`,
          background: `linear-gradient(90deg, transparent, ${c.border}, transparent)`,
        }} />

        {/* ── Results ── */}
        <div ref={listRef} className="flow-cmd-results" style={{
          overflowY: "auto", maxHeight: 370, padding: `${space[2] - 2}px 0`,
        }}>
          {sections.length === 0 && (
            <div style={{
              padding: `${space[8]}px ${space[5]}px`, textAlign: "center",
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim,
            }}>
              <div style={{ fontSize: 24, marginBottom: space[2], opacity: 0.3 }}>⊘</div>
              {query.trim() ? <>No results for &ldquo;{query}&rdquo;</> : "No items in this category"}
            </div>
          )}
          {sections.map((entry, si) => {
            if (entry.type === "header") {
              const sColor = secColors[entry.label] || c.accent;
              return (
                <div key={`hdr-${entry.label}`} className="flow-cmd-section-header" style={{
                  padding: `${space[3]}px ${space[5]}px 5px`,
                  display: "flex", alignItems: "center", gap: space[2],
                }}>
                  {/* Colored accent dot */}
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: sColor,
                    boxShadow: `0 0 6px ${sColor}60`,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                    fontWeight: 700, letterSpacing: "0.1em",
                    color: sColor, textTransform: "uppercase", opacity: 0.85,
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
                  display: "flex", alignItems: "center", gap: space[3],
                  padding: `${space[2]}px ${space[5]}px`, cursor: "pointer",
                  margin: `0 ${space[2] - 2}px`,
                  borderRadius: isActive ? layout.radiusMd + 2 : layout.radiusMd,
                  background: isActive
                    ? `linear-gradient(135deg, ${iColor}12, ${iColor}06)`
                    : "transparent",
                  borderLeft: isActive ? `2.5px solid ${iColor}` : "2.5px solid transparent",
                  transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                  position: "relative",
                }}
              >
                {/* Active glow effect */}
                {isActive && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: layout.radiusMd + 2,
                    boxShadow: `inset 0 0 20px ${iColor}08, 0 0 12px ${iColor}06`,
                    pointerEvents: "none",
                  }} />
                )}

                {/* Icon badge — always colored */}
                <div style={{
                  width: 30, height: 30, borderRadius: layout.radiusMd,
                  background: isActive
                    ? `linear-gradient(135deg, ${iColor}25, ${iColor}10)`
                    : `${iColor}10`,
                  border: `1px solid ${isActive ? iColor + "50" : iColor + "20"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                  fontWeight: 700,
                  color: isActive ? iColor : `${iColor}CC`,
                  flexShrink: 0,
                  transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                  letterSpacing: "-0.02em",
                  boxShadow: isActive ? `0 0 10px ${iColor}20` : "none",
                }}>{cmd.icon}</div>

                {/* Label + hint */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                    fontWeight: isActive ? 600 : typo.bodyMd.weight,
                    color: isActive ? c.text : c.textMid,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.3,
                  }}>{cmd.label}</div>
                  <div style={{
                    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                    letterSpacing: typo.monoMd.tracking,
                    color: isActive ? `${iColor}99` : c.textDim,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    lineHeight: 1.3, marginTop: 1,
                  }}>{cmd.hint}</div>
                </div>

                {/* Keyboard shortcut badge */}
                {cmd.kbd && (
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                    fontWeight: typo.monoSm.weight,
                    color: isActive ? iColor : c.textDim,
                    background: isActive ? `${iColor}12` : c.surfaceAlt,
                    border: `1px solid ${isActive ? iColor + "30" : c.border}`,
                    padding: `2px ${space[2] - 2}px`, borderRadius: layout.radiusTag + 1,
                    flexShrink: 0, lineHeight: 1.4,
                    boxShadow: `0 1px 0 ${c.border}`,
                    transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                  }}>{cmd.kbd}</span>
                )}

                {/* Enter indicator */}
                {isActive && (
                  <span style={{
                    fontFamily: typo.monoMd.font, fontSize: typo.bodyXs.size,
                    color: iColor, flexShrink: 0, opacity: 0.8,
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
