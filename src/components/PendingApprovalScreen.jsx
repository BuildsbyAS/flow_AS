// Flow — Pending Approval Screen
// Shown after onboarding when status='pending'. Realtime listens for status change.

import React from "react";
import { c, body } from "../styles/theme";
import FlowLogo from "./FlowLogo";
import useDevLabel from "../hooks/useDevLabel";

export default function PendingApprovalScreen({ user, personProfile, status, onSignOut }) {
  const devRef = useDevLabel(
    "PendingApprovalScreen",
    "src/components/PendingApprovalScreen.jsx",
    "Shown to authenticated noon users awaiting admin approval (or rejected)."
  );

  const rejected = status === "rejected";

  const heading = rejected ? "Access not granted" : "Waiting for approval";
  const sub = rejected
    ? "An admin reviewed your request and didn't grant access. Reach out to your team lead if this is a mistake."
    : "Thanks for signing in. An admin needs to approve your access before you can use Flow. You'll be let in automatically once that happens.";

  return (
    <div ref={devRef} style={{
      minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", padding: 24,
    }}>
      <style>{`
        @keyframes pending-breathe {
          0%, 100% { transform: scale(1); opacity: 0.92; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        @keyframes pending-fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .pending-signout {
          transition: all 0.2s ease;
          background: transparent;
          border: 1px solid ${c.border};
          color: ${c.textDim};
        }
        .pending-signout:hover {
          background: rgba(0,0,0,0.04);
          color: ${c.text};
          border-color: rgba(0,0,0,0.18);
        }
      `}</style>

      <div style={{
        maxWidth: 440, width: "100%", textAlign: "center",
        animation: "pending-fade-up 0.6s ease-out both",
      }}>
        <div style={{
          marginBottom: 28,
          animation: rejected ? "none" : "pending-breathe 3s ease-in-out infinite",
          display: "flex", justifyContent: "center",
        }}>
          <FlowLogo size={72} />
        </div>

        <div style={{
          fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em",
          lineHeight: 1.15, marginBottom: 12, color: c.text,
        }}>
          {heading}
        </div>

        <div style={{
          fontSize: 15, color: c.textDim, lineHeight: 1.55,
          marginBottom: 24, fontWeight: 500,
        }}>
          {sub}
        </div>

        {/* User info card */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "10px 16px", borderRadius: 10,
          background: c.surfaceAlt, border: `1px solid ${c.border}`,
          fontSize: 13, color: c.textDim,
          marginBottom: 28,
        }}>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
            background: rejected ? c.red : c.amber || "#B45309",
          }} />
          <span style={{ color: c.text, fontWeight: 600 }}>
            {personProfile?.name || user?.user_metadata?.full_name || user?.email}
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{user?.email}</span>
        </div>

        <div>
          <button
            className="pending-signout"
            onClick={onSignOut}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 10,
              fontSize: 14, fontWeight: 600, fontFamily: body,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>

        {!rejected && (
          <div style={{
            marginTop: 32, fontSize: 12, color: c.textDim,
            letterSpacing: "0.04em", opacity: 0.7,
          }}>
            This page will refresh automatically when you're approved.
          </div>
        )}
      </div>
    </div>
  );
}
