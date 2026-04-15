import React from "react";
import { c, typo, layout, space } from "../styles/theme";
import useDevLabel from "../hooks/useDevLabel";

/**
 * ShortcutHintBar — fixed bar at bottom showing contextual keyboard shortcuts.
 * Steel & Orange: flat inset kbd pills, neutral border dots, no glow.
 *
 * Props:
 *   activeTab    — current tab key
 *   hasDetail    — true when a view is in detail mode
 *   isLocked     — true when Commit tab is locked
 *   visible      — controlled visibility
 */
const ShortcutHintBar = ({ activeTab, hasDetail, isLocked, visible }) => {
  const devRef = useDevLabel("ShortcutHintBar", "Fixed bottom bar showing contextual keyboard shortcuts");
  if (!visible) return null;

  const hints = [];

  hints.push({ keys: "1–6", label: "Tabs" });

  if (hasDetail) {
    hints.push({ keys: "Esc", label: "Back" });
  }

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

  const kbdStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    minWidth: 18,
    background: c.surfaceAlt,
    border: `1px solid ${c.border}`,
    borderRadius: layout.radiusXs,
    padding: "1px 6px",
    fontFamily: typo.monoSm.font,
    fontSize: typo.monoSm.size, // 11px
    fontWeight: 600,
    letterSpacing: typo.monoSm.tracking,
    color: c.textDim,
    lineHeight: 1.4,
  };

  const labelStyle = {
    fontFamily: typo.bodyXs.font,
    fontSize: typo.bodyXs.size, // 12px
    fontWeight: 500,
    color: c.textDim,
    marginLeft: space[1],
  };

  return (
    <div ref={devRef} style={{
      position: "fixed", bottom: space[2], left: "50%",
      transform: "translateX(-50%)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: space[3],
      padding: `${space[2]}px ${space[4]}px`,
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: layout.radiusSm,
      boxShadow: c.shadowCard,
    }}>
      {hints.map((h, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span aria-hidden style={{
              width: 3, height: 3, borderRadius: "50%",
              background: c.border,
              flexShrink: 0,
            }} />
          )}
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            <span style={kbdStyle}>{h.keys}</span>
            {h.label && <span style={labelStyle}>{h.label}</span>}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ShortcutHintBar;
