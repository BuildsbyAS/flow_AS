import React, { useMemo } from "react";
import { c, space, layout, mono, body, phaseNames, shipPhases } from "../styles/theme";

const ALL_PHASES = [...phaseNames, ...shipPhases];

const PHASE_COLORS = {
  PRD: "#6D28D9", Design: "#1D4ED8", Dev: "#E8590C", QA: "#0E7490",
  Alpha: "#059669", Beta: "#059669", GA: "#059669",
};

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

export default function ProjectTimeline({ project, phaseTransitions = [], today, phaseDurationDefaults }) {
  if (!project) return null;
  const todayIso = today || new Date().toISOString().split("T")[0];
  const currentIdx = ALL_PHASES.indexOf(project.phase);
  const enteredAt = buildEntered(phaseTransitions);
  const totalDays = daysBetween(project.startDate, project.endDate);
  const elapsedDays = project.startDate ? Math.max(0, daysBetween(project.startDate, todayIso) || 0) : null;
  const pctElapsed = totalDays && totalDays > 0 && elapsedDays != null
    ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : null;
  const dwell = useDwell(enteredAt, currentIdx, todayIso);
  const enteredCurrentAt = enteredAt[project.phase] || project.startDate || null;
  const daysInCurrent = enteredCurrentAt ? Math.max(0, daysBetween(enteredCurrentAt, todayIso) || 0) : null;

  const NODE_SIZE_CURRENT = 24;
  const NODE_SIZE = 18;

  return (
    <div style={{
      padding: `${space[4]}px ${space[5]}px`,
      borderRadius: layout.radiusLg,
      background: c.surface,
      border: `1px solid ${c.border}`,
      boxShadow: c.shadowCard,
      display: "flex", flexDirection: "column", gap: space[3],
    }}>
      {/* Date range + elapsed badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space[2] }}>
        {project.startDate && project.endDate ? (
          <span style={{ fontFamily: body, fontSize: 12, fontWeight: 500, color: c.textDim, fontVariantNumeric: "tabular-nums" }}>
            {fmtShort(project.startDate)} → {fmtShort(project.endDate)}
          </span>
        ) : <span />}
        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
          {elapsedDays != null && (
            <span style={{
              padding: "2px 8px", borderRadius: layout.radiusXs,
              background: c.surfaceAlt,
              fontFamily: mono, fontSize: 11, fontWeight: 700,
              color: c.textMid, fontVariantNumeric: "tabular-nums",
            }}>
              {elapsedDays}d spent
            </span>
          )}
          {pctElapsed != null && (
            <span style={{
              fontFamily: mono, fontSize: 11, fontWeight: 600,
              color: c.textDim, fontVariantNumeric: "tabular-nums",
            }}>
              {pctElapsed}%
            </span>
          )}
        </div>
      </div>

      {/* Horizontal phase track */}
      <div style={{ display: "flex", alignItems: "flex-start", width: "100%", position: "relative" }}>
        {ALL_PHASES.map((ph, idx) => {
          const isPast = currentIdx >= 0 && idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = !isPast && !isCurrent;
          const phaseColor = PHASE_COLORS[ph] || c.textMid;
          const isLast = idx === ALL_PHASES.length - 1;
          const dwellDays = isCurrent ? daysInCurrent : dwell[ph];
          const nodeSize = isCurrent ? NODE_SIZE_CURRENT : NODE_SIZE;

          return (
            <React.Fragment key={ph}>
              {/* Phase column */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, flexShrink: 0, minWidth: 36,
              }}>
                {/* Node */}
                <div style={{
                  width: nodeSize, height: nodeSize,
                  borderRadius: "50%",
                  background: isPast ? c.green : isCurrent ? phaseColor : c.surfaceAlt,
                  border: isFuture ? `2px solid ${c.border}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: isCurrent ? `0 0 0 3px ${phaseColor}20` : "none",
                }}>
                  {isPast && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isCurrent && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                  )}
                </div>
                {/* Phase label */}
                <span style={{
                  fontFamily: mono, fontSize: 10, fontWeight: isCurrent ? 700 : 500,
                  color: isPast ? c.green : isCurrent ? phaseColor : c.textGhost,
                  letterSpacing: "0.02em", whiteSpace: "nowrap",
                }}>{ph}</span>
                {/* Days annotation */}
                {dwellDays != null && (isPast || isCurrent) && (
                  <span style={{
                    fontFamily: mono, fontSize: 9, fontWeight: 600,
                    color: isCurrent ? phaseColor : c.textDim,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1,
                  }}>{dwellDays}d</span>
                )}
              </div>
              {/* Connector — positioned to align with node centers */}
              {!isLast && (() => {
                const nextIsCurrent = idx + 1 === currentIdx;
                const nextNodeSize = nextIsCurrent ? NODE_SIZE_CURRENT : NODE_SIZE;
                const lineTop = Math.max(nodeSize, nextNodeSize) / 2 - 1;
                return (
                  <div style={{
                    flex: 1, height: 2, minWidth: 6,
                    background: isPast
                      ? c.green
                      : isCurrent
                        ? `linear-gradient(to right, ${phaseColor}, ${c.border})`
                        : c.border,
                    marginTop: lineTop,
                    flexShrink: 1,
                  }} />
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
