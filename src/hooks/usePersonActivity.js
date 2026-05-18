// ═══════════════════════════════════════════════════════════════════
// usePersonActivity — per-person live data for the People deep-dive.
//
// Returns:
//   memberships: project_members rows for this person across all projects
//   comments:    last N comments authored by this person (not deleted)
//
// Subscribes to Supabase Realtime so the page stays live as the person
// posts new comments or gets added to / removed from projects.
//
// In dev seed mode (localhost without a real session) this reads from
// the in-memory devStore instead so the People page is clickable
// without auth.
// ═══════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { isDevSeedMode, devStore } from "../data/devSeed";

const COMMENT_LIMIT = 25;

export default function usePersonActivity(personId) {
  const [memberships, setMemberships] = useState([]);
  const [comments, setComments]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const refetch = useCallback(async () => {
    if (!personId) { setMemberships([]); setComments([]); setLoading(false); return; }

    if (isDevSeedMode()) {
      setMemberships(devStore.listMembershipsByPerson(personId));
      setComments(devStore.listCommentsByAuthor(personId, COMMENT_LIMIT));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [mRes, cRes] = await Promise.all([
        supabase
          .from("project_members")
          .select("id, project_id, person_id, added_at")
          .eq("person_id", personId),
        supabase
          .from("project_comments")
          .select("id, project_id, author_id, body, created_at, edited_at, deleted_at")
          .eq("author_id", personId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(COMMENT_LIMIT),
      ]);
      if (mRes.error) throw mRes.error;
      if (cRes.error) throw cRes.error;
      setMemberships(mRes.data || []);
      setComments(cRes.data || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => { refetch(); }, [refetch]);

  // ── Realtime subscriptions ─────────────────────────────────────
  useEffect(() => {
    if (!personId) return undefined;

    if (isDevSeedMode()) {
      // The devStore notifies per-project; we only refilter when a
      // change might affect this person. Cheaper than refetching, and
      // the result lists are short.
      return devStore.subscribe(() => {
        setMemberships(devStore.listMembershipsByPerson(personId));
        setComments(devStore.listCommentsByAuthor(personId, COMMENT_LIMIT));
      });
    }

    const channel = supabase
      .channel(`person-activity-${personId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "project_members", filter: `person_id=eq.${personId}` },
        (payload) => {
          setMemberships((prev) => {
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
        { event: "*", schema: "public", table: "project_comments", filter: `author_id=eq.${personId}` },
        (payload) => {
          setComments((prev) => {
            const next = [...prev];
            if (payload.eventType === "INSERT" && payload.new) {
              if (!next.some(c => c.id === payload.new.id)) next.unshift(payload.new);
            } else if (payload.eventType === "UPDATE" && payload.new) {
              // A soft-delete (deleted_at set) should remove the row.
              if (payload.new.deleted_at) return next.filter(c => c.id !== payload.new.id);
              const idx = next.findIndex(c => c.id === payload.new.id);
              if (idx >= 0) next[idx] = payload.new;
            } else if (payload.eventType === "DELETE" && payload.old) {
              return next.filter(c => c.id !== payload.old.id);
            }
            return next.slice(0, COMMENT_LIMIT);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [personId]);

  return { memberships, comments, loading, error, refetch };
}
