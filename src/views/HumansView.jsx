// Flow — Focus View (Phase-driven: Planning → Locked → Closing)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, layout, motion, space, typo, phaseNames, typeConfig, phaseColors as getPhaseColors, density, btnVariants, entityColors, colWidths } from "../styles/theme";
import { Badge, Tag, Surface, Inp, TextArea, ChoiceGroup, Sel, Btn, TelemetryLabel, SummaryTile, Th as SharedTh, MetricCompact, EntityLink, VDivider, SectionDivider } from "../components/shared";
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
    <div className="flow-focus-kpi" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space[1], animationDelay: `${delay}ms` }}>
      <span style={{ fontFamily: typo.displayXl.font, fontSize: typo.displayXl.size, fontWeight: typo.displayXl.weight, color, letterSpacing: typo.displayXl.tracking, lineHeight: typo.displayXl.lineHeight }}>{displayVal}</span>
      <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.textMid, letterSpacing: "0" }}>{label}</span>
    </div>
  );
};


// ─── PROJECT SEARCH/SELECT — supports typing project ID ──────────
const ProjectSearchSelect = ({ projects, value, onChange, placeholder }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = projects.find(p => p.id === value);
  const lq = query.toLowerCase();
  const filtered = query ? projects.filter(p =>
    p.id.toLowerCase().includes(lq) || p.name.toLowerCase().includes(lq)
  ) : projects;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (selected) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: space[2],
          padding: `${space[2]}px ${space[3]}px`, borderRadius: layout.radiusSm,
          background: c.surfaceAlt, border: `1px solid ${c.border}`,
        }}>
          <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: entityColors().project }}>{selected.id}</span>
          <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 500, color: c.text }}>{selected.name}</span>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => { onChange(""); setQuery(""); }}>Change</Btn>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Inp
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Search by name or ID..."}
        style={{ width: "100%" }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
          maxHeight: 200, overflowY: "auto",
          background: c.surfaceOverlay, border: `1px solid ${c.border}`,
          borderRadius: layout.radiusSm, marginTop: 2,
          boxShadow: c.shadowOverlay,
        }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => { onChange(p.id); setQuery(""); setOpen(false); }}
              className="flow-row" style={{
                padding: `${space[2]}px ${space[3]}px`, cursor: "pointer",
                display: "flex", alignItems: "center", gap: space[2],
                transition: `background ${motion.interaction.duration}`,
              }}>
              <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: entityColors().project, minWidth: 36 }}>{p.id}</span>
              <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.text, flex: 1 }}>{p.name}</span>
              {p.phase && <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.textDim, textTransform: "uppercase" }}>{p.phase}</span>}
            </div>
          ))}
        </div>
      )}
      {open && query && filtered.length === 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
          padding: `${space[3]}px`, background: c.surfaceOverlay,
          border: `1px solid ${c.border}`, borderRadius: layout.radiusSm, marginTop: 2,
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim,
          textAlign: "center",
        }}>No projects match "{query}"</div>
      )}
    </div>
  );
};

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

  const Th = ({ col, children, style: s }) => (
    <SharedTh col={col} sortKey={sortCol} sortDir={sortDir} onSort={toggleSort}
      style={s}>{children}</SharedTh>
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
        {/* ── Sticky command surface — matches Pulse pattern ── */}
        <div style={{
          position: "sticky", top: 92, zIndex: 10,
          background: c.bg, paddingBottom: space[3],
          display: "flex", flexDirection: "column", gap: space[3] - 2,
        }}>

        {/* UNIFIED SUMMARY — status tiles + KPIs + progress in one strip */}
        <div className="flow-mission-grid" style={{ padding: `${space[3]}px ${space[4]}px` }}>
          <div style={{
            display: "flex", alignItems: "center", gap: space[1],
            flexWrap: "wrap", position: "relative", zIndex: 1,
          }}>
            {/* Status tiles — clickable filters */}
            <SummaryTile value={locked} label="Locked" color={c.green} active={filterStatus === "locked"} onClick={() => { setFilterStatus(filterStatus === "locked" ? null : "locked"); setRowAnimKey(k => k + 1); }} />
            <SummaryTile value={filled} label="Ready" color={c.cyan} active={filterStatus === "ready"} onClick={() => { setFilterStatus(filterStatus === "ready" ? null : "ready"); setRowAnimKey(k => k + 1); }} />
            <SummaryTile value={partial} label="Partial" color={c.orange} active={filterStatus === "partial"} onClick={() => { setFilterStatus(filterStatus === "partial" ? null : "partial"); setRowAnimKey(k => k + 1); }} />
            <SummaryTile value={empty} label="Empty" color={c.red} active={filterStatus === "empty"} onClick={() => { setFilterStatus(filterStatus === "empty" ? null : "empty"); setRowAnimKey(k => k + 1); }} />

            <VDivider />

            {/* KPI metrics */}
            <MetricCompact value={total} label="Team" color={c.text} />
            <MetricCompact value={`${pctLocked}%`} label="Locked" color={pctLocked === 100 ? c.green : pctLocked >= 50 ? c.accent : c.textDim} />

            <VDivider />

            {/* Progress bar — lock readiness */}
            <div style={{ flex: 1, minWidth: 120, display: "flex", alignItems: "center", gap: space[2] }}>
              <TelemetryLabel style={{ flexShrink: 0 }}>PROGRESS</TelemetryLabel>
              <div style={{ flex: 1, height: 6, background: c.surfaceAlt, borderRadius: layout.radiusTag, overflow: "hidden" }}>
                <div style={{ display: "flex", height: "100%" }}>
                  <div style={{ width: `${total > 0 ? (locked / total) * 100 : 0}%`, background: c.green, transition: `width 0.6s ${motion.interaction.easing}` }} />
                  <div style={{ width: `${total > 0 ? (filled / total) * 100 : 0}%`, background: c.cyan, transition: `width 0.6s ${motion.interaction.easing}` }} />
                  <div style={{ width: `${total > 0 ? (partial / total) * 100 : 0}%`, background: c.orange, transition: `width 0.6s ${motion.interaction.easing}` }} />
                </div>
              </div>
              <span style={{
                fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                fontWeight: 800, letterSpacing: typo.monoMd.tracking, flexShrink: 0,
                color: pctLocked === 100 ? c.green : pctLocked >= 50 ? c.accent : c.textMid,
              }}>{pctLocked}%</span>
            </div>
          </div>
        </div>

        {/* VIEW MODE TOGGLE — matches Pulse segmented control */}
        <div style={{
          display: "flex", gap: 2,
          background: c.accentDim, borderRadius: layout.radiusMd, padding: 3,
        }}>
          {[{ key: "people", label: "People" }, { key: "summary", label: "Commitments" }].map(v => (
            <button key={v.key} onClick={() => { setViewMode(v.key); setRowAnimKey(k => k + 1); setSortCol("squad"); setSortDir("asc"); }} style={{
              flex: 1, padding: `${space[2]}px ${space[4]}px`,
              borderRadius: layout.radiusMd, border: "none", cursor: "pointer",
              background: viewMode === v.key ? c.accent : "transparent",
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
              fontWeight: viewMode === v.key ? 700 : 500,
              color: viewMode === v.key ? c.textCrit : c.accent,
              transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              boxShadow: viewMode === v.key ? `0 1px 3px ${c.shadow}` : "none",
            }}>{v.label}</button>
          ))}
        </div>

        </div>{/* end sticky command surface */}

        {/* ═══ VIEW CONTENT ═══ */}

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
            <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, overflow: "hidden", background: "transparent", boxShadow: c.shadowCard }}>
              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh", background: "transparent", borderRadius: layout.radius }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: colWidths.squad.min }}>Squad</Th>
                      <Th col="person" style={{ minWidth: colWidths.person.min, borderLeft: `1px dotted ${c.border}` }}>Person</Th>
                      <Th col="project" style={{ minWidth: colWidths.identity.min, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                      <Th col="title" style={{ minWidth: colWidths.focus.min, borderLeft: `1px dotted ${c.border}` }}>Focus</Th>
                      <Th col="type" style={{ minWidth: colWidths.status.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Type</Th>
                      <Th col="stage" style={{ minWidth: colWidths.phase.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Stage</Th>
                      <Th col="status" style={{ minWidth: colWidths.status.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Status</Th>
                    </tr>
                  </thead>
                  <tbody key={rowAnimKey}>
                    {sortedItems.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: `${space[7]}px 0`, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>No locked commitments yet</td></tr>
                    )}
                    {sortedItems.map((it, ri) => {
                      const pObj = people.find(p => p.name === it.person);
                      const proj = projects.find(pr => pr.id === it.project);
                      const outcomeColors = {
                        WIP: c.cyan, Completed: c.green, Carry: c.cyan,
                        "Completed+Carry": c.orange, Blocked: c.red,
                        Deprioritized: c.textDim, Buffer: c.purple,
                      };
                      const sClr = outcomeColors[it._status] || c.textDim;
                      return (
                        <tr key={`${it.person}-${it.project}-${ri}`} className="flow-row" style={{
                          animation: `rowSlideIn 0.3s ${motion.interaction.easing} both`,
                          animationDelay: `${Math.min(ri * 20, 600)}ms`,
                          opacity: it._status === "Deprioritized" ? 0.55 : 1,
                        }}>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.textMid, borderBottom: `1px dotted ${c.border}`, position: "sticky", left: 0, background: c.bg, zIndex: 1 }}>{pObj?.squad || "\u2014"}</td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <EntityLink type="person" onClick={() => { const idx = commitments.findIndex(cm => cm.person === it.person); if (idx >= 0) openPerson(idx); }} underline style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600 }}>{it.person}</EntityLink>
                          </td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <EntityLink type="project" style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700 }}>{it.project}</EntityLink>
                            {proj && <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.text, marginLeft: space[1] }}>{proj.name}</span>}
                          </td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text, textDecoration: it._status === "Deprioritized" ? "line-through" : "none" }}>{it.title}</td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <Badge color={tc[it.type]?.color} bg={tc[it.type]?.bg}>{tc[it.type]?.label || it.type}</Badge>
                          </td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            {it.stage ? <Badge color={pc[it.stage] || c.textMid} bg={`${pc[it.stage] || c.textMid}15`}>{it.stage}</Badge> : <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.textDim }}>{"\u2014"}</span>}
                          </td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, textAlign: "center", borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <Badge color={sClr} bg={`${sClr}15`}>{it._status}</Badge>
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

        {/* People table — grouped by operational status */}
        {viewMode === "people" && (() => {
          const commitStatusColors = { Locked: c.green, Ready: c.cyan, Partial: c.orange, Empty: c.red };
          const groupOrder = [
            { key: "Locked", label: "Locked", color: c.green, icon: "●" },
            { key: "Ready", label: "Ready to Lock", color: c.cyan, icon: "◉" },
            { key: "Partial", label: "Partial", color: c.orange, icon: "◐" },
            { key: "Empty", label: "Empty", color: c.red, icon: "○" },
          ];
          // Build rows with status info
          const rows = filtered.map(cm => {
            const pObj = people.find(p => p.name === cm.person);
            const filledCount = cm.items.filter((it, idx) => it.title.trim() && cm.deselected !== idx).length;
            const isClosed = !!cm.lockedAt;
            const status = isClosed ? "Locked" : filledCount >= 3 ? "Ready" : filledCount > 0 ? "Partial" : "Empty";
            return { cm, pObj, filledCount, status, realIdx: commitments.indexOf(cm) };
          });

          // Sort within each group
          const sortRows = (arr) => [...arr].sort((a, b) => {
            let va, vb;
            if (sortCol === "person") { va = a.cm.person; vb = b.cm.person; }
            else if (sortCol === "role") { va = a.pObj?.role || ""; vb = b.pObj?.role || ""; }
            else if (sortCol === "filled") { va = a.filledCount; vb = b.filledCount; }
            else { va = a.pObj?.squad || ""; vb = b.pObj?.squad || ""; }
            if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va;
            return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
          });

          // When a status filter is active, show only that group flat; otherwise show grouped sections
          const activeFilter = filterStatus;
          const groupsToRender = activeFilter
            ? groupOrder.filter(g => g.key.toLowerCase() === activeFilter)
            : groupOrder;

          // Build grouped data
          const groupedData = groupsToRender.map(g => ({
            ...g,
            rows: sortRows(rows.filter(r => r.status === g.key)),
          })).filter(g => g.rows.length > 0);

          let globalRowIdx = 0;

          return (
            <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, overflow: "hidden", background: "transparent", boxShadow: c.shadowCard }}>
              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "68vh", background: "transparent", borderRadius: layout.radius }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead>
                    <tr>
                      <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: colWidths.squad.min }}>Squad</Th>
                      <Th col="person" style={{ minWidth: colWidths.person.min }}>Person</Th>
                      <Th col="role" style={{ minWidth: colWidths.role.min }}>Role</Th>
                      <Th col="filled" style={{ minWidth: colWidths.metric.min, textAlign: "center" }}>Filled</Th>
                      <Th col="status" style={{ minWidth: colWidths.status.min, textAlign: "center" }}>Status</Th>
                    </tr>
                  </thead>
                  <tbody key={rowAnimKey}>
                    {groupedData.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: `${space[7]}px 0`, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>No one found</td></tr>
                    )}
                    {groupedData.map((group) => {
                      const sectionRows = group.rows.map((row) => {
                        const ri = globalRowIdx++;
                        const isFocused = kbActive && ri === focusIdx;
                        const sColor = commitStatusColors[row.status] || c.textDim;
                        return (
                          <tr
                            key={row.cm.person}
                            className={`flow-row${isFocused ? " flow-kb-focus" : ""}`}
                            onClick={() => openPerson(row.realIdx)}
                            style={{
                              cursor: "pointer",
                              background: isFocused ? c.surfaceAlt : "transparent",
                              transition: `background ${motion.interaction.duration} ${motion.interaction.easing}`,
                              animation: `rowSlideIn 0.3s ${motion.interaction.easing} both`,
                              animationDelay: `${Math.min(ri * 20, 600)}ms`,
                            }}
                          >
                            <td style={{ padding: `${space[2] + 2}px ${space[3]}px`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.textMid, borderBottom: `1px solid ${c.border}08`, position: "sticky", left: 0, background: isFocused ? c.surfaceAlt : c.bg, zIndex: 1 }}>{row.pObj?.squad || "\u2014"}</td>
                            <td style={{ padding: `${space[2] + 2}px ${space[3]}px`, borderBottom: `1px solid ${c.border}08` }}>
                              <EntityLink type="person" style={{ fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size, fontWeight: typo.bodyLg.weight }}>{row.cm.person}</EntityLink>
                            </td>
                            <td style={{ padding: `${space[2] + 2}px ${space[3]}px`, borderBottom: `1px solid ${c.border}08`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.textMid }}>{row.pObj?.role || "\u2014"}</td>
                            <td style={{ padding: `${space[2] + 2}px ${space[3]}px`, textAlign: "center", borderBottom: `1px solid ${c.border}08` }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
                                <div style={{ display: "flex", alignItems: "center", gap: space[1] }}>
                                  {[0, 1, 2].map(si => (
                                    <div key={si} style={{
                                      width: 14, height: 4, borderRadius: 2,
                                      background: si < row.filledCount ? sColor : c.surfaceAlt,
                                      border: si < row.filledCount ? "none" : `1px solid ${c.border}`,
                                      transition: `all ${motion.critical.duration} ${motion.critical.easing}`,
                                    }} />
                                  ))}
                                </div>
                                <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, color: sColor }}>{row.filledCount}/3</span>
                              </div>
                            </td>
                            <td style={{ padding: `${space[2] + 2}px ${space[3]}px`, textAlign: "center", borderBottom: `1px solid ${c.border}08` }}>
                              <Badge color={sColor} bg={`${sColor}15`}>{row.status}</Badge>
                            </td>
                          </tr>
                        );
                      });

                      return [
                        /* Section header row */
                        !activeFilter && (
                          <tr key={`section-${group.key}`}>
                            <td colSpan={5} style={{
                              padding: `${space[2] + 2}px ${space[3]}px`,
                              background: `${group.color}06`,
                              borderBottom: `1px solid ${group.color}18`,
                              borderTop: `1px solid ${group.color}12`,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                                <div style={{
                                  width: 6, height: 6, borderRadius: "50%",
                                  background: group.color, boxShadow: `0 0 6px ${group.color}40`,
                                }} />
                                <span style={{
                                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                                  fontWeight: 700, color: group.color, letterSpacing: "0",
                                }}>{group.label}</span>
                                <span style={{
                                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                                  fontWeight: typo.monoMd.weight, color: group.color,
                                  opacity: 0.7,
                                }}>{group.rows.length}</span>
                              </div>
                            </td>
                          </tr>
                        ),
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
  const weekLabel = `${base.toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2013 ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

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
    planning: { label: "Planning", color: c.accent, bg: c.accentDim },
    locked: { label: "Locked", color: c.green, bg: c.greenDim },
    closing: { label: "Closing", color: c.orange, bg: c.orangeDim },
  }[phase];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>

      {/* ═══ DETAIL HEADER — two-line layout ═══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: `${space[3]}px ${space[4]}px`,
        background: c.surface, border: `1px solid ${phase === "locked" ? c.green + "15" : c.border}`,
        borderRadius: layout.radius, position: "relative", overflow: "hidden",
      }}>
        {/* Green bottom highlight for locked phase */}
        {phase === "locked" && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${c.green}, ${c.green}18)`,
            boxShadow: `0 0 16px ${c.green}30`,
          }} />
        )}

        {/* Left: Avatar + Name (line 1) + Role·Squad (line 2) */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: c.accentDim, border: `2px solid ${c.accent}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, color: c.accent, flexShrink: 0,
          }}>{person.person.charAt(0)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking, color: c.text,
            }}>{person.person}</span>
            {personMeta && (
              <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.textMid }}>
                {personMeta.role} · {personMeta.squad}
              </span>
            )}
          </div>
        </div>

        {/* Right: Status indicators + action (top row) + date (bottom row) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: space[1] }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            {/* Planning: progress bars + ready/filled text + Lock button */}
            {phase === "planning" && (
              <>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(si => (
                    <div key={si} style={{
                      width: 18, height: 4, borderRadius: 2,
                      background: si < readyCount ? c.green : c.surfaceAlt,
                      border: si < readyCount ? "none" : `1px solid ${c.border}`,
                    }} />
                  ))}
                </div>
                {readyCount > 0 && (
                  <span style={{
                    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                    fontWeight: typo.monoMd.weight, letterSpacing: typo.monoMd.tracking,
                    color: canLock ? c.green : c.textDim,
                  }}>{canLock ? "READY TO LOCK" : `${readyCount}/3 FILLED`}</span>
                )}
                <Btn variant="success" size="sm" disabled={!canLock} onClick={() => { if (canLock) setConfirmAction("lock"); }}>
                  Lock Week <kbd style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, opacity: 0.6 }}>L</kbd>
                </Btn>
              </>
            )}
            {/* Locked: Locked pill with timer + Finish button */}
            {phase === "locked" && (
              <>
                <div style={{
                  display: "flex", alignItems: "center", gap: space[1] + 2,
                  padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm,
                  background: `${c.green}08`, border: `1px solid ${c.green}25`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.green, boxShadow: `0 0 6px ${c.green}60` }} />
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.green, textTransform: "uppercase" }}>Locked</span>
                  {lockCountdown && (
                    <>
                      <div style={{ width: 1, height: 12, background: `${c.green}20` }} />
                      <svg width="9" height="9" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.5 }}>
                        <rect x="3" y="7" width="10" height="8" rx="2" stroke={c.green} strokeWidth="1.5" fill="none" />
                        <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke={c.green} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.green, opacity: 0.7 }}>{lockCountdown}</span>
                    </>
                  )}
                </div>
                <Btn variant="primary" size="sm" onClick={() => setClosingMode(true)}>
                  Finish <kbd style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, opacity: 0.6 }}>F</kbd>
                </Btn>
              </>
            )}
            {/* Closing: progress bars + resolved text + Closing pill + Back button */}
            {phase === "closing" && (
              <>
                <div style={{ display: "flex", gap: 3 }}>
                  {activeItems.map((_, i) => (
                    <div key={i} style={{
                      width: 18, height: 4, borderRadius: 2,
                      background: i < fullyResolved ? c.green : c.surfaceAlt,
                      border: i < fullyResolved ? "none" : `1px solid ${c.border}`,
                    }} />
                  ))}
                </div>
                <span style={{
                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                  fontWeight: typo.monoMd.weight, color: weekComplete ? c.green : c.textMid,
                }}>{weekComplete ? "ALL RESOLVED" : `${fullyResolved}/${activeItems.length} RESOLVED`}</span>
                <div style={{
                  padding: `3px ${space[2] + 2}px`, borderRadius: layout.radiusSm,
                  background: `${c.orange}08`, border: `1px solid ${c.orange}25`,
                  display: "flex", alignItems: "center", gap: space[1],
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.orange }} />
                  <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.orange, textTransform: "uppercase" }}>Closing</span>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => setClosingMode(false)}>Back to Locked</Btn>
              </>
            )}
          </div>
          {/* Date range — bottom row */}
          <span style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, fontWeight: 400, color: c.textDim }}>{weekLabel}</span>
        </div>
      </div>

      {/* ═══ PLANNING PHASE — Dot Navigation + Spotlight ═══ */}
      {phase === "planning" && (() => {
        const spotItem = person.items[detailFocus];
        const spotProj = projects.find(p => p.id === spotItem?.project);
        const spotEmpty = !spotItem?.project && !(spotItem?.title || "").trim();
        const spotHasProject = !!spotItem?.project;
        const spotHasTitle = !!(spotItem?.title || "").trim();
        const spotIsDepri = person.deselected === detailFocus;
        const slotFilled = person.items.map((it, idx) =>
          person.deselected !== idx && !!it.project && !!(it.title || "").trim()
        );
        // Show Deprioritize only when editing an existing commitment (not first visit)
        const showDepri = spotHasProject && spotHasTitle;

        return (
          <>
            {/* ── Dot Navigation ── */}
            <div style={{ display: "flex", alignItems: "center", gap: space[2], margin: `${space[4]}px auto ${space[3]}px`, width: "fit-content" }}>
              {[0, 1, 2].map((di) => {
                const filled = slotFilled[di];
                const active = di === detailFocus;
                const depri = person.deselected === di;
                return (
                  <React.Fragment key={di}>
                    {di > 0 && <div style={{ width: 20, height: 1, background: c.border }} />}
                    <div onClick={() => { if (!depri) setDetailFocus(di); }} style={{
                      width: 36, height: 36, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, cursor: depri ? "default" : "pointer",
                      position: "relative",
                      transition: `all 0.2s ${motion.interaction.easing}`,
                      ...(depri ? { background: "transparent", border: `2px solid ${c.red}20`, color: c.textDim, opacity: 0.35 }
                        : active ? { background: `${c.accent}15`, border: `2px solid ${c.accent}`, color: c.accent, boxShadow: `0 0 20px ${c.accent}25`, transform: "scale(1.12)" }
                        : filled ? { background: `${c.green}10`, border: `2px solid ${c.green}30`, color: c.green }
                        : { background: "transparent", border: `2px solid ${c.border}`, color: c.textDim }),
                    }}>
                      {di + 1}
                      {filled && !depri && (
                        <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: c.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: c.bg, fontWeight: 900 }}>{"\u2713"}</div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              <div style={{ width: 20, height: 0, borderTop: `1px dashed ${c.purple}25` }} />
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, border: `2px dashed ${c.purple}30`,
                color: c.purple, background: "transparent", opacity: bufferActive ? 1 : 0.4,
                cursor: "default",
              }}>B</div>
            </div>

            {/* ── Spotlight Card ── */}
            {spotIsDepri ? (
              <div style={{
                maxWidth: 640, margin: "0 auto", width: "100%",
                background: c.surfaceAlt, border: `1px solid ${c.red}15`,
                borderRadius: layout.radius + 2, padding: `${space[3]}px ${space[4]}px`,
                opacity: 0.45, display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <span style={{ fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: typo.monoLg.weight, color: c.textDim }}>{detailFocus + 1}</span>
                  {(spotItem.title || "").trim() && <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, textDecoration: "line-through" }}>{spotItem.title}</span>}
                  <Badge color={c.red} bg={c.redDim}>Depri</Badge>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => toggleDeselect(detailFocus)}>Restore</Btn>
              </div>
            ) : (
              <div style={{
                maxWidth: 640, margin: "0 auto", width: "100%",
                background: spotEmpty ? `${c.accent}02` : c.surface,
                border: spotEmpty ? `1.5px dashed ${c.accent}20` : `1px solid ${c.border}`,
                borderRadius: layout.radius + 2, padding: `${space[6]}px`,
                display: "flex", flexDirection: "column", gap: space[4],
              }}>
                {/* Spotlight header — number badge + project name or placeholder */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: layout.radiusMd,
                      background: `${c.accent}10`, border: `1px solid ${c.accent}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: c.accent, flexShrink: 0,
                    }}>{detailFocus + 1}</div>
                    <div>
                      <div style={{
                        fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
                        fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
                        color: spotProj ? c.text : c.textMid,
                      }}>{spotProj ? spotProj.name : `Commitment ${detailFocus + 1}`}</div>
                      {spotProj ? (
                        <div style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, color: c.textDim, marginTop: 2 }}>
                          <span style={{ color: entityColors().project }}>{spotProj.id}</span> · {spotProj.phase || ""}
                        </div>
                      ) : (
                        <div style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, color: c.textDim, marginTop: 2 }}>Start by picking a project</div>
                      )}
                    </div>
                  </div>
                  {showDepri && <Btn variant="ghost" size="sm" onClick={() => toggleDeselect(detailFocus)}>Deprioritize</Btn>}
                </div>

                {/* Project search */}
                <div>
                  <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>
                    {spotHasProject ? "Project" : "Which project are you working on?"}
                  </div>
                  <ProjectSearchSelect
                    projects={projects}
                    value={spotItem.project}
                    onChange={val => {
                      updateItem(detailFocus, "project", val);
                      const p = projects.find(pr => pr.id === val);
                      if (p && !spotItem.stage) updateItem(detailFocus, "stage", p.phase);
                    }}
                    placeholder="Search by name or ID (e.g. X21)..."
                  />
                  {!spotHasProject && (
                    <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, marginTop: 3 }}>Type to search across all active projects</div>
                  )}
                </div>

                {/* Deliverable — appears after project */}
                {spotHasProject && (
                  <div>
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>What are you delivering this week?</div>
                    <TextArea
                      value={spotItem.title}
                      onChange={e => updateItem(detailFocus, "title", e.target.value)}
                      placeholder="Describe the deliverable..."
                      rows={3}
                    />
                    <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.textDim, marginTop: 3 }}>Be specific about the outcome, not just the task</div>
                  </div>
                )}

                {/* Stage + Type (side by side) + Weeks — unlocked after deliverable */}
                {spotHasProject && spotHasTitle && (
                  <>
                    <div style={{ display: "flex", gap: space[4] }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Stage</div>
                        <ChoiceGroup options={phaseNames.map(s => ({ value: s, label: s, color: pc[s] || c.textDim }))} value={spotItem.stage} onChange={val => updateItem(detailFocus, "stage", val)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Type</div>
                        <ChoiceGroup mono options={["BUILD", "JAM", "COMMIT", "BLOCKED"].map(t => ({ value: t, label: tc[t]?.label || t, color: (tc[t] || {}).color, bg: (tc[t] || {}).bg }))} value={spotItem.type} onChange={val => updateItem(detailFocus, "type", val)} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Estimated timeline</div>
                      <ChoiceGroup mono options={[1, 2, 3, 4].map(w => ({ value: w, label: `${w} ${w === 1 ? "week" : "weeks"}` }))} value={spotItem.duration || 1} onChange={val => updateItem(detailFocus, "duration", val)} />
                    </div>
                  </>
                )}

                {/* Locked hint — fill deliverable to unlock rest */}
                {spotHasProject && !spotHasTitle && (
                  <div style={{
                    padding: `${space[3]}px ${space[4]}px`, borderRadius: layout.radiusMd,
                    background: c.surfaceAlt, border: `1px dashed ${c.border}`,
                    display: "flex", alignItems: "center", gap: space[2], opacity: 0.45,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={c.textDim} strokeWidth="1.5" strokeLinecap="round"><path d="M8 3v10M4 7l4-4 4 4"/></svg>
                    <span style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, color: c.textDim }}>Fill in the deliverable to unlock Stage, Type, and Weeks</span>
                  </div>
                )}

                {/* Empty state — no project yet */}
                {spotEmpty && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: `${space[6]}px 0`, opacity: 0.12 }}>
                    <div style={{ textAlign: "center" }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      <div style={{ fontSize: 12, marginTop: 4, color: c.textDim }}>Select a project to start planning</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Buffer Card (planning phase) ── */}
            {bufferActive && (
              <div style={{
                maxWidth: 640, margin: `${space[3]}px auto 0`, width: "100%",
                background: c.surface, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.purple}60`,
                borderRadius: layout.radius + 2, padding: `${space[5]}px ${space[6]}px`,
                display: "flex", flexDirection: "column", gap: space[3],
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: space[2] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: layout.radiusSm,
                      background: c.purpleDim, border: `1px solid ${c.purple}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, fontWeight: 800, color: c.purple,
                    }}>B</div>
                    <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>Buffer</span>
                    <Badge color={c.purple} bg={c.purpleDim}>Replacing #{person.deselected + 1}</Badge>
                  </div>
                  <Btn variant="ghost" size="sm" onClick={() => toggleDeselect(person.deselected)}>Restore original</Btn>
                </div>
                <div>
                  <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Project</div>
                  <ProjectSearchSelect projects={projects} value={person.bufferProject || ""} onChange={val => updatePerson("bufferProject", val)} placeholder="Search by name or ID..." />
                </div>
                {!!person.bufferProject && (
                  <div>
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>What are you working on?</div>
                    <TextArea value={person.buffer} onChange={e => updatePerson("buffer", e.target.value)} placeholder="Describe the deliverable or commitment..." rows={2} />
                  </div>
                )}
                {!!person.bufferProject && !!(person.buffer || "").trim() && (
                  <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
                    <div style={{ display: "flex", gap: space[4] }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Stage</div>
                        <ChoiceGroup options={phaseNames.map(s => ({ value: s, label: s, color: pc[s] || c.textDim }))} value={person.bufferStage} onChange={val => updatePerson("bufferStage", val)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Type</div>
                        <ChoiceGroup mono options={["BUILD", "JAM", "COMMIT", "BLOCKED"].map(t => ({ value: t, label: tc[t]?.label || t, color: (tc[t] || {}).color, bg: (tc[t] || {}).bg }))} value={person.bufferType} onChange={val => updatePerson("bufferType", val)} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Estimated timeline</div>
                      <ChoiceGroup mono options={[1, 2, 3, 4].map(w => ({ value: w, label: `${w} ${w === 1 ? "week" : "weeks"}` }))} value={person.bufferDuration || 1} onChange={val => updatePerson("bufferDuration", val)} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* ═══ LOCKED PHASE — stacked cards, no dot nav ═══ */}
      {phase === "locked" && (
        <div style={{ maxWidth: 640, margin: `${space[4]}px auto 0`, width: "100%", display: "flex", flexDirection: "column", gap: space[3] + 2 }}>
          {person.items.map((item, idx) => {
            if (person.deselected === idx) return null;
            if (!item.project && !(item.title || "").trim()) return null;
            const projObj = projects.find(p => p.id === item.project);
            const stageColor = pc[item.stage] || c.textDim;
            const tCfg = tc[item.type] || {};
            return (
              <div key={idx} style={{
                background: c.surface, border: `1px solid ${c.border}`,
                borderRadius: layout.radius, padding: `${space[4] + 2}px ${space[5] + 2}px`,
                display: "flex", flexDirection: "column", gap: space[2] + 2,
              }}>
                {/* Header: number badge (gold) + ID (gold) + name + week badge */}
                <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: layout.radiusSm,
                    background: `${entityColors().project}10`, border: `1px solid ${entityColors().project}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: entityColors().project,
                  }}>{idx + 1}</div>
                  {projObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: entityColors().project }}>{projObj.id}</span>}
                  {projObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{projObj.name}</span>}
                  <span style={{
                    marginLeft: "auto", fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                    fontWeight: 600, letterSpacing: "0.03em", color: c.textMid,
                    padding: `3px ${space[2] + 2}px`, borderRadius: layout.radiusSm,
                    background: c.surfaceAlt, border: `1px solid ${c.border}`,
                  }}>{item.duration || 1}w</span>
                </div>
                {/* Subtle inset divider between header and deliverable */}
                <div style={{ marginLeft: 34, marginRight: 12, height: 1, background: "rgba(255,255,255,0.06)" }} />
                {/* Deliverable */}
                <div style={{
                  fontFamily: typo.bodyLg.font, fontSize: 15, fontWeight: 500,
                  color: c.text, lineHeight: 1.5, paddingLeft: 34,
                }}>{item.title}</div>
                {/* Stage + Type badges */}
                <div style={{ display: "flex", alignItems: "center", gap: space[1] + 1, flexWrap: "wrap", paddingLeft: 34 }}>
                  {item.stage && <Badge color={stageColor} bg={stageColor + "10"} style={{ border: `1px solid ${stageColor}15` }}>{item.stage}</Badge>}
                  {item.type && <Badge color={tCfg.color || c.textDim} bg={tCfg.bg || c.surfaceAlt} style={{ border: `1px solid ${(tCfg.color || c.textDim)}15` }}>{tCfg.label || item.type}</Badge>}
                </div>
              </div>
            );
          })}
          {/* Buffer card in locked phase */}
          {bufferActive && person.buffer.trim() && (() => {
            const bufProjObj = projects.find(p => p.id === person.bufferProject);
            const bufStageCl = pc[person.bufferStage] || c.textDim;
            const bufTypeCfg = tc[person.bufferType] || {};
            return (
              <div style={{
                background: c.surface, border: `1px solid ${c.border}`,
                borderRadius: layout.radius, padding: `${space[4] + 2}px ${space[5] + 2}px`,
                display: "flex", flexDirection: "column", gap: space[2] + 2,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: layout.radiusSm,
                    background: c.purpleDim, border: `1px solid ${c.purple}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.purple,
                  }}>B</div>
                  {bufProjObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: entityColors().project }}>{bufProjObj.id}</span>}
                  {bufProjObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{bufProjObj.name}</span>}
                  <Badge color={c.purple} bg={c.purpleDim} style={{ marginLeft: "auto" }}>Buffer</Badge>
                </div>
                <div style={{ fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size - 1, fontWeight: 500, color: c.text, lineHeight: 1.5, paddingLeft: 34, paddingTop: space[2], borderTop: `1px solid ${c.border}08` }}>{person.buffer}</div>
                <div style={{ display: "flex", alignItems: "center", gap: space[1] + 1, paddingLeft: 34 }}>
                  {person.bufferStage && <Badge color={bufStageCl} bg={bufStageCl + "10"}>{person.bufferStage}</Badge>}
                  {person.bufferType && <Badge color={bufTypeCfg.color || c.textDim} bg={bufTypeCfg.bg || c.surfaceAlt}>{bufTypeCfg.label || person.bufferType}</Badge>}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ CLOSING PHASE — card + extension pattern ═══ */}
      {phase === "closing" && (
        <div style={{ maxWidth: 640, margin: `${space[4]}px auto 0`, width: "100%", display: "flex", flexDirection: "column", gap: space[2] + 2 }}>
          {person.items.map((item, idx) => {
            if (person.deselected === idx) return null;
            if (!item.project && !(item.title || "").trim()) return null;
            const projObj = projects.find(p => p.id === item.project);
            const stageColor = pc[item.stage] || c.textDim;
            const tCfg = tc[item.type] || {};
            const outcome = item.outcome;
            const outcomeColor = outcome === "done" ? c.green : outcome === "carry" ? c.cyan : outcome === "blocked" ? c.red : outcome === "done_carry" ? c.orange : null;
            const showDoneCarry = (item.weeksRemaining || item.duration || 1) > 1;
            const carryColor = outcome === "done_carry" ? c.orange : c.cyan;
            const wrapBg = outcome === "done" || outcome === "done_carry" ? `${c.green}02` : outcome === "carry" ? `${c.cyan}02` : outcome === "blocked" ? `${c.red}02` : c.surface;
            const wrapBorder = outcome === "done" || outcome === "done_carry" ? `${c.green}12` : outcome === "carry" ? `${c.cyan}12` : outcome === "blocked" ? `${c.red}12` : c.border;

            return (
              <div key={idx} style={{
                borderRadius: layout.radius, overflow: "hidden",
                border: `1px solid ${wrapBorder}`, background: wrapBg,
                transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              }}>
                {/* Card inner — info only */}
                <div style={{ padding: `${space[4] + 2}px ${space[5] + 2}px`, display: "flex", flexDirection: "column", gap: space[2] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: layout.radiusSm,
                      background: outcomeColor ? `${outcomeColor}12` : `${c.accent}08`,
                      border: `1px solid ${outcomeColor ? outcomeColor + "20" : c.accent + "15"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800,
                      color: outcomeColor || c.accent,
                    }}>{outcome === "done" || outcome === "done_carry" ? "\u2713" : outcome === "carry" ? "\u2192" : outcome === "blocked" ? "!" : idx + 1}</div>
                    <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: entityColors().project }}>{projObj?.id}</span>
                    <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{projObj?.name}</span>
                    <span style={{
                      marginLeft: "auto", fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      fontWeight: 600, color: c.textMid, padding: `3px ${space[2] + 2}px`,
                      borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}`,
                    }}>{item.weeksRemaining || item.duration || 1}w</span>
                  </div>
                  <div style={{
                    fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size - 1, fontWeight: 500,
                    color: (outcome === "done" || outcome === "done_carry") ? c.textMid : c.text,
                    lineHeight: 1.5, paddingLeft: 34,
                    textDecoration: (outcome === "done" || outcome === "done_carry") ? "line-through" : "none",
                  }}>{item.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: space[1] + 1, paddingLeft: 34 }}>
                    {item.stage && <Badge color={stageColor} bg={stageColor + "10"}>{item.stage}</Badge>}
                    {item.type && <Badge color={tCfg.color || c.textDim} bg={tCfg.bg || c.surfaceAlt}>{tCfg.label || item.type}</Badge>}
                  </div>
                  {/* Blocked reason */}
                  {outcome === "blocked" && item.blockedReason && (
                    <Surface compact variant="data" style={{ borderLeft: `3px solid ${c.red}`, marginLeft: 34 }}>
                      <TelemetryLabel color={c.red} style={{ marginBottom: 2 }}>Blocker</TelemetryLabel>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 400, color: c.textMid, lineHeight: typo.bodySm.lineHeight }}>{item.blockedReason}</div>
                    </Surface>
                  )}
                </div>
                {/* Extension layer — outcome buttons */}
                <div style={{
                  padding: `${space[3]}px ${space[5] + 2}px ${space[3] + 2}px`,
                  background: "rgba(255,255,255,0.015)",
                  borderTop: `1px solid rgba(255,255,255,0.06)`,
                  display: "flex", flexDirection: "column", gap: space[2],
                }}>
                  <div style={{ display: "flex", gap: space[1], flexWrap: "wrap" }}>
                    {[
                      { val: "done", label: "Completed", clr: c.green },
                      { val: "carry", label: "Carry", clr: c.cyan },
                      ...(showDoneCarry ? [{ val: "done_carry", label: "Comp + Carry", clr: c.orange }] : []),
                      { val: "blocked", label: "Blocked", clr: c.red },
                    ].map(btn => {
                      const active = outcome === btn.val;
                      return (
                        <button key={btn.val} onClick={() => updateOutcome(idx, btn.val)} style={{
                          padding: `5px 10px`, borderRadius: layout.radiusSm,
                          fontSize: typo.monoSm.size, fontWeight: 600, fontFamily: typo.monoSm.font,
                          border: `1px solid ${active ? btn.clr + "30" : c.border}`,
                          background: active ? `${btn.clr}10` : "transparent",
                          color: active ? btn.clr : c.textDim,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                          transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                        }}>
                          {active && <span>{btn.val === "blocked" ? "!" : "\u2713"}</span>}
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Carry-to row */}
                  {(outcome === "carry" || outcome === "done_carry") && (
                    <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
                      <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: carryColor, textTransform: "uppercase" }}>Carry to</span>
                      {weeks.map(wk => {
                        const sel = item.carryTo === wk.value;
                        return (
                          <button key={wk.value} onClick={() => updateCarryTo(idx, wk.value)} style={{
                            padding: `4px ${space[2] + 2}px`, borderRadius: layout.radiusTag + 1,
                            fontSize: typo.monoSm.size, fontWeight: 600, fontFamily: typo.monoSm.font,
                            border: `1px solid ${sel ? carryColor + "30" : c.border}`,
                            background: sel ? `${carryColor}10` : "transparent",
                            color: sel ? carryColor : c.textDim,
                            cursor: "pointer",
                            transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
                          }}>{wk.label}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ LOCK GATE — blocker list or ready indicator ═══════ */}
      {phase === "planning" && lockBlockers.length > 0 && (
        <Surface compact style={{ maxWidth: 640, margin: "0 auto", width: "100%", borderLeft: `3px solid ${c.orange}`, background: c.surfaceAlt }}>
          <TelemetryLabel color={c.orange} style={{ marginBottom: space[2] }}>Lock Blockers</TelemetryLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: space[1] }}>
            {lockBlockers.map((b, i) => (
              <div key={i} style={{
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: typo.bodySm.weight,
                color: c.textMid, lineHeight: typo.bodySm.lineHeight,
                display: "flex", alignItems: "center", gap: space[2],
              }}>
                <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, color: c.orange, fontWeight: 700 }}>!</span>
                {b}
              </div>
            ))}
          </div>
        </Surface>
      )}

      {/* ═══ CLOSE WEEK BAR ════════════════════════════════════ */}
      {phase === "closing" && (
        <Surface compact style={{
          maxWidth: 640, margin: "0 auto", width: "100%",
          background: weekComplete ? `${c.green}08` : c.surfaceAlt,
          borderLeft: `3px solid ${weekComplete ? c.green : c.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking, color: weekComplete ? c.green : c.textMid }}>
              {weekComplete ? "All commitments resolved" : `${fullyResolved}/${activeItems.length} resolved`}
            </div>
            <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, marginTop: 2 }}>
              {weekComplete ? "Ready to close this week" : "Resolve all items to close the week"}
            </div>
          </div>
          <Btn
            variant="success"
            disabled={!weekComplete}
            onClick={() => {
              setCommitments(prev => {
                const next = [...prev];
                const p = { ...next[activePerson] };
                const carriedItems = p.items.filter((it, idx) =>
                  it.title.trim() && p.deselected !== idx &&
                  (it.outcome === "carry" || it.outcome === "done_carry") && it.carryTo
                );
                carriedItems.forEach(item => {
                  const newItem = {
                    title: item.title, type: item.type, project: item.project, stage: item.stage,
                    duration: item.outcome === "done_carry" ? Math.max(1, (item.weeksRemaining || 1)) : (item.duration || 1),
                    outcome: null, carryTo: null, blockedReason: "", carriedFrom: weekLabel,
                  };
                  const existingIdx = next.findIndex(c => c.person === p.person && c !== p);
                  if (existingIdx === -1) {
                    next.push({ person: p.person, items: [newItem, { title: "", type: "", project: "", stage: "", duration: 1 }, { title: "", type: "", project: "", stage: "", duration: 1 }], buffer: "", deselected: -1, weekStart: item.carryTo });
                  } else {
                    const target = { ...next[existingIdx] }; const targetItems = [...target.items];
                    const emptyIdx = targetItems.findIndex(t => !t.title.trim());
                    if (emptyIdx !== -1) targetItems[emptyIdx] = newItem; else targetItems.push(newItem);
                    target.items = targetItems; next[existingIdx] = target;
                  }
                });
                p.closedAt = new Date().toISOString(); next[activePerson] = p; return next;
              });
              setClosingMode(false);
            }}
          >Close Week</Btn>
        </Surface>
      )}

      {/* ═══ CONFIRMATION MODAL (Lock / Unlock) ═══════════════════ */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Backdrop with blur */}
          <div onClick={() => setConfirmAction(null)} style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }} />
          {/* Dialog */}
          <Surface variant="overlay" style={{
            position: "relative", zIndex: 1,
            border: `1px solid ${confirmAction === "lock" ? c.green + "40" : c.orange + "40"}`,
            borderRadius: layout.radiusLg + 2, padding: `${space[6]}px ${space[7] - 4}px`, width: 460, maxWidth: "90vw",
            boxShadow: c.shadowOverlay,
          }}>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, color: c.text, marginBottom: space[2] }}>
              {confirmAction === "lock" ? "Lock this week?" : "Unlock this week?"}
            </div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
              {confirmAction === "lock"
                ? `You're locking ${activeItems.length} commitments for the week of ${weekLabel}. Once locked, your plan is set and visible to your team.`
                : "Tasks will become editable again. Any changes made will be updated in the system."}
            </div>
            {confirmAction === "lock" && (
              <Surface compact variant="data" style={{
                display: "flex", alignItems: "center", gap: space[2],
                borderLeft: `3px solid ${c.orange}`, marginBottom: space[4],
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="8" cy="8" r="7" stroke={c.orange} strokeWidth="1.3" fill="none" />
                  <line x1="8" y1="4" x2="8" y2="9" stroke={c.orange} strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.8" fill={c.orange} />
                </svg>
                <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.orange }}>
                  6-hour lock cooldown — no edits during this period
                </span>
              </Surface>
            )}
            {/* Commitment summary for lock confirmation */}
            {confirmAction === "lock" && (
              <div style={{
                padding: `${space[3]}px ${space[3] + 2}px`, borderRadius: layout.radiusMd,
                background: c.surfaceAlt, border: `1px solid ${c.border}`, marginBottom: space[5],
                display: "flex", flexDirection: "column", gap: space[1] + 2,
              }}>
                <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: "0.04em", color: c.textDim, textTransform: "uppercase", marginBottom: 2 }}>Your commitments</div>
                {person.items.map((it, ci) => {
                  if (person.deselected === ci || !it.title.trim()) return null;
                  const proj = projects.find(p => p.id === it.project);
                  const tC = tc[it.type] || {};
                  return (
                    <div key={ci} style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: layout.radiusSm,
                        background: `${c.accent}08`, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color: c.accent,
                      }}>{ci + 1}</div>
                      <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text, flex: 1 }}>{proj?.name || it.project}</span>
                      {it.type && <Badge color={tC.color || c.textDim} bg={tC.bg || c.surfaceAlt} style={{ marginLeft: "auto" }}>{tC.label || it.type}</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end", marginTop: confirmAction === "lock" ? 0 : space[4] }}>
              <Btn variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Btn>
              <Btn variant={confirmAction === "lock" ? "success" : "secondary"} onClick={() => {
                if (confirmAction === "lock") handleLock();
                else handleUnlock();
                setConfirmAction(null);
              }} style={confirmAction === "unlock" ? { borderColor: c.orange + "40", color: c.orange } : {}}>
                {confirmAction === "lock" ? "Yes, Lock Week" : "Yes, Unlock"}
              </Btn>
            </div>
          </Surface>
        </div>
      )}

      {/* ═══ BLOCKED REASON MODAL ═══════════════════════════════════ */}
      {blockedModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => { setBlockedModal(null); setBlockedText(""); }} style={{
            position: "absolute", inset: 0, background: c.shadow,
          }} />
          <Surface variant="overlay" style={{
            position: "relative", zIndex: 1,
            border: `1px solid ${c.red}40`,
            borderRadius: layout.radiusLg + 2, padding: `${space[6]}px ${space[7] - 4}px`, width: 460, maxWidth: "90vw",
            boxShadow: c.shadowOverlay,
          }}>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, color: c.text, marginBottom: space[2] }}>
              Why is this blocked?
            </div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
              Describe the blocker so your team knows what needs to be resolved.
            </div>
            <div style={{ marginBottom: space[3] }}>
              <TelemetryLabel color={c.red} style={{ marginBottom: space[1] }}>Blocker Description</TelemetryLabel>
              <TextArea
                autoFocus
                value={blockedText}
                onChange={e => setBlockedText(e.target.value)}
                placeholder="e.g. Waiting on API access from platform team..."
                rows={3}
                style={{
                  padding: `${space[3] - 2}px ${space[3]}px`, borderRadius: layout.radiusMd,
                  border: `1.5px solid ${c.red}30`, fontWeight: 400, minHeight: 84,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setBlockedModal(null); setBlockedText(""); }}>Cancel</Btn>
              <Btn variant="danger" disabled={!blockedText.trim()} onClick={saveBlockedReason}>Mark Blocked</Btn>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
};

export default HumansView;
