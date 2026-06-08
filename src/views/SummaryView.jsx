// Flow — Summary View (Project-centric)
// Redesigned to match Figma node 528-32300:
//   • Dot-matrix "SUMMARY" wordmark hero
//   • Overview card: per-phase dot-plot density + nested "Recently shipped"
//   • Week at a glance card: P0 / blocked / upcoming / most-active / completed
//   • The Squad Report: squad × phase table with colored count pills
import React, { useMemo } from "react";
import { c, typo, space, body, allPhases } from "../styles/theme";
import { EmptyState } from "../components/shared";
import { isDevSeedMode, devStore } from "../data/devSeed";
import useDevLabel from "../hooks/useDevLabel";

const FROZEN_DAYS = 7;

// ── Palette (Figma tokens, matching the app design system) ──
const COL = {
  text: "#1d2539", textMid: "#475067", textDim: "#666d85", ghost: "#989fb3",
  border: "#eaecf0", borderSoft: "#f2f3f7",
  card: "#ffffff", header: "#fafafb",
  red: "#d92626", green: "#26b57c", gold: "#e0a020", amber: "#e5641a",
  shippedSquad: "#c2410c",
  dotLight: "#cdd2dd", dotDark: "#1d2539", dotEmpty: "#e2e6ec",
};

// Squad-report column pill tints (light fill + navy count)
const PILL = {
  PRD:     "#efeafb",
  Design:  "#e4ecfd",
  Dev:     "#d2f4e3",
  QA:      "#fadcec",
  Shipped: "#d4eef7",
};

// Phase glyphs — reused from the Projects view for visual consistency
const PHASE_GLYPHS = {
  PRD: <svg width="15" height="15" viewBox="0 0 24 24" fill="#2D7FF9"><path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" opacity="0.18"/><path d="M14 2v4a2 2 0 0 0 2 2h4" fill="none" stroke="#2D7FF9" strokeWidth="1.6"/><path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="none" stroke="#2D7FF9" strokeWidth="1.6"/><line x1="8" y1="13" x2="16" y2="13" stroke="#2D7FF9" strokeWidth="1.6" strokeLinecap="round"/><line x1="8" y1="16.5" x2="13.5" y2="16.5" stroke="#2D7FF9" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Design: <svg width="14" height="14" viewBox="0 0 38 57"><path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z"/><path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z"/><path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z"/><path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z"/><path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z"/></svg>,
  Dev: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  QA: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9747FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>,
};

const RocketIcon = ({ size = 15, color = COL.amber }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const WarnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COL.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const CaretIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Best-effort playful squad icon (matches Figma's per-squad glyphs); falls back to a folder.
const SQUAD_EMOJI = {
  "AFS": "🐷", "Customer": "👥", "Financial Service": "🏦", "Gaming": "🎮",
  "NSO": "🧭", "O2D": "🚚", "Platform": "🧱", "Sales": "💸",
  "Special Projects": "✨", "Storefront": "🏪", "Logistics": "📦", "Marketing": "📣",
};
const squadEmoji = (sq) => SQUAD_EMOJI[sq] || "🗂️";

// ── Per-phase dot-plot (length encodes count; light→navy left→right gradient) ──
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lerpColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}

function DotPlot({ count, perProject = 3.4 }) {
  const ROWS = 3, MAX_COLS = 32;
  const D = 5, HGAP = 7, VGAP = 6;
  const cols = count <= 0 ? 1 : Math.min(MAX_COLS, Math.max(2, Math.round(count * perProject)));
  const colEls = [];
  for (let cI = 0; cI < cols; cI++) {
    const t = cols <= 1 ? 0 : cI / (cols - 1);
    const color = count <= 0 ? COL.dotEmpty : lerpColor(COL.dotLight, COL.dotDark, t);
    const dots = [];
    for (let r = 0; r < ROWS; r++) {
      dots.push(<span key={r} style={{ width: D, height: D, borderRadius: 2, background: color, display: "block", marginBottom: r < ROWS - 1 ? VGAP : 0 }} />);
    }
    colEls.push(<div key={cI} style={{ display: "flex", flexDirection: "column", marginRight: cI < cols - 1 ? HGAP : 0 }}>{dots}</div>);
  }
  return <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{colEls}</div>;
}

// ── Card primitives ──
function Card({ children, style }) {
  return (
    <div style={{
      background: COL.card, border: `1px solid ${COL.border}`, borderRadius: 18,
      overflow: "hidden", boxShadow: "0 1px 3px rgba(16,24,40,0.05), 0 1px 2px rgba(16,24,40,0.03)",
      ...style,
    }}>{children}</div>
  );
}
function CardHeader({ title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", background: COL.header, borderBottom: `1px solid ${COL.border}` }}>
      <span style={{ fontFamily: body, fontSize: 18, fontWeight: 700, color: COL.text, letterSpacing: "-0.01em" }}>{title}</span>
      {right}
    </div>
  );
}
function SelectChip({ label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid ${COL.border}`, borderRadius: 10, background: COL.card, fontFamily: body, fontSize: 14, fontWeight: 600, color: COL.textMid, whiteSpace: "nowrap" }}>
      {label}<span style={{ color: COL.ghost, display: "inline-flex" }}><CaretIcon /></span>
    </span>
  );
}
function Tag({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", background: "#f3eeea", borderRadius: 999, fontFamily: body, fontSize: 13, fontWeight: 500, color: COL.textMid, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

const plural = (n) => (n === 1 ? "" : "s");

function computeProjectMetrics(projects, phaseDurationDefaults) {
  const todayMs = Date.now();
  const active = projects.filter(p => p.status === "in_flight");
  const shipped = projects.filter(p => p.status === "shipped");
  const blocked = projects.filter(p => p.status === "blocked" || p.isBlocked);
  const deprioritized = projects.filter(p => p.status === "deprioritized");
  const upcoming = projects.filter(p => p.status === "upcoming");

  const byPhase = {};
  allPhases.forEach(ph => { byPhase[ph] = 0; });
  projects.filter(p => p.status === "in_flight" || p.status === "blocked").forEach(p => { byPhase[p.phase] = (byPhase[p.phase] || 0) + 1; });

  const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
  active.forEach(p => { byPriority[p.priority || "P2"]++; });

  const frozen = active.filter(p => {
    if (!p.lastActivityAt) return true;
    return (todayMs - new Date(p.lastActivityAt).getTime()) / 86_400_000 > FROZEN_DAYS;
  });
  const phaseOverstay = active.filter(p => {
    const overrides = p.phaseDurationOverrides || {};
    const threshold = overrides[p.phase] ?? phaseDurationDefaults?.[p.phase];
    if (!threshold || !p.lastActivityAt) return false;
    return Math.floor((todayMs - new Date(p.lastActivityAt).getTime()) / 86_400_000) > threshold;
  });
  const overdue = active.filter(p => p.endDate && new Date(p.endDate + "T00:00:00").getTime() < todayMs);

  return { active, shipped, blocked, deprioritized, upcoming, byPhase, byPriority, frozen, phaseOverstay, overdue, needsAttention: blocked.length + frozen.length + phaseOverstay.length + overdue.length };
}

const SummaryView = ({
  loading, error,
  projects, people, squads,
  globalFilters, onNavigate,
  phaseDurationDefaults,
  myLens = false, followedProjects = [], viewerSquad,
  timeframe,
}) => {
  const devRef = useDevLabel('SummaryView', 'src/views/SummaryView.jsx', 'Project-centric dashboard');

  const gf = globalFilters || {};
  const filteredProjects = useMemo(() => {
    let p = projects;
    if (gf.squad?.length) p = p.filter(x => gf.squad.includes(x.squad));
    if (gf.owner?.length) p = p.filter(x => gf.owner.includes(x.owner));
    if (myLens) p = p.filter(x => followedProjects.includes(x.id));
    if (timeframe?.start && timeframe?.end) {
      p = p.filter(proj => {
        const pStart = proj.startDate || proj.tentativeStartDate || proj.createdAt?.slice(0, 10);
        const pEnd = proj.endDate || proj.shipped_at?.slice(0, 10);
        if (!pStart) return true;
        return pStart <= timeframe.end && (pEnd ? pEnd >= timeframe.start : true);
      });
    }
    return p;
  }, [projects, gf.squad, gf.owner, myLens, viewerSquad, followedProjects, timeframe]);

  const metrics = useMemo(() => computeProjectMetrics(filteredProjects, phaseDurationDefaults), [filteredProjects, phaseDurationDefaults]);

  const allSquadNames = useMemo(() =>
    (squads && squads.length ? [...squads] : [...new Set(filteredProjects.map(p => p.squad).filter(Boolean))]).sort(),
    [squads, filteredProjects]
  );

  const allEvents = useMemo(() => (isDevSeedMode() ? devStore.listAllEvents() : []), [filteredProjects]);

  const phaseBarData = useMemo(() => {
    const activeProjs = filteredProjects.filter(p => p.status === "in_flight" || p.status === "blocked");
    const counts = {};
    allPhases.forEach(ph => { counts[ph] = activeProjs.filter(p => p.phase === ph).length; });
    return counts;
  }, [filteredProjects]);

  const squadGrid = useMemo(() => {
    const activeProjs = filteredProjects.filter(p => p.status === "in_flight" || p.status === "blocked");
    const grid = {};
    allSquadNames.forEach(sq => {
      grid[sq] = {};
      allPhases.forEach(ph => { grid[sq][ph] = activeProjs.filter(p => p.squad === sq && p.phase === ph).length; });
      grid[sq].Shipped = filteredProjects.filter(p => p.squad === sq && p.status === "shipped").length;
    });
    return grid;
  }, [filteredProjects, allSquadNames]);

  if (loading) {
    return (
      <div ref={devRef} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 240px)", flexDirection: "column", gap: space[3] }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${c.border}`, borderTopColor: c.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textMid }}>Loading summary...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div ref={devRef} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 240px)" }}>
        <EmptyState icon="!" title="Failed to load summary" message={typeof error === "string" ? error : "An unexpected error occurred."} action="Retry" onAction={() => window.location.reload()} />
      </div>
    );
  }
  if (filteredProjects.length === 0) {
    const hasFilter = gf.squad?.length || gf.owner?.length;
    return (
      <div ref={devRef} style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 240px)" }}>
        <EmptyState
          title={hasFilter ? "No matching projects" : "No projects yet"}
          message={hasFilter ? "No projects match the current filters." : "Add projects to see your dashboard."}
          action={!hasFilter && onNavigate ? "Go to Projects" : null}
          onAction={!hasFilter && onNavigate ? () => onNavigate("projects") : null}
        />
      </div>
    );
  }

  // ── derived figures for the cards ──
  const now = new Date();
  const nowMs = now.getTime();
  const weekAgoMs = nowMs - 7 * 86_400_000;
  const quarterLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  const squadLabel = gf.squad?.length === 1 ? gf.squad[0] : "All squads";
  const timeLabel = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const p0Projects = filteredProjects.filter(p => p.priority === "P0" && (p.status === "in_flight" || p.status === "blocked"));
  const blockedProjects = metrics.blocked;
  const upcomingCount = metrics.upcoming.length;
  const overdueStartCount = metrics.upcoming.filter(p => p.tentativeStartDate && new Date(p.tentativeStartDate + "T00:00:00").getTime() < nowMs).length;

  const squadActivity = {};
  allEvents.forEach(e => {
    if (new Date(e.created_at).getTime() < weekAgoMs) return;
    const proj = filteredProjects.find(p => p.id === e.entity_id);
    if (proj?.squad) squadActivity[proj.squad] = (squadActivity[proj.squad] || 0) + 1;
  });
  const mostActive = Object.entries(squadActivity).sort((a, b) => b[1] - a[1])[0];

  const completedThisWeek = filteredProjects.filter(p => p.status === "shipped" && p.shipped_at && new Date(p.shipped_at).getTime() >= weekAgoMs).length;

  const recentlyShipped = [...metrics.shipped]
    .sort((a, b) => new Date(b.shipped_at || b.lastActivityAt || b.createdAt || 0).getTime() - new Date(a.shipped_at || a.lastActivityAt || a.createdAt || 0).getTime())
    .slice(0, 10);

  const ov = (ph) => phaseBarData[ph] || 0;
  // Proportional dot density: longest phase fills the track; small datasets keep a
  // Figma-like ~4 dots/project so they don't look sparse.
  const dotMax = Math.max(1, ...allPhases.map(ph => ov(ph)));
  const dotK = Math.min(4, 14 / dotMax);
  const phaseRows = [
    { key: "PRD", label: "PRD", icon: PHASE_GLYPHS.PRD },
    { key: "Design", label: "Design", icon: PHASE_GLYPHS.Design },
    { key: "Dev", label: "Dev", icon: PHASE_GLYPHS.Dev },
    { key: "QA", label: "QA", icon: PHASE_GLYPHS.QA },
  ];
  const shipRows = [
    { key: "Alpha", label: "Alpha rollout" },
    { key: "Beta", label: "Beta rollout" },
    { key: "GA", label: "General access" },
  ];

  const SQUAD_COLS = ["PRD", "Design", "Dev", "QA", "Shipped"];

  // ── render helpers ──
  const phaseRow = (label, icon, count) => (
    <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 38, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 112, flexShrink: 0 }}>
        <span style={{ display: "inline-flex", width: 16, justifyContent: "center" }}>{icon}</span>
        <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: COL.text }}>{label}</span>
      </div>
      <DotPlot count={count} perProject={dotK} />
      <span style={{ fontFamily: body, fontSize: 14, color: COL.textDim, whiteSpace: "nowrap" }}>{count} project{plural(count)}</span>
    </div>
  );
  const shipSubRow = (label, count) => (
    <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 36, minWidth: 0 }}>
      <span style={{ width: 104, flexShrink: 0, fontFamily: body, fontSize: 14, fontWeight: 500, color: COL.textMid }}>{label}</span>
      <DotPlot count={count} perProject={dotK} />
      <span style={{ fontFamily: body, fontSize: 14, color: COL.textDim, whiteSpace: "nowrap" }}>{count} project{plural(count)}</span>
    </div>
  );
  const glanceLeft = (dot, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: 124, flexShrink: 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flexShrink: 0 }} />
      <span style={{ fontFamily: body, fontSize: 15, fontWeight: 600, color: COL.text }}>{label}</span>
    </div>
  );

  return (
    <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ═══ SUMMARY wordmark (exact Figma export) ═══ */}
      <div style={{ overflow: "hidden", height: 128, marginBottom: 4 }}>
        <img src="/summary-title.svg?v=1" alt="Summary" width="1408" height="351" style={{ display: "block", maxWidth: "none", marginTop: -24, marginLeft: -18 }} />
      </div>

      {/* ═══ OVERVIEW + WEEK AT A GLANCE ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 416px", gap: 22, alignItems: "start" }}>

        {/* ── Overview ── */}
        <Card>
          <CardHeader title="Overview" right={
            <div style={{ display: "flex", gap: 10 }}>
              <SelectChip label={quarterLabel} />
              <SelectChip label={squadLabel} />
            </div>
          } />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 180px", gap: 20, padding: "20px 20px 24px" }}>

            {/* phase dot-plots */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              {phaseRows.map(r => phaseRow(r.label, r.icon, ov(r.key)))}

              {/* Shipped group */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 34, marginTop: 6 }}>
                <span style={{ display: "inline-flex", width: 16, justifyContent: "center" }}><RocketIcon /></span>
                <span style={{ fontFamily: body, fontSize: 14, fontWeight: 700, color: COL.text }}>Shipped</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 8, marginLeft: 7, borderLeft: `1px solid ${COL.border}` }}>
                {shipRows.map(r => shipSubRow(r.label, ov(r.key)))}
              </div>
            </div>

            {/* Recently shipped */}
            <div style={{ display: "flex", flexDirection: "column", background: COL.card, border: `1px solid ${COL.border}`, borderRadius: 12, overflow: "hidden", maxHeight: 372 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 14px", flexShrink: 0 }}>
                <span style={{ fontFamily: body, fontSize: 14, fontWeight: 700, color: COL.text }}>Recently shipped</span>
                <RocketIcon size={14} />
              </div>
              <div style={{ overflowY: "auto", borderTop: `1px solid ${COL.border}` }}>
                {recentlyShipped.length === 0 ? (
                  <div style={{ padding: "16px 14px", fontFamily: body, fontSize: 13, color: COL.textDim }}>Nothing shipped yet.</div>
                ) : recentlyShipped.map((p, i) => (
                  <button key={p.id} type="button" className="flow-row" onClick={() => onNavigate?.("projects", p.id)} style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, width: "100%", textAlign: "left",
                    padding: "11px 14px", background: "transparent", border: "none", cursor: "pointer",
                    borderBottom: i < recentlyShipped.length - 1 ? `1px solid ${COL.border}` : "none",
                  }}>
                    <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: COL.text, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{p.name}</span>
                    <span style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: COL.shippedSquad }}>{p.squad || "—"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Week at a glance ── */}
        <Card>
          <CardHeader title="Week at a glance" right={
            <span style={{ fontFamily: body, fontSize: 13, color: COL.textDim, whiteSpace: "nowrap" }}>Last updated at {timeLabel}</span>
          } />

          {/* P0 + blocked */}
          <div style={{ display: "flex", gap: 16, padding: "18px 20px", alignItems: "flex-start" }}>
            {glanceLeft(COL.red, "P0")}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontFamily: body, fontSize: 15, fontWeight: 700, color: COL.text, marginBottom: 10 }}>{p0Projects.length} critical project{plural(p0Projects.length)} active</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {p0Projects.slice(0, 4).map(p => <Tag key={p.id}>{p.name}</Tag>)}
                  {p0Projects.length > 4 && <Tag>+{p0Projects.length - 4} more</Tag>}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: body, fontSize: 15, fontWeight: 700, color: COL.text, marginBottom: 10 }}>{blockedProjects.length} project{plural(blockedProjects.length)} blocked</div>
                {blockedProjects.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {blockedProjects.slice(0, 4).map(p => <Tag key={p.id}>{p.name}</Tag>)}
                    {blockedProjects.length > 4 && <Tag>+{blockedProjects.length - 4} more</Tag>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming */}
          <div style={{ borderTop: `1px dashed ${COL.border}`, margin: "0 20px" }} />
          <div style={{ display: "flex", gap: 16, padding: "16px 20px", alignItems: "flex-start" }}>
            {glanceLeft(COL.gold, "Upcoming")}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: body, fontSize: 15, fontWeight: 700, color: COL.text }}>{upcomingCount} project{plural(upcomingCount)} in pipeline</div>
              {overdueStartCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <WarnIcon />
                  <span style={{ fontFamily: body, fontSize: 13, fontWeight: 500, color: COL.red }}>{overdueStartCount} project{plural(overdueStartCount)} with a past tentative start date</span>
                </div>
              )}
            </div>
          </div>

          {/* Most active */}
          <div style={{ borderTop: `1px dashed ${COL.border}`, margin: "0 20px" }} />
          <div style={{ display: "flex", gap: 16, padding: "16px 20px", alignItems: "flex-start" }}>
            {glanceLeft(COL.green, "Most active")}
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: body, fontSize: 15, fontWeight: 700, color: COL.text }}>{mostActive ? mostActive[0] : "—"}</span>
              {mostActive && <>
                <span style={{ width: 3, height: 3, borderRadius: 999, background: COL.ghost }} />
                <span style={{ fontFamily: body, fontSize: 14, fontWeight: 500, color: COL.textDim }}>{mostActive[1]} event{plural(mostActive[1])} this week</span>
              </>}
            </div>
          </div>

          {/* Completed */}
          <div style={{ borderTop: `1px dashed ${COL.border}`, margin: "0 20px" }} />
          <div style={{ display: "flex", gap: 16, padding: "16px 20px", alignItems: "flex-start" }}>
            {glanceLeft(COL.green, "Completed")}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: body, fontSize: 15, fontWeight: 700, color: COL.text }}>{completedThisWeek} project{plural(completedThisWeek)} shipped this week</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ═══ THE SQUAD REPORT ═══ */}
      <Card>
        <CardHeader title="The Squad Report" right={<SelectChip label={quarterLabel} />} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "32%" }} />
              {SQUAD_COLS.map(col => <col key={col} style={{ width: `${68 / SQUAD_COLS.length}%` }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px 16px", fontFamily: body, fontSize: 13, fontWeight: 600, color: COL.textDim, borderBottom: `1px solid ${COL.border}` }}>Squad</th>
                {SQUAD_COLS.map(col => (
                  <th key={col} style={{ textAlign: "center", padding: "12px 10px", fontFamily: body, fontSize: 13, fontWeight: 600, color: COL.textDim, borderBottom: `1px solid ${COL.border}` }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allSquadNames.map(sq => (
                <tr key={sq} className="flow-row" style={{ borderBottom: `1px solid ${COL.borderSoft}` }}>
                  <td style={{ padding: "0 16px", height: 56 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16, lineHeight: 1, width: 20, textAlign: "center" }}>{squadEmoji(sq)}</span>
                      <span style={{ fontFamily: body, fontSize: 14, fontWeight: 600, color: COL.text }}>{sq}</span>
                    </div>
                  </td>
                  {SQUAD_COLS.map(col => {
                    const n = squadGrid[sq]?.[col] || 0;
                    return (
                      <td key={col} style={{ padding: "8px 10px", height: 56 }}>
                        {n > 0 ? (
                          <div style={{ height: 36, borderRadius: 8, background: PILL[col], display: "flex", alignItems: "center", justifyContent: "center", fontFamily: body, fontSize: 14, fontWeight: 600, color: COL.text }}>{n}</div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SummaryView;
