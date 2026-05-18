// ═══════════════════════════════════════════════════════════════════
// useProjectActivity — per-project live data for the deep-dive page
//
// Owns the comments thread, the members list, and the activity_log
// stream for a single project. All three subscribe to Supabase Realtime
// so the deep-dive updates without a refresh.
//
// Returned in a flat shape so callers can pick what they need:
//   { comments, members, events, loading, error }
//
// Hard-deleted comments fall out of `comments` automatically (we filter
// out rows that re-appear with deleted_at via INSERT — soft deletes are
// preserved as tombstones so the timeline keeps its "deleted by author"
// placeholder).
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { isDevSeedMode, devStore } from "../data/devSeed";

export default function useProjectActivity(projectId) {
  const [comments, setComments] = useState([]);
  const [members, setMembers] = useState([]);
  const [events, setEvents]    = useState([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState(null);

  const refetch = useCallback(async () => {
    if (!projectId) { setComments([]); setMembers([]); setEvents([]); setLoading(false); return; }
    // ── Dev seed shortcut ─────────────────────────────────────────
    if (isDevSeedMode()) {
      setComments(devStore.listComments(projectId));
      setMembers(devStore.listMembers(projectId));
      setEvents(devStore.listEvents(projectId));
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cRes, mRes, eRes] = await Promise.all([
        supabase
          .from("project_comments")
          .select("id, project_id, author_id, body, created_at, edited_at, deleted_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_members")
          .select("id, project_id, person_id, added_by, added_at")
          .eq("project_id", projectId),
        supabase
          .from("activity_log")
          .select("id, action, entity_type, entity_id, user_name, user_email, details, created_at")
          .eq("entity_type", "project")
          .eq("entity_id", projectId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (cRes.error) throw cRes.error;
      if (mRes.error) throw mRes.error;
      if (eRes.error) throw eRes.error;
      setComments(cRes.data || []);
      setMembers(mRes.data || []);
      setEvents(eRes.data || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refetch(); }, [refetch]);

  // ── Realtime subscriptions ──────────────────────────────────────
  // One channel per project so subscriptions auto-tear-down when the
  // user navigates between projects.
  useEffect(() => {
    if (!projectId) return undefined;

    // Dev seed: subscribe to the in-memory store. No network involved.
    if (isDevSeedMode()) {
      return devStore.subscribe((change) => {
        if (change.projectId !== projectId) return;
        if (change.type === "comments") setComments(devStore.listComments(projectId));
        if (change.type === "members")  setMembers(devStore.listMembers(projectId));
        if (change.type === "events")   setEvents(devStore.listEvents(projectId));
      });
    }

    const channel = supabase
      .channel(`project-activity-${projectId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "project_comments", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setComments((prev) => {
            const next = [...prev];
            if (payload.eventType === "INSERT" && payload.new) {
              if (!next.some(c => c.id === payload.new.id)) next.unshift(payload.new);
            } else if (payload.eventType === "UPDATE" && payload.new) {
              const idx = next.findIndex(c => c.id === payload.new.id);
              if (idx >= 0) next[idx] = payload.new; else next.unshift(payload.new);
            } else if (payload.eventType === "DELETE" && payload.old) {
              return next.filter(c => c.id !== payload.old.id);
            }
            return next;
          });
        }
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "project_members", filter: `project_id=eq.${projectId}` },
        (payload) => {
          setMembers((prev) => {
            if (payload.eventType === "INSERT" && payload.new) {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            }
            if (payload.eventType === "DELETE" && payload.old) {
              return prev.filter(m => m.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => {
          // The realtime filter API doesn't compose AND across columns, so
          // filter client-side. Cheap given activity volume.
          const row = payload.new;
          if (row && row.entity_type === "project" && row.entity_id === projectId) {
            setEvents((prev) => prev.some(e => e.id === row.id) ? prev : [row, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  return { comments, members, events, loading, error, refetch };
}
