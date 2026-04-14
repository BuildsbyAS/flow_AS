// Flow — People Deep Dive (Phase 4: Coaching Console, Signal Cards, Terminal Log, Telemetry Hero)
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { c, motion, layout, typo, space, typeConfig, phaseColors as getPhaseColors, outcomeConfig, entityColors } from "../styles/theme";
import { Tag, EmptyState, Surface, Label, Btn, Sel, StatCell } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import useDevLabel from "../hooks/useDevLabel";

/* ── helpers ──────────────────────────────────────────────── */

function computeMomentum(personName, commitments, history, weekConfig) {
  const cm = commitments.find(x => x.person === personName);
  const weeks = weekConfig?.historyWeeks || [];
  const weekItems = weeks.map(w => {
    const wkItems = [];
    Object.values(history || {}).forEach(ph =>
      ph.forEach(wk => {
        if (wk.week === w) wk.entries.filter(e => e.person === personName).forEach(e => wkItems.push(e));
      })
    );
    return wkItems;
  });
  const items = cm ? cm.items.filter((_, idx) => cm.deselected !== idx).filter(it => it.title?.trim() || it.project) : [];
  const hasCurrentItems = items.length > 0;
  const firstActiveWk = weekItems.findIndex(wi => wi.length > 0);
  const hasAnyHistory = firstActiveWk >= 0 || hasCurrentItems;
  if (!hasAnyHistory) return null;
  const scores = [];
  const startIdx = firstActiveWk >= 0 ? firstActiveWk : weekItems.length;
  for (let wi = startIdx; wi < weekItems.length; wi++) {
    if (weekItems[wi].length > 0) {
      const done = weekItems[wi].filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
      scores.push((done / weekItems[wi].length) * 100);
    }
  }
  if (hasCurrentItems) {
    const done = items.filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
    const lockScore = cm?.lockedAt ? 35 : 0;
    const completionScore = items.length > 0 ? (done / items.length) * 65 : 0;
    scores.push(lockScore + completionScore);
  }
  if (scores.length === 0) return null;
  return Math.min(100, Math.max(0, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)));
}

function computePersonData(person, commitments, projects, history, weekConfig) {
  const cm = commitments.find(x => x.person === person);
  const tc = typeConfig();
  const pc = getPhaseColors();
  const oc = outcomeConfig();
  const weeks = weekConfig?.historyWeeks || [];

  const currentItems = cm
    ? cm.items.slice(0, 3).filter((it, i) => cm.deselected !== i && (it.title?.trim() || it.project)).map(it => ({ ...it, person }))
    : [];

  const deselectedItems = cm && cm.deselected >= 0
    ? [{ ...cm.items[cm.deselected], person, deselectedIdx: cm.deselected }]
    : [];

  const hasBuffer = cm && cm.buffer?.trim();

  const thisWeekTypes = { BUILD: 0, JAM: 0 };
  currentItems.forEach(it => { if (thisWeekTypes[it.type] !== undefined) thisWeekTypes[it.type]++; });

  const weeklyData = weeks.map(week => {
    const items = [];
    Object.entries(history).forEach(([projId, projHist]) => {
      projHist.forEach(wk => {
        if (wk.week === week) {
          wk.entries.filter(e => e.person === person).forEach(e => {
            const projObj = projects.find(p => p.id === projId);
            items.push({ ...e, project: projId, projectName: projObj?.name || projId });
          });
        }
      });
    });
    const types = { BUILD: 0, JAM: 0 };
    items.forEach(it => { if (types[it.type] !== undefined) types[it.type]++; });
    return { week, items, types, total: items.length };
  });

  weeklyData.push({
    week: "This wk",
    items: currentItems,
    types: thisWeekTypes,
    total: currentItems.length,
    isCurrent: true,
  });

  const projectMap = {};
  currentItems.forEach(it => {
    if (!it.project) return;
    if (!projectMap[it.project]) projectMap[it.project] = [];
    projectMap[it.project].push({ week: "This wk", type: it.type, stage: it.stage, task: it.title, isCurrent: true });
  });
  weeklyData.filter(w => !w.isCurrent).forEach(w => {
    w.items.forEach(entry => {
      if (!projectMap[entry.project]) projectMap[entry.project] = [];
      projectMap[entry.project].push({ week: w.week, type: entry.type, stage: entry.stage, task: entry.task, isCurrent: false });
    });
  });

  const projectTimeline = Object.entries(projectMap).sort((a, b) => {
    const aCurr = a[1].some(e => e.isCurrent);
    const bCurr = b[1].some(e => e.isCurrent);
    if (aCurr !== bCurr) return aCurr ? -1 : 1;
    return b[1].length - a[1].length;
  });

  const totalHistoryItems = weeklyData.filter(w => !w.isCurrent).reduce((s, w) => s + w.total, 0);

  // Only count weeks from the person's first activity onward
  const firstActiveIdx = weeklyData.findIndex(w => w.total > 0);
  const relevantWeeks = firstActiveIdx >= 0 ? weeklyData.slice(firstActiveIdx) : [];
  const weeksActive = relevantWeeks.filter(w => w.total > 0).length;
  const weeksEligible = relevantWeeks.length;

  // Delegate to shared helper to keep list-card and detail-view momentum in sync
  const momentum = computeMomentum(person, commitments, history, weekConfig);

  const scopeChurnEvents = [];
  if (deselectedItems.length > 0) {
    deselectedItems.forEach(d => {
      scopeChurnEvents.push({ type: "deselect", label: `Dropped: ${d.title || d.project}`, week: "This wk" });
    });
  }
  if (hasBuffer) {
    scopeChurnEvents.push({ type: "buffer", label: `Buffer: ${cm.buffer}`, project: cm.bufferProject, week: "This wk" });
  }

  return {
    cm, currentItems, deselectedItems, hasBuffer, thisWeekTypes,
    weeklyData, projectTimeline, projectMap, totalHistoryItems,
    weeksActive, weeksEligible, momentum, scopeChurnEvents, tc, pc, oc,
  };
}



/* ═══════════════════════════════════════════════════════════ */
/*  PEOPLE DEEP DIVE                                         */
/* ═══════════════════════════════════════════════════════════ */

const PeopleDeepDive = ({ people, commitments, projects, history, onNavigate, initialPerson, setDetailLabel, setGoBack, searchRef, isHistorical, selectedWeekKey, weekConfig: weekConfigProp, globalFilters = {} }) => {
  const devRef = useDevLabel('Person coaching console with telemetry hero, momentum chart, and project timeline');
  const weekConfig = weekConfigProp || { weeks: [], currentWeek: null, historyWeeks: [] };
  const [selectedPerson, setSelectedPerson] = useState(initialPerson || null);

  const initParams = useRef(new URLSearchParams(window.location.search)).current;
  const [search, setSearch] = useState(initParams.get("q") || "");
  const [fSquad, setFSquad] = useState(initParams.get("squad") || "");
  const [fRole, setFRole] = useState(initParams.get("role") || "");
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const localSearchRef = useRef(null);

  useEffect(() => {
    if (selectedPerson) return;
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (fSquad) p.set("squad", fSquad);
    if (fRole) p.set("role", fRole);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [search, fSquad, fRole, selectedPerson]);

  const tc = typeConfig();
  const pc = getPhaseColors();

  const allSquads = [...new Set(people.map(p => p.squad).filter(Boolean))].sort();
  const allRoles = [...new Set(people.map(p => p.role).filter(Boolean))].sort();

  const gfSquads = Array.isArray(globalFilters.squad) ? globalFilters.squad : (globalFilters.squad ? [globalFilters.squad] : []);
  const gfPerson = Array.isArray(globalFilters.person) ? globalFilters.person : (globalFilters.person ? [globalFilters.person] : []);
  const effectiveSquad = fSquad || "";
  const effectiveRole = fRole || "";
  const activeFilters = [effectiveSquad, effectiveRole, search, gfSquads.length, gfPerson.length].filter(Boolean).length;

  const filtered = people.filter(p => {
    // Local filters
    if (effectiveSquad && (p.squad || "") !== effectiveSquad) return false;
    if (effectiveRole && (p.role || "") !== effectiveRole) return false;
    // Global squad filter (multi-select)
    if (gfSquads.length > 0 && !gfSquads.includes(p.squad)) return false;
    // Global person filter
    if (gfPerson.length > 0 && !gfPerson.includes(p.name)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.squad || "").toLowerCase().includes(q) && !(p.role || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const squadsWithPeople = {};
  filtered.forEach(p => {
    const sq = p.squad || "Unassigned";
    if (!squadsWithPeople[sq]) squadsWithPeople[sq] = [];
    squadsWithPeople[sq].push(p);
  });
  const flatFiltered = [];
  Object.values(squadsWithPeople).forEach(members => flatFiltered.push(...members));

  // Memoize momentum for all people to avoid recomputing inside render loop
  const momentumMap = useMemo(() => {
    const map = {};
    people.forEach(p => { map[p.name] = computeMomentum(p.name, commitments, history, weekConfig); });
    return map;
  }, [people, commitments, history, weekConfig]);

  useEffect(() => {
    if (searchRef) searchRef.current = localSearchRef.current;
  }, [searchRef, selectedPerson]);

  const goBackToList = useCallback(() => {
    setSelectedPerson(null);
    setKbActive(false);
    if (setDetailLabel) setDetailLabel(null);
    if (setGoBack) setGoBack(null);
  }, [setDetailLabel, setGoBack]);

  const openPerson = useCallback((name) => {
    setSelectedPerson(name);
    if (setDetailLabel) setDetailLabel(name);
    if (setGoBack) setGoBack(goBackToList);
  }, [setDetailLabel, setGoBack, goBackToList]);

  useEffect(() => {
    if (initialPerson && setDetailLabel) {
      setDetailLabel(initialPerson);
      if (setGoBack) setGoBack(goBackToList);
    }
  }, [initialPerson, setDetailLabel, setGoBack, goBackToList]);

  useKeyboard(!selectedPerson ? [
    { key: "Escape", fn: () => { if (search) { setSearch(""); setFocusIdx(0); localSearchRef.current?.blur(); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); } else if (kbActive) { setKbActive(false); } }, force: true },
    { key: "ArrowUp", fn: () => { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); }, force: true },
    { key: "ArrowDown", fn: () => { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.min(flatFiltered.length - 1, i + 1)); }, force: true },
    { key: "Enter", fn: () => { if (flatFiltered[focusIdx]) openPerson(flatFiltered[focusIdx].name); } },
  ] : [
    { key: "Escape", fn: () => { goBackToList(); }, force: true },
  ], [flatFiltered.length, focusIdx, selectedPerson, search, kbActive, goBackToList]);

  useEffect(() => {
    if (focusIdx >= flatFiltered.length && flatFiltered.length > 0) setFocusIdx(flatFiltered.length - 1);
  }, [flatFiltered.length, focusIdx]);


  /* ═══ LIST VIEW ═══════════════════════════════════════════ */

  if (!selectedPerson) {
    let flatIdx = 0;
    return (
      <div ref={devRef} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 128px)", marginBottom: -60 }}>

        {/* ═══════════════════════════════════════════════════════════
            FROZEN TOP — search + filters (never scrolls)
            ═══════════════════════════════════════════════════════════ */}
        <div className="flow-view-chrome" style={{ flexShrink: 0, paddingBottom: space[3], display: "flex", flexDirection: "column", gap: space[2] }}>
        <div className="flow-mission-grid" style={{ display: "flex", gap: space[2], alignItems: "center", flexWrap: "wrap", padding: `${space[4]}px ${space[4]}px` }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input ref={localSearchRef} value={search} onChange={e => { setSearch(e.target.value); setFocusIdx(0); }} className="flow-input"
              aria-label="Search people by name, squad, or role"
              placeholder="Search by name, squad, or role..."
              style={{ width: "100%", padding: `${space[3]}px ${space[4]}px ${space[3]}px 38px`, borderRadius: layout.radiusMd, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, outline: "none", boxSizing: "border-box" }} />
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
            {!search && <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
              color: c.textDim, lineHeight: 1,
              padding: "3px 7px 4px", borderRadius: layout.radiusTag,
              background: `linear-gradient(180deg, ${c.surfaceAlt} 0%, ${c.bg} 100%)`,
              border: `1px solid ${c.border}`,
              boxShadow: `0 2px 0 ${c.border}, 0 2px 3px ${c.shadow}`,
              pointerEvents: "none",
            }}>/</span>}
          </div>
          {allSquads.length > 1 && (
            <Sel value={fSquad} onChange={e => { setFSquad(e.target.value); setFocusIdx(0); }} style={{ minWidth: 120 }}>
              <option value="">All squads</option>
              {allSquads.map(s => <option key={s} value={s}>{s}</option>)}
            </Sel>
          )}
          {allRoles.length > 1 && (
            <Sel value={fRole} onChange={e => { setFRole(e.target.value); setFocusIdx(0); }} style={{ minWidth: 120 }}>
              <option value="">All roles</option>
              {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </Sel>
          )}
        </div>
        </div>
        {/* end frozen top */}

        {/* ═══════════════════════════════════════════════════════════
            SCROLLABLE CONTENT — people cards (only this area scrolls)
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", position: "relative", zIndex: 1, padding: `0 ${space[4]}px` }}>

        {/* People grouped by squad */}
        {Object.entries(squadsWithPeople).map(([squad, members]) => {
          const startIdx = flatIdx;
          flatIdx += members.length;
          return (
            <div key={squad}>
              <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[3], marginTop: space[4] }}>
                <div style={{ width: 4, height: 20, borderRadius: 3, background: c.accent }} />
                <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking, color: c.accent }}>{squad}</span>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textMid, fontWeight: typo.monoMd.weight }}>{members.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: space[4] }}>
                {members.map((p, gi) => {
                  const cm = commitments.find(x => x.person === p.name);
                  const items = cm ? cm.items.filter((_, idx) => cm.deselected !== idx).filter(it => it.title?.trim() || it.project) : [];
                  const hasDeselect = cm && cm.deselected >= 0;
                  const isFocused = kbActive && (startIdx + gi) === focusIdx;
                  const momPct = momentumMap[p.name] ?? null;

                  return (
                    <div key={p.name} role="button" tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPerson(p.name); } }} className={`flow-row${isFocused ? " flow-kb-focus" : ""}`} onClick={() => openPerson(p.name)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: space[6], background: isFocused ? c.accentDim : c.surface,
                      borderRadius: layout.radius, cursor: "pointer",
                      border: `1px solid ${isFocused ? c.accent + "40" : c.border}`,
                      transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[4], minWidth: 0, flex: 1 }}>
                        <div aria-hidden="true" style={{ width: space[8], height: space[8], borderRadius: "50%", background: c.accentDim, border: `1.5px solid ${c.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.accent, flexShrink: 0 }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: typo.displaySm.tracking, lineHeight: typo.displaySm.lineHeight }}>{p.name}</span>
                            {hasDeselect && <span style={{ fontSize: 12, color: c.orange }} title="Scope churn">↩</span>}
                          </div>
                          <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, fontWeight: 500, color: c.textMid, marginTop: space[1], lineHeight: typo.bodySm.lineHeight }}>
                            {p.role}
                          </div>
                        </div>
                      </div>
                      {/* Momentum indicator */}
                      <div style={{ textAlign: "center", flexShrink: 0, marginLeft: space[3] }}>
                        <div style={{ fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight, letterSpacing: typo.displayLg.tracking, color: momPct === null ? c.textDim : momPct >= 80 ? c.green : momPct >= 50 ? c.orange : c.red, lineHeight: 1.1 }}>{momPct === null ? "—" : `${momPct}%`}</div>
                        <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, color: c.textMid, marginTop: space[1] }}>Momentum</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && <EmptyState icon="👤" title="No people match" message="Try adjusting your filters or search query." action={activeFilters > 0 ? "Clear all filters" : null} onAction={() => { setSearch(""); setFSquad(""); setFRole(""); }} />}
      </div>{/* end scrollable content */}
      </div>
    );
  }


  /* ═══ DETAIL VIEW ═══════════════════════════════════════ */

  const personObj = people.find(p => p.name === selectedPerson);
  if (!personObj) {
    return (
      <EmptyState icon="👤" title="Person not found" message={`"${selectedPerson}" is not in the current people list.`} action="Back to list" onAction={goBackToList} />
    );
  }
  const data = computePersonData(selectedPerson, commitments, projects, history, weekConfig);
  const { currentItems, weeklyData, scopeChurnEvents } = data;

  const allPersonProjects = Object.keys(data.projectMap);
  const momentumPct = data.momentum;

  // Last 4 weeks summary data
  const last4 = weeklyData.filter(w => !w.isCurrent).slice(-4);
  const last4Total = last4.reduce((s, w) => s + w.total, 0);
  const last4Active = last4.filter(w => w.total > 0).length;
  const last4Projects = new Set();
  last4.forEach(w => w.items.forEach(it => { if (it.project) last4Projects.add(it.project); }));

  const activeWeeks = [...weeklyData].reverse().filter(w => w.total > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>

      {/* ═══ PROFILE HEADER ═══════════════════════════════ */}
      <div className="flow-telemetry-panel" style={{ padding: `${space[6]}px ${space[7]}px` }}>
        {/* Person identity — dominant read */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space[5], position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[4] }}>
            <div style={{
              width: space[7] + space[6], height: space[7] + space[6], borderRadius: "50%",
              background: `linear-gradient(135deg, ${c.accentDim}, ${c.purple}15)`,
              border: `2px solid ${c.accent}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight, color: c.accent,
            }}>{selectedPerson.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontFamily: typo.displayXl.font, fontSize: typo.displayXl.size, fontWeight: typo.displayXl.weight, color: c.text, letterSpacing: typo.displayXl.tracking, lineHeight: 1.15 }}>{selectedPerson}</div>
              <div style={{ display: "flex", alignItems: "center", gap: space[2], marginTop: space[2] }}>
                {personObj && <span style={{ fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size, fontWeight: typo.bodyLg.weight, color: c.textMid }}>{personObj.role}</span>}
                {personObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>·</span>}
                {personObj && <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, letterSpacing: typo.monoLg.tracking, color: c.accent }}>{personObj.squad}</span>}
              </div>
            </div>
          </div>

          {/* Momentum highlight */}
          <div style={{ textAlign: "center", padding: `${space[3]}px ${space[5]}px`, borderRadius: layout.radiusMd, background: momentumPct === null ? c.surfaceAlt : momentumPct >= 80 ? c.greenDim : momentumPct >= 50 ? c.orangeDim : c.redDim, border: `1px solid ${momentumPct === null ? c.border : (momentumPct >= 80 ? c.green : momentumPct >= 50 ? c.orange : c.red) + "20"}` }}>
            <div style={{ fontFamily: typo.displayHero.font, fontSize: typo.displayHero.size, fontWeight: typo.displayHero.weight, letterSpacing: typo.displayHero.tracking, color: momentumPct === null ? c.textDim : momentumPct >= 80 ? c.green : momentumPct >= 50 ? c.orange : c.red, lineHeight: 1 }}>{momentumPct === null ? "—" : `${momentumPct}%`}</div>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, color: c.textMid, marginTop: space[1] }}>Momentum</div>
          </div>
        </div>

        {/* Last 4 weeks — directly below identity */}
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: space[4], position: "relative", zIndex: 1 }}>
          <Label style={{ marginBottom: space[3] }}>Last 4 Weeks</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: space[3] }}>
            <StatCell value={`${last4Active}/${last4.length}`} label="Active weeks" color={c.text} style={{ textAlign: "left" }} />
            <StatCell value={last4Total} label="Commitments" color={c.accent} style={{ textAlign: "left" }} />
            <StatCell value={momentumPct === null ? "—" : `${momentumPct}%`} label="Momentum" color={momentumPct === null ? c.textDim : momentumPct >= 80 ? c.green : momentumPct >= 50 ? c.orange : c.red} style={{ textAlign: "left" }} />
            <StatCell value={last4Projects.size} label="Projects" color={c.text} style={{ textAlign: "left" }} />
          </div>
        </div>
      </div>


      {/* ═══ THIS WEEK SUMMARY (with scope churn if present) ═ */}
      <Surface variant="panel" style={{ padding: space[6] }}>
        <Label style={{ marginBottom: space[3] }}>{isHistorical ? (selectedWeekKey || "Past Week") : "This Week"}</Label>
        {currentItems.length > 0 ? (() => {
          const projCount = new Set(currentItems.map(it => it.project).filter(Boolean)).size;
          return (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid }}>
              {currentItems.length} commitment{currentItems.length !== 1 ? "s" : ""} across {projCount} project{projCount !== 1 ? "s" : ""}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: space[2] }}>
              {currentItems.map((it, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: space[2], padding: `${space[1]}px ${space[3]}px`, background: c.surfaceAlt, borderRadius: layout.radiusMd, border: `1px solid ${c.border}` }}>
                  <Tag color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Tag>
                  {it.project && (
                    <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", it.project); }}
                      style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, color: entityColors().project, cursor: "pointer" }}>
                      {it.project}
                    </span>
                  )}
                  <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, color: c.text }}>{it.title || "—"}</span>
                </div>
              ))}
            </div>
          </div>
          );
        })() : (
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>No commitments this week</div>
        )}
        {scopeChurnEvents.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: space[1], padding: `${space[2]}px ${space[3]}px`, marginTop: space[3], background: c.orangeDim, borderRadius: layout.radiusMd, border: `1px solid ${c.orange}15`, fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, color: c.textMid, lineHeight: 1.5 }}>
            <span style={{ color: c.orange, fontWeight: 600 }}>↩ Scope churn:</span>
            {scopeChurnEvents.map((ev, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: space[1] }}>
                <span>{ev.label}</span>
                {ev.project && (
                  <span onClick={() => { if (onNavigate) onNavigate("projects", ev.project); }}
                    style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: entityColors().project, cursor: "pointer", textDecoration: "underline", textDecorationColor: entityColors().project + "40" }}>
                    {ev.project}
                  </span>
                )}
                {i < scopeChurnEvents.length - 1 && <span>·</span>}
              </span>
            ))}
          </div>
        )}
      </Surface>


      {/* ═══ TIMELINE ═══════════════════════════════════════ */}
      <div className="flow-terminal-log">
        <div className="flow-terminal-header">
          <div className="flow-terminal-dot" style={{ background: c.red }} />
          <div className="flow-terminal-dot" style={{ background: c.orange }} />
          <div className="flow-terminal-dot" style={{ background: c.green }} />
          <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, color: c.textMid, marginLeft: space[2] }}>timeline@{selectedPerson.split(" ")[0].toLowerCase()}</span>
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim, marginLeft: "auto" }}>{weeklyData.length} weeks</span>
        </div>
        <div style={{ padding: `${space[2]}px 0`, maxHeight: 540, overflowY: "auto" }}>
          {activeWeeks.length > 0 ? (
            activeWeeks.map((w) => (
              <React.Fragment key={w.week}>
                {/* Week separator */}
                <div style={{ padding: `${space[2]}px ${space[4]}px ${space[1]}px`, display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: w.isCurrent ? c.accent : c.textDim }}>
                    {w.isCurrent ? (isHistorical ? `▸ ${(selectedWeekKey || "SELECTED WEEK").toUpperCase()}` : "▸ THIS WEEK") : `▸ ${w.week.toUpperCase()}`}
                  </span>
                  <div style={{ flex: 1, height: 1, background: w.isCurrent ? `${c.accent}30` : c.border }} />
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>{w.total}</span>
                </div>
                {w.items.map((entry, ei) => {
                  const oc = outcomeConfig();
                  const ocCfg = entry.outcome ? oc[entry.outcome] : null;
                  const projObj = projects.find(p => p.id === entry.project);
                  return (
                    <div key={`${w.week}-${ei}`} style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 52px 52px 72px",
                      alignItems: "center",
                      gap: space[2],
                      padding: `${space[2]}px ${space[4]}px`,
                      borderBottom: `1px solid ${c.border}`,
                    }}>
                      {/* Project ID + Name : Commitment */}
                      <span style={{
                        display: "flex", alignItems: "center", gap: 0,
                        overflow: "hidden", whiteSpace: "nowrap",
                      }}>
                        {entry.project ? (
                        <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", entry.project); }}
                          style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, color: entityColors().project, cursor: "pointer", flexShrink: 0 }}>
                          {entry.project}
                        </span>
                        ) : (
                        <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.textDim, flexShrink: 0 }}>—</span>
                        )}
                        {projObj && <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, color: c.textDim, flexShrink: 0, marginLeft: space[1] }}>{projObj.name}</span>}
                        <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, color: c.textDim, flexShrink: 0, margin: `0 ${space[1]}px` }}>:</span>
                        <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size, color: w.isCurrent ? c.text : c.textDim, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {entry.title || entry.task || "—"}
                        </span>
                      </span>
                      {/* Stage (PRD/Design/Dev/QA) */}
                      <Tag color={pc[entry.stage] || c.textDim} bg={(pc[entry.stage] || c.textDim) + "12"} style={{ textAlign: "center", justifySelf: "center" }}>{entry.stage || "—"}</Tag>
                      {/* Type (BUILD/JAM) */}
                      <Tag color={tc[entry.type]?.color} bg={tc[entry.type]?.bg} style={{ textAlign: "center", justifySelf: "center" }}>{entry.type || "—"}</Tag>
                      {/* Outcome */}
                      {ocCfg ? (
                        <span style={{
                          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700,
                          color: ocCfg.color, background: ocCfg.bg,
                          padding: "1px 6px", borderRadius: layout.radiusTag,
                          letterSpacing: typo.monoSm.tracking, textAlign: "center", justifySelf: "center",
                        }}>
                          {ocCfg.icon} {entry.outcome.toUpperCase()}
                        </span>
                      ) : <span />}
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            <div style={{ padding: `${space[5]}px ${space[4]}px`, textAlign: "center", fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.textDim }}>
              $ no activity logged<span className="flow-terminal-cursor" />
            </div>
          )}
          {activeWeeks.length > 0 && (
            <div style={{ padding: `${space[2]}px ${space[4]}px`, display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.accent }}>$</span>
              <span className="flow-terminal-cursor" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleDeepDive;
