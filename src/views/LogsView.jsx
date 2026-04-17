// Flow — Logs View
// Activity ledger showing who did what and when.
// Dark exception per DESIGN_SYSTEM.md §7.18.
//
// Layout: four-column table — Time | User | Action | What.
// - Action column uses a colored chip per verb (green=add, red=delete,
//   amber=mutation, cyan=auth, gray=low-signal).
// - Consecutive same-actor + same-action events collapse into one row
//   ("added 8 squads · T&S · AI · …") with a Show-all toggle.
// - No decorative terminal header; page uses full horizontal space.

import React, { useState, useEffect, useMemo } from "react";
import { c, typo, space, layout, motion, themes, mono } from "../styles/theme";
import { supabase } from "../lib/supabase";
import useDevLabel from "../hooks/useDevLabel";

const td = themes.dark;

// Every action maps to a verb label + chip color. The verb label is what
// renders inside the chip. Color also stripes the left edge of the row so
// you can pattern-match at scan speed.
const ACTION_CONFIG = {
  login:              { label: "signed in",               color: () => td.cyan    },
  logout:             { label: "signed out",              color: () => td.textDim },
  lock_commitment:    { label: "locked week",             color: () => td.green   },
  unlock_commitment:  { label: "unlocked week",           color: () => td.orange  },
  edit_commitment:    { label: "edited commits",          color: () => td.orange  },
  edit_project:       { label: "edited project",          color: () => td.orange  },
  create_project:     { label: "created project",         color: () => td.green   },
  add_person:         { label: "added person",            color: () => td.green   },
  delete_person:      { label: "removed person",          color: () => td.red     },
  edit_person:        { label: "edited person",           color: () => td.orange  },
  settings_change:    { label: "changed settings",        color: () => td.orange  },
  onboard:            { label: "joined Flow",             color: () => td.orange  },
  terminal_unlock:    { label: "unlocked terminal",       color: () => td.green   },
  terminal_attempt:   { label: "failed terminal attempt", color: () => td.red     },
  admin_unlock:       { label: "unlocked admin",          color: () => td.orange  },
  admin_attempt:      { label: "failed admin attempt",    color: () => td.red     },
};
const DEFAULT_ACTION = { label: "action", color: () => td.textDim };

// Split settings_change subtype off the top-level action so chip labels
// and colors match exactly (add vs delete vs rename, squad vs role).
function resolvedVerb(log) {
  if (log.action === "settings_change" && log.details?.action) {
    const sub = log.details.action;
    if (sub === "add_squad")    return { label: "added squad",     color: () => td.green  };
    if (sub === "delete_squad") return { label: "deleted squad",   color: () => td.red    };
    if (sub === "rename_squad") return { label: "renamed squad",   color: () => td.orange };
    if (sub === "add_role")     return { label: "added role",      color: () => td.green  };
    if (sub === "delete_role")  return { label: "deleted role",    color: () => td.red    };
    if (sub === "rename_role")  return { label: "renamed role",    color: () => td.orange };
  }
  return ACTION_CONFIG[log.action] || DEFAULT_ACTION;
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  const diffHr = Math.floor((now - d) / 3600000);
  const diffDay = Math.floor((now - d) / 86400000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullTime(ts) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// Describe the "What" column contents for a single log entry.
function describeWhat(log) {
  const d = log.details;
  if (log.action === "settings_change" && d?.action) {
    if (d.from && d.to) return <><b style={{ color: td.text }}>{d.from}</b> → <b style={{ color: td.text }}>{d.to}</b></>;
    if (d.name)         return <b style={{ color: td.text }}>{d.name}</b>;
  }
  if (log.entity_name || log.entity_id) {
    return <b style={{ color: td.text }}>{log.entity_name || log.entity_id}</b>;
  }
  if (d && typeof d === "object") {
    const pairs = Object.entries(d).filter(([k]) => k !== "success" && k !== "action");
    if (pairs.length === 0) return null;
    return (
      <span title={JSON.stringify(d)} style={{ color: td.textDim }}>
        {pairs.map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ")}
      </span>
    );
  }
  return null;
}

// Batch consecutive rows that share actor + verb within a 2-minute window.
// A run of ≥3 collapses to one "N items" row; anything under 3 stays as-is.
const BATCH_WINDOW_MS = 2 * 60 * 1000;
function batchEntries(entries) {
  const out = [];
  let i = 0;
  while (i < entries.length) {
    const head = entries[i];
    const vKey = head.action === "settings_change" ? `${head.action}:${head.details?.action || ""}` : head.action;
    const aKey = head.user_name || head.user_email;
    let j = i + 1;
    while (j < entries.length) {
      const n = entries[j];
      const nv = n.action === "settings_change" ? `${n.action}:${n.details?.action || ""}` : n.action;
      const na = n.user_name || n.user_email;
      const within = Math.abs(new Date(head.created_at) - new Date(n.created_at)) <= BATCH_WINDOW_MS;
      if (nv === vKey && na === aKey && within) j++;
      else break;
    }
    if (j - i >= 3) out.push({ type: "batch", logs: entries.slice(i, j) });
    else for (let k = i; k < j; k++) out.push({ type: "single", log: entries[k] });
    i = j;
  }
  return out;
}

export default function LogsView() {
  const devRef = useDevLabel("Activity ledger of user actions across Flow");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [filterEmail, setFilterEmail] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [expandedBatch, setExpandedBatch] = useState({});

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
    const channel = supabase
      .channel("activity_log_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 500));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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

  const grouped = useMemo(() => {
    const groups = {};
    for (const log of filtered) {
      const d = new Date(log.created_at);
      const key = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    }
    return Object.entries(groups).map(([k, v]) => [k, batchEntries(v)]);
  }, [filtered]);

  const selectStyle = {
    padding: "6px 10px", fontSize: 12, fontFamily: mono, fontWeight: 600,
    background: td.surfaceAlt, border: `1px solid ${td.border}`, borderRadius: layout.radiusSm,
    color: td.text, outline: "none", cursor: "pointer", appearance: "none",
    paddingRight: 24, letterSpacing: "0.04em",
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%236E7894' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
  };

  // Column template: Time | User | Action chip | What | Expand (only rendered for batches)
  const COL_TEMPLATE = "90px 200px 200px 1fr 80px";

  const ActionChip = ({ cfg }) => (
    <span style={{
      display: "inline-block",
      fontFamily: mono, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
      color: cfg.color(), background: `${cfg.color()}1f`,
      padding: "3px 8px", borderRadius: layout.radiusXs,
      whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );

  const SingleRow = ({ log }) => {
    const cfg = resolvedVerb(log);
    const color = cfg.color();
    return (
      <div style={{
        display: "grid", gridTemplateColumns: COL_TEMPLATE,
        alignItems: "center", gap: space[3],
        padding: `10px ${space[4]}px 10px ${space[4] - 3}px`,
        borderLeft: `3px solid ${color}`,
        fontFamily: typo.bodyMd.font, fontSize: 13,
        transition: `background ${motion.instant.duration} ${motion.instant.easing}`,
      }}
        onMouseEnter={e => e.currentTarget.style.background = td.surfaceAlt}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{ color: td.textDim, fontFamily: mono, fontSize: 11, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
          title={formatFullTime(log.created_at)}>
          {formatTime(log.created_at)}
        </span>
        <span style={{ color: td.cyan, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={log.user_email}>
          {log.user_name || log.user_email || "anonymous"}
        </span>
        <span><ActionChip cfg={cfg} /></span>
        <span style={{ color: td.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {describeWhat(log)}
        </span>
        <span />
      </div>
    );
  };

  const BatchRow = ({ logs: groupLogs, groupKey }) => {
    const head = groupLogs[0];
    const cfg = resolvedVerb(head);
    const color = cfg.color();
    const expanded = !!expandedBatch[groupKey];
    const names = groupLogs
      .map(l => l.details?.name || l.details?.to || l.entity_name || l.entity_id)
      .filter(Boolean);
    const preview = names.slice(0, 5).join(" · ");
    const extra = Math.max(0, names.length - 5);
    return (
      <div style={{
        borderLeft: `3px solid ${color}`,
        transition: `background ${motion.instant.duration} ${motion.instant.easing}`,
      }}
        onMouseEnter={e => e.currentTarget.style.background = td.surfaceAlt}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{
          display: "grid", gridTemplateColumns: COL_TEMPLATE,
          alignItems: "center", gap: space[3],
          padding: `10px ${space[4]}px 10px ${space[4] - 3}px`,
          fontFamily: typo.bodyMd.font, fontSize: 13,
        }}>
          <span style={{ color: td.textDim, fontFamily: mono, fontSize: 11, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
            title={`${formatFullTime(groupLogs[groupLogs.length - 1].created_at)} → ${formatFullTime(head.created_at)}`}>
            {formatTime(head.created_at)}
          </span>
          <span style={{ color: td.cyan, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title={head.user_email}>
            {head.user_name || head.user_email || "anonymous"}
          </span>
          <span><ActionChip cfg={cfg} /></span>
          <span style={{ color: td.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b style={{ color: td.text }}>{groupLogs.length} items</b>
            {preview && <span style={{ color: td.textDim, marginLeft: 8 }}>· {preview}{extra > 0 ? ` · +${extra}` : ""}</span>}
          </span>
          <button onClick={() => setExpandedBatch(s => ({ ...s, [groupKey]: !s[groupKey] }))}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: td.textDim, fontFamily: mono, fontSize: 11, fontWeight: 600,
              padding: 0, letterSpacing: "0.04em", textAlign: "right",
            }}>
            {expanded ? "Hide" : "Show all"}
          </button>
        </div>
        {expanded && (
          <div style={{ padding: `0 ${space[4]}px ${space[3]}px calc(${space[4]}px + 90px + ${space[3]}px - 3px)` }}>
            {groupLogs.map(l => (
              <div key={l.id} style={{
                display: "grid", gridTemplateColumns: "90px 1fr",
                columnGap: space[3], alignItems: "baseline",
                padding: "2px 0",
                fontFamily: typo.bodyMd.font, fontSize: 12,
              }}>
                <span style={{ color: td.textDim, fontFamily: mono, fontSize: 11, fontVariantNumeric: "tabular-nums" }}
                  title={formatFullTime(l.created_at)}>
                  {formatTime(l.created_at)}
                </span>
                <span style={{ color: td.text }}>
                  {l.details?.from && l.details?.to
                    ? <><span style={{ color: td.textDim }}>{l.details.from}</span> → <b>{l.details.to}</b></>
                    : (l.details?.name || l.entity_name || l.entity_id || "—")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={devRef} style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: space[4] }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap" }}>
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
          }}>{filtered.length} {filtered.length === 1 ? "entry" : "entries"} · {uniqueEmails.length} {uniqueEmails.length === 1 ? "user" : "users"}</div>
        </div>

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
                padding: "6px 10px", fontSize: 12, fontFamily: mono, fontWeight: 600,
                letterSpacing: "0.04em",
                background: "transparent", border: `1px solid ${td.border}`, borderRadius: layout.radiusSm,
                color: td.textDim, cursor: "pointer",
              }}
            >Clear</button>
          )}
        </div>
      </div>

      {/* Log card — dark exception. No decorative terminal header. */}
      <div style={{
        background: td.bg, border: `1px solid ${td.border}`,
        borderRadius: layout.radiusLg, overflow: "hidden",
      }}>
        {/* Column headers */}
        {!loading && filtered.length > 0 && (
          <div style={{
            display: "grid", gridTemplateColumns: COL_TEMPLATE,
            alignItems: "center", gap: space[3],
            padding: `10px ${space[4]}px`,
            borderBottom: `1px solid ${td.border}`,
            background: td.surfaceAlt,
            fontFamily: mono, fontSize: 11, fontWeight: 700,
            color: td.textDim, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            <span>Time</span>
            <span>User</span>
            <span>Action</span>
            <span>What</span>
            <span />
          </div>
        )}

        <div style={{ maxHeight: "calc(100vh - 260px)", minHeight: 200, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: "20px 16px", fontFamily: mono, fontSize: 12, fontWeight: 600, color: td.textDim, textAlign: "center" }}>
              Loading logs...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: "40px 16px", fontFamily: mono, fontSize: 12, fontWeight: 600, color: td.textDim, textAlign: "center" }}>
              {logs.length > 0 && (filterEmail || filterAction)
                ? "No logs match your filters. Try clearing them."
                : fetchError
                  ? `Failed to load logs: ${fetchError}`
                  : "No activity recorded yet."}
            </div>
          )}

          {grouped.map(([dateLabel, rows], di) => (
            <React.Fragment key={dateLabel}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: `${di === 0 ? 6 : 14}px 16px 4px`,
              }}>
                <div style={{ height: 1, flex: 1, background: td.border }} />
                <span style={{
                  fontFamily: mono, fontWeight: 700, color: td.textDim,
                  textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11,
                }}>{dateLabel}</span>
                <div style={{ height: 1, flex: 1, background: td.border }} />
              </div>

              {rows.map(row =>
                row.type === "batch"
                  ? <BatchRow key={`${dateLabel}-${row.logs[0].id}`} logs={row.logs} groupKey={`${dateLabel}-${row.logs[0].id}`} />
                  : <SingleRow key={row.log.id} log={row.log} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
