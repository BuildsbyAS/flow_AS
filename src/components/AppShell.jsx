// Flow — App Shell (two-layer header)
// Layer 1: Logo · Primary Nav · Utility (search, theme)
// Layer 2: Week controls · Filter trigger · Applied chips
// Filter drawer slides from right when triggered
import React, { useState, useRef, useEffect, useCallback } from "react";
import { c, typo, layout, space, motion, mono } from "../styles/theme";
import { FilterChip, Btn } from "./shared";
import FlowLogo from "./FlowLogo";
import { supabase } from "../lib/supabase";
import useDevLabel from "../hooks/useDevLabel";

// weekConfig now passed via props from App.jsx

/* ════════════════════════════════════════════════════════════════════
   NAV
   ════════════════════════════════════════════════════════════════════ */
export const NAV = [
  { key: "summary",  label: "Summary",  num: 1 },
  { key: "projects", label: "Projects", num: 2 },
  { key: "people",   label: "People",   num: 3 },
  { key: "sep1",     separator: true },
  { key: "pulse",    label: "Pulse",    num: 4 },
  { key: "commit",   label: "Commit",   num: 5 },
  { key: "sep2",     separator: true },
  { key: "guide",    label: "Guide",    num: 6 },
  { key: "settings", label: "Settings", num: null },
  { key: "logs",     label: "Logs",     num: null },
  { key: "rant",     label: "Rant",     num: null },
];

// Primary nav = tabs shown in the header bar (guide stays here)
const PRIMARY_NAV = NAV.filter(t => !["settings", "logs", "rant"].includes(t.key) || t.separator);
// Utility nav = behind the terminal icon
const UTILITY_NAV = NAV.filter(t => ["settings", "logs", "rant"].includes(t.key));

/* ── Terminal Icon SVG ── */
const TerminalIcon = ({ size = 18, color = c.textMid }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

/* ════════════════════════════════════════════════════════════════════
   CYCLE STAGE
   declare → lock → pulse → close
   ════════════════════════════════════════════════════════════════════ */
const STAGES = {
  declare: { label: "Declare", verb: "Open Commit", targetTab: "commit",  color: () => c.purple },
  lock:    { label: "Lock",    verb: "Run Pulse",  targetTab: "pulse",  color: () => c.orange },
  pulse:   { label: "Pulse",   verb: "Close Week", targetTab: "pulse",  color: () => c.green  },
  close:   { label: "Close",   verb: "Outcomes",   targetTab: "pulse",  color: () => c.blue   },
};

export function getCycleStage(commitments) {
  // Only count people who have actually declared something. Backfilled empty
  // commitment rows (one per person in the roster) would otherwise dominate
  // the ratios and keep the whole team stuck on "declare" forever.
  const active = commitments.filter(x => x.items?.some(i => i.title && i.title.trim()));
  const total = active.length;
  if (total === 0) return "declare";
  const locked = active.filter(x => x.lockedAt).length;
  const withOutcomes = active.filter(x => x.items?.some(i => i.outcome)).length;

  // "Close" is a Thu/Fri ritual — a single Tuesday outcome shouldn't flip
  // the whole team into close stage. Gate by day-of-week OR by ≥50% of the
  // locked commitments having outcomes.
  const dow = new Date().getDay(); // 0=Sun..6=Sat
  const isCloseWindow = dow === 4 || dow === 5; // Thu/Fri
  const enoughOutcomes = locked > 0 && withOutcomes >= Math.ceil(locked * 0.5);
  if ((isCloseWindow && withOutcomes > 0) || enoughOutcomes) return "close";

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
  // Match getCycleStage: only count declared commitments, not backfilled empties.
  const active = commitments.filter(x => x.items?.some(i => i.title && i.title.trim()));
  const total = active.length;
  if (total === 0) return items;
  const unlocked = active.filter(x => !x.lockedAt).length;
  const blocked = active.filter(x => x.items?.some(i => i.outcome === "blocked")).length;
  const soon = 14 * 86400000;
  const atRisk = projects.filter(p =>
    !["Alpha","Beta","GA"].includes(p.phase) && p.endDate &&
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
  // ── Auth ──
  currentUser,
}) {

  const devRef = useDevLabel('Header', 'src/components/AppShell.jsx', 'Two-layer app header with nav, week controls, and filters');
  const showContextBar = !detailLabel;
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // ── Scroll-aware collapse: hide headers on scroll-down, reveal on scroll-up/hover ──
  // Listen in capture phase so we catch scroll on any inner container
  // (several views use internal overflow:auto scrollers, not window scroll).
  const [scrollHidden, setScrollHidden] = React.useState(false);
  const [hoverPeek, setHoverPeek] = React.useState(false);
  const lastYMapRef = React.useRef(new WeakMap());
  const peekTimerRef = React.useRef(null);
  React.useEffect(() => {
    const REVEAL_TOP = 40;
    const DELTA = 6;
    const HIDE_AFTER = 120;
    const onAnyScroll = (e) => {
      const t = e.target;
      const isDoc = (t === document || t === document.documentElement || t === document.body);
      const el = isDoc ? (document.scrollingElement || document.documentElement) : t;
      if (!el || typeof el.scrollTop !== "number") return;
      // Ignore tiny inner scrollers (tables, dropdowns, popovers) — only the main
      // page scroll region should drive header collapse.
      if (!isDoc) {
        const vh = window.innerHeight || 800;
        if (el.clientHeight < vh * 0.5) return;
      }
      const y = el.scrollTop;
      const prev = lastYMapRef.current.get(el) ?? 0;
      const dy = y - prev;
      if (y <= REVEAL_TOP) {
        setScrollHidden(false);
      } else if (dy > DELTA && y > HIDE_AFTER) {
        setScrollHidden(true);
      } else if (dy < -DELTA) {
        setScrollHidden(false);
      }
      lastYMapRef.current.set(el, y);
    };
    document.addEventListener('scroll', onAnyScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onAnyScroll, { capture: true });
  }, []);

  // Reset collapse state when the active tab or detail context changes
  React.useEffect(() => { setScrollHidden(false); }, [activeTab, detailLabel]);

  const collapsed = scrollHidden && !hoverPeek;

  // Sync CSS var + body class so sticky content below the app header knows
  // whether to offset by the header's height (expanded) or 0 (collapsed/hidden).
  // The header itself uses transform to hide, so its layout box still reserves
  // ~104px at the top — but when visually hidden we want sticky inner headers
  // (table columns, section titles) to rise to the viewport top.
  React.useEffect(() => {
    const headerH = showContextBar ? 104 : 52;
    document.documentElement.style.setProperty('--flow-header-h', `${headerH}px`);
    document.documentElement.style.setProperty('--flow-header-offset', collapsed ? '60px' : `${headerH}px`);
    document.body.classList.toggle('flow-chrome-collapsed', collapsed);
    return () => document.body.classList.remove('flow-chrome-collapsed');
  }, [collapsed, showContextBar]);

  const triggerPeek = () => {
    setHoverPeek(true);
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
  };
  const endPeek = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => setHoverPeek(false), 180);
  };

  // Current page label for the floating pill
  const currentNav = NAV.find(n => n.key === activeTab && !n.separator);
  const floatingLabel = detailLabel || currentNav?.label || "";

  // Local draft state for the drawer — syncs from pendingFilters when opening
  const [draft, setDraft] = React.useState({ owner: [], squad: [], person: [] });

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
    setDraft({ owner: [], squad: [], person: [] });
    clearGlobalFilters();
    setDrawerOpen(false);
  };

  const draftCount = Object.values(draft).filter(v => v.length > 0).length;
  const draftChanged = JSON.stringify(draft) !== JSON.stringify(globalFilters);

  // Remove a single applied filter chip
  const removeAppliedFilter = (key) => {
    const updated = { ...globalFilters, [key]: [] };
    setPendingFilters(updated);
    applyNextRef.current = true;
  };

  return (
    <>
    {/* ─── Top hover-peek trigger: invisible strip that reveals collapsed header ─── */}
    <div
      aria-hidden
      onMouseEnter={triggerPeek}
      onMouseLeave={endPeek}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 14,
        zIndex: 54,
        pointerEvents: collapsed ? "auto" : "none",
      }}
    />

    {/* ═══ SCROLL-AWARE HEADER WRAPPER — slides up on scroll down ═══
       Uses transform (GPU, no layout reflow) rather than height animation —
       resizing the wrapper mid-scroll causes the main scroll container's
       scrollTop to shift, which creates artifact scroll events and oscillation. */}
    <div
      onMouseEnter={() => { if (scrollHidden) triggerPeek(); }}
      onMouseLeave={endPeek}
      style={{
        position: "sticky", top: 0, zIndex: 50,
        width: "100%", minWidth: 0,
        transform: collapsed ? "translate3d(0,-100%,0)" : "translate3d(0,0,0)",
        opacity: collapsed ? 0 : 1,
        transition: "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease",
        willChange: "transform",
      }}
    >
    {/* ═══ LAYER 1 — Primary navigation bar ═══ */}
    <header ref={devRef} className="flow-header" style={{
      height: 52, display: "flex", alignItems: "center",
      padding: `0 ${space[7]}px`,
      background: c.surface,
      borderBottom: `1px solid ${c.border}`,
      boxShadow: c.shadowSm,
      position: "relative", zIndex: 2,
      minWidth: 0,
    }}>

      {/* ── Logo — orange dot + FLOW wordmark ── */}
      <div onClick={onLogoClick} className="flow-logo-group" style={{
        display: "flex", alignItems: "center", gap: space[2] + 2,
        cursor: "pointer", marginRight: space[5], flexShrink: 0,
      }}>
        <div className="flow-logo-mark" style={{
          flexShrink: 0, position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FlowLogo size={28} />
        </div>
        <span style={{
          fontFamily: mono, fontSize: 15,
          fontWeight: 700, color: c.text, letterSpacing: "0.04em",
        }}>FLOW</span>
      </div>

      {/* ── Vertical separator ── */}
      <div style={{ width: 1, height: 24, background: c.border, marginRight: space[3], flexShrink: 0 }} />

      {/* ── Nav tabs (or breadcrumb in detail mode) ── */}
      {detailLabel ? (
        <DetailBreadcrumb
          breadcrumbLabel={breadcrumbLabel}
          detailLabel={detailLabel}
          onBack={onBack}
        />
      ) : (
        <nav className="flow-nav-rail" style={{ display: "flex", alignItems: "stretch", gap: 2, flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden", height: "100%", scrollbarWidth: "none" }}>
          {PRIMARY_NAV.map(tab => {
            if (tab.separator) {
              return <div key={tab.key} style={{ width: 1, height: 20, alignSelf: "center", background: c.border, margin: `0 ${space[1]}px`, flexShrink: 0 }} />;
            }
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => onTabSwitch(tab.key)} className="flow-header-tab" style={{
                padding: `0 ${space[3] + 2}px`, borderRadius: 0,
                border: "none", cursor: "pointer",
                background: "transparent",
                fontFamily: typo.bodySm.font, fontSize: 13,
                fontWeight: 600,
                color: active ? c.accent : c.textDim,
                display: "flex", alignItems: "center", gap: 6,
                position: "relative", flexShrink: 0, whiteSpace: "nowrap",
                transition: `color ${motion.fast.duration} ${motion.fast.easing}`,
              }}>
                {tab.label}
                {/* Numeric shortcut hint — subtle hotkey */}
                {tab.num && <span className="flow-tab-hotkey" style={{
                  fontFamily: typo.monoSm.font, fontSize: 11,
                  fontWeight: 700, letterSpacing: typo.monoSm.tracking,
                  color: c.textGhost || c.textDim,
                  opacity: active ? 0.7 : 0.5,
                  lineHeight: 1, flexShrink: 0,
                  padding: "2px 5px",
                  border: `1px solid ${c.border}`,
                  borderRadius: 3,
                  transition: `background ${motion.fast.duration}, border-color ${motion.fast.duration}, color ${motion.fast.duration}, box-shadow ${motion.fast.duration}, transform ${motion.fast.duration}, opacity ${motion.fast.duration}`,
                  position: "relative", top: -1,
                }}>{tab.num}</span>}
                {/* Active indicator — 2px accent underline, no glow */}
                {active && (
                  <div style={{
                    position: "absolute", bottom: -1, left: 0, right: 0,
                    height: 2,
                    background: c.accent,
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* Spacer removed — nav-rail grows to fill remaining space (flex:1) */}
      <div style={{ width: space[2], flexShrink: 0 }} />

      {/* ── Utility cluster: search · user ── */}
      <div style={{ display: "flex", alignItems: "center", gap: space[2], flexShrink: 0 }}>
        <CompactSearch onClick={onCmdOpen} />

        {/* ── Terminal button (Settings, Logs & Rant) ── */}
        <button
          onClick={() => onTabSwitch("terminal")}
          style={{
            width: 34, height: 34, borderRadius: layout.radiusSm,
            border: `1px solid ${["terminal","settings","logs","rant"].includes(activeTab) ? c.green + "40" : c.border}`,
            background: ["terminal","settings","logs","rant"].includes(activeTab) ? c.greenDim : c.surfaceAlt,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}, opacity ${motion.fast.duration} ${motion.fast.easing}`,
          }}
          title="Terminal"
        >
          <TerminalIcon size={16} color={["terminal","settings","logs","rant"].includes(activeTab) ? c.green : c.textMid} />
        </button>

        {/* ── Notification bell (admin rant replies) ── */}
        {currentUser?.user?.email && (
          <div className="flow-bell-sm-hide" style={{ display: "flex", alignItems: "center" }}>
            <NotificationBell
              userEmail={currentUser.user.email}
              onNavigate={(rantId) => { onTabSwitch("terminal"); }}
            />
          </div>
        )}

        {/* ── User avatar + logout ── */}
        {currentUser?.user && (
          <UserBadge user={currentUser.user} personProfile={currentUser.personProfile} onSignOut={currentUser.signOut} onRefreshProfile={currentUser.refreshProfile} />
        )}
      </div>
    </header>

    {/* ═══ LAYER 2 — Context bar (week + filter trigger + chips) ═══ */}
    {showContextBar && (
      <div className="flow-context-bar" style={{
        height: 52, display: "flex", alignItems: "center",
        padding: `0 ${space[7]}px`, gap: space[2],
        background: c.surface,
        borderBottom: `1px solid ${c.border}`,
        position: "relative", zIndex: 1,
      }}>

        {/* ── Week navigator (tactical) ── */}
        <div className="flow-week-nav" style={{
          display: "flex", alignItems: "center",
          borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
          background: c.surfaceAlt,
          overflow: "hidden", flexShrink: 0,
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
                fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                color: c.accent, padding: "1px 3px", borderRadius: layout.radiusTag,
                background: `${c.accent}12`, border: `1px solid ${c.accent}25`,
                letterSpacing: typo.monoSm.tracking, lineHeight: 1,
              }}>PAST</span>
            )}
          </div>
          <button
            onClick={weekOffset < 0 ? onWeekNext : undefined}
            className="flow-btn"
            disabled={weekOffset >= 0}
            aria-disabled={weekOffset >= 0}
            style={{
              padding: `2px ${space[1] + 2}px`, border: "none", background: "transparent",
              cursor: weekOffset < 0 ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center",
              color: weekOffset < 0 ? c.textMid : c.textGhost || c.textDim,
              opacity: weekOffset < 0 ? 1 : 0.35,
              pointerEvents: weekOffset < 0 ? "auto" : "none",
              transition: `color ${motion.interaction.duration}`,
            }}
            title={weekOffset < 0 ? "Next week" : "Already on current week"}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ── Separator ── */}
        <div style={{ width: 1, alignSelf: "stretch", margin: "6px 2px", background: c.border, flexShrink: 0 }} />

        {/* ── Tab help text ── */}
        <TabHelpText activeTab={activeTab} onNavigate={onTabSwitch} />

        {/* ── Spacer ── */}
        <div style={{ flex: 1 }} />

        {/* ── Active filter chips (inline) ── */}
        {globalFilterCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: space[1] + 2, flexShrink: 0, flexWrap: "wrap" }}>
            {globalFilters.owner.length > 0 && (
              <FilterChip label={`Owner: ${globalFilters.owner.join(", ")}`} onClick={() => removeAppliedFilter("owner")} />
            )}
            {globalFilters.squad.length > 0 && (
              <FilterChip label={`Squad: ${globalFilters.squad.join(", ")}`} onClick={() => removeAppliedFilter("squad")} />
            )}
            {globalFilters.person.length > 0 && (
              <FilterChip label={`Person: ${globalFilters.person.join(", ")}`} onClick={() => removeAppliedFilter("person")} />
            )}
          </div>
        )}

        {/* ── Day rhythm pill ── */}
        <DayRhythmPill onNavigateToGuide={() => onTabSwitch("guide")} />

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
          transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, border-color ${motion.interaction.duration} ${motion.interaction.easing}, color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}, transform ${motion.interaction.duration} ${motion.interaction.easing}, opacity ${motion.interaction.duration} ${motion.interaction.easing}`,
          flexShrink: 0,
        }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
            <path d="M1 3h14M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {globalFilterCount > 0 ? (
            <>
              {globalFilterCount} filter{globalFilterCount !== 1 ? "s" : ""} applied
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                color: c.accent, background: `${c.accent}18`,
                padding: "1px 5px", borderRadius: layout.radiusTag + 1, lineHeight: 1.4,
              }}>{globalFilterCount}</span>
            </>
          ) : "Filters"}
        </button>
      </div>
    )}
    </div>
    {/* ═══ END SCROLL-AWARE HEADER WRAPPER ═══ */}

    {/* ═══ FLOATING GLASS PILLS — visible when header collapsed ═══ */}
    <FloatingHeaderPills
      visible={collapsed}
      label={floatingLabel}
      onLogoClick={onLogoClick}
      onSearchClick={onCmdOpen}
      onPeekEnter={triggerPeek}
      onPeekLeave={endPeek}
    />

    {/* ═══ MOBILE BOTTOM NAV — visible only at ≤640px so all 6 tabs stay reachable ═══ */}
    <MobileBottomNav activeTab={activeTab} onTabSwitch={onTabSwitch} />

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
   FLOATING HEADER PILLS — shown when the main header is collapsed.
   Left pill: Flow logo mark. Right pill: current page label + search.
   ════════════════════════════════════════════════════════════════════ */
function FloatingHeaderPills({ visible, label, onLogoClick, onSearchClick, onPeekEnter, onPeekLeave }) {
  const pillBg = c.surface;
  const pillBorder = `1px solid ${c.border}`;
  const pillShadow = c.shadowCard;
  const radius = layout.radiusPill;

  return (
    <>
      {/* Top scrim — hides content scrolling behind the pills.
          Only visible while pills are shown. Height 52 matches --flow-sticky-top
          so sticky table headers pin cleanly below the scrim. zIndex 54 sits
          above the pulse stacking context but below the pills (55). */}
      <div aria-hidden style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 60,
        // Solid page-bg through the full scrim so there is no translucent seam
        // between the scrim's end and the sticky table header's start. A 6px
        // soft fade BELOW the scrim masks any sub-pixel rounding without
        // letting the content row behind bleed through.
        background: c.bg,
        boxShadow: `0 6px 6px -6px ${c.bg}`,
        pointerEvents: "none", zIndex: 54,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.28s ease",
      }} />
    <div
      onMouseEnter={onPeekEnter}
      onMouseLeave={onPeekLeave}
      style={{
        position: "fixed", top: 12, left: 16, right: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: space[3], zIndex: 55,
        pointerEvents: visible ? "auto" : "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* ── Left pill: logo mark + page label stacked ── */}
      <button
        onClick={onLogoClick}
        title="Home"
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "6px 14px 6px 8px", height: 40,
          borderRadius: radius, border: pillBorder,
          background: pillBg,
          boxShadow: pillShadow,
          cursor: "pointer",
          transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, border-color ${motion.interaction.duration} ${motion.interaction.easing}, color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}, transform ${motion.interaction.duration} ${motion.interaction.easing}, opacity ${motion.interaction.duration} ${motion.interaction.easing}`,
        }}
      >
        <FlowLogo size={24} />
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-start",
          lineHeight: 1.05, gap: 1,
        }}>
          <span style={{
            fontFamily: mono,
            fontSize: 13, fontWeight: 700,
            color: c.text, letterSpacing: "0.04em",
          }}>FLOW</span>
          {label && (
            <span style={{
              fontFamily: typo.bodyXs.font, fontSize: 11,
              fontWeight: 500, color: c.textMid,
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap", maxWidth: 180,
              overflow: "hidden", textOverflow: "ellipsis",
            }}>{label}</span>
          )}
        </div>
      </button>

      {/* ── Right pill: search only ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        height: 40, padding: "0 6px",
        borderRadius: radius, border: pillBorder,
        background: pillBg,
        boxShadow: pillShadow,
      }}>
        <button
          onClick={onSearchClick}
          title="Search (F)"
          className="flow-hide-mobile"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 28, padding: "0 10px 0 8px",
            borderRadius: radius,
            border: `1px solid ${c.border}`,
            background: c.surfaceAlt,
            cursor: "pointer",
            transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, border-color ${motion.interaction.duration} ${motion.interaction.easing}, color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}, transform ${motion.interaction.duration} ${motion.interaction.easing}, opacity ${motion.interaction.duration} ${motion.interaction.easing}`,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke={c.textDim} strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{
            fontFamily: typo.bodyXs.font, fontSize: 12,
            color: c.textMid, userSelect: "none",
          }}>Search</span>
          <span style={{
            fontFamily: typo.monoSm.font, fontSize: 10,
            fontWeight: 600, color: c.textDim,
            background: c.surface, border: `1px solid ${c.border}`,
            padding: "0px 5px", borderRadius: layout.radiusTag + 1,
            lineHeight: 1.4,
          }}>⌘K</span>
        </button>
      </div>
    </div>
    </>
  );
}


/* ════════════════════════════════════════════════════════════════════
   MOBILE BOTTOM NAV — fixed footer bar with all 6 primary tabs.
   Visible only at ≤640px (CSS gate). Stays reachable when the top
   header is scroll-collapsed.
   ════════════════════════════════════════════════════════════════════ */
function MobileBottomNav({ activeTab, onTabSwitch }) {
  const tabs = PRIMARY_NAV.filter(t => !t.separator);
  return (
    <nav className="flow-mobile-bottom-nav" aria-label="Primary navigation" style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 56,
      display: "none",
      background: c.surface,
      borderTop: `1px solid ${c.border}`,
      boxShadow: c.shadowCard,
      paddingBottom: "env(safe-area-inset-bottom, 0)",
    }}>
      <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-around", height: 56 }}>
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} type="button" onClick={() => onTabSwitch(tab.key)} aria-label={tab.label} aria-current={active ? "page" : undefined} style={{
              flex: 1, minWidth: 0, height: "100%",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              background: "none", border: 0, padding: "4px 2px",
              cursor: "pointer",
              color: active ? c.accent : c.textMid,
              fontFamily: typo.bodyXs.font, fontSize: 11, fontWeight: 600,
              borderTop: `2px solid ${active ? c.accent : "transparent"}`,
              transition: `color ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
            }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
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
  const devRef = useDevLabel('FilterDrawer', 'src/components/AppShell.jsx', 'Full-height right panel with search-per-group filter controls');
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

  const activeCount = [draft.squad, draft.owner, draft.person].filter(v => v.length > 0).length;

  return (
    <>
      {/* Overlay — dark + blur */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 200,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: `opacity ${motion.normal.duration} ${motion.normal.easing}`,
        }}
      />

      {/* Drawer panel */}
      <div
        ref={(el) => { drawerRef.current = el; if (devRef) devRef.current = el; }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 360,
          background: c.surface,
          borderLeft: `1px solid ${c.border}`,
          zIndex: 201,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: `transform ${motion.normal.duration} ${motion.normal.easing}`,
          display: "flex", flexDirection: "column",
          boxShadow: open ? c.shadowElevated : "none",
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
                fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
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
                color: c.textDim, transition: `background ${motion.interaction.duration}, border-color ${motion.interaction.duration}, color ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}, transform ${motion.interaction.duration}, opacity ${motion.interaction.duration}`,
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
              color: c.textMid, transition: `background ${motion.interaction.duration}, border-color ${motion.interaction.duration}, color ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}, transform ${motion.interaction.duration}, opacity ${motion.interaction.duration}`,
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
              <div className="flow-draft-dot flow-accent-pulse" style={{
                width: 6, height: 6, borderRadius: "50%", background: c.orange,
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
function DrawerFilterGroup({ label, options, value = [], onChange }) {
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef(null);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Pin selected items to top when not searching
  const sorted = (!search && value.length > 0)
    ? [...value.filter(v => filtered.includes(v)), ...filtered.filter(o => !value.includes(o))]
    : filtered;

  const allSelected = value.length === 0;

  const toggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div>
      {/* Label row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: space[2],
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
          <span style={{
            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
            fontWeight: typo.monoSm.weight, letterSpacing: "0.06em",
            color: c.textDim, textTransform: "uppercase",
          }}>{label}</span>
          {value.length > 0 && (
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
              color: c.accent, background: c.accentDim,
              padding: "1px 5px", borderRadius: layout.radiusPill,
              lineHeight: 1.4,
            }}>{value.length}</span>
          )}
        </div>
        {value.length > 0 && (
          <span
            onClick={() => { onChange([]); setSearch(""); }}
            style={{
              fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 500,
              color: c.textDim, cursor: "pointer",
              padding: "1px 5px", borderRadius: layout.radiusTag,
              transition: `background ${motion.interaction.duration}, border-color ${motion.interaction.duration}, color ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}, transform ${motion.interaction.duration}, opacity ${motion.interaction.duration}`,
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
              toggle(filtered[0]);
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
          onClick={() => { onChange([]); setSearch(""); }}
          className="flow-dropdown-item"
          style={{
            padding: `6px ${space[3]}px`, cursor: "pointer",
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
            color: allSelected ? c.accent : c.textMid,
            fontWeight: allSelected ? 600 : 400,
            background: allSelected ? `${c.accent}08` : "transparent",
            borderBottom: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", gap: space[2],
            transition: `background ${motion.interaction.duration}`,
          }}
        >
          <span style={{
            width: 14, height: 14, borderRadius: 3,
            border: `1.5px solid ${allSelected ? c.accent : c.textDim}`,
            background: allSelected ? c.accent : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: `background ${motion.interaction.duration}, border-color ${motion.interaction.duration}, color ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}, transform ${motion.interaction.duration}, opacity ${motion.interaction.duration}`,
          }}>
            {allSelected && (
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 5-5" stroke={c.textOnAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          All {label.toLowerCase()}s
        </div>

        {sorted.map(opt => {
          const selected = value.includes(opt);
          return (
            <div
              key={opt}
              onClick={() => toggle(opt)}
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
                flexShrink: 0, transition: `background ${motion.interaction.duration}, border-color ${motion.interaction.duration}, color ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}, transform ${motion.interaction.duration}, opacity ${motion.interaction.duration}`,
              }}>
                {selected && (
                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 5-5" stroke={c.textOnAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
      {/* Back link — parent section. On narrow viewports, collapse to chevron only. */}
      <span onClick={onBack} className="flow-breadcrumb" style={{
        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
        fontWeight: 500, color: c.textMid, cursor: "pointer", flexShrink: 0,
        display: "flex", alignItems: "center", gap: 5,
        transition: `background ${motion.interaction.duration}, border-color ${motion.interaction.duration}, color ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}, transform ${motion.interaction.duration}, opacity ${motion.interaction.duration}`,
        padding: `3px ${space[2]}px 3px ${space[2] - 2}px`,
        borderRadius: layout.radiusSm,
        border: `1px solid transparent`,
      }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.6 }}>
          <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="flow-breadcrumb-label">{breadcrumbLabel}</span>
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
        background: c.accentDim,
        border: `1px solid ${c.accent}25`,
        minWidth: 0, flex: 1,
      }}>
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: c.accent,
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
   TAB HELP TEXT — contextual one-liner per tab
   ════════════════════════════════════════════════════════════════════ */
const TAB_HELP = {
  summary:  { text: "Week-on-week progress at a glance", section: "guide-summary" },
  pulse:    { text: "Live team activity — who's doing what right now", section: "guide-pulse" },
  commit:   { text: "Your commits for the week — add, lock, ship", section: "guide-commit" },
  projects: { text: "Every project, one view — roadmap & status", section: "guide-projects" },
  people:   { text: "Person deep-dive — commitments, momentum, activity timeline", section: "guide-people" },
  guide:    { text: "How Flow works — the playbook", section: null },
};

function TabHelpText({ activeTab, onNavigate }) {
  const help = TAB_HELP[activeTab];
  if (!help) return null;

  const handleClick = () => {
    if (!help.section || !onNavigate) return;
    onNavigate("guide");
    // Wait for the guide tab to render, then scroll with offset for sticky headers (104px)
    setTimeout(() => {
      const el = document.getElementById(help.section);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 150);
  };

  return (
    <span
      onClick={handleClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: `3px ${space[2] + 2}px`,
        borderRadius: layout.radiusTag + 1,
        background: `${c.accent}06`,
        border: `1px solid ${c.accent}10`,
        flexShrink: 1, minWidth: 0, overflow: "hidden",
        cursor: help.section ? "pointer" : "default",
        transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, border-color ${motion.interaction.duration} ${motion.interaction.easing}, color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}, transform ${motion.interaction.duration} ${motion.interaction.easing}, opacity ${motion.interaction.duration} ${motion.interaction.easing}`,
      }}
      onMouseEnter={e => { if (help.section) { e.currentTarget.style.background = `${c.accent}14`; e.currentTarget.style.borderColor = `${c.accent}25`; } }}
      onMouseLeave={e => { e.currentTarget.style.background = `${c.accent}06`; e.currentTarget.style.borderColor = `${c.accent}10`; }}
      title={help.section ? "Click to learn more in the Guide" : undefined}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
        <circle cx="8" cy="8" r="6.5" stroke={c.accent} strokeWidth="1.2" />
        <path d="M6.5 6.2a1.5 1.5 0 0 1 2.83.7c0 1-1.33 1.2-1.33 1.2" stroke={c.accent} strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="8" cy="11" r="0.6" fill={c.accent} />
      </svg>
      <span style={{
        fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
        color: c.textMid, fontWeight: 500, fontStyle: "italic",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{help.text}</span>
    </span>
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
          transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, border-color ${motion.interaction.duration} ${motion.interaction.easing}, color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}, transform ${motion.interaction.duration} ${motion.interaction.easing}, opacity ${motion.interaction.duration} ${motion.interaction.easing}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = `${color}20`; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = `${color}12`; }}
      >
        <span style={{ fontSize: 11, lineHeight: 1 }}>{rhythm.icon}</span>
        {rhythm.label}
      </span>

      {/* Popup */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          zIndex: 900, minWidth: 200,
          background: c.surfaceOverlay,
          border: `1px solid ${c.border}`,
          borderRadius: layout.radiusMd,
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          padding: `${space[3]}px`,
          fontFamily: typo.bodyXs.font,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase",
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
   NOTIFICATION BELL — admin rant replies for current user
   ════════════════════════════════════════════════════════════════════ */
function NotificationBell({ userEmail, onNavigate }) {
  const devRef = useDevLabel('NotificationBell', 'src/components/AppShell.jsx', 'Bell icon with dropdown for admin rant reply notifications');
  const [notifications, setNotifications] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  // Read dismissed IDs from localStorage
  const getSeenIds = () => {
    try { return JSON.parse(localStorage.getItem("flow_notif_seen") || "[]"); } catch { return []; }
  };
  const markSeen = (id) => {
    const seen = getSeenIds();
    if (!seen.includes(id)) {
      localStorage.setItem("flow_notif_seen", JSON.stringify([...seen, id]));
    }
  };
  const markAllSeen = () => {
    const ids = notifications.map(n => n.id);
    localStorage.setItem("flow_notif_seen", JSON.stringify(ids));
    setNotifications(prev => prev.map(n => ({ ...n, _seen: true })));
  };

  // Fetch rants with admin replies for this user
  const fetchNotifs = React.useCallback(async () => {
    if (!userEmail) return;
    const { data } = await supabase
      .from("rants")
      .select("id, title, admin_note, status, updated_at")
      .eq("user_email", userEmail)
      .not("admin_note", "is", null)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (data) {
      const seen = getSeenIds();
      setNotifications(data.map(r => ({ ...r, _seen: seen.includes(r.id) })));
    }
  }, [userEmail]);

  React.useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  // Poll every 60s
  React.useEffect(() => {
    const iv = setInterval(fetchNotifs, 60000);
    return () => clearInterval(iv);
  }, [fetchNotifs]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter(n => !n._seen).length;

  const timeAgo = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (notifications.length === 0) return null;

  return (
    <div ref={(el) => { ref.current = el; if (devRef) devRef.current = el; }} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(v => !v); }}
        style={{
          width: 34, height: 34, borderRadius: layout.radiusSm,
          border: `1px solid ${open ? c.orange + "40" : c.border}`,
          background: open ? c.orange + "12" : c.surfaceAlt,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, border-color ${motion.interaction.duration} ${motion.interaction.easing}, color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}, transform ${motion.interaction.duration} ${motion.interaction.easing}, opacity ${motion.interaction.duration} ${motion.interaction.easing}`,
        }}
        title="Notifications"
      >
        {/* Bell icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={open ? c.orange : c.textMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {/* Unread dot */}
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            width: 8, height: 8, borderRadius: "50%",
            background: c.orange,
            boxShadow: `0 0 0 2px ${c.surface}`,
          }} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 6,
          width: 320, maxHeight: 400, overflow: "auto",
          background: c.surfaceSolid, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusMd, boxShadow: c.shadowElevated,
          zIndex: 200,
          animation: "flow-load-fade-in 0.15s ease-out",
          scrollbarWidth: "none",
        }}>
          {/* Header */}
          <div style={{
            padding: "10px 14px", borderBottom: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); markAllSeen(); }}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 11, color: c.orange, fontFamily: "inherit",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => {
                markSeen(n.id);
                setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, _seen: true } : x));
                setOpen(false);
                if (onNavigate) onNavigate(n.id);
              }}
              style={{
                width: "100%", padding: "10px 14px",
                background: n._seen ? "transparent" : c.orange + "08",
                border: "none", borderBottom: `1px solid ${c.border}`,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                display: "flex", gap: 10, alignItems: "flex-start",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = n._seen ? "transparent" : c.orange + "08"}
            >
              {/* Unread dot */}
              <div style={{
                width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                background: n._seen ? "transparent" : c.orange,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: n._seen ? 400 : 600, color: c.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  Admin replied to "{n.title}"
                </div>
                <div style={{
                  fontSize: 11, color: c.textDim, marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {n.admin_note}
                </div>
                <div style={{ fontSize: 11, color: c.textDim, opacity: 0.5, marginTop: 2 }}>
                  {timeAgo(n.updated_at)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ════════════════════════════════════════════════════════════════════
   USER BADGE — avatar + dropdown with logout
   ════════════════════════════════════════════════════════════════════ */
function UserBadge({ user, personProfile, onSignOut, onRefreshProfile }) {
  const devRef = useDevLabel('UserBadge', 'src/components/AppShell.jsx', 'User avatar with dropdown menu for profile editing and sign-out');
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editSquadId, setEditSquadId] = React.useState("");
  const [editRoleId, setEditRoleId] = React.useState("");
  const [squads, setSquads] = React.useState([]);
  const [roles, setRoles] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const ref = React.useRef(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // When opening edit mode, fetch squads/roles and populate current values
  const startEditing = async () => {
    setEditName(personProfile?.name || "");
    setEditSquadId(personProfile?.squad_id || "");
    setEditRoleId(personProfile?.role_id || "");
    setEditing(true);

    // Lazy-load squads + roles
    const { supabase } = await import("../lib/supabase");
    const [sq, ro] = await Promise.all([
      supabase.from("squads").select("id, name").order("name"),
      supabase.from("roles").select("id, name").order("name"),
    ]);
    if (sq.data) setSquads(sq.data);
    if (ro.data) setRoles(ro.data);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editSquadId || !editRoleId) return;
    setSaving(true);
    const { supabase } = await import("../lib/supabase");
    await supabase
      .from("people")
      .update({ name: editName.trim(), squad_id: editSquadId, role_id: editRoleId })
      .eq("id", personProfile.id);
    setSaving(false);
    setEditing(false);
    if (onRefreshProfile) onRefreshProfile();
  };

  const avatar = user?.user_metadata?.avatar_url;
  const displayName = personProfile?.name || user?.user_metadata?.full_name || user?.email;

  const inputStyle = {
    width: "100%", padding: "6px 10px",
    background: "rgba(0,0,0,0.04)",
    border: `1px solid rgba(0,0,0,0.07)`,
    borderRadius: 6, color: c.text,
    fontSize: 12, fontFamily: "inherit",
    outline: "none",
  };

  const menuBtn = {
    width: "100%", padding: "8px 14px",
    background: "transparent", border: "none",
    textAlign: "left", cursor: "pointer",
    fontSize: 13, color: c.text, fontFamily: "inherit",
    transition: "background 0.1s",
  };

  return (
    <div ref={(el) => { ref.current = el; if (devRef) devRef.current = el; }} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(v => !v); if (open) setEditing(false); }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 3px", background: "transparent", border: "none",
          cursor: "pointer", borderRadius: 20,
          transition: "background 0.15s",
        }}
        title={displayName}
      >
        {avatar ? (
          <img src={avatar} alt="" style={{
            width: 28, height: 28, borderRadius: "50%",
            border: `2px solid ${c.border}`,
            transition: "border-color 0.15s",
          }} />
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: c.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: c.textOnAccent,
            border: `2px solid ${c.border}`,
          }}>
            {(displayName || "?")[0].toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, marginTop: 6,
          width: editing ? 260 : 220, padding: "8px 0",
          background: c.surfaceSolid, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusMd, boxShadow: c.shadowElevated,
          zIndex: 200,
          animation: "flow-load-fade-in 0.15s ease-out",
        }}>

          {!editing ? (
            <>
              {/* User info */}
              <div style={{ padding: "8px 14px 10px", borderBottom: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{displayName}</div>
                <div style={{ fontSize: 11, opacity: 0.35 }}>{user?.email}</div>
                {personProfile?.squads?.name && (
                  <div style={{ fontSize: 11, opacity: 0.3, marginTop: 2 }}>
                    {personProfile.squads.name} · {personProfile.roles?.name}
                  </div>
                )}
              </div>

              {/* Edit profile */}
              <button
                onClick={startEditing}
                style={menuBtn}
                onMouseEnter={e => e.target.style.background = "rgba(0,0,0,0.04)"}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >
                Edit profile
              </button>

              {/* Sign out */}
              <button
                onClick={() => { setOpen(false); onSignOut(); }}
                style={menuBtn}
                onMouseEnter={e => e.target.style.background = "rgba(0,0,0,0.04)"}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >
                Sign out
              </button>
            </>
          ) : (
            /* ── Edit mode ── */
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.35 }}>
                Edit profile
              </div>

              {/* Name */}
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Display name"
                style={inputStyle}
                autoFocus
              />

              {/* Squad */}
              <select
                value={editSquadId}
                onChange={e => setEditSquadId(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
              >
                <option value="" disabled>Squad</option>
                {squads.map(s => (
                  <option key={s.id} value={s.id} style={{ background: c.bg, color: c.text }}>{s.name}</option>
                ))}
              </select>

              {/* Role */}
              <select
                value={editRoleId}
                onChange={e => setEditRoleId(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
              >
                <option value="" disabled>Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id} style={{ background: c.bg, color: c.text }}>{r.name}</option>
                ))}
              </select>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 500, fontFamily: "inherit",
                    background: "transparent", border: `1px solid ${c.border}`,
                    borderRadius: layout.radiusSm, color: c.text, cursor: "pointer",
                  }}
                >Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim() || !editSquadId || !editRoleId}
                  style={{
                    flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    background: saving ? c.accentDim : c.accent,
                    border: "none", borderRadius: layout.radiusSm, color: c.textOnAccent, cursor: saving ? "wait" : "pointer",
                  }}
                >{saving ? "Saving…" : "Save"}</button>
              </div>
            </div>
          )}
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
      position: "relative", width: 200, cursor: "pointer",
      display: "flex", alignItems: "center",
      padding: `8px ${space[3] + 2}px`, gap: 9,
      borderRadius: layout.radiusMd, border: `1px solid rgba(0,0,0,0.12)`,
      background: `linear-gradient(135deg, ${c.surfaceAlt} 0%, ${c.surfaceAlt}C0 100%)`,
      transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, border-color ${motion.interaction.duration} ${motion.interaction.easing}, color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}, transform ${motion.interaction.duration} ${motion.interaction.easing}, opacity ${motion.interaction.duration} ${motion.interaction.easing}`,
      boxShadow: `inset 0 1px 0 rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)`,
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
        fontFamily: typo.monoSm.font, fontSize: 11,
        fontWeight: 600,
        color: c.textDim, background: c.surface,
        border: `1px solid ${c.border}`, padding: "1px 5px",
        borderRadius: layout.radiusTag + 1,
        lineHeight: 1.4, flexShrink: 0,
        boxShadow: `0 1px 0 ${c.border}`,
      }}>⌘K</span>
    </div>
  );
}
