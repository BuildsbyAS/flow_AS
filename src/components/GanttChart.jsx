// Flow — Gantt Chart Component
// Pure CSS/div-based timeline visualization, no external chart libs
import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { c, typo, space, layout, motion, phaseColors as getPhaseColors, shipPhases, allPhases } from "../styles/theme";
import { isDevSeedMode, devStore } from "../data/devSeed";
import useDevLabel from "../hooks/useDevLabel";

/* ── Helpers ── */
const parseDate = (s) => new Date(s + "T00:00:00");
const mondayOf = (d) => { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const diffDays = (a, b) => Math.round((b - a) / 86400000);
const fmtMonth = (d) => d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const COL_W = 48;
const ROW_H = 48;
const HDR_H = 52;
const TOOLBAR_H = 40;
const LEFT_W = 260;

const phaseColorMap = { PRD: () => c.purple, Design: () => c.blue, Dev: () => c.orange, QA: () => c.cyan, Alpha: () => c.green, Beta: () => c.green, GA: () => c.green };
const priorityColorMap = { P0: () => c.red, P1: () => c.orange, P2: () => c.blue, P3: () => c.textDim };


/* ══════════════════════════════════════════════════════════════════
   GANTT CHART
   ══════════════════════════════════════════════════════════════════ */
export default function GanttChart({ projects, today: todayProp, onProjectClick }) {
  const devRef = useDevLabel("GanttChart", "Interactive timeline visualization for project schedules with zoom and tooltips");
  const today = useMemo(() => parseDate(todayProp || new Date().toISOString().split("T")[0]), [todayProp]);

  const filteredProjects = projects;

  // ── Build phase segments from events ──
  const phaseSegments = useMemo(() => {
    const map = {};
    if (isDevSeedMode()) {
      filteredProjects.forEach(p => {
        if (!p.startDate || !p.endDate) return;
        const events = devStore.listEvents(p.id) || [];
        const phaseChanges = events
          .filter(ev => ev.action === "project_phase_changed" && ev.details?.from && ev.details?.to)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        if (phaseChanges.length === 0) {
          // No transitions — single segment with current phase
          map[p.id] = [{ phase: p.phase, startDate: p.startDate, endDate: p.endDate }];
        } else {
          const segments = [];
          // First segment: from project start to first phase change
          const firstPhase = phaseChanges[0].details.from;
          const firstChangeDate = phaseChanges[0].created_at.split("T")[0];
          segments.push({ phase: firstPhase, startDate: p.startDate, endDate: firstChangeDate });

          // Middle segments
          for (let i = 0; i < phaseChanges.length; i++) {
            const toPhase = phaseChanges[i].details.to;
            const segStart = phaseChanges[i].created_at.split("T")[0];
            const segEnd = i + 1 < phaseChanges.length
              ? phaseChanges[i + 1].created_at.split("T")[0]
              : p.endDate;
            segments.push({ phase: toPhase, startDate: segStart, endDate: segEnd });
          }
          map[p.id] = segments;
        }
      });
    } else {
      // Non-dev mode: single segment per project
      filteredProjects.forEach(p => {
        if (!p.startDate || !p.endDate) return;
        map[p.id] = [{ phase: p.phase, startDate: p.startDate, endDate: p.endDate }];
      });
    }
    return map;
  }, [filteredProjects]);

  // ── Compute time axis ──
  const { weeks, timelineStart, totalWidth } = useMemo(() => {
    let min = new Date("2099-01-01"), max = new Date("2000-01-01");
    filteredProjects.forEach(p => {
      if (!p.startDate || !p.endDate) return;
      const s = parseDate(p.startDate), e = parseDate(p.endDate);
      if (s < min) min = s;
      if (e > max) max = e;
      if (p.actualStartDate) { const as = parseDate(p.actualStartDate); if (as < min) min = as; }
      if (p.actualEndDate) { const ae = parseDate(p.actualEndDate); if (ae > max) max = ae; }
    });
    const start = mondayOf(min);
    const end = addDays(mondayOf(max), 7);
    const wks = [];
    let cursor = new Date(start);
    while (cursor <= end) { wks.push(new Date(cursor)); cursor = addDays(cursor, 7); }
    return { weeks: wks, timelineStart: start, totalWidth: wks.length * COL_W };
  }, [filteredProjects]);

  // ── Sort flat by start date (skip projects missing dates) ──
  const sortedProjects = useMemo(() =>
    [...filteredProjects]
      .filter(p => p.startDate && p.endDate)
      .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate)),
  [filteredProjects]);

  // ── Tooltip ──
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);

  const hideTimer = useRef(null);
  const showTooltip = useCallback((e, p) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ project: p, x: rect.right + 8, y: rect.top });
  }, []);
  const hideTooltip = useCallback(() => {
    hideTimer.current = setTimeout(() => setTooltip(null), 150);
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
  }, []);

  // Position tooltip
  useEffect(() => {
    if (tooltip && tooltipRef.current) {
      const el = tooltipRef.current;
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth - 16) el.style.left = `${tooltip.x - r.width - 16}px`;
      if (r.bottom > window.innerHeight - 16) el.style.top = `${window.innerHeight - r.height - 16}px`;
    }
  }, [tooltip]);

  // ── Sync scroll ──
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const scrolling = useRef(null);

  const onRightScroll = useCallback(() => {
    if (scrolling.current === "left") return;
    scrolling.current = "right";
    if (leftRef.current && rightRef.current) leftRef.current.scrollTop = rightRef.current.scrollTop;
    requestAnimationFrame(() => { scrolling.current = null; });
  }, []);

  const onLeftScroll = useCallback(() => {
    if (scrolling.current === "right") return;
    scrolling.current = "left";
    if (leftRef.current && rightRef.current) rightRef.current.scrollTop = leftRef.current.scrollTop;
    requestAnimationFrame(() => { scrolling.current = null; });
  }, []);

  // ── Auto-scroll to today on mount ──
  useEffect(() => {
    if (rightRef.current) {
      const todayOff = diffDays(timelineStart, today) / 7 * COL_W;
      rightRef.current.scrollLeft = Math.max(0, todayOff - rightRef.current.clientWidth * 0.3);
    }
  }, [timelineStart, today]);

  // ── Build row data (flat list) ──
  const rows = useMemo(() =>
    sortedProjects.map(p => ({ type: "project", project: p })),
  [sortedProjects]);

  // ── Bar position calc ──
  const barPos = useCallback((startDate, endDate) => {
    const s = parseDate(startDate);
    const e = parseDate(endDate);
    const left = diffDays(timelineStart, s) / 7 * COL_W;
    const width = Math.max(COL_W * 0.4, diffDays(s, e) / 7 * COL_W);
    return { left, width };
  }, [timelineStart]);

  // ── Scroll timeline to a project's bar ──
  const [highlightId, setHighlightId] = useState(null);
  const highlightTimer = useRef(null);
  const scrollToProject = useCallback((p) => {
    if (!rightRef.current || !p.startDate) return;
    const { left } = barPos(p.startDate, p.endDate);
    rightRef.current.scrollTo({ left: Math.max(0, left - rightRef.current.clientWidth * 0.15), behavior: "smooth" });
    setHighlightId(p.id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1500);
  }, [barPos]);

  const todayOffset = diffDays(timelineStart, today) / 7 * COL_W;

  // ── Month spans for header ──
  const monthSpans = useMemo(() => {
    const spans = [];
    let i = 0;
    while (i < weeks.length) {
      const m = weeks[i].getMonth(), y = weeks[i].getFullYear();
      let count = 0;
      while (i + count < weeks.length && weeks[i + count].getMonth() === m && weeks[i + count].getFullYear() === y) count++;
      spans.push({ label: fmtMonth(weeks[i]), width: count * COL_W });
      i += count;
    }
    return spans;
  }, [weeks]);

  const pc = getPhaseColors();

  // Phase legend items
  const legendPhases = [
    { label: "PRD", color: c.purple },
    { label: "Design", color: c.blue },
    { label: "Dev", color: c.orange },
    { label: "QA", color: c.cyan },
    { label: "Alpha", color: c.green },
    { label: "Beta", color: c.green },
    { label: "GA", color: c.green },
  ];

  return (
    <div ref={devRef} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", borderRadius: layout.radius, border: `1px solid ${c.border}` }}>

      {/* ── LEGEND ── */}
      <div style={{
        height: TOOLBAR_H, flexShrink: 0, display: "flex", alignItems: "center",
        padding: `0 ${space[4]}px`,
        borderBottom: `1px solid ${c.border}`, background: c.bg, gap: space[4],
      }}>
        {legendPhases.map(lp => (
          <div key={lp.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: lp.color, opacity: 0.75, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: c.textMid, fontFamily: typo.bodySm.font }}>{lp.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: space[2] }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0,
            background: `repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(110,120,148,0.3) 2px, rgba(110,120,148,0.3) 4px)` }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: c.textMid, fontFamily: typo.bodySm.font }}>Deprioritized</span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
      {/* ── LEFT PANEL (frozen) ── */}
      <div ref={leftRef} onScroll={onLeftScroll} style={{
        width: LEFT_W, flexShrink: 0, background: c.bg,
        borderRight: `1px solid ${c.border}`,
        overflowY: "auto", overflowX: "hidden",
        boxShadow: `4px 0 16px ${c.shadow}`,
        scrollbarWidth: "thin", scrollbarColor: `${c.border} transparent`,
      }}>
        {/* Header — Project Timeline + count */}
        <div style={{ height: HDR_H, position: "sticky", top: 0, background: c.bg, zIndex: 3,
          borderBottom: `1px solid ${c.border}`,
          display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${space[4]}px`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text, letterSpacing: "-0.2px", lineHeight: 1.3 }}>Project Timeline</div>
          <div style={{ fontSize: 11, color: c.textDim, fontWeight: 500, lineHeight: 1.3 }}>
            {sortedProjects.length} project{sortedProjects.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => {
          const p = row.project;
          return (
            <div key={p.id + "-left"} onClick={() => scrollToProject(p)}
              style={{
                height: ROW_H, display: "flex", alignItems: "center", padding: `0 ${space[4]}px`,
                gap: space[2], cursor: "pointer", borderBottom: `1px solid rgba(0,0,0,0.04)`,
                transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
                background: highlightId === p.id ? "rgba(0,0,0,0.04)" : "transparent",
              }}
              onMouseEnter={(e) => { if (highlightId !== p.id) e.currentTarget.style.background = `rgba(0,0,0,0.03)`; }}
              onMouseLeave={(e) => { if (highlightId !== p.id) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.orange, letterSpacing: "0.3px",
                fontFamily: typo.monoSm.font, flexShrink: 0, minWidth: 32 }}>{p.id}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: c.text,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: c.textDim,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{p.squad}</div>
              </div>
              {p.priority && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                background: p.priority === "P0" ? c.redDim : p.priority === "P1" ? c.orangeDim : p.priority === "P3" ? "rgba(0,0,0,0.05)" : `${c.blue}15`,
                color: p.priority === "P0" ? c.red : p.priority === "P1" ? c.orange : p.priority === "P3" ? c.textDim : c.blue,
                fontFamily: typo.monoSm.font, letterSpacing: "0.3px", flexShrink: 0 }}>{p.priority}</span>}
            </div>
          );
        })}
      </div>

      {/* ── RIGHT PANEL (scrollable timeline) ── */}
      <div ref={rightRef} onScroll={onRightScroll} style={{
        flex: 1, overflow: "auto", background: c.surfaceData, position: "relative",
        scrollbarWidth: "thin", scrollbarColor: `${c.border} transparent`,
      }}>
        {/* Header */}
        <div style={{ position: "sticky", top: 0, zIndex: 4, background: c.bg,
          borderBottom: `1px solid ${c.border}`, height: HDR_H, width: totalWidth, minWidth: "100%" }}>
          {/* Month row */}
          <div style={{ display: "flex", height: 26 }}>
            {monthSpans.map((ms, i) => (
              <div key={i} style={{ width: ms.width, flexShrink: 0, fontSize: 12, fontWeight: 700,
                color: c.textMid, padding: "5px 0 0 0", textAlign: "center",
                borderLeft: `1px solid rgba(0,0,0,0.06)`, letterSpacing: "0.2px",
                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ms.label}</div>
            ))}
          </div>
          {/* Week row */}
          <div style={{ display: "flex", height: 26 }}>
            {weeks.map((w, i) => {
              const isMonthStart = i === 0 || w.getMonth() !== weeks[i - 1].getMonth();
              return (
                <div key={i} style={{ width: COL_W, flexShrink: 0, fontSize: 11, color: c.textDim,
                  textAlign: "center", padding: "3px 0",
                  borderLeft: `1px solid ${isMonthStart ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.03)"}` }}>
                  {fmtShort(w)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ position: "relative", width: totalWidth, minWidth: "100%" }}>
          {/* Grid lines */}
          {weeks.map((w, i) => {
            const isMonthStart = i === 0 || w.getMonth() !== weeks[i - 1].getMonth();
            return (
              <div key={`g-${i}`} style={{ position: "absolute", top: 0, bottom: 0,
                left: i * COL_W, width: 1, pointerEvents: "none", zIndex: 0,
                background: isMonthStart ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.02)" }} />
            );
          })}

          {/* Today line */}
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: todayOffset, width: 2, zIndex: 3,
            background: c.accent, opacity: 0.5, pointerEvents: "none",
          }}>
            <span style={{ position: "absolute", top: 4, left: 6, fontSize: 11, fontWeight: 700,
              letterSpacing: "0.8px", color: c.accent, whiteSpace: "nowrap" }}>TODAY</span>
          </div>

          {/* Rows */}
          {rows.map((row, i) => {
            const p = row.project;
            const { left, width } = barPos(p.startDate, p.endDate);
            const isDepri = p.status === "deprioritized";
            const segments = phaseSegments[p.id] || [{ phase: p.phase, startDate: p.startDate, endDate: p.endDate }];

            return (
              <div key={p.id + "-bar"} style={{ height: ROW_H, position: "relative",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                background: highlightId === p.id ? "rgba(0,0,0,0.04)" : "transparent",
                transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
              }}>

                {/* Main bar — multi-phase segments */}
                <div
                  className="flow-gantt-bar"
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onProjectClick?.(p.id); } }}
                  onClick={() => onProjectClick?.(p.id)}
                  onMouseEnter={(e) => { showTooltip(e, p); const el = e.currentTarget; el.style.willChange = "transform, filter"; el.style.filter = "brightness(1.08)"; el.style.boxShadow = "0 4px 10px rgba(0,0,0,0.12)"; el.style.zIndex = 5; }}
                  onMouseLeave={(e) => { hideTooltip(); const el = e.currentTarget; el.style.transform = "scale(1)"; el.style.filter = "none"; el.style.boxShadow = "none"; el.style.zIndex = 1; setTimeout(() => { if (el) el.style.willChange = "auto"; }, 160); }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  style={{
                    position: "absolute", top: 12, height: 24, left, width,
                    borderRadius: 5, cursor: "pointer", overflow: "hidden",
                    display: "flex", alignItems: "center",
                    transformOrigin: "center",
                    transition: `transform ${motion.fast.duration} ${motion.fast.easing}, filter ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}`,
                  }}
                >
                  {isDepri ? (
                    /* Deprioritized — diagonal stripes */
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: 5,
                      background: `repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(110,120,148,0.25) 3px, rgba(110,120,148,0.25) 6px)`,
                      border: `1px solid rgba(110,120,148,0.2)`,
                    }} />
                  ) : (
                    /* Phase color mode — multi-segment bar */
                    segments.map((seg, si) => {
                      const segStart = parseDate(seg.startDate);
                      const segEnd = parseDate(seg.endDate);
                      const projStart = parseDate(p.startDate);
                      const projEnd = parseDate(p.endDate);
                      const totalDays = Math.max(1, diffDays(projStart, projEnd));
                      const segLeftPct = Math.max(0, diffDays(projStart, segStart) / totalDays * 100);
                      const segWidthPct = Math.max(1, diffDays(segStart, segEnd) / totalDays * 100);
                      const segColor = phaseColorMap[seg.phase]?.() || c.textDim;
                      const isFirst = si === 0;
                      const isLast = si === segments.length - 1;
                      return (
                        <div key={si} style={{
                          position: "absolute", top: 0, bottom: 0,
                          left: `${segLeftPct}%`,
                          width: `${Math.min(segWidthPct, 100 - segLeftPct)}%`,
                          background: segColor,
                          opacity: 0.75,
                          borderRadius: isFirst && isLast ? 5
                            : isFirst ? "5px 0 0 5px"
                            : isLast ? "0 5px 5px 0" : 0,
                        }} />
                      );
                    })
                  )}
                </div>

                {/* Shipped rocket marker — positioned at the end of the bar */}
                {(p.phase === "GA" || p.status === "complete") && (
                  <div style={{
                    position: "absolute", top: 10, left: left + width + 4,
                    fontSize: 14, lineHeight: 1, pointerEvents: "none", zIndex: 2,
                  }}>🚀</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </div>{/* close left+right flex wrapper */}

      {/* ── Tooltip ── */}
      {tooltip && (() => {
        const p = tooltip.project;
        const color = phaseColorMap[p.phase]?.() || c.textDim;
        const start = parseDate(p.startDate);
        const end = parseDate(p.endDate);
        const duration = diffDays(start, end);
        const elapsed = Math.max(0, Math.min(diffDays(start, today), duration));
        const pct = duration > 0 ? Math.round((elapsed / duration) * 100) : 0;

        const healthScore = pct >= 100 ? (p.status === "deprioritized" ? 0 : 40) : pct > 85 ? 60 : 90;
        const healthColor = healthScore >= 80 ? c.green : healthScore >= 50 ? c.orange : c.red;
        const healthLabel = healthScore >= 80 ? "On Track" : healthScore >= 50 ? "At Risk" : "Critical";

        return (
          <div ref={tooltipRef} style={{
            position: "fixed", left: tooltip.x, top: tooltip.y, zIndex: 100,
            background: c.surfaceHero, border: `1px solid ${c.border}`, borderRadius: 10,
            padding: "14px 18px", minWidth: 200, boxShadow: `0 12px 40px ${c.shadow}`,
            cursor: "pointer", pointerEvents: "auto",
          }}
          onClick={() => { setTooltip(null); if (onProjectClick) onProjectClick(p.id); }}
          onMouseEnter={cancelHide}
          onMouseLeave={hideTooltip}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text, flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: layout.radiusXs,
                background: `${color}22`, color }}>{p.phase}</span>
            </div>
            {p.isBlocked && (
              <div style={{ fontSize: 11, fontWeight: 700, color: c.red, background: c.redDim,
                padding: "3px 8px", borderRadius: layout.radiusXs, marginBottom: 6, textAlign: "center" }}>BLOCKED</div>
            )}
            {[
              ["Priority", p.priority || "P2"],
              ["Owner", p.owner || "—"],
              ["Squad", p.squad || "—"],
              ["Health", healthLabel],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: c.textDim }}>{label}</span>
                <span style={{ color: label === "Health" ? healthColor : c.text, fontWeight: 500 }}>{val}</span>
              </div>
            ))}
            <div style={{
              marginTop: 8, paddingTop: 8, borderTop: `1px solid ${c.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              fontSize: 11, color: c.accent, fontWeight: 600,
            }}>
              View project →
            </div>
          </div>
        );
      })()}
    </div>
  );
}
