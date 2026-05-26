import React, { useMemo } from "react";
import { c, typo, space, layout, trackNames, phaseColors as getPhaseColors, phaseDims as getPhaseDims } from "../styles/theme";
import { getTrackStatus, getTrackActiveDays } from "../lib/tracks";

const DAY_MS = 86_400_000;

function toDay(iso) {
  if (!iso) return null;
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).getTime();
}

export default function TrackGantt({ proj, onStartTrack, onCompleteTrack, onReopenTrack }) {
  const pc = useMemo(() => getPhaseColors(), []);

  const { timeStart, timeEnd, todayPos, endDatePos } = useMemo(() => {
    const now = Date.now();
    let earliest = now;
    let latest = now + 14 * DAY_MS;

    for (const name of trackNames) {
      const t = proj.tracks?.[name];
      if (!t) continue;
      for (const p of t.periods) {
        const s = toDay(p.started_at);
        if (s && s < earliest) earliest = s;
        const e = p.completed_at ? toDay(p.completed_at) : now;
        if (e > latest) latest = e;
      }
    }

    if (proj.startDate) {
      const s = toDay(proj.startDate);
      if (s && s < earliest) earliest = s;
    }
    if (proj.endDate) {
      const e = toDay(proj.endDate);
      if (e > latest) latest = e + 7 * DAY_MS;
    }

    earliest -= 3 * DAY_MS;
    latest += 7 * DAY_MS;
    const range = latest - earliest;
    const todayP = ((now - earliest) / range) * 100;
    const endP = proj.endDate ? ((toDay(proj.endDate) - earliest) / range) * 100 : null;

    return { timeStart: earliest, timeEnd: latest, todayPos: todayP, endDatePos: endP };
  }, [proj]);

  const timeRange = timeEnd - timeStart;

  function barStyle(started, completed) {
    const s = toDay(started);
    const e = completed ? toDay(completed) : Date.now();
    const left = ((s - timeStart) / timeRange) * 100;
    const width = Math.max(((e - s) / timeRange) * 100, 0.5);
    return { left: `${left}%`, width: `${width}%` };
  }

  const ROW_H = 36;
  const LABEL_W = 110;
  const DAYS_W = 44;
  const ACTION_W = 64;

  const { months, weeks } = useMemo(() => {
    const ms = [];
    const ws = [];
    const range = timeEnd - timeStart;

    const d = new Date(timeStart);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);

    const cur = new Date(d);
    while (cur.getTime() < timeEnd) {
      const startPos = Math.max(((cur.getTime() - timeStart) / range) * 100, 0);
      const year = cur.getUTCFullYear();
      const month = cur.getUTCMonth();
      const nextMonth = new Date(Date.UTC(year, month + 1, 1));
      const endPos = Math.min(((nextMonth.getTime() - timeStart) / range) * 100, 100);
      const label = cur.toLocaleString("en", { month: "short", timeZone: "UTC" });

      if (endPos > 0 && startPos < 100) {
        ms.push({ startPos, endPos, label });
      }

      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let w = 0; w < daysInMonth; w += 7) {
        const weekStart = new Date(Date.UTC(year, month, w + 1));
        const weekEnd = new Date(Math.min(Date.UTC(year, month, w + 8), nextMonth.getTime()));
        const wStartPos = Math.max(((weekStart.getTime() - timeStart) / range) * 100, 0);
        const wEndPos = Math.min(((weekEnd.getTime() - timeStart) / range) * 100, 100);
        if (wEndPos > 0 && wStartPos < 100) {
          const weekNum = Math.floor(w / 7) + 1;
          ws.push({ startPos: wStartPos, endPos: wEndPos, label: `W${weekNum}`, isFirstOfMonth: w === 0 });
        }
      }
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return { months: ms, weeks: ws };
  }, [timeStart, timeEnd]);

  const btnBase = {
    padding: "2px 8px", borderRadius: 4,
    fontFamily: typo.bodySm.font, fontSize: 10, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1.4,
  };

  return (
    <div style={{
      background: c.surface, borderRadius: layout.radiusSm,
      border: `1px solid ${c.border}`, overflow: "hidden",
    }}>
      <div style={{
        padding: `${space[3]}px ${space[4]}px`,
        borderBottom: `1px solid ${c.border}`,
        fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase", color: c.textDim,
      }}>Track Timeline</div>

      {/* Date scale header — two rows: months then weeks */}
      <div style={{ borderBottom: `1px solid ${c.border}` }}>
        {/* Month row */}
        <div style={{ display: "flex", height: 20 }}>
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          <div style={{ flex: 1, position: "relative", display: "flex" }}>
            {months.map((m, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${m.startPos}%`, width: `${m.endPos - m.startPos}%`,
                top: 0, bottom: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 700,
                color: c.textMid, letterSpacing: "0.06em", textTransform: "uppercase",
                borderLeft: i > 0 ? `1px solid ${c.border}` : "none",
                pointerEvents: "none",
              }}>{m.label}</div>
            ))}
          </div>
          <div style={{ width: DAYS_W + ACTION_W, flexShrink: 0 }} />
        </div>
        {/* Week row */}
        <div style={{ display: "flex", height: 18 }}>
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          <div style={{ flex: 1, position: "relative", display: "flex" }}>
            {weeks.map((w, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${w.startPos}%`, width: `${w.endPos - w.startPos}%`,
                top: 0, bottom: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: typo.monoSm.font, fontSize: 9, fontWeight: 500,
                color: c.textDim, letterSpacing: "0.03em", textTransform: "uppercase",
                borderLeft: w.isFirstOfMonth ? `1px solid ${c.border}` : `1px solid ${c.border}30`,
                pointerEvents: "none",
              }}>{w.label}</div>
            ))}
          </div>
          <div style={{ width: DAYS_W + ACTION_W, flexShrink: 0 }} />
        </div>
      </div>

      <div style={{ position: "relative" }}>
        {trackNames.map((name, i) => {
          const tStatus = getTrackStatus(proj, name);
          const days = getTrackActiveDays(proj, name);
          const trackData = proj.tracks?.[name];
          const color = pc[name] || c.textDim;

          return (
            <div
              key={name}
              style={{
                display: "flex", alignItems: "center",
                height: ROW_H, borderBottom: i < trackNames.length - 1 ? `1px solid ${c.border}20` : "none",
              }}
            >
              {/* Track label */}
              <div style={{
                width: LABEL_W, flexShrink: 0,
                padding: `0 ${space[3]}px`,
                fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
                color: tStatus === "not_started" ? c.textDim : color,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: tStatus === "not_started" ? c.border : tStatus === "active" ? color : `${color}60`,
                  flexShrink: 0,
                }} />
                {name}
              </div>

              {/* Timeline area */}
              <div style={{ flex: 1, position: "relative", height: "100%", overflow: "hidden" }}>
                {/* Month boundary lines */}
                {months.slice(1).map((m, mi) => (
                  <div key={`mb${mi}`} style={{
                    position: "absolute", left: `${m.startPos}%`, top: 0, bottom: 0,
                    width: 0, borderLeft: `1px solid ${c.border}40`, zIndex: 0,
                  }} />
                ))}
                {/* Today line */}
                {todayPos > 0 && todayPos < 100 && (
                  <div style={{
                    position: "absolute", left: `${todayPos}%`, top: 0, bottom: 0,
                    width: 1, background: `${c.accent}40`,
                    borderLeft: `1px dashed ${c.accent}60`, zIndex: 1,
                  }} />
                )}

                {/* Tentative end date line */}
                {endDatePos != null && endDatePos > 0 && endDatePos < 100 && (
                  <div style={{
                    position: "absolute", left: `${endDatePos}%`, top: 0, bottom: 0,
                    width: 1, borderLeft: `2px dotted ${c.textDim}30`, zIndex: 1,
                  }} />
                )}

                {/* Track bars */}
                {trackData?.periods?.map((period, pi) => {
                  const pos = barStyle(period.started_at, period.completed_at);
                  const isDone = !!period.completed_at;

                  return (
                    <div
                      key={pi}
                      style={{
                        position: "absolute", top: 8, height: ROW_H - 16,
                        ...pos,
                        background: isDone ? `${color}50` : color,
                        borderRadius: 4,
                        minWidth: 4,
                      }}
                    />
                  );
                })}
              </div>

              {/* Active days */}
              <div style={{
                width: DAYS_W, flexShrink: 0, textAlign: "right",
                padding: `0 ${space[1]}px`,
                fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
                color: tStatus === "not_started" ? c.textDim : c.textMid,
                fontVariantNumeric: "tabular-nums",
              }}>
                {tStatus !== "not_started" ? `${days}d` : "—"}
              </div>

              {/* Action button — always visible */}
              <div style={{
                width: ACTION_W, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                paddingRight: space[2],
              }}>
                {tStatus === "active" && onCompleteTrack && (
                  <button type="button" onClick={() => onCompleteTrack(name)} style={{
                    ...btnBase,
                    background: `${color}12`, border: `1px solid ${color}40`,
                    color,
                  }}>Done</button>
                )}
                {tStatus === "completed" && onReopenTrack && (
                  <button type="button" onClick={() => onReopenTrack(name)} style={{
                    ...btnBase,
                    background: c.surfaceAlt, border: `1px solid ${c.border}`,
                    color: c.textMid,
                  }}>Reopen</button>
                )}
                {tStatus === "not_started" && onStartTrack && (
                  <button type="button" onClick={() => onStartTrack(name)} style={{
                    ...btnBase,
                    background: "transparent", border: `1px dashed ${color}40`,
                    color: `${color}90`,
                  }}>Start</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
