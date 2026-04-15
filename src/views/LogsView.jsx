// Flow — Logs View
// Terminal-style activity ledger showing who did what and when
// Dark Terminal exception per DESIGN_SYSTEM.md §7.18

import React, { useState, useEffect, useMemo } from "react";
import { c, typo, space, layout, motion, themes, mono } from "../styles/theme";
import { supabase } from "../lib/supabase";
import useDevLabel from "../hooks/useDevLabel";

// Terminal dark palette — consistent with TerminalView/Rant/Admin exception.
// We pin these locally so the Logs card renders correctly even when global `c`
// is the light theme (Steel & Orange).
const td = themes.dark;

const ACTION_CONFIG = {
  login:              { icon: "→", color: () => td.cyan,    label: "signed in" },
  logout:             { icon: "←", color: () => td.textDim, label: "signed out" },
  lock_commitment:    { icon: "🔒", color: () => td.green,   label: "locked commitment" },
  unlock_commitment:  { icon: "🔓", color: () => td.orange,  label: "unlocked commitment" },
  edit_commitment:    { icon: "✎", color: () => td.purple,  label: "edited commitment" },
  edit_project:       { icon: "✎", color: () => td.accent,  label: "edited project" },
  create_project:     { icon: "+", color: () => td.green,   label: "created project" },
  add_person:         { icon: "+", color: () => td.cyan,    label: "added person" },
  settings_change:    { icon: "⚙", color: () => td.orange,  label: "changed settings" },
  onboard:            { icon: "★", color: () => td.orange,  label: "joined Flow" },
  terminal_unlock:    { icon: "🔓", color: () => td.green,   label: "unlocked terminal" },
  terminal_attempt:   { icon: "⚠", color: () => td.red,     label: "failed terminal attempt" },
  admin_unlock:       { icon: "🔓", color: () => td.orange,  label: "unlocked admin" },
  admin_attempt:      { icon: "⚠", color: () => td.red,     label: "failed admin attempt" },
  edit_person:        { icon: "✎", color: () => td.cyan,    label: "edited person" },
  delete_person:      { icon: "−", color: () => td.red,     label: "deleted person" },
};

const DEFAULT_ACTION = { icon: "·", color: () => td.textDim, label: "action" };

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function LogsView() {
  const devRef = useDevLabel('Terminal-style activity ledger showing user actions chronologically');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [filterEmail, setFilterEmail] = useState("");
  const [filterAction, setFilterAction] = useState("");

  // Fetch logs
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (data) setLogs(data);
      if (error) { console.error("Failed to fetch logs:", error); setFetchError(error.message); }
      setLoading(false);
    })();

    // Real-time subscription for new logs
    const channel = supabase
      .channel("activity_log_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 500));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Unique emails for filter
  const uniqueEmails = useMemo(() =>
    [...new Set(logs.map(l => l.user_email).filter(Boolean))].sort(),
    [logs]
  );

  const uniqueActions = useMemo(() =>
    [...new Set(logs.map(l => l.action).filter(Boolean))].sort(),
    [logs]
  );

  const filtered = useMemo(() =>
    logs.filter(l =>
      (!filterEmail || l.user_email === filterEmail) &&
      (!filterAction || l.action === filterAction)
    ),
    [logs, filterEmail, filterAction]
  );

  // Group by date
  const grouped = useMemo(() => {
    const groups = {};
    for (const log of filtered) {
      const d = new Date(log.created_at);
      const key = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    return Object.entries(groups);
  }, [filtered]);

  const selectStyle = {
    padding: "6px 10px", fontSize: 11, fontFamily: mono, fontWeight: 600,
    background: td.surfaceAlt, border: `1px solid ${td.border}`, borderRadius: layout.radiusSm,
    color: td.text, outline: "none", cursor: "pointer", appearance: "none",
    paddingRight: 24, letterSpacing: "0.04em",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%236E7894' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
  };

  return (
    <div ref={devRef} style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: space[4] }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
            fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
            color: td.text,
          }}>Activity Log</div>
          <div style={{
            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
            fontWeight: 600, letterSpacing: typo.monoSm.tracking,
            color: td.textDim, marginTop: 4, fontVariantNumeric: "tabular-nums",
          }}>{filtered.length} entries · {uniqueEmails.length} users</div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          <select value={filterEmail} onChange={e => setFilterEmail(e.target.value)} aria-label="Filter by user" style={selectStyle}>
            <option value="">All users</option>
            {uniqueEmails.map(e => <option key={e} value={e} style={{ background: td.bg }}>{e}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} aria-label="Filter by action" style={selectStyle}>
            <option value="">All actions</option>
            {uniqueActions.map(a => <option key={a} value={a} style={{ background: td.bg }}>{(ACTION_CONFIG[a] || DEFAULT_ACTION).label}</option>)}
          </select>
          {(filterEmail || filterAction) && (
            <button
              onClick={() => { setFilterEmail(""); setFilterAction(""); }}
              style={{
                padding: "6px 10px", fontSize: 11, fontFamily: mono, fontWeight: 600,
                letterSpacing: "0.04em",
                background: "transparent", border: `1px solid ${td.border}`, borderRadius: layout.radiusSm,
                color: td.textDim, cursor: "pointer",
              }}
            >Clear</button>
          )}
        </div>
      </div>

      {/* Terminal-style log card (dark exception) */}
      <div style={{
        background: td.bg, border: `1px solid ${td.border}`,
        borderRadius: layout.radiusLg, overflow: "hidden",
      }}>
        {/* Terminal header — single accent dot + filename (no macOS traffic lights) */}
        <div style={{
          display: "flex", alignItems: "center", gap: space[2],
          padding: "10px 16px",
          background: td.surfaceAlt,
          borderBottom: `1px solid ${td.border}`,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: td.accent }} />
          <span style={{
            fontFamily: mono, fontSize: 11, fontWeight: 600,
            letterSpacing: "0.04em",
            color: td.textDim,
          }}>flow@logs ~ tail -f activity.log</span>
        </div>

        {/* Log entries */}
        <div style={{ padding: "8px 0", maxHeight: "calc(100vh - 280px)", minHeight: 200, overflowY: "auto" }}>
          {loading && (
            <div style={{
              padding: "20px 16px", fontFamily: mono,
              fontSize: 12, fontWeight: 600, color: td.textDim, textAlign: "center",
            }}>Loading logs...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{
              padding: "40px 16px", fontFamily: mono,
              fontSize: 12, fontWeight: 600, color: td.textDim, textAlign: "center",
            }}>{logs.length > 0 && (filterEmail || filterAction)
              ? "No logs match your filters. Try clearing them."
              : fetchError
                ? `Failed to load logs: ${fetchError}`
                : "No activity recorded yet. Actions will appear here as your team uses Flow."
            }</div>
          )}

          {grouped.map(([dateLabel, entries]) => (
            <React.Fragment key={dateLabel}>
              {/* Date separator */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 16px 4px",
              }}>
                <div style={{ height: 1, flex: 1, background: td.border }} />
                <span style={{
                  fontFamily: mono,
                  fontWeight: 700, color: td.textDim, textTransform: "uppercase",
                  letterSpacing: "0.06em", fontSize: 11,
                }}>{dateLabel}</span>
                <div style={{ height: 1, flex: 1, background: td.border }} />
              </div>

              {entries.map((log) => {
                const cfg = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
                return (
                  <div key={log.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 16px",
                    fontFamily: mono, fontSize: 11, fontWeight: 600,
                    transition: `background ${motion.instant.duration} ${motion.instant.easing}`,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = td.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Timestamp */}
                    <span style={{ color: td.textDim, flexShrink: 0, width: 72, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                      title={formatFullTime(log.created_at)}>
                      {formatTime(log.created_at)}
                    </span>

                    {/* Action icon */}
                    <span style={{
                      color: cfg.color(), flexShrink: 0, width: 18, textAlign: "center",
                      fontSize: 12,
                    }}>{cfg.icon}</span>

                    {/* User */}
                    <span style={{ color: td.cyan, flexShrink: 0, minWidth: 120, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={log.user_email}>
                      {log.user_name || log.user_email}
                    </span>

                    {/* Action badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: cfg.color(), background: `${cfg.color()}1F`,
                      padding: "2px 6px", borderRadius: layout.radiusXs, flexShrink: 0,
                    }}>{cfg.label}</span>

                    {/* Entity name */}
                    {(log.entity_id || log.entity_name) && (
                      <span style={{ color: td.text, fontWeight: 600 }}>
                        {log.entity_name || log.entity_id}
                      </span>
                    )}

                    {/* What changed */}
                    {log.details && (
                      <span style={{ color: td.textDim, opacity: 0.75 }}
                        title={JSON.stringify(log.details)}>
                        → {log.details.projects
                          ? log.details.projects
                          : Object.entries(log.details)
                              .filter(([k]) => k !== "success")
                              .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                              .join(", ")
                        }
                      </span>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}

          {/* Terminal cursor */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: td.accent }}>$</span>
              <span style={{
                width: 7, height: 14, background: td.accent,
                animation: "sync-cursor-blink 1s step-end infinite",
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
