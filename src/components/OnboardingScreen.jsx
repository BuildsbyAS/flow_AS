// Flow — Onboarding Screen
// First-login flow: user fills in name, squad, role → creates their people record

import React, { useState, useEffect } from "react";
import { c, body, typo, space } from "../styles/theme";
import { supabase } from "../lib/supabase";
import FlowLogo from "./FlowLogo";
import useDevLabel from "../hooks/useDevLabel";

export default function OnboardingScreen({ user, onComplete }) {
  const devRef = useDevLabel("OnboardingScreen", "src/components/OnboardingScreen.jsx", "First-login onboarding form for name, squad, and role selection");
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [squadId, setSquadId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [squads, setSquads] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch squads and roles for dropdowns
  useEffect(() => {
    (async () => {
      try {
        const [sq, ro] = await Promise.all([
          supabase.from("squads").select("id, name").order("name"),
          supabase.from("roles").select("id, name").order("name"),
        ]);
        if (sq.data) setSquads(sq.data);
        if (ro.data) setRoles(ro.data);
        if (sq.error || ro.error) setError("Failed to load options. Please refresh.");
      } catch (err) {
        setError("Failed to load options. Please refresh.");
      } finally {
        setLoadingDropdowns(false);
      }
    })();
  }, []);

  const canSubmit = name.trim().length >= 2 && squadId && roleId && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = await onComplete({ name: name.trim(), squadId, roleId });
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px",
    background: c.surfaceAlt,
    border: `1px solid ${c.borderHover}`,
    borderRadius: 8, color: c.text,
    fontSize: 16, fontFamily: body,
    outline: "none",
    transition: "border-color 0.2s ease",
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
    textTransform: "uppercase", color: c.textDim,
    marginBottom: 6, display: "block",
  };

  return (
    <div ref={devRef} style={{
      minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <style>{`
        @keyframes onboard-fade-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .flow-onboard-input:focus {
          border-color: rgba(59,130,246,0.5) !important;
        }
        .flow-onboard-input:focus-visible {
          outline: 2px solid rgba(59,130,246,0.4);
          outline-offset: 1px;
        }
        .flow-onboard-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px !important;
        }
        .flow-onboard-btn {
          transition: all 0.2s ease;
        }
        .flow-onboard-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(59,130,246,0.3) !important;
        }
        .flow-onboard-btn:focus-visible {
          outline: 2px solid ${c.accent};
          outline-offset: 2px;
        }
        .flow-onboard-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 50% 40% at 50% 40%, rgba(59,130,246,0.03), transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ marginBottom: 24, animation: "onboard-fade-up 0.5s ease-out both" }}>
        <FlowLogo size={72} />
      </div>

      {/* Welcome */}
      <div style={{
        fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em",
        marginBottom: 8,
        animation: "onboard-fade-up 0.5s ease-out both",
        animationDelay: "0.1s",
      }}>Welcome to Flow</div>

      <div style={{
        fontSize: 14, color: c.textMid, marginBottom: 36,
        animation: "onboard-fade-up 0.5s ease-out both",
        animationDelay: "0.15s",
      }}>Set up your profile to get started</div>

      {/* Google avatar + email */}
      {user?.user_metadata?.avatar_url && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 16px", borderRadius: 8,
          background: c.surfaceAlt,
          border: `1px solid ${c.border}`,
          marginBottom: 24,
          animation: "onboard-fade-up 0.5s ease-out both",
          animationDelay: "0.2s",
        }}>
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            style={{ width: 28, height: 28, borderRadius: "50%" }}
          />
          <span style={{ fontSize: 14, color: c.textMid }}>{user.email}</span>
        </div>
      )}

      {/* Form */}
      <div style={{
        width: "min(320px, calc(100% - 48px))", display: "flex", flexDirection: "column", gap: 18,
        animation: "onboard-fade-up 0.5s ease-out both",
        animationDelay: "0.25s",
      }}>

        {/* Name */}
        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            className="flow-onboard-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Tariq A."
            style={inputStyle}
            autoFocus
            maxLength={100}
            minLength={2}
          />
        </div>

        {/* Squad */}
        <div>
          <label style={labelStyle}>Squad</label>
          <select
            className="flow-onboard-input flow-onboard-select"
            value={squadId}
            onChange={e => setSquadId(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", color: squadId ? c.text : c.textDim }}
          >
            <option value="" disabled>{loadingDropdowns ? "Loading..." : squads.length === 0 ? "No squads available" : "Select your squad"}</option>
            {squads.map(s => (
              <option key={s.id} value={s.id} style={{ background: c.bg, color: c.text }}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Role */}
        <div>
          <label style={labelStyle}>Role</label>
          <select
            className="flow-onboard-input flow-onboard-select"
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", color: roleId ? c.text : c.textDim }}
          >
            <option value="" disabled>{loadingDropdowns ? "Loading..." : roles.length === 0 ? "No roles available" : "Select your role"}</option>
            {roles.map(r => (
              <option key={r.id} value={r.id} style={{ background: c.bg, color: c.text }}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 14, color: c.red, padding: "4px 0" }}>{error}</div>
        )}

        {/* Submit */}
        <button
          className="flow-onboard-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginTop: 8, padding: "12px 0",
            background: canSubmit
              ? `linear-gradient(135deg, ${c.accent}, #2563EB)`
              : c.surfaceAlt,
            border: "none", borderRadius: 8,
            color: canSubmit ? "#fff" : c.textDim,
            fontSize: 16, fontWeight: 600, fontFamily: body,
            cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit ? "0 2px 16px rgba(59,130,246,0.2)" : "none",
          }}
        >
          {submitting ? "Setting up…" : "Enter Flow →"}
        </button>
      </div>
    </div>
  );
}
