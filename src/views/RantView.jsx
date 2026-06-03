// Flow — Rant View (inline content, no shell)
// Feature requests / bug reports — rendered inside TerminalView
import React, { useState, useEffect, useCallback, useRef } from "react";
import { space, terminal, terminalRadius } from "../styles/theme";
import { supabase } from "../lib/supabase";
import useDevLabel from "../hooks/useDevLabel";
import { Icon } from "../components/icons";

const CATEGORIES = [
  { key: "feature", label: "Feature Request", icon: "feature", color: terminal.purple },
  { key: "bug", label: "Bug Report", icon: "alert-triangle", color: terminal.coral },
  { key: "rant", label: "General Rant", icon: "flame", color: terminal.pink },
];

const STATUS_CONFIG = {
  pending:  { label: "Pending", color: terminal.gold, icon: "◷" },
  approved: { label: "Approved", color: terminal.success, icon: "✓" },
  rejected: { label: "Rejected", color: terminal.red, icon: "✗" },
  shipped:  { label: "Shipped", color: terminal.cyan, icon: "rocket" },
};

// Icon-name values render as SVG; geometric/check glyphs stay as text.
const ICON_NAMES = new Set(["feature", "alert-triangle", "flame", "rocket"]);
const glyph = (g, size = 13) => ICON_NAMES.has(g) ? <Icon name={g} size={size} /> : g;

const MONO = "'Geist', system-ui, sans-serif";

export default function RantView({ onBack, auth }) {
  const devRef = useDevLabel('Feature request and bug report submission with list and detail views');
  const [rants, setRants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "new" | "detail"
  const [selectedRant, setSelectedRant] = useState(null);

  // New rant form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("feature");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // ── Fetch rants ──
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
      setToast({ type: "error", msg: "Failed to load rants — the table may not exist yet" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRants(); }, [fetchRants]);

  // ── Image preview ──
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setToast({ type: "error", msg: "Image must be under 5MB" });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Submit rant ──
  const handleSubmit = async () => {
    if (submitting) return;
    if (!title.trim()) {
      setToast({ type: "error", msg: "Give your rant a title" });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      // Use auth prop (Flow profile name) first, then session, then fallback
      let userName = auth?.personProfile?.name
        || user?.user_metadata?.full_name
        || user?.email
        || "anonymous";
      let userEmail = user?.email || auth?.user?.email || "anonymous";

      // If we have a session but no auth prop, try fetching profile
      if (!auth?.personProfile?.name && user?.id) {
        const { data: profile } = await supabase
          .from("people")
          .select("name")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (profile?.name) userName = profile.name;
      }

      let imageUrl = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `rants/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("rant-images")
          .upload(path, imageFile, { cacheControl: "3600", upsert: false });
        if (uploadErr) {
          console.warn("Image upload failed:", uploadErr);
          setToast({ type: "error", msg: "Image upload failed — submitting without it" });
          setTimeout(() => setToast(null), 4000);
        } else {
          const { data: urlData } = supabase.storage
            .from("rant-images")
            .getPublicUrl(path);
          imageUrl = urlData?.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from("rants")
        .insert({
          user_email: userEmail,
          user_name: userName,
          title: title.trim(),
          body: body.trim() || null,
          image_url: imageUrl,
          category,
        })
        .select()
        .single();

      if (error) throw error;

      setToast({ type: "success", msg: `Rant submitted — ID: ${data.id?.toString().slice(0, 8) || "?"}` });
      setTimeout(() => setToast(null), 4000);

      setTitle("");
      setBody("");
      setCategory("feature");
      removeImage();
      setView("list");
      fetchRants();
    } catch (err) {
      console.error("Submit failed:", err);
      setToast({ type: "error", msg: "Failed to submit. Try again." });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

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

  // ── Render detail ──
  const renderDetail = () => {
    if (!selectedRant) return null;
    const r = selectedRant;
    const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
    const cat = CATEGORIES.find(c => c.key === r.category) || CATEGORIES[0];

    return (
      <div style={{ animation: "flow-load-fade-in 0.3s ease-out" }}>
        <button
          onClick={() => { setView("list"); setSelectedRant(null); }}
          style={{
            background: "transparent", border: "none", color: terminal.green,
            fontFamily: MONO, fontSize: 12, cursor: "pointer", padding: 0,
            marginBottom: space[4], display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>←</span> back to rants
        </button>

        <div style={{
          border: `1px solid ${terminal.green}20`, borderRadius: terminalRadius.md, padding: space[5],
          background: `${terminal.green}05`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: space[3] }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
              color: status.color, padding: "3px 10px",
              border: `1px solid ${status.color}40`, borderRadius: terminalRadius.sm,
            }}>
              {glyph(status.icon)} {status.label.toUpperCase()}
            </span>
            <span style={{
              fontSize: 11, color: cat.color, padding: "3px 10px",
              border: `1px solid ${cat.color}40`, borderRadius: terminalRadius.sm,
            }}>
              {glyph(cat.icon)} {cat.label}
            </span>
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: terminal.text, marginBottom: 4 }}>
            {r.title}
          </div>
          <div style={{ fontSize: 11, color: `${terminal.green}90`, marginBottom: space[4] }}>
            by {r.user_name} · {timeAgo(r.created_at)} · ID: {r.id?.toString().slice(0, 8) || "?"}
          </div>

          {r.body && (
            <div style={{
              fontSize: 13, color: terminal.textMid, lineHeight: 1.7,
              whiteSpace: "pre-wrap", marginBottom: space[4],
            }}>
              {r.body}
            </div>
          )}

          {r.image_url && (
            <div style={{ marginBottom: space[4] }}>
              <img
                src={r.image_url}
                alt="Rant attachment"
                style={{
                  maxWidth: "100%", maxHeight: 400, borderRadius: terminalRadius.md,
                  border: `1px solid ${terminal.green}20`,
                }}
              />
            </div>
          )}

          {r.admin_note && (
            <div style={{
              padding: space[3], border: `1px solid ${terminal.gold}30`,
              borderRadius: terminalRadius.sm, background: `${terminal.gold}08`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: terminal.gold, letterSpacing: "0.08em", marginBottom: 4 }}>
                ADMIN RESPONSE
              </div>
              <div style={{ fontSize: 13, color: terminal.textDim, lineHeight: 1.6 }}>
                {r.admin_note}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render new rant form ──
  const renderNewForm = () => {
    const activeCat = CATEGORIES.find(c => c.key === category);
    return (
      <div style={{ animation: "flow-load-fade-in 0.3s ease-out" }}>
        <button
          onClick={() => setView("list")}
          style={{
            background: "transparent", border: "none", color: terminal.green,
            fontFamily: MONO, fontSize: 12, cursor: "pointer", padding: 0,
            marginBottom: space[4], display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>←</span> back to rants
        </button>

        <div style={{ fontSize: 14, fontWeight: 700, color: terminal.green, marginBottom: space[4], letterSpacing: "0.05em" }}>
          NEW RANT
        </div>

        {/* Category selector */}
        <div style={{ marginBottom: space[4] }}>
          <div style={{ fontSize: 11, color: `${terminal.green}90`, marginBottom: space[2], letterSpacing: "0.08em" }}>
            CATEGORY
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                style={{
                  padding: "8px 16px", borderRadius: terminalRadius.sm,
                  border: `1px solid ${category === cat.key ? cat.color + "80" : `${terminal.green}20`}`,
                  background: category === cat.key ? cat.color + "15" : "transparent",
                  color: category === cat.key ? cat.color : `${terminal.green}60`,
                  fontFamily: MONO, fontSize: 12, cursor: "pointer",
                  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease",
                }}
              >
                {glyph(cat.icon)} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: space[4] }}>
          <div style={{ fontSize: 11, color: `${terminal.green}90`, marginBottom: space[2], letterSpacing: "0.08em" }}>
            TITLE *
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            aria-label="Rant title"
            maxLength={200}
            style={{
              width: "100%", padding: "10px 14px",
              background: `${terminal.green}08`, border: `1px solid ${terminal.green}20`,
              borderRadius: terminalRadius.sm, color: terminal.text, fontFamily: MONO, fontSize: 13,
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = `${terminal.green}50`}
            onBlur={e => e.target.style.borderColor = `${terminal.green}20`}
          />
        </div>

        {/* Body */}
        <div style={{ marginBottom: space[4] }}>
          <div style={{ fontSize: 11, color: `${terminal.green}90`, marginBottom: space[2], letterSpacing: "0.08em" }}>
            DETAILS
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            aria-label="Rant details"
            placeholder="Describe the feature, bug, or just rant away..."
            rows={6}
            style={{
              width: "100%", padding: "10px 14px",
              background: `${terminal.green}08`, border: `1px solid ${terminal.green}20`,
              borderRadius: terminalRadius.sm, color: terminal.text, fontFamily: MONO, fontSize: 13,
              outline: "none", resize: "vertical", lineHeight: 1.7,
              boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = `${terminal.green}50`}
            onBlur={e => e.target.style.borderColor = `${terminal.green}20`}
          />
        </div>

        {/* Image upload */}
        <div style={{ marginBottom: space[5] }}>
          <div style={{ fontSize: 11, color: `${terminal.green}90`, marginBottom: space[2], letterSpacing: "0.08em" }}>
            SCREENSHOT / IMAGE
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Attach screenshot or image"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />
          {!imagePreview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "12px 20px", border: `1px dashed ${terminal.green}30`,
                borderRadius: terminalRadius.sm, background: "transparent",
                color: `${terminal.green}60`, fontFamily: MONO, fontSize: 12,
                cursor: "pointer", width: "100%",
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${terminal.green}60`; e.currentTarget.style.color = terminal.green; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${terminal.green}30`; e.currentTarget.style.color = `${terminal.green}60`; }}
            >
              + Attach image (max 5MB)
            </button>
          ) : (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  maxWidth: "100%", maxHeight: 200, borderRadius: terminalRadius.sm,
                  border: `1px solid ${terminal.green}20`,
                }}
              />
              <button
                onClick={removeImage}
                style={{
                  position: "absolute", top: 6, right: 6,
                  width: 24, height: 24, borderRadius: "50%",
                  background: terminal.pink, border: "none", color: terminal.text,
                  fontFamily: MONO, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !title.trim()}
          style={{
            padding: "14px 32px", borderRadius: terminalRadius.md,
            border: `1px solid ${activeCat.color}60`,
            background: `linear-gradient(135deg, ${activeCat.color}20, ${activeCat.color}10)`,
            color: !title.trim() ? `${terminal.green}30` : activeCat.color,
            fontFamily: MONO, fontSize: 14, fontWeight: 700,
            letterSpacing: "0.1em", cursor: !title.trim() ? "not-allowed" : "pointer",
            transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease",
            opacity: submitting ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            if (title.trim() && !submitting) {
              e.currentTarget.style.background = `linear-gradient(135deg, ${activeCat.color}30, ${activeCat.color}20)`;
              e.currentTarget.style.boxShadow = `0 0 20px ${activeCat.color}20`;
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${activeCat.color}20, ${activeCat.color}10)`;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {submitting ? "SUBMITTING..." : <><Icon name="flame" size={13} /> RANT</>}
        </button>
      </div>
    );
  };

  // ── List filters ──
  const [filterCat, setFilterCat] = useState("all");
  const [filterSt, setFilterSt] = useState("all");

  const visibleRants = rants.filter(r =>
    (filterCat === "all" || r.category === filterCat) &&
    (filterSt === "all" || (r.status || "pending") === filterSt)
  );

  // ── Render list ──
  const renderList = () => (
    <div style={{ animation: "flow-load-fade-in 0.3s ease-out" }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: space[4],
      }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent", border: "none", color: terminal.green,
            fontFamily: MONO, fontSize: 12, cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>←</span> terminal
        </button>
        <button
          onClick={() => setView("new")}
          style={{
            padding: "8px 20px", borderRadius: terminalRadius.sm,
            border: `1px solid ${terminal.pink}60`,
            background: `linear-gradient(135deg, ${terminal.pink}20, ${terminal.pink}10)`,
            color: terminal.pink, fontFamily: MONO, fontSize: 12,
            fontWeight: 700, letterSpacing: "0.08em",
            cursor: "pointer", transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${terminal.pink}30, ${terminal.pink}20)`;
            e.currentTarget.style.boxShadow = `0 0 16px ${terminal.pink}20`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${terminal.pink}20, ${terminal.pink}10)`;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          + NEW RANT
        </button>
      </div>

      {/* Category filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: space[3], flexWrap: "wrap" }}>
        {[{ key: "all", label: "All", icon: "◈", color: terminal.green }, ...CATEGORIES].map(cat => {
          const count = cat.key === "all" ? rants.length : rants.filter(r => r.category === cat.key).length;
          const active = filterCat === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setFilterCat(cat.key)}
              style={{
                padding: "6px 14px", borderRadius: terminalRadius.sm,
                border: `1px solid ${active ? cat.color + "70" : `${terminal.text}20`}`,
                background: active ? cat.color + "20" : "transparent",
                color: active ? cat.color : terminal.textGhost,
                fontFamily: MONO, fontSize: 12, cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease", fontWeight: active ? 700 : 500,
              }}
            >
              {glyph(cat.icon)} {cat.label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Status filter pills */}
      <div style={{ display: "flex", gap: 5, marginBottom: space[4], flexWrap: "wrap" }}>
        {[{ key: "all", label: "Any status", color: terminal.green },
          ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, ...v }))
        ].map(st => {
          const count = st.key === "all"
            ? rants.length
            : rants.filter(r => (r.status || "pending") === st.key).length;
          const active = filterSt === st.key;
          return (
            <button
              key={st.key}
              onClick={() => setFilterSt(st.key)}
              style={{
                padding: "4px 12px", borderRadius: terminalRadius.lg,
                border: `1px solid ${active ? st.color + "60" : `${terminal.text}18`}`,
                background: active ? st.color + "15" : "transparent",
                color: active ? st.color : terminal.textFaint,
                fontFamily: MONO, fontSize: 11, cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease", fontWeight: active ? 600 : 400,
              }}
            >
              {glyph(st.icon) || "◈"} {st.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Rant list */}
      {loading ? (
        <div style={{ color: `${terminal.green}60`, fontSize: 12, padding: space[5] }}>
          Loading rants...
        </div>
      ) : visibleRants.length === 0 ? (
        <div style={{
          textAlign: "center", padding: `${space[8]}px ${space[5]}px`,
          color: `${terminal.green}80`,
        }}>
          <div style={{ marginBottom: space[3], color: terminal.pink, display: "flex", justifyContent: "center" }}><Icon name="flame" size={32} strokeWidth={1.5} /></div>
          <div style={{ fontSize: 13, marginBottom: space[2] }}>
            {rants.length === 0 ? "No rants yet" : "No rants match filters"}
          </div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            {rants.length === 0 ? "Be the first to rant. We won't judge. Much." : "Try a different filter."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {visibleRants.map((r, i) => {
            const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const cat = CATEGORIES.find(c => c.key === r.category) || CATEGORIES[0];
            const hasReply = !!r.admin_note;
            const isResolved = r.status === "approved" || r.status === "shipped";
            // Green tint for replied/resolved, subtle default
            const borderColor = hasReply ? `${terminal.success}30` : `${terminal.green}15`;
            const bgBase = hasReply ? `${terminal.success}06` : "transparent";
            const bgHover = hasReply ? `${terminal.success}12` : `${terminal.green}08`;

            return (
              <button
                key={r.id}
                onClick={() => { setSelectedRant(r); setView("detail"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: `${space[3]}px ${space[4]}px`,
                  border: `1px solid ${borderColor}`, borderRadius: terminalRadius.md,
                  background: bgBase, cursor: "pointer",
                  fontFamily: MONO, textAlign: "left", width: "100%",
                  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease",
                  animation: `flow-load-fade-in 0.3s ease-out ${Math.min(i, 10) * 40}ms both`,
                  ...(hasReply ? { borderLeft: `3px solid ${terminal.success}60` } : {}),
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = bgHover;
                  e.currentTarget.style.borderColor = hasReply ? `${terminal.success}50` : `${terminal.green}30`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = bgBase;
                  e.currentTarget.style.borderColor = borderColor;
                }}
              >
                {/* Category icon */}
                <span style={{
                  flexShrink: 0, width: 28, height: 28,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: terminalRadius.md, background: cat.color + "12",
                  border: `1px solid ${cat.color}20`, color: cat.color,
                }}>
                  {glyph(cat.icon, 15)}
                </span>

                {/* Title + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, color: terminal.text, fontWeight: 600,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 11, color: `${terminal.green}90`, marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{r.user_name}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{timeAgo(r.created_at)}</span>
                    {r.image_url && <span style={{ opacity: 0.5, display: "inline-flex" }}><Icon name="paperclip" size={12} /></span>}
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                  color: status.color, padding: "3px 10px",
                  background: status.color + "12",
                  border: `1px solid ${status.color}30`, borderRadius: terminalRadius.sm,
                  flexShrink: 0,
                }}>
                  {glyph(status.icon)} {status.label.toUpperCase()}
                </span>

                {/* Reply indicator */}
                {hasReply && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                    color: terminal.success, padding: "3px 8px",
                    background: `${terminal.success}15`, border: `1px solid ${terminal.success}30`,
                    borderRadius: terminalRadius.sm, flexShrink: 0,
                  }}>✓ REPLIED</span>
                )}

                <span style={{ fontSize: 11, color: `${terminal.green}20`, flexShrink: 0 }}>→</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // No outer shell — TerminalView provides the CRT container
  return (
    <div ref={devRef}>
      {view === "list" && renderList()}
      {view === "new" && renderNewForm()}
      {view === "detail" && renderDetail()}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999,
          background: `linear-gradient(135deg, ${terminal.gradientStart} 0%, ${terminal.gradientEnd} 100%)`,
          border: `1px solid ${toast.type === "error" ? `${terminal.red}40` : `${terminal.green}40`}`,
          borderRadius: terminalRadius.lg, padding: `${space[3]}px ${space[5]}px`,
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${toast.type === "error" ? "rgba(255,77,106,0.1)" : "rgba(0,255,65,0.1)"}`,
          animation: "flow-load-fade-in 0.4s ease-out",
          fontFamily: MONO,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: "50%",
            background: toast.type === "error"
              ? `linear-gradient(135deg, ${terminal.red}, ${terminal.redDeep})`
              : `linear-gradient(135deg, ${terminal.green}, ${terminal.greenDeep})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, flexShrink: 0, color: terminal.gradientStart, fontWeight: 700,
          }}>
            {toast.type === "error" ? "!" : "✓"}
          </span>
          <div style={{
            color: toast.type === "error" ? terminal.red : terminal.green,
            fontSize: 13, fontWeight: 600,
          }}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
