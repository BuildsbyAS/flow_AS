import React from "react";
import { c, body, mono } from "../styles/theme";

/**
 * ShortcutHintBar — fixed bar at bottom showing contextual keyboard shortcuts.
 * Props:
 *   activeTab    — current tab key
 *   hasDetail    — true when a view is in detail mode
 *   isLocked     — true when Focus tab is locked
 *   visible      — controlled visibility
 */
const ShortcutHintBar = ({ activeTab, hasDetail, isLocked, visible }) => {
  if (!visible) return null;

  // Build contextual hints
  const hints = [];

  // Global hints always shown
  hints.push({ keys: "1–5", label: "Tabs" });
  hints.push({ keys: "D", label: "Theme" });

  if (hasDetail) {
    hints.push({ keys: "Esc", label: "Back" });
  }

  // Per-tab hints
  if (activeTab === "pulse") {
    hints.push({ keys: "↑↓", label: "Navigate" });
    hints.push({ keys: "↵", label: "Expand" });
    hints.push({ keys: "S", label: "Ship view" });
    hints.push({ keys: "C", label: "Clear filters" });
  } else if (activeTab === "focus") {
    if (hasDetail) {
      hints.push({ keys: "↑↓", label: "Commitments" });
      if (!isLocked) {
        hints.push({ keys: "L", label: "Lock" });
      } else {
        hints.push({ keys: "U", label: "Unlock" });
      }
    } else {
      hints.push({ keys: "↑↓", label: "Navigate" });
      hints.push({ keys: "↵", label: "Open" });
    }
  } else if (activeTab === "projects" || activeTab === "people") {
    if (hasDetail) {
      // no extra shortcuts in detail other than Esc
    } else {
      hints.push({ keys: "↑↓", label: "Navigate" });
      hints.push({ keys: "↵", label: "Open" });
      hints.push({ keys: "C", label: "Clear filters" });
    }
  } else if (activeTab === "settings") {
    hints.push({ keys: "←→", label: "Sub-tabs" });
  }

  hints.push({ keys: "/", label: "Search" });
  hints.push({ keys: "?", label: "Hide hints" });

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      padding: "8px 20px",
      background: c.surfaceSolid,
      borderTop: `1px solid ${c.border}`,
      opacity: 0.9,
    }}>
      {hints.map((h, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <kbd style={{
            fontFamily: mono, fontSize: 10, fontWeight: 600, color: c.textMid,
            background: c.surfaceAlt, border: `1px solid ${c.border}`,
            padding: "2px 7px", borderRadius: 4, lineHeight: 1.4,
            boxShadow: `0 1px 0 ${c.border}`,
          }}>{h.keys}</kbd>
          <span style={{ fontFamily: body, fontSize: 10, color: c.textDim, marginRight: 6 }}>{h.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ShortcutHintBar;
