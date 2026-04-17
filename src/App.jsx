// Flow — Main App Shell
import React, { useState, useCallback, useRef, useMemo } from "react";
import { setTheme, c, body, space } from "./styles/theme";
import AnimStyles from "./components/AnimStyles";
import CommandPalette from "./components/CommandPalette";
import ShortcutHintBar from "./components/ShortcutHintBar";
import useKeyboard from "./hooks/useKeyboard";
import { tactile } from "./hooks/useTactile";
import useSupabaseData from "./hooks/useSupabaseData";
import { useSyncedSetters } from "./hooks/useSyncedSetters";
import useAuth from "./hooks/useAuth";
import LoginScreen from "./components/LoginScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import { Header, NAV, getCycleStage, getStageConfig, getAttentionItems } from "./components/AppShell";
import SummaryView from "./views/SummaryView";
import PulseView from "./views/PulseView";
import HumansView from "./views/HumansView";
import ProjectsView from "./views/ProjectsView";
import PeopleDeepDive from "./views/PeopleDeepDive";
import SettingsView from "./views/SettingsView";
import GuideView from "./views/GuideView";
import LogsView from "./views/LogsView";
import TerminalView from "./views/TerminalView";
import FlowLogo from "./components/FlowLogo";
import SyncToast from "./components/SyncToast";
import DevOverlayProvider from "./components/DevOverlay";

export default function FlowApp() {
  // ── Auth ──
  const auth = useAuth();
  const [signInError, setSignInError] = React.useState(null);
  const [signingIn, setSigningIn] = React.useState(false);

  const handleSignIn = React.useCallback(async () => {
    setSignInError(null);
    setSigningIn(true);
    const result = await auth.signIn();
    if (result?.error) {
      setSignInError(result.error);
      setSigningIn(false);
    }
  }, [auth.signIn]);

  // ── Auth gates ──
  if (auth.loading) {
    return (
      <div style={{
        minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <style>{`
          @keyframes flow-auth-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.06); opacity: 1; }
          }
        `}</style>
        <div style={{ animation: "flow-auth-pulse 2s ease-in-out infinite" }}>
          <FlowLogo size={100} />
        </div>
        <div style={{ marginTop: 20, fontSize: 16, color: c.textDim, fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  // Skip auth on localhost for dev, or when built with VITE_SKIP_AUTH
  // To preview login screen on localhost, set this to false temporarily
  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || import.meta.env.VITE_SKIP_AUTH === "true";

  if (!isDev && !auth.isAuthenticated) {
    return <LoginScreen onSignIn={handleSignIn} loading={signingIn} error={signInError} />;
  }

  if (!isDev && auth.needsOnboarding) {
    return <OnboardingScreen user={auth.user} onComplete={auth.completeOnboarding} />;
  }

  return <DevOverlayProvider><FlowDashboard auth={auth} /></DevOverlayProvider>;
}

function FlowDashboard({ auth }) {
  const [activeTab, setActiveTab] = useState(() => {
    // Honor ?tab=<key> on initial load; also auto-route to Pulse when
    // a Pulse-specific param (?mode=people) is present.
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      const validTabs = NAV.filter(n => !n.separator).map(n => n.key);
      if (tab && validTabs.includes(tab)) return tab;
      if (params.get("mode") === "people" || params.get("mode") === "matrix") return "pulse";
    } catch { /* ignore */ }
    return "summary";
  });
  const [navPayload, setNavPayload] = useState(null);
  const darkMode = false;
  const [terminalUnlocked, setTerminalUnlocked] = useState(() => sessionStorage.getItem("flow_terminal_unlocked") === "true");

  // ── Supabase data (replaces seed.js) ──
  const {
    loading, error,
    squads, setSquads: rawSetSquads,
    roles, setRoles: rawSetRoles,
    people, setPeople: rawSetPeople,
    projects, setProjects: rawSetProjects,
    commitments, setCommitments: rawSetCommitments,
    history: supabaseHistory,
    weekConfig: supabaseWeekConfig,
    appSettings, setAppSettings,
    lookups,
  } = useSupabaseData();

  // Use Supabase data directly — no seed fallbacks
  const history = supabaseHistory && Object.keys(supabaseHistory).length > 0 ? supabaseHistory : {};
  const weekConfig = supabaseWeekConfig || (() => {
    // Fallback: compute Monday of current week so week navigation math works correctly
    const now = new Date(); const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    const ws = monday.toISOString().split('T')[0];
    return { weeks: [], currentWeek: null, historyWeeks: [], weekStart: ws, weekOf: "", today: new Date().toISOString().split('T')[0] };
  })();

  // ── Synced setters: optimistic UI + background Supabase writes ──
  const {
    setSquads, setRoles, setPeople, setProjects, setCommitments,
    flushDirtyToDB,
  } = useSyncedSetters({
    rawSetSquads, rawSetRoles, rawSetPeople, rawSetProjects, rawSetCommitments,
    squads, roles, people, projects, commitments,
    lookups,
    weekConfig: supabaseWeekConfig,
    onSyncStart: () => window.__flowSyncToast?.show(),
    onSyncDone: (name) => window.__flowSyncToast?.done(name),
  });

  const [detailLabel, setDetailLabel] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const goBackRef = useRef(null);
  const suppressBackRef = useRef(false);
  const searchRef = useRef(null);
  const [showHints, setShowHints] = useState(false);

  // ── Week navigation ──
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekLabel = useMemo(() => {
    const base = new Date(weekConfig.weekStart + "T00:00:00");
    base.setDate(base.getDate() + weekOffset * 7);
    return base.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [weekOffset, weekConfig]);
  const handleWeekPrev = useCallback(() => setWeekOffset(w => Math.max(w - 1, -weekConfig.historyWeeks.length)), [weekConfig]);
  const handleWeekNext = useCallback(() => setWeekOffset(w => Math.min(w + 1, 0)), []);

  const selectedWeekKey = useMemo(() => {
    if (weekOffset === 0) return "current";
    const idx = weekConfig.historyWeeks.length + weekOffset;
    return weekConfig.historyWeeks[idx] || "current";
  }, [weekOffset, weekConfig]);
  const isHistorical = weekOffset < 0;

  // Derive commitments-like data from history for past weeks
  const effectiveCommitments = useMemo(() => {
    if (weekOffset === 0) return commitments;
    const personMap = {};
    Object.entries(history).forEach(([projId, weeks]) => {
      const wk = weeks.find(w => w.week === selectedWeekKey);
      if (wk) {
        wk.entries.forEach(e => {
          if (!personMap[e.person]) personMap[e.person] = [];
          personMap[e.person].push({
            type: e.type, project: projId, stage: e.stage,
            title: e.task || "", outcome: e.outcome || null,
          });
        });
      }
    });
    const emptyItem = { title: "", type: "", project: "", stage: "" };
    return Object.entries(personMap).map(([person, items]) => {
      while (items.length < 3) items.push({ ...emptyItem });
      return { person, items, buffer: "", deselected: -1, lockedAt: "historical" };
    });
  }, [weekOffset, selectedWeekKey, commitments]);

  // ── Global filters (header bar) ──
  const [globalFilters, setGlobalFilters] = useState({ owner: [], squad: [], person: [] });
  const [pendingFilters, setPendingFilters] = useState({ owner: [], squad: [], person: [] });
  const applyFilters = useCallback(() => setGlobalFilters({ ...pendingFilters }), [pendingFilters]);
  const clearGlobalFilters = useCallback(() => { const empty = { owner: [], squad: [], person: [] }; setGlobalFilters(empty); setPendingFilters(empty); }, []);
  const globalFilterCount = useMemo(() => Object.values(globalFilters).filter(v => v.length > 0).length, [globalFilters]);
  const allSquads = useMemo(() => [...new Set(projects.map(p => p.squad).filter(Boolean))].sort(), [projects]);
  // Contextual options: filter Person/Owner by selected Squad
  const allOwners = useMemo(() => {
    const src = pendingFilters.squad.length > 0 ? projects.filter(p => pendingFilters.squad.includes(p.squad)) : projects;
    return [...new Set(src.map(p => p.owner).filter(Boolean))].sort();
  }, [projects, pendingFilters.squad]);
  const allPeople = useMemo(() => {
    const src = pendingFilters.squad.length > 0 ? people.filter(p => pendingFilters.squad.includes(p.squad)) : people;
    return src.map(p => p.name).sort();
  }, [people, pendingFilters.squad]);

  const setGoBack = useCallback((fn) => { goBackRef.current = fn; }, []);
  const returnContextRef = useRef(null);

  const handleTerminalUnlock = useCallback((moduleKey) => {
    sessionStorage.setItem("flow_terminal_unlocked", "true");
    setTerminalUnlocked(true);
    if (moduleKey === "settings" || moduleKey === "logs") {
      flushDirtyToDB();
      setActiveTab(moduleKey);
      setNavPayload(null);
      setDetailLabel(null);
      goBackRef.current = null;
    }
  }, [flushDirtyToDB]);

  const [terminalResetKey, setTerminalResetKey] = useState(0);

  const handleTabSwitch = useCallback((key) => {
    // Flush any unsaved commit drafts to DB before leaving
    flushDirtyToDB();
    // If already on terminal and clicking terminal again, reset to root
    if (key === "terminal" && activeTab === "terminal") {
      setTerminalResetKey(k => k + 1);
      tactile.click();
      return;
    }
    // Gate settings/logs/rant behind terminal — these render inside TerminalView
    if ((key === "settings" || key === "logs" || key === "rant") && !terminalUnlocked) {
      setActiveTab("terminal");
      setNavPayload(null);
    } else if (key === "rant") {
      // Rant only renders inside TerminalView as a module, not as a top-level tab
      setActiveTab("terminal");
      setNavPayload("rant");
    } else {
      setActiveTab(key);
      setNavPayload(null);
    }
    setDetailLabel(null);
    goBackRef.current = null;
    if (returnContextRef.current) returnContextRef.current = null;
    tactile.click();
  }, [flushDirtyToDB, terminalUnlocked, activeTab]);

  const handleBack = useCallback(() => {
    flushDirtyToDB();
    const ret = returnContextRef.current;
    if (ret && ret.tab) {
      returnContextRef.current = null;
      setNavPayload(ret.id || null);
      setActiveTab(ret.tab);
      setDetailLabel(null);
      goBackRef.current = null;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }
    if (goBackRef.current) {
      goBackRef.current();
      setDetailLabel(null);
      goBackRef.current = null;
    }
  }, [flushDirtyToDB]);

  // Intercept browser back button: keep users inside the app and route
  // the gesture to in-app back navigation (deep-dive → list) instead of
  // exiting to about:blank. Push a sentinel entry on mount so the first
  // back press has somewhere to land, and re-push after each pop.
  React.useEffect(() => {
    window.history.pushState({ flowInApp: true }, "");
    const onPop = () => {
      if (goBackRef.current) handleBack();
      window.history.pushState({ flowInApp: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [handleBack]);

  const handleNavigate = useCallback((tab, id, returnTo) => {
    flushDirtyToDB();
    returnContextRef.current = returnTo || null;
    setNavPayload(id);
    setActiveTab(tab);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [flushDirtyToDB]);

  const c = setTheme(darkMode);
  const activeNavItem = NAV.find(n => n.key === activeTab);

  const cycleStage = useMemo(() => getCycleStage(commitments), [commitments]);
  const cycleCfg = getStageConfig(cycleStage);
  const attentionItems = useMemo(() => getAttentionItems(commitments, projects), [commitments, projects]);

  const handlePrimaryAction = useCallback(() => {
    handleTabSwitch(cycleCfg.targetTab);
  }, [cycleCfg.targetTab, handleTabSwitch]);

  useKeyboard([
    { key: "1", fn: () => handleTabSwitch("summary") },
    { key: "2", fn: () => handleTabSwitch("projects") },
    { key: "3", fn: () => handleTabSwitch("people") },
    { key: "4", fn: () => handleTabSwitch("pulse") },
    { key: "5", fn: () => handleTabSwitch("commit") },
    { key: "6", fn: () => handleTabSwitch("guide") },
    { key: "k", ctrl: true, fn: () => { setCmdOpen(v => !v); tactile.cmdOpen(); }, force: true },
    { key: "k", meta: true, fn: () => { setCmdOpen(v => !v); tactile.cmdOpen(); }, force: true },
    { key: "Escape", fn: () => { if (cmdOpen) { setCmdOpen(false); } else if (suppressBackRef.current) { /* child handled it */ } else if (goBackRef.current) handleBack(); }, force: true },
    // Removed bare "f" shortcut — conflicted with typing F in any input across
    // the app (e.g. new-project name field). Cmd/Ctrl+K is the canonical way
    // to open the command palette.
    { key: "/", fn: () => { if (searchRef.current) searchRef.current.focus(); }, force: true },
    { key: "?", fn: () => setShowHints(v => !v) },
    { key: "t", fn: () => handleTabSwitch("terminal") },
  ], [activeTab, cmdOpen]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        <style>{`
          @keyframes flow-load-pulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.08); opacity: 1; }
          }
          @keyframes flow-load-bar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes flow-load-fade-in {
            0% { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Logo — animated, large */}
        <div style={{
          animation: "flow-load-pulse 2s ease-in-out infinite",
          marginBottom: 32,
        }}>
          <FlowLogo size={120} />
        </div>

        {/* "Flow" text */}
        <div style={{
          fontSize: 28, fontWeight: 700, letterSpacing: "-0.04em",
          color: c.textDim,
          animation: "flow-load-fade-in 0.6s ease-out both",
          animationDelay: "0.2s",
        }}>Flow</div>

        {/* Progress bar — fixed to bottom */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: 6,
          background: "rgba(0,0,0,0.04)", overflow: "hidden",
        }}>
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(90deg, ${c.accent}00, ${c.accent}, ${c.accent}00)`,
            backgroundSize: "200% 100%",
            animation: "flow-load-bar 1.4s cubic-bezier(0.22, 1, 0.36, 1) infinite",
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40, background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 12, maxWidth: 400 }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: c.red }}>Failed to load data</div>
          <div style={{ fontSize: 16, color: c.textMid, marginBottom: 8 }}>{error}</div>
          <div style={{ fontSize: 14, color: c.textDim, marginBottom: 24 }}>If the problem persists, check your connection.</div>
          <button
            className="flow-btn"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px", borderRadius: 8,
              background: c.surfaceAlt, border: `1px solid ${c.borderHover}`,
              color: c.text, fontSize: 16, fontWeight: 500, fontFamily: body, cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body, position: "relative" }}>
      <AnimStyles />

      {/* ═══ SINGLE HEADER ═══ (hidden for dark-themed Terminal view) */}
      {activeTab !== "terminal" && (
      <Header
        weekLabel={currentWeekLabel}
        weekOffset={weekOffset}
        onWeekPrev={handleWeekPrev}
        onWeekNext={handleWeekNext}
        onLogoClick={() => handleTabSwitch("pulse")}
        detailLabel={detailLabel}
        onBack={handleBack}
        breadcrumbLabel={activeNavItem?.label}
        activeTab={activeTab}
        onTabSwitch={handleTabSwitch}
        onCmdOpen={() => { setCmdOpen(true); tactile.cmdOpen(); }}
        globalFilters={globalFilters}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        applyFilters={applyFilters}
        clearGlobalFilters={clearGlobalFilters}
        globalFilterCount={globalFilterCount}
        allOwners={allOwners}
        allSquads={allSquads}
        allPeople={allPeople}
        currentUser={auth}
      />
      )}

      {/* ═══ TERMINAL VIEW (full-bleed, outside main) ═══ */}
      {activeTab === "terminal" && <TerminalView onUnlock={handleTerminalUnlock} unlockedSections={terminalUnlocked} auth={auth} appSettings={appSettings} setAppSettings={setAppSettings} resetKey={terminalResetKey} initialModule={navPayload} onConsumePayload={() => setNavPayload(null)} />}

      {/* ═══ MAIN CANVAS ═══ */}
      {activeTab !== "terminal" && (
      <main key={activeTab} className="flow-page" style={{ maxWidth: 1440, margin: "0 auto", padding: `${space[7] - 4}px ${space[7]}px ${space[8] + 20}px` }}>
        <ErrorCatcher key={activeTab}>
          {activeTab === "summary" && <SummaryView loading={loading} error={error} history={history} commitments={effectiveCommitments} projects={projects} people={people} squads={squads} selectedWeekKey={selectedWeekKey} weekConfig={weekConfig} globalFilters={globalFilters} isHistorical={isHistorical} onNavigate={handleNavigate} cycleStage={cycleStage} />}
          {activeTab === "pulse" && <PulseView loading={loading} error={error} commitments={effectiveCommitments} projects={projects} people={people} history={history} onNavigate={handleNavigate} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} weekConfig={weekConfig} appSettings={appSettings} />}
          {activeTab === "commit" && <HumansView key={navPayload?.person || navPayload || "commit"} loading={loading} error={error} commitments={effectiveCommitments} setCommitments={isHistorical ? null : setCommitments} projects={projects} people={people} initialPerson={navPayload?.person || navPayload} initialCommitIdx={navPayload?.commitIdx ?? null} setDetailLabel={setDetailLabel} setGoBack={setGoBack} setIsLocked={setIsLocked} searchRef={searchRef} globalFilters={globalFilters} suppressBackRef={suppressBackRef} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} weekConfig={weekConfig} onSave={flushDirtyToDB} />}
          {activeTab === "projects" && <ProjectsView key={navPayload || "proj"} projects={projects} setProjects={setProjects} commitments={effectiveCommitments} people={people} squads={squads} history={history} weekConfig={weekConfig} initialId={navPayload} onNavigate={handleNavigate} setDetailLabel={setDetailLabel} setGoBack={setGoBack} searchRef={searchRef} globalFilters={globalFilters} suppressBackRef={suppressBackRef} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} />}
          {activeTab === "people" && <PeopleDeepDive key={navPayload || "ppl"} loading={loading} error={error} people={people} commitments={effectiveCommitments} projects={projects} history={history} initialPerson={navPayload} onNavigate={handleNavigate} setDetailLabel={setDetailLabel} setGoBack={setGoBack} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} weekConfig={weekConfig} />}
          {activeTab === "settings" && <SettingsView squads={squads} setSquads={setSquads} roles={roles} setRoles={setRoles} people={people} setPeople={setPeople} projects={projects} setProjects={setProjects} commitments={commitments} />}
          {activeTab === "guide" && (
            <React.Suspense fallback={<div style={{ padding: 40, color: c.textDim, fontFamily: body, fontSize: 16, textAlign: "center" }}>Loading...</div>}>
              <GuideView onNavigate={handleTabSwitch} />
            </React.Suspense>
          )}
          {activeTab === "logs" && <LogsView />}
        </ErrorCatcher>
      </main>
      )}

      {/* ═══ COMMAND PALETTE — Cmd/Ctrl+K ═══ */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onTabSwitch={handleTabSwitch}
        projects={projects}
        people={people}
        onNavigate={handleNavigate}
      />

      {showHints && <ShortcutHintBar activeTab={activeTab} hasDetail={!!detailLabel} isLocked={isLocked} visible={showHints} />}

      {/* Sync toast — terminal-style notification */}
      <SyncToast />
    </div>
  );
}

class ErrorCatcher extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, color: c.red, fontFamily: body, fontSize: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Render Error</div>
        <pre style={{ whiteSpace: "pre-wrap", color: c.textMid }}>{this.state.error?.message}</pre>
        <pre style={{ whiteSpace: "pre-wrap", color: c.textDim, marginTop: 8 }}>{this.state.error?.stack}</pre>
        <button
          className="flow-btn"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 16, padding: "8px 20px", borderRadius: 8,
            background: c.surfaceAlt, border: `1px solid ${c.border}`,
            color: c.text, fontSize: 14, fontFamily: body, cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
    return this.props.children;
  }
}
