// Flow — Gantt Chart Component
// Pure CSS/div-based timeline visualization, no external chart libs
import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { c, typo, space, layout, motion, phaseColors as getPhaseColors, shipPhases } from "../styles/theme";
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
const LEFT_W = 280;

const phaseColorMap = { PRD: () => c.purple, Design: () => c.accent, Dev: () => c.orange, QA: () => c.cyan, Alpha: () => c.green, Beta: () => c.green, GA: () => c.green };

/* ══════════════════════════════════════════════════════════════════
   GANTT CHART
   ══════════════════════════════════════════════════════════════════ */
export default function GanttChart({ projects, weekConfig, onProjectClick }) {
  const devRef = useDevLabel("GanttChart", "Interactive timeline visualization for project schedules with zoom and tooltips");
  const today = useMemo(() => parseDate(weekConfig?.today || new Date().toISOString().split("T")[0]), [weekConfig]);

  // ── Compute time axis ──
  const { weeks, timelineStart, totalWidth } = useMemo(() => {
    let min = new Date("2099-01-01"), max = new Date("2000-01-01");
    projects.forEach(p => {
      if (!p.startDate || !p.endDate) return;
      const s = parseDate(p.startDate), e = parseDate(p.endDate);
      if (s < min) min = s;
      if (e > max) max = e;
      if (p.actualStartDate) { const as = parseDate(p.actualStartDate); if (as < min) min = as; }
      if (p.actualEndDate) { const ae = parseDate(p.actualEndDate); if (ae > max) max = ae; }
    });
    // Start at Monday of the week containing the earliest project date
    const start = mondayOf(min);
    // End at Monday of the week containing the latest project date, plus one week for padding
    const end = addDays(mondayOf(max), 7);
    const wks = [];
    let cursor = new Date(start);
    while (cursor <= end) { wks.push(new Date(cursor)); cursor = addDays(cursor, 7); }
    return { weeks: wks, timelineStart: start, totalWidth: wks.length * COL_W };
  }, [projects]);

  // ── Sort flat by start date (skip projects missing dates) ──
  const sortedProjects = useMemo(() =>
    [...projects]
      .filter(p => p.startDate && p.endDate)
      .sort((a, b) => parseDate(a.startDate) - parseDate(b.startDate)),
  [projects]);

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
    // Flash highlight
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

  return (
    <div ref={devRef} style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", borderRadius: layout.radius, border: `1px solid ${c.border}` }}>

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
          const color = phaseColorMap[p.phase]?.() || c.textDim;
          return (
            <div key={p.id + "-left"} onClick={() => scrollToProject(p)}
              style={{
                height: ROW_H, display: "flex", alignItems: "center", padding: `0 ${space[4]}px`,
                gap: space[3], cursor: "pointer", borderBottom: `1px solid rgba(0,0,0,0.04)`,
                transition: "background 0.4s ease",
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
              {shipPhases.includes(p.phase) && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 5px", borderRadius: 3,
                background: `${pc[p.phase] || c.green}20`, color: pc[p.phase] || c.green, letterSpacing: "0.5px", flexShrink: 0 }}>{p.phase}</span>}
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
            const color = phaseColorMap[p.phase]?.() || c.textDim;
            const { left, width } = barPos(p.startDate, p.endDate);

            // Progress
            const start = parseDate(p.startDate);
            const end = parseDate(p.endDate);
            const allocated = diffDays(start, end);
            const elapsed = Math.max(0, Math.min(diffDays(start, today), allocated));
            const pct = allocated > 0 ? Math.round((elapsed / allocated) * 100) : 0;

            const isComplete = p.status === "complete";
            const isDepri = p.status === "deprioritized";

            return (
              <div key={p.id + "-bar"} style={{ height: ROW_H, position: "relative",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                background: highlightId === p.id ? "rgba(0,0,0,0.04)" : "transparent",
                transition: "background 0.4s ease",
              }}>

                {/* Main bar */}
                <div
                  onClick={() => onProjectClick?.(p.id)}
                  onMouseEnter={(e) => showTooltip(e, p)}
                  onMouseLeave={hideTooltip}
                  style={{
                    position: "absolute", top: 12, height: 24, left, width,
                    borderRadius: 5, cursor: "pointer", overflow: "hidden",
                    display: "flex", alignItems: "center",
                    transition: `transform ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}`,
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = "scaleY(1.15)"; e.currentTarget.style.zIndex = 5; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = "scaleY(1)"; e.currentTarget.style.zIndex = 1; }}
                >
                  {/* Track */}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 5,
                    background: isDepri
                      ? `repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(110,120,148,0.25) 3px, rgba(110,120,148,0.25) 6px)`
                      : color,
                    opacity: isComplete ? 0.1 : 0.18,
                    border: isComplete ? `1px dashed rgba(0,0,0,0.12)` : "none",
                  }} />

                  {/* Fill (progress for active, full for complete) */}
                  {!isDepri && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, bottom: 0,
                      width: isComplete ? "100%" : `${pct}%`,
                      borderRadius: 5,
                      background: isComplete ? c.green : color,
                      opacity: isComplete ? 0.4 : 0.7,
                      transition: "width 0.4s ease",
                    }} />
                  )}

                  {/* Label */}
                  {width > 80 && (
                    <span style={{
                      position: "relative", zIndex: 1, fontSize: 11, fontWeight: 600,
                      padding: "0 8px", whiteSpace: "nowrap",
                      color: (pct < 40 || isComplete || isDepri) ? c.text : c.bg,
                      textShadow: (pct >= 40 && !isComplete && !isDepri) ? "0 0 4px rgba(0,0,0,0.3)" : "none",
                      pointerEvents: "none",
                    }}>{p.name}</span>
                  )}

                  {/* Completed tick */}
                  {isComplete && (
                    <div style={{
                      position: "absolute", right: 6, top: 0, bottom: 0,
                      display: "flex", alignItems: "center", zIndex: 2, pointerEvents: "none",
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: "50%",
                        background: c.green, display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: `0 0 6px ${c.green}40`,
                      }}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke={c.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2,6 5,9 10,3" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actual overlay for completed projects — late indicator only */}
                {isComplete && p.actualStartDate && p.actualEndDate && (() => {
                  const ap = barPos(p.actualStartDate, p.actualEndDate);
                  const late = parseDate(p.actualEndDate) > end;
                  if (!late) return null;
                  return (
                    <div style={{
                      position: "absolute", top: 12, height: 24,
                      left: ap.left, width: ap.width, borderRadius: 5, overflow: "hidden",
                      pointerEvents: "none",
                    }}>
                      <div style={{
                        position: "absolute", inset: 0, borderRadius: 5,
                        background: c.orange, opacity: 0.45,
                      }} />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

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
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                background: `${color}22`, color }}>{p.phase}</span>
            </div>
            {[
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
