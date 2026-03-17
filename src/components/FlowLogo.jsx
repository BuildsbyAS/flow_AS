/**
 * Flow Logo — The Gravity Well
 * 
 * Whirlpool animation with three orbiting particles (cyan, pink, green)
 * collapsing into a golden sphere with thin ring accent + specular shine.
 * 
 * Usage:
 *   <FlowLogo size={64} />
 *   <FlowLogo size={28} />
 *   <FlowLogo animated={false} />
 */

import React from "react";

const CYAN = "#00F0FF";
const PINK = "#FF2D78";
const GREEN = "#39FF14";
const GOLD = "#FFB800";
const GOLD_BRIGHT = "#FFCC33";

const KEYFRAMES = `
  @keyframes fl-s1 { 0% { transform: rotate(0deg); } 100% { transform: rotate(540deg); } }
  @keyframes fl-s2 { 0% { transform: rotate(90deg); } 100% { transform: rotate(720deg); } }
  @keyframes fl-s3 { 0% { transform: rotate(200deg); } 100% { transform: rotate(920deg); } }

  @keyframes fl-dc {
    0% { transform: translateY(-75px) scale(0); opacity: 0; }
    6% { transform: translateY(-75px) scale(1); opacity: 1; }
    62% { transform: translateY(-75px) scale(1); opacity: 1; }
    76% { transform: translateY(0px) scale(0); opacity: 0; }
    100% { transform: translateY(0px) scale(0); opacity: 0; }
  }
  @keyframes fl-dp {
    0% { transform: translateY(-58px) scale(0); opacity: 0; }
    6% { transform: translateY(-58px) scale(1); opacity: 1; }
    58% { transform: translateY(-58px) scale(1); opacity: 1; }
    72% { transform: translateY(0px) scale(0); opacity: 0; }
    100% { transform: translateY(0px) scale(0); opacity: 0; }
  }
  @keyframes fl-dg {
    0% { transform: translateY(-44px) scale(0); opacity: 0; }
    6% { transform: translateY(-44px) scale(1); opacity: 1; }
    54% { transform: translateY(-44px) scale(1); opacity: 1; }
    68% { transform: translateY(0px) scale(0); opacity: 0; }
    100% { transform: translateY(0px) scale(0); opacity: 0; }
  }

  @keyframes fl-tc {
    0% { transform: translateY(-72px) scale(0); opacity: 0; }
    9% { transform: translateY(-72px) scale(0.6); opacity: 0.15; }
    64% { transform: translateY(-72px) scale(0.6); opacity: 0.15; }
    76% { transform: translateY(0px) scale(0); opacity: 0; }
    100% { opacity: 0; }
  }
  @keyframes fl-tp {
    0% { transform: translateY(-55px) scale(0); opacity: 0; }
    9% { transform: translateY(-55px) scale(0.5); opacity: 0.12; }
    60% { transform: translateY(-55px) scale(0.5); opacity: 0.12; }
    72% { transform: translateY(0px) scale(0); opacity: 0; }
    100% { opacity: 0; }
  }
  @keyframes fl-tg {
    0% { transform: translateY(-41px) scale(0); opacity: 0; }
    9% { transform: translateY(-41px) scale(0.45); opacity: 0.1; }
    56% { transform: translateY(-41px) scale(0.45); opacity: 0.1; }
    68% { transform: translateY(0px) scale(0); opacity: 0; }
    100% { opacity: 0; }
  }

  @keyframes fl-disk { 0%,100% { opacity: 0.04; } 50% { opacity: 0.07; } }

  @keyframes fl-core {
    0%,70% { transform: scale(0); opacity: 0; }
    78% { transform: scale(1); opacity: 1; }
    92% { transform: scale(1); opacity: 1; }
    100% { transform: scale(0); opacity: 0; }
  }
`;

export default function FlowLogo({ size = 64, animated = true }) {
  if (!animated) {
    return (
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <circle cx="100" cy="100" r="32" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.35" />
        <circle cx="100" cy="100" r="24" fill={GOLD_BRIGHT} style={{ filter: `drop-shadow(0 0 10px ${GOLD})` }} />
        <circle cx="93" cy="93" r="8" fill="white" opacity="0.45" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <defs>
        <style>{KEYFRAMES}</style>
      </defs>

      {/* Accretion disk hint */}
      <ellipse cx="100" cy="100" rx="82" ry="20" fill="none" stroke="white" strokeWidth="0.6"
        style={{ animation: "fl-disk 4s ease infinite" }} />

      {/* Cyan orbit — outermost */}
      <g style={{ transformOrigin: "100px 100px", animation: "fl-s1 4s linear infinite" }}>
        <circle cx="100" cy="100" r="8" fill={CYAN} opacity="0.15"
          style={{ transformOrigin: "100px 100px", animation: "fl-tc 4s cubic-bezier(0.4,0,0.2,1) infinite" }} />
        <circle cx="100" cy="100" r="12" fill={CYAN}
          style={{ transformOrigin: "100px 100px", animation: "fl-dc 4s cubic-bezier(0.4,0,0.2,1) infinite", filter: `drop-shadow(0 0 12px ${CYAN})` }} />
      </g>

      {/* Pink orbit — middle */}
      <g style={{ transformOrigin: "100px 100px", animation: "fl-s2 4s linear infinite" }}>
        <circle cx="100" cy="100" r="7" fill={PINK} opacity="0.12"
          style={{ transformOrigin: "100px 100px", animation: "fl-tp 4s cubic-bezier(0.4,0,0.2,1) infinite" }} />
        <circle cx="100" cy="100" r="10" fill={PINK}
          style={{ transformOrigin: "100px 100px", animation: "fl-dp 4s cubic-bezier(0.4,0,0.2,1) infinite", filter: `drop-shadow(0 0 12px ${PINK})` }} />
      </g>

      {/* Green orbit — innermost */}
      <g style={{ transformOrigin: "100px 100px", animation: "fl-s3 4s linear infinite" }}>
        <circle cx="100" cy="100" r="6" fill={GREEN} opacity="0.1"
          style={{ transformOrigin: "100px 100px", animation: "fl-tg 4s cubic-bezier(0.4,0,0.2,1) infinite" }} />
        <circle cx="100" cy="100" r="10" fill={GREEN}
          style={{ transformOrigin: "100px 100px", animation: "fl-dg 4s cubic-bezier(0.4,0,0.2,1) infinite", filter: `drop-shadow(0 0 10px ${GREEN})` }} />
      </g>

      {/* Golden sphere — Ring + Shine */}
      <circle cx="100" cy="100" r="32" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.35"
        style={{ transformOrigin: "100px 100px", animation: "fl-core 4s cubic-bezier(0.16,1,0.3,1) infinite" }} />
      <circle cx="100" cy="100" r="24" fill={GOLD_BRIGHT}
        style={{ transformOrigin: "100px 100px", animation: "fl-core 4s cubic-bezier(0.16,1,0.3,1) infinite", filter: `drop-shadow(0 0 10px ${GOLD})` }} />
      <circle cx="93" cy="93" r="8" fill="white" opacity="0.45"
        style={{ transformOrigin: "100px 100px", animation: "fl-core 4s cubic-bezier(0.16,1,0.3,1) infinite" }} />
    </svg>
  );
}
