// ═══════════════════════════════════════════════════════════════
// TACTILE HOOKS — micro sound + haptic-ready feedback
// Intentional, minimal — only for critical state changes
// Uses Web Audio API for zero-latency micro sounds
// ═══════════════════════════════════════════════════════════════

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { return null; }
  }
  return audioCtx;
}

// ── Micro tones — pure sine waves, 30-50ms, very quiet ──
function playTone(freq, duration = 0.04, volume = 0.08, type = "sine") {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// ── Named tactile events ──
export const tactile = {
  // Lock commitment — satisfying confirmation
  lock: () => {
    playTone(880, 0.05, 0.06);
    setTimeout(() => playTone(1320, 0.06, 0.05), 60);
  },
  // Unlock — descending, softer
  unlock: () => {
    playTone(880, 0.04, 0.04);
    setTimeout(() => playTone(660, 0.05, 0.03), 50);
  },
  // Close/Done — single bright ping
  close: () => {
    playTone(1046, 0.06, 0.05);
  },
  // Carry — sliding tone
  carry: () => {
    playTone(660, 0.08, 0.04);
  },
  // Critical alert — attention pulse
  alert: () => {
    playTone(440, 0.06, 0.08, "square");
    setTimeout(() => playTone(440, 0.06, 0.06, "square"), 100);
  },
  // Soft click — navigation, toggle
  click: () => {
    playTone(1200, 0.02, 0.03);
  },
  // Command palette open
  cmdOpen: () => {
    playTone(800, 0.03, 0.04);
    setTimeout(() => playTone(1000, 0.03, 0.03), 40);
  },
  // Error shake
  error: () => {
    playTone(200, 0.08, 0.06, "sawtooth");
  },
};

// ── Hook for components ──
export default function useTactile() {
  return tactile;
}
