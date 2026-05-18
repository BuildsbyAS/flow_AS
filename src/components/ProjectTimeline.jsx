// ═══════════════════════════════════════════════════════════════════
// ProjectTimeline — phase ladder + plan summary.
//
// Hairline track threading through seven phase nodes. Past phases sit
// on a solid track in muted gray; future phases continue on a dashed
// track. The current phase is the only accent dot on the line. Below
// each node sits a one-liner: "Xd in · May 5" for current, "Xd · May
// 5" for past, blank for upcoming.
//
// Designed to whisper, not shout — the deep-dive's accent budget is
// reserved for the Activity Rail and the Edit FAB.
// ═══════════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { c, space, layout, mono, body, phaseNames, shipPhases } from "../styles/theme";

const ALL_PHASES = [...phaseNames, ...shipPhases];

function fmtShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function daysBetween(aIso, bIso) {
  if (!aIso || !bIso) return null;
  const a = new Date(aIso + "T00:00:00");
  const b = new Date(bIso + "T00:00:00");
  return Math.round((b - a) / 86_400_000);
}

function buildEntered(phaseTransitions) {
  const m = {};
  (phaseTransitions || []).forEach(t => {
    if (!m[t.phase]) m[t.phase] = (t.at?.slice ? t.at.slice(0, 10) : t.at);
  });
  return m;
}

function useDwell(enteredAt, currentIdx, todayIso) {
  return useMemo(() => {
    const out = {};
    for (let i = 0; i < ALL_PHASES.length; i++) {
      const ph = ALL_PHASES[i];
      const from = enteredAt[ph];
      if (!from) continue;
      const isCurrentP = i === currentIdx;
      const nextEntered = (() => {
        for (let j = i + 1; j < ALL_PHASES.length; j++) {
          if (enteredAt[ALL_PHASES[j]]) return enteredAt[ALL_PHASES[j]];
        }
        return null;
      })();
      const to = isCurrentP ? todayIso : nextEntered;
      if (!to) continue;
      const d = daysBetween(from, to);
      if (d != null && d >= 0) out[ph] = d;
    }
    return out;
  }, [enteredAt, currentIdx, todayIso]);
}

export default function ProjectTimeline({ project, phaseTransitions = [], today }) {
  if (!project) return null;
  const todayIso = today || new Date().toISOString().split("T")[0];
  const currentIdx = ALL_PHASES.indexOf(project.phase);
  const enteredAt = buildEntered(phaseTransitions);
  const totalDays    = daysBetween(project.startDate, project.endDate);
  const elapsedDays  = project.startDate ? Math.max(0, daysBetween(project.startDate, todayIso) || 0) : null;
  const remainingDays = project.endDate ? daysBetween(todayIso, project.endDate) : null;
  const pctElapsed = totalDays && totalDays > 0 && elapsedDays != null
    ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : null;
  const overdue = remainingDays != null && remainingDays < 0;
  const enteredCurrentAt = enteredAt[project.phase] || project.startDate || null;
  const daysInCurrent = enteredCurrentAt ? Math.max(0, daysBetween(enteredCurrentAt, todayIso) || 0) : null;

  const dwell = useDwell(enteredAt, currentIdx, todayIso);

  const N = ALL_PHASES.length;
  const colCenterPct = (idx) => ((idx + 0.5) / N) * 100;
  const solidEndPct = currentIdx >= 0 ? colCenterPct(currentIdx) : colCenterPct(0);
  const lineLeftPct = colCenterPct(0);
  const lineRightPct = 100 - colCenterPct(N - 1);

  return (
    <div style={{
      padding: `${space[5]}px ${space[6]}px`,
      borderRadius: layout.radiusLg,
      background: c.surface,
      border: `1px solid ${c.border}`,
      boxShadow: c.shadowCard,
      display: "flex", flexDirection: "column", gap: space[4],
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", gap: space[3], flexWrap: "wrap" }}>
        <span style={{
          fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
          color: c.textDim, textTransform: "uppercase",
        }}>Timeline</span>
        <span style={{ flex: 1 }} />
        {project.startDate && project.endDate && (
          <>
            <span style={{
              fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text,
              fontVariantNumeric: "tabular-nums",
            }}>
              {fmtShort(project.startDate)} → {fmtShort(project.endDate)}
            </span>
            {remainingDays != null && (
              <span style={{
                fontFamily: body, fontSize: 13, fontWeight: 500,
                color: overdue ? c.red : c.textMid,
                fontVariantNumeric: "tabular-nums",
              }}>
                · {overdue ? `${Math.abs(remainingDays)}d overdue` : `${remainingDays}d to go`}
              </span>
            )}
          </>
        )}
      </div>

      {/* Hairline track + nodes */}
      <div style={{ position: "relative", paddingTop: 2, paddingBottom: 2 }}>
        <div aria-hidden="true" style={{
          position: "absolute",
          left: `${lineLeftPct}%`, right: `${lineRightPct}%`,
          top: 8, height: 0, pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", left: 0, right: 0, top: -0.5,
            borderTop: `1px dashed ${c.border}`,
          }} />
          {currentIdx >= 0 && (
            <div style={{
              position: "absolute", left: 0,
              width: `calc(${((solidEndPct - lineLeftPct) / (100 - lineLeftPct - lineRightPct)) * 100}%)`,
              top: -0.5, height: 1, background: c.textMid,
            }} />
          )}
        </div>

        <div style={{
          position: "relative", zIndex: 1,
          display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`,
        }}>
          {ALL_PHASES.map((ph, idx) => {
            const isPast = currentIdx >= 0 && idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const entered = enteredAt[ph];
            const dwellDays = dwell[ph];

            let nodeBg, nodeBorder, nodeSize;
            if (isCurrent) {
              nodeBg = c.accent;
              nodeBorder = `2px solid ${c.surface}`;
              nodeSize = 10;
            } else if (isPast) {
              nodeBg = c.textMid;
              nodeBorder = `2px solid ${c.surface}`;
              nodeSize = 7;
            } else {
              nodeBg = c.surface;
              nodeBorder = `1px solid ${c.border}`;
              nodeSize = 7;
            }

            const subline = isCurrent
              ? `${Math.round(daysInCurrent || 0)}d in${entered ? ` · ${fmtShort(entered)}` : ""}`
              : dwellDays != null
                ? `${dwellDays}d${entered ? ` · ${fmtShort(entered)}` : ""}`
                : isPast ? "—" : "";

            return (
              <div key={ph} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              }}>
                <div style={{ height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span
                    aria-hidden="true"
                    title={entered ? `Entered ${ph} on ${fmtShort(entered)}` : undefined}
                    style={{
                      width: nodeSize, height: nodeSize, borderRadius: "50%",
                      background: nodeBg, border: nodeBorder, boxSizing: "border-box",
                      cursor: entered ? "help" : "default",
                    }}
                  />
                </div>

                <div style={{
                  fontFamily: mono, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  color: isCurrent ? c.accent : isPast ? c.textMid : c.textGhost,
                }}>{ph}</div>

                <div style={{
                  fontFamily: body, fontSize: 10, fontWeight: 500,
                  color: c.textDim, fontVariantNumeric: "tabular-nums",
                  textAlign: "center", minHeight: 12,
                }}>{subline}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan summary */}
      {pctElapsed != null && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: `${space[2]}px ${space[3]}px`,
          background: c.surfaceAlt, borderRadius: layout.radiusSm,
          border: `1px solid ${c.border}`,
          fontFamily: body, fontSize: 11, color: c.textDim, fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}>
          <span>
            <span style={{ color: overdue ? c.red : c.text, fontWeight: 700 }}>{pctElapsed}%</span> of plan elapsed
          </span>
          {elapsedDays != null && totalDays != null && (
            <span>{elapsedDays} / {totalDays} days</span>
          )}
        </div>
      )}
    </div>
  );
}
