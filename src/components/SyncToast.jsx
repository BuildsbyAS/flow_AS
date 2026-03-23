/**
 * SyncToast — Terminal-style sync notification
 *
 * Shows a brief, geeky toast at the bottom-right when data
 * syncs to Supabase. Mimics a terminal output feel.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";

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
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | syncing | done
  const [personName, setPersonName] = useState("");
  const [exiting, setExiting] = useState(false);
  const timer = useRef(null);

  const show = useCallback((name) => {
    setPersonName(name || "");
    setPhase("syncing");
    setExiting(false);
    setVisible(true);
  }, []);

  const done = useCallback((name) => {
    setPersonName(name || "");
    setPhase("done");

    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        setPhase("idle");
        setExiting(false);
      }, 300);
    }, TOAST_DURATION);
  }, []);

  // Expose methods via window for the synced setters to call
  useEffect(() => {
    window.__flowSyncToast = { show, done };
    return () => { delete window.__flowSyncToast; };
  }, [show, done]);

  if (!visible) return <style>{KEYFRAMES}</style>;

  const isDone = phase === "done";

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: "fixed",
        bottom: 68,
        right: 20,
        zIndex: 9999,
        animation: exiting
          ? "sync-toast-out 0.3s ease-in forwards"
          : "sync-toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}>
        <div style={{
          background: "#0B1322",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          minWidth: 180,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Sweep bar at top */}
          {!isDone && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
              overflow: "hidden",
            }}>
              <div style={{
                width: "50%", height: "100%",
                background: "linear-gradient(90deg, transparent, #00F0FF, #A855F7, transparent)",
                animation: "sync-bar-sweep 0.8s ease-in-out infinite",
              }} />
            </div>
          )}

          {/* Status indicator */}
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: isDone ? "#39FF14" : "#00F0FF",
            boxShadow: isDone
              ? "0 0 6px #39FF14"
              : "0 0 6px #00F0FF",
            flexShrink: 0,
            transition: "all 0.3s ease",
          }} />

          {/* Message */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>$</span>
            <span style={{ color: isDone ? "#39FF14" : "#00F0FF" }}>
              {isDone ? "sync" : "sync"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>
              {isDone ? "ok" : "..."}
            </span>
            {personName && (
              <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: 2 }}>
                {personName.split(" ")[0].toLowerCase()}
              </span>
            )}
            {!isDone && (
              <span style={{
                animation: "sync-cursor-blink 1s step-end infinite",
                color: "#00F0FF",
                marginLeft: 1,
              }}>_</span>
            )}
            {isDone && (
              <span style={{ color: "rgba(57,255,20,0.4)", marginLeft: 2 }}>
                ✓
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
