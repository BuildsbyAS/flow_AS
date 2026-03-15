// Flow — Focus View (Phase-driven: Planning → Locked → Closing)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, display, body, mono, layout, motion, phaseNames, typeConfig, phaseColors as getPhaseColors, density } from "../styles/theme";
import { Badge, Tag, Surface, Inp, Sel } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";

// ─── ANIMATED KPI COUNTER ─────────────────────────────────────
const FocusKpi = ({ value, label, color, delay = 0 }) => {
  const [displayVal, setDisplayVal] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const dur = 600;
    const animate = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayVal(Math.round(ease * value));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    const timeout = setTimeout(() => { frame = requestAnimationFrame(animate); }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(frame); };
  }, [value, delay]);
  return (
    <div className="flow-focus-kpi" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, animationDelay: `${delay}ms` }}>
      <span style={{ fontFamily: display, fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{displayVal}</span>
      <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
};

// ─── SUMMARY TILE — compact inline tile for unified summary ───
const SummaryTile = ({ value, label, color, active, onClick }) => (
  <div
    onClick={onClick}
    className="flow-glass-tile"
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      padding: "10px 12px", minWidth: 56, borderRadius: 8, cursor: onClick ? "pointer" : "default",
      background: active ? `${color}12` : "transparent",
      border: `1px solid ${active ? color + "40" : "transparent"}`,
      transition: "all 0.15s ease",
    }}
  >
    <span style={{
      fontFamily: display, fontSize: 20, fontWeight: 800, color: active ? color : (value > 0 ? c.text : c.textDim),
      lineHeight: 1, letterSpacing: "-0.02em",
    }}>{value}</span>
    <span style={{
      fontFamily: body, fontSize: 10, fontWeight: 700, color: active ? color : c.textMid,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>{label}</span>
  </div>
);

// ─── SUMMARY METRIC — for secondary KPIs ───
const SummaryMetric = ({ value, label, color }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 8px", minWidth: 48 }}>
    <span style={{ fontFamily: display, fontSize: 18, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
    <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 600, color: c.textDim, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
  </div>
);

// ═══ FOCUS VIEW ═════════════════════════════════════════════════
const HumansView = ({ commitments, setCommitments, projects, people, setDetailLabel, setGoBack, setIsLocked, searchRef, globalFilters = {} }) => {
  const [activePerson, setActivePerson] = useState(-1);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("people");
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const [detailFocus, setDetailFocus] = useState(0);
  const [closingMode, setClosingMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "lock" | "unlock" | null
  const [blockedModal, setBlockedModal] = useState(null); // { idx: number } | null
  const [blockedText, setBlockedText] = useState("");
  const [sortCol, setSortCol] = useState("squad");
  const [sortDir, setSortDir] = useState("asc");
  const [filterStatus, setFilterStatus] = useState(null); // "locked" | "ready" | "partial" | "empty" | null
  const [rowAnimKey, setRowAnimKey] = useState(0);
  const localSearchRef = useRef(null);

  const person = activePerson >= 0 ? commitments[activePerson] : null;
  const filtered = commitments.filter(cm => {
    if (!cm.person.toLowerCase().includes(search.toLowerCase())) return false;
    const pObj = people.find(p => p.name === cm.person);
    if (globalFilters.squad && pObj?.squad !== globalFilters.squad) return false;
    if (globalFilters.person && cm.person !== globalFilters.person) return false;
    if (globalFilters.owner) {
      const ownsProject = projects.some(pr => pr.owner === cm.person && pr.owner === globalFilters.owner);
      if (cm.person !== globalFilters.owner && !ownsProject) return false;
    }
    return true;
  });

  useEffect(() => {
    if (searchRef) searchRef.current = localSearchRef.current;
  }, [searchRef, activePerson]);

  // ── Derived phase ──
  const isLocked = person ? !!person.lockedAt : false;
  const phase = !isLocked ? "planning" : closingMode ? "closing" : "locked";

  // ── Mutations ──
  const updateItem = (idx, field, val) => {
    if (isLocked) return;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      const items = [...p.items]; items[idx] = { ...items[idx], [field]: val };
      if (field === "duration") items[idx].weeksRemaining = val;
      p.items = items; next[activePerson] = p; return next;
    });
  };
  const updatePerson = (field, val) => {
    if (isLocked) return;
    setCommitments(prev => {
      const next = [...prev];
      next[activePerson] = { ...next[activePerson], [field]: val };
      return next;
    });
  };
  const updateOutcome = (idx, val) => {
    // Blocked: toggle off if already blocked, otherwise open modal
    if (val === "blocked") {
      if (person?.items[idx]?.outcome === "blocked") {
        setCommitments(prev => {
          const next = [...prev]; const p = { ...next[activePerson] };
          const items = [...p.items];
          items[idx] = { ...items[idx], outcome: null, blockedReason: "" };
          p.items = items; next[activePerson] = p; return next;
        });
        return;
      }
      setBlockedText(person?.items[idx]?.blockedReason || "");
      setBlockedModal({ idx });
      return;
    }
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      const items = [...p.items];
      const item = items[idx];
      const newOutcome = item.outcome === val ? null : val;
      items[idx] = { ...item, outcome: newOutcome };
      // Clear carryTo if not a carry-type outcome
      if (newOutcome !== "carry" && newOutcome !== "done_carry") items[idx].carryTo = null;
      // Auto-set carryTo for done_carry + decrement weeksRemaining
      if (newOutcome === "done_carry") {
        const base = new Date("2026-03-10");
        base.setDate(base.getDate() + 7);
        items[idx].carryTo = base.toISOString().split("T")[0];
        items[idx].weeksRemaining = Math.max(1, (item.weeksRemaining || item.duration || 1) - 1);
      }
      // Clear blockedReason when switching away from blocked
      if (newOutcome !== "blocked") items[idx].blockedReason = "";
      p.items = items; next[activePerson] = p; return next;
    });
  };
  const saveBlockedReason = () => {
    if (!blockedModal) return;
    const idx = blockedModal.idx;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      const items = [...p.items];
      items[idx] = { ...items[idx], outcome: "blocked", blockedReason: blockedText, carryTo: null };
      p.items = items; next[activePerson] = p; return next;
    });
    setBlockedModal(null); setBlockedText("");
  };
  const updateCarryTo = (idx, week) => {
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      const items = [...p.items];
      items[idx] = { ...items[idx], carryTo: items[idx].carryTo === week ? null : week };
      p.items = items; next[activePerson] = p; return next;
    });
  };
  const toggleDeselect = (idx) => {
    if (isLocked) return;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      if (p.deselected === idx) { p.deselected = -1; p.buffer = ""; p.bufferProject = ""; }
      else { p.deselected = idx; }
      next[activePerson] = p; return next;
    });
  };

  const goBackToList = () => {
    setActivePerson(-1); setDetailFocus(0); setClosingMode(false);
    if (setDetailLabel) setDetailLabel(null);
    if (setGoBack) setGoBack(null);
    if (setIsLocked) setIsLocked(false);
  };
  const openPerson = (realIdx) => {
    setActivePerson(realIdx); setSearch(""); setDetailFocus(0); setClosingMode(false);
    const name = commitments[realIdx]?.person;
    if (setDetailLabel) setDetailLabel(name);
    if (setGoBack) setGoBack(goBackToList);
    if (setIsLocked) setIsLocked(!!commitments[realIdx]?.lockedAt);
  };

  // ── Keyboard: list view ──
  useKeyboard(!person ? [
    { key: "ArrowUp", fn: () => { setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); } },
    { key: "ArrowDown", fn: () => { setKbActive(true); setFocusIdx(i => Math.min(filtered.length - 1, i + 1)); } },
    { key: "Enter", fn: () => { if (filtered[focusIdx]) openPerson(commitments.indexOf(filtered[focusIdx])); } },
  ] : [], [filtered.length, focusIdx, activePerson]);

  // ── Lock validation ──
  const filledSlots = person ? person.items.filter((it, idx) => it.title.trim() && person.deselected !== idx).length : 0;
  const bufferFilled = person ? (person.deselected >= 0 && person.buffer.trim() && person.bufferProject) : false;
  const activeCount = filledSlots + (bufferFilled ? 1 : 0);

  const readyCount = person ? person.items.filter((it, idx) => {
    if (person.deselected === idx) return false;
    return it.title.trim() && it.project;
  }).length + (bufferFilled ? 1 : 0) : 0;

  const lockBlockers = [];
  if (person && !isLocked) {
    if (activeCount !== 3) lockBlockers.push(`Need exactly 3 active commitments (have ${activeCount})`);
    person.items.forEach((it, idx) => {
      if (person.deselected === idx) return;
      if (it.title.trim() && !it.project) lockBlockers.push(`Task ${idx + 1}: select a project`);
      if (!it.title.trim() && it.project) lockBlockers.push(`Task ${idx + 1}: describe what you're delivering`);
    });
    if (person.deselected >= 0 && !person.buffer.trim()) lockBlockers.push("Buffer: describe what you're delivering");
    if (person.deselected >= 0 && !person.bufferProject) lockBlockers.push("Buffer: select a project");
  }
  const canLock = person ? lockBlockers.length === 0 : false;

  // ── 6-hour lock cooldown ──
  const LOCK_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
  const [lockCountdown, setLockCountdown] = useState("");
  const lockExpired = useRef(true);

  useEffect(() => {
    if (!person?.lockedAtTime) { setLockCountdown(""); lockExpired.current = true; return; }
    const tick = () => {
      const elapsed = Date.now() - person.lockedAtTime;
      const remaining = LOCK_COOLDOWN_MS - elapsed;
      if (remaining <= 0) { setLockCountdown(""); lockExpired.current = true; return; }
      lockExpired.current = false;
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setLockCountdown(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [person?.lockedAtTime]);

  const canUnlock = lockExpired.current;

  const handleLock = () => {
    if (!canLock || isLocked) return;
    const ts = new Date().toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      // Initialize weeksRemaining from duration on lock
      p.items = p.items.map(it => ({ ...it, weeksRemaining: it.duration || 1 }));
      next[activePerson] = { ...p, lockedAt: ts, lockedAtTime: Date.now() };
      return next;
    });
    if (setIsLocked) setIsLocked(true);
  };
  const handleUnlock = () => {
    if (!canUnlock) return;
    setCommitments(prev => { const next = [...prev]; next[activePerson] = { ...next[activePerson], lockedAt: null, lockedAtTime: null }; return next; });
    if (setIsLocked) setIsLocked(false);
    setClosingMode(false);
  };

  // ── Keyboard: detail view ──
  useKeyboard(person ? [
    { key: "Escape", fn: () => { if (blockedModal) { setBlockedModal(null); setBlockedText(""); } else if (confirmAction) { setConfirmAction(null); } else if (closingMode) { setClosingMode(false); } else goBackToList(); }, force: true },
    { key: "l", fn: () => { if (phase === "planning" && canLock) setConfirmAction("lock"); } },
    { key: "u", fn: () => { if (isLocked && !closingMode && canUnlock) setConfirmAction("unlock"); } },
    { key: "f", fn: () => { if (phase === "locked") setClosingMode(true); } },
    { key: "ArrowUp", fn: () => setDetailFocus(i => Math.max(0, i - 1)) },
    { key: "ArrowDown", fn: () => setDetailFocus(i => Math.min(person.items.length - 1, i + 1)) },
  ] : [], [activePerson, isLocked, activeCount, person?.items?.length, closingMode, phase]);

  useEffect(() => {
    if (focusIdx >= filtered.length && filtered.length > 0) setFocusIdx(filtered.length - 1);
  }, [filtered.length, focusIdx]);

  const tc = typeConfig();
  const pc = getPhaseColors();

  // ── Sort helpers ──
  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";
  const dp = { cellPad: "4px 6px", headerPad: "8px 6px" };

  const Th = ({ col, children, style: s }) => (
    <th onClick={() => toggleSort(col)} style={{
      padding: dp.headerPad, textAlign: "left", fontFamily: body, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.05em", cursor: "pointer", userSelect: "none",
      borderBottom: `1px solid ${c.border}`,
      background: c.bg, color: sortCol === col ? c.accent : c.text,
      transition: "color 0.2s", position: "sticky", top: 0, zIndex: 2,
      textTransform: "uppercase", whiteSpace: "nowrap", ...s,
    }}>{children}{sortIcon(col)}</th>
  );

  // ═══ PEOPLE QUEUE (list view) ═══
  if (!person) {
    const total = filtered.length;
    const locked = filtered.filter(cm => !!cm.lockedAt).length;
    const filled = filtered.filter(cm => !cm.lockedAt && cm.items.filter((it, idx) => it.title.trim() && cm.deselected !== idx).length >= 3).length;
    const partial = filtered.filter(cm => { const f = cm.items.filter((it, idx) => it.title.trim() && cm.deselected !== idx).length; return !cm.lockedAt && f > 0 && f < 3; }).length;
    const empty = total - locked - filled - partial;
    const pctLocked = total > 0 ? Math.round((locked / total) * 100) : 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* ── Sticky control bar — stays in place while list scrolls ── */}
        <div className="flow-focus-sticky" style={{ position: "sticky", top: 92, zIndex: 10, background: c.bg, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}>
        {/* UNIFIED SUMMARY — status tiles + KPIs in one strip (Pulse-style) */}
        <div className="flow-mission-grid" style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            {/* Status tiles — clickable filters */}
            <SummaryTile value={locked} label="Locked" color={c.green} active={filterStatus === "locked"} onClick={() => { setFilterStatus(filterStatus === "locked" ? null : "locked"); setRowAnimKey(k => k + 1); }} />
            <SummaryTile value={filled} label="Ready" color={c.blue} active={filterStatus === "ready"} onClick={() => { setFilterStatus(filterStatus === "ready" ? null : "ready"); setRowAnimKey(k => k + 1); }} />
            <SummaryTile value={partial} label="Partial" color={c.orange} active={filterStatus === "partial"} onClick={() => { setFilterStatus(filterStatus === "partial" ? null : "partial"); setRowAnimKey(k => k + 1); }} />
            <SummaryTile value={empty} label="Empty" color={c.red} active={filterStatus === "empty"} onClick={() => { setFilterStatus(filterStatus === "empty" ? null : "empty"); setRowAnimKey(k => k + 1); }} />

            {/* Divider */}
            <div style={{ width: 1, height: 36, background: c.border, flexShrink: 0, margin: "0 6px" }} />

            {/* KPI metrics */}
            <SummaryMetric value={total} label="Team" color={c.text} />
            <SummaryMetric value={`${pctLocked}%`} label="Locked" color={pctLocked === 100 ? c.green : pctLocked >= 50 ? c.accent : c.textDim} />

            {/* Divider */}
            <div style={{ width: 1, height: 36, background: c.border, flexShrink: 0, margin: "0 6px" }} />

            {/* Progress bar */}
            <div style={{ flex: 1, minWidth: 120, display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
              <div style={{ height: 8, background: c.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ display: "flex", height: "100%" }}>
                  <div style={{ width: `${total > 0 ? (locked / total) * 100 : 0}%`, background: c.green, transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                  <div style={{ width: `${total > 0 ? (filled / total) * 100 : 0}%`, background: c.blue, transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                  <div style={{ width: `${total > 0 ? (partial / total) * 100 : 0}%`, background: c.orange, transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VIEW MODE TOGGLE — People / Commitments (Pulse-style) */}
        <div style={{ display: "flex", gap: 2, background: c.accentDim, borderRadius: 10, padding: 3 }}>
          {[{ key: "people", label: "People" }, { key: "summary", label: "Commitments" }].map(v => (
            <button key={v.key} onClick={() => { setViewMode(v.key); setRowAnimKey(k => k + 1); setSortCol("squad"); setSortDir("asc"); }} style={{
              flex: 1, padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: viewMode === v.key ? c.accent : "transparent",
              fontFamily: body, fontSize: 12.5, fontWeight: viewMode === v.key ? 700 : 500,
              color: viewMode === v.key ? "#fff" : c.accent,
              transition: "all 0.15s",
              boxShadow: viewMode === v.key ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            }}>{v.label}</button>
          ))}
        </div>

        </div>{/* end sticky bar */}

        {/* ═══════════════════════════════════════════════════════════
            VIEW CONTENT — Tables matching Pulse style
            ═══════════════════════════════════════════════════════════ */}

        {/* Commitments table — flat rows, one per locked commitment item */}
        {viewMode === "summary" && (() => {
          const allItems = filtered.flatMap(cm => {
            if (!cm.lockedAt) return [];
            const rows = cm.items
              .map((it, idx) => ({
                ...it, person: cm.person, isDeselected: cm.deselected === idx, isLocked: true,
                _status: cm.deselected === idx ? "Deprioritized"
                  : it.outcome === "done" ? "Completed"
                  : it.outcome === "carry" ? "Carry"
                  : it.outcome === "done_carry" ? "Completed+Carry"
                  : it.outcome === "blocked" ? "Blocked"
                  : "WIP",
              }))
              .filter(it => it.title.trim());
            // Add buffer item if active
            if (cm.deselected >= 0 && cm.buffer && cm.buffer.trim() && cm.bufferProject) {
              rows.push({
                title: cm.buffer, project: cm.bufferProject, stage: cm.bufferStage || "",
                type: cm.bufferType || "", duration: cm.bufferDuration || 1,
                person: cm.person, isDeselected: false, isLocked: true, isBuffer: true,
                outcome: cm.bufferOutcome || null,
                _status: cm.bufferOutcome === "done" ? "Completed"
                  : cm.bufferOutcome === "carry" ? "Carry"
                  : cm.bufferOutcome === "done_carry" ? "Completed+Carry"
                  : cm.bufferOutcome === "blocked" ? "Blocked"
                  : "Buffer",
              });
            }
            return rows;
          });
          // Sort
          const sortedItems = [...allItems].sort((a, b) => {
            let va, vb;
            const pA = people.find(p => p.name === a.person);
            const pB = people.find(p => p.name === b.person);
            if (sortCol === "person") { va = a.person; vb = b.person; }
            else if (sortCol === "project") { va = a.project || ""; vb = b.project || ""; }
            else if (sortCol === "type") { va = a.type || ""; vb = b.type || ""; }
            else if (sortCol === "stage") { va = a.stage || ""; vb = b.stage || ""; }
            else if (sortCol === "status") { va = a._status || ""; vb = b._status || ""; }
            else { va = pA?.squad || ""; vb = pB?.squad || ""; }
            return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
          });

          return (
            <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, overflow: "hidden", background: "transparent", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh", background: "transparent", borderRadius: layout.radius }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: 60 }}>Squad</Th>
                      <Th col="person" style={{ minWidth: 120, borderLeft: `1px dotted ${c.border}` }}>Person</Th>
                      <Th col="project" style={{ minWidth: 100, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                      <Th col="title" style={{ minWidth: 180, borderLeft: `1px dotted ${c.border}` }}>Focus</Th>
                      <Th col="type" style={{ minWidth: 64, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Type</Th>
                      <Th col="stage" style={{ minWidth: 70, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Stage</Th>
                      <Th col="status" style={{ minWidth: 80, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Status</Th>
                    </tr>
                  </thead>
                  <tbody key={rowAnimKey}>
                    {sortedItems.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: "30px 0", fontFamily: body, fontSize: 13, color: c.textDim }}>No locked commitments yet</td></tr>
                    )}
                    {sortedItems.map((it, ri) => {
                      const pObj = people.find(p => p.name === it.person);
                      const proj = projects.find(pr => pr.id === it.project);
                      const statusColors = {
                        WIP: c.accent, Completed: c.green, Carry: c.blue,
                        "Completed+Carry": c.orange, Blocked: c.red,
                        Deprioritized: c.textDim, Buffer: c.accent,
                      };
                      const sClr = statusColors[it._status] || c.textDim;
                      return (
                        <tr key={`${it.person}-${it.project}-${ri}`} className="flow-row" style={{
                          animation: `rowSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both`,
                          animationDelay: `${Math.min(ri * 20, 600)}ms`,
                          opacity: it._status === "Deprioritized" ? 0.55 : 1,
                        }}>
                          <td style={{ padding: dp.cellPad, fontFamily: body, fontSize: 11, fontWeight: 600, color: c.textMid, borderBottom: `1px dotted ${c.border}`, position: "sticky", left: 0, background: c.bg, zIndex: 1 }}>{pObj?.squad || "—"}</td>
                          <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <span onClick={() => { const idx = commitments.findIndex(cm => cm.person === it.person); if (idx >= 0) openPerson(idx); }} style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "40", textUnderlineOffset: 2 }}>{it.person}</span>
                          </td>
                          <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.accent }}>{it.project}</span>
                            {proj && <span style={{ fontFamily: body, fontSize: 11, fontWeight: 500, color: c.text, marginLeft: 5 }}>{proj.name}</span>}
                          </td>
                          <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, fontFamily: body, fontSize: 11, color: c.text, textDecoration: it._status === "Deprioritized" ? "line-through" : "none" }}>{it.title}</td>
                          <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{it.type}</Badge>
                          </td>
                          <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            {it.stage ? <Tag color={pc[it.stage] || c.textMid} bg={`${pc[it.stage] || c.textMid}15`}>{it.stage}</Tag> : <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>—</span>}
                          </td>
                          <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <Tag color={sClr} bg={`${sClr}15`}>{it._status}</Tag>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* People table — one row per person, sortable columns (Pulse-style) */}
        {viewMode === "people" && (() => {
          const statusColors = { Locked: c.green, Ready: c.blue, Partial: c.orange, Empty: c.red };
          // Build rows with status info
          const rows = filtered.map(cm => {
            const pObj = people.find(p => p.name === cm.person);
            const filledCount = cm.items.filter((it, idx) => it.title.trim() && cm.deselected !== idx).length;
            const isClosed = !!cm.lockedAt;
            const status = isClosed ? "Locked" : filledCount >= 3 ? "Ready" : filledCount > 0 ? "Partial" : "Empty";
            return { cm, pObj, filledCount, status, realIdx: commitments.indexOf(cm) };
          });

          // Apply status filter from tiles
          const statusFiltered = filterStatus ? rows.filter(r => r.status.toLowerCase() === filterStatus) : rows;

          // Sort within each group
          const sortRows = (arr) => [...arr].sort((a, b) => {
            let va, vb;
            if (sortCol === "person") { va = a.cm.person; vb = b.cm.person; }
            else if (sortCol === "role") { va = a.pObj?.role || ""; vb = b.pObj?.role || ""; }
            else if (sortCol === "status") { va = a.status; vb = b.status; }
            else if (sortCol === "filled") { va = a.filledCount; vb = b.filledCount; }
            else { va = a.pObj?.squad || ""; vb = b.pObj?.squad || ""; }
            if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
            return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
          });

          // Group by status in display order
          const statusOrder = ["Locked", "Ready", "Partial", "Empty"];
          const grouped = statusOrder.map(st => ({
            status: st,
            color: statusColors[st],
            rows: sortRows(statusFiltered.filter(r => r.status === st)),
          })).filter(g => g.rows.length > 0);

          let globalRi = 0;

          return (
            <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, overflow: "hidden", background: "transparent", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh", background: "transparent", borderRadius: layout.radius }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead>
                    <tr>
                      <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: 60 }}>Squad</Th>
                      <Th col="person" style={{ minWidth: 130, borderLeft: `1px dotted ${c.border}` }}>Person</Th>
                      <Th col="role" style={{ minWidth: 90, borderLeft: `1px dotted ${c.border}` }}>Role</Th>
                      <Th col="filled" style={{ minWidth: 80, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Filled</Th>
                      <Th col="status" style={{ minWidth: 70, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Status</Th>
                    </tr>
                  </thead>
                  <tbody key={rowAnimKey}>
                    {grouped.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: "30px 0", fontFamily: body, fontSize: 13, color: c.textDim }}>No one found</td></tr>
                    )}
                    {grouped.map(group => {
                      const sectionRows = group.rows.map(row => {
                        const ri = globalRi++;
                        const isFocused = kbActive && ri === focusIdx;
                        const sColor = statusColors[row.status] || c.textDim;
                        return (
                          <tr
                            key={row.cm.person}
                            className={`flow-row${isFocused ? " flow-kb-focus" : ""}`}
                            onClick={() => openPerson(row.realIdx)}
                            style={{
                              cursor: "pointer",
                              background: isFocused ? c.surfaceAlt : "transparent",
                              transition: "background 0.15s",
                              animation: `rowSlideIn 0.3s cubic-bezier(0.16,1,0.3,1) both`,
                              animationDelay: `${Math.min(ri * 20, 600)}ms`,
                            }}
                          >
                            <td style={{ padding: dp.cellPad, fontFamily: body, fontSize: 11, fontWeight: 600, color: c.textMid, borderBottom: `1px dotted ${c.border}`, position: "sticky", left: 0, background: c.bg, zIndex: 1 }}>{row.pObj?.squad || "—"}</td>
                            <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                              <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: c.textMid + "40", textUnderlineOffset: 2 }}>{row.cm.person}</span>
                            </td>
                            <td style={{ padding: dp.cellPad, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, fontFamily: body, fontSize: 11, fontWeight: 500, color: c.textMid }}>{row.pObj?.role || "—"}</td>
                            <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  {[0, 1, 2].map(si => (
                                    <div key={si} style={{
                                      width: 14, height: 4, borderRadius: 2,
                                      background: si < row.filledCount ? sColor : c.surfaceAlt,
                                      border: si < row.filledCount ? "none" : `1px solid ${c.border}`,
                                      transition: "all 0.3s",
                                    }} />
                                  ))}
                                </div>
                                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: sColor }}>{row.filledCount}/3</span>
                              </div>
                            </td>
                            <td style={{ padding: dp.cellPad, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                              <Tag color={sColor} bg={`${sColor}15`}>{row.status}</Tag>
                            </td>
                          </tr>
                        );
                      });
                      return [
                        <tr key={`section-${group.status}`}>
                          <td colSpan={5} style={{
                            padding: "10px 8px 6px",
                            fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                            color: group.color, background: `${group.color}08`,
                            borderBottom: `1px solid ${group.color}20`,
                            borderTop: `1px solid ${group.color}15`,
                          }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: group.color, display: "inline-block", opacity: 0.7 }} />
                              {group.status.toUpperCase()}
                              <span style={{ fontWeight: 500, color: c.textDim, letterSpacing: "0.02em" }}>{group.rows.length}</span>
                            </span>
                          </td>
                        </tr>,
                        ...sectionRows,
                      ];
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ═══ COMMITMENT EDITOR (detail view) — Phase-driven ═══════════
  const bufferActive = person.deselected >= 0;
  const personMeta = people.find(p => p.name === person.person);

  // Carry-to weeks for closing phase
  const base = new Date("2026-03-10");
  const weeks = [];
  for (let w = 1; w <= 4; w++) {
    const d = new Date(base);
    d.setDate(d.getDate() + w * 7);
    weeks.push({ value: d.toISOString().split("T")[0], label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
  }

  // Current week frame label
  const weekEnd = new Date(base);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${base.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  // Closing phase: track outcomes
  const activeItems = person.items
    .map((it, idx) => ({ ...it, idx }))
    .filter(it => it.title.trim() && person.deselected !== it.idx);
  const fullyResolved = activeItems.filter(it => {
    if (!it.outcome) return false;
    if ((it.outcome === "carry" || it.outcome === "done_carry") && !it.carryTo) return false;
    if (it.outcome === "blocked" && !(it.blockedReason || "").trim()) return false;
    return true;
  }).length;
  const allDeclared = fullyResolved === activeItems.length && activeItems.length > 0;
  const weekComplete = allDeclared;

  // Phase badge config
  const phaseBadge = {
    planning: { label: "Planning Week", color: c.accent, bg: c.accentDim },
    locked: { label: "Week Locked", color: c.green, bg: c.greenDim },
    closing: { label: "Closing Week", color: c.orange, bg: c.orangeDim },
  }[phase];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ═══ COMPACT HEADER — left: identity, right: week + actions ═══ */}
      <div className="flow-neon-card flow-focus-hero" style={{
        background: c.surface, padding: "12px 16px",
        border: `1px solid ${c.border}`,
        boxShadow: `0 2px 12px ${c.shadow}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative", zIndex: 2 }}>
          {/* LEFT — avatar + name + badges + status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: c.accentDim,
              border: `2px solid ${c.accent}50`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: display, fontSize: 13, fontWeight: 800, color: c.accent,
              flexShrink: 0,
            }}>{person.person.charAt(0)}</div>
            <div style={{ fontFamily: display, fontSize: 16, fontWeight: 800, color: c.text, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{person.person}</div>
            {personMeta && (
              <>
                <Badge color={c.accent} bg={c.accentDim}>{personMeta.role}</Badge>
                <Badge color={c.orange} bg={c.orangeDim}>{personMeta.squad}</Badge>
              </>
            )}
            {/* Inline status indicator */}
            {phase === "planning" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {[0, 1, 2].map(si => (
                    <div key={si} style={{
                      width: 14, height: 3, borderRadius: 2,
                      background: si < readyCount ? c.green : c.surfaceAlt,
                      border: si < readyCount ? "none" : `1px solid ${c.border}`,
                    }} />
                  ))}
                </div>
                <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: canLock ? c.green : c.textDim }}>
                  {canLock ? "Ready" : `${readyCount}/3`}
                </span>
              </div>
            )}
            {phase === "closing" && (
              <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: weekComplete ? c.green : c.textMid, marginLeft: 4, flexShrink: 0 }}>
                {weekComplete ? "All resolved" : `${fullyResolved}/${activeItems.length} resolved`}
              </span>
            )}
          </div>

          {/* RIGHT — week label + phase badge + action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Week label */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <rect x="1" y="3" width="14" height="12" rx="2" stroke={c.textDim} strokeWidth="1.3" fill="none" />
                <line x1="1" y1="7" x2="15" y2="7" stroke={c.textDim} strokeWidth="1.3" />
                <line x1="5" y1="1" x2="5" y2="5" stroke={c.textDim} strokeWidth="1.3" strokeLinecap="round" />
                <line x1="11" y1="1" x2="11" y2="5" stroke={c.textDim} strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span style={{ fontFamily: body, fontSize: 11, fontWeight: 600, color: c.textMid }}>{weekLabel}</span>
            </div>

            {/* Phase badge */}
            <div className={phase === "locked" ? "flow-focus-lock-glow" : ""} style={{
              padding: "4px 10px", borderRadius: 6,
              background: phaseBadge.bg,
              border: `1px solid ${phaseBadge.color}30`,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: phaseBadge.color, boxShadow: phase === "locked" ? `0 0 6px ${c.green}60` : "none" }} />
              <span style={{ fontFamily: body, fontSize: 10, fontWeight: 600, color: phaseBadge.color }}>{phaseBadge.label}</span>
            </div>

            {/* Action buttons */}
            {phase === "planning" && (
              <button onClick={() => { if (!canLock) return; setConfirmAction("lock"); }} className="flow-btn" style={{
                padding: "5px 14px", borderRadius: 6, border: "none", cursor: canLock ? "pointer" : "default",
                background: canLock ? `linear-gradient(135deg, ${c.green}20, ${c.green}40)` : c.surfaceAlt,
                color: canLock ? c.green : c.textDim,
                fontFamily: display, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                opacity: canLock ? 1 : 0.5, transition: "all 0.15s",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>Lock Week <kbd style={{ fontFamily: mono, fontSize: 8, opacity: 0.6 }}>L</kbd></span>
              </button>
            )}
            {phase === "locked" && person.lockedAt && (
              <span style={{ fontFamily: body, fontSize: 10, fontWeight: 500, color: c.textDim }}>
                {person.lockedAt}
              </span>
            )}
            {phase === "locked" && (
              <>
                <button onClick={() => setClosingMode(true)} className="flow-btn" style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg, ${c.accent}20, ${c.accent}40)`,
                  color: c.accent, fontFamily: display, fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>Finish <kbd style={{ fontFamily: mono, fontSize: 8, opacity: 0.6 }}>F</kbd></span>
                </button>
                <button onClick={() => { if (canUnlock) setConfirmAction("unlock"); }} className="flow-btn" style={{
                  padding: "4px 10px", borderRadius: 5, border: `1px solid ${canUnlock ? c.border : c.orange + "25"}`,
                  background: canUnlock ? "transparent" : c.orange + "08",
                  cursor: canUnlock ? "pointer" : "default",
                  fontFamily: body, fontSize: 10, fontWeight: 500, color: canUnlock ? c.textDim : c.orange,
                  opacity: canUnlock ? 1 : 0.8, transition: "all 0.15s",
                }}>
                  {canUnlock ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>Unlock <kbd style={{ fontFamily: mono, fontSize: 7, opacity: 0.5 }}>U</kbd></span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="8" rx="2" stroke={c.orange} strokeWidth="1.5" fill="none" /><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke={c.orange} strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                      <span style={{ fontFamily: mono, fontSize: 8 }}>{lockCountdown}</span>
                    </span>
                  )}
                </button>
              </>
            )}
            {phase === "closing" && (
              <button onClick={() => setClosingMode(false)} className="flow-btn" style={{
                padding: "4px 12px", borderRadius: 5, border: `1px solid ${c.border}`,
                background: "transparent", cursor: "pointer",
                fontFamily: body, fontSize: 10, fontWeight: 500, color: c.textDim,
              }}>Back to Locked</button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TASK CARDS — 2x2 grid ═══════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: phase === "planning" ? "1fr" : "1fr 1fr", gap: 8 }}>
        {person.items.map((item, idx) => {
          const isD = person.deselected === idx;
          const projObj = projects.find(p => p.id === item.project);
          const isEmpty = !item.project && !item.title.trim();
          const outcome = item.outcome;
          const isFocused = idx === detailFocus;
          const outcomeColor = outcome === "done" ? c.green : outcome === "carry" ? c.blue : outcome === "blocked" ? c.red : outcome === "done_carry" ? c.orange : null;
          const tCfg = tc[item.type] || {};

          // ── DEPRIORITIZED TASK — collapsed ──
          if (isD) return (
            <div key={idx} className="flow-neon-card flow-card-archived" style={{
              background: c.surfaceAlt,
              border: `1px solid ${c.red}15`,
              padding: "8px 12px",
              opacity: 0.4,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative", zIndex: 2, minWidth: 0 }}>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: c.textDim }}>{idx + 1}</span>
                {item.title.trim() && <span style={{ fontFamily: body, fontSize: 11, color: c.textDim, textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</span>}
                <span style={{
                  fontFamily: mono, fontSize: 8, fontWeight: 700, color: c.red,
                  background: c.redDim, padding: "2px 6px", borderRadius: 3,
                  letterSpacing: "0.06em", flexShrink: 0,
                }}>DEPRI</span>
              </div>
              {phase === "planning" && (
                <button onClick={() => toggleDeselect(idx)} className="flow-btn" style={{
                  padding: "3px 8px", borderRadius: 4, border: `1px solid ${c.border}`,
                  background: "transparent", cursor: "pointer", fontFamily: body, fontSize: 10, fontWeight: 500, color: c.textDim,
                  position: "relative", zIndex: 2, flexShrink: 0,
                }}>Restore</button>
              )}
            </div>
          );

          // ── PLANNING PHASE — editable task cards ──
          if (phase === "planning") {
            // Empty slot
            if (isEmpty) return (
              <div key={idx} className={`flow-neon-card flow-task-card${isFocused ? " flow-neon-active" : ""}`} style={{
                background: "transparent", border: `1.5px dashed ${c.border}`,
                padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, position: "relative", zIndex: 2 }}>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 800, color: c.textDim }}>{idx + 1}</span>
                  <span style={{ fontFamily: display, fontSize: 13, fontWeight: 600, color: c.textDim }}>Task {idx + 1}</span>
                </div>
                <div style={{ position: "relative", zIndex: 2 }}>
                  <Sel value="" onChange={e => {
                    updateItem(idx, "project", e.target.value);
                    const p = projects.find(pr => pr.id === e.target.value);
                    if (p) updateItem(idx, "stage", p.phase);
                  }} style={{ width: "100%", fontSize: 12, fontWeight: 600, padding: "8px 12px" }}>
                    <option value="">Select project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
                  </Sel>
                </div>
              </div>
            );

            // Filled slot — editable (full-width single-column)
            return (
              <div key={idx} className={`flow-neon-card flow-task-card${isFocused ? " flow-neon-active" : ""}`} style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderLeft: `3px solid ${item.project ? c.accent + "60" : c.border}`,
                padding: "14px 16px",
                transition: "all 0.2s ease",
              }}>
                {/* Card header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, position: "relative", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: c.textMid }}>{idx + 1}</span>
                    {projObj
                      ? <span style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: c.text }}>{projObj.name}</span>
                      : <span style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: c.textDim }}>Task {idx + 1}</span>
                    }
                    {projObj && <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: c.textDim }}>{projObj.id}</span>}
                  </div>
                  <button onClick={() => toggleDeselect(idx)} className="flow-btn" style={{
                    padding: "4px 10px", borderRadius: 4, border: `1px solid ${c.border}`,
                    background: "transparent", cursor: "pointer",
                    fontFamily: body, fontSize: 10, fontWeight: 500, color: c.textDim,
                  }}>Change Priority</button>
                </div>

                {/* Project + Description — side by side for full-width layout */}
                <div style={{ display: "flex", gap: 10, marginBottom: 10, position: "relative", zIndex: 2 }}>
                  <div style={{ width: 220, flexShrink: 0 }}>
                    <Sel value={item.project} onChange={e => {
                      updateItem(idx, "project", e.target.value);
                      const p = projects.find(pr => pr.id === e.target.value);
                      if (p && !item.stage) updateItem(idx, "stage", p.phase);
                    }} style={{ width: "100%", fontSize: 12, fontWeight: 600, padding: "8px 12px", color: item.project ? c.text : c.textDim }}>
                      <option value="">Select project...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
                    </Sel>
                    {!item.project && item.title.trim() && (
                      <span className="flow-validation-msg" style={{ fontFamily: body, fontSize: 10, color: c.orange, marginTop: 3, display: "block" }}>Select a project</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={item.title}
                      onChange={e => updateItem(idx, "title", e.target.value)}
                      placeholder="What will you deliver this week?"
                      className="flow-input"
                      rows={1}
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 6,
                        border: `1px solid ${c.border}`, background: c.surfaceAlt,
                        color: c.text, fontFamily: body, fontSize: 13, fontWeight: 500,
                        lineHeight: 1.4, outline: "none", boxSizing: "border-box",
                        resize: "vertical", minHeight: 36,
                      }}
                    />
                    {!item.title.trim() && item.project && (
                      <span className="flow-validation-msg" style={{ fontFamily: body, fontSize: 10, color: c.orange, marginTop: 3, display: "block" }}>Describe what you're delivering</span>
                    )}
                  </div>
                </div>

                {/* Selectors — all on one row: STAGE · TYPE · WEEKS */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em", marginRight: 3 }}>STAGE</span>
                    {phaseNames.map(s => {
                      const active = item.stage === s;
                      const sColor = pc[s] || c.textDim;
                      return (
                        <button key={s} onClick={() => updateItem(idx, "stage", s)} className="flow-btn" style={{
                          padding: "4px 8px", borderRadius: 4,
                          border: `1px solid ${active ? sColor + "40" : c.border}`,
                          background: active ? sColor + "12" : "transparent",
                          color: active ? sColor : c.textDim,
                          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{s}</button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em", marginRight: 3 }}>TYPE</span>
                    {["BUILD", "JAM", "COMMIT", "BLOCKED"].map(t => {
                      const active = item.type === t;
                      const cfg = tc[t] || {};
                      return (
                        <button key={t} onClick={() => updateItem(idx, "type", t)} className="flow-btn" style={{
                          padding: "4px 8px", borderRadius: 4,
                          border: `1px solid ${active ? cfg.color + "40" : c.border}`,
                          background: active ? cfg.bg : "transparent",
                          color: active ? cfg.color : c.textDim,
                          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{t}</button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em", marginRight: 3 }}>WEEKS</span>
                    {[1, 2, 3, 4].map(w => {
                      const active = (item.duration || 1) === w;
                      return (
                        <button key={w} onClick={() => updateItem(idx, "duration", w)} className="flow-btn" style={{
                          padding: "4px 8px", borderRadius: 4,
                          border: `1px solid ${active ? c.accent + "40" : c.border}`,
                          background: active ? c.accentDim : "transparent",
                          color: active ? c.accent : c.textDim,
                          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{w}w</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // ── LOCKED PHASE — read-only task cards ──
          if (phase === "locked") {
            if (isEmpty) return null; // hide empty slots when locked
            const stageColor = pc[item.stage] || c.textDim;

            return (
              <div key={idx} className="flow-neon-card flow-task-card" style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderLeft: `3px solid ${item.project ? c.accent + "30" : c.border}`,
                padding: "10px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, position: "relative", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 800, color: c.textMid }}>{idx + 1}</span>
                    {projObj && <span style={{ fontFamily: display, fontSize: 13, fontWeight: 700, color: c.text }}>{projObj.name}</span>}
                    {item.stage && (
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: stageColor, background: stageColor + "12",
                        padding: "2px 7px", borderRadius: 4,
                      }}>{item.stage}</span>
                    )}
                    {item.type && (
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: tCfg.color || c.textDim, background: tCfg.bg || c.surfaceAlt,
                        padding: "2px 7px", borderRadius: 4,
                      }}>{item.type}</span>
                    )}
                    {(item.duration || 1) > 1 && (
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: c.accent, background: c.accentDim,
                        padding: "2px 7px", borderRadius: 4,
                      }}>{item.duration}w</span>
                    )}
                  </div>
                </div>
                <div style={{
                  fontFamily: body, fontSize: 12, fontWeight: 500, color: c.text, lineHeight: 1.5,
                  whiteSpace: "pre-wrap", position: "relative", zIndex: 2,
                }}>{item.title}</div>
              </div>
            );
          }

          // ── CLOSING PHASE — read-only + inline outcome controls ──
          if (phase === "closing") {
            if (isEmpty) return null;
            const stageColor = pc[item.stage] || c.textDim;
            const showDoneCarry = (item.weeksRemaining || item.duration || 1) > 1;
            const carryColor = outcome === "done_carry" ? c.orange : c.blue;

            return (
              <div key={idx} className="flow-neon-card flow-task-card" style={{
                background: outcome ? `${outcomeColor}06` : c.surface,
                border: `1px solid ${outcome ? outcomeColor + "25" : c.border}`,
                borderLeft: `3px solid ${outcomeColor || c.accent + "30"}`,
                padding: "10px 12px",
                transition: "all 0.2s ease",
              }}>
                {/* Card header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, position: "relative", zIndex: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 800, color: outcomeColor || c.textMid }}>{idx + 1}</span>
                    {projObj && <span style={{ fontFamily: display, fontSize: 13, fontWeight: 700, color: c.text }}>{projObj.name}</span>}
                    {item.stage && (
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: stageColor, background: stageColor + "12",
                        padding: "2px 7px", borderRadius: 4,
                      }}>{item.stage}</span>
                    )}
                    {item.type && (
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: tCfg.color || c.textDim, background: tCfg.bg || c.surfaceAlt,
                        padding: "2px 7px", borderRadius: 4,
                      }}>{item.type}</span>
                    )}
                    {(item.duration || 1) > 1 && (
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: c.accent, background: c.accentDim,
                        padding: "2px 7px", borderRadius: 4,
                      }}>{item.weeksRemaining || item.duration}w left</span>
                    )}
                  </div>
                  {(outcome === "carry" || outcome === "done_carry") && item.carryTo && (() => {
                    const d = new Date(item.carryTo + "T00:00:00");
                    return (
                      <span style={{
                        fontFamily: mono, fontSize: 9, fontWeight: 600, color: carryColor,
                        padding: "2px 7px", borderRadius: 4, background: outcome === "done_carry" ? c.orangeDim : c.blueDim,
                      }}>{"\u2192"} {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    );
                  })()}
                </div>

                {/* Deliverable text */}
                <div style={{
                  fontFamily: body, fontSize: 12, fontWeight: 500, color: c.text, lineHeight: 1.5,
                  whiteSpace: "pre-wrap", position: "relative", zIndex: 2,
                  textDecoration: (outcome === "done" || outcome === "done_carry") ? `line-through ${outcomeColor}60` : "none",
                  marginBottom: outcome === "blocked" && item.blockedReason ? 0 : 10,
                }}>{item.title}</div>

                {/* Blocked reason inline display */}
                {outcome === "blocked" && item.blockedReason && (
                  <div style={{
                    margin: "6px 0 10px", padding: "6px 10px", borderRadius: 6,
                    background: c.red + "0A", border: `1px solid ${c.red}20`,
                    position: "relative", zIndex: 2,
                  }}>
                    <span style={{ fontFamily: mono, fontSize: 8, fontWeight: 800, color: c.red, letterSpacing: "0.1em" }}>BLOCKER</span>
                    <div style={{ fontFamily: body, fontSize: 11, fontWeight: 400, color: c.textMid, marginTop: 2, lineHeight: 1.4 }}>{item.blockedReason}</div>
                  </div>
                )}

                {/* Outcome buttons — Completed / Carry / Completed+Carry / Blocked */}
                <div style={{ display: "flex", gap: 4, position: "relative", zIndex: 2 }}>
                  {[
                    { val: "done", label: "Completed", clr: c.green },
                    { val: "carry", label: "Carry", clr: c.blue },
                    ...(showDoneCarry ? [{ val: "done_carry", label: "Completed+Carry", clr: c.orange }] : []),
                    { val: "blocked", label: "Blocked", clr: c.red },
                  ].map(btn => {
                    const active = outcome === btn.val;
                    return (
                      <button key={btn.val} onClick={() => updateOutcome(idx, btn.val)} className="flow-btn flow-outcome-btn" style={{
                        flex: 1, padding: "6px 6px", borderRadius: 6, cursor: "pointer",
                        background: active ? `linear-gradient(135deg, ${btn.clr}20, ${btn.clr}12)` : c.surfaceAlt,
                        border: `1.5px solid ${active ? btn.clr + "40" : c.border}`,
                        fontFamily: display, fontSize: 10, fontWeight: 700,
                        color: active ? btn.clr : c.textDim,
                        boxShadow: active ? `0 0 16px ${btn.clr}10` : "none",
                        transition: "all 0.15s",
                      }}>{btn.label}</button>
                    );
                  })}
                </div>

                {/* Carry-to picker — for carry and done_carry */}
                {(outcome === "carry" || outcome === "done_carry") && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6, marginTop: 8,
                    paddingTop: 8, borderTop: `1px solid ${c.border}`,
                    position: "relative", zIndex: 2, flexWrap: "wrap",
                  }}>
                    <span style={{ fontFamily: body, fontSize: 10, fontWeight: 500, color: c.textDim, whiteSpace: "nowrap" }}>Carry to</span>
                    {weeks.map(wk => {
                      const sel = item.carryTo === wk.value;
                      return (
                        <button key={wk.value} onClick={() => updateCarryTo(idx, wk.value)} className="flow-btn" style={{
                          padding: "3px 8px", borderRadius: 4,
                          border: `1px solid ${sel ? carryColor : c.border}`,
                          background: sel ? (outcome === "done_carry" ? c.orangeDim : c.blueDim) : "transparent",
                          color: sel ? carryColor : c.textMid,
                          fontFamily: body, fontSize: 10, fontWeight: sel ? 700 : 500,
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{wk.label}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}

        {/* ═══ BUFFER CARD ═══════════════════════════════════════ */}
        {phase === "planning" && (
          <div className={`flow-neon-card flow-task-card${bufferActive ? " flow-card-buffer-slide" : ""}`} style={{
            background: bufferActive ? c.surface : "transparent",
            border: bufferActive ? `1px solid ${c.border}` : `1.5px dashed ${c.border}`,
            borderLeft: `3px solid ${bufferActive ? c.accent + "60" : c.border}`,
            padding: bufferActive ? "14px 16px" : "10px 16px",
            opacity: bufferActive ? 1 : 0.5,
            transition: "all 0.2s ease",
          }}>
            {!bufferActive ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 2 }}>
                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: c.textDim }}>B</span>
                <span style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: c.textDim }}>Buffer Task</span>
                <span style={{ fontFamily: body, fontSize: 11, color: c.textDim, marginLeft: 4 }}>{"\u2014"} use {"\u21C5"} to enable</span>
              </div>
            ) : (
              <div style={{ position: "relative", zIndex: 2 }}>
                {/* Buffer header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: c.textMid }}>B</span>
                    <span style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: c.text }}>Buffer</span>
                    <span style={{
                      fontFamily: mono, fontSize: 10, fontWeight: 700, color: c.accent,
                      background: c.accentDim, padding: "3px 8px", borderRadius: 4,
                      letterSpacing: "0.06em",
                    }}>REPLACING TASK {person.deselected + 1}</span>
                  </div>
                  <button onClick={() => toggleDeselect(person.deselected)} className="flow-btn" style={{
                    padding: "4px 10px", borderRadius: 4, border: `1px solid ${c.border}`,
                    background: "transparent", cursor: "pointer",
                    fontFamily: body, fontSize: 10, fontWeight: 500, color: c.textDim,
                  }}>Restore</button>
                </div>

                {/* Project + Description — side by side */}
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 220, flexShrink: 0 }}>
                    <Sel value={person.bufferProject || ""} onChange={e => updatePerson("bufferProject", e.target.value)}
                      style={{ width: "100%", fontSize: 12, fontWeight: 600, padding: "8px 12px", color: person.bufferProject ? c.text : c.textDim }}>
                      <option value="">Select project...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
                    </Sel>
                  </div>
                  <div style={{ flex: 1 }}>
                    <textarea
                      value={person.buffer}
                      onChange={e => updatePerson("buffer", e.target.value)}
                      placeholder="What will you deliver this week?"
                      className="flow-input"
                      rows={1}
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 6,
                        border: `1px solid ${c.border}`, background: c.surfaceAlt,
                        color: c.text, fontFamily: body, fontSize: 13, fontWeight: 500,
                        lineHeight: 1.4, outline: "none", boxSizing: "border-box",
                        resize: "vertical", minHeight: 36,
                      }}
                    />
                  </div>
                </div>

                {/* Selectors — all on one row: STAGE · TYPE · WEEKS */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em", marginRight: 3 }}>STAGE</span>
                    {phaseNames.map(s => {
                      const active = person.bufferStage === s;
                      const sColor = pc[s] || c.textDim;
                      return (
                        <button key={s} onClick={() => updatePerson("bufferStage", s)} className="flow-btn" style={{
                          padding: "4px 8px", borderRadius: 4,
                          border: `1px solid ${active ? sColor + "40" : c.border}`,
                          background: active ? sColor + "12" : "transparent",
                          color: active ? sColor : c.textDim,
                          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{s}</button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em", marginRight: 3 }}>TYPE</span>
                    {["BUILD", "JAM", "COMMIT", "BLOCKED"].map(t => {
                      const active = person.bufferType === t;
                      const cfg = tc[t] || {};
                      return (
                        <button key={t} onClick={() => updatePerson("bufferType", t)} className="flow-btn" style={{
                          padding: "4px 8px", borderRadius: 4,
                          border: `1px solid ${active ? cfg.color + "40" : c.border}`,
                          background: active ? cfg.bg : "transparent",
                          color: active ? cfg.color : c.textDim,
                          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{t}</button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.textDim, letterSpacing: "0.06em", marginRight: 3 }}>WEEKS</span>
                    {[1, 2, 3, 4].map(w => {
                      const active = (person.bufferDuration || 1) === w;
                      return (
                        <button key={w} onClick={() => updatePerson("bufferDuration", w)} className="flow-btn" style={{
                          padding: "4px 8px", borderRadius: 4,
                          border: `1px solid ${active ? c.accent + "40" : c.border}`,
                          background: active ? c.accentDim : "transparent",
                          color: active ? c.accent : c.textDim,
                          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{w}w</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buffer in locked/closing phase — show if active */}
        {(phase === "locked" || phase === "closing") && bufferActive && person.buffer.trim() && (() => {
          const bufProjObj = projects.find(p => p.id === person.bufferProject);
          const bufStageCl = pc[person.bufferStage] || c.textDim;
          const bufTypeCfg = tc[person.bufferType] || {};
          return (
            <div className="flow-neon-card flow-task-card" style={{
              background: c.surface,
              border: `1px solid ${c.border}`,
              borderLeft: `3px solid ${c.accent}30`,
              padding: "10px 12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, position: "relative", zIndex: 2, flexWrap: "wrap" }}>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 800, color: c.textMid }}>B</span>
                {bufProjObj && <span style={{ fontFamily: display, fontSize: 13, fontWeight: 700, color: c.text }}>{bufProjObj.name}</span>}
                {person.bufferStage && (
                  <span style={{
                    fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                    color: bufStageCl, background: bufStageCl + "12",
                    padding: "2px 7px", borderRadius: 4,
                  }}>{person.bufferStage}</span>
                )}
                {person.bufferType && (
                  <span style={{
                    fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                    color: bufTypeCfg.color || c.textDim, background: bufTypeCfg.bg || c.surfaceAlt,
                    padding: "2px 7px", borderRadius: 4,
                  }}>{person.bufferType}</span>
                )}
                <span style={{
                  fontFamily: mono, fontSize: 9, fontWeight: 700, color: c.accent,
                  background: c.accentDim, padding: "2px 7px", borderRadius: 4,
                  letterSpacing: "0.06em",
                }}>BUFFER</span>
              </div>
              <div style={{
                fontFamily: body, fontSize: 12, fontWeight: 500, color: c.text, lineHeight: 1.5,
                whiteSpace: "pre-wrap", position: "relative", zIndex: 2,
              }}>{person.buffer}</div>
            </div>
          );
        })()}
      </div>

      {/* ═══ CLOSE WEEK BAR ════════════════════════════════════ */}
      {phase === "closing" && (
        <div style={{
          background: weekComplete ? `linear-gradient(135deg, ${c.green}12, ${c.green}06)` : c.surfaceAlt,
          border: `1px solid ${weekComplete ? c.green + "30" : c.border}`,
          borderRadius: 8, padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: display, fontSize: 14, fontWeight: 800, color: weekComplete ? c.green : c.textMid, letterSpacing: "-0.01em" }}>
              {weekComplete ? "All commitments resolved" : `${fullyResolved}/${activeItems.length} resolved`}
            </div>
            <div style={{ fontFamily: body, fontSize: 11, color: c.textDim, marginTop: 2 }}>
              {weekComplete ? "Ready to close this week" : "Resolve all items to close the week"}
            </div>
          </div>
          <button
            disabled={!weekComplete}
            onClick={() => {
              // Auto-carry: copy carried tasks to target week
              setCommitments(prev => {
                const next = [...prev];
                const p = { ...next[activePerson] };
                const carriedItems = p.items.filter((it, idx) =>
                  it.title.trim() && p.deselected !== idx &&
                  (it.outcome === "carry" || it.outcome === "done_carry") && it.carryTo
                );
                // For each carried item, find or create commitment for same person in target week
                carriedItems.forEach(item => {
                  const newItem = {
                    title: item.title,
                    type: item.type,
                    project: item.project,
                    stage: item.stage,
                    duration: item.outcome === "done_carry" ? Math.max(1, (item.weeksRemaining || 1)) : (item.duration || 1),
                    outcome: null,
                    carryTo: null,
                    blockedReason: "",
                    carriedFrom: weekLabel,
                  };
                  // Find existing commitment for this person in target week or add to current
                  // Since we don't have multi-week storage yet, we mark items for carry-forward
                  const existingIdx = next.findIndex(c => c.person === p.person && c !== p);
                  if (existingIdx === -1) {
                    // Add as a new commitment entry for this person (future week)
                    next.push({
                      person: p.person,
                      items: [newItem, { title: "", type: "", project: "", stage: "", duration: 1 }, { title: "", type: "", project: "", stage: "", duration: 1 }],
                      buffer: "",
                      deselected: -1,
                      weekStart: item.carryTo,
                    });
                  } else {
                    // Add to first empty slot or append
                    const target = { ...next[existingIdx] };
                    const targetItems = [...target.items];
                    const emptyIdx = targetItems.findIndex(t => !t.title.trim());
                    if (emptyIdx !== -1) {
                      targetItems[emptyIdx] = newItem;
                    } else {
                      targetItems.push(newItem);
                    }
                    target.items = targetItems;
                    next[existingIdx] = target;
                  }
                });
                // Mark the person's week as closed
                p.closedAt = new Date().toISOString();
                next[activePerson] = p;
                return next;
              });
              setClosingMode(false);
            }}
            className="flow-btn"
            style={{
              padding: "8px 20px", borderRadius: 8, cursor: weekComplete ? "pointer" : "not-allowed",
              background: weekComplete ? `linear-gradient(135deg, ${c.green}, ${c.green}CC)` : c.surfaceAlt,
              border: `1px solid ${weekComplete ? c.green : c.border}`,
              fontFamily: display, fontSize: 13, fontWeight: 700,
              color: weekComplete ? "#fff" : c.textDim,
              opacity: weekComplete ? 1 : 0.5,
              transition: "all 0.2s",
            }}>Close Week</button>
        </div>
      )}

      {/* ═══ CONFIRMATION MODAL (Lock / Unlock) ═══════════════════ */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Backdrop — opaque to fully block content behind */}
          <div onClick={() => setConfirmAction(null)} style={{
            position: "absolute", inset: 0, background: "#000",
          }} />
          {/* Dialog */}
          <div style={{
            position: "relative", zIndex: 1,
            background: c.surface,
            border: `1px solid ${confirmAction === "lock" ? c.green + "40" : c.orange + "40"}`,
            borderRadius: 14, padding: "24px 28px", width: 460, maxWidth: "90vw",
            boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px ${c.border}`,
          }}>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 8 }}>
              {confirmAction === "lock" ? "Lock this week?" : "Unlock this week?"}
            </div>
            <div style={{ fontFamily: body, fontSize: 13, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: 10 }}>
              {confirmAction === "lock"
                ? "Once locked, tasks become read-only and you will not be able to unlock or edit for the next 6 hours. This prevents frequent changes and keeps your team aligned."
                : "Tasks will become editable again. Any changes made will be updated in the system."}
            </div>
            {confirmAction === "lock" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
                background: c.orange + "0A", border: `1px solid ${c.orange}20`, marginBottom: 16,
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="7" stroke={c.orange} strokeWidth="1.3" fill="none" />
                  <line x1="8" y1="4" x2="8" y2="9" stroke={c.orange} strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.8" fill={c.orange} />
                </svg>
                <span style={{ fontFamily: body, fontSize: 12, fontWeight: 500, color: c.orange }}>
                  6-hour lock cooldown — no edits during this period
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: confirmAction === "lock" ? 0 : 16 }}>
              <button onClick={() => setConfirmAction(null)} className="flow-btn" style={{
                padding: "8px 18px", borderRadius: 8, border: `1px solid ${c.border}`,
                background: "transparent", cursor: "pointer",
                fontFamily: body, fontSize: 13, fontWeight: 500, color: c.textDim,
              }}>Cancel</button>
              <button onClick={() => {
                if (confirmAction === "lock") handleLock();
                else handleUnlock();
                setConfirmAction(null);
              }} className="flow-btn" style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                background: confirmAction === "lock"
                  ? `linear-gradient(135deg, ${c.green}30, ${c.green}50)`
                  : `linear-gradient(135deg, ${c.orange}30, ${c.orange}50)`,
                fontFamily: display, fontSize: 13, fontWeight: 700,
                color: confirmAction === "lock" ? c.green : c.orange,
              }}>{confirmAction === "lock" ? "Yes, Lock Week" : "Yes, Unlock"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BLOCKED REASON MODAL ═══════════════════════════════════ */}
      {blockedModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => { setBlockedModal(null); setBlockedText(""); }} style={{
            position: "absolute", inset: 0, background: "#000",
          }} />
          <div style={{
            position: "relative", zIndex: 1,
            background: c.surface,
            border: `1px solid ${c.red}40`,
            borderRadius: 14, padding: "24px 28px", width: 460, maxWidth: "90vw",
            boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px ${c.border}`,
          }}>
            <div style={{ fontFamily: display, fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 8 }}>
              Why is this blocked?
            </div>
            <div style={{ fontFamily: body, fontSize: 13, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: 12 }}>
              Describe the blocker so your team knows what needs to be resolved.
            </div>
            <textarea
              autoFocus
              value={blockedText}
              onChange={e => setBlockedText(e.target.value)}
              placeholder="e.g. Waiting on API access from platform team..."
              className="flow-input"
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: `1.5px solid ${c.red}30`, background: c.surfaceAlt,
                color: c.text, fontFamily: body, fontSize: 13, fontWeight: 400,
                lineHeight: 1.5, outline: "none", boxSizing: "border-box",
                resize: "vertical", minHeight: 60,
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => { setBlockedModal(null); setBlockedText(""); }} className="flow-btn" style={{
                padding: "8px 18px", borderRadius: 8, border: `1px solid ${c.border}`,
                background: "transparent", cursor: "pointer",
                fontFamily: body, fontSize: 13, fontWeight: 500, color: c.textDim,
              }}>Cancel</button>
              <button onClick={saveBlockedReason} disabled={!blockedText.trim()} className="flow-btn" style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: blockedText.trim() ? "pointer" : "not-allowed",
                background: blockedText.trim()
                  ? `linear-gradient(135deg, ${c.red}30, ${c.red}50)`
                  : c.surfaceAlt,
                fontFamily: display, fontSize: 13, fontWeight: 700,
                color: blockedText.trim() ? c.red : c.textDim,
                opacity: blockedText.trim() ? 1 : 0.5,
              }}>Mark Blocked</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HumansView;
