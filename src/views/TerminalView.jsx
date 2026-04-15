// Flow — Terminal View
// Locked terminal gate for Settings & Logs, Rant always open
import React, { useState, useRef, useEffect } from "react";
import { c, typo, space, layout, motion, themes } from "../styles/theme";
import RantView from "./RantView";
import AdminSettingsView from "./AdminSettingsView";
import { logTerminalAttempt, logAdminAttempt } from "../lib/activityLog";
import useDevLabel from "../hooks/useDevLabel";

const CORRECT_PASSWORD = "password";
const ADMIN_PASSWORD = "aj2308";

// Fake terminal boot lines
const BOOT_LINES = [
  { text: "FLOW OS v3.7.2 — kernel loaded", delay: 0 },
  { text: "Initializing secure subsystems...", delay: 400 },
  { text: "Auth layer: ACTIVE", delay: 800 },
  { text: "Encryption: AES-256-GCM", delay: 1100 },
  { text: "Access level: RESTRICTED", delay: 1400, color: c.orange },
  { text: "", delay: 1700 },
  { text: "4 modules detected. Authorization required.", delay: 2000, color: c.red },
];

const WARNING_MESSAGES = [
  "authorization required — enter the passphrase",
  "hint: it's the most obvious word you'd never try",
  "the key is literally what you're trying to bypass",
];

function TerminalView({ onUnlock, unlockedSections, auth, appSettings, setAppSettings, resetKey, initialModule, onConsumePayload }) {
  const devRef = useDevLabel('Locked terminal gate with boot sequence and password-protected module access');
  const [bootLines, setBootLines] = useState(unlockedSections ? BOOT_LINES : []);
  const [bootDone, setBootDone] = useState(!!unlockedSections);
  const [input, setInput] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState(null);
  const [cursorBlink, setCursorBlink] = useState(true);
  const [activeModule, setActiveModule] = useState(unlockedSections && initialModule ? initialModule : null); // null | "rant" | "admin"
  // React to initialModule prop changes (e.g., command palette navigating to rant while terminal is mounted)
  React.useEffect(() => {
    if (initialModule && unlockedSections) {
      setActiveModule(initialModule);
      if (onConsumePayload) onConsumePayload(); // Clear navPayload so it doesn't re-trigger on remount
    }
  }, [initialModule, unlockedSections, onConsumePayload]);
  const [adminUnlocked, setAdminUnlocked] = useState(() => sessionStorage.getItem("flow_admin_unlocked") === "true");
  const [adminInput, setAdminInput] = useState("");
  const [adminPrompt, setAdminPrompt] = useState(false); // show admin password prompt
  const [adminShake, setAdminShake] = useState(false);
  const [adminAttempts, setAdminAttempts] = useState([]);
  const inputRef = useRef(null);
  const terminalRef = useRef(null);

  // Boot sequence — skip if already unlocked
  useEffect(() => {
    if (unlockedSections) return;
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => {
        setBootLines(prev => [...prev, line]);
        if (i === BOOT_LINES.length - 1) {
          setTimeout(() => setBootDone(true), 600);
        }
      }, line.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-focus input when boot done
  useEffect(() => {
    if (bootDone && !activeModule && inputRef.current) inputRef.current.focus();
  }, [bootDone, activeModule]);

  // Cursor blink
  useEffect(() => {
    const iv = setInterval(() => setCursorBlink(v => !v), 530);
    return () => clearInterval(iv);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [bootLines, attempts]);

  // Reset to root when terminal icon is re-clicked
  useEffect(() => {
    if (resetKey > 0) {
      setActiveModule(null);
      setAdminPrompt(false);
      setAdminInput("");
      setAdminAttempts([]);
      setInput("");
      setAttempts([]);
      setShake(false);
      setToast(null);
      // Replay boot sequence
      setBootLines([]);
      setBootDone(false);
      BOOT_LINES.forEach((line, i) => {
        setTimeout(() => setBootLines(prev => [...prev, line]), line.delay);
      });
      setTimeout(() => setBootDone(true), BOOT_LINES[BOOT_LINES.length - 1].delay + 600);
    }
  }, [resetKey]);

  // Escape key returns to terminal root
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        if (adminPrompt) {
          e.preventDefault();
          e.stopPropagation();
          setAdminPrompt(false);
          setAdminInput("");
          setAdminAttempts([]);
          return;
        }
        if (activeModule) {
          e.preventDefault();
          e.stopPropagation();
          setActiveModule(null);
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [activeModule, adminPrompt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const val = input.trim();
    const isCorrect = val === CORRECT_PASSWORD;

    if (isCorrect) {
      setAttempts(prev => [...prev, { input: val, success: true }]);
      setInput("");
      setToast("Curiosity & Stubborn badge unlocked");
      logTerminalAttempt(true);
      onUnlock();
      setTimeout(() => setToast(null), 4000);
    } else {
      setAttempts(prev => [...prev, { input: val, success: false }]);
      setInput("");
      setShake(true);
      logTerminalAttempt(false);
      setTimeout(() => setShake(false), 500);
    }
  };

  const isUnlocked = unlockedSections;

  const modules = [
    { key: "settings", label: "Settings", desc: "System configuration & data management", locked: !isUnlocked },
    { key: "logs", label: "Activity Logs", desc: "Real-time audit trail & session history", locked: !isUnlocked },
    { key: "rant", label: "Rant", desc: "Feature requests, bugs & existential screams", locked: false },
    { key: "admin", label: "Admin", desc: "Paperwork", locked: !adminUnlocked, adminOnly: true },
  ];

  const handleModuleClick = (mod) => {
    if (mod.key === "rant") {
      setActiveModule("rant");
    } else if (mod.key === "admin") {
      if (adminUnlocked) {
        setActiveModule("admin");
      } else {
        setAdminPrompt(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } else if (!mod.locked) {
      // Settings/Logs — navigate out of terminal
      onUnlock(mod.key);
    }
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (!adminInput.trim()) return;
    const val = adminInput.trim();
    if (val === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      sessionStorage.setItem("flow_admin_unlocked", "true");
      setAdminPrompt(false);
      setAdminInput("");
      setAdminAttempts([]);
      logAdminAttempt(true);
      setActiveModule("admin");
    } else {
      setAdminAttempts(prev => [...prev, val]);
      setAdminInput("");
      setAdminShake(true);
      logAdminAttempt(false);
      setTimeout(() => setAdminShake(false), 500);
    }
  };

  // If showing admin settings inline
  if (activeModule === "admin") {
    return (
      <div
        style={{
          height: "100vh", display: "flex", flexDirection: "column",
          background: themes.dark.bg, color: themes.dark.text, position: "relative", overflow: "hidden",
        }}
      >
        {/* Scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(251,191,36,0.01) 2px, rgba(251,191,36,0.01) 4px)",
        }} />
        {/* CRT glow edges */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11,
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)",
        }} />
        {/* Admin content */}
        <div style={{
          flex: 1, overflow: "auto", padding: `${space[5]}px ${space[6]}px`,
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontSize: 13, lineHeight: 1.8, color: "#FBBF24",
          scrollbarWidth: "none", position: "relative", zIndex: 5,
        }}>
          <AdminSettingsView onBack={() => setActiveModule(null)} appSettings={appSettings} setAppSettings={setAppSettings} />
        </div>
      </div>
    );
  }

  // If showing an inline module (rant), render it inside the terminal shell
  if (activeModule === "rant") {
    return (
      <div
        style={{
          height: "100vh", display: "flex", flexDirection: "column",
          background: themes.dark.bg, color: themes.dark.text, position: "relative", overflow: "hidden",
        }}
      >
        {/* Scanline overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)",
        }} />
        {/* CRT glow edges */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11,
          boxShadow: "inset 0 0 80px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)",
        }} />
        {/* Rant content */}
        <div style={{
          flex: 1, overflow: "auto", padding: `${space[5]}px ${space[6]}px`,
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontSize: 13, lineHeight: 1.8, color: "#00ff41",
          scrollbarWidth: "none", position: "relative", zIndex: 5,
        }}>
          <RantView onBack={() => setActiveModule(null)} auth={auth} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={devRef}
      onClick={() => bootDone && inputRef.current?.focus()}
      style={{
        height: "100vh", display: "flex", flexDirection: "column",
        background: themes.dark.bg, color: themes.dark.text, position: "relative", overflow: "hidden",
        cursor: "text",
      }}
    >
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)",
      }} />

      {/* CRT glow edges */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11,
        boxShadow: "inset 0 0 80px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3)",
      }} />

      {/* Terminal content */}
      <div ref={terminalRef} style={{
        flex: 1, overflow: "auto", padding: `${space[5]}px ${space[6]}px`,
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 13, lineHeight: 1.8, color: "#00ff41",
        scrollbarWidth: "none", position: "relative", zIndex: 5,
      }}>

        {/* Boot sequence */}
        {bootLines.map((line, i) => (
          <div key={i} style={{
            color: line.color || "#00ff41",
            opacity: line.text ? 1 : 0,
            animation: "flow-load-fade-in 0.2s ease-out",
          }}>
            <span style={{ color: "#00ff4190", marginRight: 8 }}>$</span>
            {line.text}
          </div>
        ))}

        {/* Module list */}
        {bootDone && (
          <div style={{
            marginTop: space[4], animation: "flow-load-fade-in 0.4s ease-out",
          }}>
            <div style={{ color: "#00ff41B0", marginBottom: space[2], fontSize: 11, letterSpacing: "0.1em" }}>
              ---- DETECTED MODULES ----
            </div>
            {modules.map((mod, i) => {
              const disabled = mod.locked;
              const isAdmin = mod.adminOnly;
              const accent = isAdmin ? "#FBBF24" : "#00ff41";
              const lockedBorder = isAdmin ? "#FBBF2415" : "#ff4d6a15";
              return (
                <button
                  key={mod.key}
                  aria-label={`${mod.label} — ${disabled ? "locked" : "open"}. ${mod.desc}`}
                  aria-disabled={disabled && !isAdmin}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAdmin) { handleModuleClick(mod); return; }
                    if (disabled) { setShake(true); setTimeout(() => setShake(false), 500); return; }
                    handleModuleClick(mod);
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: `${space[2]}px ${space[3]}px`,
                    width: "100%", border: `1px solid ${disabled ? lockedBorder : `${accent}20`}`,
                    borderRadius: 4, background: "transparent",
                    cursor: (disabled && !isAdmin) ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: 13,
                    color: disabled ? `${accent}50` : accent,
                    marginBottom: space[2],
                    transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease",
                    textAlign: "left",
                    animation: `flow-load-fade-in 0.3s ease-out ${i * 100}ms both`,
                  }}
                  onMouseEnter={e => {
                    if (!disabled || isAdmin) {
                      e.currentTarget.style.background = `${accent}10`;
                      e.currentTarget.style.borderColor = `${accent}40`;
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = disabled ? lockedBorder : `${accent}20`;
                  }}
                >
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                    color: disabled ? (isAdmin ? "#FBBF24" : c.red) : accent,
                    minWidth: 70,
                  }}>
                    [{disabled ? "LOCKED" : " OPEN "}]
                  </span>
                  <span style={{ fontWeight: 600, minWidth: 120, color: disabled ? `${accent}60` : "#fff" }}>{mod.label}</span>
                  <span style={{ color: `${accent}80`, fontSize: 12 }}>{mod.desc}</span>
                  {!disabled && (
                    <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.3 }}>→</span>
                  )}
                </button>
              );
            })}

            {/* Warning message */}
            {!isUnlocked && (
              <div style={{
                marginTop: space[5], padding: `${space[3]}px ${space[4]}px`,
                border: "1px solid #ff6b3530",
                borderRadius: 4, background: "#ff6b3508",
                animation: "flow-load-fade-in 0.5s ease-out 0.3s both",
              }}>
                <div style={{ color: c.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>
                  WARNING
                </div>
                <div style={{ color: "#ff6b3590", fontSize: 12 }}>
                  {WARNING_MESSAGES[Math.min(attempts.filter(a => !a.success).length, WARNING_MESSAGES.length - 1)]}
                </div>
              </div>
            )}

            {/* Admin password prompt */}
            {adminPrompt && !adminUnlocked && (
              <div style={{
                marginTop: space[4], padding: `${space[3]}px ${space[4]}px`,
                border: "1px solid #FBBF2430",
                borderRadius: 4, background: "#FBBF2408",
                animation: "flow-load-fade-in 0.3s ease-out",
              }}>
                <div style={{ color: "#FBBF24", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", marginBottom: space[2] }}>
                  ADMIN AUTH REQUIRED
                </div>
                <div style={{ color: "#FBBF2470", fontSize: 11, marginBottom: space[2] }}>
                  This section requires a separate admin password.
                </div>
                {adminAttempts.map((a, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    <span style={{ color: "#FBBF2490" }}>$ admin --pass </span>
                    <span style={{ color: "#fff" }}>{"*".repeat(a.length)}</span>
                    <div style={{ color: c.red, fontSize: 11 }}>ACCESS DENIED.</div>
                  </div>
                ))}
                <form onSubmit={handleAdminSubmit} style={{
                  display: "flex", alignItems: "center",
                  animation: adminShake ? "shake 0.4s ease-in-out" : undefined,
                  marginTop: space[1],
                }}>
                  <span style={{ color: "#FBBF2460", marginRight: 8 }}>$ admin --pass</span>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      type="password"
                      value={adminInput}
                      onChange={e => setAdminInput(e.target.value)}
                      autoFocus
                      aria-label="Admin password"
                      onClick={e => e.stopPropagation()}
                      style={{
                        background: "transparent", border: "none", outline: "none",
                        color: "#fff", fontFamily: "inherit", fontSize: 13,
                        width: "100%", caretColor: "transparent",
                      }}
                    />
                    <span style={{
                      position: "absolute", left: `${adminInput.length}ch`, top: 0,
                      width: 8, height: 16, background: cursorBlink ? "#FBBF24" : "transparent",
                      transition: "background 0.05s",
                    }} />
                  </div>
                </form>
              </div>
            )}

            {/* Previous attempts */}
            {attempts.map((attempt, i) => (
              <div key={i} style={{
                marginTop: i === 0 ? space[4] : space[1],
                animation: "flow-load-fade-in 0.2s ease-out",
              }}>
                <span style={{ color: "#00ff4190" }}>$ auth --pass </span>
                <span style={{ color: "#fff" }}>{"*".repeat(attempt.input.length)}</span>
                {attempt.success ? (
                  <div style={{ color: "#00ff41", fontWeight: 700, marginTop: 2 }}>
                    ACCESS GRANTED. Welcome, operator.
                  </div>
                ) : (
                  <div style={{ color: c.red, marginTop: 2 }}>
                    ACCESS DENIED. Invalid credentials.
                  </div>
                )}
              </div>
            ))}

            {/* Input line */}
            {!isUnlocked && bootDone && (
              <form onSubmit={handleSubmit} style={{
                marginTop: attempts.length > 0 ? space[2] : space[4],
                display: "flex", alignItems: "center",
                animation: shake ? "shake 0.4s ease-in-out" : undefined,
              }}>
                <span style={{ color: "#00ff4190", marginRight: 8 }}>$ auth --pass</span>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    ref={inputRef}
                    type="password"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    autoFocus
                    aria-label="Terminal password"
                    style={{
                      background: "transparent", border: "none", outline: "none",
                      color: "#fff", fontFamily: "inherit", fontSize: 13,
                      width: "100%", caretColor: "transparent",
                    }}
                  />
                  {/* Custom cursor */}
                  <span style={{
                    position: "absolute", left: `${input.length}ch`, top: 0,
                    width: 8, height: 16, background: cursorBlink ? "#00ff41" : "transparent",
                    transition: "background 0.05s",
                  }} />
                </div>
              </form>
            )}

          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999,
          background: "linear-gradient(135deg, #0a0e14 0%, #111820 100%)",
          border: "1px solid #00ff4140",
          borderRadius: 12, padding: `${space[3]}px ${space[5]}px`,
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,65,0.1)",
          animation: "flow-load-fade-in 0.4s ease-out",
          fontFamily: "'SF Mono', 'Fira Code', monospace",
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "linear-gradient(135deg, #00ff41, #00cc33)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 5" stroke={c.bg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <div style={{ color: "#00ff41", fontSize: 13, fontWeight: 700 }}>
              {toast}
            </div>
            <div style={{ color: "#00ff4190", fontSize: 11, marginTop: 4 }}>
              You absolute legend.
            </div>
          </div>
        </div>
      )}

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

export default TerminalView;
