import React from "react";
import { c, typo, layout, space } from "../styles/theme";
import { KbdHint } from "./shared";
import useDevLabel from "../hooks/useDevLabel";

/**
 * ShortcutHintBar — fixed bar at bottom showing contextual keyboard shortcuts.
 * Props:
 *   activeTab    — current tab key
 *   hasDetail    — true when a view is in detail mode
 *   isLocked     — true when Commit tab is locked
 *   visible      — controlled visibility
 */
const ShortcutHintBar = ({ activeTab, hasDetail, isLocked, visible }) => {
  const devRef = useDevLabel("ShortcutHintBar", "Fixed bottom bar showing contextual keyboard shortcuts");
  if (!visible) return null;

  // Build contextual hints
  const hints = [];

  // Global hints always shown
  hints.push({ keys: "1–6", label: "Tabs" });

  if (hasDetail) {
    hints.push({ keys: "Esc", label: "Back" });
  }

  // Per-tab hints
  if (activeTab === "pulse") {
    hints.push({ keys: "↑↓", label: "Navigate" });
    hints.push({ keys: "↵", label: "Expand" });
  } else if (activeTab === "commit") {
    if (hasDetail) {
      hints.push({ keys: "↑↓", label: "Commits" });
      if (!isLocked) {
        hints.push({ keys: "L", label: "Lock" });
      } else {
        hints.push({ keys: "U", label: "Unlock" });
        hints.push({ keys: "F", label: "Finish" });
      }
    } else {
      hints.push({ keys: "↑↓", label: "Navigate" });
      hints.push({ keys: "↵", label: "Open" });
    }
  } else if (activeTab === "projects" || activeTab === "people") {
    if (!hasDetail) {
      hints.push({ keys: "↑↓", label: "Navigate" });
      hints.push({ keys: "↵", label: "Open" });
    }
  } else if (activeTab === "settings") {
    hints.push({ keys: "←→", label: "Sub-tabs" });
  }

  hints.push({ keys: "T", label: "Terminal" });
  hints.push({ keys: "/", label: "Search" });
  hints.push({ keys: "?", label: "Hide hints" });

  return (
    <div ref={devRef} style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", gap: space[2],
      padding: `${space[2]}px ${space[5]}px`,
      background: c.surfaceSolid,
      borderTop: `1px solid ${c.border}`,
    }}>
      {hints.map((h, i) => (
        <KbdHint key={i} keys={[h.keys]} label={h.label} style={{ marginRight: space[2] }} />
      ))}
    </div>
  );
};

export default ShortcutHintBar;
