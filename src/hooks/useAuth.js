// Flow — Auth hook (Supabase + Google OAuth)
// Manages session, checks if user has a linked people record

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { logLogin, logLogout } from "../lib/activityLog";
import { setDevSeedSessionFlag } from "../data/devSeed";

const ALLOWED_EMAIL_DOMAIN = "noon.com";
const OWNER_EMAILS = ["ajain@noon.com", "saugarg@noon.com"];

function isAllowedEmail(email) {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export default function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personProfile, setPersonProfile] = useState(null); // linked people row
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Reject non-noon.com sessions: sign out and surface an error
  // If the session exists but email is missing (e.g. mid-refresh), let it pass —
  // the next auth event will have the full payload, and RLS still blocks data access.
  const enforceDomain = useCallback(async (s) => {
    if (!s?.user) return true;
    if (!s.user.email) return true;
    if (isAllowedEmail(s.user.email)) return true;
    setAuthError(`Flow is restricted to @${ALLOWED_EMAIL_DOMAIN} accounts. ${s.user.email} is not allowed.`);
    setPersonProfile(null);
    setSession(null);
    try { await supabase.auth.signOut(); } catch (e) { console.error("Forced sign-out failed:", e); }
    setLoading(false);
    setInitialLoadDone(true);
    return false;
  }, []);

  // ── Listen for auth state changes ──
  useEffect(() => {
    let hadSessionOnMount = false;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s && !(await enforceDomain(s))) return;
      hadSessionOnMount = !!s;
      setDevSeedSessionFlag(!!s);
      setSession(s);
      if (s) fetchProfile(s.user.id);
      else setLoading(false);
    }).catch((err) => {
      console.error("Failed to get session:", err);
      setLoading(false);
      setInitialLoadDone(true);
    });

    // Subscribe to changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s && !(await enforceDomain(s))) return;
      setDevSeedSessionFlag(!!s);
      setSession(s);
      if (s) {
        if (event === "SIGNED_IN") {
          fetchProfile(s.user.id);
          // Only log if this is a genuine new sign-in, not a token refresh or page reload
          const lastLog = sessionStorage.getItem("flow_last_login_log");
          const now = Date.now();
          if (!hadSessionOnMount && (!lastLog || now - parseInt(lastLog) > 60000)) {
            logLogin();
            sessionStorage.setItem("flow_last_login_log", String(now));
          }
          hadSessionOnMount = true;
        } else if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
          fetchProfile(s.user.id);
          hadSessionOnMount = true;
        }
      } else {
        hadSessionOnMount = false;
        sessionStorage.removeItem("flow_last_login_log");
        setPersonProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [enforceDomain]);

  // ── Check if this auth user has a linked people record ──
  const fetchProfile = useCallback(async (authUserId) => {
    setCheckingProfile(true);
    try {
      const { data, error } = await supabase
        .from("people")
        .select("id, name, squad_id, role_id, auth_user_id, status, is_admin, email, squads(name), roles(name)")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (error) console.error("Profile fetch error:", error);
      setPersonProfile(data || null);
    } catch (err) {
      console.error("Profile fetch failed:", err);
      setPersonProfile(null);
    } finally {
      setCheckingProfile(false);
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, []);

  // ── Realtime: listen for own people-row updates (status changes from admin) ──
  useEffect(() => {
    if (!personProfile?.id) return;
    const channel = supabase
      .channel(`people-self-${personProfile.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "people", filter: `id=eq.${personProfile.id}` },
        (payload) => {
          if (payload.new) {
            setPersonProfile((prev) => prev ? { ...prev, ...payload.new } : prev);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [personProfile?.id]);

  // ── Sign in with Google ──
  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname + window.location.search,
          queryParams: { hd: ALLOWED_EMAIL_DOMAIN },
        },
      });
      if (error) {
        console.error("Sign-in error:", error);
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      console.error("Sign-in failed:", err);
      return { error: err.message || "Sign-in failed. Please try again." };
    }
  }, []);

  // ── Sign out ──
  const signOut = useCallback(async () => {
    try { await logLogout(); } catch (e) { console.error("Logout log failed:", e); }
    sessionStorage.removeItem("flow_terminal_unlocked");
    sessionStorage.removeItem("flow_last_login_log");
    await supabase.auth.signOut();
    setSession(null);
    setPersonProfile(null);
    setInitialLoadDone(false);
  }, []);

  // ── Complete onboarding (create people record linked to auth user) ──
  const completeOnboarding = useCallback(async ({ name, squadId, roleId }) => {
    if (!session?.user?.id) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("people")
      .insert({
        name,
        squad_id: squadId,
        role_id: roleId,
        auth_user_id: session.user.id,
        email: session.user.email,
        status: "pending",
      })
      .select("id, name, squad_id, role_id, auth_user_id, status, is_admin, email, squads(name), roles(name)")
      .single();

    if (error) return { error: error.message };

    setPersonProfile(data);
    return { data };
  }, [session]);

  const isApproved = personProfile?.status === "approved";
  const isPending = personProfile?.status === "pending";
  const isRejected = personProfile?.status === "rejected";
  const isOwner = OWNER_EMAILS.includes((session?.user?.email || "").toLowerCase());

  return {
    // State
    session,
    user: session?.user || null,
    personProfile,
    authError,
    loading: initialLoadDone ? false : (loading || checkingProfile),

    // Derived
    isAuthenticated: !!session,
    needsOnboarding: !!session && initialLoadDone && !personProfile && !checkingProfile && !loading,
    isApproved,
    isPending,
    isRejected,
    isOwner,

    // Actions
    signIn,
    signOut,
    completeOnboarding,
    refreshProfile: () => session?.user?.id && fetchProfile(session.user.id),
  };
}
