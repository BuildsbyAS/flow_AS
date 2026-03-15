// Flow — People Deep Dive (Phase 5: Telemetry Panel, Energy Bars, Signal Cards, Terminal Log, Coaching Console)
import React, { useState, useEffect, useRef } from "react";
import { c, display, body, mono, motion, layout, phaseNames, typeConfig, phaseColors as getPhaseColors, outcomeConfig } from "../styles/theme";
import { Badge, Tag, EmptyState } from "../components/shared";
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

function computePatternFlags(personData) {
  const { currentItems, weeklyData, deselectedItems, hasBuffer, cm, thisWeekTypes, tc } = personData;
  const flags = [];

  if (currentItems.length > 0 && currentItems.every(it => it.type === "JAM")) {
    const jamItems = currentItems.map(it => it.title || it.project).filter(Boolean);
    flags.push({
      id: "always-jam", severity: "warning", icon: "⚡", color: tc.JAM.color,
      label: "All JAM, no BUILD", desc: "Every commitment is collaboration — no direct delivery this week",
      evidence: jamItems.map(t => ({ text: t, week: "This wk" })),
    });
  } else if (currentItems.length > 0 && !currentItems.some(it => it.type === "BUILD")) {
    flags.push({
      id: "no-build", severity: "info", icon: "🔨", color: tc.BUILD.color,
      label: "No BUILD items", desc: "No delivery-focused commitments — review priority mix",
      evidence: currentItems.map(it => ({ text: `${it.type}: ${it.title || it.project}`, week: "This wk" })),
    });
  }

  const blockedWeeks = weeklyData.filter(w => w.types.BLOCKED > 0);
  if (blockedWeeks.length >= 2) {
    const evidence = [];
    blockedWeeks.forEach(w => {
      w.items.filter(it => it.type === "BLOCKED").forEach(it => {
        evidence.push({ text: it.task || it.title || it.project || "Blocked item", week: w.week });
      });
    });
    flags.push({
      id: "chronic-blocked", severity: "critical", icon: "🚧", color: tc.BLOCKED.color,
      label: "Chronic blocker", desc: `Blocked in ${blockedWeeks.length} of ${weeklyData.length} weeks`,
      evidence,
    });
  }

  if (deselectedItems.length > 0 || hasBuffer) {
    const evidence = [];
    deselectedItems.forEach(d => evidence.push({ text: `Dropped: ${d.title || d.project}`, week: "This wk" }));
    if (hasBuffer && cm) evidence.push({ text: `Buffer swap: ${cm.buffer}`, week: "This wk" });
    flags.push({
      id: "scope-churn", severity: "warning", icon: "↩", color: c.orange,
      label: "Scope churn", desc: "Changed commitments mid-week — watch for overcommit pattern",
      evidence,
    });
  }

  if (weeklyData.length >= 3) {
    const recent = weeklyData[weeklyData.length - 1].total;
    const earlier = weeklyData[weeklyData.length - 3].total;
    if (earlier > 0 && recent === 0) {
      flags.push({
        id: "declining", severity: "warning", icon: "📉", color: c.orange,
        label: "Activity drop", desc: `Had ${earlier} items two weeks ago, 0 now`,
        evidence: [{ text: `${weeklyData[weeklyData.length - 3].week}: ${earlier} items → This wk: ${recent}`, week: "" }],
      });
    }
  }

  if (currentItems.length >= 2) {
    const projCounts = {};
    currentItems.forEach(it => { if (it.project) projCounts[it.project] = (projCounts[it.project] || 0) + 1; });
    const topProj = Object.entries(projCounts).sort((a, b) => b[1] - a[1])[0];
    if (topProj && topProj[1] >= 2 && topProj[1] === currentItems.length) {
      flags.push({
        id: "single-project", severity: "info", icon: "🎯", color: c.blue,
        label: "Single-project focus", desc: `All ${topProj[1]} items on ${topProj[0]} — bus factor risk`,
        evidence: currentItems.map(it => ({ text: `${it.type}: ${it.title || "—"}`, week: "This wk" })),
      });
    }
  }

  return flags;
}

/* ── Coaching recommendations engine ──────────────────────── */
function generateCoachingPrompts(data, flags, personObj) {
  const prompts = [];
  const { currentItems, weeklyData, thisWeekTypes, weeksActive } = data;

  // Momentum-based
  const recent = weeklyData[weeklyData.length - 1]?.total || 0;
  const prev = weeklyData.length >= 2 ? weeklyData[weeklyData.length - 2].total : 0;
  if (recent > prev && prev > 0) {
    prompts.push({ icon: "▲", color: c.green, text: `Momentum rising — ${recent} items vs ${prev} last week. Maintain cadence.` });
  } else if (recent < prev && prev > 0) {
    prompts.push({ icon: "▼", color: c.orange, text: `Activity dipped from ${prev} to ${recent}. Check for blockers or capacity issues.` });
  }

  // Type-mix coaching
  if (thisWeekTypes.BLOCKED > 0) {
    prompts.push({ icon: "!", color: c.red, text: `${thisWeekTypes.BLOCKED} blocked item${thisWeekTypes.BLOCKED > 1 ? "s" : ""} — escalate or find alternate path.` });
  }
  if (thisWeekTypes.JAM > 0 && thisWeekTypes.BUILD === 0 && currentItems.length > 0) {
    prompts.push({ icon: "~", color: c.orange, text: "All collaboration, no delivery. Consider shifting one JAM to a BUILD commitment." });
  }
  if (currentItems.length === 0) {
    prompts.push({ icon: "?", color: c.textMid, text: "No commitments declared. Check in on capacity and priorities." });
  }

  // Reliability coaching
  const reliabilityPct = weeklyData.length > 0 ? Math.round((weeksActive / weeklyData.length) * 100) : 0;
  if (reliabilityPct >= 90) {
    prompts.push({ icon: "✓", color: c.green, text: `${reliabilityPct}% reliability — consistently delivering. Candidate for stretch goals.` });
  } else if (reliabilityPct < 60 && weeklyData.length >= 3) {
    prompts.push({ icon: "⚠", color: c.red, text: `${reliabilityPct}% reliability — inconsistent activity. Recommend 1:1 capacity review.` });
  }

  // Flag-based
  flags.forEach(f => {
    if (f.id === "chronic-blocked") {
      prompts.push({ icon: "→", color: f.color, text: "Recurring blockers detected. Consider dependency mapping session." });
    }
    if (f.id === "scope-churn") {
      prompts.push({ icon: "→", color: f.color, text: "Scope changes mid-week. Review estimation process or commitment sizing." });
    }
  });

  return prompts;
}

/* ── Momentum calculation ─────────────────────────────────── */
function getMomentum(weeklyData) {
  if (weeklyData.length < 2) return { direction: "flat", delta: 0 };
  const curr = weeklyData[weeklyData.length - 1].total;
  const prev = weeklyData[weeklyData.length - 2].total;
  const delta = curr - prev;
  if (delta > 0) return { direction: "up", delta };
  if (delta < 0) return { direction: "down", delta };
  return { direction: "flat", delta: 0 };
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
  const [expandedFlags, setExpandedFlags] = useState({});
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
    setExpandedFlags({});
    if (setDetailLabel) setDetailLabel(null);
    if (setGoBack) setGoBack(null);
  };

  const openPerson = (name) => {
    setSelectedPerson(name);
    setExpandedFlags({});
    if (setDetailLabel) setDetailLabel(name);
    if (setGoBack) setGoBack(() => goBackToList);
  };

  useEffect(() => {
    if (initialPerson && setDetailLabel) {
      setDetailLabel(initialPerson);
      if (setGoBack) setGoBack(() => goBackToList);
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Sticky filter bar — top: 92 to clear header (52) + filter bar (40) */}
        <div style={{ position: "sticky", top: 92, zIndex: 10, background: c.bg, paddingTop: 4, paddingBottom: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "12px 16px", background: c.surface, borderRadius: 12, border: `1px solid ${c.border}` }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <input ref={localSearchRef} value={search} onChange={e => { setSearch(e.target.value); setFocusIdx(0); }} className="flow-input"
              placeholder="Search by name..."
              style={{ width: "100%", padding: "10px 16px 10px 38px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text, fontFamily: body, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: c.textMid, pointerEvents: "none" }}>🔍</span>
            <span className="flow-search-hint">/</span>
          </div>
          <select value={fSquad} onChange={e => setFSquad(e.target.value)} className="flow-input"
            style={{ minWidth: 110, fontSize: 12, background: c.surfaceAlt, padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.border}`, color: c.text, fontFamily: body }}>
            <option value="">All squads</option>
            {allSquads.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fRole} onChange={e => setFRole(e.target.value)} className="flow-input"
            style={{ minWidth: 130, fontSize: 12, background: c.surfaceAlt, padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.border}`, color: c.text, fontFamily: body }}>
            <option value="">All roles</option>
            {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(""); setFSquad(""); setFRole(""); }} className="flow-btn" style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${c.accent}40`, background: c.accentDim, cursor: "pointer", fontFamily: body, fontSize: 12, fontWeight: 600, color: c.accent }}>
              <kbd style={{ fontFamily: mono, fontSize: 9, color: c.accent, background: "transparent", padding: "0 2px", border: "none", marginRight: 3 }}>C</kbd>Clear ({activeFilters})
            </button>
          )}
          <span style={{ fontFamily: mono, fontSize: 11, color: c.textDim, marginLeft: "auto" }}>{filtered.length}<span style={{ color: c.textDim + "80" }}>/{people.length}</span></span>
        </div>
        </div>

        {/* People grouped by squad */}
        {Object.entries(squadsWithPeople).map(([squad, members]) => {
          const startIdx = flatIdx;
          flatIdx += members.length;
          return (
            <div key={squad}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 16 }}>
                <div style={{ width: 4, height: 20, borderRadius: 3, background: c.accent }} />
                <span style={{ fontFamily: display, fontSize: 17, fontWeight: 800, color: c.accent }}>{squad}</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: c.textDim, fontWeight: 500 }}>{members.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
                {members.map((p, gi) => {
                  const cm = commitments.find(x => x.person === p.name);
                  const items = cm ? cm.items.filter((_, idx) => cm.deselected !== idx) : [];
                  const types = {};
                  items.forEach(it => { types[it.type] = (types[it.type] || 0) + 1; });
                  const hasDeselect = cm && cm.deselected >= 0;
                  const isFocused = kbActive && (startIdx + gi) === focusIdx;

                  return (
                    <div key={gi} className={`flow-row${isFocused ? " flow-kb-focus" : ""}`} onClick={() => openPerson(p.name)} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 18px", background: isFocused ? c.accentDim : c.surface, borderRadius: 12, cursor: "pointer",
                      border: `1px solid ${isFocused ? c.accent + "40" : c.border}`,
                      transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.accentDim, border: `1.5px solid ${c.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display, fontSize: 15, fontWeight: 700, color: c.accent, flexShrink: 0 }}>
                          {p.name.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{p.name}</div>
                          <div style={{ fontFamily: body, fontSize: 12, fontWeight: 500, color: c.textMid, marginTop: 3, lineHeight: 1.2 }}>
                            {p.role}<span style={{ color: c.textDim, margin: "0 5px" }}>·</span><span style={{ color: c.textDim }}>{p.squad}</span>
                          </div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 6 }}>
                            {hasDeselect && <span style={{ fontSize: 10, color: c.orange, marginRight: 2 }} title="Scope churn">↩</span>}
                            {items.length === 0 ? (
                              <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>No commitments</span>
                            ) : Object.entries(types).map(([t, n]) => (
                              <Tag key={t} color={tc[t]?.color} bg={tc[t]?.bg} style={{ padding: "2px 6px", fontSize: 10 }}>{n}{t.charAt(0)}</Tag>
                            ))}
                          </div>
                        </div>
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
  const flags = computePatternFlags(data);
  const coachPrompts = generateCoachingPrompts(data, flags, personObj);
  const momentum = getMomentum(data.weeklyData);
  const { currentItems, weeklyData, scopeChurnEvents } = data;

  const allPersonProjects = Object.keys(data.projectMap);
  const maxWeekTotal = Math.max(...weeklyData.map(w => w.total), 1);
  const reliabilityPct = weeklyData.length > 0 ? Math.round((data.weeksActive / weeklyData.length) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ═══ PROFILE TELEMETRY PANEL ═══════════════════════ */}
      <div className="flow-telemetry-panel" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `linear-gradient(135deg, ${c.accentDim}, ${c.purple}15)`,
              border: `2px solid ${c.accent}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: display, fontSize: 22, fontWeight: 700, color: c.accent,
            }}>{selectedPerson.charAt(0)}</div>
            <div>
              <div style={{ fontFamily: display, fontSize: 26, fontWeight: 800, color: c.text, letterSpacing: "-0.03em" }}>{selectedPerson}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                {personObj && <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: c.textMid }}>{personObj.role}</span>}
                {personObj && <span style={{ fontFamily: mono, fontSize: 11, color: c.textDim }}>·</span>}
                {personObj && <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: c.accent }}>{personObj.squad}</span>}
              </div>
            </div>
          </div>

          {/* Momentum arrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10, background: c.surface, border: `1px solid ${c.border}` }}>
            <span className={`flow-momentum-${momentum.direction}`} style={{
              fontFamily: display, fontSize: 20, fontWeight: 800,
            }}>
              {momentum.direction === "up" ? "▲" : momentum.direction === "down" ? "▼" : "—"}
            </span>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em" }}>MOMENTUM</div>
              <div style={{
                fontFamily: display, fontSize: 14, fontWeight: 700,
                color: momentum.direction === "up" ? c.green : momentum.direction === "down" ? c.red : c.textDim,
              }}>
                {momentum.direction === "up" ? `+${momentum.delta}` : momentum.direction === "down" ? `${momentum.delta}` : "Steady"}
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, position: "relative", zIndex: 1, borderTop: `1px solid ${c.border}`, paddingTop: 20 }}>
          {[
            { label: "THIS WEEK", value: currentItems.length, color: c.text },
            { label: "PROJECTS", value: allPersonProjects.length, color: c.accent },
            { label: "RELIABILITY", value: `${reliabilityPct}%`, color: reliabilityPct >= 80 ? c.green : reliabilityPct >= 50 ? c.orange : c.red, highlight: true },
            { label: "WEEKS ACTIVE", value: `${data.weeksActive}/${weeklyData.length}`, color: c.text },
          ].map((m, i) => (
            <div key={i} style={{
              textAlign: "center", padding: "14px 8px", borderRadius: 10,
              background: m.highlight ? (reliabilityPct >= 80 ? c.greenDim : reliabilityPct >= 50 ? c.orangeDim : c.redDim) : "transparent",
              border: m.highlight ? `1px solid ${m.color}20` : "none",
            }}>
              <div style={{ fontFamily: display, fontSize: 28, fontWeight: 800, color: m.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim, letterSpacing: "0.08em", marginTop: 6, textTransform: "uppercase" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>


      {/* ═══ STACKED ENERGY BARS — work mix ════════════════ */}
      <div style={{ background: c.surface, borderRadius: 14, padding: "20px 24px", border: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: c.text }}>Energy Mix</div>
          <div style={{ display: "flex", gap: 12 }}>
            {["BUILD", "JAM", "COMMIT", "BLOCKED"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: tc[t]?.color }} />
                <span style={{ fontFamily: mono, fontSize: 9, color: c.textDim }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        {currentItems.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["BUILD", "JAM", "COMMIT", "BLOCKED"].map((t, ti) => {
              const n = data.thisWeekTypes[t] || 0;
              const pct = Math.round(n / currentItems.length * 100);
              if (n === 0) return null;
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: tc[t]?.color, width: 64, flexShrink: 0 }}>{t}</span>
                  <div className="flow-energy-bar-track" style={{ flex: 1 }}>
                    <div className="flow-energy-bar-fill" style={{
                      "--bar-width": `${pct}%`,
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${tc[t]?.color}80, ${tc[t]?.color})`,
                      animationDelay: `${ti * 0.1}s`,
                    }}>
                      <span className="flow-energy-bar-pct">{pct}%</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: tc[t]?.color, width: 30, textAlign: "right", flexShrink: 0 }}>{n}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "8px 0", fontFamily: body, fontSize: 13, color: c.textDim }}>No commitments this week</div>
        )}
      </div>


      {/* ═══ SIGNAL CARDS — pattern flags with severity waveform ═══ */}
      {flags.length > 0 && (
        <div>
          <div style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 10 }}>Signal Flags</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {flags.map((flag, fi) => {
              const isExpanded = !!expandedFlags[flag.id];
              const sevClass = flag.severity === "critical" ? "flow-signal-critical" : flag.severity === "warning" ? "flow-signal-warning" : "flow-signal-info";
              return (
                <div key={flag.id}
                  className={`flow-signal-card ${sevClass}`}
                  onClick={() => setExpandedFlags(prev => ({ ...prev, [flag.id]: !prev[flag.id] }))}
                  style={{ animationDelay: `${fi * 0.1}s` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
                    <span style={{ fontSize: 16 }}>{flag.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: flag.color }}>{flag.label}</span>
                        <span style={{
                          fontFamily: mono, fontSize: 9, fontWeight: 700,
                          padding: "2px 6px", borderRadius: 4,
                          background: flag.severity === "critical" ? c.redDim : flag.severity === "warning" ? c.orangeDim : c.blueDim,
                          color: flag.color, textTransform: "uppercase",
                        }}>{flag.severity}</span>
                      </div>
                      <div style={{ fontFamily: body, fontSize: 12, color: c.textMid, marginTop: 3 }}>{flag.desc}</div>
                    </div>
                    {flag.evidence.length > 0 && (
                      <span style={{ fontFamily: mono, fontSize: 12, color: c.textDim, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                    )}
                  </div>
                  {/* Expanded evidence */}
                  {isExpanded && flag.evidence.length > 0 && (
                    <div className="flow-signal-expand" style={{ padding: "0 16px 12px", borderTop: `1px solid ${c.border}` }}>
                      {flag.evidence.map((ev, ei) => (
                        <div key={ei} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: ei < flag.evidence.length - 1 ? `1px solid ${c.border}40` : "none" }}>
                          <span style={{ fontFamily: mono, fontSize: 10, color: flag.color }}>→</span>
                          <span style={{ fontFamily: body, fontSize: 12, color: c.text, flex: 1 }}>{ev.text}</span>
                          {ev.week && <span style={{ fontFamily: mono, fontSize: 9, color: c.textDim }}>{ev.week}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {flags.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: c.greenDim, borderRadius: 10, border: `1px solid ${c.green}20` }}>
          <span style={{ fontSize: 15, color: c.green }}>✓</span>
          <span style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: c.green }}>No signals flagged</span>
          <span style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>— Healthy commitment mix and consistent activity</span>
        </div>
      )}


      {/* ═══ TERMINAL LOG STREAM — weekly timeline ═════════ */}
      <div className="flow-terminal-log">
        <div className="flow-terminal-header">
          <div className="flow-terminal-dot" style={{ background: c.red }} />
          <div className="flow-terminal-dot" style={{ background: c.orange }} />
          <div className="flow-terminal-dot" style={{ background: c.green }} />
          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: c.textMid, marginLeft: 8 }}>timeline@{selectedPerson.split(" ")[0].toLowerCase()}</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginLeft: "auto" }}>{weeklyData.length} weeks</span>
        </div>
        <div style={{ padding: "8px 0", maxHeight: 400, overflowY: "auto" }}>
          {[...weeklyData].reverse().filter(w => w.total > 0).length > 0 ? (
            [...weeklyData].reverse().filter(w => w.total > 0).map((w, wi) => (
              <React.Fragment key={wi}>
                {/* Week separator */}
                <div style={{ padding: "8px 16px 4px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: w.isCurrent ? c.accent : c.textDim }}>
                    {w.isCurrent ? "▸ THIS WEEK" : `▸ ${w.week.toUpperCase()}`}
                  </span>
                  <div style={{ flex: 1, height: 1, background: c.border }} />
                  <span style={{ fontFamily: mono, fontSize: 9, color: c.textDim }}>{w.total} entries</span>
                </div>
                {w.items.map((entry, ei) => {
                  const projObj = projects.find(p => p.id === entry.project);
                  return (
                    <div key={`${wi}-${ei}`} className="flow-terminal-line" style={{ animationDelay: `${(wi * 3 + ei) * 0.04}s` }}>
                      {/* Type marker */}
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: tc[entry.type]?.color || c.textDim,
                        boxShadow: `0 0 6px ${tc[entry.type]?.color || c.textDim}40`,
                        flexShrink: 0, marginTop: 5,
                      }} />
                      {/* Timestamp */}
                      <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim, flexShrink: 0, width: 52, marginTop: 1 }}>
                        {w.isCurrent ? "now" : w.week.split(" ")[0].substring(0, 3)}
                      </span>
                      {/* Type badge */}
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 700,
                        color: tc[entry.type]?.color, background: tc[entry.type]?.bg,
                        padding: "2px 6px", borderRadius: 3, flexShrink: 0,
                      }}>{entry.type}</span>
                      {/* Project */}
                      <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", entry.project); }}
                        style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: c.accent, cursor: "pointer", flexShrink: 0 }}>
                        {entry.project}
                      </span>
                      {/* Stage */}
                      <span style={{ fontFamily: mono, fontSize: 9, color: pc[entry.stage] || c.textDim, fontWeight: 600, flexShrink: 0 }}>
                        {entry.stage}
                      </span>
                      {/* Task */}
                      <span style={{ fontFamily: body, fontSize: 12, color: c.textMid, flex: 1, minWidth: 0 }}>
                        {entry.title || entry.task || "—"}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          ) : (
            <div style={{ padding: "20px 16px", textAlign: "center", fontFamily: mono, fontSize: 12, color: c.textDim }}>
              $ no activity logged<span className="flow-terminal-cursor" />
            </div>
          )}
          {/* Terminal prompt */}
          {[...weeklyData].reverse().filter(w => w.total > 0).length > 0 && (
            <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: c.accent }}>$</span>
              <span className="flow-terminal-cursor" />
            </div>
          )}
        </div>
      </div>


      {/* ═══ COACHING CONSOLE — animated recommendations ═══ */}
      {coachPrompts.length > 0 && (
        <div className="flow-coaching-console">
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${c.accent}15`, display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: c.accent }}>$</span>
            <span style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: c.text }}>Coaching Console</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim, marginLeft: "auto" }}>{coachPrompts.length} recommendation{coachPrompts.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8, position: "relative", zIndex: 1 }}>
            {coachPrompts.map((prompt, pi) => (
              <div key={pi} className="flow-coach-prompt" style={{ animationDelay: `${pi * 0.1}s` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderRadius: 8, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>
                  <span style={{
                    fontFamily: mono, fontSize: 14, fontWeight: 800,
                    color: prompt.color, flexShrink: 0, width: 18, textAlign: "center", marginTop: 1,
                  }}>{prompt.icon}</span>
                  <span style={{ fontFamily: body, fontSize: 13, color: c.text, lineHeight: 1.5 }}>{prompt.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ═══ SCOPE CHURN ══════════════════════════════════ */}
      {scopeChurnEvents.length > 0 && (
        <div style={{ padding: "8px 0" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 4, fontFamily: body, fontSize: 11, color: c.textMid, lineHeight: 1.5 }}>
            <span style={{ color: c.orange, fontSize: 10 }}>↩</span>
            <span style={{ fontWeight: 600, color: c.textMid }}>Scope churn this week:</span>
            {scopeChurnEvents.map((ev, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
                <span>{ev.label}</span>
                {ev.project && (
                  <span onClick={() => { if (onNavigate) onNavigate("projects", ev.project); }}
                    style={{ fontFamily: mono, fontSize: 10, color: c.accent, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.accent + "40" }}>
                    {ev.project}
                  </span>
                )}
                {i < scopeChurnEvents.length - 1 && <span>·</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleDeepDive;
