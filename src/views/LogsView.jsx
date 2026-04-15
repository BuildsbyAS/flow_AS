// Flow — Logs View
// Terminal-style activity ledger showing who did what and when

import React, { useState, useEffect, useMemo } from "react";
import { c, typo, space, layout, motion } from "../styles/theme";
import { supabase } from "../lib/supabase";
import useDevLabel from "../hooks/useDevLabel";

const ACTION_CONFIG = {
  login:              { icon: "→", color: () => c.cyan, label: "signed in" },
  logout:             { icon: "←", color: () => c.textDim, label: "signed out" },
  lock_commitment:    { icon: "🔒", color: () => c.green, label: "locked commitment" },
  unlock_commitment:  { icon: "🔓", color: () => c.orange, label: "unlocked commitment" },
  edit_commitment:    { icon: "✎", color: () => c.purple, label: "edited commitment" },
  edit_project:       { icon: "✎", color: () => c.accent, label: "edited project" },
  create_project:     { icon: "+", color: () => c.green, label: "created project" },
  add_person:         { icon: "+", color: () => c.cyan, label: "added person" },
  settings_change:    { icon: "⚙", color: () => c.orange, label: "changed settings" },
  onboard:            { icon: "★", color: () => c.orange, label: "joined Flow" },
  terminal_unlock:    { icon: "🔓", color: () => c.green, label: "unlocked terminal" },
  terminal_attempt:   { icon: "⚠", color: () => c.red, label: "failed terminal attempt" },
  admin_unlock:       { icon: "🔓", color: () => c.orange, label: "unlocked admin" },
  admin_attempt:      { icon: "⚠", color: () => c.red, label: "failed admin attempt" },
  edit_person:        { icon: "✎", color: () => c.cyan, label: "edited person" },
  delete_person:      { icon: "−", color: () => c.red, label: "deleted person" },
};

const DEFAULT_ACTION = { icon: "·", color: () => c.textDim, label: "action" };

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
    padding: "6px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 6,
    color: c.text, outline: "none", cursor: "pointer", appearance: "none",
    paddingRight: 24,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23666' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")`,
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
            color: c.text,
          }}>Activity Log</div>
          <div style={{
            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
            color: c.textDim, marginTop: 4,
          }}>{filtered.length} entries · {uniqueEmails.length} users</div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          <select value={filterEmail} onChange={e => setFilterEmail(e.target.value)} aria-label="Filter by user" style={selectStyle}>
            <option value="">All users</option>
            {uniqueEmails.map(e => <option key={e} value={e} style={{ background: c.bg }}>{e}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} aria-label="Filter by action" style={selectStyle}>
            <option value="">All actions</option>
            {uniqueActions.map(a => <option key={a} value={a} style={{ background: c.bg }}>{(ACTION_CONFIG[a] || DEFAULT_ACTION).label}</option>)}
          </select>
          {(filterEmail || filterAction) && (
            <button
              onClick={() => { setFilterEmail(""); setFilterAction(""); }}
              style={{
                padding: "6px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                background: "transparent", border: `1px solid ${c.border}`, borderRadius: 6,
                color: c.textDim, cursor: "pointer",
              }}
            >Clear</button>
          )}
        </div>
      </div>

      {/* Terminal-style log */}
      <div style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: layout.radiusMd, overflow: "hidden",
      }}>
        {/* Terminal header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "10px 16px",
          background: "rgba(0,0,0,0.02)",
          borderBottom: `1px solid ${c.border}`,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
          <span style={{
            fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: 11,
            color: c.textDim, marginLeft: 8,
          }}>flow@logs ~ tail -f activity.log</span>
        </div>

        {/* Log entries */}
        <div style={{ padding: "8px 0", maxHeight: "calc(100vh - 280px)", minHeight: 200, overflowY: "auto" }}>
          {loading && (
            <div style={{
              padding: "20px 16px", fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
              fontSize: 11, color: c.textDim, textAlign: "center",
            }}>Loading logs...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{
              padding: "40px 16px", fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
              fontSize: 12, color: c.textDim, textAlign: "center",
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
                <div style={{ height: 1, flex: 1, background: c.border }} />
                <span style={{
                  fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                  fontWeight: 700, color: c.textDim, textTransform: "uppercase",
                  letterSpacing: "0.06em", fontSize: 11,
                }}>{dateLabel}</span>
                <div style={{ height: 1, flex: 1, background: c.border }} />
              </div>

              {entries.map((log) => {
                const cfg = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
                return (
                  <div key={log.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "8px 16px",
                    fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: 11,
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Timestamp */}
                    <span style={{ color: c.textDim, flexShrink: 0, width: 72, textAlign: "right" }}
                      title={formatFullTime(log.created_at)}>
                      {formatTime(log.created_at)}
                    </span>

                    {/* Action icon */}
                    <span style={{
                      color: cfg.color(), flexShrink: 0, width: 18, textAlign: "center",
                      fontSize: 12,
                    }}>{cfg.icon}</span>

                    {/* User */}
                    <span style={{ color: c.cyan, flexShrink: 0, minWidth: 120, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={log.user_email}>
                      {log.user_name || log.user_email}
                    </span>

                    {/* Action badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: cfg.color(), background: `${cfg.color()}12`,
                      padding: "2px 6px", borderRadius: 3, flexShrink: 0,
                    }}>{cfg.label}</span>

                    {/* Entity name */}
                    {(log.entity_id || log.entity_name) && (
                      <span style={{ color: c.text, fontWeight: 500 }}>
                        {log.entity_name || log.entity_id}
                      </span>
                    )}

                    {/* What changed */}
                    {log.details && (
                      <span style={{ color: c.textDim, opacity: 0.7 }}
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
              <span style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: 11, color: c.accent }}>$</span>
              <span style={{
                width: 7, height: 14, background: c.accent,
                animation: "sync-cursor-blink 1s step-end infinite",
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
