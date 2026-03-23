// Flow — Auth hook (Supabase + Google OAuth)
// Manages session, checks if user has a linked people record

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { logLogin, logLogout } from "../lib/activityLog";

export default function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personProfile, setPersonProfile] = useState(null); // linked people row
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // ── Listen for auth state changes ──
  useEffect(() => {
    let hadSessionOnMount = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      hadSessionOnMount = !!s;
      setSession(s);
      if (s) fetchProfile(s.user.id);
      else setLoading(false);
    });

    // Subscribe to changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) {
        if (event === "SIGNED_IN") {
          fetchProfile(s.user.id);
          // Only log if this is a genuine new sign-in, not a page reload with existing session
          if (!hadSessionOnMount) logLogin();
          hadSessionOnMount = true;
        }
      } else {
        hadSessionOnMount = false;
        setPersonProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Check if this auth user has a linked people record ──
  const fetchProfile = useCallback(async (authUserId) => {
    setCheckingProfile(true);
    try {
      const { data, error } = await supabase
        .from("people")
        .select("id, name, squad_id, role_id, auth_user_id, squads(name), roles(name)")
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

  // ── Sign in with Google ──
  const signIn = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error("Sign-in error:", error);
  }, []);

  // ── Sign out ──
  const signOut = useCallback(async () => {
    logLogout();
    await supabase.auth.signOut();
    setSession(null);
    setPersonProfile(null);
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
      })
      .select("id, name, squad_id, role_id, auth_user_id, squads(name), roles(name)")
      .single();

    if (error) return { error: error.message };

    setPersonProfile(data);
    return { data };
  }, [session]);

  return {
    // State
    session,
    user: session?.user || null,
    personProfile,
    loading: initialLoadDone ? false : (loading || checkingProfile),

    // Derived
    isAuthenticated: !!session,
    needsOnboarding: !!session && !personProfile && !checkingProfile && !loading,

    // Actions
    signIn,
    signOut,
    completeOnboarding,
    refreshProfile: () => session?.user?.id && fetchProfile(session.user.id),
  };
}
