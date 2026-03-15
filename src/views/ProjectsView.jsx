// Flow — Projects Deep Dive (Phase 4: Command Card, Pipeline, Sparklines, Evidence Feed, Overdue)
import React, { useState, useEffect, useRef } from "react";
import { c, display, body, mono, motion, layout, phaseNames, typeConfig, phaseColors } from "../styles/theme";
import { Badge, Tag, Label, Inp, Sel, EmptyState } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import { weekConfig } from "../data/seed";

// ═══ PHASE PIPELINE — animated phase nodes with glowing current ══════
const PhasePipeline = ({ currentPhase }) => {
  const pc = phaseColors();
  const curIdx = phaseNames.indexOf(currentPhase);
  return (
    <div className="flow-phase-pipeline" style={{ padding: "4px 0" }}>
      {phaseNames.map((ph, i) => {
        const done = i < curIdx;
        const active = i === curIdx;
        const future = i > curIdx;
        const color = pc[ph] || c.textDim;
        return (
          <React.Fragment key={ph}>
            {i > 0 && (
              <div className="flow-phase-connector" style={{
                background: done ? `linear-gradient(90deg, ${pc[phaseNames[i-1]]}, ${color})` : `${c.border}`,
                opacity: done ? 0.8 : 0.3,
              }} />
            )}
            <div className={`flow-phase-node${active ? " flow-phase-node-active" : ""}`} style={{
              background: done ? `${color}30` : active ? `${color}25` : c.surfaceAlt,
              border: `2px solid ${done || active ? color : c.border}`,
              color: done || active ? color : c.textDim,
              opacity: future ? 0.4 : 1,
            }}>
              {done ? "✓" : i + 1}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ═══ TIMELINE BAR — animated marker + overdue scan pulse ═════════════
const TimelineBar = ({ pctElapsed, overdue, remaining, startDate, endDate }) => {
  const fillColor = overdue ? c.red : pctElapsed > 75 ? c.orange : c.green;
  return (
    <div style={{ marginTop: 16 }}>
      <div className={`flow-timeline-bar${overdue ? " flow-timeline-overdue" : ""}`}>
        <div className="flow-timeline-fill" style={{
          width: `${Math.min(pctElapsed, 100)}%`,
          background: overdue
            ? `linear-gradient(90deg, ${c.red}80, ${c.red})`
            : `linear-gradient(90deg, ${fillColor}40, ${fillColor})`,
        }}>
          {/* Animated marker at tip */}
          <div className="flow-timeline-marker" style={{
            right: -5,
            background: fillColor,
            boxShadow: `0 0 10px ${fillColor}60`,
          }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: c.textMid }}>{startDate}</span>
        <span style={{ fontFamily: mono, fontSize: 12, color: overdue ? c.red : remaining < 14 ? c.orange : c.textDim, fontWeight: overdue ? 700 : 500 }}>
          {overdue ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
        </span>
        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: overdue ? c.red : c.textMid }}>{endDate}</span>
      </div>
    </div>
  );
};

// ═══ SPARKLINE STRIP — hover tooltips + motion-traced bars ═══════════
const SparklineStrip = ({ weeklyActivity, maxActivity }) => {
  return (
    <div className="flow-sparkline-strip" style={{ height: 48, padding: "0 4px" }}>
      {weeklyActivity.map((w, i) => {
        const h = Math.max(4, (w.count / maxActivity) * 44);
        const barColor = w.current ? c.accent : w.count > 0 ? c.accent + "60" : c.surfaceAlt;
        return (
          <div key={i} className="flow-spark-bar" style={{
            flex: 1,
            height: h,
            background: w.current
              ? `linear-gradient(0deg, ${c.accent}40, ${c.accent})`
              : barColor,
            animationDelay: `${i * 0.06}s`,
            borderBottom: w.current ? `2px solid ${c.accent}` : "none",
          }}>
            <div className="flow-spark-tooltip">
              <div>{w.week}</div>
              <div style={{ color: w.current ? c.accent : c.textMid, fontWeight: 700 }}>{w.count} tasks</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══ EVIDENCE FEED — chronological animated cards ════════════════════
const EvidenceCard = ({ item, index, proj, tc, pc, onNavigate, isCurrentWeek }) => {
  const cm = item._cm;
  const itemOutcome = cm ? cm.items.find(ci => ci.project === proj.id && ci.title === item.title)?.outcome : null;
  const oc = itemOutcome === "done" ? c.green : itemOutcome === "partial" ? c.orange : itemOutcome === "carry" ? c.blue : c.accent;
  return (
    <div className={`flow-evidence-card${isCurrentWeek ? " flow-evidence-card-pulse" : ""}`}
      style={{ animationDelay: `${index * 0.06}s` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: isCurrentWeek ? c.accentDim : c.surfaceAlt,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: display, fontSize: 10, fontWeight: 700,
            color: isCurrentWeek ? c.accent : c.textDim, flexShrink: 0,
          }}>{item.person.charAt(0)}</div>
          <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", item.person); }}
            style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text, cursor: "pointer" }}>
            {item.person}
          </span>
          <Badge color={tc[item.type]?.color} bg={tc[item.type]?.bg}>{item.type}</Badge>
          <span style={{ fontFamily: mono, fontSize: 11, color: pc[item.stage || proj.phase] || c.textDim, fontWeight: 600 }}>
            {item.stage || proj.phase}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {itemOutcome && <Tag color={oc} bg={`${oc}15`}>{itemOutcome.toUpperCase()}</Tag>}
          {/* Timeline dot */}
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: oc, boxShadow: `0 0 6px ${oc}40` }} />
        </div>
      </div>
      <div style={{
        fontFamily: body, fontSize: 13, color: c.textMid, lineHeight: 1.5,
        paddingLeft: 32,
        textDecoration: itemOutcome === "done" ? `line-through ${c.green}60` : "none",
      }}>{item.title || "—"}</div>
    </div>
  );
};

// ═══ PROJECTS VIEW ══════════════════════════════════════════════
const ProjectsView = ({ projects, setProjects, commitments, people, history, onNavigate, initialId, setDetailLabel, setGoBack, searchRef }) => {
  const [selectedId, setSelectedId] = useState(initialId || null);

  // ── URL-addressable filters (persistent + shareable) ──
  const initParams = useRef(new URLSearchParams(window.location.search)).current;
  const [search, setSearch] = useState(initParams.get("q") || "");
  const [fSquad, setFSquad] = useState(initParams.get("squad") || "");
  const [fPhase, setFPhase] = useState(initParams.get("phase") || "");
  const [fOwner, setFOwner] = useState(initParams.get("owner") || "");
  const [fStatus, setFStatus] = useState(initParams.get("status") || "active");
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const localSearchRef = useRef(null);

  // ── New project form ──
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSquad, setNewSquad] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newPhase, setNewPhase] = useState("PRD");

  // ── Confirmation modal ──
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);

  // Sync filters → URL
  useEffect(() => {
    if (selectedId) return;
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (fSquad) p.set("squad", fSquad);
    if (fPhase) p.set("phase", fPhase);
    if (fOwner) p.set("owner", fOwner);
    if (fStatus !== "active") p.set("status", fStatus);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [search, fSquad, fPhase, fOwner, fStatus, selectedId]);

  const tc = typeConfig();
  const pc = phaseColors();

  const calcAge = (d) => d ? Math.max(0, Math.ceil((new Date(weekConfig.today) - new Date(d)) / 86400000)) : 0;
  const calcPlanned = (s, e) => (s && e) ? Math.max(0, Math.ceil((new Date(e) - new Date(s)) / 86400000)) : 0;
  const calcRemaining = (e) => e ? Math.ceil((new Date(e) - new Date(weekConfig.today)) / 86400000) : null;

  const allItems = commitments.flatMap(cm =>
    cm.items.filter((_, idx) => cm.deselected !== idx).map(it => ({ ...it, person: cm.person, _cm: cm }))
  );

  const allSquads = [...new Set(projects.map(p => p.squad).filter(Boolean))].sort();
  const allOwners = [...new Set(projects.map(p => p.owner).filter(Boolean))].sort();

  const projActivity = {};
  allItems.forEach(it => { if (it.project && it.title?.trim()) projActivity[it.project] = (projActivity[it.project] || 0) + 1; });

  const activeFilters = [fSquad, fPhase, fOwner, search, fStatus !== "active" ? fStatus : ""].filter(Boolean).length;
  const withTasksCount = projects.filter(p => !p.done && projActivity[p.id] > 0).length;
  const noTasksCount = projects.filter(p => !p.done && !projActivity[p.id]).length;
  const doneCount = projects.filter(p => p.done).length;

  const filtered = projects.filter(p => {
    if (fStatus === "active" && p.done) return false;
    if (fStatus === "done" && !p.done) return false;
    if (fStatus === "has_tasks" && (!projActivity[p.id] || p.done)) return false;
    if (fStatus === "no_tasks" && (projActivity[p.id] > 0 || p.done)) return false;
    if (fSquad && p.squad !== fSquad) return false;
    if (fPhase && p.phase !== fPhase) return false;
    if (fOwner && p.owner !== fOwner) return false;
    if (search) { const q = search.toLowerCase(); if (!p.id.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false; }
    return true;
  });

  const flatFiltered = [];
  const phaseGroups = {};
  phaseNames.forEach(ph => { phaseGroups[ph] = []; });
  filtered.forEach(p => { if (phaseGroups[p.phase]) phaseGroups[p.phase].push(p); });
  phaseNames.forEach(ph => { flatFiltered.push(...(phaseGroups[ph] || [])); });

  useEffect(() => {
    if (searchRef) searchRef.current = localSearchRef.current;
  }, [searchRef, selectedId]);

  const proj = selectedId ? projects.find(p => p.id === selectedId) : null;

  const goBackToList = () => {
    setSelectedId(null);
    if (setDetailLabel) setDetailLabel(null);
    if (setGoBack) setGoBack(null);
  };
  const openProject = (id) => {
    const p = projects.find(pr => pr.id === id);
    setSelectedId(id); setSearch("");
    if (setDetailLabel) setDetailLabel(p ? `${p.id} ${p.name}` : id);
    if (setGoBack) setGoBack(goBackToList);
  };

  useEffect(() => {
    if (initialId && setDetailLabel) {
      const p = projects.find(pr => pr.id === initialId);
      setDetailLabel(p ? `${p.id} ${p.name}` : initialId);
      if (setGoBack) setGoBack(goBackToList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard: list
  useKeyboard(!proj ? [
    { key: "ArrowUp", fn: () => { setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } },
    { key: "ArrowDown", fn: () => { setKbActive(true); setFocusIdx(i => Math.min(flatFiltered.length - 1, i + 1)); } },
    { key: "Enter", fn: () => { if (flatFiltered[focusIdx]) openProject(flatFiltered[focusIdx].id); } },
    { key: "c", fn: () => { setSearch(""); setFSquad(""); setFPhase(""); setFOwner(""); setFStatus("active"); } },
  ] : [], [flatFiltered.length, focusIdx, selectedId]);

  useEffect(() => {
    if (focusIdx >= flatFiltered.length && flatFiltered.length > 0) setFocusIdx(flatFiltered.length - 1);
  }, [flatFiltered.length, focusIdx]);

  // ── New project helpers ──
  const nextPrId = () => {
    const nums = projects.map(p => parseInt(p.id.replace("X", ""), 10));
    return `X${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0")}`;
  };
  const handleCreateProject = () => {
    if (!newName.trim()) return;
    const newId = nextPrId();
    setProjects(prev => [...prev, {
      id: newId, name: newName.trim(), owner: newOwner, squad: newSquad,
      startDate: "", endDate: "", phase: newPhase, ship: false, done: false,
    }]);
    setNewName(""); setNewOwner(""); setNewSquad(""); setNewPhase("PRD");
    setShowNewForm(false);
    setToast({ id: newId, name: newName.trim() });
    setTimeout(() => setToast(null), 3500);
  };

  // ═══ PROJECT LIST ═════════════════════════════════════════════
  if (!proj) {
    let flatIdx = 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Sticky top section — top: 92 to clear header (52) + filter bar (40) */}
        <div style={{ position: "sticky", top: 92, zIndex: 10, background: c.bg, paddingTop: 4, paddingBottom: 8, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 4, background: c.surface, borderRadius: 14, padding: 5, border: `1px solid ${c.border}`, alignItems: "center" }}>
          {[
            { key: "active", label: "Active", count: withTasksCount + noTasksCount },
            { key: "has_tasks", label: "Has tasks", count: withTasksCount, color: c.green },
            { key: "no_tasks", label: "No tasks", count: noTasksCount, color: noTasksCount > 0 ? c.orange : c.textDim },
            { key: "done", label: "Completed", count: doneCount, color: c.green },
            { key: "all", label: "All", count: projects.length },
          ].map(f => {
            const active = fStatus === f.key;
            return (
            <button key={f.key} onClick={() => setFStatus(f.key)} style={{
              padding: "10px 16px", borderRadius: 10, cursor: "pointer",
              border: active ? `1px solid ${c.accentMid}` : "1px solid transparent",
              background: active ? c.accentMid : "transparent",
              fontFamily: body, fontSize: 13, fontWeight: active ? 700 : 500,
              color: active ? c.textCrit : c.textMid,
              boxShadow: active ? `0 1px 4px ${c.shadow}` : "none",
              transition: "all 0.15s", display: "flex", alignItems: "center", gap: 7,
            }}>
              {f.label}
              <span style={{
                fontFamily: mono, fontSize: 11, fontWeight: 700,
                color: active ? c.textCrit : (f.color || c.textDim),
                background: active ? "rgba(255,255,255,0.15)" : "transparent",
                padding: active ? "1px 6px" : "0", borderRadius: 6,
              }}>{f.count}</span>
            </button>
            );
          })}
          <button onClick={() => setShowNewForm(v => !v)} className="flow-btn" style={{
            marginLeft: "auto", padding: "10px 16px", borderRadius: 10,
            border: `1px solid ${c.accent}40`, background: showNewForm ? c.accent : c.accentDim,
            fontFamily: body, fontSize: 13, fontWeight: 700, color: showNewForm ? "#fff" : c.accent,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            transition: "all 0.15s",
          }}>+ New Project</button>
        </div>

        {/* Inline new project form */}
        {showNewForm && (
          <div style={{
            background: c.surface, borderRadius: 12, border: `1px solid ${c.accent}30`,
            padding: 16, display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: c.text }}>New Project</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Inp value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name" style={{ flex: 2, minWidth: 180 }} />
              <Sel value={newSquad} onChange={e => setNewSquad(e.target.value)} style={{ flex: 1, minWidth: 110 }}>
                <option value="">Squad</option>
                {allSquads.map(s => <option key={s} value={s}>{s}</option>)}
              </Sel>
              <Sel value={newOwner} onChange={e => setNewOwner(e.target.value)} style={{ flex: 1, minWidth: 130 }}>
                <option value="">Owner</option>
                {allOwners.map(o => <option key={o} value={o}>{o}</option>)}
              </Sel>
              <Sel value={newPhase} onChange={e => setNewPhase(e.target.value)} style={{ flex: 1, minWidth: 110 }}>
                {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
              </Sel>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowNewForm(false); setNewName(""); setNewSquad(""); setNewOwner(""); setNewPhase("PRD"); }} className="flow-btn" style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${c.border}`,
                background: "transparent", cursor: "pointer", fontFamily: body, fontSize: 13, fontWeight: 500, color: c.textDim,
              }}>Cancel</button>
              <button onClick={handleCreateProject} disabled={!newName.trim()} className="flow-btn" style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: newName.trim() ? "pointer" : "not-allowed",
                background: newName.trim() ? `linear-gradient(135deg, ${c.accent}, ${c.accent}CC)` : c.surfaceAlt,
                fontFamily: display, fontSize: 13, fontWeight: 700, color: newName.trim() ? "#fff" : c.textDim,
                transition: "all 0.15s",
              }}>Create</button>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, background: c.surface, borderRadius: 12, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input ref={localSearchRef} value={search} onChange={e => { setSearch(e.target.value); setFocusIdx(0); }} className="flow-input"
                placeholder="Search projects by ID or name..."
                style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text, fontFamily: body, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: c.textMid, pointerEvents: "none" }}>🔍</span>
              <span className="flow-search-hint">/</span>
            </div>
            <span style={{ fontFamily: mono, fontSize: 11, color: c.textDim, flexShrink: 0 }}>{filtered.length}<span style={{ color: c.textDim + "80" }}>/{projects.length}</span></span>
          </div>
          <div style={{ padding: "8px 16px 10px", display: "flex", gap: 8, alignItems: "center", borderTop: `1px solid ${c.border}` }}>
            <Sel value={fSquad} onChange={e => setFSquad(e.target.value)} style={{ minWidth: 110, fontSize: 12, padding: "8px 10px", borderRadius: 8 }}>
              <option value="">All squads</option>
              {allSquads.map(s => <option key={s} value={s}>{s}</option>)}
            </Sel>
            <Sel value={fPhase} onChange={e => setFPhase(e.target.value)} style={{ minWidth: 110, fontSize: 12, padding: "8px 10px", borderRadius: 8 }}>
              <option value="">All phases</option>
              {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
            </Sel>
            <Sel value={fOwner} onChange={e => setFOwner(e.target.value)} style={{ minWidth: 130, fontSize: 12, padding: "8px 10px", borderRadius: 8 }}>
              <option value="">All owners</option>
              {allOwners.map(o => <option key={o} value={o}>{o}</option>)}
            </Sel>
            {activeFilters > 0 && (
              <button onClick={() => { setSearch(""); setFSquad(""); setFPhase(""); setFOwner(""); setFStatus("active"); }} className="flow-btn" style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${c.accent}40`, background: c.accentDim, cursor: "pointer", fontFamily: body, fontSize: 12, fontWeight: 600, color: c.accent, marginLeft: "auto" }}>
                <kbd style={{ fontFamily: mono, fontSize: 9, color: c.accent, background: "transparent", padding: "0 2px", border: "none", marginRight: 3 }}>C</kbd>Clear ({activeFilters})
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Projects grouped by phase */}
        {phaseNames.map(ph => {
          const group = phaseGroups[ph];
          if (!group || group.length === 0) return null;
          const startIdx = flatIdx;
          flatIdx += group.length;
          return (
            <div key={ph}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, marginTop: 2 }}>
                <div style={{ width: 3, height: 16, borderRadius: 2, background: pc[ph] }} />
                <span style={{ fontFamily: display, fontSize: 14, fontWeight: 800, color: pc[ph] }}>{ph}</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim, fontWeight: 500 }}>{group.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 6 }}>
                {group.map((p, gi) => {
                  const act = projActivity[p.id] || 0;
                  const isDone = !!p.done;
                  const isFocused = kbActive && (startIdx + gi) === focusIdx;
                  return (
                    <div key={p.id} className={`flow-row${isFocused ? " flow-kb-focus" : ""}`} onClick={() => openProject(p.id)} style={{
                      padding: "10px 12px", background: isFocused ? c.surfaceAlt : isDone ? `${c.green}08` : c.surface, borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${isDone ? c.green + "25" : c.border}`, borderLeft: `3px solid ${isDone ? c.green : pc[ph]}`,
                      opacity: isDone ? 0.6 : 1, transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent, flexShrink: 0 }}>{p.id}</span>
                          <span style={{ fontFamily: body, fontSize: 13, fontWeight: 700, color: c.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: isDone ? `line-through ${c.green}` : "none" }}>{p.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8 }}>
                          {isDone && <Tag color={c.green} bg={c.greenDim}>✓</Tag>}
                          {!isDone && act === 0 && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${c.orange}` }} />}
                          {!isDone && act > 0 && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: c.green }} />}
                          {p.ship && <span style={{ fontSize: 11 }}>🚀</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <EmptyState icon="📦" title="No projects match" message="Adjust filters or search to find projects." action="Clear filters" onAction={() => { setSearch(""); setFSquad(""); setFPhase(""); setFOwner(""); setFStatus("active"); }} />}
        {toast && (
          <div style={{
            position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
            background: c.surfaceSolid, border: `1px solid ${c.green}50`,
            borderRadius: 12, padding: "14px 22px", display: "flex", alignItems: "center", gap: 10,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${c.green}20`, animation: "fadeInUp 0.25s ease-out",
          }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <span style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text }}>
              Project <span style={{ fontFamily: mono, fontWeight: 700, color: c.green }}>{toast.id}</span> "{toast.name}" created
            </span>
          </div>
        )}
      </div>
    );
  }

  // ═══ PROJECT DEEP DIVE ════════════════════════════════════════
  const age = calcAge(proj.startDate);
  const planned = calcPlanned(proj.startDate, proj.endDate);
  const remaining = calcRemaining(proj.endDate);
  const overdue = remaining !== null && remaining < 0;
  const pctElapsed = planned > 0 ? Math.min((age / planned) * 100, 100) : 0;
  const projItems = allItems.filter(it => it.project === proj.id);
  const projPeople = [...new Set(projItems.map(it => it.person))];
  const projHistory = history[proj.id] || [];

  const projTypeCounts = {};
  projItems.forEach(it => { projTypeCounts[it.type] = (projTypeCounts[it.type] || 0) + 1; });

  const plannedCount = commitments.reduce((s, cm) => s + cm.items.filter(it => it.project === proj.id && it.title.trim()).length, 0);
  const committedCount = projItems.length;
  const completedCount = commitments.reduce((s, cm) => s + cm.items.filter((it, idx) => cm.deselected !== idx && it.project === proj.id && it.outcome === "done").length, 0);
  const partialCount = commitments.reduce((s, cm) => s + cm.items.filter((it, idx) => cm.deselected !== idx && it.project === proj.id && it.outcome === "partial").length, 0);

  const updateProjectField = (field, val) => {
    if (!setProjects) return;
    setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, [field]: val } : p));
  };

  const requestPhaseChange = (newPhase) => {
    setConfirmAction({
      label: `Move "${proj.name}" from ${proj.phase} to ${newPhase}?`,
      detail: "This will update the project's phase across all views.",
      color: pc[newPhase] || c.accent,
      onConfirm: () => updateProjectField("phase", newPhase),
    });
  };

  const requestMarkDone = () => {
    setConfirmAction({
      label: proj.done ? `Reopen "${proj.name}"?` : `Mark "${proj.name}" as completed?`,
      detail: proj.done ? "This project will become active again." : "This project will be moved to completed status.",
      color: proj.done ? c.orange : c.green,
      onConfirm: () => updateProjectField("done", !proj.done),
    });
  };

  // ── Activity trend (history weeks + current) ──
  const weeklyActivity = [];
  weekConfig.historyWeeks.forEach(w => {
    const wkHist = projHistory.find(h => h.week === w);
    weeklyActivity.push({ week: w, count: wkHist ? wkHist.entries.length : 0, current: false });
  });
  weeklyActivity.push({ week: weekConfig.weekOf, count: projItems.length, current: true });
  const maxActivity = Math.max(...weeklyActivity.map(w => w.count), 1);

  const prevWeekCount = weeklyActivity.length >= 2 ? weeklyActivity[weeklyActivity.length - 2].count : 0;
  const trendDelta = projItems.length - prevWeekCount;

  // Escalation level for overdue
  const escalationLevel = overdue ? (Math.abs(remaining) > 14 ? "CRITICAL" : Math.abs(remaining) > 7 ? "HIGH" : "WATCH") : null;

  // ── Build per-week type breakdown for the chart ──
  const weeklyTyped = weeklyActivity.map(w => {
    const typeCounts = { BUILD: 0, JAM: 0, COMMIT: 0, BLOCKED: 0 };
    if (w.current) {
      projItems.forEach(it => { if (typeCounts[it.type] !== undefined) typeCounts[it.type]++; });
    } else {
      const wkHist = projHistory.find(h => h.week === w.week);
      if (wkHist) wkHist.entries.forEach(e => { if (typeCounts[e.type] !== undefined) typeCounts[e.type]++; });
    }
    return { ...w, ...typeCounts, total: w.count };
  });
  const chartMax = Math.max(...weeklyTyped.map(w => w.total), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ═══ OVERDUE THIN BANNER (top) ═════════════════════════════ */}
      {overdue && (
        <div className="flow-overdue-banner" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "8px 16px", borderRadius: 10,
          background: `linear-gradient(90deg, ${c.red}18, ${c.red}10)`,
          border: `1px solid ${c.red}35`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.red, boxShadow: `0 0 8px ${c.red}`, animation: "pulse 2s infinite" }} />
          <span style={{ fontFamily: display, fontSize: 13, fontWeight: 800, color: c.red, letterSpacing: "0.04em" }}>
            OVERDUE BY {Math.abs(remaining)} {Math.abs(remaining) === 1 ? "DAY" : "DAYS"}
          </span>
          <span style={{ fontFamily: mono, fontSize: 12, color: c.red, opacity: 0.7 }}>deadline {proj.endDate}</span>
          <div style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 6, background: `${c.red}20`, fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.red }}>
            {escalationLevel}
          </div>
        </div>
      )}

      {/* ═══ PROJECT COMMAND CARD ═════════════════════════════════ */}
      <div className="flow-command-card" style={{ padding: "24px 28px" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: c.accent, background: c.accentDim, padding: "3px 10px", borderRadius: 6, letterSpacing: "0.03em" }}>{proj.id}</span>
              {proj.ship && <span style={{ fontSize: 14, opacity: 0.8 }}>🚀</span>}
            </div>
            <div style={{ fontFamily: display, fontSize: 28, fontWeight: 800, color: c.text, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{proj.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: c.textDim, letterSpacing: "0.04em" }}>OWNER</span>
                <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: c.text }}>{proj.owner}</span>
              </div>
              <div style={{ width: 1, height: 14, background: c.border }} />
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: c.textDim, letterSpacing: "0.04em" }}>SQUAD</span>
                <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: c.textMid }}>{proj.squad}</span>
              </div>
              {projPeople.length > 0 && (<>
                <div style={{ width: 1, height: 14, background: c.border }} />
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: c.textDim, letterSpacing: "0.04em" }}>CONTRIBUTORS</span>
                  <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: c.accent }}>{projPeople.length}</span>
                </div>
              </>)}
            </div>
          </div>

          {/* Actions + Duration metrics cluster */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "flex-start" }}>
            <button onClick={requestMarkDone} className="flow-btn" style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${proj.done ? c.orange + "40" : c.green + "40"}`,
              background: proj.done ? `${c.orange}10` : `${c.green}10`,
              fontFamily: display, fontSize: 12, fontWeight: 700,
              color: proj.done ? c.orange : c.green,
              transition: "all 0.15s", whiteSpace: "nowrap",
              alignSelf: "center",
            }}>{proj.done ? "↺ Reopen" : "✓ Mark Complete"}</button>
            {[
              { label: "PLANNED", value: `${planned}d`, color: c.textMid, desc: "total duration" },
              { label: "ELAPSED", value: `${age}d`, color: age > planned ? c.red : c.text, desc: "days since start" },
              { label: "REMAINING", value: overdue ? `−${Math.abs(remaining)}d` : `${remaining}d`, color: overdue ? c.red : remaining < 14 ? c.orange : c.green, desc: overdue ? "past deadline" : "until deadline" },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: "center", padding: "8px 14px", background: m.color === c.red ? `${c.red}08` : "transparent", borderRadius: 10, border: `1px solid ${m.color === c.red ? c.red + "20" : c.border}`, minWidth: 72 }}>
                <div style={{ fontFamily: display, fontSize: 22, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase pipeline — animated nodes */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.textDim, letterSpacing: "0.1em", marginBottom: 10 }}>PHASE PIPELINE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PhasePipeline currentPhase={proj.phase} />
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <Sel value={proj.phase} onChange={e => { if (e.target.value !== proj.phase) requestPhaseChange(e.target.value); }}
                style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, minWidth: 110, fontWeight: 700, color: pc[proj.phase] || c.textMid }}>
                {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
              </Sel>
              <span style={{ fontFamily: mono, fontSize: 12, color: c.textDim }}>({phaseNames.indexOf(proj.phase) + 1}/{phaseNames.length})</span>
            </div>
          </div>
        </div>

        {/* Timeline progress bar with animated marker */}
        <TimelineBar
          pctElapsed={pctElapsed}
          overdue={overdue}
          remaining={remaining}
          startDate={proj.startDate}
          endDate={proj.endDate}
        />
      </div>

      {/* ═══ WEEK-ON-WEEK COMMIT CHART ════════════════════════════ */}
      {(() => {
        const totalAllWeeks = weeklyTyped.reduce((s, w) => s + w.total, 0);
        const typeTotals = ["BUILD", "JAM", "COMMIT", "BLOCKED"].map(t => ({
          type: t, label: tc[t]?.label, color: tc[t]?.color, bg: tc[t]?.bg,
          count: weeklyTyped.reduce((s, w) => s + (w[t] || 0), 0),
        })).filter(t => t.count > 0);
        return (
      <div style={{ background: c.surface, borderRadius: 14, border: `1px solid ${c.border}`, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: display, fontSize: 17, fontWeight: 800, color: c.text }}>Commit Activity</span>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: c.text, opacity: 0.55 }}>
              {totalAllWeeks} commits · {weeklyTyped.length} weeks
            </span>
          </div>
        </div>

        {/* Type summary pills */}
        <div style={{ padding: "14px 24px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {typeTotals.map(t => (
            <div key={t.type} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: `${t.color}12`, border: `1px solid ${t.color}30`,
              borderRadius: 8, padding: "5px 12px",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: t.color }}>{t.count}</span>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: c.textDim }}>{t.type}</span>
            </div>
          ))}
        </div>

        {/* Chart area with gridlines */}
        <div style={{ padding: "0 24px 6px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ position: "relative", minWidth: weeklyTyped.length * 100 }}>
            {/* Horizontal gridlines — offset to cover only the bar zone */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 28, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ borderBottom: `1px solid ${c.border}`, opacity: i === 3 ? 0.8 : 0.3, width: "100%" }} />
              ))}
            </div>
            {/* Bars — extra top padding so count labels never clip */}
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 228, paddingTop: 28, position: "relative", zIndex: 1 }}>
              {weeklyTyped.map((w, i) => {
                const barH = w.total > 0 ? Math.max(24, (w.total / chartMax) * 180) : 6;
                const types = ["BUILD", "JAM", "COMMIT", "BLOCKED"];
                const segments = types.map(t => ({ type: t, count: w[t], pct: w.total > 0 ? (w[t] / w.total) * 100 : 0 })).filter(s => s.count > 0);
                const isCurrent = w.current;
                return (
                  <div key={i} style={{ flex: 1, minWidth: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    {/* Count label */}
                    <span style={{
                      fontFamily: display, fontSize: 16, fontWeight: 800, marginBottom: 6,
                      color: isCurrent ? c.accent : w.total > 0 ? c.text : c.textDim,
                    }}>
                      {w.total}
                    </span>
                    {/* Stacked bar */}
                    <div style={{
                      width: "70%", maxWidth: 56, height: barH, borderRadius: 8, overflow: "hidden",
                      display: "flex", flexDirection: "column",
                      border: isCurrent ? `2px solid ${c.accent}` : "none",
                      background: w.total === 0 ? `${c.border}40` : "transparent",
                      boxShadow: isCurrent ? `0 0 20px ${c.accent}25, 0 4px 12px ${c.accent}15` : `0 2px 8px rgba(0,0,0,0.15)`,
                      transition: "all 0.3s ease",
                    }}>
                      {segments.map((seg, si) => (
                        <div key={si} style={{
                          flex: seg.pct, background: tc[seg.type]?.color,
                          opacity: isCurrent ? 1 : 0.75,
                          transition: "opacity 0.2s ease",
                        }} title={`${seg.count} ${seg.type}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Week labels row */}
        <div style={{ padding: "8px 24px 4px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", gap: 6, minWidth: weeklyTyped.length * 100 }}>
            {weeklyTyped.map((w, i) => (
              <div key={i} style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
                <span style={{
                  fontFamily: mono, fontSize: 12, fontWeight: w.current ? 700 : 600,
                  color: w.current ? c.accent : c.text,
                }}>
                  {w.week.length > 6 ? w.week.split(",")[0] : w.week}
                </span>
                {w.current && (
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: c.accent, margin: "4px auto 0", boxShadow: `0 0 6px ${c.accent}` }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Type breakdown per week - compact row */}
        <div style={{ padding: "6px 24px 16px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ display: "flex", gap: 6, minWidth: weeklyTyped.length * 100 }}>
            {weeklyTyped.map((w, i) => {
              const types = ["BUILD", "JAM", "COMMIT", "BLOCKED"];
              const segments = types.map(t => ({ type: t, count: w[t] })).filter(s => s.count > 0);
              return (
                <div key={i} style={{ flex: 1, minWidth: 80, display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
                  {segments.map((seg, si) => (
                    <span key={si} style={{
                      fontFamily: mono, fontSize: 11, fontWeight: 700, lineHeight: 1,
                      color: tc[seg.type]?.color, background: `${tc[seg.type]?.color}15`,
                      padding: "3px 6px", borderRadius: 4,
                    }}>
                      {seg.count}{seg.type.charAt(0)}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
        );
      })()}

      {/* ═══ EVIDENCE FEED — current week ════════════════════════ */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.accent, boxShadow: `0 0 8px ${c.accent}50` }} />
            <span style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: c.accent }}>Evidence Feed</span>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: c.text, opacity: 0.6 }}>{weekConfig.weekOf}</span>
          </div>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: c.text, opacity: 0.5 }}>{projItems.length} item{projItems.length !== 1 ? "s" : ""}</span>
        </div>
        {projItems.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projItems.map((it, i) => (
              <EvidenceCard key={i} item={it} index={i} proj={proj} tc={tc} pc={pc} onNavigate={onNavigate} isCurrentWeek={true} />
            ))}
          </div>
        ) : (
          <div style={{ padding: "24px", textAlign: "center", fontFamily: body, fontSize: 13, color: c.textDim, background: c.surface, borderRadius: 10, border: `1px dashed ${c.border}` }}>No commitments this week</div>
        )}
      </div>

      {/* ═══ HISTORY — week-on-week timeline ═══════════════════════ */}
      {projHistory.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingTop: 14, borderTop: `1px solid ${c.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: c.text }}>History</span>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: c.text, opacity: 0.5 }}>{projHistory.length} week{projHistory.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[...projHistory].reverse().map((wk, wi) => {
              const wkTypeCounts = {};
              wk.entries.forEach(e => { wkTypeCounts[e.type] = (wkTypeCounts[e.type] || 0) + 1; });
              return (
                <div key={wi} style={{ position: "relative", paddingLeft: 24, paddingBottom: 20 }}>
                  {/* Vertical connector line */}
                  {wi < projHistory.length - 1 && (
                    <div style={{ position: "absolute", left: 7, top: 14, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${c.accent}30, ${c.border})` }} />
                  )}
                  {/* Timeline node */}
                  <div style={{ position: "absolute", left: 0, top: 2, width: 16, height: 16, borderRadius: "50%", background: c.surface, border: `2px solid ${c.accent}50`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.accent, opacity: 0.6 }} />
                  </div>
                  {/* Week header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: c.text }}>Week of {wk.week}</span>
                    <span style={{ fontFamily: mono, fontSize: 12, color: c.text, fontWeight: 600, opacity: 0.5 }}>{wk.entries.length} item{wk.entries.length !== 1 ? "s" : ""}</span>
                    <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                      {Object.entries(wkTypeCounts).map(([t, n]) => (
                        <Tag key={t} color={tc[t]?.color} bg={tc[t]?.bg}>{n} {t}</Tag>
                      ))}
                    </div>
                  </div>
                  {/* Entry cards — Name → Task → Tags */}
                  <div style={{ background: c.surface, borderRadius: 10, border: `1px solid ${c.border}`, overflow: "hidden" }}>
                    {wk.entries.map((entry, ei) => (
                      <div key={ei} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px",
                        borderTop: ei > 0 ? `1px solid ${c.border}` : "none",
                        transition: "background 0.15s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = c.surfaceAlt}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%", background: c.accentDim,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: display, fontSize: 10, fontWeight: 700, color: c.accent, flexShrink: 0,
                        }}>{entry.person.charAt(0)}</div>
                        {/* Person name */}
                        <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", entry.person); }}
                          style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {entry.person}
                        </span>
                        {/* Task description */}
                        <span style={{ fontFamily: body, fontSize: 13, color: c.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.task}</span>
                        {/* Tags: type + stage */}
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <Badge color={tc[entry.type]?.color} bg={tc[entry.type]?.bg}>{entry.type}</Badge>
                          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: pc[entry.stage] || c.textDim, padding: "2px 7px", borderRadius: 4, background: (pc[entry.stage] || c.textDim) + "12" }}>{entry.stage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ CONFIRMATION MODAL ═══════════════════════════════════ */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setConfirmAction(null)} style={{ position: "absolute", inset: 0, background: "#000", opacity: 0.6 }} />
          <div style={{
            position: "relative", zIndex: 1, background: c.surface,
            border: `1px solid ${(confirmAction.color || c.accent) + "40"}`,
            borderRadius: 14, padding: "24px 28px", width: 420, maxWidth: "90vw",
            boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px ${c.border}`,
          }}>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 8 }}>Confirm Change</div>
            <div style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: c.text, lineHeight: 1.6, marginBottom: 6 }}>{confirmAction.label}</div>
            <div style={{ fontFamily: body, fontSize: 13, color: c.textMid, lineHeight: 1.6, marginBottom: 16 }}>{confirmAction.detail}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmAction(null)} className="flow-btn" style={{
                padding: "8px 18px", borderRadius: 8, border: `1px solid ${c.border}`,
                background: "transparent", cursor: "pointer", fontFamily: body, fontSize: 13, fontWeight: 500, color: c.textDim,
              }}>Cancel</button>
              <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }} className="flow-btn" style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${confirmAction.color || c.accent}, ${(confirmAction.color || c.accent)}CC)`,
                fontFamily: display, fontSize: 13, fontWeight: 700, color: "#fff",
              }}>Yes, Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsView;
