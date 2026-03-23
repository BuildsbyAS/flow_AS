// Flow — Pulse View (Phase 2: full design-system compliance)
// Leadership command center — highest intensity, futuristic, tactical
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, typo, space, layout, motion, phaseNames, shipPhases, allPhases, typeConfig, phaseColors, density, entityColors } from "../styles/theme";
import { Badge, Tag, Card, Surface, Label, Btn, EmptyState, DeltaIndicator, VDivider, TelemetryLabel, MetricCompact, SummaryTile, Th as SharedTh, EntityLink } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import { weekConfig as fallbackWeekConfig } from "../data/seed";

// ─── ANIMATED KPI COUNTER ─────────────────────────────────────
const KpiCounter = ({ value, label, color, delay = 0 }) => {
  const [display_val, setDisplayVal] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const dur = parseFloat(motion.critical.duration) * 1000 * 2;
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
    <div className="flow-kpi-num" style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      animationDelay: `${delay}ms`,
    }}>
      <span style={{
        fontFamily: typo.displayXl.font, fontSize: typo.displayXl.size,
        fontWeight: typo.displayXl.weight, letterSpacing: typo.displayXl.tracking,
        color, lineHeight: typo.displayXl.lineHeight,
      }}>{display_val}</span>
      <span style={{
        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
        fontWeight: 500, letterSpacing: "0",
        color: c.textMid,
      }}>{label}</span>
    </div>
  );
};

// ─── RISK LEVEL BAR ───────────────────────────────────────────
const RiskLevelBar = ({ level, pct }) => {
  const cfg = {
    low:    { color: c.green, label: "LOW RISK" },
    medium: { color: c.orange, label: "MEDIUM RISK" },
    high:   { color: c.red, label: "HIGH RISK" },
  }[level] || { color: c.green, label: "LOW" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: space[2], flex: 1 }}>
      <TelemetryLabel style={{ flexShrink: 0 }}>RISK</TelemetryLabel>
      <div style={{
        flex: 1, height: 6, borderRadius: layout.radiusTag,
        background: c.surfaceAlt, overflow: "hidden",
      }}>
        <div style={{
          width: `${Math.min(100, pct)}%`, height: "100%",
          borderRadius: layout.radiusTag,
          background: `linear-gradient(90deg, ${cfg.color}80, ${cfg.color})`,
          transition: `width ${motion.critical.duration} ${motion.critical.easing}`,
        }} />
      </div>
      <span style={{
        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
        fontWeight: 800, letterSpacing: typo.monoMd.tracking, flexShrink: 0,
        color: cfg.color,
      }}>{pct}%</span>
      <span style={{
        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
        fontWeight: 700, letterSpacing: typo.monoSm.tracking,
        color: cfg.color, flexShrink: 0,
      }}>{cfg.label}</span>
    </div>
  );
};

// ─── DELTA TOKEN (scope churn) ────────────────────────────────
const DeltaToken = ({ gained, lost }) => {
  const net = gained - lost;
  if (net === 0 && gained === 0) return <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>—</span>;
  return <DeltaIndicator value={net} style={{ fontSize: typo.bodyXs.size }} />;
};

// ─── SIDE PANEL (project telemetry) ────────────────────────────
const SidePanel = ({ proj, deltaMap, tc, pc, onNavigate, onClose }) => {
  if (!proj) return null;
  const d = deltaMap[proj.id];
  const ec = entityColors();
  const healthColor = proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red;

  const formatDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const sectionTitle = {
    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
    fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking,
    color: c.textDim, textTransform: "uppercase", marginBottom: space[2],
    display: "block",
  };

  const metaLabel = {
    fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
    color: c.textDim, marginBottom: 2, display: "block",
  };

  const metaValue = {
    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
    fontWeight: 600, color: c.text,
  };

  return (
    <div className="flow-side-panel" style={{
      padding: 0, background: c.surfaceOverlay,
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: `${space[4]}px ${space[5]}px ${space[3]}px`,
        borderBottom: `1px solid ${c.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Project ID — gold */}
            <span style={{
              fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
              fontWeight: 700, color: ec.project, letterSpacing: typo.monoLg.tracking,
            }}>{proj.id}</span>
            {/* Project name */}
            <div style={{
              fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
              fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
              color: c.text, marginTop: 3,
            }}>{proj.name}</div>
          </div>
          <Btn variant="ghost" size="sm" onClick={onClose} style={{ padding: `3px ${space[2]}px`, flexShrink: 0 }}>✕</Btn>
        </div>

        {/* Phase + Squad + Owner row */}
        <div style={{ display: "flex", alignItems: "center", gap: space[2], marginTop: space[3], flexWrap: "wrap" }}>
          <Badge color={pc[proj.phase]} bg={`${pc[proj.phase]}15`}>{proj.phase}</Badge>
          <span style={{ width: 1, height: 12, background: c.border, flexShrink: 0 }} />
          <span style={{
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
            fontWeight: 600, color: c.textMid,
          }}>{proj.squad}</span>
          <span style={{ width: 1, height: 12, background: c.border, flexShrink: 0 }} />
          <span style={{
            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
            fontWeight: 600, color: c.cyan,
          }}>{proj.owner || "Unassigned"}</span>
        </div>
      </div>

      {/* ── Content sections ── */}
      <div style={{ padding: `${space[4]}px ${space[5]}px`, display: "flex", flexDirection: "column", gap: space[5] }}>

        {/* ── Timeline ── */}
        {(() => {
          const pct = proj.planned > 0 ? Math.min(100, Math.round((proj.age / proj.planned) * 100)) : 0;
          const overdue = proj.remaining != null && proj.remaining < 0;
          const ageColor = proj.age > 60 ? c.red : proj.age > 30 ? c.orange : c.cyan;
          const remColor = proj.remaining != null ? (proj.remaining < 0 ? c.red : proj.remaining < 7 ? c.orange : c.green) : c.textDim;
          const barColor = overdue ? c.red : pct > 75 ? c.orange : c.cyan;
          return (
            <div>
              <span style={sectionTitle}>Timeline</span>
              {/* Progress bar */}
              <div style={{
                position: "relative", height: 6, borderRadius: 3,
                background: c.border, overflow: "hidden", marginBottom: space[3],
              }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, height: "100%",
                  width: `${Math.min(pct, 100)}%`, borderRadius: 3,
                  background: barColor,
                  transition: "width 0.4s ease",
                }} />
              </div>
              {/* Date range row */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: space[2],
              }}>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.text }}>
                  {formatDate(proj.startDate)}
                </span>
                <span style={{
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                  color: c.textDim,
                }}>→</span>
                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.text }}>
                  {formatDate(proj.endDate)}
                </span>
              </div>
              {/* Age / Remaining pills */}
              <div style={{ display: "flex", gap: space[2] }}>
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: `${space[1] + 1}px ${space[3]}px`,
                  background: `${ageColor}10`, borderRadius: layout.radiusMd,
                  border: `1px solid ${ageColor}20`,
                }}>
                  <span style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, color: c.textDim }}>Age</span>
                  <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: 700, color: ageColor }}>{proj.age}d</span>
                </div>
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: `${space[1] + 1}px ${space[3]}px`,
                  background: `${remColor}10`, borderRadius: layout.radiusMd,
                  border: `1px solid ${remColor}20`,
                }}>
                  <span style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, color: c.textDim }}>Remaining</span>
                  <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: 700, color: remColor }}>
                    {proj.remaining != null ? `${proj.remaining}d` : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Health ── */}
        <div>
          <span style={sectionTitle}>Health</span>
          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            <div style={{
              flex: 1, height: 6, borderRadius: layout.radiusTag,
              background: c.surfaceAlt, overflow: "hidden",
            }}>
              <div style={{
                width: `${proj.health}%`, height: "100%",
                borderRadius: layout.radiusTag,
                background: healthColor,
                transition: `width ${motion.critical.duration} ${motion.critical.easing}`,
              }} />
            </div>
            <span style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: 700, color: healthColor, minWidth: 28, textAlign: "right",
            }}>{proj.health}</span>
          </div>
        </div>

        {/* ── This week's commits ── */}
        <div>
          <span style={sectionTitle}>This week's commits · {proj.items.length}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {proj.items.map((it, ii) => (
              <div key={ii} style={{
                display: "flex", alignItems: "center", gap: space[2],
                padding: `${space[2]}px ${space[2] + 2}px`,
                background: c.surfaceAlt, borderRadius: layout.radiusSm,
                border: `1px solid ${c.border}`,
              }}>
                <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                <span style={{
                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                  color: c.text, flex: 1,
                }}>{it.title || "—"}</span>
                <span style={{
                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                  fontWeight: 500, color: c.cyan, whiteSpace: "nowrap",
                }}>{it.person}</span>
              </div>
            ))}
            {proj.items.length === 0 && (
              <div style={{
                padding: `${space[3]}px ${space[2] + 2}px`,
                background: c.surfaceAlt, borderRadius: layout.radiusSm,
                border: `1px solid ${c.border}`,
                textAlign: "center",
              }}>
                <span style={{
                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                  color: c.textDim,
                }}>No commit items this week</span>
              </div>
            )}
          </div>
        </div>

        {/* ── View full project CTA ── */}
        <Btn variant="command" onClick={() => onNavigate && onNavigate("projects", proj.id)}
          style={{ justifyContent: "center" }}>
          View full project →
        </Btn>
      </div>
    </div>
  );
};



// ═══════════════════════════════════════════════════════════════
// PULSE VIEW — main component
// ═══════════════════════════════════════════════════════════════
const PulseView = ({ commitments, projects, people, onNavigate, searchRef, globalFilters = {}, isHistorical, selectedWeekKey, weekConfig: weekConfigProp, appSettings = {} }) => {
  const weekConfig = weekConfigProp || fallbackWeekConfig;
  const [expandedProject, setExpandedProject] = useState(null);
  const initParams = useRef(new URLSearchParams(window.location.search)).current;
  const [filterPhase, setFilterPhase] = useState(initParams.get("phase") || null);
  const [sortCol, setSortCol] = useState(initParams.get("sort") || "squad");
  const [sortDir, setSortDir] = useState(initParams.get("dir") || "asc");
  // showShip removed — Ship tile now uses filterStatus="shipping" like other tiles
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

    // ── Risk signals ──
    const risks = [];
    if (!proj.owner) risks.push({ key: "no_dri", label: "No owner", color: c.red, icon: "⚠" });
    if (items.length === 0 && !shipPhases.includes(proj.phase)) risks.push({ key: "no_commits", label: "No activity", color: c.red, icon: "⚠" });
    if ((typeCounts.JAM || 0) > (typeCounts.BUILD || 0) && items.length > 1) risks.push({ key: "jam_heavy", label: "JAM > BUILD", color: c.orange, icon: "⚡" });
    if (proj.phase === "Dev" && age > 30) risks.push({ key: "stale_eng", label: "Stuck in Dev " + age + "d", color: c.orange, icon: "🐌" });
    if (age > 60) risks.push({ key: "aging", label: "Aging " + age + "d", color: c.red, icon: "⏰" });
    if (remaining !== null && remaining < 0) risks.push({ key: "overdue", label: "Overdue", color: c.red, icon: "🚨" });
    const outcomeItems = items.filter(it => it.outcome);
    const carryCount = outcomeItems.filter(it => it.outcome === "carry").length;
    const blockedOutcomes = outcomeItems.filter(it => it.outcome === "blocked").length;
    if (carryCount > 1) risks.push({ key: "carry_heavy", label: carryCount + " carried over", color: c.orange, icon: "🔄" });

    // ── Health: 5 dimensions (each penalizes from 100) ──
    let health = 100;

    // 1. Timeline pressure (max −35)
    if (planned > 0) {
      const pctElapsed = age / planned;
      if (pctElapsed > 1) health -= 35;
      else if (pctElapsed > 0.85) health -= 20;
      else if (pctElapsed > 0.65) health -= 10;
    }
    if (remaining !== null && remaining < 7 && remaining >= 0 && !shipPhases.includes(proj.phase)) health -= 5;

    // 2. Commitment activity (max −25)
    if (items.length === 0 && !shipPhases.includes(proj.phase)) {
      health -= 25;
    } else {
      if (items.length > 0 && !typeCounts.BUILD && typeCounts.JAM) health -= 10;
      const blockedItems = typeCounts.BLOCKED || 0;
      if (blockedItems > 0) health -= Math.min(15, blockedItems * 5);
    }

    // 3. Ownership & accountability (max −20)
    if (!proj.owner) health -= 20;
    const projPeople = ppl.map(name => commitments.find(cm => cm.person === name));
    const hasUnlocked = projPeople.some(cm => cm && !cm.lockedAt);
    if (items.length > 0 && hasUnlocked) health -= 5;

    // 4. Outcome track record (max −15)
    const outcomePenalty = Math.min(10, carryCount * 5) + Math.min(10, blockedOutcomes * 5);
    health -= Math.min(15, outcomePenalty);

    // 5. Scope stability (max −10)
    const depriOnProj = commitments.filter(cm => cm.deselected >= 0 && cm.items[cm.deselected]?.project === proj.id).length;
    if (depriOnProj > 0) health -= Math.min(10, depriOnProj * 5);

    health = Math.max(0, Math.min(100, health));

    return { ...proj, items, typeCounts, people: ppl, totalCommitments: items.length, age, planned, remaining, risks, health };
  });

  // ── GA auto-hide: hide GA projects older than threshold ──
  const gaVisibilityWeeks = parseInt(appSettings.ga_visibility_weeks, 10);
  const gaThresholdMs = !isNaN(gaVisibilityWeeks) ? gaVisibilityWeeks * 7 * 24 * 60 * 60 * 1000 : null;
  const isGaHidden = (proj) => gaThresholdMs !== null && proj.phase === "GA" && proj.gaEnteredAt && (Date.now() - new Date(proj.gaEnteredAt).getTime()) > gaThresholdMs;

  // ── Apply global filters to summary data ──
  const summaryData = projectData.filter(proj => {
    if (isGaHidden(proj)) return false;
    if (globalFilters.owner.length > 0 && !globalFilters.owner.includes(proj.owner)) return false;
    if (globalFilters.squad.length > 0 && !globalFilters.squad.includes(proj.squad)) return false;
    if (globalFilters.person.length > 0) {
      const hasPersonCommitment = proj.items.some(it => globalFilters.person.includes(it.person));
      if (!hasPersonCommitment) return false;
    }
    return true;
  });

  // ── Derived KPI metrics (from globally filtered data) ──
  const shippingProjects = summaryData.filter(p => shipPhases.includes(p.phase));
  const totalRiskProjects = summaryData.filter(p => p.risks.length > 0).length;
  const avgHealth = summaryData.length > 0 ? Math.round(summaryData.reduce((s, p) => s + p.health, 0) / summaryData.length) : 0;
  const summaryItems = summaryData.flatMap(p => p.items);
  const totalCommitments = summaryItems.length;
  const noActionCount = summaryData.filter(p => p.items.length === 0).length;

  // ── Commit-level metrics ──
  const lockedItems = commitments.filter(cm => !!cm.lockedAt).flatMap(cm => cm.items.filter((_, idx) => cm.deselected !== idx));
  const lockedCount = lockedItems.length;
  const lockedPct = totalCommitments > 0 ? Math.round((lockedCount / totalCommitments) * 100) : 0;
  // Outcome breakdown (from all items across all commits)
  const allOutcomeItems = commitments.flatMap(cm => cm.items.filter((_, idx) => cm.deselected !== idx));
  const outcomeTotal = allOutcomeItems.length;
  const completedCount = allOutcomeItems.filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
  const carriedCount = allOutcomeItems.filter(it => it.outcome === "carry").length;
  const blockedCount = allOutcomeItems.filter(it => it.outcome === "blocked").length;
  const depriCount = commitments.filter(cm => cm.deselected >= 0).length;
  const completedPct = outcomeTotal > 0 ? Math.round((completedCount / outcomeTotal) * 100) : 0;
  const carriedPct = outcomeTotal > 0 ? Math.round((carriedCount / outcomeTotal) * 100) : 0;
  const blockedPct = outcomeTotal > 0 ? Math.round((blockedCount / outcomeTotal) * 100) : 0;
  const depriPct = outcomeTotal > 0 ? Math.round((depriCount / outcomeTotal) * 100) : 0;

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
    // Auto-hide old GA projects (unless user explicitly filters to GA phase)
    if (!filterPhase && isGaHidden(proj)) return false;
    if (showRisksOnly && proj.risks.length === 0) return false;
    if (filterPhase && proj.phase !== filterPhase) return false;
    if (globalFilters.owner.length > 0 && !globalFilters.owner.includes(proj.owner)) return false;
    if (globalFilters.squad.length > 0 && !globalFilters.squad.includes(proj.squad)) return false;
    if (globalFilters.person.length > 0) {
      const hasPersonCommitment = proj.items.some(it => globalFilters.person.includes(it.person));
      if (!hasPersonCommitment) return false;
    }
    if (filterStatus === "no_action" && proj.items.length > 0) return false;
    if (filterStatus === "shipping" && !shipPhases.includes(proj.phase)) return false;
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
    compact:   { showAge: false, showBlocked: false, showChurn: false, cellPad: `${space[1]}px ${space[1]}px`, headerPad: `${space[2] - 2}px ${space[1]}px`, minTable: 500 },
    default:   { showAge: false, showBlocked: false, showChurn: false, cellPad: `${space[1]}px ${space[2] - 2}px`, headerPad: `${space[2]}px ${space[2] - 2}px`, minTable: 600 },
    detailed:  { showAge: true,  showBlocked: true,  showChurn: true,  cellPad: `${space[1]}px ${space[2] - 2}px`, headerPad: `${space[2]}px ${space[2] - 2}px`, minTable: 850 },
  };
  const dp = densityPresets[matrixDensity] || densityPresets.default;

  const localActiveFilters = [filterPhase, filterStatus].filter(Boolean).length;
  const clearLocalFilters = () => { setFilterPhase(null); setFilterStatus(""); setShowRisksOnly(false); };

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
    if (filterStatus === "shipping") p.set("status", "shipping");
    if (showRisksOnly) p.set("risks", "1");
    if (pulseMode !== "matrix") p.set("mode", pulseMode);
    if (matrixDensity !== "default") p.set("density", matrixDensity);
    if (filterStatus) p.set("status", filterStatus);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [filterPhase, sortCol, sortDir, showRisksOnly, pulseMode, matrixDensity, filterStatus]);

  // ── Keyboard shortcuts ──
  useKeyboard([
    { key: "ArrowUp", fn: () => { setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } },
    { key: "ArrowDown", fn: () => { setKbActive(true); setFocusIdx(i => Math.min(filtered.length - 1, i + 1)); } },
    { key: "Enter", fn: () => { if (filtered[focusIdx]) { const p = filtered[focusIdx]; setSidePanelProj(sidePanelProj?.id === p.id ? null : p); } } },
    { key: "s", fn: () => { setFilterStatus(filterStatus === "shipping" ? "" : "shipping"); setFilterPhase(null); setShowRisksOnly(false); } },
    { key: "c", fn: () => { clearLocalFilters(); } },
    { key: "Escape", fn: () => { if (sidePanelProj) { setSidePanelProj(null); } else { clearLocalFilters(); } } },
  ], [filtered.length, focusIdx, filterStatus, showRisksOnly, sidePanelProj]);

  // Re-trigger row animation only on mode change
  useEffect(() => {
    setRowAnimKey(k => k + 1);
  }, [pulseMode]);

  // Clamp focusIdx
  useEffect(() => {
    if (focusIdx >= filtered.length && filtered.length > 0) setFocusIdx(filtered.length - 1);
  }, [filtered.length, focusIdx]);

  const Th = ({ col, children, style: s }) => (
    <SharedTh col={col} sortKey={sortCol} sortDir={sortDir} onSort={toggleSort}
      style={{ padding: dp.headerPad, ...s }}>{children}</SharedTh>
  );

  // ── People view data — flat rows: one row per commit item ──
  const buildPeopleRows = () => {
    const rows = [];
    people.forEach(person => {
      if (globalFilters.person.length > 0 && !globalFilters.person.includes(person.name)) return;
      if (globalFilters.squad.length > 0 && !globalFilters.squad.includes(person.squad)) return;
      const cm = commitments.find(cm => cm.person === person.name);
      const isLocked = !!cm?.lockedAt;
      const items = cm ? cm.items.filter((_, idx) => cm.deselected !== idx) : [];
      if (items.length === 0) {
        if (globalFilters.owner.length === 0) {
          rows.push({ squad: person.squad, personName: person.name, role: person.role, projectId: null, projectName: null, owner: null, title: null, type: null, stage: null, status: null });
        }
      } else {
        items.forEach((item, itemIdx) => {
          const proj = projects.find(pr => pr.id === item.project);
          if (globalFilters.owner.length > 0 && (!proj || !globalFilters.owner.includes(proj.owner))) return;
          // Skip rows where both project and title are empty (corrupt/stale data)
          if (!item.project && !item.title) return;
          const stage = (!item.project && !proj) ? null : (item.stage || proj?.phase || null);
          const status = isLocked ? "Locked" : "Open";
          rows.push({
            squad: person.squad, personName: person.name, role: person.role,
            projectId: item.project || null, projectName: proj?.name || item.project || null,
            owner: proj?.owner || "—",
            title: item.title || "—", type: item.project ? item.type : null, stage, status: item.project ? status : null,
            commitIdx: itemIdx,
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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 128px)", marginBottom: -60 }}>

      {/* ═══════════════════════════════════════════════════════════
          FROZEN TOP — summary + toggle (never scrolls)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0,
        paddingBottom: space[3],
        display: "flex", flexDirection: "column", gap: space[3] - 2,
      }}>

      {/* UNIFIED SUMMARY — phase counts + commit metrics + outcomes */}
      <div className="flow-mission-grid" style={{ padding: `${space[3]}px ${space[4]}px` }}>
        <div style={{
          display: "flex", alignItems: "center",
          position: "relative", zIndex: 1,
        }}>
          {/* Section 1: Phase tiles — clickable */}
          <div style={{ flex: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
            {phaseNames.map(ph => (
              <SummaryTile
                key={ph}
                value={phaseCounts[ph]}
                label={ph}
                color={pc[ph]}
                active={filterPhase === ph}
                onClick={() => { setFilterPhase(filterPhase === ph ? null : ph); setFilterStatus(""); setPulseMode("matrix"); }}
              />
            ))}
            <SummaryTile
              value={shippingProjects.length}
              label="Ship"
              color={"#1FAA59"}
              active={filterStatus === "shipping"}
              onClick={() => { setFilterStatus(filterStatus === "shipping" ? "" : "shipping"); setFilterPhase(null); setShowRisksOnly(false); setPulseMode("matrix"); }}
            />
            <SummaryTile
              value={noActionCount}
              label="No commits"
              color={c.orange}
              active={filterStatus === "no_action"}
              onClick={() => { setFilterStatus(filterStatus === "no_action" ? "" : "no_action"); setFilterPhase(null); setPulseMode("matrix"); }}
            />
          </div>

          <VDivider height={32} style={{ margin: `0 ${space[3]}px` }} />

          {/* Section 2: Commit metrics — non-clickable */}
          <div style={{ flex: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
            <MetricCompact value={totalCommitments} label="Commits" color={c.text} hero />
            <MetricCompact value={lockedCount} label="Locked" color={lockedCount > 0 ? c.green : c.textDim} />
            <MetricCompact value={`${lockedPct}%`} label="Lock Rate" color={lockedPct >= 80 ? c.green : lockedPct >= 50 ? c.orange : c.textDim} />
          </div>

          <VDivider height={32} style={{ margin: `0 ${space[3]}px` }} />

          {/* Section 3: Outcome breakdown — clickable, deep-links to commits */}
          <div style={{ flex: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
            <SummaryTile value={`${completedPct}%`} label="Completed" color={completedPct > 0 ? c.green : c.textDim} hero
              onClick={() => { setPulseMode("people"); setTimeout(() => { const el = document.querySelector('[data-status-group="Completed"]'); if (el) { const sc = el.closest('[style*="overflow"]'); if (sc) { const elTop = el.offsetTop - sc.offsetTop; sc.scrollTo({ top: Math.max(0, elTop - 10), behavior: "smooth" }); } else { el.scrollIntoView({ behavior: "smooth", block: "center" }); } } }, 100); }} />
            <SummaryTile value={`${carriedPct}%`} label="Carried" color={carriedPct > 0 ? c.orange : c.textDim}
              onClick={() => { setPulseMode("people"); setTimeout(() => { const el = document.querySelector('[data-status-group="Carry"]'); if (el) { const sc = el.closest('[style*="overflow"]'); if (sc) { const elTop = el.offsetTop - sc.offsetTop; sc.scrollTo({ top: Math.max(0, elTop - 10), behavior: "smooth" }); } else { el.scrollIntoView({ behavior: "smooth", block: "center" }); } } }, 100); }} />
            <SummaryTile value={`${blockedPct}%`} label="Blocked" color={blockedPct > 0 ? c.red : c.textDim}
              onClick={() => { setPulseMode("people"); setTimeout(() => { const el = document.querySelector('[data-status-group="Blocked"]'); if (el) { const sc = el.closest('[style*="overflow"]'); if (sc) { const elTop = el.offsetTop - sc.offsetTop; sc.scrollTo({ top: Math.max(0, elTop - 10), behavior: "smooth" }); } else { el.scrollIntoView({ behavior: "smooth", block: "center" }); } } }, 100); }} />
            <SummaryTile value={`${depriPct}%`} label="Depri'd" color={depriPct > 0 ? c.red : c.textDim}
              onClick={() => { setPulseMode("people"); setTimeout(() => { const el = document.querySelector('[data-status-group="Deprioritized"]'); if (el) { const sc = el.closest('[style*="overflow"]'); if (sc) { const elTop = el.offsetTop - sc.offsetTop; sc.scrollTo({ top: Math.max(0, elTop - 10), behavior: "smooth" }); } else { el.scrollIntoView({ behavior: "smooth", block: "center" }); } } }, 100); }} />
          </div>

          <VDivider height={32} style={{ margin: `0 ${space[3]}px` }} />

          {/* Section 4: Avg Health with progress bar */}
          <div style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
            <div style={{ textAlign: "center", minWidth: 80 }}>
              <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: 700, color: avgHealth >= 70 ? c.green : avgHealth >= 40 ? c.orange : c.red }}>{avgHealth}</div>
              <div style={{
                width: "100%", height: 4, borderRadius: 2, background: c.surfaceAlt, marginTop: 4, overflow: "hidden",
              }}>
                <div style={{
                  width: `${avgHealth}%`, height: "100%", borderRadius: 2,
                  background: avgHealth >= 70 ? c.green : avgHealth >= 40 ? c.orange : c.red,
                  transition: "width 0.5s ease",
                }} />
              </div>
              <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, marginTop: 3, letterSpacing: "0.05em" }}>Avg Health</div>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE — Projects / People */}
      <div style={{
        display: "flex", gap: 2,
        background: c.accentDim, borderRadius: layout.radiusMd, padding: 3,
      }}>
        {[
          { key: "matrix", label: "Projects" },
          { key: "people", label: "Commits" },
        ].map(v => (
          <button key={v.key} onClick={() => handleModeChange(v.key)} style={{
            flex: 1, padding: `${space[2]}px ${space[4]}px`,
            borderRadius: layout.radiusMd, border: "none", cursor: "pointer",
            background: pulseMode === v.key ? c.accent : "transparent",
            fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
            fontWeight: pulseMode === v.key ? 700 : 500,
            color: pulseMode === v.key ? c.textCrit : c.accent,
            transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
            boxShadow: pulseMode === v.key ? `0 1px 3px ${c.shadow}` : "none",
          }}>{v.label}</button>
        ))}
      </div>

      </div>
      {/* end frozen top */}

      {/* ═══════════════════════════════════════════════════════════
          SCROLLABLE CONTENT (only this area scrolls)
          ═══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", position: "relative", zIndex: 1 }}>
      <div key={morphKey} className="flow-view-morph">

      {/* ═══════════════════════════════════════════════════════════
          PROJECT MATRIX — table with hover panel + delta tokens
          ═══════════════════════════════════════════════════════════ */}
      {pulseMode === "matrix" && (
        <Surface variant="data" compact style={{
          padding: 0,
        }}>
          <div style={{
            borderRadius: layout.radius,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: dp.minTable }}>
              <thead>
                <tr>
                  <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: 70 }}>Squad</Th>
                  <Th col="name" style={{ minWidth: 150, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                  <Th col="owner" style={{ minWidth: 80, borderLeft: `1px dotted ${c.border}` }}>Owner</Th>
                  <Th col="phase" style={{ minWidth: 64, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Status</Th>
                  <Th col="health" style={{ minWidth: 48, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Health</Th>
                  {dp.showAge && <Th col="age" style={{ minWidth: 44, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Age</Th>}
                  {dp.showBlocked && <Th col="blocked" style={{ minWidth: 32, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>BLK</Th>}
                  {dp.showChurn && <Th col="churn" style={{ minWidth: 32, textAlign: "center", borderLeft: `1px dotted ${c.border}` }} title="Net scope change — additions minus removals">Δ</Th>}
                  {phaseNames.map(ph => (
                    <th key={ph} style={{
                      position: "sticky", top: 0, background: c.bg, zIndex: 2,
                      padding: dp.headerPad, textAlign: "center",
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      fontWeight: 600, letterSpacing: "0",
                      color: pc[ph],
                      borderBottom: `1px solid ${pc[ph]}40`,
                      borderLeft: `1px dotted ${c.border}`, minWidth: 76,
                      cursor: "default", whiteSpace: "nowrap",
                    }}>{ph}</th>
                  ))}
                  <th style={{
                    position: "sticky", top: 0, background: c.bg, zIndex: 2,
                    padding: dp.headerPad, textAlign: "center",
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                    fontWeight: 600, letterSpacing: "0",
                    color: "#4ADE80",
                    borderBottom: `1px solid ${"#4ADE80"}40`,
                    borderLeft: `1px dotted ${c.border}`, minWidth: 76,
                    cursor: "default", whiteSpace: "nowrap",
                  }}>Ship</th>
                </tr>
              </thead>
              <tbody key={rowAnimKey}>
                {filtered.length === 0 && (
                  <tr><td colSpan={phaseNames.length + 6 + (dp.showAge ? 1 : 0) + (dp.showBlocked ? 1 : 0) + (dp.showChurn ? 1 : 0)}>
                    <EmptyState icon="🔍" title="No projects match" message="Try adjusting your filters to see results."
                      action={localActiveFilters > 0 ? "Clear filters" : null} onAction={clearLocalFilters} />
                  </td></tr>
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
                        style={{
                          cursor: "pointer",
                          background: sidePanelProj?.id === proj.id ? c.surfaceAlt : isFocused ? `${c.accent}08` : "transparent",
                          transition: `background ${motion.interaction.duration}`,
                          animation: `rowSlideIn 0.3s ${motion.critical.easing} both`,
                          animationDelay: `${Math.min(fi * 30, 600)}ms`,
                        }}
                      >
                        {/* Squad */}
                        <td style={{
                          padding: dp.cellPad,
                          fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                          fontWeight: 600, color: c.textMid,
                          borderBottom: `1px dotted ${c.border}`,
                          position: "sticky", left: 0, background: c.bg, zIndex: 1,
                        }}>{proj.squad}</td>
                        {/* Project */}
                        <td style={{
                          padding: dp.cellPad,
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("projects", proj.id); }} style={{
                              fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                              fontWeight: 700, color: entityColors().project, cursor: "pointer",
                              textDecoration: "underline", textDecorationColor: entityColors().project + "40",
                              textUnderlineOffset: 2,
                            }}>{proj.id}</span>
                            <span style={{
                              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                              fontWeight: 600, color: c.text,
                            }}>{proj.name}</span>
                            {proj.items.length === 0 && (
                              <span style={{
                                marginLeft: "auto", flexShrink: 0,
                                border: `1px solid ${c.orange}20`,
                                background: `${c.orange}10`,
                                padding: `1px 6px`,
                                fontSize: 9,
                                fontFamily: typo.monoSm.font,
                                fontWeight: 600,
                                letterSpacing: typo.monoSm.tracking,
                                lineHeight: 1.2,
                                borderRadius: layout.radiusTag,
                                color: c.orange,
                                whiteSpace: "nowrap",
                              }}>No commits</span>
                            )}
                          </div>
                        </td>
                        {/* Owner */}
                        <td style={{
                          padding: dp.cellPad,
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                          fontWeight: 500, color: proj.owner ? c.textMid : c.red,
                          whiteSpace: "nowrap",
                        }}>
                          {proj.owner || "—"}
                        </td>
                        {/* Status (phase) */}
                        <td style={{
                          padding: dp.cellPad, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                        }}>
                          <Badge color={pc[proj.phase] || c.textMid} bg={`${pc[proj.phase] || c.textMid}15`}>{proj.phase}</Badge>
                        </td>
                        {/* Health */}
                        <td title={`Health ${proj.health}/100\n${proj.risks.map(r => r.label).join(", ") || "No risks"}`} style={{
                          padding: dp.cellPad,
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{
                              width: 48, height: 8, borderRadius: layout.radiusTag + 1,
                              background: c.surfaceAlt, overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${proj.health}%`, height: "100%",
                                borderRadius: layout.radiusTag + 1,
                                background: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red,
                              }} />
                            </div>
                            <span style={{
                              fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                              fontWeight: 800, color: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red,
                            }}>{proj.health}</span>
                            <span style={{
                              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                              fontWeight: 600,
                              color: proj.health >= 70 ? c.green : proj.health >= 40 ? c.orange : c.red,
                              opacity: 0.8,
                            }}>{proj.health >= 70 ? "Good" : proj.health >= 40 ? "Fair" : "Poor"}</span>
                          </div>
                          </div>
                        </td>
                        {/* Age */}
                        {dp.showAge && (
                        <td style={{
                          padding: dp.cellPad, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                        }}>
                          <span style={{
                            fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                            fontWeight: 700,
                            color: proj.age > 60 ? c.red : proj.age > 30 ? c.orange : c.textMid,
                          }}>{proj.age}d</span>
                        </td>
                        )}
                        {/* Blocked */}
                        {dp.showBlocked && (
                        <td style={{
                          padding: dp.cellPad, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                          fontWeight: 800,
                          color: (proj.typeCounts.BLOCKED || 0) > 0 ? c.red : c.textDim,
                          background: (proj.typeCounts.BLOCKED || 0) > 0 ? `${c.red}10` : "transparent",
                        }}>
                          {proj.typeCounts.BLOCKED || "—"}
                        </td>
                        )}
                        {/* Churn (Δ) */}
                        {dp.showChurn && (() => {
                          const d = deltaMap[proj.id];
                          return (
                        <td style={{
                          padding: dp.cellPad, textAlign: "center",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                        }}>
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
                              style={{
                                padding: dp.cellPad, textAlign: "center", verticalAlign: "middle",
                                borderBottom: `1px dotted ${c.border}`,
                                borderLeft: `1px dotted ${c.border}`,
                                background: isDrill ? `${pc[ph]}20` : "transparent",
                                cursor: items.length > 0 ? "pointer" : "default",
                              }}>
                              {items.length > 0 && (
                                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                                  {Object.entries(ct).map(([t, n]) => {
                                    const letter = { BUILD: "B", JAM: "J", COMMIT: "C" }[t] || t[0];
                                    return <Tag key={t} color={tc[t]?.color} bg={tc[t]?.bg}>{n}{letter}</Tag>;
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        {/* Ship column */}
                        <td style={{
                          padding: dp.cellPad, textAlign: "center", verticalAlign: "middle",
                          borderBottom: `1px dotted ${c.border}`,
                          borderLeft: `1px dotted ${c.border}`,
                          background: shipPhases.includes(proj.phase) ? `${pc[proj.phase] || c.green}10` : "transparent",
                        }}>
                          {shipPhases.includes(proj.phase) && (
                            <Badge color={pc[proj.phase] || c.green} bg={`${pc[proj.phase] || c.green}18`}>{proj.phase}</Badge>
                          )}
                        </td>
                      </tr>
                      {/* Cell drilldown */}
                      {drillCell && drillCell.projId === proj.id && (() => {
                        const drillItems = byPhase[drillCell.phase] || [];
                        const colSpan = phaseNames.length + 6 + (dp.showAge ? 1 : 0) + (dp.showBlocked ? 1 : 0) + (dp.showChurn ? 1 : 0);
                        return (
                          <tr>
                            <td colSpan={colSpan} style={{
                              padding: `${space[1]}px ${space[4] - 2}px ${space[2] - 2}px`,
                              background: `${pc[drillCell.phase]}08`,
                              borderBottom: `1px solid ${pc[drillCell.phase]}30`,
                            }}>
                              <div className="flow-expand" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <TelemetryLabel color={pc[drillCell.phase]} style={{ marginBottom: 1 }}>
                                  {drillCell.phase} · {drillItems.length}
                                </TelemetryLabel>
                                {drillItems.map((it, ii) => (
                                  <div key={ii} style={{
                                    display: "flex", alignItems: "center", gap: space[2],
                                    padding: `3px 0`,
                                  }}>
                                    <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", it.person); }} style={{
                                      fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                                      fontWeight: 600, color: c.text, cursor: "pointer",
                                      textDecoration: "underline", textDecorationColor: c.textMid + "40",
                                      textUnderlineOffset: 2, minWidth: 100,
                                    }}>{it.person}</span>
                                    <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                                    <span style={{
                                      fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                                      color: c.textMid,
                                    }}>{it.title || "—"}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                      {/* Full row expand */}
                      {isExp && (() => {
                        const colSpan = phaseNames.length + 6 + (dp.showAge ? 1 : 0) + (dp.showBlocked ? 1 : 0) + (dp.showChurn ? 1 : 0);
                        const keyRisks = proj.risks.filter(r => r.key !== "no_dri" && r.key !== "blocked" && r.key !== "aging");
                        const drillPhase = drillCell && drillCell.projId === proj.id ? drillCell.phase : null;
                        const extraItems = drillPhase
                          ? proj.items.filter(it => (it.stage || proj.phase) !== drillPhase)
                          : proj.items;
                        const hasHiddenItems = drillPhase && extraItems.length < proj.items.length;
                        return (
                        <tr>
                          <td colSpan={colSpan} style={{
                            padding: `${space[1]}px ${space[4] - 2}px ${space[2]}px`,
                            background: c.surfaceAlt,
                            borderBottom: `1px dotted ${c.border}`,
                          }}>
                            {keyRisks.length > 0 && (
                              <div style={{ display: "flex", gap: space[1], flexWrap: "wrap", marginBottom: space[1] }}>
                                {keyRisks.map(r => (
                                  <Badge key={r.key} color={r.color} bg={`${r.color}12`} style={{ border: `1px solid ${r.color}30` }}>{r.icon} {r.label}</Badge>
                                ))}
                              </div>
                            )}
                            <div className="flow-expand" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {extraItems.length > 0 ? extraItems.map((it, ii) => (
                                <div key={ii} style={{
                                  display: "flex", alignItems: "center", gap: space[2],
                                  padding: "3px 0",
                                  borderBottom: ii < extraItems.length - 1 ? `1px dotted ${c.border}` : "none",
                                }}>
                                  <span onClick={(e) => { e.stopPropagation(); if (onNavigate) onNavigate("people", it.person); }} style={{
                                    fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                                    fontWeight: 600, color: c.text, cursor: "pointer",
                                    textDecoration: "underline", textDecorationColor: c.textMid + "40",
                                    textUnderlineOffset: 2, minWidth: 100,
                                  }}>{it.person}</span>
                                  <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                                  <span style={{
                                    fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                                    color: c.textMid, flex: 1,
                                  }}>{it.title || "—"}</span>
                                </div>
                              )) : (
                                <div style={{
                                  padding: `${space[1]}px 0`,
                                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                                  color: c.textDim,
                                }}>
                                  {hasHiddenItems ? `All ${proj.items.length} commits shown in ${drillPhase} drilldown above` : "No commits"}
                                </div>
                              )}
                              {hasHiddenItems && extraItems.length > 0 && (
                                <div style={{
                                  padding: "2px 0 0",
                                  fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                                  color: c.textDim, fontStyle: "italic",
                                }}>
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
        </Surface>
      )}

      {/* ═══════════════════════════════════════════════════════════
          COMMITS TABLE — flat rows, one per commit item (all people, all states)
          ═══════════════════════════════════════════════════════════ */}
      {pulseMode === "people" && (() => {
        // Build flat commit rows — ALL items (locked or not)
        const allCommitRows = [];
        commitments.forEach(cm => {
          const pObj = people.find(p => p.name === cm.person);
          if (!pObj) return;
          if (globalFilters.person.length > 0 && !globalFilters.person.includes(cm.person)) return;
          if (globalFilters.squad.length > 0 && !globalFilters.squad.includes(pObj.squad)) return;
          const isLocked = !!cm.lockedAt;
          const isClosed = !!cm.closedAt;

          const items = cm.items.slice(0, 3).filter(it => it.title && it.title.trim());
          if (items.length === 0) {
            // Person with no commits — show empty row
            if (globalFilters.owner.length === 0) {
              allCommitRows.push({
                person: cm.person, squad: pObj.squad, role: pObj.role,
                project: null, projectName: null, title: null,
                type: null, stage: null, _status: "Empty",
                isDeselected: false, commitIdx: null,
              });
            }
          } else {
            items.forEach((it, idx) => {
              const isDepri = cm.deselected === idx;
              const proj = projects.find(pr => pr.id === it.project);
              if (globalFilters.owner.length > 0 && (!proj || !globalFilters.owner.includes(proj.owner))) return;
              const status = isDepri ? "Deprioritized"
                : isClosed ? (it.outcome === "done" || it.outcome === "done_carry" ? "Completed" : it.outcome === "blocked" ? "Blocked" : it.outcome === "carry" ? "Carry" : "Closed")
                : isLocked ? (it.outcome === "done" || it.outcome === "done_carry" ? "Completed" : it.outcome === "blocked" ? "Blocked" : it.outcome === "carry" ? "Carry" : "WIP")
                : it.project && it.stage && it.type ? "Ready"
                : "Open";
              allCommitRows.push({
                person: cm.person, squad: pObj.squad, role: pObj.role,
                project: it.project || null, projectName: proj?.name || null,
                title: it.title, type: it.type || null,
                stage: it.stage || (proj?.phase || null),
                duration: it.duration || null,
                _status: status, isDeselected: isDepri, commitIdx: idx,
              });
            });
          }
          // Buffer item
          if (cm.deselected >= 0 && cm.buffer && cm.buffer.trim() && cm.bufferProject) {
            const proj = projects.find(pr => pr.id === cm.bufferProject);
            if (globalFilters.owner.length === 0 || (proj && globalFilters.owner.includes(proj.owner))) {
              const bufStatus = isClosed
                ? (cm.bufferOutcome === "done" || cm.bufferOutcome === "done_carry" ? "Completed" : cm.bufferOutcome === "blocked" ? "Blocked" : cm.bufferOutcome === "carry" ? "Carry" : "Closed")
                : isLocked
                ? (cm.bufferOutcome === "done" || cm.bufferOutcome === "done_carry" ? "Completed" : cm.bufferOutcome === "blocked" ? "Blocked" : "Buffer")
                : "Buffer";
              allCommitRows.push({
                person: cm.person, squad: pObj.squad, role: pObj.role,
                project: cm.bufferProject, projectName: proj?.name || null,
                title: cm.buffer, type: cm.bufferType || null,
                stage: cm.bufferStage || (proj?.phase || null),
                _status: bufStatus, isDeselected: false, isBuffer: true, commitIdx: null,
              });
            }
          }
        });
        const outcomeColors = {
          Completed: c.green, WIP: c.cyan, Ready: c.cyan, Carry: c.cyan,
          Open: c.textMid, Buffer: c.purple, Blocked: c.red,
          Deprioritized: c.textDim, Closed: c.textMid, Empty: c.red,
        };

        // Group order — mirrors Commit People table pattern
        const groupOrder = [
          { key: "Completed", label: "Completed", color: c.green },
          { key: "WIP", label: "Work in Progress", color: c.cyan },
          { key: "Ready", label: "Ready", color: c.cyan },
          { key: "Open", label: "Open", color: c.textMid },
          { key: "Buffer", label: "Buffer", color: c.purple },
          { key: "Blocked", label: "Blocked", color: c.red },
          { key: "Carry", label: "Carry", color: c.orange },
          { key: "Closed", label: "Closed", color: c.textMid },
          { key: "Deprioritized", label: "Deprioritized", color: c.textDim },
          { key: "Empty", label: "Empty", color: c.red },
        ];

        // Sort within each group
        const sortGroupRows = (arr) => [...arr].sort((a, b) => {
          let va, vb;
          if (sortCol === "person") { va = a.person; vb = b.person; }
          else if (sortCol === "project") { va = a.project || ""; vb = b.project || ""; }
          else if (sortCol === "type") { va = a.type || ""; vb = b.type || ""; }
          else if (sortCol === "stage") { va = a.stage || ""; vb = b.stage || ""; }
          else if (sortCol === "title") { va = a.title || ""; vb = b.title || ""; }
          else { va = a.squad || ""; vb = b.squad || ""; }
          return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });

        const groupedData = groupOrder.map(g => ({
          ...g,
          rows: sortGroupRows(allCommitRows.filter(r => r._status === g.key)),
        })).filter(g => g.rows.length > 0);

        let globalRowIdx = 0;
        const dotBorder = `1px dotted ${c.border}`;
        const colCount = 7;

        return (
          <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, background: c.surfaceData }}>
            <div style={{ borderRadius: layout.radius }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr>
                    <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: 70 }}>Squad</Th>
                    <Th col="person" style={{ minWidth: 120, borderLeft: dotBorder }}>Person</Th>
                    <Th col="project" style={{ minWidth: 140, borderLeft: dotBorder }}>Project</Th>
                    <Th col="title" style={{ minWidth: 160, borderLeft: dotBorder }}>Commit</Th>
                    <Th col="type" style={{ minWidth: 64, textAlign: "center", borderLeft: dotBorder }}>Type</Th>
                    <Th col="status" style={{ minWidth: 80, textAlign: "center", borderLeft: dotBorder }}>Status</Th>
                    <Th col="duration" style={{ minWidth: 64, textAlign: "center", borderLeft: dotBorder }}>Timeline</Th>
                  </tr>
                </thead>
                <tbody key={rowAnimKey}>
                  {groupedData.length === 0 && (
                    <tr><td colSpan={colCount} style={{ textAlign: "center", padding: `${space[7]}px 0`, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>No commits yet</td></tr>
                  )}
                  {groupedData.map((group) => {
                    const sectionRows = group.rows.map((it) => {
                      const ri = globalRowIdx++;
                      const sClr = outcomeColors[it._status] || c.textDim;
                      const isDepri = it._status === "Deprioritized";
                      const rowBg = it._status === "Completed" ? `${c.green}08`
                        : it._status === "Blocked" ? `${c.red}08`
                        : "transparent";
                      return (
                        <tr key={`${it.person}-${it.project || "none"}-${ri}`} className="flow-row" style={{
                          animation: `rowSlideIn 0.3s ${motion.interaction.easing} both`,
                          animationDelay: `${Math.min(ri * 20, 600)}ms`,
                          opacity: isDepri ? 0.45 : 1,
                          background: rowBg,
                          textDecoration: isDepri ? "line-through" : "none",
                          textDecorationStyle: isDepri ? "dotted" : undefined,
                          textDecorationColor: isDepri ? "#ffffffaa" : undefined,
                          pointerEvents: "auto",
                        }}>
                          {/* Squad */}
                          <td style={{
                            padding: dp.cellPad,
                            fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                            fontWeight: 600, color: c.textMid, borderBottom: dotBorder,
                            position: "sticky", left: 0, background: c.bg, zIndex: 1,
                          }}>{it.squad}</td>
                          {/* Person */}
                          <td style={{ padding: dp.cellPad, borderBottom: dotBorder, borderLeft: dotBorder }}>
                            <EntityLink type="person" onClick={() => onNavigate && onNavigate("people", it.person)} underline style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600 }}>{it.person}</EntityLink>
                          </td>
                          {/* Project */}
                          <td style={{ padding: dp.cellPad, borderBottom: dotBorder, borderLeft: dotBorder }}>
                            {it.project ? (
                              <>
                                <EntityLink type="project" onClick={() => onNavigate && onNavigate("projects", it.project)} style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700 }}>{it.project}</EntityLink>
                                {it.projectName && <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.text, marginLeft: space[1] }}>{it.projectName}</span>}
                              </>
                            ) : (
                              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>{"\u2014"}</span>
                            )}
                          </td>
                          {/* Commit title */}
                          <td style={{ padding: dp.cellPad, borderBottom: dotBorder, borderLeft: dotBorder, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text }}>
                            {it.title ? (
                              <span
                                onClick={() => onNavigate && onNavigate("commit", { person: it.person, commitIdx: it.commitIdx })}
                                style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "30", textUnderlineOffset: 2 }}
                              >{it.title}</span>
                            ) : (
                              <Badge color={c.orange} bg={`${c.orange}12`} style={{ border: `1px solid ${c.orange}20` }}>No commit</Badge>
                            )}
                          </td>
                          {/* Type */}
                          <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: dotBorder, borderLeft: dotBorder }}>
                            {it.type ? (
                              <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{tc[it.type]?.label || it.type}</Badge>
                            ) : (
                              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>{"\u2014"}</span>
                            )}
                          </td>
                          {/* Status */}
                          <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: dotBorder, borderLeft: dotBorder }}>
                            <Badge color={sClr} bg={`${sClr}15`}>{it._status}</Badge>
                          </td>
                          {/* Timeline */}
                          <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: dotBorder, borderLeft: dotBorder }}>
                            {it.duration ? (
                              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: c.textMid }}>{it.duration}w</span>
                            ) : (
                              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>{"\u2014"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    });

                    return [
                      /* Section header row */
                      <tr key={`section-${group.key}`} data-status-group={group.key}>
                        <td colSpan={colCount} style={{
                          padding: `${space[2]}px ${space[2] - 2}px`,
                          background: `${group.color}06`,
                          borderBottom: dotBorder,
                          borderTop: dotBorder,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: group.color, boxShadow: `0 0 6px ${group.color}40`,
                            }} />
                            <span style={{
                              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                              fontWeight: 700, color: group.color, letterSpacing: "0",
                            }}>{group.label}</span>
                            <span style={{
                              fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                              fontWeight: typo.monoMd.weight, color: group.color,
                              opacity: 0.7,
                            }}>{group.rows.length}</span>
                          </div>
                        </td>
                      </tr>,
                      ...sectionRows,
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      </div>
      {/* end morph wrapper */}
      <div style={{ flexShrink: 0, height: space[8] }} />
      </div>{/* end scrollable content */}

      {/* ═══════════════════════════════════════════════════════════
          SIDE PANEL — project telemetry on row click
          ═══════════════════════════════════════════════════════════ */}
      {sidePanelProj && (
        <>
          <div className="flow-side-panel-backdrop" onClick={() => setSidePanelProj(null)} />
          <SidePanel
            proj={sidePanelProj}
            deltaMap={deltaMap}
            tc={tc}
            pc={pc}
            onNavigate={onNavigate}
            onClose={() => setSidePanelProj(null)}
          />
        </>
      )}
    </div>
  );
};


export default PulseView;
