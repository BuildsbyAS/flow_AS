// Flow — People Deep Dive (Phase 4: Coaching Console, Signal Cards, Terminal Log, Telemetry Hero)
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { c, motion, layout, typo, space, typeConfig, phaseColors as getPhaseColors, outcomeConfig, entityColors } from "../styles/theme";
import { Tag, EmptyState, Surface, Label, Btn, Sel, StatCell } from "../components/shared";
import { KpiGrid, KpiCard, HealthGauge, SectionHead, Pill, PillRow } from "../components/kpi";
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

    // ─── KPI aggregates (computed from people + commitments) ────
    const teamSize = people.length;
    const squadCounts = people.reduce((acc, p) => {
      const sq = p.squad || "Unassigned";
      acc[sq] = (acc[sq] || 0) + 1;
      return acc;
    }, {});
    const squadEntries = Object.entries(squadCounts).sort((a, b) => b[1] - a[1]);
    const topSquads = squadEntries.slice(0, 4);
    const moreSquads = squadEntries.length - topSquads.length;

    const activeThisWeek = people.filter(p => {
      const cm = commitments.find(x => x.person === p.name);
      if (!cm) return false;
      return cm.items.some((it, idx) => cm.deselected !== idx && (it.title?.trim() || it.project));
    }).length;

    const uniqueRoles = new Set(people.map(p => p.role).filter(Boolean)).size;

    // Aggregate team momentum = avg of per-person momentum values (excluding nulls)
    const momValues = people.map(p => momentumMap[p.name]).filter(v => v != null);
    const teamHealth = momValues.length
      ? Math.round(momValues.reduce((a, b) => a + b, 0) / momValues.length)
      : teamSize > 0 ? Math.round((activeThisWeek / teamSize) * 100) : 0;

    return (
      <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: space[3] }}>

        {/* ═══════════════════════════════════════════════════════════
            Search + filters — scrolls with the page
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
        <div className="flow-mission-grid" style={{ display: "flex", gap: space[2], alignItems: "center", flexWrap: "wrap", padding: `${space[4]}px ${space[4]}px` }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input ref={localSearchRef} value={search} onChange={e => { setSearch(e.target.value); setFocusIdx(0); }} className="flow-input"
              aria-label="Search people by name, squad, or role"
              placeholder="Search by name, squad, or role..."
              style={{ width: "100%", height: 40, padding: `0 ${space[3]}px 0 38px`, borderRadius: layout.radiusSm, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: typo.bodyMd.weight, outline: "none", boxSizing: "border-box" }} />
            <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
            </svg>
            {!search && <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
              color: c.textDim, lineHeight: 1,
              padding: "3px 7px 4px", borderRadius: layout.radiusXs,
              background: c.surface,
              border: `1px solid ${c.border}`,
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
        <div style={{ position: "relative", zIndex: 1, padding: `0 ${space[4]}px`, display: "flex", flexDirection: "column", gap: space[3] }}>

        {/* ═══════════════════════════════════════════════════════════
            KPI GRID — 4 purpose-built cards per design-directions.html §KPI
            Card 1 (wide): Team roster + squad PillRow
            Card 2: Active This Week (people with ≥1 committed item)
            Card 3: Roles (unique roles across team)
            Card 4: HealthGauge — avg per-person momentum, falls back to
                    (active/total) * 100 if no momentum data available
            ═══════════════════════════════════════════════════════════ */}
        <KpiGrid>
          <KpiCard
            label="Team"
            value={teamSize}
            sub={`${Object.keys(squadCounts).length} squad${Object.keys(squadCounts).length === 1 ? "" : "s"}`}
          >
            <PillRow>
              {topSquads.map(([squad, count]) => (
                <Pill
                  key={squad}
                  count={count}
                  label={squad}
                  color={c.cyan || c.accent}
                  active={fSquad === squad}
                  onClick={() => { setFSquad(fSquad === squad ? "" : squad); setFocusIdx(0); }}
                />
              ))}
              {moreSquads > 0 && (
                <Pill count={`+${moreSquads}`} label="more" color={c.textDim} />
              )}
            </PillRow>
          </KpiCard>
          <KpiCard
            label="Active This Week"
            value={activeThisWeek}
            sub={teamSize > 0 ? `${Math.round((activeThisWeek / teamSize) * 100)}% of team committed` : "—"}
          />
          <KpiCard
            label="Roles"
            value={uniqueRoles}
            sub={uniqueRoles === 1 ? "role represented" : "distinct roles across team"}
          />
          <HealthGauge
            value={teamHealth}
            label="Team Momentum"
            sub={momValues.length ? "avg per-person momentum" : "share of team active"}
          />
        </KpiGrid>

        {/* ═══════════════════════════════════════════════════════════
            SECTION HEADER — people by squad (sec-head pattern)
            ═══════════════════════════════════════════════════════════ */}
        <SectionHead
          title="People by Squad"
          right={
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase", color: c.textDim,
              fontVariantNumeric: "tabular-nums",
            }}>{filtered.length} of {people.length}</span>
          }
        />

        {/* People grouped by squad */}
        {Object.entries(squadsWithPeople).map(([squad, members]) => {
          const startIdx = flatIdx;
          flatIdx += members.length;
          return (
            <div key={squad}>
              <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[3], marginTop: space[3] }}>
                <span style={{ fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: c.textDim, textTransform: "uppercase" }}>{squad}</span>
                <span style={{ fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700, color: c.textGhost || c.textDim }}>·</span>
                <span style={{ fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>{members.length}</span>
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
                      padding: space[5], background: c.surface,
                      borderRadius: layout.radiusLg, cursor: "pointer",
                      border: `1px solid ${isFocused ? c.accent : c.border}`,
                      boxShadow: c.shadowCard,
                      transition: `border-color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[3], minWidth: 0, flex: 1 }}>
                        <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: "50%", background: c.surfaceAlt, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: typo.monoMd.font, fontSize: 12, fontWeight: 700, color: c.textMid, flexShrink: 0 }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <span style={{ fontFamily: typo.bodyMd.font, fontSize: 14, fontWeight: 700, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{p.name}</span>
                            {hasDeselect && <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.accent }} title="Scope churn">↩</span>}
                          </div>
                          <div style={{ fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 400, color: c.textDim, marginTop: 2, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.role}
                          </div>
                        </div>
                      </div>
                      {/* Momentum indicator */}
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: space[3] }}>
                        <div style={{ fontFamily: typo.monoLg.font, fontSize: 20, fontWeight: 700, color: momPct === null ? c.textDim : momPct >= 80 ? c.green : momPct >= 50 ? c.accent : c.red, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{momPct === null ? "—" : `${momPct}%`}</div>
                        <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.textDim, marginTop: 2, textTransform: "uppercase" }}>Momentum</div>
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

  // Last-week commitment total (for KPI card sub-caption)
  const lastWeekData = weeklyData.filter(w => !w.isCurrent).slice(-1)[0];
  const lastWeekTotal = lastWeekData ? lastWeekData.total : 0;
  const lastWeekDone = lastWeekData
    ? lastWeekData.items.filter(it => it.outcome === "done" || it.outcome === "done_carry").length
    : 0;

  const thisWeekProjCount = new Set(currentItems.map(it => it.project).filter(Boolean)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>

      {/* ═══ HERO CARD — avatar + identity (Steel & Orange §8.2) ═══ */}
      <div style={{
        padding: space[6], background: c.surface,
        border: `1px solid ${c.border}`, borderRadius: layout.radiusLg,
        boxShadow: c.shadowCard,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[4], minWidth: 0 }}>
          <div aria-hidden="true" style={{
            width: 56, height: 56, borderRadius: "50%",
            background: c.surfaceAlt,
            border: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: typo.monoLg.font, fontSize: 18, fontWeight: 700, color: c.textMid,
            flexShrink: 0,
          }}>{selectedPerson.charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: typo.displayLg.font, fontSize: 24, fontWeight: 700,
              color: c.text, letterSpacing: "-0.02em", lineHeight: 1.15,
            }}>{selectedPerson}</div>
            <div style={{ display: "flex", alignItems: "center", gap: space[2], marginTop: space[2], flexWrap: "wrap" }}>
              {personObj.role && (
                <span style={{
                  fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                  fontWeight: 500, color: c.textMid,
                }}>{personObj.role}</span>
              )}
              {personObj.squad && (
                <span style={{
                  fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  color: c.accent, background: c.accentDim,
                  padding: "3px 8px", borderRadius: layout.radiusXs,
                }}>{personObj.squad}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPI GRID — 4 cards: Momentum / This Week / Last Week / Gauge ═══ */}
      <KpiGrid>
        <KpiCard
          label="Momentum"
          value={momentumPct === null ? "—" : `${momentumPct}%`}
          sub={
            momentumPct === null
              ? "No activity logged yet"
              : momentumPct >= 80
                ? "Strong — shipping consistently"
                : momentumPct >= 50
                  ? "Steady — mixed outcomes recent"
                  : "At risk — low completion rate"
          }
        />
        <KpiCard
          label={isHistorical ? (selectedWeekKey || "Selected Week") : "This Week"}
          value={currentItems.length}
          sub={
            currentItems.length === 0
              ? "No commitments"
              : `${thisWeekProjCount} project${thisWeekProjCount !== 1 ? "s" : ""}`
          }
        />
        <KpiCard
          label="Last Week"
          value={lastWeekTotal}
          sub={
            lastWeekTotal === 0
              ? "No commitments"
              : `${lastWeekDone} of ${lastWeekTotal} done`
          }
        />
        <HealthGauge
          value={momentumPct == null ? 0 : momentumPct}
          label="Momentum"
          sub={momentumPct == null ? "no history yet" : "rolling completion score"}
        />
      </KpiGrid>

      {/* ═══ THIS WEEK — commitments + scope churn ═══ */}
      <div>
        <SectionHead title={isHistorical ? (selectedWeekKey || "Past Week") : "This Week"} />
        <div style={{
          padding: space[6], background: c.surface,
          border: `1px solid ${c.border}`, borderRadius: layout.radiusLg,
          boxShadow: c.shadowCard,
        }}>
          {currentItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{
                fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                fontWeight: 500, color: c.textMid,
                fontVariantNumeric: "tabular-nums",
              }}>
                {currentItems.length} commitment{currentItems.length !== 1 ? "s" : ""} across {thisWeekProjCount} project{thisWeekProjCount !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: space[2] }}>
                {currentItems.map((it, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: space[2],
                    padding: `${space[1]}px ${space[3]}px`,
                    background: c.surfaceAlt, borderRadius: layout.radiusSm,
                    border: `1px solid ${c.border}`,
                  }}>
                    <Tag color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Tag>
                    {it.project && (
                      <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", it.project); }}
                        style={{
                          fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                          fontWeight: typo.monoMd.weight, letterSpacing: typo.monoMd.tracking,
                          color: entityColors().project, cursor: "pointer",
                        }}>
                        {it.project}
                      </span>
                    )}
                    <span style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      fontWeight: typo.bodySm.weight, color: c.text,
                    }}>{it.title || "—"}</span>
                  </div>
                ))}
              </div>
              {scopeChurnEvents.length > 0 && (
                <div style={{
                  display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: space[1],
                  padding: `${space[2]}px ${space[3]}px`,
                  background: c.accentDim, borderRadius: layout.radiusSm,
                  border: `1px solid ${c.border}`,
                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                  fontWeight: typo.bodySm.weight, color: c.textMid, lineHeight: 1.5,
                }}>
                  <span style={{ color: c.accent, fontWeight: 700 }}>↩ Scope churn:</span>
                  {scopeChurnEvents.map((ev, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: space[1] }}>
                      <span>{ev.label}</span>
                      {ev.project && (
                        <span onClick={() => { if (onNavigate) onNavigate("projects", ev.project); }}
                          style={{
                            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                            fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking,
                            color: entityColors().project, cursor: "pointer", textDecoration: "underline",
                          }}>
                          {ev.project}
                        </span>
                      )}
                      {i < scopeChurnEvents.length - 1 && <span>·</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Empty state per §7.13 — centered, max-w 360, 32px ghost icon
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", maxWidth: 360, margin: "0 auto",
              padding: `${space[5]}px ${space[4]}px`,
            }}>
              <div aria-hidden="true" style={{
                fontSize: 32, lineHeight: 1,
                color: c.textGhost, marginBottom: space[3],
              }}>◌</div>
              <div style={{
                fontFamily: typo.displaySm.font, fontSize: 16, fontWeight: 700,
                color: c.text, letterSpacing: "-0.01em", marginBottom: space[1],
              }}>No commitments this week</div>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: 13, fontWeight: 500,
                color: c.textDim, lineHeight: 1.5,
              }}>
                {selectedPerson} hasn't declared any BUILD or JAM commitments yet.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ACTIVITY TIMELINE ═══ */}
      <div>
        <SectionHead
          title="Activity Timeline"
          right={
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
              letterSpacing: "0.06em", textTransform: "uppercase", color: c.textDim,
              fontVariantNumeric: "tabular-nums",
            }}>{activeWeeks.length} active week{activeWeeks.length !== 1 ? "s" : ""}</span>
          }
        />
        <div style={{
          background: c.surface, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusLg, boxShadow: c.shadowCard,
          overflow: "clip",
        }}>
          {activeWeeks.length > 0 ? (
            <div style={{ maxHeight: 540, overflowY: "auto" }}>
              {activeWeeks.map((w, wIdx) => (
                <React.Fragment key={w.week}>
                  {/* Week separator */}
                  <div style={{
                    padding: `${space[3]}px ${space[5]}px`,
                    display: "flex", alignItems: "center", gap: space[3],
                    background: c.surfaceAlt,
                    borderTop: wIdx === 0 ? "none" : `1px solid ${c.border}`,
                    borderBottom: `1px solid ${c.border}`,
                  }}>
                    <span style={{
                      fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                      letterSpacing: "0.08em", textTransform: "uppercase",
                      color: w.isCurrent ? c.accent : c.textDim,
                    }}>
                      {w.isCurrent ? (isHistorical ? (selectedWeekKey || "Selected week") : "This week") : w.week}
                    </span>
                    <div style={{ flex: 1, height: 1, background: c.border }} />
                    <span style={{
                      fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                      color: c.textDim, fontVariantNumeric: "tabular-nums",
                    }}>{w.total}</span>
                  </div>
                  {w.items.map((entry, ei) => {
                    const oc = outcomeConfig();
                    const ocCfg = entry.outcome ? oc[entry.outcome] : null;
                    const projObj = projects.find(p => p.id === entry.project);
                    const isLastInWeek = ei === w.items.length - 1;
                    return (
                      <div key={`${w.week}-${ei}`} style={{
                        display: "flex", alignItems: "center", gap: space[3],
                        padding: `${space[3]}px ${space[5]}px`,
                        borderBottom: isLastInWeek ? "none" : `1px solid ${c.border}`,
                      }}>
                        {/* Project ID */}
                        {entry.project ? (
                          <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", entry.project); }}
                            style={{
                              fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                              fontWeight: 700, letterSpacing: typo.monoMd.tracking,
                              color: entityColors().project, cursor: "pointer",
                              flexShrink: 0, minWidth: 64,
                              fontVariantNumeric: "tabular-nums",
                            }}>
                            {entry.project}
                          </span>
                        ) : (
                          <span style={{
                            fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                            color: c.textDim, flexShrink: 0, minWidth: 64,
                          }}>—</span>
                        )}
                        {/* Action text: project name + commitment title */}
                        <span style={{
                          flex: 1, minWidth: 0,
                          fontFamily: typo.bodySm.font, fontSize: 13, fontWeight: 500,
                          color: w.isCurrent ? c.text : c.textMid,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {projObj && (
                            <span style={{ color: c.textDim, marginRight: space[2] }}>{projObj.name}</span>
                          )}
                          {entry.title || entry.task || "—"}
                        </span>
                        {/* Type */}
                        <Tag color={tc[entry.type]?.color} bg={tc[entry.type]?.bg} style={{ flexShrink: 0 }}>
                          {entry.type || "—"}
                        </Tag>
                        {/* Stage */}
                        <Tag
                          color={pc[entry.stage] || c.textDim}
                          bg={(pc[entry.stage] || c.textDim) + "12"}
                          style={{ flexShrink: 0 }}
                        >{entry.stage || "—"}</Tag>
                        {/* Outcome pill */}
                        {ocCfg ? (
                          <span style={{
                            fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                            color: ocCfg.color, background: ocCfg.bg,
                            padding: "3px 8px", borderRadius: layout.radiusXs,
                            letterSpacing: "0.04em", textTransform: "uppercase",
                            flexShrink: 0, fontVariantNumeric: "tabular-nums",
                          }}>
                            {ocCfg.icon} {entry.outcome}
                          </span>
                        ) : (
                          <span style={{ width: 56, flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          ) : (
            // Empty state per §7.13
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", maxWidth: 360, margin: "0 auto",
              padding: `${space[6]}px ${space[4]}px`,
            }}>
              <div aria-hidden="true" style={{
                fontSize: 32, lineHeight: 1,
                color: c.textGhost, marginBottom: space[3],
              }}>◌</div>
              <div style={{
                fontFamily: typo.displaySm.font, fontSize: 16, fontWeight: 700,
                color: c.text, letterSpacing: "-0.01em", marginBottom: space[1],
              }}>No activity logged</div>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: 13, fontWeight: 500,
                color: c.textDim, lineHeight: 1.5,
              }}>
                Past-week commitments and outcomes will appear here once {selectedPerson} has cycle history.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeopleDeepDive;
