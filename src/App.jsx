// Flow — Main App Shell
import React, { useState, useCallback, useRef, useMemo } from "react";
import { setTheme, c, body } from "./styles/theme";
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
import { seedHistory as fallbackHistory, weekConfig as fallbackWeekConfig } from "./data/seed";
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

export default function FlowApp() {
  // ── Auth ──
  const auth = useAuth();

  // ── Auth gates ──
  if (auth.loading) {
    return (
      <div style={{
        minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <FlowLogo size={100} />
      </div>
    );
  }

  // Skip auth on localhost for dev, or when built with VITE_SKIP_AUTH
  // To preview login screen on localhost, set this to false temporarily
  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || import.meta.env.VITE_SKIP_AUTH === "true";

  if (!isDev && !auth.isAuthenticated) {
    return <LoginScreen onSignIn={auth.signIn} />;
  }

  if (!isDev && auth.needsOnboarding) {
    return <OnboardingScreen user={auth.user} onComplete={auth.completeOnboarding} />;
  }

  return <FlowDashboard auth={auth} />;
}

function FlowDashboard({ auth }) {
  const [activeTab, setActiveTab] = useState("pulse");
  const [navPayload, setNavPayload] = useState(null);
  const darkMode = true;
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

  // Use Supabase data when loaded, fallbacks for safety
  const history = supabaseHistory && Object.keys(supabaseHistory).length > 0 ? supabaseHistory : fallbackHistory;
  const weekConfig = supabaseWeekConfig || fallbackWeekConfig;

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
  }, [weekOffset]);
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
            title: e.task || "", outcome: "done",
          });
        });
      }
    });
    return Object.entries(personMap).map(([person, items]) => ({
      person, items, buffer: "", deselected: -1, lockedAt: "historical",
    }));
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

  const handleTerminalUnlock = useCallback((moduleKey) => {
    sessionStorage.setItem("flow_terminal_unlocked", "true");
    setTerminalUnlocked(true);
    if (moduleKey === "settings" || moduleKey === "logs") {
      setActiveTab(moduleKey);
    }
  }, []);

  const handleTabSwitch = useCallback((key) => {
    // Flush any unsaved commit drafts to DB before leaving
    flushDirtyToDB();
    // Gate settings/logs behind terminal
    if ((key === "settings" || key === "logs" || key === "rant") && !terminalUnlocked) {
      setActiveTab("terminal");
    } else {
      setActiveTab(key);
    }
    setNavPayload(null);
    setDetailLabel(null);
    goBackRef.current = null;
    tactile.click();
  }, [flushDirtyToDB, terminalUnlocked]);

  const handleBack = useCallback(() => {
    if (goBackRef.current) {
      flushDirtyToDB();
      goBackRef.current();
      setDetailLabel(null);
      goBackRef.current = null;
    }
  }, [flushDirtyToDB]);

  const handleNavigate = useCallback((tab, id) => {
    setNavPayload(id);
    setActiveTab(tab);
  }, []);

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
    { key: "2", fn: () => handleTabSwitch("pulse") },
    { key: "3", fn: () => handleTabSwitch("commit") },
    { key: "4", fn: () => handleTabSwitch("projects") },
    { key: "5", fn: () => handleTabSwitch("people") },
    { key: "6", fn: () => handleTabSwitch("guide") },
    { key: "k", ctrl: true, fn: () => { setCmdOpen(v => !v); tactile.cmdOpen(); }, force: true },
    { key: "k", meta: true, fn: () => { setCmdOpen(v => !v); tactile.cmdOpen(); }, force: true },
    { key: "Escape", fn: () => { if (cmdOpen) { setCmdOpen(false); } else if (suppressBackRef.current) { /* child handled it */ } else if (goBackRef.current) handleBack(); }, force: true },
    { key: "f", fn: () => { setCmdOpen(true); tactile.cmdOpen(); } },
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
          opacity: 0.4,
          animation: "flow-load-fade-in 0.6s ease-out both",
          animationDelay: "0.2s",
        }}>Flow</div>

        {/* Progress bar — fixed to bottom */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: 6,
          background: "rgba(255,255,255,0.03)", overflow: "hidden",
        }}>
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(90deg, #A855F7, #00F0FF, #FF2D78, #A855F7)",
            backgroundSize: "200% 100%",
            animation: "flow-load-bar 1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#ef4444" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Failed to load data</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body, position: "relative" }}>
      <AnimStyles />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ═══ TEXTURE LAYERS — ambient background ═══ */}
      <div className="flow-texture-grid" />
      <div className="flow-texture-blob flow-blob-1" />
      <div className="flow-texture-blob flow-blob-2" />
      <div className="flow-texture-blob flow-blob-3" />
      <div className="flow-texture-noise" />

      {/* ═══ SINGLE HEADER ═══ */}
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

      {/* ═══ TERMINAL VIEW (full-bleed, outside main) ═══ */}
      {activeTab === "terminal" && <TerminalView onUnlock={handleTerminalUnlock} unlockedSections={terminalUnlocked} auth={auth} appSettings={appSettings} setAppSettings={setAppSettings} />}

      {/* ═══ MAIN CANVAS ═══ */}
      {activeTab !== "terminal" && (
      <main key={activeTab} className="flow-page" style={{ maxWidth: 1260, margin: "0 auto", padding: "24px 40px 60px", overflow: "hidden" }}>
        {activeTab === "summary" && <SummaryView history={history} commitments={commitments} projects={projects} people={people} selectedWeekKey={selectedWeekKey} weekConfig={weekConfig} />}
        {activeTab === "pulse" && <PulseView commitments={effectiveCommitments} projects={projects} people={people} onNavigate={handleNavigate} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} weekConfig={weekConfig} appSettings={appSettings} />}
        {activeTab === "commit" && <HumansView key={navPayload?.person || navPayload || "commit"} commitments={effectiveCommitments} setCommitments={isHistorical ? null : setCommitments} projects={projects} people={people} initialPerson={navPayload?.person || navPayload} initialCommitIdx={navPayload?.commitIdx ?? null} setDetailLabel={setDetailLabel} setGoBack={setGoBack} setIsLocked={setIsLocked} searchRef={searchRef} globalFilters={globalFilters} suppressBackRef={suppressBackRef} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} onSave={flushDirtyToDB} />}
        {activeTab === "projects" && <ProjectsView key={navPayload || "proj"} projects={projects} setProjects={setProjects} commitments={effectiveCommitments} people={people} history={history} weekConfig={weekConfig} initialId={navPayload} onNavigate={handleNavigate} setDetailLabel={setDetailLabel} setGoBack={setGoBack} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} />}
        {activeTab === "people" && <PeopleDeepDive key={navPayload || "ppl"} people={people} commitments={effectiveCommitments} projects={projects} history={history} initialPerson={navPayload} onNavigate={handleNavigate} setDetailLabel={setDetailLabel} setGoBack={setGoBack} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} weekConfig={weekConfig} />}
        {activeTab === "settings" && <SettingsView squads={squads} setSquads={setSquads} roles={roles} setRoles={setRoles} people={people} setPeople={setPeople} projects={projects} setProjects={setProjects} commitments={commitments} />}
        {activeTab === "guide" && (
          <React.Suspense fallback={<div>Loading...</div>}>
            <ErrorCatcher><GuideView onNavigate={handleTabSwitch} /></ErrorCatcher>
          </React.Suspense>
        )}
        {activeTab === "logs" && <LogsView />}
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
      <div style={{ padding: 40, color: "#ef4444", fontFamily: "monospace", fontSize: 13 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Render Error</div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{this.state.error?.message}</pre>
        <pre style={{ whiteSpace: "pre-wrap", opacity: 0.5, marginTop: 8 }}>{this.state.error?.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}
