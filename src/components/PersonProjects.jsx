// ═══════════════════════════════════════════════════════════════════
// PersonProjects — per-person panel for the People deep-dive.
//
// Three sections:
//   1. Owns         — projects where person.id === project.owner_id
//   2. Member of    — projects where this person is in project_members
//                     (excluding any where they're already the owner)
//   3. Recent posts — comments authored by this person, newest first
//
// All data is read via usePersonActivity (real-time aware). Project
// rows show last activity + a red stale chip so it's obvious which
// projects this person is letting drift.
// ═══════════════════════════════════════════════════════════════════
import React, { useMemo } from "react";
import { c, typo, space, layout, body, mono } from "../styles/theme";
import usePersonActivity from "../hooks/usePersonActivity";
import { timeAgo, isStale, fmtAbsolute } from "../lib/time";

function ProjectRow({ proj, onNavigate, label }) {
  const stale = isStale(proj.lastActivityAt);
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(proj.id)}
      style={{
        display: "flex", alignItems: "center", gap: space[3],
        width: "100%", textAlign: "left",
        padding: `${space[3]}px ${space[4]}px`,
        background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
        cursor: "pointer", color: "inherit",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = c.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = c.surface; }}
    >
      <span style={{
        fontFamily: mono, fontSize: 12, fontWeight: 700,
        color: c.amber, letterSpacing: "0.04em",
        minWidth: 36,
      }}>{proj.id}</span>
      <span style={{
        fontFamily: body, fontSize: 14, fontWeight: 600, color: c.text,
        flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{proj.name}</span>
      {proj.phase && (
        <span style={{
          fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
          color: c.textMid, textTransform: "uppercase",
        }}>{proj.phase}</span>
      )}
      <span
        title={proj.lastActivityAt ? fmtAbsolute(proj.lastActivityAt) : "No activity yet"}
        style={{
          fontFamily: body, fontSize: 12, fontWeight: 600,
          color: !proj.lastActivityAt ? c.textDim : stale ? c.red : c.textMid,
          padding: stale && proj.lastActivityAt ? `2px 8px` : "2px 0",
          borderRadius: 999,
          background: stale && proj.lastActivityAt ? c.redDim : "transparent",
          border: stale && proj.lastActivityAt ? `1px solid ${c.red}30` : "none",
        }}
      >
        {proj.lastActivityAt ? `${stale ? "⚠ " : ""}${timeAgo(proj.lastActivityAt)}` : "no activity"}
      </span>
      {label && (
        <span style={{
          fontFamily: mono, fontSize: 10, fontWeight: 700,
          color: c.accent, letterSpacing: "0.08em",
          background: c.accentDim, padding: `2px 6px`, borderRadius: layout.radiusXs,
          textTransform: "uppercase",
        }}>{label}</span>
      )}
    </button>
  );
}

function CommentRow({ comment, project, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(comment.project_id)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "stretch", gap: 4,
        width: "100%", textAlign: "left",
        padding: `${space[3]}px ${space[4]}px`,
        background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
        cursor: "pointer", color: "inherit",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = c.surfaceAlt; }}
      onMouseLeave={e => { e.currentTarget.style.background = c.surface; }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: space[2] }}>
        <span style={{
          fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.amber,
          letterSpacing: "0.04em",
        }}>{comment.project_id}</span>
        <span style={{
          fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{project?.name || "—"}</span>
        <span title={fmtAbsolute(comment.created_at)}
          style={{ marginLeft: "auto", fontSize: 11, color: c.textDim }}>
          {timeAgo(comment.created_at)}
        </span>
      </div>
      <div style={{
        fontFamily: body, fontSize: 13, color: c.textMid, lineHeight: 1.45,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {comment.body}
      </div>
    </button>
  );
}

function SectionTitle({ title, count }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: space[2],
      marginBottom: space[3],
    }}>
      <span style={{
        fontFamily: mono, fontSize: 11, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase", color: c.textDim,
      }}>{title}</span>
      <span style={{
        fontFamily: mono, fontSize: 11, color: c.textDim, fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}>{count}</span>
    </div>
  );
}

export default function PersonProjects({ person, projects, onProjectNavigate }) {
  const personId = person?.id;
  const { memberships, comments, loading, error } = usePersonActivity(personId);

  const projectsById = useMemo(() => {
    const m = new Map();
    (projects || []).forEach(p => m.set(p.id, p));
    return m;
  }, [projects]);

  const owns = useMemo(() => {
    if (!personId) return [];
    return (projects || [])
      .filter(p => p.owner_id === personId)
      .sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));
  }, [projects, personId]);

  const memberOf = useMemo(() => {
    if (!personId) return [];
    const ownIds = new Set(owns.map(p => p.id));
    return (memberships || [])
      .map(m => projectsById.get(m.project_id))
      .filter(Boolean)
      .filter(p => !ownIds.has(p.id))
      .sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));
  }, [memberships, projectsById, owns, personId]);

  if (!personId) {
    return (
      <div style={{
        padding: space[5], borderRadius: layout.radiusLg,
        background: c.surface, border: `1px solid ${c.border}`,
        color: c.textDim, fontFamily: body, fontSize: 13, textAlign: "center",
      }}>
        This person hasn't been linked to a Flow account yet, so we can't
        show their projects or activity.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        padding: space[5], borderRadius: layout.radiusLg,
        background: c.surface, border: `1px solid ${c.border}`,
        color: c.textDim, fontFamily: body, fontSize: 13, textAlign: "center",
      }}>Loading activity…</div>
    );
  }

  if (error) {
    return (
      <div role="alert" style={{
        padding: space[5], borderRadius: layout.radiusLg,
        background: c.surface, border: `1px solid ${c.border}`,
        color: c.red, fontFamily: body, fontSize: 13,
      }}>Couldn't load activity: {error}</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[6] }}>
      {/* ── Owns ───────────────────────────────────────────────── */}
      <div>
        <SectionTitle title="Owns" count={owns.length} />
        {owns.length === 0 ? (
          <div style={{
            padding: space[4], borderRadius: layout.radiusSm,
            background: c.surface, border: `1px dashed ${c.border}`,
            color: c.textDim, fontSize: 13, fontFamily: body, textAlign: "center",
          }}>
            {person?.name || "This person"} doesn't own any projects yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {owns.map(p => (
              <ProjectRow key={p.id} proj={p} onNavigate={onProjectNavigate} label="Owner" />
            ))}
          </div>
        )}
      </div>

      {/* ── Member of ──────────────────────────────────────────── */}
      <div>
        <SectionTitle title="Member of" count={memberOf.length} />
        {memberOf.length === 0 ? (
          <div style={{
            padding: space[4], borderRadius: layout.radiusSm,
            background: c.surface, border: `1px dashed ${c.border}`,
            color: c.textDim, fontSize: 13, fontFamily: body, textAlign: "center",
          }}>
            Not a member of any other projects.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {memberOf.map(p => (
              <ProjectRow key={p.id} proj={p} onNavigate={onProjectNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* ── Recent posts ───────────────────────────────────────── */}
      <div>
        <SectionTitle title="Recent posts" count={comments.length} />
        {comments.length === 0 ? (
          <div style={{
            padding: space[4], borderRadius: layout.radiusSm,
            background: c.surface, border: `1px dashed ${c.border}`,
            color: c.textDim, fontSize: 13, fontFamily: body, textAlign: "center",
          }}>
            No posts yet. When {person?.name || "this person"} comments on a
            project, you'll see the latest activity here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {comments.map(cmt => (
              <CommentRow
                key={cmt.id}
                comment={cmt}
                project={projectsById.get(cmt.project_id)}
                onNavigate={onProjectNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
