// DevOverlay — development-only component inspector
// Toggle: Ctrl+Shift+D  |  Modes: OFF → HOVER → LABELS → OFF
// Zero production impact — entire tree stripped when !import.meta.env.DEV
import React, { useState, useEffect, useCallback, useRef } from "react";
import { getRegistry, subscribeRegistry } from "../hooks/useDevLabel";

const IS_DEV = import.meta.env.DEV;

const MODES = ["OFF", "HOVER", "LABELS"];

// ── Styles ──────────────────────────────────────────────────────
const S = {
  pill: {
    position: "fixed", bottom: 16, right: 16, zIndex: 99999,
    padding: "6px 14px", borderRadius: 20,
    background: "rgba(15, 23, 42, 0.92)", border: "1px solid rgba(59, 130, 246, 0.3)",
    backdropFilter: "blur(12px)",
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 11, fontWeight: 600,
    color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em",
    cursor: "pointer", userSelect: "none",
    transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease",
    display: "flex", alignItems: "center", gap: 6,
  },
  pillActive: {
    border: "1px solid rgba(59, 130, 246, 0.6)",
    color: "#3B82F6",
    boxShadow: "0 0 20px rgba(59, 130, 246, 0.15)",
  },
  dot: (active) => ({
    width: 6, height: 6, borderRadius: "50%",
    background: active ? "#3B82F6" : "rgba(255,255,255,0.25)",
    transition: "background 0.15s ease",
  }),
  tooltip: {
    position: "fixed", zIndex: 99998, pointerEvents: "none",
    padding: "10px 14px", borderRadius: 8,
    background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(59, 130, 246, 0.25)",
    backdropFilter: "blur(12px)",
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    maxWidth: 320, lineHeight: 1.5,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  label: {
    position: "absolute", top: 0, left: 0, zIndex: 99997,
    padding: "2px 8px", borderRadius: "0 0 6px 0",
    background: "rgba(59, 130, 246, 0.85)",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600,
    color: "#fff", letterSpacing: "0.02em",
    pointerEvents: "none", whiteSpace: "nowrap",
  },
};

// ── Tooltip component ───────────────────────────────────────────
function Tooltip({ entry, x, y }) {
  if (!entry) return null;
  const style = {
    ...S.tooltip,
    left: Math.min(x + 12, window.innerWidth - 340),
    top: Math.max(y - 60, 8),
  };
  return (
    <div style={style}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#3B82F6", marginBottom: 4 }}>
        {entry.name}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: entry.description ? 4 : 0 }}>
        {entry.filePath}
      </div>
      {entry.description && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{entry.description}</div>
      )}
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Click to copy path</div>
    </div>
  );
}

// ── Label overlays for LABELS mode ──────────────────────────────
function LabelOverlays() {
  const [entries, setEntries] = useState([]);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    const update = () => setEntries([...getRegistry()]);
    update();
    return subscribeRegistry(update);
  }, []);

  useEffect(() => {
    if (entries.length === 0) { setPositions([]); return; }

    const measure = () => {
      const pos = entries.map(e => {
        if (!e.el) return null;
        const rect = e.el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return null;
        return { name: e.name, top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height };
      }).filter(Boolean);
      setPositions(pos);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [entries]);

  return (
    <>
      {positions.map((p, i) => (
        <div key={`${p.name}-${i}`} style={{
          position: "absolute", top: p.top, left: p.left,
          width: p.width, height: p.height,
          border: "1px solid rgba(59, 130, 246, 0.2)",
          borderRadius: 4, pointerEvents: "none", zIndex: 99996,
        }}>
          <div style={S.label}>{p.name}</div>
        </div>
      ))}
    </>
  );
}

// ── Main overlay component ──────────────────────────────────────
function DevOverlayInner() {
  const [mode, setMode] = useState(0); // 0=OFF, 1=HOVER, 2=LABELS
  const [hovered, setHovered] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const outlineRef = useRef(null);

  // Cycle mode: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setMode(m => (m + 1) % 3);
        setHovered(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Hover tracking
  useEffect(() => {
    if (mode !== 1) { setHovered(null); return; }

    const onMove = (e) => {
      setMouse({ x: e.clientX, y: e.clientY });
      // Walk up from target to find a registered element
      let el = e.target;
      while (el && el !== document.body) {
        if (el.hasAttribute("data-dev-name")) {
          const entry = {
            name: el.getAttribute("data-dev-name"),
            filePath: el.getAttribute("data-dev-file"),
            description: el.getAttribute("data-dev-desc"),
            el,
          };
          setHovered(entry);

          // Outline
          if (outlineRef.current) {
            const rect = el.getBoundingClientRect();
            Object.assign(outlineRef.current.style, {
              display: "block",
              top: rect.top + "px", left: rect.left + "px",
              width: rect.width + "px", height: rect.height + "px",
            });
          }
          return;
        }
        el = el.parentElement;
      }
      setHovered(null);
      if (outlineRef.current) outlineRef.current.style.display = "none";
    };

    const onClick = (e) => {
      let el = e.target;
      while (el && el !== document.body) {
        if (el.hasAttribute("data-dev-file")) {
          const path = el.getAttribute("data-dev-file");
          navigator.clipboard.writeText(path).catch(() => {});
          // Brief flash feedback
          const orig = el.style.outline;
          el.style.outline = "2px solid #3B82F6";
          setTimeout(() => { el.style.outline = orig; }, 300);
          return;
        }
        el = el.parentElement;
      }
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      if (outlineRef.current) outlineRef.current.style.display = "none";
    };
  }, [mode]);

  const isActive = mode > 0;

  return (
    <>
      {/* Hover outline */}
      <div ref={outlineRef} style={{
        position: "fixed", display: "none", zIndex: 99997,
        border: "1.5px solid rgba(59, 130, 246, 0.5)",
        borderRadius: 4, pointerEvents: "none",
        transition: "background 0.08s ease, border-color 0.08s ease, color 0.08s ease, box-shadow 0.08s ease, transform 0.08s ease, opacity 0.08s ease",
      }} />

      {/* Hover tooltip */}
      {mode === 1 && hovered && <Tooltip entry={hovered} x={mouse.x} y={mouse.y} />}

      {/* Labels mode */}
      {mode === 2 && <LabelOverlays />}

      {/* Mode pill */}
      <div
        style={{ ...S.pill, ...(isActive ? S.pillActive : {}) }}
        onClick={() => setMode(m => (m + 1) % 3)}
        title="Ctrl+Shift+D to toggle"
      >
        <div style={S.dot(isActive)} />
        DEV {MODES[mode]}
      </div>
    </>
  );
}

// ── Provider: wraps the app, only renders overlay in dev ────────
export default function DevOverlayProvider({ children }) {
  if (!IS_DEV) return children;
  return (
    <>
      {children}
      <DevOverlayInner />
    </>
  );
}
