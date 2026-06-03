import React, { useMemo, useState } from "react";
import { c, typo, space, layout, motion } from "../styles/theme";
import { Tag, Sel } from "../components/shared";
import { Icon } from "../components/icons";
import { SectionHead } from "../components/kpi";

const FEATURE_TYPE_COLORS = {
  New: { color: c.green, bg: "#059669" + "18" },
  Fix: { color: c.red, bg: "#DC2626" + "18" },
  Enhancement: { color: c.blue, bg: "#1D4ED8" + "18" },
  "UI/UX": { color: c.purple, bg: "#6D28D9" + "18" },
};

function formatMonth(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function monthKey(dateStr) {
  return dateStr?.slice(0, 7) || "unknown";
}

export default function WhatsNewView({ projects, people, onNavigate }) {
  const [squadFilter, setSquadFilter] = useState("");

  const squads = useMemo(
    () => [...new Set(projects.map(p => p.squad).filter(Boolean))].sort(),
    [projects]
  );

  const gaProjects = useMemo(() => {
    return projects
      .filter(p => p.phase === "GA" && p.gaEnteredAt)
      .filter(p => !squadFilter || p.squad === squadFilter)
      .sort((a, b) => (b.gaEnteredAt || "").localeCompare(a.gaEnteredAt || ""));
  }, [projects, squadFilter]);

  const groupedByMonth = useMemo(() => {
    const groups = [];
    let currentMonth = null;
    let currentGroup = null;
    for (const p of gaProjects) {
      const mk = monthKey(p.gaEnteredAt);
      if (mk !== currentMonth) {
        currentMonth = mk;
        currentGroup = { month: mk, label: formatMonth(p.gaEnteredAt), items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(p);
    }
    return groups;
  }, [gaProjects]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3] }}>
        <div>
          <div style={{
            fontFamily: typo.displayLg.font, fontSize: 22, fontWeight: 700,
            color: c.text, letterSpacing: "-0.02em",
          }}>What's New</div>
          <div style={{
            fontFamily: typo.bodyMd.font, fontSize: 13, color: c.textDim, marginTop: 2,
          }}>Projects shipped to GA</div>
        </div>
        <Sel
          value={squadFilter}
          onChange={e => setSquadFilter(e.target.value)}
          style={{ width: 180, height: 36 }}
        >
          <option value="">All squads</option>
          {squads.map(s => <option key={s} value={s}>{s}</option>)}
        </Sel>
      </div>

      {gaProjects.length === 0 && (
        <div style={{
          padding: `${space[7]}px ${space[5]}px`, textAlign: "center",
          borderRadius: layout.radiusLg, background: c.surface,
          border: `1px solid ${c.border}`,
        }}>
          <div style={{ marginBottom: space[3], color: c.textGhost || c.textDim }}><Icon name="rocket" size={36} strokeWidth={1.5} /></div>
          <div style={{ fontFamily: typo.bodyMd.font, fontSize: 14, color: c.textDim }}>
            No shipped projects yet. When a project reaches GA, it'll appear here.
          </div>
        </div>
      )}

      {groupedByMonth.map(group => (
        <div key={group.month}>
          <div style={{
            fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
            color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase",
            marginBottom: space[3], paddingBottom: space[1],
            borderBottom: `1px solid ${c.border}`,
          }}>{group.label}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {group.items.map(proj => {
              const ftc = FEATURE_TYPE_COLORS[proj.gaFeatureType] || FEATURE_TYPE_COLORS.New;
              const owner = people?.find(p => p.name === proj.owner);
              return (
                <div key={proj.id} style={{
                  padding: `${space[4]}px ${space[5]}px`,
                  borderRadius: layout.radiusSm,
                  background: c.surface, border: `1px solid ${c.border}`,
                  display: "flex", alignItems: "flex-start", gap: space[4],
                  transition: `box-shadow ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                  cursor: "default",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = c.textMid + "40"; e.currentTarget.style.boxShadow = c.shadowSm; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {/* Left: date */}
                  <div style={{
                    fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
                    color: c.textDim, minWidth: 56, paddingTop: 2,
                    fontVariantNumeric: "tabular-nums",
                  }}>{formatDate(proj.gaEnteredAt)}</div>

                  {/* Center: content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: 4 }}>
                      <span style={{
                        fontFamily: typo.bodyMd.font, fontSize: 15, fontWeight: 700,
                        color: c.text,
                      }}>{proj.name}</span>
                      <span style={{
                        fontFamily: typo.monoSm.font, fontSize: 10, fontWeight: 600,
                        color: c.textDim,
                      }}>{proj.id}</span>
                    </div>
                    {proj.gaReleaseNote && (
                      <div style={{
                        fontFamily: typo.bodyMd.font, fontSize: 13, color: c.textMid,
                        lineHeight: 1.5, marginBottom: space[2],
                      }}>{proj.gaReleaseNote}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: space[3], flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: typo.bodySm.font, fontSize: 12, color: c.cyan, fontWeight: 600,
                      }}>{proj.owner}</span>
                      <span style={{
                        fontFamily: typo.monoSm.font, fontSize: 10, color: c.textDim,
                        padding: `1px 6px`, borderRadius: 999,
                        background: c.surfaceAlt,
                      }}>{proj.squad}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: space[2], marginTop: space[3] }}>
                      {[
                        { label: "Shoutout", icon: "clap", action: () => window.__flowToast?.(`Shoutout sent to ${proj.owner}!`) },
                        { label: "Feedback", icon: "message-circle", action: () => onNavigate?.("projects", proj.id) },
                        { label: "View Project", icon: "arrow", action: () => onNavigate?.("projects", proj.id) },
                      ].map(btn => (
                        <button key={btn.label} type="button" onClick={btn.action} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: `4px 10px`, borderRadius: 999,
                          background: "transparent", border: `1px solid ${c.border}`,
                          color: c.textMid, fontFamily: typo.bodySm.font, fontSize: 11, fontWeight: 600,
                          cursor: "pointer", transition: "border-color 100ms ease, color 100ms ease",
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.color = c.accent; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textMid; }}
                        >
                          {btn.icon === "arrow" ? <span style={{ fontSize: 11, lineHeight: 1 }}>→</span> : <Icon name={btn.icon} size={12} />}
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: feature type */}
                  <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    <Tag color={ftc.color} bg={ftc.bg}>{proj.gaFeatureType || "New"}</Tag>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
