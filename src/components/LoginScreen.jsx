// Flow — Login Screen (Steel & Orange)
// Clean logo + title + CTA stack on steel-gray canvas with a single white card.

import React from "react";
import { c, body, mono, typo, layout, motion, space } from "../styles/theme";
import FlowLogo from "./FlowLogo";
import useDevLabel from "../hooks/useDevLabel";

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginScreen({ onSignIn, loading: signingIn, error: authError }) {
  const devRef = useDevLabel("LoginScreen", "src/components/LoginScreen.jsx", "Login screen with Google OAuth sign-in");

  const transition = `background-color ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}`;

  return (
    <div ref={devRef} style={{
      minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", padding: space[5],
    }}>
      <style>{`
        @keyframes flow-login-fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .flow-login-primary:hover:not(:disabled) {
          background: #D24E0A !important;
        }
        .flow-login-primary:active:not(:disabled) {
          transform: translateY(1px);
        }
        .flow-login-primary:focus-visible {
          outline: 2px solid ${c.accent};
          outline-offset: 2px;
        }
      `}</style>

      {/* Login card */}
      <div style={{
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: 400,
        background: c.surface,
        borderRadius: layout.radiusLg,
        boxShadow: c.shadowElevated,
        border: `1px solid ${c.border}`,
        padding: space[8],
        display: "flex", flexDirection: "column", alignItems: "center",
        animation: "flow-login-fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}>
        {/* Logo */}
        <div style={{
          marginBottom: space[5],
          display: "flex", justifyContent: "center",
        }}>
          <FlowLogo size={72} />
        </div>

        {/* Wordmark (mono) */}
        <div style={{
          fontFamily: mono,
          fontSize: 13, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c.accent,
          marginBottom: space[3],
        }}>
          Flow
        </div>

        {/* Hero title — displayLg */}
        <div style={{
          fontFamily: typo.displayLg.font,
          fontSize: typo.displayLg.size,
          fontWeight: typo.displayLg.weight,
          letterSpacing: typo.displayLg.tracking,
          lineHeight: typo.displayLg.lineHeight,
          color: c.text,
          textAlign: "center",
          marginBottom: space[2],
        }}>
          Sign in to Flow
        </div>

        {/* Subtitle — bodySm tertiary */}
        <div style={{
          fontFamily: typo.bodySm.font,
          fontSize: typo.bodySm.size,
          fontWeight: typo.bodySm.weight,
          lineHeight: typo.bodySm.lineHeight,
          color: c.textDim,
          textAlign: "center",
          marginBottom: space[6],
        }}>
          Weekly three-commitment dashboard for Noon Group.
        </div>

        {/* Primary CTA — Btn primary */}
        <button
          className="flow-login-primary"
          onClick={onSignIn}
          disabled={signingIn}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: space[2],
            padding: "0 20px", height: 44,
            borderRadius: layout.radiusSm,
            fontFamily: body,
            fontSize: 14, fontWeight: 600,
            cursor: signingIn ? "wait" : "pointer",
            background: c.accent,
            border: "none",
            color: "#FFFFFF",
            opacity: signingIn ? 0.6 : 1,
            transition,
          }}
        >
          {GOOGLE_ICON}
          {signingIn ? "Redirecting\u2026" : "Sign in with Google"}
        </button>

        {/* Error */}
        {authError && (
          <div style={{
            marginTop: space[3],
            fontFamily: typo.bodySm.font,
            fontSize: typo.bodySm.size,
            color: c.red,
            textAlign: "center",
            width: "100%",
          }}>
            {authError}
          </div>
        )}

        {/* Cycle words — Flow vocabulary */}
        <div style={{
          marginTop: space[6],
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: space[2],
          fontFamily: mono,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c.textDim,
        }}>
          <span>Declare</span>
          <span style={{ color: c.textGhost || c.textDim, opacity: 0.5 }}>·</span>
          <span>Lock</span>
          <span style={{ color: c.textGhost || c.textDim, opacity: 0.5 }}>·</span>
          <span>Pulse</span>
          <span style={{ color: c.textGhost || c.textDim, opacity: 0.5 }}>·</span>
          <span>Close</span>
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: space[5],
          fontFamily: body,
          fontSize: 11, fontWeight: 500,
          color: c.textDim,
          letterSpacing: "0.02em",
        }}>
          Secured by Supabase
        </div>
      </div>
    </div>
  );
}
