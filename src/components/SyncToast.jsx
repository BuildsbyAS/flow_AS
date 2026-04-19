/**
 * SyncToast — Steel & Orange sync notification
 *
 * Brief toast at bottom-right when data syncs to Supabase.
 * Light card, flat status dot, accent-only sweep. No neon glow.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, typo, layout, space } from "../styles/theme";
import useDevLabel from "../hooks/useDevLabel";

const TOAST_DURATION = 2400;
const EXIT_MS = 200;

const KEYFRAMES = `
  @keyframes sync-toast-in {
    0% { opacity: 0; transform: translateY(8px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes sync-toast-out {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(8px); }
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
  const devRef = useDevLabel("SyncToast", "Steel & Orange sync notification toast at bottom-right");
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | syncing | done | error
  const [personName, setPersonName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [exiting, setExiting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setPhase("idle");
      setExiting(false);
      setExpanded(false);
      setErrorMsg("");
    }, EXIT_MS);
  }, []);

  const show = useCallback((name) => {
    setPersonName(name || "");
    setPhase("syncing");
    setErrorMsg("");
    setExiting(false);
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(), 10000);
  }, [dismiss]);

  const done = useCallback((name) => {
    setPersonName(name || "");
    setPhase("done");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => dismiss(), TOAST_DURATION);
  }, [dismiss]);

  const error = useCallback((name, detail) => {
    setPersonName(name || "");
    setErrorMsg(typeof detail === "string" ? detail : (detail?.message || ""));
    setPhase("error");
    clearTimeout(timer.current);
    // Error toasts persist longer — user needs a moment to read the reason.
    timer.current = setTimeout(() => dismiss(), TOAST_DURATION + 4000);
  }, [dismiss]);

  useEffect(() => {
    window.__flowSyncToast = { show, done, error };
    return () => { delete window.__flowSyncToast; };
  }, [show, done, error]);

  if (!visible) return <style>{KEYFRAMES}</style>;

  const isDone = phase === "done";
  const isError = phase === "error";
  // Syncing uses accent (orange), done = green, error = red. No cyan/purple.
  const statusColor = isError ? c.red : isDone ? c.green : c.accent;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div ref={devRef} role="status" aria-live="polite" style={{
        position: "fixed",
        bottom: 68,
        right: 20,
        zIndex: 150,
        animation: exiting
          ? `sync-toast-out ${EXIT_MS}ms ease-in forwards`
          : "sync-toast-in 250ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
      }}>
        <div style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: layout.radiusSm,
          padding: `10px ${space[4]}px`,
          display: "flex",
          flexDirection: "column",
          gap: expanded && isError ? space[1] : 0,
          fontFamily: typo.monoMd.font,
          fontSize: typo.monoMd.size,
          fontWeight: 600,
          letterSpacing: typo.monoMd.tracking,
          color: c.textMid,
          minWidth: 180,
          maxWidth: expanded && isError ? 420 : undefined,
          boxShadow: c.shadowFloat,
          overflow: "hidden",
          position: "relative",
          fontVariantNumeric: "tabular-nums",
        }}>
          {/* Accent sweep bar at top — syncing only */}
          {!isDone && !isError && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
              overflow: "hidden",
            }}>
              <div style={{
                width: "50%", height: "100%",
                background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`,
                animation: "sync-bar-sweep 1s linear infinite",
              }} />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
            {/* Status indicator — flat solid dot, no glow */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: statusColor,
              flexShrink: 0,
              transition: "background 200ms ease",
            }} />

            {/* Message */}
            <div style={{
              display: "flex", alignItems: "center", gap: space[1],
              fontVariantNumeric: "tabular-nums", flex: 1,
            }}>
              <span style={{ color: c.textDim }}>$</span>
              <span style={{ color: statusColor }}>sync</span>
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
                  color: c.accent,
                  marginLeft: 1,
                }}>_</span>
              )}
              {isDone && (
                <span style={{ color: c.green, marginLeft: 2, opacity: 0.75 }}>
                  ✓
                </span>
              )}
              {isError && (
                <span style={{ color: c.red, marginLeft: 2, opacity: 0.75 }}>
                  ✗
                </span>
              )}
            </div>

            {/* Error: expand toggle to reveal the error reason */}
            {isError && errorMsg && (
              <button
                onClick={() => setExpanded(v => !v)}
                title={expanded ? "Hide details" : "Show details"}
                style={{
                  background: "transparent", border: `1px solid ${c.red}25`,
                  borderRadius: 4, color: c.red, cursor: "pointer",
                  padding: "1px 6px", fontFamily: "inherit", fontSize: 10,
                  fontWeight: 700, letterSpacing: "0.08em",
                }}
              >{expanded ? "HIDE" : "WHY"}</button>
            )}
          </div>

          {/* Error detail — collapsible */}
          {isError && errorMsg && expanded && (
            <div style={{
              paddingLeft: 16, color: c.textMid,
              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 500,
              lineHeight: 1.5, letterSpacing: 0,
              wordBreak: "break-word", whiteSpace: "pre-wrap",
            }}>{errorMsg}</div>
          )}
        </div>
      </div>
    </>
  );
}
