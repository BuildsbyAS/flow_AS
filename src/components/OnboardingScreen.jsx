// Flow — Onboarding Screen
// First-login flow: user fills in name, squad, role → creates their people record

import React, { useState, useEffect } from "react";
import { c, body, typo, space } from "../styles/theme";
import { supabase } from "../lib/supabase";
import FlowLogo from "./FlowLogo";

export default function OnboardingScreen({ user, onComplete }) {
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [squadId, setSquadId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [squads, setSquads] = useState([]);
  const [roles, setRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch squads and roles for dropdowns
  useEffect(() => {
    (async () => {
      const [sq, ro] = await Promise.all([
        supabase.from("squads").select("id, name").order("name"),
        supabase.from("roles").select("id, name").order("name"),
      ]);
      if (sq.data) setSquads(sq.data);
      if (ro.data) setRoles(ro.data);
    })();
  }, []);

  const canSubmit = name.trim() && squadId && roleId && !submitting;

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
    background: "rgba(255,255,255,0.04)",
    border: `1px solid rgba(255,255,255,0.1)`,
    borderRadius: 8, color: c.text,
    fontSize: 14, fontFamily: body,
    outline: "none",
    transition: "border-color 0.2s ease",
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
    marginBottom: 6, display: "block",
  };

  return (
    <div style={{
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
          border-color: rgba(168,85,247,0.5) !important;
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
          box-shadow: 0 4px 20px rgba(168,85,247,0.3) !important;
        }
        .flow-onboard-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 50% 40% at 50% 40%, rgba(168,85,247,0.03), transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ marginBottom: 24, animation: "onboard-fade-up 0.5s ease-out both" }}>
        <FlowLogo size={72} />
      </div>

      {/* Welcome */}
      <div style={{
        fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em",
        marginBottom: 4,
        animation: "onboard-fade-up 0.5s ease-out both",
        animationDelay: "0.1s",
      }}>Welcome to Flow</div>

      <div style={{
        fontSize: 13, opacity: 0.35, marginBottom: 36,
        animation: "onboard-fade-up 0.5s ease-out both",
        animationDelay: "0.15s",
      }}>Set up your profile to get started</div>

      {/* Google avatar + email */}
      {user?.user_metadata?.avatar_url && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 16px", borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 28,
          animation: "onboard-fade-up 0.5s ease-out both",
          animationDelay: "0.2s",
        }}>
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            style={{ width: 28, height: 28, borderRadius: "50%" }}
          />
          <span style={{ fontSize: 13, opacity: 0.5 }}>{user.email}</span>
        </div>
      )}

      {/* Form */}
      <div style={{
        width: 320, display: "flex", flexDirection: "column", gap: 18,
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
          />
        </div>

        {/* Squad */}
        <div>
          <label style={labelStyle}>Squad</label>
          <select
            className="flow-onboard-input flow-onboard-select"
            value={squadId}
            onChange={e => setSquadId(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", color: squadId ? c.text : "rgba(255,255,255,0.3)" }}
          >
            <option value="" disabled>Select your squad</option>
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
            style={{ ...inputStyle, cursor: "pointer", color: roleId ? c.text : "rgba(255,255,255,0.3)" }}
          >
            <option value="" disabled>Select your role</option>
            {roles.map(r => (
              <option key={r.id} value={r.id} style={{ background: c.bg, color: c.text }}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: "#ef4444", padding: "4px 0" }}>{error}</div>
        )}

        {/* Submit */}
        <button
          className="flow-onboard-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            marginTop: 8, padding: "12px 0",
            background: canSubmit
              ? "linear-gradient(135deg, #A855F7, #7C3AED)"
              : "rgba(255,255,255,0.04)",
            border: "none", borderRadius: 8,
            color: canSubmit ? "#fff" : "rgba(255,255,255,0.2)",
            fontSize: 14, fontWeight: 600, fontFamily: body,
            cursor: canSubmit ? "pointer" : "not-allowed",
            boxShadow: canSubmit ? "0 2px 16px rgba(168,85,247,0.2)" : "none",
          }}
        >
          {submitting ? "Setting up…" : "Enter Flow →"}
        </button>
      </div>
    </div>
  );
}
