// ═══════════════════════════════════════════════════════════════════
// ProjectActivity — members row, composer, and the project's activity
// feed rendered as a vertical timeline rail.
//
// Each entry hangs off a vertical line: comments get a solid coloured
// ring node (accent for the viewer's own posts, cyan for others),
// system events get a smaller hollow node and a one-line italic
// label. Reads as one continuous project diary.
//
// Sits below the Timeline card on the project deep-dive. Posts /
// member changes flow through lib/mutations.js which is dev-seed
// aware, so this works without a live Supabase session on localhost.
// ═══════════════════════════════════════════════════════════════════
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { c, space, layout, mono, body } from "../styles/theme";
import { initialsOf } from "../lib/names";
import useProjectActivity from "../hooks/useProjectActivity";
import {
  addProjectCommentToDB,
  editProjectCommentInDB,
  softDeleteProjectCommentFromDB,
  addProjectMemberToDB,
  removeProjectMemberFromDB,
} from "../lib/mutations";
import { timeAgo, fmtAbsolute } from "../lib/time";
import { Modal } from "./shared";

const EDIT_WINDOW_MS = 15 * 60 * 1000;

// ── Avatar ──────────────────────────────────────────────────────────
function Avatar({ name, size = 28, accent = false }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: "50%",
        background: accent ? c.accentDim : c.cyanDim,
        color: accent ? c.accent : c.cyan,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: mono, fontSize: Math.max(10, size * 0.4), fontWeight: 700,
        flexShrink: 0,
        border: `1px solid ${(accent ? c.accent : c.cyan) + "33"}`,
      }}
    >
      {initialsOf(name)}
    </div>
  );
}

// Linkify @mentions against the people list.
function renderBody(text, peopleByLowerName, onPersonNavigate) {
  if (!text) return null;
  const parts = [];
  let i = 0;
  const tokens = text.split(/(\s+|\n)/);
  while (i < tokens.length) {
    const tk = tokens[i];
    if (tk?.startsWith("@") && tk.length > 1) {
      const oneName = tk.slice(1).replace(/[.,!?;:]+$/, "");
      const trailingPunct = tk.slice(1 + oneName.length);
      const twoName = (oneName + " " + (tokens[i + 2] || "")).trim();
      const matchTwo = peopleByLowerName.get(twoName.toLowerCase());
      const matchOne = peopleByLowerName.get(oneName.toLowerCase());
      const matched = matchTwo || matchOne;
      const usedTokens = matchTwo ? 3 : 1;
      if (matched) {
        parts.push(
          <button
            type="button"
            key={`m-${i}`}
            onClick={() => onPersonNavigate?.(matched.name)}
            style={{
              color: c.cyan, background: "transparent", border: "none",
              padding: 0, font: "inherit", cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: 2, textDecorationThickness: 1,
            }}
          >@{matched.name}</button>
        );
        if (trailingPunct && usedTokens === 1) parts.push(trailingPunct);
        i += usedTokens;
        continue;
      }
    }
    parts.push(tk);
    i += 1;
  }
  return parts;
}

function actionLabel(ev, peopleByLowerName) {
  const d = ev.details || {};
  const who = ev.user_name || "Someone";
  const link = (name) => name ? (peopleByLowerName.get(name.toLowerCase())?.name || name) : null;
  switch (ev.action) {
    case "project_created":         return `${who} created this project`;
    case "project_phase_changed":   return `${who} moved phase ${d.from || "?"} → ${d.to || "?"}`;
    case "project_status_changed":  return `${who} changed status ${d.from || "?"} → ${d.to || "?"}`;
    case "project_owner_changed":   return `${who} set owner to ${link(d.to) || "—"}`;
    case "project_squad_changed":   return `${who} moved squad to ${d.to || "—"}`;
    case "member_added":            return `${who} added ${link(d.person_name) || "a member"}`;
    case "member_removed":          return `${who} removed ${link(d.person_name) || "a member"}`;
    default:                        return `${who} · ${ev.action}`;
  }
}

// ── Members row (overlapping avatar stack + names + Add) ───────────
function MembersRow({ ownerPerson, memberPeople, canManage, onPersonNavigate, onManage }) {
  const allPeople = [ownerPerson, ...memberPeople].filter(Boolean);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
      {allPeople.length > 0 && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {allPeople.map((p, idx) => (
            <button
              key={p?.id || idx}
              type="button"
              onClick={() => onPersonNavigate?.(p?.name)}
              title={`${p?.name}${p === ownerPerson ? " · Owner" : ""}`}
              aria-label={p?.name}
              style={{
                marginLeft: idx === 0 ? 0 : -6,
                background: "transparent", border: "none", padding: 0,
                cursor: "pointer", zIndex: allPeople.length - idx, lineHeight: 0,
                borderRadius: "50%", boxShadow: `0 0 0 2px ${c.surface}`,
              }}
            >
              <Avatar name={p?.name} size={20} accent={p === ownerPerson} />
            </button>
          ))}
        </div>
      )}
      {allPeople.length > 0 && (
        <div style={{
          display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap",
          fontFamily: body, fontSize: 13, color: c.textMid,
        }}>
          {ownerPerson && (
            <button
              type="button"
              onClick={() => onPersonNavigate?.(ownerPerson.name)}
              style={{
                background: "transparent", border: "none", padding: 0, cursor: "pointer",
                color: c.text, fontWeight: 700, fontFamily: body, fontSize: 13,
              }}
            >{ownerPerson.name}</button>
          )}
          {memberPeople.length > 0 && <span style={{ color: c.textDim }}>·</span>}
          {memberPeople.map((mp, idx) => (
            <React.Fragment key={mp.id}>
              <button
                type="button"
                onClick={() => onPersonNavigate?.(mp.name)}
                style={{
                  background: "transparent", border: "none", padding: 0, cursor: "pointer",
                  color: c.textMid, fontFamily: body, fontSize: 13, fontWeight: 500,
                }}
              >{mp.name}</button>
              {idx < memberPeople.length - 1 && <span style={{ color: c.textDim }}>,</span>}
            </React.Fragment>
          ))}
        </div>
      )}
      {canManage && (
        <button
          type="button"
          onClick={onManage}
          style={{
            marginLeft: "auto",
            padding: `4px 10px`, borderRadius: 999,
            background: "transparent", border: `1px solid ${c.border}`,
            color: c.textMid, fontFamily: body, fontSize: 12, fontWeight: 600,
            cursor: "pointer",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = c.surfaceAlt; e.currentTarget.style.color = c.text; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = c.textMid; }}
        >+ Add</button>
      )}
    </div>
  );
}

// ── Composer (auto-grows, expands on focus) ─────────────────────────
function Composer({ placeholder, posting, draft, setDraft, focused, setFocused, onSubmit, error }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [draft]);

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit?.();
  };

  const expanded = focused || !!draft.trim();

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
      style={{
        padding: space[4],
        background: c.surface,
        border: `1px solid ${focused ? c.accent : c.border}`,
        borderRadius: layout.radiusLg,
        boxShadow: focused ? `${c.shadowCard}, 0 0 0 3px ${c.accent}1a` : c.shadowSm,
        transition: "border-color 140ms ease, box-shadow 140ms ease",
      }}
    >
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { if (!draft.trim()) setFocused(false); }}
        onKeyDown={onKey}
        placeholder={placeholder}
        disabled={posting}
        rows={1}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: 0, border: "none", outline: "none",
          background: "transparent",
          fontFamily: body, fontSize: 15, color: c.text, lineHeight: 1.5,
          resize: "none", overflow: "hidden", minHeight: 22,
        }}
      />
      {expanded && (
        <div style={{
          marginTop: space[3], paddingTop: space[3],
          borderTop: `1px solid ${c.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[2],
        }}>
          <div style={{ fontSize: 11, color: c.textDim, fontFamily: body }}>
            @-mention to tag · Cmd / Ctrl + Enter to post
          </div>
          <div style={{ display: "flex", gap: space[2] }}>
            <button
              type="button"
              onClick={() => { setDraft(""); setFocused(false); ref.current?.blur(); }}
              style={{
                padding: `6px 12px`, borderRadius: layout.radiusSm,
                background: "transparent", border: `1px solid ${c.border}`,
                color: c.textMid, fontFamily: body, fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >Cancel</button>
            <button
              type="submit"
              disabled={posting || !draft.trim()}
              style={{
                padding: `6px 16px`, borderRadius: layout.radiusSm,
                background: draft.trim() && !posting ? c.accent : c.surfaceAlt,
                color: draft.trim() && !posting ? "#fff" : c.textDim,
                border: "none", fontFamily: body, fontSize: 13, fontWeight: 600,
                cursor: draft.trim() && !posting ? "pointer" : "not-allowed",
              }}
            >{posting ? "Posting…" : "Post"}</button>
          </div>
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: space[2], fontSize: 12, color: c.red }}>{error}</div>
      )}
    </form>
  );
}

// ── Hover-revealed ⋯ menu on each comment ───────────────────────────
function CommentMenu({ canEdit, canDelete, busy, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!canEdit && !canDelete) return null;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Comment actions"
        style={{
          width: 24, height: 24, padding: 0,
          borderRadius: layout.radiusXs,
          background: open ? c.surfaceAlt : "transparent",
          border: "none", color: c.textDim, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, lineHeight: 1, fontWeight: 700,
        }}
      >⋯</button>
      {open && (
        <div role="menu" style={{
          position: "absolute", top: 28, right: 0, zIndex: 10, minWidth: 120,
          padding: space[1], background: c.surface,
          border: `1px solid ${c.border}`, borderRadius: layout.radiusSm,
          boxShadow: c.shadowElevated,
          display: "flex", flexDirection: "column",
        }}>
          {canEdit && (
            <button type="button" role="menuitem"
              onClick={() => { setOpen(false); onEdit?.(); }}
              onMouseEnter={e => { e.currentTarget.style.background = c.surfaceAlt; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              style={{
                padding: `7px 10px`, textAlign: "left",
                background: "transparent", border: "none", borderRadius: layout.radiusXs,
                color: c.text, fontFamily: body, fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}
            >Edit</button>
          )}
          {canDelete && (
            <button type="button" role="menuitem"
              onClick={() => { setOpen(false); onDelete?.(); }}
              disabled={busy}
              onMouseEnter={e => { e.currentTarget.style.background = c.redDim; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              style={{
                padding: `7px 10px`, textAlign: "left",
                background: "transparent", border: "none", borderRadius: layout.radiusXs,
                color: c.red, fontFamily: body, fontSize: 13, fontWeight: 500,
                cursor: busy ? "wait" : "pointer",
              }}
            >Delete</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline editor (when a comment is being edited) ──────────────────
function InlineEditor({ value, onSave, onCancel, busy }) {
  const [draft, setDraft] = useState(value);
  return (
    <div style={{ marginTop: space[2], display: "flex", flexDirection: "column", gap: space[2] }}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        autoFocus
        style={{
          width: "100%", boxSizing: "border-box",
          padding: space[3], borderRadius: layout.radiusSm,
          background: c.surfaceAlt, border: `1px solid ${c.border}`,
          fontFamily: body, fontSize: 14, color: c.text, resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: space[2] }}>
        <button type="button"
          onClick={() => { if (draft.trim()) onSave?.(draft.trim()); }}
          disabled={busy || !draft.trim()}
          style={{
            padding: `6px 14px`, borderRadius: layout.radiusSm,
            background: c.accent, color: "#fff", border: "none",
            fontFamily: body, fontSize: 13, fontWeight: 600,
            cursor: busy ? "wait" : "pointer", opacity: draft.trim() ? 1 : 0.6,
          }}
        >Save</button>
        <button type="button" onClick={onCancel} disabled={busy}
          style={{
            padding: `6px 14px`, borderRadius: layout.radiusSm,
            background: "transparent", color: c.textMid, border: `1px solid ${c.border}`,
            fontFamily: body, fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
export default function ProjectActivity({
  project, people, currentPerson, isAppOwner = false,
  onPersonNavigate,
}) {
  const projectId = project?.id;
  const { comments, members, events, loading, error } = useProjectActivity(projectId);

  const peopleById = useMemo(() => {
    const m = new Map();
    (people || []).forEach(p => m.set(p.id, p));
    return m;
  }, [people]);

  const peopleByLowerName = useMemo(() => {
    const m = new Map();
    (people || []).forEach(p => { if (p?.name) m.set(p.name.toLowerCase(), p); });
    return m;
  }, [people]);

  const ownerPerson = useMemo(() => {
    if (!project) return null;
    if (project.owner_id) return peopleById.get(project.owner_id) || null;
    if (project.owner) return peopleByLowerName.get(project.owner.toLowerCase()) || null;
    return null;
  }, [project, peopleById, peopleByLowerName]);

  const memberPeople = useMemo(
    () => (members || [])
      .map(m => peopleById.get(m.person_id))
      .filter(Boolean)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [members, peopleById],
  );

  const isProjectOwner = !!(currentPerson?.id && ownerPerson?.id && currentPerson.id === ownerPerson.id);
  const isMember = !!(currentPerson?.id && (members || []).some(m => m.person_id === currentPerson.id));
  const canPost = isProjectOwner || isMember || isAppOwner;
  const canManageMembers = isProjectOwner || isAppOwner;

  const feed = useMemo(() => {
    const items = [];
    (comments || []).forEach(cmt => items.push({ kind: "comment", ts: cmt.created_at, data: cmt }));
    (events   || []).forEach(ev  => items.push({ kind: "event",   ts: ev.created_at,  data: ev  }));
    items.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    return items;
  }, [comments, events]);

  // Composer state
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [posting, setPosting] = useState(false);
  const [composerError, setComposerError] = useState(null);

  const handlePost = useCallback(async () => {
    if (!projectId || !currentPerson?.id) return;
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    setComposerError(null);
    const res = await addProjectCommentToDB(projectId, currentPerson.id, text);
    setPosting(false);
    if (!res?.ok) {
      setComposerError(res?.error?.message || "Couldn't post that — try again.");
      return;
    }
    setDraft("");
    setFocused(false);
  }, [draft, projectId, currentPerson?.id]);

  const onEditComment = useCallback(async (commentId, body) => editProjectCommentInDB(commentId, body), []);
  const onDeleteComment = useCallback(async (commentId) => {
    if (!window.confirm("Delete this comment? It will show as removed in the timeline.")) return;
    await softDeleteProjectCommentFromDB(commentId);
  }, []);

  const [membersModalOpen, setMembersModalOpen] = useState(false);

  return (
    <div style={{
      padding: `${space[4]}px ${space[5]}px ${space[5]}px`,
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: layout.radiusLg,
      boxShadow: c.shadowCard,
      display: "flex", flexDirection: "column", gap: space[4],
    }}>
      <MembersRow
        ownerPerson={ownerPerson}
        memberPeople={memberPeople}
        canManage={canManageMembers}
        onPersonNavigate={onPersonNavigate}
        onManage={() => setMembersModalOpen(true)}
      />

      {canPost ? (
        <Composer
          placeholder={`Post an update on ${project?.name || "this project"}…`}
          posting={posting}
          draft={draft}
          setDraft={setDraft}
          focused={focused}
          setFocused={setFocused}
          error={composerError}
          onSubmit={handlePost}
        />
      ) : (
        <div style={{
          padding: `${space[3]}px ${space[4]}px`,
          background: c.surfaceAlt, border: `1px dashed ${c.border}`,
          borderRadius: layout.radiusLg,
          fontSize: 13, color: c.textDim, fontFamily: body,
        }}>
          Only the project owner and members can post. Ask {ownerPerson?.name || "the owner"} to add you.
        </div>
      )}

      {/* Feed — vertical timeline rail */}
      {loading ? (
        <div style={{ padding: `${space[6]}px ${space[4]}px`, textAlign: "center", color: c.textDim, fontSize: 13 }}>
          Loading activity…
        </div>
      ) : error ? (
        <div role="alert" style={{
          padding: space[4], color: c.red, fontSize: 13,
          background: c.redDim, border: `1px solid ${c.red}30`, borderRadius: layout.radiusSm,
        }}>Couldn't load activity: {error}</div>
      ) : feed.length === 0 ? (
        <div style={{
          padding: `${space[7]}px ${space[4]}px`, textAlign: "center",
          color: c.textDim, fontSize: 14, fontFamily: body,
        }}>
          No activity yet. {canPost
            ? "Be the first to post — your team will see it here."
            : "Updates from the team will land here."}
        </div>
      ) : (
        <ul style={{
          listStyle: "none", margin: 0,
          padding: `${space[2]}px 0 ${space[2]}px 28px`,
          position: "relative",
          display: "flex", flexDirection: "column", gap: space[5],
        }}>
          {/* Vertical rail line */}
          <span aria-hidden="true" style={{
            position: "absolute", left: 10, top: 8, bottom: 8,
            width: 2, background: c.border, borderRadius: 1,
          }} />

          {feed.map(item => item.kind === "comment"
            ? (
              <RailComment
                key={`c-${item.data.id}`}
                comment={item.data}
                author={peopleById.get(item.data.author_id)}
                currentPerson={currentPerson}
                isProjectOwner={isProjectOwner}
                isAppOwner={isAppOwner}
                peopleByLowerName={peopleByLowerName}
                onPersonNavigate={onPersonNavigate}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
              />
            )
            : (
              <li key={`e-${item.data.id}`} style={{ position: "relative" }}>
                <span aria-hidden="true" style={{
                  position: "absolute", left: -23, top: 6,
                  width: 8, height: 8, borderRadius: "50%",
                  background: c.surface, border: `2px solid ${c.border}`,
                }} />
                <div style={{
                  fontFamily: body, fontSize: 13, color: c.textDim,
                  display: "flex", alignItems: "baseline", gap: space[2], flexWrap: "wrap",
                }}>
                  <span style={{ fontStyle: "italic" }}>{actionLabel(item.data, peopleByLowerName)}</span>
                  <span title={fmtAbsolute(item.data.created_at)} style={{ fontSize: 11 }}>· {timeAgo(item.data.created_at)}</span>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {membersModalOpen && (
        <ManageMembersModal
          project={project}
          members={members}
          people={people}
          currentPersonId={currentPerson?.id}
          onClose={() => setMembersModalOpen(false)}
        />
      )}
    </div>
  );
}

// ── A single comment node on the rail ──────────────────────────────
function RailComment({ comment, author, currentPerson, isProjectOwner, isAppOwner, peopleByLowerName, onPersonNavigate, onEdit, onDelete }) {
  const isAuthor = !!(currentPerson?.id && comment.author_id === currentPerson.id);
  const withinEditWindow = (Date.now() - new Date(comment.created_at).getTime()) < EDIT_WINDOW_MS;
  const canEdit = isAuthor && withinEditWindow && !comment.deleted_at;
  const canDelete = !comment.deleted_at && (isAuthor || isProjectOwner || isAppOwner);

  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(false);

  const save = async (text) => {
    setBusy(true);
    const r = await onEdit?.(comment.id, text);
    setBusy(false);
    if (r?.ok) setEditing(false);
  };

  return (
    <li
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative" }}
    >
      <span aria-hidden="true" style={{
        position: "absolute", left: -26, top: 4,
        width: 14, height: 14, borderRadius: "50%",
        background: c.surface,
        border: `3px solid ${isAuthor ? c.accent : c.cyan}`,
        boxSizing: "border-box",
      }} />

      <div style={{ display: "flex", alignItems: "baseline", gap: space[2], flexWrap: "wrap" }}>
        <button type="button"
          onClick={() => onPersonNavigate?.(author?.name)}
          disabled={!author?.name}
          style={{
            background: "transparent", border: "none", padding: 0,
            fontFamily: body, fontSize: 14, fontWeight: 700, color: c.text,
            cursor: author?.name ? "pointer" : "default",
          }}
        >{author?.name || "Unknown"}</button>
        <span title={fmtAbsolute(comment.created_at)} style={{ fontSize: 12, color: c.textDim }}>
          {timeAgo(comment.created_at)}{comment.edited_at ? " · edited" : ""}
        </span>
        <span style={{ flex: 1 }} />
        {!editing && !comment.deleted_at && (canEdit || canDelete) && (
          <div style={{ opacity: hover ? 1 : 0, transition: "opacity 120ms ease" }}>
            <CommentMenu canEdit={canEdit} canDelete={canDelete} busy={busy}
              onEdit={() => setEditing(true)}
              onDelete={async () => { setBusy(true); await onDelete?.(comment.id); setBusy(false); }}
            />
          </div>
        )}
      </div>

      {comment.deleted_at ? (
        <div style={{ marginTop: 2, fontSize: 13, color: c.textDim, fontStyle: "italic" }}>Comment deleted.</div>
      ) : editing ? (
        <InlineEditor value={comment.body} onSave={save} onCancel={() => setEditing(false)} busy={busy} />
      ) : (
        <div style={{
          marginTop: 4, fontSize: 14, lineHeight: 1.55, color: c.text,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>{renderBody(comment.body, peopleByLowerName, onPersonNavigate)}</div>
      )}
    </li>
  );
}

// ── Manage Members modal ───────────────────────────────────────────
function ManageMembersModal({ project, members, people, currentPersonId, onClose }) {
  const [query, setQuery] = useState("");
  const [busyIds, setBusyIds] = useState(new Set());

  const memberIds = useMemo(() => new Set((members || []).map(m => m.person_id)), [members]);
  const ownerId = project?.owner_id || null;

  const eligible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people || [])
      .filter(p => p.id !== ownerId)
      .filter(p => !q || p.name?.toLowerCase().includes(q) || (p.squad || "").toLowerCase().includes(q) || (p.role || "").toLowerCase().includes(q))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [people, ownerId, query]);

  const markBusy = (id, busy) => setBusyIds(prev => {
    const n = new Set(prev);
    if (busy) n.add(id); else n.delete(id);
    return n;
  });

  const toggle = async (person) => {
    const isMember = memberIds.has(person.id);
    markBusy(person.id, true);
    const meta = { personName: person.name, projectName: project?.name };
    if (isMember) await removeProjectMemberFromDB(project.id, person.id, meta);
    else          await addProjectMemberToDB(project.id, person.id, currentPersonId, meta);
    markBusy(person.id, false);
  };

  return (
    <Modal open onClose={onClose} title={`Manage members · ${project?.name || ""}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: space[3], minHeight: 320 }}>
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, squad, or role…"
          autoFocus
          style={{
            padding: `10px 14px`, borderRadius: layout.radiusSm,
            background: c.surfaceAlt, border: `1px solid ${c.border}`,
            fontFamily: body, fontSize: 14, color: c.text,
          }}
        />
        <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {eligible.length === 0 ? (
            <div style={{ padding: space[4], textAlign: "center", color: c.textDim, fontSize: 13 }}>No people match.</div>
          ) : eligible.map(p => {
            const isMember = memberIds.has(p.id);
            const busy = busyIds.has(p.id);
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: space[3],
                padding: `${space[2]}px ${space[3]}px`,
                borderRadius: layout.radiusSm,
                background: isMember ? c.surfaceAlt : "transparent",
              }}>
                <Avatar name={p.name} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: c.text }}>{p.name}</div>
                  <div style={{ fontFamily: body, fontSize: 12, color: c.textDim }}>
                    {[p.role, p.squad].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <button type="button" onClick={() => toggle(p)} disabled={busy}
                  style={{
                    padding: `6px 14px`, borderRadius: layout.radiusSm,
                    background: isMember ? c.redDim : c.accent,
                    color: isMember ? c.red : "#fff",
                    border: isMember ? `1px solid ${c.red}30` : "none",
                    fontFamily: body, fontSize: 12, fontWeight: 600,
                    cursor: busy ? "wait" : "pointer", minWidth: 80,
                  }}
                >{busy ? "…" : isMember ? "Remove" : "Add"}</button>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}
            style={{
              padding: `8px 16px`, borderRadius: layout.radiusSm,
              background: "transparent", border: `1px solid ${c.border}`,
              color: c.text, fontFamily: body, fontSize: 14, fontWeight: 500, cursor: "pointer",
            }}
          >Done</button>
        </div>
      </div>
    </Modal>
  );
}
