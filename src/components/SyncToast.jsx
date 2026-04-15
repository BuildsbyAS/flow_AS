/**
 * SyncToast — Terminal-style sync notification
 *
 * Shows a brief, geeky toast at the bottom-right when data
 * syncs to Supabase. Mimics a terminal output feel.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, body, space } from "../styles/theme";
import useDevLabel from "../hooks/useDevLabel";

const TOAST_DURATION = 2400;

const KEYFRAMES = `
  @keyframes sync-toast-in {
    0% { opacity: 0; transform: translateY(12px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes sync-toast-out {
    0% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(8px) scale(0.97); }
  }
  @keyframes sync-cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @keyframes sync-bar-sweep {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
`;

export default function SyncToast() {
  const devRef = useDevLabel("SyncToast", "Terminal-style sync notification toast at bottom-right");
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | syncing | done | error
  const [personName, setPersonName] = useState("");
  const [exiting, setExiting] = useState(false);
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setPhase("idle");
      setExiting(false);
    }, 300);
  }, []);

  const show = useCallback((name) => {
    setPersonName(name || "");
    setPhase("syncing");
    setExiting(false);
    setVisible(true);
    // Safety timeout: auto-dismiss after 10s if done/error never fires
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(), 10000);
  }, [dismiss]);

  const done = useCallback((name) => {
    setPersonName(name || "");
    setPhase("done");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(), TOAST_DURATION);
  }, [dismiss]);

  const error = useCallback((name) => {
    setPersonName(name || "");
    setPhase("error");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(), TOAST_DURATION + 1000);
  }, [dismiss]);

  // Expose methods via window for the synced setters to call
  useEffect(() => {
    window.__flowSyncToast = { show, done, error };
    return () => { delete window.__flowSyncToast; };
  }, [show, done, error]);

  if (!visible) return <style>{KEYFRAMES}</style>;

  const isDone = phase === "done";
  const isError = phase === "error";
  const statusColor = isError ? c.red : isDone ? c.green : c.cyan;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div ref={devRef} role="status" aria-live="polite" style={{
        position: "fixed",
        bottom: 68,
        right: 20,
        zIndex: 150,
        animation: exiting
          ? "sync-toast-out 0.3s ease-in forwards"
          : "sync-toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}>
        <div style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 8,
          padding: `${space[2]}px ${space[4]}px`,
          display: "flex",
          alignItems: "center",
          gap: space[3],
          fontFamily: body,
          fontSize: 12,
          color: c.textMid,
          minWidth: 180,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Sweep bar at top */}
          {!isDone && !isError && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
              overflow: "hidden",
            }}>
              <div style={{
                width: "50%", height: "100%",
                background: `linear-gradient(90deg, transparent, ${c.cyan}, ${c.purple}, transparent)`,
                animation: "sync-bar-sweep 0.8s ease-in-out infinite",
              }} />
            </div>
          )}

          {/* Status indicator */}
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}`,
            flexShrink: 0,
            transition: "background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease, opacity 0.3s ease",
          }} />

          {/* Message */}
          <div style={{ display: "flex", alignItems: "center", gap: space[1] }}>
            <span style={{ color: c.textDim }}>$</span>
            <span style={{ color: statusColor }}>
              {isError ? "sync" : "sync"}
            </span>
            <span style={{ color: c.textDim }}>
              {isError ? "err" : isDone ? "ok" : "..."}
            </span>
            {personName && (
              <span style={{ color: c.textDim, marginLeft: 2 }}>
                {personName.split(" ")[0].toLowerCase()}
              </span>
            )}
            {!isDone && !isError && (
              <span style={{
                animation: "sync-cursor-blink 1s step-end infinite",
                color: c.cyan,
                marginLeft: 1,
              }}>_</span>
            )}
            {isDone && (
              <span style={{ color: c.green, marginLeft: 2, opacity: 0.6 }}>
                ✓
              </span>
            )}
            {isError && (
              <span style={{ color: c.red, marginLeft: 2, opacity: 0.6 }}>
                ✗
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
