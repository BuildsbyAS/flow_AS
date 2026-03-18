// Flow — Main App Shell
import React, { useState, useCallback, useRef, useMemo } from "react";
import { setTheme, body } from "./styles/theme";
import AnimStyles from "./components/AnimStyles";
import CommandPalette from "./components/CommandPalette";
import ShortcutHintBar from "./components/ShortcutHintBar";
import useKeyboard from "./hooks/useKeyboard";
import { tactile } from "./hooks/useTactile";
import { seedSquads, seedRoles, seedPeople, seedProjects, seedCommitments, seedHistory, weekConfig } from "./data/seed";
import { Header, NAV, getCycleStage, getStageConfig, getAttentionItems } from "./components/AppShell";
import SummaryView from "./views/SummaryView";
import PulseView from "./views/PulseView";
import HumansView from "./views/HumansView";
import ProjectsView from "./views/ProjectsView";
import PeopleDeepDive from "./views/PeopleDeepDive";
import SettingsView from "./views/SettingsView";
import GuideView from "./views/GuideView";

export default function FlowApp() {
  const [activeTab, setActiveTab] = useState("pulse");
  const [navPayload, setNavPayload] = useState(null);
  const darkMode = true;
  const [squads, setSquads] = useState(seedSquads);
  const [roles, setRoles] = useState(seedRoles);
  const [people, setPeople] = useState(seedPeople);
  const [projects, setProjects] = useState(seedProjects);
  const [commitments, setCommitments] = useState(seedCommitments);

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
  }, [weekOffset]);
  const handleWeekPrev = useCallback(() => setWeekOffset(w => Math.max(w - 1, -weekConfig.historyWeeks.length)), []);
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
    Object.entries(seedHistory).forEach(([projId, weeks]) => {
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
  const [globalFilters, setGlobalFilters] = useState({ owner: "", squad: "", person: "" });
  const [pendingFilters, setPendingFilters] = useState({ owner: "", squad: "", person: "" });
  const applyFilters = useCallback(() => setGlobalFilters({ ...pendingFilters }), [pendingFilters]);
  const clearGlobalFilters = useCallback(() => { const empty = { owner: "", squad: "", person: "" }; setGlobalFilters(empty); setPendingFilters(empty); }, []);
  const globalFilterCount = useMemo(() => Object.values(globalFilters).filter(Boolean).length, [globalFilters]);
  const allSquads = useMemo(() => [...new Set(projects.map(p => p.squad).filter(Boolean))].sort(), [projects]);
  // Contextual options: filter Person/Owner by selected Squad
  const allOwners = useMemo(() => {
    const src = pendingFilters.squad ? projects.filter(p => p.squad === pendingFilters.squad) : projects;
    return [...new Set(src.map(p => p.owner).filter(Boolean))].sort();
  }, [projects, pendingFilters.squad]);
  const allPeople = useMemo(() => {
    const src = pendingFilters.squad ? people.filter(p => p.squad === pendingFilters.squad) : people;
    return src.map(p => p.name).sort();
  }, [people, pendingFilters.squad]);

  const setGoBack = useCallback((fn) => { goBackRef.current = fn; }, []);

  const handleTabSwitch = useCallback((key) => {
    setActiveTab(key);
    setNavPayload(null);
    setDetailLabel(null);
    goBackRef.current = null;
    tactile.click();
  }, []);

  const handleBack = useCallback(() => {
    if (goBackRef.current) {
      goBackRef.current();
      setDetailLabel(null);
      goBackRef.current = null;
    }
  }, []);

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
    { key: "3", fn: () => handleTabSwitch("focus") },
    { key: "4", fn: () => handleTabSwitch("projects") },
    { key: "5", fn: () => handleTabSwitch("people") },
    { key: "6", fn: () => handleTabSwitch("settings") },
    { key: "7", fn: () => handleTabSwitch("guide") },
    { key: "k", ctrl: true, fn: () => { setCmdOpen(v => !v); tactile.cmdOpen(); }, force: true },
    { key: "k", meta: true, fn: () => { setCmdOpen(v => !v); tactile.cmdOpen(); }, force: true },
    { key: "Escape", fn: () => { if (cmdOpen) { setCmdOpen(false); } else if (suppressBackRef.current) { /* child handled it */ } else if (goBackRef.current) handleBack(); }, force: true },
    { key: "f", fn: () => { setCmdOpen(true); tactile.cmdOpen(); } },
    { key: "/", fn: () => { if (searchRef.current) searchRef.current.focus(); }, force: true },
    { key: "?", fn: () => setShowHints(v => !v) },
  ], [activeTab, cmdOpen]);

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
      />

      {/* ═══ MAIN CANVAS ═══ */}
      <main key={activeTab} className="flow-page" style={{ maxWidth: 1260, margin: "0 auto", padding: "24px 40px 60px", overflow: "hidden" }}>
        {activeTab === "summary" && <SummaryView history={seedHistory} commitments={commitments} projects={projects} people={people} selectedWeekKey={selectedWeekKey} />}
        {activeTab === "pulse" && <PulseView commitments={effectiveCommitments} projects={projects} people={people} onNavigate={handleNavigate} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} />}
        {activeTab === "focus" && <HumansView key={navPayload?.person || navPayload || "focus"} commitments={effectiveCommitments} setCommitments={isHistorical ? null : setCommitments} projects={projects} people={people} initialPerson={navPayload?.person || navPayload} initialCommitIdx={navPayload?.commitIdx ?? null} setDetailLabel={setDetailLabel} setGoBack={setGoBack} setIsLocked={setIsLocked} searchRef={searchRef} globalFilters={globalFilters} suppressBackRef={suppressBackRef} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} />}
        {activeTab === "projects" && <ProjectsView key={navPayload || "proj"} projects={projects} setProjects={setProjects} commitments={effectiveCommitments} people={people} history={seedHistory} initialId={navPayload} onNavigate={handleNavigate} setDetailLabel={setDetailLabel} setGoBack={setGoBack} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} />}
        {activeTab === "people" && <PeopleDeepDive key={navPayload || "ppl"} people={people} commitments={effectiveCommitments} projects={projects} history={seedHistory} initialPerson={navPayload} onNavigate={handleNavigate} setDetailLabel={setDetailLabel} setGoBack={setGoBack} searchRef={searchRef} globalFilters={globalFilters} isHistorical={isHistorical} selectedWeekKey={selectedWeekKey} />}
        {activeTab === "settings" && <SettingsView squads={squads} setSquads={setSquads} roles={roles} setRoles={setRoles} people={people} setPeople={setPeople} projects={projects} setProjects={setProjects} commitments={commitments} />}
        {activeTab === "guide" && <GuideView />}
      </main>

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
    </div>
  );
}
