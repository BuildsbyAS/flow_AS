// Flow — App Shell (simplified)
// Single header: Logo · Nav · Cycle · CTA · Search · Theme
import React from "react";
import { c, display, body, mono } from "../styles/theme";

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
   HEADER — redesigned sharp futuristic bar
   52px. Logo stands out. Tabs are clear. Date is styled.
   [Logo] [Nav tabs] ····· [attention] | [date badge · CTA] [🔍] [◐]
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

  const showFilterBar = !detailLabel;
  const hasPendingChanges = pendingFilters && globalFilters && (
    pendingFilters.owner !== globalFilters.owner ||
    pendingFilters.squad !== globalFilters.squad ||
    pendingFilters.person !== globalFilters.person
  );

  return (
    <>
    <header className="flow-header" style={{
      height: 52, display: "flex", alignItems: "center",
      padding: "0 20px", gap: 0,
      background: `linear-gradient(180deg, ${c.surfaceSolid} 0%, ${c.bg} 100%)`,
      borderBottom: showFilterBar ? "none" : `1px solid ${c.border}`,
      position: "sticky", top: 0, zIndex: 50,
      overflow: "hidden",
    }}>

      {/* ── Logo ── */}
      <div onClick={onLogoClick} className="flow-logo-group" style={{
        display: "flex", alignItems: "center", gap: 8,
        cursor: "pointer", marginRight: 20, flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${c.accent}18, ${c.cyan}12)`,
          border: `1px solid ${c.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <path d="M6 16 C6 10,12 6,16 12 C20 18,26 10,26 16 C26 22,20 26,16 20 C12 14,6 22,6 16Z"
              stroke={c.accent} strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <span style={{
          fontFamily: display, fontSize: 16, fontWeight: 800,
          color: c.text, letterSpacing: "-0.04em",
        }}>Flow</span>
      </div>

      {/* ── Vertical separator ── */}
      <div style={{ width: 1, height: 24, background: c.border, marginRight: 16, flexShrink: 0 }} />

      {/* ── Nav tabs (or breadcrumb when in detail) ── */}
      {detailLabel ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span onClick={onBack} className="flow-breadcrumb" style={{
            fontFamily: body, fontSize: 13, color: c.textMid, cursor: "pointer", flexShrink: 0,
          }}>← {breadcrumbLabel}</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>/</span>
          <span style={{
            fontFamily: display, fontSize: 13, fontWeight: 700, color: c.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{detailLabel}</span>
        </div>
      ) : (
        <nav style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {NAV.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => onTabSwitch(tab.key)} className="flow-header-tab" style={{
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? c.accentDim : "transparent",
                fontFamily: body, fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? c.accent : c.textMid,
                display: "flex", alignItems: "center", gap: 5,
                position: "relative",
                transition: "all 0.15s ease",
              }}>
                <span style={{
                  fontFamily: mono, fontSize: 9, fontWeight: 700,
                  color: active ? c.accent : c.textDim,
                  width: 14, height: 14, borderRadius: 4,
                  background: active ? `${c.accent}15` : c.surfaceAlt,
                  border: `1px solid ${active ? c.accent + "30" : c.border}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1, flexShrink: 0,
                  transition: "all 0.15s ease",
                }}>{tab.num}</span>
                {tab.label}
                {/* Active indicator bar */}
                {active && (
                  <div style={{
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                    width: "60%", height: 2, borderRadius: 1,
                    background: c.accent,
                    boxShadow: `0 1px 4px ${c.accent}40`,
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* ── Spacer ── */}
      <div style={{ flex: 1, minWidth: 8 }} />

      {/* ── Right cluster: date · CTA | search · theme ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>

        {/* Week navigator — prev / label / next */}
        {!detailLabel && (
          <div className="flow-week-nav" style={{
            display: "flex", alignItems: "center", gap: 2,
            borderRadius: 8, border: `1px solid ${c.border}`,
            background: c.surfaceAlt, overflow: "hidden",
          }}>
            <button onClick={onWeekPrev} className="flow-btn" style={{
              padding: "4px 8px", border: "none", background: "transparent",
              cursor: "pointer", display: "flex", alignItems: "center",
              color: c.textMid, transition: "color 0.15s",
            }} title="Previous week">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div style={{
              padding: "3px 8px",
              borderLeft: `1px solid ${c.border}`, borderRight: `1px solid ${c.border}`,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{
                fontFamily: mono, fontSize: 10, fontWeight: 600,
                color: c.textDim, letterSpacing: "0.04em",
              }}>WK</span>
              <span style={{
                fontFamily: mono, fontSize: 11, fontWeight: 700,
                color: weekOffset === 0 ? c.text : c.accent,
                letterSpacing: "0.02em", whiteSpace: "nowrap",
              }}>{weekLabel}</span>
              {weekOffset !== 0 && (
                <span style={{
                  fontFamily: mono, fontSize: 8, fontWeight: 700,
                  color: c.accent, padding: "1px 4px", borderRadius: 3,
                  background: `${c.accent}12`, border: `1px solid ${c.accent}25`,
                  letterSpacing: "0.04em",
                }}>PAST</span>
              )}
            </div>
            <button onClick={weekOffset < 0 ? onWeekNext : undefined} className="flow-btn" style={{
              padding: "4px 8px", border: "none", background: "transparent",
              cursor: weekOffset < 0 ? "pointer" : "default",
              display: "flex", alignItems: "center",
              color: weekOffset < 0 ? c.textMid : c.textDim,
              opacity: weekOffset < 0 ? 1 : 0.3,
              transition: "color 0.15s",
            }} title="Next week">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: c.border, flexShrink: 0 }} />

        {/* Search trigger */}
        <CompactSearch onClick={onCmdOpen} />

        {/* Theme toggle */}
        <button onClick={onToggleTheme} title="Toggle theme (D)" className="flow-theme-toggle" style={{
          width: 32, height: 16, borderRadius: 8, border: `1px solid ${c.border}`, cursor: "pointer",
          background: darkMode
            ? `linear-gradient(90deg, ${c.accent}30, ${c.accent}15)`
            : c.surfaceAlt,
          position: "relative", flexShrink: 0,
          transition: "all 0.2s ease",
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%",
            background: darkMode ? c.accent : c.textMid,
            position: "absolute", top: 1,
            left: darkMode ? 18 : 2,
            transition: "all 0.2s ease",
            boxShadow: darkMode ? `0 0 6px ${c.accent}50` : "none",
          }} />
        </button>
      </div>
    </header>

    {/* ═══ GLOBAL FILTER BAR — sticky below header ═══ */}
    {showFilterBar && (
      <div className="flow-filter-bar" style={{
        height: 40, display: "flex", alignItems: "center",
        padding: "0 20px", gap: 8,
        background: c.surfaceSolid,
        borderBottom: `1px solid ${c.border}`,
        position: "sticky", top: 52, zIndex: 49,
      }}>
        {/* Filter icon */}
        <span style={{
          fontFamily: mono, fontSize: 10, fontWeight: 700,
          color: globalFilterCount > 0 ? c.accent : c.textDim,
          letterSpacing: "0.06em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M1 3h14M4 8h8M6 13h4" stroke={globalFilterCount > 0 ? c.accent : c.textDim} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Filters
        </span>

        <div style={{ width: 1, height: 18, background: c.border, flexShrink: 0 }} />

        {/* Owner dropdown */}
        <FilterSelect
          label="Owner"
          value={pendingFilters?.owner || ""}
          onChange={v => setPendingFilters(f => ({ ...f, owner: v }))}
          options={allOwners || []}
        />

        {/* Squad dropdown */}
        <FilterSelect
          label="Squad"
          value={pendingFilters?.squad || ""}
          onChange={v => setPendingFilters(f => ({ ...f, squad: v }))}
          options={allSquads || []}
        />

        {/* Person dropdown */}
        <FilterSelect
          label="Person"
          value={pendingFilters?.person || ""}
          onChange={v => setPendingFilters(f => ({ ...f, person: v }))}
          options={allPeople || []}
        />

        {/* Apply button */}
        <button
          onClick={applyFilters}
          disabled={!hasPendingChanges}
          className="flow-btn"
          style={{
            padding: "4px 14px", borderRadius: 6, border: "none",
            background: hasPendingChanges ? c.accent : c.surfaceAlt,
            color: hasPendingChanges ? "#fff" : c.textDim,
            fontFamily: body, fontSize: 11, fontWeight: 700,
            cursor: hasPendingChanges ? "pointer" : "default",
            opacity: hasPendingChanges ? 1 : 0.5,
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
        >Apply</button>

        {/* Clear button — only visible when filters are active */}
        {globalFilterCount > 0 && (
          <button
            onClick={clearGlobalFilters}
            className="flow-btn"
            style={{
              padding: "4px 10px", borderRadius: 6, border: `1px solid ${c.border}`,
              background: "transparent", cursor: "pointer",
              fontFamily: body, fontSize: 11, fontWeight: 600,
              color: c.textMid, display: "flex", alignItems: "center", gap: 4,
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            Clear
            <span style={{
              fontFamily: mono, fontSize: 9, fontWeight: 700,
              color: c.accent, background: c.accentDim,
              padding: "1px 5px", borderRadius: 4,
            }}>{globalFilterCount}</span>
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Active filter summary (right side) */}
        {globalFilterCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
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
   FILTER DROPDOWN — custom styled dropdown for filter bar
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
          padding: "4px 10px 4px 8px", borderRadius: 6, height: 28,
          border: `1px solid ${value ? c.accent + "40" : c.border}`,
          background: value ? c.accentDim : c.surfaceAlt,
          color: value ? c.accent : c.textMid,
          fontFamily: body, fontSize: 11, fontWeight: value ? 600 : 500,
          cursor: "pointer", minWidth: 90, maxWidth: 160,
          display: "flex", alignItems: "center", gap: 4,
          transition: "all 0.15s ease", boxSizing: "border-box",
        }}
      >
        <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || label}
        </span>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M1 1l3 3 3-3" stroke={value ? c.accent : c.textDim} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          minWidth: 200, maxHeight: 320, borderRadius: 8,
          background: c.surfaceSolid, border: `1px solid ${c.border}`,
          boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          zIndex: 100, overflow: "hidden",
          display: "flex", flexDirection: "column",
          animation: "fadeScaleIn 0.12s ease-out",
        }}>
          {/* Search input (only if many options) */}
          {options.length > 5 && (
            <div style={{ padding: "6px 8px", borderBottom: `1px solid ${c.border}` }}>
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
                  width: "100%", padding: "5px 8px", border: `1px solid ${c.border}`,
                  borderRadius: 4, background: c.surfaceAlt, color: c.text,
                  fontFamily: body, fontSize: 11, outline: "none", boxSizing: "border-box",
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
                padding: "7px 12px", cursor: "pointer",
                fontFamily: body, fontSize: 11, color: !value ? c.accent : c.textDim,
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
                  padding: "7px 12px", cursor: "pointer",
                  fontFamily: body, fontSize: 11.5,
                  color: opt === value ? c.accent : c.text,
                  fontWeight: opt === value ? 600 : 400,
                  background: opt === value ? `${c.accent}08` : "transparent",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {opt === value && <span style={{ fontSize: 9, color: c.accent }}>●</span>}
                {opt}
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: "12px", fontFamily: body, fontSize: 11, color: c.textDim, textAlign: "center" }}>
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
   FILTER CHIP — active filter indicator (right side of filter bar)
   ════════════════════════════════════════════════════════════════════ */
function FilterChip({ label }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: 9, fontWeight: 600,
      color: c.accent, background: c.accentDim,
      padding: "2px 8px", borderRadius: 4,
      border: `1px solid ${c.accent}25`,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>{label}</span>
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
      padding: "5px 10px", gap: 7,
      borderRadius: 8, border: `1px solid ${c.border}`,
      background: c.surfaceAlt,
      transition: "all 0.15s ease",
    }}>
      <span style={{
        fontFamily: body, fontSize: 12, color: c.textDim,
        flex: 1, whiteSpace: "nowrap", overflow: "hidden",
        userSelect: "none",
      }}>Search...</span>
      <span style={{
        fontFamily: mono, fontSize: 9, fontWeight: 700,
        color: c.textDim, background: c.surface,
        border: `1px solid ${c.border}`, padding: "1px 6px", borderRadius: 4,
        lineHeight: 1.3, flexShrink: 0,
      }}>F</span>
    </div>
  );
}

