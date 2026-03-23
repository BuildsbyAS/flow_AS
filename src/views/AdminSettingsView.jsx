// Flow — Admin Settings View (Real Settings)
// Admin-only panel inside TerminalView for replying to rants, changing status, etc.
import React, { useState, useEffect, useCallback } from "react";
import { space } from "../styles/theme";
import { supabase } from "../lib/supabase";

const MONO = "'SF Mono', 'Fira Code', 'Cascadia Code', monospace";

const CATEGORIES = [
  { key: "feature", label: "Feature Request", icon: "✦", color: "#A78BFA" },
  { key: "bug", label: "Bug Report", icon: "⚠", color: "#FF6B35" },
  { key: "rant", label: "General Rant", icon: "🔥", color: "#FF2D78" },
];

const STATUSES = [
  { key: "pending", label: "Pending", color: "#FBBF24", icon: "◷" },
  { key: "approved", label: "Approved", color: "#84FF95", icon: "✓" },
  { key: "rejected", label: "Rejected", color: "#FF4D6A", icon: "✗" },
  { key: "shipped", label: "Shipped", color: "#22D3EE", icon: "🚀" },
];

const timeAgo = (ts) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function AdminSettingsView({ onBack, appSettings = {}, setAppSettings }) {
  const [rants, setRants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [gaWeeks, setGaWeeks] = useState(appSettings.ga_visibility_weeks || "2");
  const [gaSaving, setGaSaving] = useState(false);
  const [gaToast, setGaToast] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchRants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRants(data || []);
    } catch (err) {
      console.error("Failed to fetch rants:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRants(); }, [fetchRants]);

  const handleGaSave = async () => {
    const val = parseInt(gaWeeks, 10);
    if (isNaN(val) || val < 0) return;
    setGaSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "ga_visibility_weeks", value: String(val), updated_at: new Date().toISOString() });
      if (error) throw error;
      if (setAppSettings) setAppSettings(prev => ({ ...prev, ga_visibility_weeks: String(val) }));
      setGaToast("Saved");
      setTimeout(() => setGaToast(null), 2500);
    } catch (err) {
      console.error("GA settings save failed:", err);
      setGaToast("Failed to save");
      setTimeout(() => setGaToast(null), 3000);
    } finally {
      setGaSaving(false);
    }
  };

  const openRant = (r) => {
    setSelected(r);
    setReplyText(r.admin_note || "");
    setNewStatus(r.status || "pending");
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("rants")
        .update({ admin_note: replyText.trim() || null, status: newStatus })
        .eq("id", selected.id);
      if (error) throw error;
      // Update local state
      setRants(prev => prev.map(r => r.id === selected.id ? { ...r, admin_note: replyText.trim() || null, status: newStatus } : r));
      setSelected(prev => ({ ...prev, admin_note: replyText.trim() || null, status: newStatus }));
      setToast("Saved");
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error("Save failed:", err);
      setToast("Failed to save");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const filteredRants = filterStatus === "all" ? rants : rants.filter(r => (r.status || "pending") === filterStatus);

  // ── Detail view ──
  if (selected) {
    const cat = CATEGORIES.find(cc => cc.key === selected.category) || CATEGORIES[0];
    const st = STATUSES.find(s => s.key === (selected.status || "pending")) || STATUSES[0];

    return (
      <div style={{ animation: "flow-load-fade-in 0.3s ease-out" }}>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: "transparent", border: "none", color: "#FBBF24",
            fontFamily: MONO, fontSize: 12, cursor: "pointer", padding: 0,
            marginBottom: space[4], display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>←</span> back to rants
        </button>

        {/* Rant content */}
        <div style={{
          border: "1px solid #FBBF2420", borderRadius: 6, padding: space[4],
          background: "#FBBF2405", marginBottom: space[4],
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: space[2] }}>
            <span style={{ fontSize: 11, color: cat.color, padding: "2px 8px", border: `1px solid ${cat.color}40`, borderRadius: 3 }}>
              {cat.icon} {cat.label}
            </span>
            <span style={{ fontSize: 11, color: st.color, padding: "2px 8px", border: `1px solid ${st.color}40`, borderRadius: 3 }}>
              {st.icon} {st.label}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{selected.title}</div>
          <div style={{ fontSize: 11, color: "#FBBF2460", marginBottom: space[3] }}>
            by {selected.user_name} · {timeAgo(selected.created_at)} · ID: {selected.id.slice(0, 8)}
          </div>
          {selected.body && (
            <div style={{ fontSize: 13, color: "#ffffffbb", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {selected.body}
            </div>
          )}
          {selected.image_url && (
            <img src={selected.image_url} alt="attachment" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 6, border: "1px solid #FBBF2420", marginTop: space[3] }} />
          )}
        </div>

        {/* Admin controls */}
        <div style={{
          border: "1px solid #FBBF2425", borderRadius: 6, padding: space[4],
          background: "#FBBF2408",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#FBBF24", letterSpacing: "0.08em", marginBottom: space[3] }}>
            ADMIN CONTROLS
          </div>

          {/* Status selector */}
          <div style={{ marginBottom: space[3] }}>
            <div style={{ fontSize: 11, color: "#FBBF2480", marginBottom: space[1] }}>Status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUSES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setNewStatus(s.key)}
                  style={{
                    background: newStatus === s.key ? `${s.color}20` : "transparent",
                    border: `1px solid ${newStatus === s.key ? s.color : "#ffffff15"}`,
                    borderRadius: 4, padding: "4px 12px",
                    fontFamily: MONO, fontSize: 11, color: newStatus === s.key ? s.color : "#ffffff60",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reply text */}
          <div style={{ marginBottom: space[3] }}>
            <div style={{ fontSize: 11, color: "#FBBF2480", marginBottom: space[1] }}>Admin Reply</div>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a response visible to the person who submitted..."
              rows={4}
              style={{
                width: "100%", background: "#0a0e14", border: "1px solid #FBBF2420",
                borderRadius: 4, padding: space[2],
                fontFamily: MONO, fontSize: 12, color: "#fff",
                resize: "vertical", outline: "none",
                lineHeight: 1.6,
              }}
              onFocus={e => e.target.style.borderColor = "#FBBF2450"}
              onBlur={e => e.target.style.borderColor = "#FBBF2420"}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "#FBBF24", color: "#0a0e14", border: "none",
              borderRadius: 4, padding: "8px 24px",
              fontFamily: MONO, fontSize: 12, fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, background: "#0a0e14", border: "1px solid #FBBF2440",
            borderRadius: 8, padding: `${space[2]}px ${space[4]}px`,
            fontFamily: MONO, fontSize: 12, color: "#FBBF24", fontWeight: 700,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            animation: "flow-load-fade-in 0.3s ease-out",
          }}>
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div style={{ animation: "flow-load-fade-in 0.3s ease-out" }}>
      <button
        onClick={onBack}
        style={{
          background: "transparent", border: "none", color: "#FBBF24",
          fontFamily: MONO, fontSize: 12, cursor: "pointer", padding: 0,
          marginBottom: space[4], display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <span style={{ fontSize: 14 }}>←</span> back to terminal
      </button>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#FBBF24", letterSpacing: "0.1em", marginBottom: space[3] }}>
        ---- ADMIN SETTINGS ----
      </div>

      {/* GA Visibility Control */}
      <div style={{
        border: "1px solid #FBBF2420", borderRadius: 6, padding: space[4],
        background: "#FBBF2405", marginBottom: space[5],
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#FBBF24", letterSpacing: "0.08em", marginBottom: space[3] }}>
          GA VISIBILITY IN PULSE
        </div>
        <div style={{ fontSize: 12, color: "#ffffff80", marginBottom: space[3], lineHeight: 1.6 }}>
          Projects in GA phase auto-hide from Pulse after this many weeks.
          They remain visible in Projects view.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number"
            min="0"
            max="52"
            value={gaWeeks}
            onChange={e => setGaWeeks(e.target.value)}
            style={{
              width: 64, background: "#0a0e14", border: "1px solid #FBBF2430",
              borderRadius: 4, padding: "6px 10px",
              fontFamily: MONO, fontSize: 13, color: "#fff",
              textAlign: "center", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor = "#FBBF24"}
            onBlur={e => e.target.style.borderColor = "#FBBF2430"}
          />
          <span style={{ fontSize: 12, color: "#ffffff60", fontFamily: MONO }}>weeks</span>
          <button
            onClick={handleGaSave}
            disabled={gaSaving}
            style={{
              background: "#FBBF24", color: "#0a0e14", border: "none",
              borderRadius: 4, padding: "6px 16px", marginLeft: 8,
              fontFamily: MONO, fontSize: 11, fontWeight: 700,
              cursor: gaSaving ? "wait" : "pointer",
              opacity: gaSaving ? 0.5 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {gaSaving ? "..." : "Save"}
          </button>
          {gaToast && (
            <span style={{ fontSize: 11, color: gaToast === "Saved" ? "#84FF95" : "#FF4D6A", fontFamily: MONO, marginLeft: 8 }}>
              {gaToast}
            </span>
          )}
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: "#FBBF24", letterSpacing: "0.1em", marginBottom: space[3] }}>
        ---- RANT ADMIN ----
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: space[4], flexWrap: "wrap" }}>
        <button
          onClick={() => setFilterStatus("all")}
          style={{
            background: filterStatus === "all" ? "#FBBF2420" : "transparent",
            border: `1px solid ${filterStatus === "all" ? "#FBBF24" : "#ffffff15"}`,
            borderRadius: 4, padding: "3px 10px",
            fontFamily: MONO, fontSize: 11,
            color: filterStatus === "all" ? "#FBBF24" : "#ffffff50",
            cursor: "pointer",
          }}
        >
          All ({rants.length})
        </button>
        {STATUSES.map(s => {
          const count = rants.filter(r => (r.status || "pending") === s.key).length;
          return (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              style={{
                background: filterStatus === s.key ? `${s.color}20` : "transparent",
                border: `1px solid ${filterStatus === s.key ? s.color : "#ffffff15"}`,
                borderRadius: 4, padding: "3px 10px",
                fontFamily: MONO, fontSize: 11,
                color: filterStatus === s.key ? s.color : "#ffffff50",
                cursor: "pointer",
              }}
            >
              {s.icon} {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Rant list */}
      {loading ? (
        <div style={{ color: "#FBBF2460", fontSize: 12 }}>Loading rants...</div>
      ) : filteredRants.length === 0 ? (
        <div style={{ color: "#FBBF2440", fontSize: 12 }}>No rants found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredRants.map(r => {
            const cat = CATEGORIES.find(cc => cc.key === r.category) || CATEGORIES[0];
            const st = STATUSES.find(s => s.key === (r.status || "pending")) || STATUSES[0];
            const hasReply = !!r.admin_note;
            return (
              <button
                key={r.id}
                onClick={(e) => { e.stopPropagation(); openRant(r); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: `${space[2]}px ${space[3]}px`,
                  width: "100%", border: `1px solid #FBBF2412`,
                  borderRadius: 4, background: "transparent",
                  cursor: "pointer", fontFamily: MONO, fontSize: 12,
                  color: "#fff", textAlign: "left",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#FBBF2410"; e.currentTarget.style.borderColor = "#FBBF2430"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#FBBF2412"; }}
              >
                <span style={{ fontSize: 11, color: st.color, minWidth: 20, textAlign: "center" }}>{st.icon}</span>
                <span style={{ fontSize: 12, color: cat.color, minWidth: 14 }}>{cat.icon}</span>
                <span style={{ flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.title}
                </span>
                {hasReply && (
                  <span style={{ fontSize: 10, color: "#FBBF24", opacity: 0.6 }}>replied</span>
                )}
                <span style={{ fontSize: 11, color: "#ffffff30", minWidth: 50, textAlign: "right" }}>{timeAgo(r.created_at)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
