// Flow — App Shell (two-layer header)
// Layer 1: Logo · Primary Nav · Utility (search, theme)
// Layer 2: Week controls · Filter trigger · Applied chips
// Filter drawer slides from right when triggered
import React from "react";
import { c, typo, layout, space, motion } from "../styles/theme";
import { FilterChip, Btn } from "./shared";
import FlowLogo from "./FlowLogo";
import { weekConfig } from "../data/seed";

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
  { key: "guide",    label: "Guide",    num: 7 },
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
   DAY RHYTHM — contextual day-of-week indicator
   Mon=Focus · Tue/Wed=Sprint · Thu=Release · Fri=Review
   ════════════════════════════════════════════════════════════════════ */
const DAY_RHYTHM = [
  { label: "Focus day",   color: () => c.purple, icon: "◎" },  // 0 = Sunday
  { label: "Focus day",   color: () => c.purple, icon: "◎" },  // 1 = Monday
  { label: "Sprint day",  color: () => c.green,  icon: "⚡" }, // 2 = Tuesday
  { label: "Sprint day",  color: () => c.green,  icon: "⚡" }, // 3 = Wednesday
  { label: "Release day", color: () => c.orange, icon: "🚀" }, // 4 = Thursday
  { label: "Review day",  color: () => c.cyan,   icon: "✓" },  // 5 = Friday
  { label: "Rest day",    color: () => c.textDim, icon: "💤" }, // 6 = Saturday
];

function getDayRhythm() {
  const day = new Date().getDay();
  return DAY_RHYTHM[day] || null;
}


/* ════════════════════════════════════════════════════════════════════
   HEADER — two-layer shell
   Layer 1 (52px): [Logo] | [Nav tabs] ····· [🔍] [◐]
   Layer 2 (38px): [Week ◂ date ▸] | ····· [chips] [Filters btn]
   Detail mode:    Layer 1 shows breadcrumb, Layer 2 hidden
   ════════════════════════════════════════════════════════════════════ */
export function Header({
  weekLabel, weekOffset, onWeekPrev, onWeekNext, onLogoClick,
  detailLabel, onBack, breadcrumbLabel,
  activeTab, onTabSwitch,
  onCmdOpen,
  // ── Global filter props ──
  globalFilters, pendingFilters, setPendingFilters,
  applyFilters, clearGlobalFilters, globalFilterCount,
  allOwners, allSquads, allPeople,
}) {

  const showContextBar = !detailLabel;
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Local draft state for the drawer — syncs from pendingFilters when opening
  const [draft, setDraft] = React.useState({ owner: "", squad: "", person: "" });

  // Pending-apply flag: when set, triggers applyFilters on next render after setPendingFilters
  const applyNextRef = React.useRef(false);
  React.useEffect(() => {
    if (applyNextRef.current) {
      applyNextRef.current = false;
      applyFilters();
    }
  }, [pendingFilters, applyFilters]);

  const openDrawer = () => {
    setDraft({ ...pendingFilters });
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleApply = () => {
    setPendingFilters({ ...draft });
    applyNextRef.current = true;
    setDrawerOpen(false);
  };

  const handleClearAll = () => {
    setDraft({ owner: "", squad: "", person: "" });
    clearGlobalFilters();
    setDrawerOpen(false);
  };

  const draftCount = Object.values(draft).filter(Boolean).length;
  const draftChanged = draft.owner !== globalFilters.owner ||
                       draft.squad !== globalFilters.squad ||
                       draft.person !== globalFilters.person;

  // Remove a single applied filter chip
  const removeAppliedFilter = (key) => {
    const updated = { ...globalFilters, [key]: "" };
    setPendingFilters(updated);
    applyNextRef.current = true;
  };

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
      </div>
    </header>

    {/* ═══ LAYER 2 — Context bar (week + filter trigger + chips) ═══ */}
    {showContextBar && (
      <div className="flow-context-bar" style={{
        height: 52, display: "flex", alignItems: "center",
        padding: `0 ${space[5]}px`, gap: space[2],
        background: `linear-gradient(180deg, ${c.surfaceSolid} 0%, ${c.bg} 100%)`,
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

        {/* ── Separator ── */}
        <div style={{ width: 1, alignSelf: "stretch", margin: "6px 2px", background: c.border, flexShrink: 0 }} />

        {/* ── Day rhythm pill ── */}
        <DayRhythmPill onNavigateToGuide={() => onTabSwitch("guide")} />

        {/* ── Spacer ── */}
        <div style={{ flex: 1 }} />

        {/* ── Active filter chips (inline) ── */}
        {globalFilterCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: space[1] + 2, flexShrink: 0 }}>
            {globalFilters.owner && (
              <FilterChip label={`Owner: ${globalFilters.owner}`} onClick={() => removeAppliedFilter("owner")} />
            )}
            {globalFilters.squad && (
              <FilterChip label={`Squad: ${globalFilters.squad}`} onClick={() => removeAppliedFilter("squad")} />
            )}
            {globalFilters.person && (
              <FilterChip label={`Person: ${globalFilters.person}`} onClick={() => removeAppliedFilter("person")} />
            )}
          </div>
        )}

        {/* ── Filter trigger button ── */}
        <button onClick={openDrawer} className="flow-filter-trigger" style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: `3px ${space[3]}px`, height: 26,
          borderRadius: layout.radiusSm,
          border: `1px solid ${globalFilterCount > 0 ? c.accent + "40" : c.border}`,
          background: globalFilterCount > 0 ? c.accentDim : c.surfaceAlt,
          color: globalFilterCount > 0 ? c.accent : c.textMid,
          fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
          fontWeight: 600, cursor: "pointer",
          transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
          flexShrink: 0,
        }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M1 3h14M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {globalFilterCount > 0 ? (
            <>
              {globalFilterCount} filter{globalFilterCount !== 1 ? "s" : ""} applied
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 700,
                color: c.accent, background: `${c.accent}18`,
                padding: "1px 5px", borderRadius: layout.radiusTag + 1, lineHeight: 1.4,
              }}>{globalFilterCount}</span>
            </>
          ) : "Filters"}
        </button>
      </div>
    )}

    {/* ═══ FILTER DRAWER — slides from right ═══ */}
    <FilterDrawer
      open={drawerOpen}
      onClose={closeDrawer}
      draft={draft}
      setDraft={setDraft}
      onApply={handleApply}
      onClearAll={handleClearAll}
      draftCount={draftCount}
      draftChanged={draftChanged}
      globalFilterCount={globalFilterCount}
      allOwners={allOwners || []}
      allSquads={allSquads || []}
      allPeople={allPeople || []}
    />
    </>
  );
}


/* ════════════════════════════════════════════════════════════════════
   FILTER DRAWER — full-height right panel with search per group
   ════════════════════════════════════════════════════════════════════ */
function FilterDrawer({
  open, onClose,
  draft, setDraft,
  onApply, onClearAll,
  draftCount, draftChanged, globalFilterCount,
  allOwners, allSquads, allPeople,
}) {
  const drawerRef = React.useRef(null);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, onClose]);

  const filterGroups = [
    { key: "squad",  label: "Squad",  options: allSquads },
    { key: "owner",  label: "Owner",  options: allOwners },
    { key: "person", label: "Person", options: allPeople },
  ];

  const activeCount = [draft.squad, draft.owner, draft.person].filter(Boolean).length;

  return (
    <>
      {/* Overlay — dark + blur */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: open ? "blur(6px)" : "blur(0px)",
          WebkitBackdropFilter: open ? "blur(6px)" : "blur(0px)",
          zIndex: 200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: `opacity 0.3s ease, backdrop-filter 0.3s ease`,
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 360,
          background: c.surfaceOverlay,
          borderLeft: `1px solid ${c.border}`,
          zIndex: 201,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)`,
          display: "flex", flexDirection: "column",
          boxShadow: open ? `-8px 0 30px rgba(0,0,0,0.5)` : "none",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: `${space[4]}px ${space[5]}px`,
          borderBottom: `1px solid ${c.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 3h14M4 8h8M6 13h4" stroke={c.accent} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
              color: c.text,
            }}>Filters</span>
            {activeCount > 0 && (
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700,
                color: c.accent, background: c.accentDim,
                padding: "1px 6px", borderRadius: layout.radiusPill,
                lineHeight: 1.4,
              }}>{activeCount}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            {globalFilterCount > 0 && (
              <button onClick={onClearAll} className="flow-drawer-close" style={{
                height: 28, borderRadius: layout.radiusSm, padding: `0 ${space[2]}px`,
                border: `1px solid ${c.border}`, background: c.surfaceAlt,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                color: c.textDim, transition: `all ${motion.interaction.duration}`,
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = c.red; e.currentTarget.style.borderColor = `${c.red}40`; }}
              onMouseLeave={e => { e.currentTarget.style.color = c.textDim; e.currentTarget.style.borderColor = c.border; }}
              >Reset</button>
            )}
            <button onClick={onClose} className="flow-drawer-close" style={{
              width: 28, height: 28, borderRadius: layout.radiusSm,
              border: `1px solid ${c.border}`, background: c.surfaceAlt,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: c.textMid, transition: `all ${motion.interaction.duration}`,
            }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Filter groups ── */}
        <div style={{
          flex: 1, overflowY: "auto", padding: `${space[3]}px ${space[5]}px`,
          display: "flex", flexDirection: "column", gap: space[4],
          scrollbarWidth: "none",
        }}>
          {filterGroups.map(group => (
            <DrawerFilterGroup
              key={group.key}
              label={group.label}
              options={group.options}
              value={draft[group.key]}
              onChange={v => setDraft(d => ({ ...d, [group.key]: v }))}
            />
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: `${space[3]}px ${space[5]}px ${space[4]}px`,
          borderTop: `1px solid ${c.border}`,
          display: "flex", flexDirection: "column", gap: space[3],
        }}>
          {/* Draft indicator */}
          {draftChanged && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
              fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking,
              color: c.orange,
            }}>
              <div className="flow-draft-dot" style={{
                width: 6, height: 6, borderRadius: "50%", background: c.orange,
                animation: "breathe 2s ease-in-out infinite",
              }} />
              {draftCount > 0
                ? `${draftCount} pending change${draftCount !== 1 ? "s" : ""}`
                : "Clearing all filters"
              }
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: space[2] }}>
            <Btn variant="secondary" onClick={onClose} style={{
              flex: 1, justifyContent: "center", fontSize: typo.bodySm.size,
            }}>Cancel</Btn>
            <Btn
              variant={draftChanged ? "primary" : "secondary"}
              onClick={onApply}
              disabled={!draftChanged}
              style={{ flex: 2, justifyContent: "center", fontSize: typo.bodySm.size }}
            >
              {draftChanged ? "Apply filters" : "No changes"}
            </Btn>
          </div>
        </div>
      </div>
    </>
  );
}


/* ════════════════════════════════════════════════════════════════════
   DRAWER FILTER GROUP — single filter with search + option list
   ════════════════════════════════════════════════════════════════════ */
function DrawerFilterGroup({ label, options, value, onChange }) {
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef(null);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  // When not searching, pin selected item to top
  const sorted = (!search && value)
    ? [value, ...filtered.filter(o => o !== value)]
    : filtered;

  return (
    <div>
      {/* Label row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: space[2],
      }}>
        <div style={{
          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
          fontWeight: typo.monoSm.weight, letterSpacing: "0.06em",
          color: c.textDim, textTransform: "uppercase",
        }}>{label}</div>
        {value && (
          <span
            onClick={() => { onChange(""); setSearch(""); }}
            style={{
              fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 500,
              color: c.textDim, cursor: "pointer",
              padding: "1px 5px", borderRadius: layout.radiusTag,
              transition: `all ${motion.interaction.duration}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = c.accent; }}
            onMouseLeave={e => { e.currentTarget.style.color = c.textDim; }}
          >Clear</span>
        )}
      </div>

      {/* Search input */}
      <div style={{ position: "relative", marginBottom: space[2] }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          opacity: 0.4, pointerEvents: "none",
        }}>
          <circle cx="7" cy="7" r="5" stroke={c.textDim} strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          placeholder={`Search ${label.toLowerCase()}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && filtered.length === 1) {
              onChange(filtered[0]);
              setSearch("");
            }
          }}
          style={{
            width: "100%", height: 32, padding: `0 ${space[3]}px 0 32px`,
            border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
            background: c.surfaceAlt, color: c.text,
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
            outline: "none", boxSizing: "border-box",
            transition: `border-color ${motion.interaction.duration}`,
          }}
          onFocus={e => { e.target.style.borderColor = c.accent + "60"; }}
          onBlur={e => { e.target.style.borderColor = c.border; }}
        />
      </div>

      {/* Option list */}
      <div style={{
        maxHeight: 160, overflowY: "auto",
        borderRadius: layout.radiusSm,
        border: `1px solid ${c.border}`,
        background: c.surface,
        scrollbarWidth: "thin",
        scrollbarColor: `${c.textDim}30 transparent`,
      }}>
        {/* All option */}
        <div
          onClick={() => { onChange(""); setSearch(""); }}
          className="flow-dropdown-item"
          style={{
            padding: `6px ${space[3]}px`, cursor: "pointer",
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
            color: !value ? c.accent : c.textMid,
            fontWeight: !value ? 600 : 400,
            background: !value ? `${c.accent}08` : "transparent",
            borderBottom: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", gap: space[2],
            transition: `background ${motion.interaction.duration}`,
          }}
        >
          <span style={{
            width: 14, height: 14, borderRadius: 3,
            border: `1.5px solid ${!value ? c.accent : c.textDim}`,
            background: !value ? c.accent : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: `all ${motion.interaction.duration}`,
          }}>
            {!value && (
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          All {label.toLowerCase()}s
        </div>

        {sorted.map(opt => {
          const selected = opt === value;
          return (
            <div
              key={opt}
              onClick={() => { onChange(opt); setSearch(""); }}
              className="flow-dropdown-item"
              style={{
                padding: `6px ${space[3]}px`, cursor: "pointer",
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                color: selected ? c.accent : c.text,
                fontWeight: selected ? 600 : 400,
                background: selected ? `${c.accent}08` : "transparent",
                display: "flex", alignItems: "center", gap: space[2],
                borderBottom: selected ? `1px solid ${c.accent}20` : `1px solid ${c.border}30`,
                transition: `background ${motion.interaction.duration}`,
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                border: `1.5px solid ${selected ? c.accent : c.textDim}`,
                background: selected ? c.accent : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: `all ${motion.interaction.duration}`,
              }}>
                {selected && (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt}
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div style={{
            padding: `${space[3]}px`, fontFamily: typo.bodySm.font,
            fontSize: typo.bodySm.size, color: c.textDim, textAlign: "center",
          }}>
            No matches
          </div>
        )}
      </div>
    </div>
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
   DAY RHYTHM PILL — contextual day indicator in context bar
   ════════════════════════════════════════════════════════════════════ */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DayRhythmPill({ onNavigateToGuide }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const currentDay = new Date().getDay();
  const rhythm = DAY_RHYTHM[currentDay];
  if (!rhythm) return null;
  const color = rhythm.color();

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <span
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: `4px ${space[2]}px`,
          height: 24, boxSizing: "border-box",
          borderRadius: layout.radiusTag + 1,
          background: `${color}12`,
          border: `1px solid ${color}25`,
          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
          fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking,
          color, lineHeight: 1, cursor: "pointer",
          whiteSpace: "nowrap",
          transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${color}20`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = `${color}12`; }}
      >
        <span style={{ fontSize: 10, lineHeight: 1 }}>{rhythm.icon}</span>
        {rhythm.label}
      </span>

      {/* Popup */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          zIndex: 900, minWidth: 260,
          background: c.surfaceOverlay,
          border: `1px solid ${c.border}`,
          borderRadius: layout.radiusMd,
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          padding: `${space[3]}px`,
          fontFamily: typo.bodyXs.font,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.08em", color: c.textDim,
            marginBottom: space[2],
          }}>
            Weekly rhythm
          </div>
          {DAY_RHYTHM.map((r, i) => {
            const rc = r.color();
            const isToday = i === currentDay;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: `4px ${space[2]}px`,
                borderRadius: layout.radiusTag,
                background: isToday ? `${rc}15` : "transparent",
                marginBottom: 2,
              }}>
                <span style={{
                  width: 32, fontSize: 11, color: isToday ? c.text : c.textDim,
                  fontWeight: isToday ? 600 : 400,
                  fontFamily: typo.monoSm.font,
                }}>
                  {DAY_NAMES[i]}
                </span>
                <span style={{ fontSize: 11, lineHeight: 1 }}>{r.icon}</span>
                <span style={{
                  fontSize: 12, color: isToday ? rc : c.textMid,
                  fontWeight: isToday ? 600 : 400,
                  flex: 1,
                }}>
                  {r.label}
                </span>
                {isToday && (
                  <span style={{
                    fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: rc, opacity: 0.8,
                  }}>
                    today
                  </span>
                )}
              </div>
            );
          })}
          {/* Deeplink to Guide */}
          <div
            onClick={() => {
              setOpen(false);
              if (onNavigateToGuide) {
                onNavigateToGuide();
                setTimeout(() => {
                  const el = document.getElementById("weekly-rhythm");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 120);
              }
            }}
            style={{
              marginTop: space[2], paddingTop: space[2],
              borderTop: `1px solid ${c.border}`,
              display: "flex", alignItems: "center", gap: 4,
              cursor: "pointer",
              fontSize: 11, color: c.accent,
              fontFamily: typo.monoSm.font, fontWeight: 500,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = c.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = c.accent; }}
          >
            Learn more in Guide →
          </div>
        </div>
      )}
    </span>
  );
}


/* ════════════════════════════════════════════════════════════════════
   COMPACT SEARCH — click trigger for command palette
   ════════════════════════════════════════════════════════════════════ */
function CompactSearch({ onClick }) {
  return (
    <div className="flow-hide-mobile flow-search-trigger" onClick={onClick} style={{
      position: "relative", width: 200, cursor: "pointer",
      display: "flex", alignItems: "center",
      padding: `8px ${space[3] + 2}px`, gap: 9,
      borderRadius: layout.radiusMd, border: `1px solid rgba(255,255,255,0.22)`,
      background: `linear-gradient(135deg, ${c.surfaceAlt} 0%, ${c.surfaceAlt}C0 100%)`,
      transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 0.5px rgba(255,255,255,0.08)`,
    }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.55, flexShrink: 0 }}>
        <circle cx="7" cy="7" r="5" stroke={c.textDim} strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{
        fontFamily: typo.bodyXs.font, fontSize: 14,
        color: c.textMid,
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
