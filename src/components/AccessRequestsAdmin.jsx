// Flow — Admin queue: approve / reject pending people rows.
// Embedded inside AdminSettingsView (terminal-themed).

import React, { useEffect, useState, useCallback } from "react";
import { c, space, mono as MONO } from "../styles/theme";
import { terminal, terminalRadius } from "../styles/theme";
import { supabase } from "../lib/supabase";

const TABS = [
  { key: "pending",  label: "Pending"  },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AccessRequestsAdmin({ currentPersonId }) {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("people")
      .select("id, name, email, status, created_at, approved_at, rejected_at, squads(name), roles(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) console.error("Fetch people failed:", error);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const setStatus = async (row, newStatus) => {
    setBusyId(row.id);
    const patch = { status: newStatus };
    if (newStatus === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = currentPersonId || null;
      patch.rejected_at = null;
      patch.rejected_by = null;
    } else if (newStatus === "rejected") {
      patch.rejected_at = new Date().toISOString();
      patch.rejected_by = currentPersonId || null;
    }
    const { error } = await supabase.from("people").update(patch).eq("id", row.id);
    if (error) {
      console.error("Status update failed:", error);
      setToast(`Failed: ${error.message}`);
    } else {
      setToast(`${row.name} → ${newStatus}`);
      await fetchRows();
    }
    setBusyId(null);
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = rows.filter(r => (r.status || "pending") === tab);
  const counts = TABS.reduce((acc, t) => ({ ...acc, [t.key]: rows.filter(r => (r.status || "pending") === t.key).length }), {});

  return (
    <div style={{ marginBottom: space[5] }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: c.orange, letterSpacing: "0.1em", marginBottom: space[3] }}>
        ---- ACCESS REQUESTS ----
      </div>

      <div style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", marginBottom: space[3], lineHeight: 1.6 }}>
        Approve or reject @noon.com users who've signed in. Rejected users keep their account but can't access Flow.
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: space[4], flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? `${terminal.gold}20` : "transparent",
              border: `1px solid ${tab === t.key ? c.orange : c.border}`,
              borderRadius: terminalRadius.sm, padding: "3px 10px",
              fontFamily: MONO, fontSize: 11,
              color: tab === t.key ? c.orange : c.textDim,
              cursor: "pointer",
            }}
          >
            {t.label} ({counts[t.key] || 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${c.border}`, borderRadius: terminalRadius.md, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: space[5], textAlign: "center", color: c.textDim, fontSize: 12, fontFamily: MONO }}>
            loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: space[5], textAlign: "center", color: c.textDim, fontSize: 12, fontFamily: MONO }}>
            No {tab} requests.
          </div>
        ) : (
          filtered.map((row, i) => (
            <div
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: space[3],
                padding: `${space[3]}px ${space[4]}px`,
                borderTop: i === 0 ? "none" : `1px solid ${c.border}`,
                background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 2 }}>
                  {row.name}
                </div>
                <div style={{ fontSize: 12, color: c.textDim, fontFamily: MONO, marginBottom: 2 }}>
                  {row.email || "—"}
                </div>
                <div style={{ fontSize: 11, color: c.textDim, opacity: 0.7 }}>
                  {row.squads?.name || "no squad"} · {row.roles?.name || "no role"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                {row.status !== "approved" && (
                  <button
                    onClick={() => setStatus(row, "approved")}
                    disabled={busyId === row.id}
                    style={btn(c.green, busyId === row.id)}
                  >
                    Approve
                  </button>
                )}
                {row.status !== "rejected" && (
                  <button
                    onClick={() => setStatus(row, "rejected")}
                    disabled={busyId === row.id}
                    style={btn(c.red, busyId === row.id)}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {toast && (
        <div style={{ marginTop: space[3], fontSize: 11, fontFamily: MONO, color: c.orange }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function btn(color, disabled) {
  return {
    background: "transparent",
    border: `1px solid ${color}`,
    color,
    borderRadius: terminalRadius.sm,
    padding: "5px 12px",
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 700,
    cursor: disabled ? "wait" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.15s ease",
  };
}
