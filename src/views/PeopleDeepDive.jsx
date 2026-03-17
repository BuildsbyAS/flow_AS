// Flow — People Deep Dive (Phase 4: Coaching Console, Signal Cards, Terminal Log, Telemetry Hero)
import React, { useState, useEffect, useRef } from "react";
import { c, motion, layout, typo, space, typeConfig, phaseColors as getPhaseColors, outcomeConfig, entityColors } from "../styles/theme";
import { Tag, EmptyState, Surface, Label, Btn, Sel, StatCell } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import { weekConfig } from "../data/seed";

/* ── helpers ──────────────────────────────────────────────── */

function computePersonData(person, commitments, projects, history) {
  const cm = commitments.find(x => x.person === person);
  const tc = typeConfig();
  const pc = getPhaseColors();
  const oc = outcomeConfig();
  const weeks = weekConfig.historyWeeks;

  const currentItems = cm
    ? cm.items.filter((_, i) => cm.deselected !== i).map(it => ({ ...it, person }))
    : [];

  const deselectedItems = cm && cm.deselected >= 0
    ? [{ ...cm.items[cm.deselected], person, deselectedIdx: cm.deselected }]
    : [];

  const hasBuffer = cm && cm.buffer;

  const thisWeekTypes = { BUILD: 0, JAM: 0, COMMIT: 0, BLOCKED: 0 };
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
    const types = { BUILD: 0, JAM: 0, COMMIT: 0, BLOCKED: 0 };
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
  const weeksActive = weeklyData.filter(w => w.total > 0).length;

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
    weeksActive, scopeChurnEvents, tc, pc, oc,
  };
}



/* ═══════════════════════════════════════════════════════════ */
/*  PEOPLE DEEP DIVE                                         */
/* ═══════════════════════════════════════════════════════════ */

const PeopleDeepDive = ({ people, commitments, projects, history, onNavigate, initialPerson, setDetailLabel, setGoBack, searchRef }) => {
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
  const activeFilters = [fSquad, fRole, search].filter(Boolean).length;

  const filtered = people.filter(p => {
    if (fSquad && p.squad !== fSquad) return false;
    if (fRole && p.role !== fRole) return false;
    if (search) { const q = search.toLowerCase(); if (!p.name.toLowerCase().includes(q)) return false; }
    return true;
  });

  const squadsWithPeople = {};
  filtered.forEach(p => {
    if (!squadsWithPeople[p.squad]) squadsWithPeople[p.squad] = [];
    squadsWithPeople[p.squad].push(p);
  });
  const flatFiltered = [];
  Object.values(squadsWithPeople).forEach(members => flatFiltered.push(...members));

  useEffect(() => {
    if (searchRef) searchRef.current = localSearchRef.current;
  }, [searchRef, selectedPerson]);

  const goBackToList = () => {
    setSelectedPerson(null);
    setKbActive(false);
    if (setDetailLabel) setDetailLabel(null);
    if (setGoBack) setGoBack(null);
  };

  const openPerson = (name) => {
    setSelectedPerson(name);
    if (setDetailLabel) setDetailLabel(name);
    if (setGoBack) setGoBack(goBackToList);
  };

  useEffect(() => {
    if (initialPerson && setDetailLabel) {
      setDetailLabel(initialPerson);
      if (setGoBack) setGoBack(goBackToList);
    }
  }, []);

  useKeyboard(!selectedPerson ? [
    { key: "ArrowUp", fn: () => { setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } },
    { key: "ArrowDown", fn: () => { setKbActive(true); setFocusIdx(i => Math.min(flatFiltered.length - 1, i + 1)); } },
    { key: "Enter", fn: () => { if (flatFiltered[focusIdx]) openPerson(flatFiltered[focusIdx].name); } },
    { key: "c", fn: () => { setSearch(""); setFSquad(""); setFRole(""); } },
  ] : [], [flatFiltered.length, focusIdx, selectedPerson]);

  useEffect(() => {
    if (focusIdx >= flatFiltered.length && flatFiltered.length > 0) setFocusIdx(flatFiltered.length - 1);
  }, [flatFiltered.length, focusIdx]);


  /* ═══ LIST VIEW ═══════════════════════════════════════════ */

  if (!selectedPerson) {
    let flatIdx = 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        {/* Sticky filter bar */}
        <div style={{ position: "sticky", top: 92, zIndex: 10, background: c.bg, paddingTop: space[1], paddingBottom: space[2] }}>
        <Surface variant="panel" style={{ display: "flex", gap: space[2], alignItems: "center", flexWrap: "wrap", padding: `${space[3]}px ${space[4]}px` }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input ref={localSearchRef} value={search} onChange={e => { setSearch(e.target.value); setFocusIdx(0); }} className="flow-input"
              placeholder="Search by name..."
              style={{ width: "100%", padding: `${space[3]}px ${space[4]}px ${space[3]}px 38px`, borderRadius: layout.radiusMd, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, outline: "none", boxSizing: "border-box" }} />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: c.textMid, pointerEvents: "none" }}>🔍</span>
            <span className="flow-search-hint">/</span>
          </div>
          <Sel value={fSquad} onChange={e => setFSquad(e.target.value)} style={{ minWidth: 110, fontSize: typo.bodySm.size }}>
            <option value="">All squads</option>
            {allSquads.map(s => <option key={s} value={s}>{s}</option>)}
          </Sel>
          <Sel value={fRole} onChange={e => setFRole(e.target.value)} style={{ minWidth: 130, fontSize: typo.bodySm.size }}>
            <option value="">All roles</option>
            {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </Sel>
          {activeFilters > 0 && (
            <Btn variant="command" size="sm" onClick={() => { setSearch(""); setFSquad(""); setFRole(""); }}>
              <kbd style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.accent, background: "transparent", padding: "0 2px", border: "none", marginRight: 3 }}>C</kbd>Clear ({activeFilters})
            </Btn>
          )}
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textMid, marginLeft: "auto" }}>{filtered.length}<span style={{ color: c.textMid + "80" }}>/{people.length}</span></span>
        </Surface>
        </div>

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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: space[3] }}>
                {members.map((p, gi) => {
                  const cm = commitments.find(x => x.person === p.name);
                  const items = cm ? cm.items.filter((_, idx) => cm.deselected !== idx) : [];
                  const hasDeselect = cm && cm.deselected >= 0;
                  const isFocused = kbActive && (startIdx + gi) === focusIdx;

                  // Quick reliability preview
                  const personWeeks = weekConfig.historyWeeks;
                  let activeWks = 0;
                  personWeeks.forEach(w => {
                    const active = Object.values(history).some(ph =>
                      ph.some(wk => wk.week === w && wk.entries.some(e => e.person === p.name))
                    );
                    if (active) activeWks++;
                  });
                  if (items.length > 0) activeWks++;
                  const relPct = personWeeks.length > 0 ? Math.round((activeWks / (personWeeks.length + 1)) * 100) : 0;

                  return (
                    <div key={gi} className={`flow-row${isFocused ? " flow-kb-focus" : ""}`} onClick={() => openPerson(p.name)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: `${space[4]}px ${space[5]}px`, background: isFocused ? c.accentDim : c.surface,
                      borderRadius: layout.radius, cursor: "pointer",
                      border: `1px solid ${isFocused ? c.accent + "40" : c.border}`,
                      transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[4], minWidth: 0, flex: 1 }}>
                        <div style={{ width: space[8], height: space[8], borderRadius: "50%", background: c.accentDim, border: `1.5px solid ${c.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.accent, flexShrink: 0 }}>
                          {p.name.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: typo.displaySm.tracking, lineHeight: typo.displaySm.lineHeight }}>{p.name}</span>
                            {hasDeselect && <span style={{ fontSize: 12, color: c.orange }} title="Scope churn">↩</span>}
                          </div>
                          <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.textMid, marginTop: space[1], lineHeight: 1.2 }}>
                            {p.role}
                          </div>
                        </div>
                      </div>
                      {/* Reliability indicator */}
                      <div style={{ textAlign: "center", flexShrink: 0, marginLeft: space[3] }}>
                        <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: relPct >= 80 ? c.green : relPct >= 50 ? c.orange : c.red, lineHeight: 1 }}>{relPct}%</div>
                        <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, marginTop: space[1] }}>Reliability</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && <EmptyState icon="👤" title="No people match" message="Try adjusting your filters or search query." action={activeFilters > 0 ? "Clear all filters" : null} onAction={() => { setSearch(""); setFSquad(""); setFRole(""); }} />}
      </div>
    );
  }


  /* ═══ DETAIL VIEW ═══════════════════════════════════════ */

  const personObj = people.find(p => p.name === selectedPerson);
  const data = computePersonData(selectedPerson, commitments, projects, history);
  const { currentItems, weeklyData, scopeChurnEvents } = data;

  const allPersonProjects = Object.keys(data.projectMap);
  const reliabilityPct = weeklyData.length > 0 ? Math.round((data.weeksActive / weeklyData.length) * 100) : 0;

  // Last 4 weeks summary data
  const last4 = weeklyData.filter(w => !w.isCurrent).slice(-4);
  const last4Total = last4.reduce((s, w) => s + w.total, 0);
  const last4Active = last4.filter(w => w.total > 0).length;
  const last4Projects = new Set();
  last4.forEach(w => w.items.forEach(it => { if (it.project) last4Projects.add(it.project); }));

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
            }}>{selectedPerson.charAt(0)}</div>
            <div>
              <div style={{ fontFamily: typo.displayXl.font, fontSize: typo.displayXl.size, fontWeight: typo.displayXl.weight, color: c.text, letterSpacing: typo.displayXl.tracking, lineHeight: 1.15 }}>{selectedPerson}</div>
              <div style={{ display: "flex", alignItems: "center", gap: space[2], marginTop: space[2] }}>
                {personObj && <span style={{ fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size, fontWeight: typo.bodyLg.weight, color: c.textMid }}>{personObj.role}</span>}
                {personObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>·</span>}
                {personObj && <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, letterSpacing: typo.monoLg.tracking, color: c.accent }}>{personObj.squad}</span>}
              </div>
            </div>
          </div>

          {/* Reliability highlight */}
          <div style={{ textAlign: "center", padding: `${space[2]}px ${space[4]}px`, borderRadius: layout.radiusMd, background: reliabilityPct >= 80 ? c.greenDim : reliabilityPct >= 50 ? c.orangeDim : c.redDim, border: `1px solid ${(reliabilityPct >= 80 ? c.green : reliabilityPct >= 50 ? c.orange : c.red)}20` }}>
            <div style={{ fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size, fontWeight: typo.displayLg.weight, color: reliabilityPct >= 80 ? c.green : reliabilityPct >= 50 ? c.orange : c.red, lineHeight: 1 }}>{reliabilityPct}%</div>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, marginTop: space[1] }}>Reliability</div>
          </div>
        </div>

        {/* Last 4 weeks — directly below identity */}
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: space[4], position: "relative", zIndex: 1 }}>
          <Label style={{ marginBottom: space[3] }}>Last 4 Weeks</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: space[3] }}>
            <StatCell value={`${last4Active}/${last4.length}`} label="Active weeks" color={c.text} style={{ textAlign: "left" }} />
            <StatCell value={last4Total} label="Commitments" color={c.accent} style={{ textAlign: "left" }} />
            <StatCell value={`${reliabilityPct}%`} label="Reliability" color={reliabilityPct >= 80 ? c.green : reliabilityPct >= 50 ? c.orange : c.red} style={{ textAlign: "left" }} />
            <StatCell value={last4Projects.size} label="Projects" color={c.text} style={{ textAlign: "left" }} />
          </div>
        </div>
      </div>


      {/* ═══ THIS WEEK SUMMARY (with scope churn if present) ═ */}
      <Surface variant="panel" style={{ padding: `${space[4]}px ${space[5]}px` }}>
        <Label style={{ marginBottom: space[3] }}>This Week</Label>
        {currentItems.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>
              {currentItems.length} commitment{currentItems.length !== 1 ? "s" : ""} across {new Set(currentItems.map(it => it.project).filter(Boolean)).size} project{new Set(currentItems.map(it => it.project).filter(Boolean)).size !== 1 ? "s" : ""}
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
                  <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text }}>{it.title || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>No commitments this week</div>
        )}
        {scopeChurnEvents.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: space[1], padding: `${space[2]}px ${space[3]}px`, marginTop: space[3], background: c.orangeDim, borderRadius: layout.radiusMd, border: `1px solid ${c.orange}15`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, lineHeight: 1.5 }}>
            <span style={{ color: c.orange, fontWeight: 600 }}>↩ Scope churn:</span>
            {scopeChurnEvents.map((ev, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
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
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size + 1, fontWeight: 600, color: c.textMid, marginLeft: space[2] }}>timeline@{selectedPerson.split(" ")[0].toLowerCase()}</span>
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim, marginLeft: "auto" }}>{weeklyData.length} weeks</span>
        </div>
        <div style={{ padding: `${space[2]}px 0`, maxHeight: 420, overflowY: "auto" }}>
          {[...weeklyData].reverse().filter(w => w.total > 0).length > 0 ? (
            [...weeklyData].reverse().filter(w => w.total > 0).map((w, wi) => (
              <React.Fragment key={wi}>
                {/* Week separator */}
                <div style={{ padding: `${space[2]}px ${space[4]}px ${space[1]}px`, display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: w.isCurrent ? c.accent : c.textDim }}>
                    {w.isCurrent ? "▸ This week" : `▸ ${w.week}`}
                  </span>
                  <div style={{ flex: 1, height: 1, background: w.isCurrent ? `${c.accent}30` : c.border }} />
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim }}>{w.total} {w.total === 1 ? "entry" : "entries"}</span>
                </div>
                {w.items.map((entry, ei) => (
                  <div key={`${wi}-${ei}`} className="flow-terminal-line" style={{
                    animationDelay: `${(wi * 3 + ei) * 0.04}s`,
                    opacity: w.isCurrent ? 1 : 0.8,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: tc[entry.type]?.color || c.textDim,
                      boxShadow: w.isCurrent ? `0 0 6px ${tc[entry.type]?.color || c.textDim}40` : "none",
                      flexShrink: 0, marginTop: 5,
                    }} />
                    <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", entry.project); }}
                      style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, color: entityColors().project, cursor: "pointer", flexShrink: 0, width: 64 }}>
                      {entry.project}
                    </span>
                    <Tag color={tc[entry.type]?.color} bg={tc[entry.type]?.bg}>{entry.type}</Tag>
                    <Tag color={pc[entry.stage] || c.textDim} bg={(pc[entry.stage] || c.textDim) + "12"}>{entry.stage}</Tag>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: w.isCurrent ? c.text : c.textMid, flex: 1, minWidth: 0 }}>
                      {entry.title || entry.task || "—"}
                    </span>
                  </div>
                ))}
              </React.Fragment>
            ))
          ) : (
            <div style={{ padding: `${space[5]}px ${space[4]}px`, textAlign: "center", fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, color: c.textDim }}>
              $ no activity logged<span className="flow-terminal-cursor" />
            </div>
          )}
          {[...weeklyData].reverse().filter(w => w.total > 0).length > 0 && (
            <div style={{ padding: `${space[2]}px ${space[4]}px`, display: "flex", alignItems: "center", gap: space[1] + 2 }}>
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
