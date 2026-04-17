// ═══════════════════════════════════════════════════════════════════
// ActivityTimeline — SHARED between ProjectsView and PeopleDeepDive.
//
// Single source of truth for the chronological list of commits that
// appears at the bottom of every deep-dive (project or person).
//
// ⚠️ Do NOT duplicate this layout in individual views. If a treatment
// needs to differ between project-subject and person-subject, add a
// branch here on the `subject` prop so changes propagate everywhere.
//
// The component is stateless and UI-only. All data (weeks, entries,
// week-ordering, navigation callbacks) is supplied by the caller.
// ═══════════════════════════════════════════════════════════════════
import React from "react";
import { c, typo, space, layout, motion, phaseColors as getPhaseColors, typeConfig, outcomeConfig, entityColors as getEntityColors } from "../styles/theme";
import { Tag } from "./shared";

function fmtShort(d) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * @param {object} props
 * @param {"project"|"person"} props.subject — deep-dive type; controls which counterpart renders on the left
 * @param {Array<{week:string, isCurrent?:boolean, entries:Array<{title?, task?, type?, stage?, outcome?, person?, project?}>}>} props.weeks — chronological groups
 * @param {string[]} props.weekLabels — canonical chronological order (used for "NW ago" + sort)
 * @param {string=} props.currentWeekStart — ISO date of the current week for the header label
 * @param {boolean=} props.isHistorical
 * @param {string=} props.selectedWeekKey
 * @param {(name:string)=>void=} props.onPersonNavigate
 * @param {(projectId:string)=>void=} props.onProjectNavigate
 * @param {Array=} props.projects — for looking up project names when subject==="person"
 * @param {string=} props.titleStripId — e.g. "X40" — removes trailing " for X40" from titles
 * @param {string=} props.titleStripName — e.g. "Email Campaigns" — removes trailing " for Email Campaigns"
 * @param {string=} props.emptyMessage
 */
export default function ActivityTimeline({
  subject,
  weeks,
  weekLabels = [],
  currentWeekStart,
  isHistorical,
  selectedWeekKey,
  onPersonNavigate,
  onProjectNavigate,
  projects,
  titleStripId,
  titleStripName,
  emptyMessage = "No activity yet",
}) {
  const pc = getPhaseColors();
  const tc = typeConfig();
  const ec = getEntityColors();

  // Strip "for <id>" / "for <name>" from the end of task titles when we're
  // already on that project's page (the suffix is noise there).
  const cleanTitle = (raw) => {
    const t = (raw || "").trim();
    if (!t) return "";
    let out = t;
    if (titleStripId) out = out.replace(new RegExp(`\\s+for\\s+${titleStripId}\\s*$`, "i"), "");
    if (titleStripName) {
      const escaped = titleStripName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(`\\s+for\\s+${escaped}\\s*$`, "i"), "");
    }
    return out.trim();
  };

  const weekOrder = Object.fromEntries(weekLabels.map((w, i) => [w, i]));
  const currentIdx = weekLabels.length - 1;
  const sortedWeeks = [...weeks].sort((a, b) => (weekOrder[b.week] ?? -1) - (weekOrder[a.week] ?? -1));

  const hasAnything = sortedWeeks.some(w => (w.entries || []).length > 0);

  if (!hasAnything) {
    return (
      <div style={{ padding: `${space[6]}px ${space[4]}px`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: space[2] }}>
        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600, color: c.textMid }}>{emptyMessage}</div>
      </div>
    );
  }

  let rowIdx = 0;

  return (
    <div style={{ padding: `${space[2]}px 0` }}>
      {sortedWeeks.map((wk, wi) => {
        const entries = wk.entries || [];
        if (entries.length === 0 && !wk.isCurrent) return null;

        // Header: DATE on left, (NW ago) in parens. Current week in orange.
        const headerDate = wk.isCurrent
          ? (currentWeekStart ? fmtShort(currentWeekStart) : wk.week)
          : wk.week;
        const weekIdx = weekOrder[wk.week] ?? -1;
        const weeksAgo = weekIdx >= 0 ? currentIdx - weekIdx : null;
        const relParen =
          wk.isCurrent ? (isHistorical && selectedWeekKey ? selectedWeekKey : "This week") :
          weeksAgo === 0 ? "This week" :
          weeksAgo === 1 ? "1w ago" :
          weeksAgo > 1 ? `${weeksAgo}w ago` : null;

        return (
          <React.Fragment key={wi}>
            <div style={{
              padding: `${space[2]}px ${space[4]}px ${space[1]}px`,
              display: "flex", alignItems: "center", gap: space[2],
              position: "sticky", top: 0, zIndex: 1,
              background: c.surface,
              borderBottom: `1px solid ${c.border}`,
            }}>
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: wk.isCurrent ? c.accent : c.textMid,
              }}>
                {headerDate}
                {relParen && (
                  <span style={{
                    marginLeft: space[2], fontWeight: 500,
                    color: wk.isCurrent ? c.accent : c.textDim,
                  }}>
                    ({relParen})
                  </span>
                )}
              </span>
              <div style={{ flex: 1, height: 1, background: wk.isCurrent ? c.accent : c.border }} />
            </div>

            {entries.map((entry, ei) => {
              const gi = rowIdx++;
              const outcomeCfg = entry.outcome ? outcomeConfig()[entry.outcome] : null;

              // Left slot renders the OPPOSITE entity of the current deep-dive.
              // On a project deep-dive the page is about X40, so the left
              // column names the person. On a person deep-dive it's the
              // reverse: show the project ID.
              let leftNode;
              if (subject === "project") {
                leftNode = entry.person ? (
                  <button type="button"
                    aria-label={`View ${entry.person}`}
                    onClick={(e) => { e.stopPropagation(); onPersonNavigate && onPersonNavigate(entry.person); }}
                    style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      fontWeight: 600, color: c.cyan, cursor: "pointer",
                      textAlign: "left", background: "transparent", border: "none", padding: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                    {entry.person}
                  </button>
                ) : <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim }}>—</span>;
              } else {
                leftNode = entry.project ? (
                  <button type="button"
                    aria-label={`Open project ${entry.project}`}
                    onClick={(e) => { e.stopPropagation(); onProjectNavigate && onProjectNavigate(entry.project); }}
                    style={{
                      fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                      fontWeight: 700, letterSpacing: typo.monoMd.tracking,
                      color: ec.project, cursor: "pointer",
                      textAlign: "left", background: "transparent", border: "none", padding: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                    {entry.project}
                  </button>
                ) : <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>—</span>;
              }

              // Task text. On person deep-dive, append " · <project name>"
              // (if we can resolve it) so the context is visible.
              const rawTitle = entry.title || entry.task || "";
              const cleaned = cleanTitle(rawTitle) || "—";
              const projObj = subject === "person" && entry.project && projects
                ? projects.find(p => p.id === entry.project)
                : null;

              return (
                <div key={`${wi}-${ei}`} style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 72px 72px 120px",
                  alignItems: "center",
                  gap: space[3],
                  padding: `${space[2]}px ${space[4]}px`,
                  animation: `rowSlideIn ${motion.fast.duration} ${motion.fast.easing} both`,
                  animationDelay: `${Math.min(gi * 20, 240)}ms`,
                }}>
                  {leftNode}
                  <span
                    title={rawTitle}
                    style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      color: wk.isCurrent ? c.text : c.textMid,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                    {cleaned}
                    {projObj && (
                      <span style={{ color: c.textDim, marginLeft: space[2], fontWeight: 400 }}>· {projObj.name}</span>
                    )}
                  </span>
                  <Tag color={tc[entry.type]?.color} bg={tc[entry.type]?.bg} style={{ textAlign: "center", justifySelf: "center" }}>{tc[entry.type]?.label || entry.type || "—"}</Tag>
                  <Tag color={pc[entry.stage] || c.textDim} bg={(pc[entry.stage] ? pc[entry.stage] + "1f" : c.surfaceAlt)} style={{ textAlign: "center", justifySelf: "center", minWidth: 56, display: "inline-block" }}>{entry.stage || "—"}</Tag>
                  {outcomeCfg ? (
                    <span style={{
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 700,
                      color: outcomeCfg.color, background: outcomeCfg.bg,
                      padding: `${space[1]}px ${space[2]}px`, borderRadius: layout.radiusXs,
                      letterSpacing: "0.04em", textAlign: "center", justifySelf: "center",
                      whiteSpace: "nowrap",
                    }}>
                      {outcomeCfg.icon} {(outcomeCfg.label || entry.outcome).toUpperCase()}
                    </span>
                  ) : wk.isCurrent ? (
                    <span style={{
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
                      color: c.textDim, letterSpacing: "0.04em", textAlign: "center", justifySelf: "center",
                      textTransform: "uppercase",
                    }}>Pending</span>
                  ) : <span />}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
