// ═══════════════════════════════════════════════════════════════════
// InboxView — centralised mention inbox for the current user.
//
// Scans all project comments for @mentions of the viewer and surfaces
// them as an actionable feed. Each card shows context (project, author,
// time), the comment body with the mention highlighted, and lets the
// user either reply inline or jump to the project detail page.
// ═══════════════════════════════════════════════════════════════════
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { c, space, layout, typo, body, mono } from "../styles/theme";
import { timeAgo, fmtAbsolute } from "../lib/time";
import { addProjectCommentToDB } from "../lib/mutations";
import { isDevSeedMode, devStore } from "../data/devSeed";

// ── Helpers ──
function initialsOf(name) {
  if (!name) return "?";
  return name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function Avatar({ name, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.cyanDim, color: c.cyan,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: Math.max(10, size * 0.4), fontWeight: 700,
      flexShrink: 0, border: `1px solid ${c.cyan}33`,
    }}>
      {initialsOf(name)}
    </div>
  );
}

// Extract @mentions from a comment body, return array of lowercased names.
// Matches @Name or @FirstName LastName (capitalized words only, not "for", "the", etc.)
function extractMentions(text, peopleByLowerName) {
  if (!text) return [];
  const mentions = [];
  // Match @ followed by a capitalized word, optionally followed by space + capitalized word
  const regex = /@([A-Z]\w*(?:\s[A-Z]\w*)?)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const full = m[1].toLowerCase();
    mentions.push(full);
    // Also add first name only for matching
    const firstName = full.split(/\s+/)[0];
    if (firstName !== full) mentions.push(firstName);
  }
  // Fallback: also match @lowercase patterns (e.g. @aj)
  const regexLower = /@([a-z]\w*)/g;
  while ((m = regexLower.exec(text)) !== null) {
    mentions.push(m[1].toLowerCase());
  }
  return [...new Set(mentions)];
}

// Highlight @mentions in comment body
function renderHighlightedBody(text, viewerName) {
  if (!text) return null;
  const parts = [];
  let lastIdx = 0;
  const regex = new RegExp(`@(${viewerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    parts.push(
      <span key={m.index} style={{
        background: c.accentDim, color: c.accent, fontWeight: 600,
        padding: "1px 4px", borderRadius: 4,
      }}>@{m[1]}</span>
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length ? parts : text;
}

// ── Inline reply composer ──
function InlineReply({ projectId, currentPersonId, onPosted }) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const ref = useRef(null);

  const submit = useCallback(async () => {
    if (!draft.trim() || !projectId || !currentPersonId) return;
    setPosting(true);
    await addProjectCommentToDB(projectId, currentPersonId, draft.trim());
    setPosting(false);
    setDraft("");
    onPosted?.();
    window.__flowToast?.("Reply posted");
  }, [draft, projectId, currentPersonId, onPosted]);

  return (
    <div style={{ display: "flex", gap: space[2], marginTop: space[2] }}>
      <input
        ref={ref}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder="Write a reply..."
        disabled={posting}
        style={{
          flex: 1, padding: `8px 12px`, borderRadius: layout.radiusSm,
          background: c.surfaceAlt, border: `1px solid ${c.border}`,
          fontFamily: body, fontSize: 13, color: c.text, outline: "none",
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={posting || !draft.trim()}
        style={{
          padding: `8px 16px`, borderRadius: layout.radiusSm,
          background: draft.trim() && !posting ? c.accent : c.surfaceAlt,
          color: draft.trim() && !posting ? "#fff" : c.textDim,
          border: "none", fontFamily: body, fontSize: 13, fontWeight: 600,
          cursor: draft.trim() && !posting ? "pointer" : "not-allowed",
        }}
      >{posting ? "..." : "Reply"}</button>
    </div>
  );
}

// ── Main ──
export default function InboxView({ projects, people, currentPerson, onNavigate }) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem("flow_inbox_read") || "[]")); }
    catch { return new Set(); }
  });

  const markRead = useCallback((id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { sessionStorage.setItem("flow_inbox_read", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const viewerName = currentPerson?.name;

  // Build people lookup
  const peopleById = useMemo(() => {
    const m = new Map();
    (people || []).forEach(p => m.set(p.id, p));
    return m;
  }, [people]);

  const projectsById = useMemo(() => {
    const m = new Map();
    (projects || []).forEach(p => m.set(p.id, p));
    return m;
  }, [projects]);

  // Get all comments across all projects
  const allComments = useMemo(() => {
    if (isDevSeedMode()) {
      return (projects || []).flatMap(proj => {
        const comments = devStore.listComments(proj.id) || [];
        return comments.map(cmt => ({ ...cmt, _projectId: proj.id }));
      });
    }
    return [];
  }, [projects]);

  // Filter for mentions of the current user
  const mentions = useMemo(() => {
    if (!viewerName) return [];
    const vn = viewerName.toLowerCase();
    // Also match first-name only
    const firstName = viewerName.split(/\s+/)[0]?.toLowerCase();

    return allComments
      .filter(cmt => {
        if (cmt.deleted_at) return false;
        if (cmt.author_id === currentPerson?.id) return false; // skip own comments
        const mentionedNames = extractMentions(cmt.body, null);
        return mentionedNames.some(name => name === vn || name === firstName);
      })
      .map(cmt => ({
        comment: cmt,
        project: projectsById.get(cmt._projectId || cmt.project_id),
        author: peopleById.get(cmt.author_id),
      }))
      .sort((a, b) => new Date(b.comment.created_at) - new Date(a.comment.created_at));
  }, [allComments, viewerName, currentPerson?.id, projectsById, peopleById]);

  // Update markAllRead to use current mentions
  const handleMarkAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      mentions.forEach(m => next.add(m.comment.id));
      try { sessionStorage.setItem("flow_inbox_read", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [mentions]);

  const unreadCount = mentions.filter(m => !readIds.has(m.comment.id)).length;

  if (!viewerName) {
    return (
      <div style={{
        padding: `${space[8]}px ${space[5]}px`, textAlign: "center",
        color: c.textDim, fontSize: 14, fontFamily: body,
      }}>
        Sign in to see your mentions.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: space[5],
      }}>
        <div>
          <h2 style={{
            fontFamily: body, fontSize: 22, fontWeight: 700, color: c.text,
            margin: 0, lineHeight: 1.3,
          }}>
            Inbox
          </h2>
          <p style={{
            fontFamily: body, fontSize: 13, color: c.textDim, margin: `${space[1]}px 0 0`,
          }}>
            {unreadCount > 0 ? `${unreadCount} unread mention${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={handleMarkAllRead} style={{
            padding: `6px 14px`, borderRadius: layout.radiusSm,
            background: "transparent", border: `1px solid ${c.border}`,
            fontFamily: body, fontSize: 12, fontWeight: 600, color: c.textMid,
            cursor: "pointer",
          }}>Mark all read</button>
        )}
      </div>

      {/* Empty state */}
      {mentions.length === 0 ? (
        <div style={{
          padding: `${space[8]}px ${space[5]}px`, textAlign: "center",
          background: c.surface, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusLg, boxShadow: c.shadowCard,
        }}>
          <div style={{ fontSize: 32, marginBottom: space[3] }}>📭</div>
          <div style={{ fontFamily: body, fontSize: 15, fontWeight: 600, color: c.text, marginBottom: space[1] }}>
            No mentions yet
          </div>
          <div style={{ fontFamily: body, fontSize: 13, color: c.textDim }}>
            When someone @-mentions you in a project comment, it will show up here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          {mentions.map(({ comment, project, author }) => {
            const isUnread = !readIds.has(comment.id);
            const isReplying = replyingTo === comment.id;
            return (
              <div
                key={comment.id}
                onClick={() => markRead(comment.id)}
                style={{
                  padding: `${space[4]}px ${space[5]}px`,
                  background: c.surface,
                  border: `1px solid ${isUnread ? c.accent + "40" : c.border}`,
                  borderRadius: layout.radiusLg,
                  boxShadow: isUnread ? `0 0 0 1px ${c.accent}15, ${c.shadowCard}` : c.shadowCard,
                  cursor: "default",
                  transition: "border-color 150ms ease, box-shadow 150ms ease",
                }}
              >
                {/* Top: project badge + timestamp */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: space[2],
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                    {isUnread && (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", background: c.accent, flexShrink: 0,
                      }} />
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onNavigate?.("projects", project?.id); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: `3px 10px`, borderRadius: 999,
                        background: c.surfaceAlt, border: `1px solid ${c.border}`,
                        fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.amber || c.textMid,
                        cursor: "pointer", letterSpacing: "0.03em",
                      }}
                    >
                      {project?.id || "?"} · {project?.name || "Unknown project"}
                    </button>
                  </div>
                  <span
                    title={fmtAbsolute(comment.created_at)}
                    style={{ fontSize: 11, color: c.textDim, fontFamily: body, whiteSpace: "nowrap" }}
                  >
                    {timeAgo(comment.created_at)}
                  </span>
                </div>

                {/* Author + body */}
                <div style={{ display: "flex", gap: space[3] }}>
                  <Avatar name={author?.name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: body, fontSize: 14, fontWeight: 700, color: c.text,
                      marginBottom: 2,
                    }}>
                      {author?.name || "Unknown"}
                    </div>
                    <div style={{
                      fontFamily: body, fontSize: 14, lineHeight: 1.5, color: c.text,
                      whiteSpace: "pre-wrap", wordBreak: "break-word",
                    }}>
                      {renderHighlightedBody(comment.body, viewerName)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  marginTop: space[3], paddingTop: space[3],
                  borderTop: `1px solid ${c.border}`,
                  display: "flex", alignItems: "center", gap: space[2],
                }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setReplyingTo(isReplying ? null : comment.id); }}
                    style={{
                      padding: `6px 14px`, borderRadius: layout.radiusSm,
                      background: isReplying ? c.accentDim : "transparent",
                      border: `1px solid ${isReplying ? c.accent + "40" : c.border}`,
                      fontFamily: body, fontSize: 12, fontWeight: 600,
                      color: isReplying ? c.accent : c.textMid,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>↩</span> Reply
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onNavigate?.("projects", project?.id); }}
                    style={{
                      padding: `6px 14px`, borderRadius: layout.radiusSm,
                      background: "transparent", border: `1px solid ${c.border}`,
                      fontFamily: body, fontSize: 12, fontWeight: 600, color: c.textMid,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    Go to project <span style={{ fontSize: 11 }}>→</span>
                  </button>
                </div>

                {/* Inline reply */}
                {isReplying && (
                  <InlineReply
                    projectId={comment._projectId || comment.project_id}
                    currentPersonId={currentPerson?.id}
                    onPosted={() => setReplyingTo(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
