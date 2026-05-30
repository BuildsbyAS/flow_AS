/**
 * ActionToast — lightweight success/info toast for user actions.
 *
 * Usage: window.__flowToast?.("Project marked as blocked")
 * Shows a brief toast at bottom-center, auto-dismisses after 2.5s.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, typo, layout, space } from "../styles/theme";

const DURATION = 2500;
const EXIT_MS = 180;

const KEYFRAMES = `
  @keyframes action-toast-in {
    0% { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.96); }
    100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }
  @keyframes action-toast-out {
    0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    100% { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.97); }
  }
`;

export default function ActionToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [icon, setIcon] = useState("success"); // "success" | "warn"
  const [exiting, setExiting] = useState(false);
  const timer = useRef(null);
  const exitTimer = useRef(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    exitTimer.current = setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, EXIT_MS);
  }, []);

  const show = useCallback((msgOrObj) => {
    clearTimeout(timer.current);
    clearTimeout(exitTimer.current);
    if (typeof msgOrObj === "object" && msgOrObj !== null) {
      setMessage(msgOrObj.message || "");
      setIcon(msgOrObj.icon || "success");
    } else {
      setMessage(msgOrObj);
      setIcon("success");
    }
    setExiting(false);
    setVisible(true);
    timer.current = setTimeout(() => dismiss(), DURATION);
  }, [dismiss]);

  useEffect(() => {
    window.__flowToast = show;
    return () => { delete window.__flowToast; };
  }, [show]);

  useEffect(() => () => {
    clearTimeout(timer.current);
    clearTimeout(exitTimer.current);
  }, []);

  if (!visible) return <style>{KEYFRAMES}</style>;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div role="status" aria-live="polite" style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1100,
        animation: exiting
          ? `action-toast-out ${EXIT_MS}ms ease-in forwards`
          : "action-toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        pointerEvents: "none",
      }}>
        <div style={{
          background: c.text,
          borderRadius: layout.radiusSm,
          padding: `10px ${space[5]}px`,
          display: "flex",
          alignItems: "center",
          gap: space[2],
          fontFamily: typo.bodyMd.font,
          fontSize: 13,
          fontWeight: 600,
          color: c.surface,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
          whiteSpace: "nowrap",
        }}>
          <span style={{ color: icon === "warn" ? "#fbbf24" : "#4ade80", fontSize: 14, lineHeight: 1 }}>
            {icon === "warn" ? "⚠" : "✓"}
          </span>
          {message}
        </div>
      </div>
    </>
  );
}
