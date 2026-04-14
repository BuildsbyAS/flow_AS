/**
 * Flow Logo — Steel & Orange
 *
 * Static orange dot mark per DESIGN_SYSTEM.md §7.1:
 * 9px circle (scaled to `size`) in accent color with a soft accentGlow halo.
 *
 * Usage:
 *   <FlowLogo size={28} />
 */

import React from "react";
import useDevLabel from "../hooks/useDevLabel";

const ACCENT = "#E8590C";
const ACCENT_GLOW = "rgba(232,89,12,0.25)";

export default function FlowLogo({ size = 28, animated = true }) {
  const devRef = useDevLabel("FlowLogo", "Static orange accent dot with soft glow halo");
  // `animated` kept in API for call-site compatibility; a gentle halo pulses.
  const cls = animated ? "flow-accent-pulse" : undefined;
  return (
    <svg ref={devRef} viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      {/* Soft halo */}
      <circle cx="20" cy="20" r="14" fill={ACCENT_GLOW} className={cls} />
      {/* Solid accent dot */}
      <circle cx="20" cy="20" r="8" fill={ACCENT} />
      {/* Faint specular highlight for depth */}
      <circle cx="17.5" cy="17" r="2.5" fill="#FFFFFF" opacity="0.35" />
    </svg>
  );
}
