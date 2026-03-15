// Flow — Pulse View (Rewritten: Unified Summary + Projects/People toggle)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, display, body, mono, phaseNames, typeConfig, phaseColors, density, layout, motion } from "../styles/theme";
import { Badge, Tag, Card, Glass, Label, EmptyState } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import { weekConfig } from "../data/seed";

// ─── ANIMATED KPI COUNTER ─────────────────────────────────────
const KpiCounter = ({ value, label, color, delay = 0 }) => {
  const [display_val, setDisplayVal] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const dur = 600;
    const animate = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayVal(Math.round(ease * value));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    const timeout = setTimeout(() => { frame = requestAnimationFrame(animate); }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame); };
  }, [value, delay]);

  return (
    <div className="flow-kpi-num" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, animationDelay: `${delay}ms` }}>
      <span style={{ fontFamily: display, fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{display_val}</span>
      <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
};

// ─── RISK LEVEL BAR ───────────────────────────────────────────
const RiskLevelBar = ({ level, pct }) => {
  const cfg = {
    low:    { color: c.green, label: "LOW",      anim: "riskPulseGreen", bg: c.greenDim },
    medium: { color: c.orange, label: "MEDIUM",  anim: "riskPulseAmber", bg: c.orangeDim },
    high:   { color: c.red, label: "HIGH",       anim: "riskPulseRed",   bg: c.redDim },
  }[level] || { color: c.textDim, label: "—", anim: "none", bg: c.surfaceAlt };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
      <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: cfg.color, letterSpacing: "0.1em", flexShrink: 0 }}>RISK</span>
      <div style={{
        flex: 1, height: 6, borderRadius: 3, background: c.surfaceAlt, overflow: "hidden", position: "relative",
        animation: `${cfg.anim} 2s ease-in-out infinite`,
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
          transition: `width 0.6s ${motion.interaction.easing}`,
        }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: cfg.color, letterSpacing: "0.06em", flexShrink: 0 }}>{cfg.label}</span>
    </div>
  );
};

// ─── DELTA TOKEN ──────────────────────────────────────────────
const DeltaToken = ({ gained, lost }) => {
  const net = gained - lost;
  if (gained === 0 && lost === 0) return <span style={{ fontFamily: mono, fontSize: 11, color: c.textDim }}>—</span>;
  const isUp = net > 0;
  const sign = net > 0 ? "+" : net < 0 ? "" : "±";
  const clr = net > 0 ? c.green : net < 0 ? c.red : c.textDim;
  return (
    <span
      className={isUp ? "flow-delta-up" : net < 0 ? "flow-delta-down" : ""}
      title={`${gained} added, ${lost} removed (net ${sign}${net})`}
      style={{
        fontFamily: mono, fontSize: 11, fontWeight: 700, color: clr,
        display: "inline-flex", alignItems: "center", gap: 2,
        textShadow: net !== 0 ? `0 0 8px ${clr}40` : "none",
      }}
    >
      <span style={{ fontSize: 8, opacity: 0.7 }}>{net > 0 ? "▲" : net < 0 ? "▼" : "●"}</span>
      {sign}{net}
    </span>
  );
};

// ─── SIDE PANEL (project telemetry) ────────────────────────────
const SidePanel = ({ proj, deltaMap, tc, pc, onNavigate, onClose }) => {
  if (!proj) return null;
  const d = deltaMap[proj.id];
  const riskLevel = proj.risks.length >= 3 ? "high" : proj.risks.length >= 1 ? "medium" : "low";
  const panelRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handle = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div ref={panelRef} className="flow-side-panel" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, background: `${pc[proj.phase]}06` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent, marginBottom: 4 }}>{proj.id}</div>
            <div style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: c.text }}>{proj.name}</div>
          </div>
          <button onClick={onClose} className="flow-btn" style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${c.border}`, background: c.surfaceAlt, cursor: "pointer", fontFamily: mono, fontSize: 11, color: c.textDim }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <Tag color={pc[proj.phase]} bg={`${pc[proj.phase]}15`}>{proj.phase}</Tag>
          {proj.ship && <Tag color={c.green} bg={c.greenDim}>SHIP</Tag>}
          <span style={{ fontFamily: body, fontSize: 11, color: c.textMid }}>{proj.squad} · {proj.owner || "No owner"}</span>
        </div>
      </div>

      {/* Telemetry section */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Health gauge */}
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Health</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: c.surfaceAlt, overflow: "hidden" }}>
              <div style={{ width: `${proj.health}%`, height: "100%", borderRadius: 4, background: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 800, color: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red }}>{proj.health}</span>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.1em", marginBottom: 3 }}>AGE</div>
            <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: proj.age > 60 ? c.red : proj.age > 30 ? c.orange : c.text }}>{proj.age}d</span>
          </div>
          {proj.remaining !== null && (
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.1em", marginBottom: 3 }}>REMAINING</div>
              <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: proj.remaining < 0 ? c.red : proj.remaining < 7 ? c.orange : c.text }}>{proj.remaining}d</span>
            </div>
          )}
          {d && (
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.1em", marginBottom: 3 }}>DELTA</div>
              <DeltaToken gained={d.gained} lost={d.lost} />
            </div>
          )}
        </div>

        {/* Risks */}
        {proj.risks.length > 0 && (
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.red, letterSpacing: "0.1em", marginBottom: 6 }}>RISKS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {proj.risks.map(r => (
                <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: `${r.color}08`, borderRadius: 6, border: `1px solid ${r.color}20` }}>
                  <span style={{ fontSize: 11 }}>{r.icon}</span>
                  <span style={{ fontFamily: body, fontSize: 11, fontWeight: 600, color: r.color }}>{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commitments */}
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.1em", marginBottom: 6 }}>COMMITMENTS · {proj.items.length}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {proj.items.map((it, ii) => (
              <div key={ii} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: c.surfaceAlt, borderRadius: 6 }}>
                <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", it.person); }} style={{ fontFamily: body, fontSize: 11, fontWeight: 600, color: c.accent, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.accent + "40", textUnderlineOffset: 2, minWidth: 70 }}>{it.person}</span>
                <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                <span style={{ fontFamily: body, fontSize: 10, color: c.textMid, flex: 1 }}>{it.title || "—"}</span>
              </div>
            ))}
            {proj.items.length === 0 && <span style={{ fontFamily: body, fontSize: 11, color: c.textDim }}>No commitments this week</span>}
          </div>
        </div>

        {/* People */}
        {proj.people.length > 0 && (
          <div>
            <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.1em", marginBottom: 6 }}>PEOPLE · {proj.people.length}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {proj.people.map(p => (
                <span key={p} onClick={() => onNavigate && onNavigate("people", p)} style={{ fontFamily: body, fontSize: 11, fontWeight: 500, color: c.accent, cursor: "pointer", padding: "3px 8px", background: c.accentDim, borderRadius: 10 }}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* View full project link */}
        <button onClick={() => onNavigate && onNavigate("projects", proj.id)} className="flow-btn" style={{
          padding: "8px 14px", borderRadius: 8, border: `1px solid ${c.accent}40`, background: c.accentDim,
          cursor: "pointer", fontFamily: body, fontSize: 12, fontWeight: 600, color: c.accent, textAlign: "center", marginTop: 4,
        }}>View full project →</button>
      </div>
    </div>
  );
};


// ─── SUMMARY TILE — compact inline tile for unified summary ───
const SummaryTile = ({ value, label, color, active, onClick, icon }) => (
  <div
    onClick={onClick}
    className="flow-glass-tile"
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      padding: "10px 12px", minWidth: 56, borderRadius: 8, cursor: onClick ? "pointer" : "default",
      background: active ? `${color}12` : "transparent",
      border: `1px solid ${active ? color + "40" : "transparent"}`,
      transition: "all 0.15s ease",
    }}
  >
    <span style={{
      fontFamily: display, fontSize: 20, fontWeight: 800, color: active ? color : (value > 0 ? c.text : c.textDim),
      lineHeight: 1, letterSpacing: "-0.02em",
    }}>{value}</span>
    <span style={{
      fontFamily: body, fontSize: 10, fontWeight: 700, color: active ? color : c.textMid,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>{icon ? `${icon} ` : ""}{label}</span>
  </div>
);

// ─── SUMMARY METRIC — for commits / blocked / avg health ───
const SummaryMetric = ({ value, label, color }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 8px", minWidth: 48 }}>
    <span style={{ fontFamily: display, fontSize: 18, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
    <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 600, color: c.textDim, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
  </div>
);


// ═══════════════════════════════════════════════════════════════
// PULSE VIEW — main component
// ═══════════════════════════════════════════════════════════════
const PulseView = ({ commitments, projects, people, onNavigate, searchRef, globalFilters = {} }) => {
  const [expandedProject, setExpandedProject] = useState(null);
  const initParams = useRef(new URLSearchParams(window.location.search)).current;
  const [filterPhase, setFilterPhase] = useState(initParams.get("phase") || null);
  const [sortCol, setSortCol] = useState(initParams.get("sort") || "squad");
  const [sortDir, setSortDir] = useState(initParams.get("dir") || "asc");
  const [showShip, setShowShip] = useState(initParams.get("ship") === "1");
  const [filterStatus, setFilterStatus] = useState(initParams.get("status") || "");
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const [showRisksOnly, setShowRisksOnly] = useState(initParams.get("risks") === "1");
  const [drillCell, setDrillCell] = useState(null);
  const [pulseMode, setPulseMode] = useState(initParams.get("mode") === "people" ? "people" : "matrix");
  const [matrixDensity, setMatrixDensity] = useState(initParams.get("density") || "default");
  const [hoveredProject, setHoveredProject] = useState(null);
  const [sidePanelProj, setSidePanelProj] = useState(null);
  const [morphKey, setMorphKey] = useState(0);
  const [rowAnimKey, setRowAnimKey] = useState(0);
  const hoverTimerRef = useRef(null);

  const allItems = commitments.flatMap(cm =>
    cm.items.filter((_, idx) => cm.deselected !== idx).map(it => ({ ...it, person: cm.person }))
  );

  const calcAge = (d) => d ? Math.max(0, Math.ceil((new Date(weekConfig.today) - new Date(d)) / 86400000)) : 0;
  const tc = typeConfig();
  const pc = phaseColors();

  const calcPlanned = (s, e) => (s && e) ? Math.max(1, Math.ceil((new Date(e) - new Date(s)) / 86400000)) : 0;

  const projectData = projects.map(proj => {
    const items = allItems.filter(it => it.project === proj.id);
    const typeCounts = {};
    items.forEach(it => { typeCounts[it.type] = (typeCounts[it.type] || 0) + 1; });
    const ppl = [...new Set(items.map(it => it.person))];
    const age = calcAge(proj.startDate);
    const planned = calcPlanned(proj.startDate, proj.endDate);
    const remaining = proj.endDate ? Math.ceil((new Date(proj.endDate) - new Date(weekConfig.today)) / 86400000) : null;

    const risks = [];
    if (!proj.owner) risks.push({ key: "no_dri", label: "No owner", color: c.red, icon: "⚠" });
    if ((typeCounts.JAM || 0) > (typeCounts.BUILD || 0) && items.length > 1) risks.push({ key: "jam_heavy", label: "JAM > BUILD", color: c.orange, icon: "⚡" });
    if (proj.phase === "Engineering" && age > 30) risks.push({ key: "stale_eng", label: "Stuck in Eng " + age + "d", color: c.orange, icon: "🐌" });
    if (age > 60) risks.push({ key: "aging", label: "Aging " + age + "d", color: c.red, icon: "⏰" });
    if (remaining !== null && remaining < 0) risks.push({ key: "overdue", label: "Overdue", color: c.red, icon: "🚨" });
    if (typeCounts.BLOCKED > 0) risks.push({ key: "blocked", label: `${typeCounts.BLOCKED} blocked`, color: c.red, icon: "🚧" });

    let health = 100;
    if (planned > 0) {
      const pctElapsed = age / planned;
      if (pctElapsed > 1) health -= 40;
      else if (pctElapsed > 0.75) health -= 20;
    }
    if (age > 60) health -= 15;
    else if (age > 30) health -= 5;
    if (typeCounts.BLOCKED) health -= typeCounts.BLOCKED * 15;
    if (items.length > 0 && !typeCounts.BUILD && typeCounts.JAM) health -= 10;
    if (!proj.owner) health -= 15;
    health = Math.max(0, Math.min(100, health));

    return { ...proj, items, typeCounts, people: ppl, totalCommitments: items.length, age, planned, remaining, risks, health };
  });

  // ── Apply global filters to summary data ──
  const summaryData = projectData.filter(proj => {
    if (globalFilters.owner && proj.owner !== globalFilters.owner) return false;
    if (globalFilters.squad && proj.squad !== globalFilters.squad) return false;
    if (globalFilters.person) {
      const hasPersonCommitment = proj.items.some(it => it.person === globalFilters.person);
      if (!hasPersonCommitment) return false;
    }
    return true;
  });

  // ── Derived KPI metrics (from globally filtered data) ──
  const shippingProjects = summaryData.filter(p => p.ship);
  const totalRiskProjects = summaryData.filter(p => p.risks.length > 0).length;
  const avgHealth = summaryData.length > 0 ? Math.round(summaryData.reduce((s, p) => s + p.health, 0) / summaryData.length) : 0;
  const summaryItems = summaryData.flatMap(p => p.items);
  const totalCommitments = summaryItems.length;
  const blockedCount = summaryData.reduce((s, p) => s + (p.typeCounts.BLOCKED || 0), 0);
  const noActionCount = summaryData.filter(p => p.items.length === 0).length;

  // Risk level
  const riskPct = summaryData.length > 0 ? Math.round((totalRiskProjects / summaryData.length) * 100) : 0;
  const riskLevel = riskPct >= 50 ? "high" : riskPct >= 20 ? "medium" : "low";

  // Phase counts
  const phaseCounts = {};
  phaseNames.forEach(ph => { phaseCounts[ph] = 0; });
  summaryData.forEach(proj => { if (phaseCounts[proj.phase] !== undefined) phaseCounts[proj.phase]++; });

  // ── Delta map ──
  const deltaMap = {};
  commitments.forEach(cm => {
    if (cm.deselected >= 0 && cm.deselected < cm.items.length) {
      const lostProj = cm.items[cm.deselected]?.project;
      if (lostProj) { if (!deltaMap[lostProj]) deltaMap[lostProj] = { lost: 0, gained: 0 }; deltaMap[lostProj].lost++; }
    }
    if (cm.bufferProject) {
      if (!deltaMap[cm.bufferProject]) deltaMap[cm.bufferProject] = { lost: 0, gained: 0 };
      deltaMap[cm.bufferProject].gained++;
    }
  });

  // ── Filtering (uses globalFilters) ──
  let filtered = projectData.filter(proj => {
    if (showRisksOnly && proj.risks.length === 0) return false;
    if (filterPhase && proj.phase !== filterPhase) return false;
    if (globalFilters.owner && proj.owner !== globalFilters.owner) return false;
    if (globalFilters.squad && proj.squad !== globalFilters.squad) return false;
    if (globalFilters.person) {
      const hasPersonCommitment = proj.items.some(it => it.person === globalFilters.person);
      if (!hasPersonCommitment) return false;
    }
    if (filterStatus === "no_action" && proj.items.length > 0) return false;
    if (filterStatus === "shipping" && !proj.ship) return false;
    return true;
  });

  // ── Sorting ──
  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      let va, vb;
      if (sortCol === "age") { va = a.age; vb = b.age; }
      else if (sortCol === "health") { va = a.health; vb = b.health; }
      else if (sortCol === "blocked") { va = a.typeCounts.BLOCKED || 0; vb = b.typeCounts.BLOCKED || 0; }
      else if (sortCol === "churn") { const da = deltaMap[a.id], db = deltaMap[b.id]; va = da ? da.lost + da.gained : 0; vb = db ? db.lost + db.gained : 0; }
      else { va = a[sortCol] || ""; vb = b[sortCol] || ""; }
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const densityPresets = {
    compact:   { showAge: false, showBlocked: false, showChurn: false, cellPad: "3px 4px", headerPad: "6px 4px", minTable: 500 },
    default:   { showAge: false, showBlocked: false, showChurn: false, cellPad: "4px 6px", headerPad: "8px 6px", minTable: 600 },
    detailed:  { showAge: true,  showBlocked: true,  showChurn: true,  cellPad: "4px 6px", headerPad: "8px 6px", minTable: 850 },
  };
  const dp = densityPresets[matrixDensity] || densityPresets.default;

  const localActiveFilters = [filterPhase, filterStatus].filter(Boolean).length;
  const clearLocalFilters = () => { setFilterPhase(null); setFilterStatus(""); setShowShip(false); setShowRisksOnly(false); };

  // View morph: bump key on mode change
  const handleModeChange = useCallback((mode) => {
    setPulseMode(mode);
    setMorphKey(k => k + 1);
    setSortCol("squad");
    setSortDir("asc");
  }, []);

  // Hover side panel with debounce
  const handleRowHover = useCallback((projId) => {
    clearTimeout(hoverTimerRef.current);
    if (projId) {
      hoverTimerRef.current = setTimeout(() => {
        const proj = projectData.find(p => p.id === projId);
        if (proj) setSidePanelProj(proj);
      }, 400);
    }
    setHoveredProject(projId);
  }, [projectData]);

  const handleRowLeave = useCallback(() => {
    clearTimeout(hoverTimerRef.current);
    setHoveredProject(null);
  }, []);

  // ── Sync local state → URL ──
  useEffect(() => {
    const p = new URLSearchParams();
    if (filterPhase) p.set("phase", filterPhase);
    if (sortCol !== "squad") p.set("sort", sortCol);
    if (sortDir !== "asc") p.set("dir", sortDir);
    if (showShip) p.set("ship", "1");
    if (showRisksOnly) p.set("risks", "1");
    if (pulseMode !== "matrix") p.set("mode", pulseMode);
    if (matrixDensity !== "default") p.set("density", matrixDensity);
    if (filterStatus) p.set("status", filterStatus);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [filterPhase, sortCol, sortDir, showShip, showRisksOnly, pulseMode, matrixDensity, filterStatus]);

  // ── Keyboard shortcuts ──
  useKeyboard([
    { key: "ArrowUp", fn: () => { setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } },
    { key: "ArrowDown", fn: () => { setKbActive(true); setFocusIdx(i => Math.min(filtered.length - 1, i + 1)); } },
    { key: "Enter", fn: () => { if (filtered[focusIdx]) { const p = filtered[focusIdx]; setSidePanelProj(sidePanelProj?.id === p.id ? null : p); } } },
    { key: "s", fn: () => { setShowShip(!showShip); setFilterPhase(null); setShowRisksOnly(false); } },
    { key: "c", fn: () => { clearLocalFilters(); } },
    { key: "Escape", fn: () => { if (sidePanelProj) { setSidePanelProj(null); } else { clearLocalFilters(); setShowShip(false); } } },
  ], [filtered.length, focusIdx, showShip, showRisksOnly, sidePanelProj]);

  // Re-trigger row animation only on mode change (not filter/sort changes)
  useEffect(() => {
    setRowAnimKey(k => k + 1);
  }, [pulseMode]);

  // Clamp focusIdx
  useEffect(() => {
    if (focusIdx >= filtered.length && filtered.length > 0) setFocusIdx(filtered.length - 1);
  }, [filtered.length, focusIdx]);

  const Th = ({ col, children, style: s }) => (
    <th onClick={() => toggleSort(col)} style={{
      padding: dp.headerPad, textAlign: "left", fontFamily: body, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.05em", cursor: "pointer", userSelect: "none",
      borderBottom: `1px solid ${c.border}`,
      background: c.bg, color: sortCol === col ? c.accent : c.text,
      transition: "color 0.2s", position: "sticky", top: 0, zIndex: 2,
      textTransform: "uppercase", whiteSpace: "nowrap", ...s,
    }}>{children}{sortIcon(col)}</th>
  );

  // ── People view data — flat rows: one row per focus item ──
  const buildPeopleRows = () => {
    const rows = [];
    people.forEach(person => {
      if (globalFilters.person && person.name !== globalFilters.person) return;
      if (globalFilters.squad && person.squad !== globalFilters.squad) return;
      const cm = commitments.find(cm => cm.person === person.name);
      const isLocked = !!cm?.lockedAt;
      const items = cm ? cm.items.filter((_, idx) => cm.deselected !== idx) : [];
      if (items.length === 0) {
        if (!globalFilters.owner) {
          rows.push({ squad: person.squad, personName: person.name, role: person.role, projectId: null, projectName: null, owner: null, title: null, type: null, stage: null, status: null });
        }
      } else {
        items.forEach(item => {
          const proj = projects.find(pr => pr.id === item.project);
          if (globalFilters.owner && (!proj || proj.owner !== globalFilters.owner)) return;
          const stage = item.stage || proj?.phase || null;
          const status = item.type === "BLOCKED" ? "Blocked" : isLocked ? "Locked" : "Open";
          rows.push({
            squad: person.squad, personName: person.name, role: person.role,
            projectId: item.project, projectName: proj?.name || item.project,
            owner: proj?.owner || "—",
            title: item.title || "—", type: item.type, stage, status,
          });
        });
      }
    });
    // Sort
    rows.sort((a, b) => {
      let va, vb;
      if (sortCol === "person") { va = a.personName; vb = b.personName; }
      else if (sortCol === "name" || sortCol === "project") { va = a.projectName || ""; vb = b.projectName || ""; }
      else if (sortCol === "owner") { va = a.owner || ""; vb = b.owner || ""; }
      else if (sortCol === "type") { va = a.type || ""; vb = b.type || ""; }
      else if (sortCol === "stage") { va = a.stage || ""; vb = b.stage || ""; }
      else if (sortCol === "status") { va = a.status || ""; vb = b.status || ""; }
      else { va = a.squad || ""; vb = b.squad || ""; }
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return rows;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ═══════════════════════════════════════════════════════════
          STICKY TOP — summary + toggle (stays fixed when scrolling)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ position: "sticky", top: 92, zIndex: 10, background: c.bg, paddingBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>

      {/* UNIFIED SUMMARY — phase counts + KPIs + risk in one strip */}
      <div className="flow-mission-grid" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {/* Phase tiles — clickable */}
          {phaseNames.map(ph => (
            <SummaryTile
              key={ph}
              value={phaseCounts[ph]}
              label={ph}
              color={pc[ph]}
              active={filterPhase === ph}
              onClick={() => { setFilterPhase(filterPhase === ph ? null : ph); setShowShip(false); setPulseMode("matrix"); }}
            />
          ))}
          {/* Ship tile */}
          <SummaryTile
            value={shippingProjects.length}
            label="Ship"
            color={c.green}
            icon="🚀"
            active={showShip}
            onClick={() => { setShowShip(!showShip); setFilterPhase(null); setShowRisksOnly(false); setPulseMode("matrix"); }}
          />
          {/* No action tile */}
          <SummaryTile
            value={noActionCount}
            label="No action"
            color={c.orange}
            active={filterStatus === "no_action"}
            onClick={() => { setFilterStatus(filterStatus === "no_action" ? "" : "no_action"); setFilterPhase(null); setShowShip(false); setPulseMode("matrix"); }}
          />

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: c.border, flexShrink: 0, margin: "0 6px" }} />

          {/* KPI metrics */}
          <SummaryMetric value={totalCommitments} label="Commits" color={c.text} />
          <SummaryMetric value={blockedCount} label="Blocked" color={blockedCount > 0 ? c.red : c.textDim} />
          <SummaryMetric value={avgHealth} label="Avg Health" color={avgHealth >= 70 ? c.green : avgHealth >= 40 ? c.orange : c.red} />

          {/* Divider */}
          <div style={{ width: 1, height: 36, background: c.border, flexShrink: 0, margin: "0 6px" }} />

          {/* Risk level bar */}
          <div style={{ flex: 1, minWidth: 120 }}>
            <RiskLevelBar level={riskLevel} pct={riskPct} />
          </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE — Projects / People */}
      <div style={{ display: "flex", gap: 2, background: c.accentDim, borderRadius: 10, padding: 3 }}>
        {[
          { key: "matrix", label: "Projects" },
          { key: "people", label: "People" },
        ].map(v => (
          <button key={v.key} onClick={() => handleModeChange(v.key)} style={{
            flex: 1, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: pulseMode === v.key ? c.accent : "transparent",
            fontFamily: body, fontSize: 12.5, fontWeight: pulseMode === v.key ? 700 : 500,
            color: pulseMode === v.key ? "#fff" : c.accent,
            transition: "all 0.15s",
            boxShadow: pulseMode === v.key ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
          }}>{v.label}</button>
        ))}
      </div>

      </div>
      {/* end sticky top */}

      {/* ═══════════════════════════════════════════════════════════
          VIEW CONTENT
          ═══════════════════════════════════════════════════════════ */}
      <div key={morphKey} className="flow-view-morph">

      {/* ── SHIP VIEW ── */}
      {pulseMode === "matrix" && showShip && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Label>Shipping this week</Label>
          {shippingProjects.map(proj => (
            <Card key={proj.id} style={{ padding: layout.padCard }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🚀</span>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: c.accent }}>{proj.id}</span>
                  <span style={{ fontFamily: display, fontSize: 14, fontWeight: 700, color: c.text }}>{proj.name}</span>
                </div>
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: c.textDim }}>{proj.squad} · {proj.owner}</div>
              {proj.items.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
                  {proj.items.map((it, ii) => (
                    <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: c.surfaceAlt, borderRadius: 4 }}>
                      <span style={{ fontFamily: body, fontSize: 11, fontWeight: 600, color: c.text, minWidth: 70, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "40", textUnderlineOffset: 2 }} onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", it.person); }}>{it.person}</span>
                      <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                      <span style={{ fontFamily: body, fontSize: 11, color: c.textMid, flex: 1 }}>{it.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {shippingProjects.length === 0 && <div style={{ textAlign: "center", padding: "30px 0", fontFamily: body, fontSize: 13, color: c.textDim }}>Nothing shipping this week</div>}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PROJECT MATRIX — table with hover panel + delta tokens
          ═══════════════════════════════════════════════════════════ */}
      {pulseMode === "matrix" && !showShip && (
        <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, overflow: "hidden", background: "transparent", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          {/* Table */}
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh", background: "transparent", borderRadius: layout.radius }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: dp.minTable }}>
              <thead>
                <tr>
                  <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: 60 }}>Squad</Th>
                  <Th col="name" style={{ minWidth: 150, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                  <Th col="owner" style={{ minWidth: 70, borderLeft: `1px dotted ${c.border}` }}>Owner</Th>
                  <Th col="health" style={{ minWidth: 48, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Health</Th>
                  {dp.showAge && <Th col="age" style={{ minWidth: 44, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Age</Th>}
                  {dp.showBlocked && <Th col="blocked" style={{ minWidth: 32, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>BLK</Th>}
                  {dp.showChurn && <Th col="churn" style={{ minWidth: 32, textAlign: "center", borderLeft: `1px dotted ${c.border}` }} title="Net scope change — additions minus removals">Δ</Th>}
                  {phaseNames.map(ph => (
                    <th key={ph} style={{
                      position: "sticky", top: 0, background: c.bg, zIndex: 2,
                      padding: "8px 6px", textAlign: "center",
                      fontFamily: body, fontSize: 10, fontWeight: 700, color: pc[ph],
                      letterSpacing: "0.04em", textTransform: "uppercase",
                      borderBottom: `1px solid ${pc[ph]}40`, borderLeft: `1px dotted ${c.border}`, minWidth: 76,
                    }}>{ph}</th>
                  ))}
                </tr>
              </thead>
              <tbody key={rowAnimKey}>
                {filtered.length === 0 && (
                  <tr><td colSpan={phaseNames.length + 4 + (dp.showAge ? 1 : 0) + (dp.showBlocked ? 1 : 0) + (dp.showChurn ? 1 : 0)}><EmptyState icon="🔍" title="No projects match" message="Try adjusting your filters to see results." action={localActiveFilters > 0 ? "Clear filters" : null} onAction={clearLocalFilters} /></td></tr>
                )}
                {filtered.map((proj, fi) => {
                  const isExp = expandedProject === proj.id;
                  const isFocused = kbActive && fi === focusIdx;
                  const isHovered = hoveredProject === proj.id;
                  const api = phaseNames.indexOf(proj.phase);
                  const byPhase = {};
                  phaseNames.forEach(ph => { byPhase[ph] = []; });
                  proj.items.forEach(it => { const ph = it.stage || proj.phase; if (byPhase[ph]) byPhase[ph].push(it); });
                  const hasCriticalRisk = proj.risks.length >= 2;

                  return (
                    <React.Fragment key={proj.id}>
                      <tr
                        className={`flow-row${isFocused ? " flow-kb-focus" : ""}`}
                        onClick={() => { setSidePanelProj(sidePanelProj?.id === proj.id ? null : proj); }}
                        style={{ cursor: "pointer", background: sidePanelProj?.id === proj.id ? c.surfaceAlt : isFocused ? `${c.accent}08` : "transparent", transition: "background 0.15s", animation: `rowSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both`, animationDelay: `${Math.min(fi * 30, 600)}ms` }}
                      >
                        {/* Squad */}
                        <td style={{ padding: dp.cellPad, fontFamily: body, fontSize: 11, fontWeight: 600, color: c.textMid, borderBottom: `1px dotted ${c.border}`, position: "sticky", left: 0, background: c.bg, zIndex: 1 }}>{proj.squad}</td>
                        {/* Project */}
                        <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", proj.id); }} style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.accent + "40", textUnderlineOffset: 2 }}>{proj.id}</span>
                            <span style={{ fontFamily: body, fontSize: 12.5, fontWeight: 600, color: c.text }}>{proj.name}</span>
                            {proj.ship && <span title="Shipping" style={{ fontSize: 11 }}>🚀</span>}
                            {hasCriticalRisk && (
                              <span className="flow-risk-radar" style={{ width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 8, color: c.red }}>●</span>
                              </span>
                            )}
                            {proj.items.length === 0 && (
                              <span style={{ fontFamily: body, fontSize: 9, fontWeight: 600, color: c.orange, background: `${c.orange}12`, border: `1px solid ${c.orange}20`, padding: "1px 5px", borderRadius: 3, lineHeight: 1.4, marginLeft: "auto", flexShrink: 0 }}>No action</span>
                            )}
                          </div>
                        </td>
                        {/* Owner */}
                        <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, fontFamily: body, fontSize: 11, fontWeight: 500, color: proj.owner ? c.textMid : c.red, whiteSpace: "nowrap" }}>
                          {proj.owner || "—"}
                        </td>
                        {/* Health */}
                        <td title={`Health ${proj.health}/100\n${proj.risks.map(r => r.label).join(", ") || "No risks"}`} style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                            <div style={{ width: 48, height: 8, borderRadius: 4, background: c.surfaceAlt, overflow: "hidden" }}>
                              <div style={{ width: `${proj.health}%`, height: "100%", borderRadius: 4, background: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red }} />
                            </div>
                            <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red }}>{proj.health}</span>
                            <span style={{ fontFamily: body, fontSize: 9, fontWeight: 600, color: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red, opacity: 0.8 }}>{proj.health >= 70 ? "Good" : proj.health >= 40 ? "Fair" : "Poor"}</span>
                          </div>
                        </td>
                        {/* Age */}
                        {dp.showAge && (
                        <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: proj.age > 60 ? c.red : proj.age > 30 ? c.orange : c.textMid }}>{proj.age}d</span>
                        </td>
                        )}
                        {/* Blocked */}
                        {dp.showBlocked && (
                        <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, fontFamily: mono, fontSize: 11, fontWeight: 800, color: (proj.typeCounts.BLOCKED || 0) > 0 ? c.red : c.textDim, background: (proj.typeCounts.BLOCKED || 0) > 0 ? `${c.red}10` : "transparent" }}>
                          {proj.typeCounts.BLOCKED || "—"}
                        </td>
                        )}
                        {/* Churn (Δ) */}
                        {dp.showChurn && (() => {
                          const d = deltaMap[proj.id];
                          return (
                        <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                          <DeltaToken gained={d ? d.gained : 0} lost={d ? d.lost : 0} />
                        </td>
                          );
                        })()}
                        {phaseNames.map((ph, i) => {
                          const items = byPhase[ph];
                          const isActive = i === api;
                          const ct = {};
                          items.forEach(it => { ct[it.type] = (ct[it.type] || 0) + 1; });
                          const isDrill = drillCell && drillCell.projId === proj.id && drillCell.phase === ph;
                          return (
                            <td key={ph} onClick={(e) => { e.stopPropagation(); if (items.length > 0) setDrillCell(isDrill ? null : { projId: proj.id, phase: ph }); }}
                              style={{ padding: dp.cellPad, textAlign: "center", verticalAlign: "middle", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, background: isDrill ? `${pc[ph]}20` : isActive ? `${pc[ph]}08` : "transparent", cursor: items.length > 0 ? "pointer" : "default" }}>
                              {isActive && items.length === 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: pc[ph], margin: "0 auto", opacity: 0.6 }} />}
                              {items.length > 0 && (
                                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                                  {Object.entries(ct).map(([t, n]) => {
                                    const letter = { BUILD: "B", JAM: "J", COMMIT: "C", BLOCKED: "X" }[t] || t[0];
                                    return <Tag key={t} color={tc[t]?.color} bg={tc[t]?.bg} style={{ letterSpacing: "-0.02em" }}>{letter}{n}</Tag>;
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Cell drilldown */}
                      {drillCell && drillCell.projId === proj.id && (() => {
                        const drillItems = byPhase[drillCell.phase] || [];
                        const colSpan = phaseNames.length + 4 + (dp.showAge ? 1 : 0) + (dp.showBlocked ? 1 : 0) + (dp.showChurn ? 1 : 0);
                        return (
                          <tr>
                            <td colSpan={colSpan} style={{ padding: "4px 14px 6px", background: `${pc[drillCell.phase]}08`, borderBottom: `1px solid ${pc[drillCell.phase]}30` }}>
                              <div className="flow-expand" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontFamily: mono, fontSize: 10, color: pc[drillCell.phase], fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 1 }}>{drillCell.phase} · {drillItems.length}</span>
                                {drillItems.map((it, ii) => (
                                  <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                                    <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", it.person); }} style={{ fontFamily: body, fontSize: 11, fontWeight: 600, color: c.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "40", textUnderlineOffset: 2, minWidth: 100 }}>{it.person}</span>
                                    <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                                    <span style={{ fontFamily: body, fontSize: 11, color: c.textMid }}>{it.title || "—"}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                      {/* Full row expand */}
                      {isExp && (() => {
                        const colSpan = phaseNames.length + 4 + (dp.showAge ? 1 : 0) + (dp.showBlocked ? 1 : 0) + (dp.showChurn ? 1 : 0);
                        const keyRisks = proj.risks.filter(r => r.key !== "no_dri" && r.key !== "blocked" && r.key !== "aging");
                        const drillPhase = drillCell && drillCell.projId === proj.id ? drillCell.phase : null;
                        const extraItems = drillPhase
                          ? proj.items.filter(it => (it.stage || proj.phase) !== drillPhase)
                          : proj.items;
                        const hasHiddenItems = drillPhase && extraItems.length < proj.items.length;
                        return (
                        <tr>
                          <td colSpan={colSpan} style={{ padding: "4px 14px 8px", background: c.surfaceAlt, borderBottom: `1px dotted ${c.border}` }}>
                            {keyRisks.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                                {keyRisks.map(r => (
                                  <Badge key={r.key} color={r.color} bg={`${r.color}12`} style={{ border: `1px solid ${r.color}30` }}>{r.icon} {r.label}</Badge>
                                ))}
                              </div>
                            )}
                            <div className="flow-expand" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {extraItems.length > 0 ? extraItems.map((it, ii) => (
                                <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: ii < extraItems.length - 1 ? `1px dotted ${c.border}` : "none" }}>
                                  <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", it.person); }} style={{ fontFamily: body, fontSize: 11, fontWeight: 600, color: c.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "40", textUnderlineOffset: 2, minWidth: 100 }}>{it.person}</span>
                                  <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                                  <span style={{ fontFamily: body, fontSize: 11, color: c.textMid, flex: 1 }}>{it.title || "—"}</span>
                                </div>
                              )) : (
                                <div style={{ padding: "4px 0", fontFamily: body, fontSize: 11, color: c.textDim }}>
                                  {hasHiddenItems ? `All ${proj.items.length} commitments shown in ${drillPhase} drilldown above` : "No commitments"}
                                </div>
                              )}
                              {hasHiddenItems && extraItems.length > 0 && (
                                <div style={{ padding: "2px 0 0", fontFamily: body, fontSize: 10, color: c.textDim, fontStyle: "italic" }}>
                                  {proj.items.length - extraItems.length} more in {drillPhase} drilldown above
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PEOPLE TABLE — flat rows, one per focus item, matching projects style
          ═══════════════════════════════════════════════════════════ */}
      {pulseMode === "people" && (() => {
        const peopleRows = buildPeopleRows();
        const statusColors = { Open: c.blue, Locked: c.green, Blocked: c.red };

        return (
          <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, overflow: "hidden", background: "transparent", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh", background: "transparent", borderRadius: layout.radius }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                <thead>
                  <tr>
                    <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: 60 }}>Squad</Th>
                    <Th col="person" style={{ minWidth: 120, borderLeft: `1px dotted ${c.border}` }}>Person</Th>
                    <Th col="name" style={{ minWidth: 140, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                    <Th col="owner" style={{ minWidth: 80, borderLeft: `1px dotted ${c.border}` }}>Owner</Th>
                    <Th col="title" style={{ minWidth: 160, borderLeft: `1px dotted ${c.border}` }}>Focus</Th>
                    <Th col="stage" style={{ minWidth: 70, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Stage</Th>
                    <Th col="type" style={{ minWidth: 64, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Type</Th>
                    <Th col="status" style={{ minWidth: 64, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Status</Th>
                  </tr>
                </thead>
                <tbody key={rowAnimKey}>
                  {peopleRows.length === 0 && (
                    <tr><td colSpan={8}><EmptyState icon="👥" title="No people match" message="Try adjusting the global filters to see results." /></td></tr>
                  )}
                  {peopleRows.map((row, ri) => (
                    <tr
                      key={`${row.personName}-${row.projectId || "none"}-${ri}`}
                      className="flow-row"
                      style={{
                        animation: `rowSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both`,
                        animationDelay: `${Math.min(ri * 20, 600)}ms`,
                      }}
                    >
                      {/* Squad */}
                      <td style={{ padding: dp.cellPad, fontFamily: body, fontSize: 11, fontWeight: 600, color: c.textMid, borderBottom: `1px dotted ${c.border}`, position: "sticky", left: 0, background: c.bg, zIndex: 1 }}>{row.squad}</td>
                      {/* Person — clickable → People deep dive */}
                      <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            onClick={() => onNavigate && onNavigate("people", row.personName)}
                            style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "40", textUnderlineOffset: 2 }}
                          >{row.personName}</span>
                          <span style={{ fontFamily: body, fontSize: 10, color: c.textDim }}>{row.role}</span>
                        </div>
                      </td>
                      {/* Project — clickable → Project deep dive */}
                      <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                        {row.projectId ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span
                              onClick={() => onNavigate && onNavigate("projects", row.projectId)}
                              style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.accent + "40", textUnderlineOffset: 2 }}
                            >{row.projectId}</span>
                            <span style={{ fontFamily: body, fontSize: 11.5, fontWeight: 500, color: c.text }}>{row.projectName}</span>
                          </div>
                        ) : (
                          <span style={{ fontFamily: body, fontSize: 11, color: c.textDim }}>—</span>
                        )}
                      </td>
                      {/* Owner */}
                      <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, fontFamily: body, fontSize: 11, fontWeight: 500, color: row.owner ? c.textMid : c.textDim, whiteSpace: "nowrap" }}>
                        {row.owner || "—"}
                      </td>
                      {/* Focus — title, clickable → Focus tab */}
                      <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                        {row.title ? (
                          <span
                            onClick={() => onNavigate && onNavigate("focus", row.personName)}
                            style={{ fontFamily: body, fontSize: 11, color: c.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "30", textUnderlineOffset: 2 }}
                          >{row.title}</span>
                        ) : (
                          <span style={{ fontFamily: body, fontSize: 9, fontWeight: 600, color: c.orange, background: `${c.orange}12`, border: `1px solid ${c.orange}20`, padding: "1px 5px", borderRadius: 3, lineHeight: 1.4 }}>No focus</span>
                        )}
                      </td>
                      {/* Stage — phase tag */}
                      <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                        {row.stage ? (
                          <Tag color={pc[row.stage] || c.textMid} bg={`${pc[row.stage] || c.textMid}15`}>{row.stage}</Tag>
                        ) : (
                          <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>—</span>
                        )}
                      </td>
                      {/* Type — BUILD / JAM / COMMIT / BLOCKED */}
                      <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                        {row.type ? (
                          <Badge color={tc[row.type]?.color} bg={tc[row.type]?.bg}>{row.type}</Badge>
                        ) : (
                          <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>—</span>
                        )}
                      </td>
                      {/* Status — Open / Locked / Blocked */}
                      <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                        {row.status ? (
                          <Tag color={statusColors[row.status] || c.textMid} bg={`${statusColors[row.status] || c.textMid}15`}>{row.status}</Tag>
                        ) : (
                          <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      </div>
      {/* end morph wrapper */}

      {/* ═══════════════════════════════════════════════════════════
          SIDE PANEL — project telemetry on row click
          ═══════════════════════════════════════════════════════════ */}
      {sidePanelProj && (
        <SidePanel
          proj={sidePanelProj}
          deltaMap={deltaMap}
          tc={tc}
          pc={pc}
          onNavigate={onNavigate}
          onClose={() => setSidePanelProj(null)}
        />
      )}
    </div>
  );
};


export default PulseView;
