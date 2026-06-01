// Flow — Login Screen
// Perspective-tilted calendar grid on the left, centered hero, bottom CTA

import React, { useEffect, useRef, useCallback } from "react";
import { c, body } from "../styles/theme";
import FlowLogo from "./FlowLogo";
import useDevLabel from "../hooks/useDevLabel";

const GOOGLE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ── Calendar grid constants ──
const CELL_COLORS = [
  { r: 59, g: 130, b: 246 },  // blue
  { r: 34, g: 211, b: 238 },  // cyan
  { r: 167, g: 139, b: 250 }, // purple
  { r: 132, g: 255, b: 149 }, // green
  { r: 255, g: 184, b: 0 },   // gold
  { r: 255, g: 45, b: 120 },  // pink
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUSES = ["done", "partial", "empty", "active"];
const CW = 110, CH = 64, GAP = 5, COLS = 5;
const GLOW_RADIUS = 220;

function makeCell(x, y) {
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const color = CELL_COLORS[Math.floor(Math.random() * CELL_COLORS.length)];
  const progress = status === "done" ? 1 : status === "partial" ? 0.3 + Math.random() * 0.5 : 0;
  const numTasks = Math.floor(Math.random() * 4);
  const tasksCompleted = status === "done" ? numTasks : Math.floor(Math.random() * numTasks);
  return {
    x, y, status, color, progress, numTasks, tasksCompleted,
    day: DAYS[Math.floor(Math.random() * 7)],
    baseOpacity: 0.035 + Math.random() * 0.025,
  };
}

function drawCell(ctx, cell, drawX, drawY, smoothX, smoothY) {
  const cx = drawX + CW / 2, cy = drawY + CH / 2;
  const dx = cx - smoothX, dy = cy - smoothY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const prox = dist < GLOW_RADIUS ? 1 - dist / GLOW_RADIUS : 0;
  const op = cell.baseOpacity + prox * 0.14;
  const { r, g, b } = cell.color;

  // Background
  ctx.beginPath(); ctx.roundRect(drawX, drawY, CW, CH, 5);
  ctx.fillStyle = `rgba(${r},${g},${b},${op * 0.15})`; ctx.fill();
  // Border
  ctx.beginPath(); ctx.roundRect(drawX, drawY, CW, CH, 5);
  ctx.strokeStyle = `rgba(${r},${g},${b},${op * 0.35})`; ctx.lineWidth = 0.5; ctx.stroke();
  // Glow
  if (prox > 0.25) {
    ctx.shadowColor = `rgba(${r},${g},${b},${prox * 0.12})`;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.roundRect(drawX, drawY, CW, CH, 5);
    ctx.fillStyle = `rgba(${r},${g},${b},${prox * 0.035})`; ctx.fill();
    ctx.shadowBlur = 0;
  }
  // Day label
  ctx.font = `600 ${8 + prox * 2}px Inter`;
  ctx.fillStyle = `rgba(0,0,0,${0.08 + prox * 0.3})`;
  ctx.fillText(cell.day, drawX + 7, drawY + 14);
  // Progress bar
  if (cell.progress > 0) {
    const bW = CW - 14, bH = 2.5, bX = drawX + 7, bY = drawY + CH - 10;
    ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, 1.5);
    ctx.fillStyle = `rgba(0,0,0,${op * 0.12})`; ctx.fill();
    ctx.beginPath(); ctx.roundRect(bX, bY, bW * cell.progress, bH, 1.5);
    ctx.fillStyle = `rgba(${r},${g},${b},${op * 2.5 + prox * 0.4})`; ctx.fill();
  }
  // Status indicators
  if (cell.status === "done") {
    ctx.font = `700 ${12 + prox * 4}px Inter`;
    ctx.fillStyle = `rgba(${r},${g},${b},${0.07 + prox * 0.35})`;
    ctx.fillText("\u2713", drawX + CW - 18, drawY + 16);
  } else if (cell.status === "active") {
    ctx.beginPath(); ctx.arc(drawX + CW - 13, drawY + 12, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.1 + prox * 0.4})`; ctx.fill();
  }
  // Task dots (revealed near cursor)
  if (cell.numTasks > 0 && prox > 0.15) {
    for (let t = 0; t < cell.numTasks; t++) {
      ctx.beginPath(); ctx.arc(drawX + 7 + t * 8, drawY + CH - 22, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = t < cell.tasksCompleted
        ? `rgba(${r},${g},${b},${prox * 0.5})`
        : `rgba(0,0,0,${prox * 0.1})`;
      ctx.fill();
    }
  }
}

export default function LoginScreen({ onSignIn, loading: signingIn, error: authError }) {
  const devRef = useDevLabel("LoginScreen", "src/components/LoginScreen.jsx", "Login screen with perspective calendar grid and Google OAuth sign-in");
  const canvasLeftRef = useRef(null);
  const canvasRightRef = useRef(null);
  const heroRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, smoothX: 0, smoothY: 0 });
  const leftCellsRef = useRef([]);
  const rightCellsRef = useRef([]);
  const scrollRef = useRef(0);
  const totalRowsRef = useRef(0);
  const rafRef = useRef(null);

  const initCells = useCallback(() => {
    [canvasLeftRef, canvasRightRef].forEach((ref, i) => {
      const cv = ref.current;
      if (!cv) return;
      const wrap = cv.parentElement;
      const r = wrap.getBoundingClientRect();
      cv.width = r.width * 1.2;
      cv.height = r.height * 1.2;
      const rows = Math.ceil(cv.height / (CH + GAP)) + 6;
      totalRowsRef.current = rows;
      const cells = [];
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < COLS; col++) {
          // Right side: anchor cells from the right edge of the canvas
          const x = i === 0
            ? col * (CW + GAP) + 16
            : cv.width - (col + 1) * (CW + GAP) - 16;
          cells.push(makeCell(x, row * (CH + GAP)));
        }
      if (i === 0) leftCellsRef.current = cells;
      else rightCellsRef.current = cells;
    });
  }, []);

  useEffect(() => {
    // Set initial mouse to center
    mouseRef.current.x = window.innerWidth / 2;
    mouseRef.current.y = window.innerHeight / 2;
    mouseRef.current.smoothX = mouseRef.current.x;
    mouseRef.current.smoothY = mouseRef.current.y;

    const onMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    initCells();

    const draw = () => {
      const hero = heroRef.current;
      const m = mouseRef.current;

      // Smooth lerp
      m.smoothX += (m.x - m.smoothX) * 0.08;
      m.smoothY += (m.y - m.smoothY) * 0.08;

      // Scroll
      scrollRef.current += 0.2;
      const totalH = totalRowsRef.current * (CH + GAP);

      // Draw both canvases
      const winW = window.innerWidth;
      [
        { cv: canvasLeftRef.current, cells: leftCellsRef.current, dir: 1 },
        { cv: canvasRightRef.current, cells: rightCellsRef.current, dir: -1 },
      ].forEach(({ cv, cells, dir }) => {
        if (!cv) return;
        const ctx = cv.getContext("2d");
        ctx.clearRect(0, 0, cv.width, cv.height);
        // Convert screen mouse to canvas-local coords
        // Left canvas starts at screen x=0, right canvas starts at screen x=winW/2
        const mx = dir === -1 ? m.smoothX - winW / 2 : m.smoothX;
        const my = m.smoothY;
        for (const cell of cells) {
          let dy = cell.y - (dir * scrollRef.current % totalH);
          if (dir === -1) dy = cell.y + (scrollRef.current % totalH);
          if (dy < -(CH + GAP)) dy += totalH;
          if (dy > cv.height + CH) { if (dy - totalH > -(CH + GAP)) dy -= totalH; else continue; }
          drawCell(ctx, cell, cell.x, dy, mx, my);
        }
      });

      // Hero is static — no parallax

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const onResize = () => initCells();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initCells]);

  return (
    <div ref={devRef} style={{
      minHeight: "100vh", background: c.bg, color: c.text, fontFamily: body,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes login-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes login-fade-up {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .flow-login-btn { transition: all 0.25s ease; }
        .flow-login-btn:hover {
          transform: translateY(-2px) !important;
          background: rgba(0,0,0,0.06) !important;
          border-color: rgba(0,0,0,0.12) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05) !important;
        }
        .flow-login-btn:active { transform: translateY(0) !important; }
        .flow-login-btn:focus-visible { outline: 2px solid ${c.accent}; outline-offset: 2px; }
        @media (max-width: 768px) {
          .flow-login-grid-wrap { display: none !important; }
          .flow-login-cta-wrap { position: absolute !important; }
        }
      `}</style>

      {/* ── Perspective-tilted calendar grid (left side) ── */}
      <div className="flow-login-grid-wrap" style={{
        position: "absolute", left: 0, top: 0, width: "50%", height: "100%",
        perspective: 1200, overflow: "hidden", zIndex: 0,
      }}>
        <canvas
          ref={canvasLeftRef}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            transform: "rotateY(12deg) rotateX(-2deg) scale(1.1)",
            transformOrigin: "left center",
          }}
        />
      </div>

      {/* ── Perspective-tilted calendar grid (right side) ── */}
      <div className="flow-login-grid-wrap" style={{
        position: "absolute", right: 0, top: 0, width: "50%", height: "100%",
        perspective: 1200, overflow: "hidden", zIndex: 0,
      }}>
        <canvas
          ref={canvasRightRef}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            transform: "rotateY(-12deg) rotateX(-2deg) scale(1.1)",
            transformOrigin: "right center",
          }}
        />
      </div>

      {/* ── Gradient fades ── */}
      {/* Center fade — grids fade into center hero area */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: `linear-gradient(90deg, transparent 20%, ${c.bg} 38%, ${c.bg} 62%, transparent 80%)`,
      }} />
      {/* Top/bottom fade */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: `linear-gradient(180deg, ${c.bg} 0%, transparent 20%, transparent 80%, ${c.bg} 100%)`,
      }} />

      {/* ── Centered hero ── */}
      <div ref={heroRef} style={{
        position: "relative", zIndex: 2, textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{
          marginBottom: 28,
          animation: "login-breathe 4s ease-in-out infinite",
          display: "flex", justifyContent: "center",
        }}>
          <FlowLogo size={120} color="#111111" />
        </div>

        {/* Title */}
        <div style={{
          fontSize: "clamp(36px, 8vw, 56px)", fontWeight: 800, letterSpacing: "-0.05em",
          lineHeight: 1.1, marginBottom: 24,
          background: "linear-gradient(180deg, #111111 0%, #666666 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          animation: "login-fade-up 0.6s ease-out both",
          animationDelay: "0.1s",
        }}>
          Flow
        </div>

        {/* Subtext */}
        <div style={{
          fontSize: 16, color: c.textDim, fontWeight: 500, lineHeight: 1.5,
          animation: "login-fade-up 0.6s ease-out both",
          animationDelay: "0.25s",
        }}>
          Workflows, visualized.
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="flow-login-cta-wrap" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 24px 36px",
        background: `linear-gradient(0deg, ${c.bg} 50%, transparent 100%)`,
        pointerEvents: "none",
      }}>
        <button
          className="flow-login-btn"
          onClick={onSignIn}
          disabled={signingIn}
          style={{
            pointerEvents: "all",
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 36px", borderRadius: 12,
            fontSize: 16, fontWeight: 600, fontFamily: body,
            cursor: signingIn ? "wait" : "pointer",
            background: c.surfaceAlt,
            border: `1px solid ${c.border}`,
            color: c.text,
            backdropFilter: "blur(24px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            opacity: signingIn ? 0.5 : 1,
            animation: "login-fade-up 0.6s ease-out both",
            animationDelay: "0.5s",
          }}
        >
          {GOOGLE_ICON}
          {signingIn ? "Redirecting\u2026" : "Sign in with Google"}
        </button>
        {authError && (
          <div style={{ marginTop: 12, fontSize: 14, color: c.red, pointerEvents: "all", textAlign: "center" }}>
            {authError}
          </div>
        )}
        <span style={{
          marginTop: 14, fontSize: 12, color: c.textDim,
          letterSpacing: "0.04em", pointerEvents: "all",
        }}>
          Secured by Supabase
        </span>
      </div>
    </div>
  );
}
