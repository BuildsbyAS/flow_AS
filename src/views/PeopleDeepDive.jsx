// Flow — People Deep Dive (Phase 4: Coaching Console, Signal Cards, Terminal Log, Telemetry Hero)
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { c, motion, layout, typo, space, typeConfig, phaseColors as getPhaseColors, outcomeConfig, entityColors } from "../styles/theme";
import { Tag, EmptyState, Sel } from "../components/shared";
import { KpiGrid, KpiCard, HealthGauge, SectionHead, Pill, PillRow } from "../components/kpi";
import ActivityTimeline from "../components/ActivityTimeline";
import useKeyboard from "../hooks/useKeyboard";
import useDevLabel from "../hooks/useDevLabel";

function parseWeekKey(key) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(String(key || ""));
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}
function weekKeyAtOrBefore(candidate, anchor) {
  const a = parseWeekKey(candidate);
  const b = parseWeekKey(anchor);
  if (!a || !b) return String(candidate) <= String(anchor);
  return a[0] !== b[0] ? a[0] < b[0] : a[1] <= b[1];
}

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

const firstGlyph = (name) => {
  if (!name) return "?";
  const arr = [...String(name).trim()];
  return arr.length ? arr[0].toUpperCase() : "?";
};

// Multi-grapheme initials (e.g. "Anna Ng" → "AN"). Unicode-safe.
const initialsOf = (name) => {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map(p => [...p][0]?.toUpperCase() || "").join("") || "?";
};

const PeopleDeepDive = ({ people, commitments, projects, history, onNavigate, initialPerson, setDetailLabel, setGoBack, searchRef, isHistorical, selectedWeekKey, weekConfig: weekConfigProp, globalFilters = {}, loading, error }) => {
  const devRef = useDevLabel(
    'PeopleDeepDive',
    'src/views/PeopleDeepDive.jsx',
    'Person coaching console with telemetry hero, momentum chart, and project timeline'
  );
  const weekConfig = weekConfigProp || { weeks: [], currentWeek: null, historyWeeks: [] };
  const [selectedPerson, setSelectedPerson] = useState(initialPerson || null);

  const [search, setSearch] = useState("");
  const [fSquad, setFSquad] = useState("");
  const [fRole, setFRole] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const localSearchRef = useRef(null);

  const tc = typeConfig();
  const pc = getPhaseColors();

  const allSquads = [...new Set(people.map(p => p.squad).filter(Boolean))].sort();
  const allRoles = [...new Set(people.map(p => p.role).filter(Boolean))].sort();

  const gfSquads = Array.isArray(globalFilters.squad) ? globalFilters.squad : (globalFilters.squad ? [globalFilters.squad] : []);
  const gfPerson = Array.isArray(globalFilters.person) ? globalFilters.person : (globalFilters.person ? [globalFilters.person] : []);
  const effectiveSquad = fSquad || "";
  const effectiveRole = fRole || "";
  const localFilterCount = [effectiveSquad, effectiveRole, search].filter(Boolean).length;
  const globalFilterCount = gfSquads.length + gfPerson.length;
  const activeFilters = localFilterCount + globalFilterCount;

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

  const squadsRaw = {};
  filtered.forEach(p => {
    const sq = p.squad || "Unassigned";
    if (!squadsRaw[sq]) squadsRaw[sq] = [];
    squadsRaw[sq].push(p);
  });
  const sortedSquadKeys = Object.keys(squadsRaw).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });
  const squadsWithPeople = {};
  sortedSquadKeys.forEach(k => { squadsWithPeople[k] = squadsRaw[k]; });
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

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [selectedPerson]);

  useKeyboard(!selectedPerson ? [
    { key: "Escape", fn: () => { if (search) { setSearch(""); setFocusIdx(0); localSearchRef.current?.blur(); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); } else if (kbActive) { setKbActive(false); } }, force: true },
    { key: "ArrowUp", fn: () => { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); }, force: true },
    { key: "ArrowDown", fn: () => { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.min(flatFiltered.length - 1, i + 1)); }, force: true },
    { key: "Enter", fn: () => { const target = flatFiltered[focusIdx] || flatFiltered[0]; if (target) openPerson(target.name); }, force: true },
  ] : [
    { key: "Escape", fn: () => { goBackToList(); }, force: true },
  ], [flatFiltered.length, focusIdx, selectedPerson, search, kbActive, goBackToList]);

  useEffect(() => {
    if (focusIdx >= flatFiltered.length && flatFiltered.length > 0) setFocusIdx(flatFiltered.length - 1);
  }, [flatFiltered.length, focusIdx]);


  /* ═══ LOADING / ERROR GATE ═══════════════════════════════ */

  if (error) {
    return (
      <EmptyState
        icon="◌"
        title="Couldn't load team"
        message={typeof error === "string" ? error : (error?.message || "Something went wrong fetching team data.")}
        action="Retry"
        onAction={() => { if (typeof window !== "undefined") window.location.reload(); }}
      />
    );
  }
  if (loading && people.length === 0) {
    return (
      <div className="flow-loading-delayed" style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: `${space[8]}px ${space[5]}px`, color: c.textMid,
        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>Loading team…</div>
    );
  }

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
    // Per-role head-counts for the Team KPI card: top 4 roles by count
    // plus a "+N more" chip when there's a long tail.
    const roleCounts = people.reduce((acc, p) => {
      const r = (p.role || "").trim();
      if (!r) return acc;
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {});
    const roleEntries = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
    // Top 3 (not 4) so the pill row stays on a single line inside the KPI card.
    const topRoles = roleEntries.slice(0, 3);
    const moreRoles = roleEntries.length - topRoles.length;

    // Aggregate team momentum = avg of per-person momentum values (excluding nulls)
    const momValues = people.map(p => momentumMap[p.name]).filter(v => v != null);
    const teamHealth = momValues.length
      ? Math.round(momValues.reduce((a, b) => a + b, 0) / momValues.length)
      : teamSize > 0 ? Math.round((activeThisWeek / teamSize) * 100) : 0;

    return (
      <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: space[3] }}>

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
            sub={(() => {
              const realSquads = Object.keys(squadCounts).filter(k => k !== "Unassigned");
              return `${realSquads.length} squad${realSquads.length === 1 ? "" : "s"}`;
            })()}
          >
            <PillRow style={{ flexWrap: "nowrap", overflow: "hidden" }}>
              {topRoles.map(([role, count]) => (
                <Pill key={role} count={count} label={role} color={c.cyan} style={{ whiteSpace: "nowrap", flexShrink: 0 }} />
              ))}
              {moreRoles > 0 && (
                <Pill count={`+${moreRoles}`} label="more" color={c.textDim} style={{ whiteSpace: "nowrap", flexShrink: 0 }} />
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
            value={momValues.length ? teamHealth : 0}
            label={momValues.length ? "Team Momentum" : "Participation"}
            sub={momValues.length ? "avg per-person momentum" : "no momentum history yet"}
          />
        </KpiGrid>

        {/* ═══════════════════════════════════════════════════════════
            SEARCH ROW — mirrors the Projects tab: full-width plain input.
            Squad/role filtering lives on the KPI pills instead.
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ position: "relative" }}>
          <input ref={localSearchRef} value={search} onChange={e => { setSearch(e.target.value); setFocusIdx(0); }}
            aria-label="Search people by name, squad, or role"
            placeholder="Search people by name, squad, or role..."
            style={{
              width: "100%", height: 40,
              padding: `0 ${space[4]}px 0 38px`,
              borderRadius: layout.radiusSm,
              border: `1px solid ${c.border}`,
              background: c.surfaceAlt, color: c.text,
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
              outline: "none", boxSizing: "border-box",
            }} />
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
          {!search && (
            <span aria-hidden="true" style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
              color: c.textDim, lineHeight: 1,
              padding: `3px 7px 4px`, borderRadius: layout.radiusXs,
              background: c.surface, border: `1px solid ${c.border}`,
              pointerEvents: "none",
            }}>/</span>
          )}
        </div>

        {/* People grouped by squad — squad header now doubles as the section head */}
        {Object.entries(squadsWithPeople).map(([squad, members]) => {
          const startIdx = flatIdx;
          flatIdx += members.length;
          return (
            <div key={squad}>
              <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[3], marginTop: space[5] }}>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, letterSpacing: "0.08em", color: c.text, textTransform: "uppercase" }}>{squad === "Unassigned" ? "No Squad" : squad}</span>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, color: c.textGhost || c.textDim }}>·</span>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, color: c.text, fontVariantNumeric: "tabular-nums" }}>{members.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: space[4] }}>
                {members.map((p, gi) => {
                  const cm = commitments.find(x => x.person === p.name);
                  const items = cm ? cm.items.slice(0, 3).filter((it, idx) => cm.deselected !== idx && (it.title?.trim() || it.project)) : [];
                  const typeCounts = items.reduce((acc, it) => { if (it.type) acc[it.type] = (acc[it.type] || 0) + 1; return acc; }, {});
                  const projIds = [...new Set(items.map(it => it.project).filter(Boolean))];
                  const hasDeselect = cm && cm.deselected >= 0;
                  const isFocused = kbActive && (startIdx + gi) === focusIdx;
                  const momPct = momentumMap[p.name] ?? null;

                  return (
                    <div key={p.name} role="button" tabIndex={0} aria-label={`Open ${p.name}`} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPerson(p.name); } }} className={`flow-row${isFocused ? " flow-kb-focus" : ""}`} onClick={() => openPerson(p.name)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: space[6], background: c.surface,
                      borderRadius: layout.radiusLg, cursor: "pointer",
                      border: `1px solid ${isFocused ? c.accent : c.border}`,
                      boxShadow: c.shadowCard,
                      animation: `fadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                      animationDelay: `${Math.min(gi * 30, 400)}ms`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[3], minWidth: 0, flex: 1 }}>
                        <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: "50%", background: c.surfaceAlt, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, color: c.textMid, flexShrink: 0 }}>
                          {firstGlyph(p.name)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <span title={p.name} style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{p.name}</span>
                            {hasDeselect && <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.accent }} title="Scope churn — dropped a committed item this week" aria-label="Scope churn">↩</span>}
                          </div>
                          <div title={p.role || ""} style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: typo.bodySm.weight, color: c.textMid, marginTop: space[1], lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.role || "—"}
                          </div>
                        </div>
                      </div>
                      {/* Momentum indicator */}
                      <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={momPct ?? 0} aria-label={`Momentum ${momPct === null ? "unknown" : momPct + "%"}`} style={{ textAlign: "right", flexShrink: 0, marginLeft: space[3] }}>
                        <div className="flow-color-tween" style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: space[1], fontFamily: typo.displayHero.font, fontSize: typo.monoLg.size * 1.5, fontWeight: typo.displayHero.weight, color: momPct === null ? c.textMid : momPct >= 80 ? c.green : momPct >= 50 ? c.accent : c.red, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", letterSpacing: typo.displayHero.tracking }}>
                          <span aria-hidden="true" style={{ fontSize: typo.monoSm.size }}>{momPct === null ? "" : momPct >= 80 ? "▲" : momPct >= 50 ? "●" : "▼"}</span>
                          <span>{momPct === null ? "—" : `${momPct}%`}</span>
                        </div>
                        <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.textMid, marginTop: space[1], textTransform: "uppercase" }}>Momentum</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon="◌"
            title={people.length === 0 ? "No people yet" : "No people match"}
            message={
              people.length === 0
                ? "Invite teammates in Settings to see them here."
                : localFilterCount > 0
                  ? "Try adjusting your filters or search query."
                  : globalFilterCount > 0
                    ? "No teammates match the global filter at the top of the app. Clear it from the app header to see everyone."
                    : "No teammates to show."
            }
            action={localFilterCount > 0 ? "Clear filters" : null}
            onAction={() => { setSearch(""); setFSquad(""); setFRole(""); setFocusIdx(0); }}
          />
        )}
      </div>{/* end scrollable content */}
      </div>
    );
  }


  /* ═══ DETAIL VIEW ═══════════════════════════════════════ */

  const personObj = people.find(p => p.name === selectedPerson);
  if (!personObj) {
    return (
      <EmptyState
        icon="◌"
        title="Person not found"
        message={`"${selectedPerson}" is not in the current people list.`}
        action="Back to list"
        onAction={goBackToList}
      />
    );
  }
  const data = computePersonData(selectedPerson, commitments, projects, history, weekConfig);
  const { currentItems, weeklyData, scopeChurnEvents } = data;

  const allPersonProjects = Object.keys(data.projectMap);
  const momentumPct = data.momentum;

  // Timeline: always include this week (even when empty) for continuity,
  // but only if there's any activity at all (past or current) worth showing.
  const currentWkData = weeklyData.find(w => w.isCurrent);
  const pastActiveRaw = [...weeklyData].reverse().filter(w => !w.isCurrent && w.total > 0);
  // Historical mode — only show weeks at or before the selected week for the
  // "Last active" KPI. Week keys compared numerically via weekKeyAtOrBefore.
  const pastActive = isHistorical && selectedWeekKey
    ? pastActiveRaw.filter(w => weekKeyAtOrBefore(w.week, selectedWeekKey))
    : pastActiveRaw;
  const hasAnyActivity = pastActive.length > 0 || (currentWkData && currentWkData.total > 0);
  const activeWeeks = hasAnyActivity && currentWkData ? [currentWkData, ...pastActive] : pastActive;
  const activeWeekCount = pastActive.length + (currentWkData && currentWkData.total > 0 ? 1 : 0);

  // Most recent week with activity (skips empty weeks so the KPI is meaningful).
  const lastActiveWeek = pastActive[0] || null;
  const lastWeekTotal = lastActiveWeek ? lastActiveWeek.total : 0;
  const lastWeekLabel = lastActiveWeek ? lastActiveWeek.week : "";
  const lastWeekDone = lastActiveWeek
    ? lastActiveWeek.items.filter(it => it.outcome === "done" || it.outcome === "done_carry").length
    : 0;

  const thisWeekProjCount = new Set(currentItems.map(it => it.project).filter(Boolean)).size;

  // Current-week outcome breakdown — the coaching signal
  const currentStatus = currentItems.reduce((acc, it) => {
    const o = it.outcome;
    if (o === "blocked") acc.blocked++;
    else if (o === "carry" || o === "done_carry") acc.carrying++;
    else if (o === "done") acc.done++;
    else if (o === "partial") acc.partial++;
    else acc.pending++;
    return acc;
  }, { blocked: 0, carrying: 0, done: 0, partial: 0, pending: 0 });

  // Split scope churn by kind — buffer is NOT churn, dropped items are.
  const droppedEvents = scopeChurnEvents.filter(ev => ev.type === "deselect");
  const bufferEvents = scopeChurnEvents.filter(ev => ev.type === "buffer");

  return (
    <div key={selectedPerson} className="flow-enter-slide" style={{ display: "flex", flexDirection: "column", gap: space[4] }}>

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
            fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, color: c.textMid,
            flexShrink: 0,
          }}>{initialsOf(selectedPerson)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight,
              color: c.text, letterSpacing: typo.displayLg.tracking, lineHeight: typo.displayLg.lineHeight,
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
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  color: c.accent, background: c.accentDim,
                  padding: `${space[1]}px ${space[2]}px`, borderRadius: layout.radiusXs,
                }}>{personObj.squad}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPI GRID — 4 cards: Momentum / This Week / Last Week / Gauge ═══ */}
      <KpiGrid>
        <KpiCard
          index={0}
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
          index={1}
          label={isHistorical ? (selectedWeekKey || "Selected Week") : "This Week"}
          value={currentItems.length}
          sub={
            currentItems.length === 0
              ? "No commitments"
              : `${thisWeekProjCount} project${thisWeekProjCount !== 1 ? "s" : ""}`
          }
        />
        <KpiCard
          index={2}
          label="Last Active"
          value={lastActiveWeek ? lastWeekTotal : "—"}
          sub={
            lastActiveWeek
              ? `${lastWeekLabel} · ${lastWeekDone} of ${lastWeekTotal} done`
              : "No activity yet"
          }
        />
        <KpiCard
          index={3}
          label="Status"
          value={
            currentItems.length === 0
              ? "—"
              : (
                <span style={{ display: "inline-flex", gap: 10, alignItems: "baseline", fontVariantNumeric: "tabular-nums" }}>
                  {currentStatus.blocked > 0 && (
                    <span title="Blocked" style={{ color: c.red, fontWeight: 700 }}>{currentStatus.blocked}<span style={{ fontSize: 12, marginLeft: 2, letterSpacing: "0.08em" }}>B</span></span>
                  )}
                  {currentStatus.carrying > 0 && (
                    <span title="Carrying" style={{ color: c.orange, fontWeight: 700 }}>{currentStatus.carrying}<span style={{ fontSize: 12, marginLeft: 2, letterSpacing: "0.08em" }}>C</span></span>
                  )}
                  {currentStatus.partial > 0 && (
                    <span title="Partial" style={{ color: c.orange, fontWeight: 700 }}>{currentStatus.partial}<span style={{ fontSize: 12, marginLeft: 2, letterSpacing: "0.08em" }}>P</span></span>
                  )}
                  {currentStatus.done > 0 && (
                    <span title="Done" style={{ color: c.green, fontWeight: 700 }}>{currentStatus.done}<span style={{ fontSize: 12, marginLeft: 2, letterSpacing: "0.08em" }}>D</span></span>
                  )}
                  {currentStatus.blocked + currentStatus.carrying + currentStatus.partial + currentStatus.done === 0 && (
                    <span title="Pending" style={{ color: c.textDim, fontWeight: 700 }}>{currentStatus.pending}</span>
                  )}
                </span>
              )
          }
          sub={
            currentItems.length === 0
              ? "Awaiting commitments"
              : (() => {
                const parts = [];
                if (currentStatus.blocked) parts.push(`${currentStatus.blocked} blocked`);
                if (currentStatus.carrying) parts.push(`${currentStatus.carrying} carrying`);
                if (currentStatus.partial) parts.push(`${currentStatus.partial} partial`);
                if (currentStatus.done) parts.push(`${currentStatus.done} done`);
                if (currentStatus.pending) parts.push(`${currentStatus.pending} pending`);
                return parts.length ? parts.join(" · ") : "Awaiting close";
              })()
          }
        />
      </KpiGrid>


      {/* ═══ ACTIVITY TIMELINE — shared across Projects + People deep-dives.
             See src/components/ActivityTimeline.jsx. ═══ */}
      <div>
        <SectionHead
          title="Activity Timeline"
          right={
            <span style={{
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
              letterSpacing: "0.06em", textTransform: "uppercase", color: c.textMid,
              fontVariantNumeric: "tabular-nums",
            }}>{activeWeekCount} active week{activeWeekCount !== 1 ? "s" : ""}</span>
          }
        />
        <div style={{
          background: c.surface, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusLg, boxShadow: c.shadowCard,
          overflow: "clip",
        }}>
          {activeWeeks.length > 0 ? (
            <div style={{ maxHeight: 720, overflowY: "auto" }}>
              <ActivityTimeline
                subject="person"
                weeks={activeWeeks.map(w => ({ week: w.week, isCurrent: w.isCurrent, entries: w.items }))}
                weekLabels={[...(weekConfig?.historyWeeks || []), "This wk"]}
                currentWeekStart={weekConfig?.weekStart}
                isHistorical={isHistorical}
                selectedWeekKey={selectedWeekKey}
                projects={projects}
                onProjectNavigate={(id) => onNavigate && onNavigate("projects", id, { tab: "people", id: selectedPerson })}
                emptyMessage="No activity logged"
              />
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
                fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight,
                color: c.text, letterSpacing: typo.displaySm.tracking, marginBottom: space[1],
              }}>No activity logged</div>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: typo.bodySm.weight,
                color: c.textMid, lineHeight: 1.5,
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
