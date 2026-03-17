// Flow — App Shell (two-layer header)
// Layer 1: Logo · Primary Nav · Utility (search, theme)
// Layer 2: Week controls · Filters · Contextual state
import React from "react";
import { c, typo, layout, space, motion } from "../styles/theme";
import { FilterChip, Btn } from "./shared";
import FlowLogo from "./FlowLogo";

/* ════════════════════════════════════════════════════════════════════
   NAV
   ════════════════════════════════════════════════════════════════════ */
export const NAV = [
  { key: "summary",  label: "Summary",  num: 1 },
  { key: "pulse",    label: "Pulse",    num: 2 },
  { key: "focus",    label: "Focus",    num: 3 },
  { key: "projects", label: "Projects", num: 4 },
  { key: "people",   label: "People",   num: 5 },
  { key: "settings", label: "Settings", num: 6 },
];

/* ════════════════════════════════════════════════════════════════════
   CYCLE STAGE
   declare → lock → pulse → close
   ════════════════════════════════════════════════════════════════════ */
const STAGES = {
  declare: { label: "Declare", verb: "Open Focus", targetTab: "focus",  color: () => c.purple },
  lock:    { label: "Lock",    verb: "Run Pulse",  targetTab: "pulse",  color: () => c.orange },
  pulse:   { label: "Pulse",   verb: "Close Week", targetTab: "pulse",  color: () => c.green  },
  close:   { label: "Close",   verb: "Outcomes",   targetTab: "pulse",  color: () => c.blue   },
};

export function getCycleStage(commitments) {
  const total = commitments.length;
  if (total === 0) return "declare";
  const locked = commitments.filter(x => x.lockedAt).length;
  const withOutcomes = commitments.filter(x => x.items?.some(i => i.outcome)).length;
  if (withOutcomes > 0) return "close";
  if (locked >= Math.ceil(total * 0.8)) return "pulse";
  if (locked > 0) return "lock";
  return "declare";
}

export function getStageConfig(stage) { return STAGES[stage]; }

/* ════════════════════════════════════════════════════════════════════
   ATTENTION ITEMS — derived from data, rendered inline
   ════════════════════════════════════════════════════════════════════ */
export function getAttentionItems(commitments, projects) {
  const items = [];
  const total = commitments.length;
  if (total === 0) return items;
  const unlocked = commitments.filter(x => !x.lockedAt).length;
  const blocked = commitments.reduce((n, x) => n + x.items.filter(i => i.type === "BLOCKED").length, 0);
  const soon = 14 * 86400000;
  const atRisk = projects.filter(p =>
    !p.ship && p.endDate &&
    (new Date(p.endDate).getTime() - Date.now()) < soon &&
    (new Date(p.endDate).getTime() - Date.now()) > 0
  ).length;
  if (unlocked > 0 && unlocked < total) items.push({ text: `${unlocked} unlocked`, color: c.orange });
  else if (unlocked === total) items.push({ text: `All ${total} unlocked`, color: c.orange });
  if (blocked > 0) items.push({ text: `${blocked} blocked`, color: c.red });
  if (atRisk > 0) items.push({ text: `${atRisk} ending soon`, color: c.orange });
  return items;
}


/* ════════════════════════════════════════════════════════════════════
   HEADER — two-layer shell
   Layer 1 (48px): [Logo] | [Nav tabs] ····· [🔍] [◐]
   Layer 2 (36px): [Week ◂ date ▸] | [Filters ▾▾▾ Apply Clear] ····· [chips]
   Detail mode:    Layer 1 shows breadcrumb, Layer 2 hidden
   ════════════════════════════════════════════════════════════════════ */
export function Header({
  weekLabel, weekOffset, onWeekPrev, onWeekNext, onLogoClick,
  detailLabel, onBack, breadcrumbLabel,
  activeTab, onTabSwitch,
  darkMode, onToggleTheme, onCmdOpen,
  // ── Global filter props ──
  globalFilters, pendingFilters, setPendingFilters,
  applyFilters, clearGlobalFilters, globalFilterCount,
  allOwners, allSquads, allPeople,
}) {

  const showContextBar = !detailLabel;
  const hasPendingChanges = pendingFilters && globalFilters && (
    pendingFilters.owner !== globalFilters.owner ||
    pendingFilters.squad !== globalFilters.squad ||
    pendingFilters.person !== globalFilters.person
  );

  return (
    <>
    {/* ═══ LAYER 1 — Primary navigation bar ═══ */}
    <header className="flow-header" style={{
      height: 52, display: "flex", alignItems: "center",
      padding: `0 ${space[5]}px`,
      background: c.surfaceSolid,
      borderBottom: `1px solid ${c.border}`,
      position: "sticky", top: 0, zIndex: 50,
    }}>

      {/* ── Accent edge — top of shell ── */}
      <div className="flow-header-accent-edge" style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${c.accent}00 0%, ${c.accent}35 20%, ${c.cyan}25 50%, ${c.purple}20 80%, ${c.accent}00 100%)`,
        pointerEvents: "none",
      }} />

      {/* ── Logo ── */}
      <div onClick={onLogoClick} className="flow-logo-group" style={{
        display: "flex", alignItems: "center", gap: space[2] + 2,
        cursor: "pointer", marginRight: space[5], flexShrink: 0,
      }}>
        <div className="flow-logo-mark" style={{
          flexShrink: 0, position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FlowLogo size={30} />
        </div>
        <span style={{
          fontFamily: typo.displaySm.font, fontSize: 16,
          fontWeight: 800, color: c.text, letterSpacing: "-0.05em",
          textShadow: `0 0 20px ${c.accent}15`,
        }}>Flow</span>
      </div>

      {/* ── Vertical separator ── */}
      <div style={{ width: 1, height: 28, background: `linear-gradient(180deg, ${c.border}00, ${c.border}, ${c.border}00)`, marginRight: space[3], flexShrink: 0 }} />

      {/* ── Nav tabs (or breadcrumb in detail mode) ── */}
      {detailLabel ? (
        <DetailBreadcrumb
          breadcrumbLabel={breadcrumbLabel}
          detailLabel={detailLabel}
          onBack={onBack}
        />
      ) : (
        <nav className="flow-nav-rail" style={{ display: "flex", alignItems: "stretch", gap: 2, flexShrink: 0, height: "100%" }}>
          {NAV.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => onTabSwitch(tab.key)} className="flow-header-tab" style={{
                padding: `0 ${space[3] + 2}px`, borderRadius: 0,
                border: "none", cursor: "pointer",
                background: active ? `linear-gradient(180deg, ${c.accent}08 0%, ${c.accent}14 100%)` : "transparent",
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                fontWeight: active ? 700 : 500,
                color: active ? c.text : c.textMid,
                display: "flex", alignItems: "center", gap: 6,
                position: "relative",
                transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                borderLeft: active ? `1px solid ${c.accent}15` : "1px solid transparent",
                borderRight: active ? `1px solid ${c.accent}15` : "1px solid transparent",
              }}>
                {tab.label}
                {/* Numeric shortcut hint — subtle hotkey */}
                <span style={{
                  fontFamily: typo.monoSm.font, fontSize: 9,
                  fontWeight: 500, letterSpacing: typo.monoSm.tracking,
                  color: c.textDim,
                  opacity: active ? 0.5 : 0.3,
                  lineHeight: 1, flexShrink: 0,
                  transition: `opacity ${motion.interaction.duration}`,
                }}>{tab.num}</span>
                {/* Active indicator — bottom bar with glow */}
                {active && (
                  <div style={{
                    position: "absolute", bottom: -1, left: "15%",
                    width: "70%", height: 2, borderRadius: 1,
                    background: c.accent,
                    boxShadow: `0 0 8px ${c.accent}60, 0 1px 3px ${c.accent}40`,
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1, minWidth: space[2] }} />

      {/* ── Utility cluster: search · theme ── */}
      <div style={{ display: "flex", alignItems: "center", gap: space[2], flexShrink: 0 }}>
        <CompactSearch onClick={onCmdOpen} />
        <button onClick={onToggleTheme} title="Toggle theme (D)" className="flow-theme-toggle" style={{
          width: 30, height: 15, borderRadius: layout.radiusMd, border: `1px solid ${c.border}`,
          cursor: "pointer",
          background: darkMode
            ? `linear-gradient(90deg, ${c.accent}30, ${c.accent}15)`
            : c.surfaceAlt,
          position: "relative", flexShrink: 0,
          transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
        }}>
          <div style={{
            width: 11, height: 11, borderRadius: "50%",
            background: darkMode ? c.accent : c.textMid,
            position: "absolute", top: 1,
            left: darkMode ? 17 : 2,
            transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
            boxShadow: darkMode ? `0 0 5px ${c.accent}50` : "none",
          }} />
        </button>
      </div>
    </header>

    {/* ═══ LAYER 2 — Context bar (week + filters) ═══ */}
    {showContextBar && (
      <div className="flow-context-bar" style={{
        height: 38, display: "flex", alignItems: "center",
        padding: `0 ${space[5]}px`, gap: space[2],
        background: `linear-gradient(180deg, ${c.surfaceSolid}F0 0%, ${c.bg}E8 100%)`,
        borderBottom: `1px solid ${c.border}`,
        position: "sticky", top: 52, zIndex: 49,
        boxShadow: `0 1px 4px ${c.bg}80`,
      }}>

        {/* ── Week navigator (tactical) ── */}
        <div className="flow-week-nav" style={{
          display: "flex", alignItems: "center",
          borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
          background: `linear-gradient(180deg, ${c.surfaceAlt} 0%, ${c.surfaceAlt}B0 100%)`,
          overflow: "hidden", flexShrink: 0,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}>
          <button onClick={onWeekPrev} className="flow-btn" style={{
            padding: `2px ${space[1] + 2}px`, border: "none", background: "transparent",
            cursor: "pointer", display: "flex", alignItems: "center",
            color: c.textMid, transition: `color ${motion.interaction.duration}`,
          }} title="Previous week">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{
            padding: `2px ${space[2]}px`,
            borderLeft: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
              fontWeight: typo.monoSm.weight,
              color: c.textDim, letterSpacing: typo.monoSm.tracking,
            }}>WK</span>
            <span style={{
              fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, fontWeight: 600,
              color: weekOffset === 0 ? c.textMid : c.accent,
              whiteSpace: "nowrap",
            }}>{weekLabel}</span>
            {weekOffset !== 0 && (
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 700,
                color: c.accent, padding: "1px 3px", borderRadius: layout.radiusTag,
                background: `${c.accent}12`, border: `1px solid ${c.accent}25`,
                letterSpacing: typo.monoSm.tracking, lineHeight: 1,
              }}>PAST</span>
            )}
          </div>
          <button onClick={weekOffset < 0 ? onWeekNext : undefined} className="flow-btn" style={{
            padding: `2px ${space[1] + 2}px`, border: "none", background: "transparent",
            cursor: weekOffset < 0 ? "pointer" : "default",
            display: "flex", alignItems: "center",
            color: weekOffset < 0 ? c.textMid : c.textDim,
            opacity: weekOffset < 0 ? 1 : 0.3,
            transition: `color ${motion.interaction.duration}`,
          }} title="Next week">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ── Separator between week and filters ── */}
        <div style={{ width: 1, height: 18, background: c.border, flexShrink: 0 }} />

        {/* ── Filter cluster ── */}
        <span style={{
          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
          fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking,
          color: globalFilterCount > 0 ? c.accent : c.textDim,
          display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
        }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M1 3h14M4 8h8M6 13h4" stroke={globalFilterCount > 0 ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>

        <FilterSelect
          label="Owner"
          value={pendingFilters?.owner || ""}
          onChange={v => setPendingFilters(f => ({ ...f, owner: v }))}
          options={allOwners || []}
        />
        <FilterSelect
          label="Squad"
          value={pendingFilters?.squad || ""}
          onChange={v => setPendingFilters(f => ({ ...f, squad: v }))}
          options={allSquads || []}
        />
        <FilterSelect
          label="Person"
          value={pendingFilters?.person || ""}
          onChange={v => setPendingFilters(f => ({ ...f, person: v }))}
          options={allPeople || []}
        />

        <Btn
          variant={hasPendingChanges ? "primary" : "secondary"}
          size="sm"
          onClick={applyFilters}
          disabled={!hasPendingChanges}
          style={{ flexShrink: 0, padding: `2px ${space[2]}px`, fontSize: typo.bodyXs.size }}
        >Apply</Btn>

        {globalFilterCount > 0 && (
          <Btn
            variant="ghost"
            size="sm"
            onClick={clearGlobalFilters}
            style={{ flexShrink: 0, padding: `2px ${space[2]}px`, fontSize: typo.bodyXs.size, display: "flex", alignItems: "center", gap: 3 }}
          >
            Clear
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 700,
              color: c.accent, background: c.accentDim,
              padding: "0px 4px", borderRadius: layout.radiusTag + 1, lineHeight: 1.4,
            }}>{globalFilterCount}</span>
          </Btn>
        )}

        <div style={{ flex: 1 }} />

        {/* Active filter chips (right-aligned) */}
        {globalFilterCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: space[1] + 2, flexShrink: 0 }}>
            {globalFilters.owner && <FilterChip label={`Owner: ${globalFilters.owner}`} />}
            {globalFilters.squad && <FilterChip label={`Squad: ${globalFilters.squad}`} />}
            {globalFilters.person && <FilterChip label={`Person: ${globalFilters.person}`} />}
          </div>
        )}
      </div>
    )}
    </>
  );
}


/* ════════════════════════════════════════════════════════════════════
   DETAIL BREADCRUMB — structured breadcrumb for detail pages
   Shows parent section and detail title with clear hierarchy
   ════════════════════════════════════════════════════════════════════ */
function DetailBreadcrumb({ breadcrumbLabel, detailLabel, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space[2], minWidth: 0, flex: 1 }}>
      {/* Back link — parent section */}
      <span onClick={onBack} className="flow-breadcrumb" style={{
        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
        fontWeight: 500, color: c.textMid, cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 5,
        transition: `all ${motion.interaction.duration}`,
        padding: `3px ${space[2]}px 3px ${space[2] - 2}px`,
        borderRadius: layout.radiusSm,
        border: `1px solid transparent`,
      }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.6 }}>
          <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {breadcrumbLabel}
      </span>

      {/* Separator — chevron */}
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
        <path d="M6 4l4 4-4 4" stroke={c.textDim} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Detail title — sub-system entry */}
      <div style={{
        display: "flex", alignItems: "center", gap: space[2],
        padding: `3px ${space[3]}px`,
        borderRadius: layout.radiusSm,
        background: `linear-gradient(135deg, ${c.accent}08, ${c.cyan}06)`,
        border: `1px solid ${c.accent}18`,
        minWidth: 0,
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: c.accent,
          boxShadow: `0 0 6px ${c.accent}50`,
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: typo.displaySm.font, fontSize: 14,
          fontWeight: 700, color: c.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          minWidth: 0,
        }}>{detailLabel}</span>
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════════
   FILTER DROPDOWN — custom styled dropdown for context bar
   ════════════════════════════════════════════════════════════════════ */
function FilterSelect({ label, value, onChange, options }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        style={{
          padding: `2px ${space[2]}px 2px ${space[2] - 2}px`,
          borderRadius: layout.radiusSm, height: 24,
          border: `1px solid ${value ? c.accent + "40" : c.border}`,
          background: value ? c.accentDim : c.surfaceAlt,
          color: value ? c.accent : c.textMid,
          fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
          fontWeight: value ? 600 : 500,
          cursor: "pointer", minWidth: 80, maxWidth: 150,
          display: "flex", alignItems: "center", gap: space[1],
          transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
          boxSizing: "border-box",
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || label}
        </span>
        <svg width="7" height="4" viewBox="0 0 8 5" fill="none" style={{
          flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none",
          transition: `transform ${motion.interaction.duration}`,
        }}>
          <path d="M1 1l3 3 3-3" stroke={value ? c.accent : c.textDim} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          minWidth: 200, maxHeight: 320, borderRadius: layout.radiusMd,
          background: c.surfaceOverlay, border: `1px solid ${c.border}`,
          boxShadow: c.shadowOverlay,
          zIndex: 100, overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "fadeScaleIn 0.12s ease-out",
        }}>
          {/* Search input (only if many options) */}
          {options.length > 5 && (
            <div style={{ padding: `${space[2] - 2}px ${space[2]}px`, borderBottom: `1px solid ${c.border}` }}>
              <input
                autoFocus
                placeholder={`Search ${label.toLowerCase()}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && filtered.length === 1) { onChange(filtered[0]); setOpen(false); setSearch(""); }
                }}
                style={{
                  width: "100%", padding: `5px ${space[2]}px`,
                  border: `1px solid ${c.border}`, borderRadius: layout.radiusTag + 1,
                  background: c.surfaceAlt, color: c.text,
                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Option list */}
          <div style={{ overflowY: "auto", maxHeight: 260, padding: "3px 0" }}>
            {/* Clear / All option */}
            <div
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
              className="flow-dropdown-item"
              style={{
                padding: `7px ${space[3]}px`, cursor: "pointer",
                fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                color: !value ? c.accent : c.textDim,
                fontWeight: !value ? 600 : 400,
                background: !value ? `${c.accent}08` : "transparent",
                borderBottom: `1px solid ${c.border}`,
              }}
            >All {label}s</div>

            {filtered.map(opt => (
              <div
                key={opt}
                onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                className="flow-dropdown-item"
                style={{
                  padding: `7px ${space[3]}px`, cursor: "pointer",
                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                  color: opt === value ? c.accent : c.text,
                  fontWeight: opt === value ? 600 : 400,
                  background: opt === value ? `${c.accent}08` : "transparent",
                  display: "flex", alignItems: "center", gap: space[2] - 2,
                }}
              >
                {opt === value && <span style={{ fontSize: 11, color: c.accent }}>●</span>}
                {opt}
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{
                padding: `${space[3]}px`, fontFamily: typo.bodyXs.font,
                fontSize: typo.bodyXs.size, color: c.textDim, textAlign: "center",
              }}>
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   COMPACT SEARCH — click trigger for command palette
   ════════════════════════════════════════════════════════════════════ */
function CompactSearch({ onClick }) {
  return (
    <div className="flow-hide-mobile flow-search-trigger" onClick={onClick} style={{
      position: "relative", width: 140, cursor: "pointer",
      display: "flex", alignItems: "center",
      padding: `4px ${space[2] + 2}px`, gap: 7,
      borderRadius: layout.radiusMd, border: `1px solid ${c.border}`,
      background: `linear-gradient(135deg, ${c.surfaceAlt} 0%, ${c.surfaceAlt}C0 100%)`,
      transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.02)`,
    }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
        <circle cx="7" cy="7" r="5" stroke={c.textDim} strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{
        fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
        color: c.textDim,
        flex: 1, whiteSpace: "nowrap", overflow: "hidden",
        userSelect: "none",
      }}>Search</span>
      <span style={{
        fontFamily: typo.monoSm.font, fontSize: 9,
        fontWeight: 600,
        color: c.textDim, background: c.surface,
        border: `1px solid ${c.border}`, padding: "1px 5px",
        borderRadius: layout.radiusTag + 1,
        lineHeight: 1.4, flexShrink: 0,
        boxShadow: `0 1px 0 ${c.border}`,
      }}>F</span>
    </div>
  );
}
