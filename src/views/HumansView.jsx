// Flow — Commit View (Phase-driven: Planning → Locked → Closing)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, layout, motion, space, typo, phaseNames, typeConfig, phaseColors as getPhaseColors, density, btnVariants, entityColors, colWidths } from "../styles/theme";
import { Badge, Tag, Surface, Inp, TextArea, ChoiceGroup, Sel, Btn, TelemetryLabel, SummaryTile, Th as SharedTh, MetricCompact, EntityLink, VDivider, SectionDivider } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";

// ─── ANIMATED KPI COUNTER ─────────────────────────────────────
const CommitKpi = ({ value, label, color, delay = 0 }) => {
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
    <div className="flow-commit-kpi" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space[1], animationDelay: `${delay}ms` }}>
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
      <div onClick={() => { onChange(""); setQuery(""); }} style={{
        display: "flex", alignItems: "center", gap: space[2],
        padding: `${space[2]}px ${space[3]}px`, borderRadius: layout.radiusSm,
        background: c.surfaceAlt, border: `1px solid ${c.border}`,
        cursor: "pointer", transition: `border-color 0.2s ease`,
      }} onMouseEnter={e => e.currentTarget.style.borderColor = c.accent + "50"}
         onMouseLeave={e => e.currentTarget.style.borderColor = c.border}>
        <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: entityColors().project }}>{selected.id}</span>
        <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 500, color: c.text, flex: 1 }}>{selected.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
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

// ═══ COMMIT VIEW ════════════════════════════════════════════════
const EMPTY_ITEM = { title: '', type: '', project: '', stage: '' };
const ensureItems = (cm) => {
  if (!cm) return cm;
  const items = Array.isArray(cm.items) ? cm.items : [];
  if (items.length >= 3) return cm;
  return { ...cm, items: [...items, ...Array.from({ length: 3 - items.length }, () => ({ ...EMPTY_ITEM }))] };
};

const HumansView = ({ commitments: rawCommitments, setCommitments: rawSetCommitments, projects, people, initialPerson, initialCommitIdx, setDetailLabel, setGoBack, setIsLocked, searchRef, globalFilters = {}, suppressBackRef, isHistorical, selectedWeekKey, onSave }) => {
  // Normalize: ensure every commitment has a padded items array
  const commitments = React.useMemo(() => rawCommitments.map(ensureItems), [rawCommitments]);
  const _rawSet = isHistorical ? () => {} : rawSetCommitments;
  const setCommitments = React.useCallback((updater) => {
    _rawSet(prev => {
      const normalized = prev.map(ensureItems);
      const result = typeof updater === 'function' ? updater(normalized) : updater;
      return result;
    });
  }, [_rawSet]);
  const [activePerson, setActivePerson] = useState(() => {
    if (initialPerson) {
      const idx = commitments.findIndex(cm => cm.person === initialPerson);
      return idx >= 0 ? idx : -1;
    }
    return -1;
  });
  const [search, setSearch] = useState("");
  const [focusIdx, setFocusIdx] = useState(0);
  const [kbActive, setKbActive] = useState(false);
  const [detailFocus, setDetailFocus] = useState(initialCommitIdx != null ? initialCommitIdx : 0);
  const [closingMode, _setClosingMode] = useState(false);
  const closingModeRef = useRef(false);
  const setClosingMode = (val) => { closingModeRef.current = val; _setClosingMode(val); };
  const [confirmAction, setConfirmAction] = useState(null); // "lock" | "unlock" | null
  const [confirmReset, setConfirmReset] = useState(false);
  const [blockedModal, setBlockedModal] = useState(null); // { idx: number } | null
  const [blockedText, setBlockedText] = useState("");
  const [depriModal, setDepriModal] = useState(null); // { idx: number } | null
  const [depriText, setDepriText] = useState("");

  // Signal App-level Escape handler to skip goBack when a sub-state is active
  useEffect(() => {
    if (suppressBackRef) suppressBackRef.current = !!(closingMode || confirmAction || depriModal || blockedModal);
  }, [closingMode, confirmAction, depriModal, blockedModal, suppressBackRef]);
  const [sortCol, setSortCol] = useState("squad");
  const [sortDir, setSortDir] = useState("asc");
  const [filterStatus, setFilterStatus] = useState(null); // "locked" | "ready" | "partial" | "empty" | null
  const [rowAnimKey, setRowAnimKey] = useState(0);
  const [searchGlow, setSearchGlow] = useState(false);
  const localSearchRef = useRef(null);

  const person = activePerson >= 0 ? commitments[activePerson] : null;
  const filtered = commitments.filter(cm => {
    const pObj = people.find(p => p.name === cm.person);
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = cm.person.toLowerCase().includes(q);
      const roleMatch = (pObj?.role || "").toLowerCase().includes(q);
      const squadMatch = (pObj?.squad || "").toLowerCase().includes(q);
      if (!nameMatch && !roleMatch && !squadMatch) return false;
    }
    if (globalFilters.squad.length > 0 && !globalFilters.squad.includes(pObj?.squad)) return false;
    if (globalFilters.person.length > 0 && !globalFilters.person.includes(cm.person)) return false;
    if (globalFilters.owner.length > 0) {
      const ownsProject = projects.some(pr => pr.owner === cm.person && globalFilters.owner.includes(pr.owner));
      if (!globalFilters.owner.includes(cm.person) && !ownsProject) return false;
    }
    return true;
  });

  useEffect(() => {
    if (searchRef) searchRef.current = localSearchRef.current;
  }, [searchRef, activePerson]);

  // ── Auto-open person when navigated via deeplink ──
  useEffect(() => {
    if (initialPerson && activePerson >= 0) {
      const name = commitments[activePerson]?.person;
      if (setDetailLabel) setDetailLabel(name);
      if (setGoBack) setGoBack(() => {
        setActivePerson(-1); setDetailFocus(0); setClosingMode(false);
        if (setDetailLabel) setDetailLabel(null);
        if (setGoBack) setGoBack(null);
      });
    }
  }, []);

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
    if (idx === "buffer") {
      setCommitments(prev => {
        const next = [...prev]; const p = { ...next[activePerson] };
        p.bufferOutcome = "blocked"; p.bufferBlockedReason = blockedText; p.bufferCarryTo = null;
        next[activePerson] = p; return next;
      });
    } else {
      setCommitments(prev => {
        const next = [...prev]; const p = { ...next[activePerson] };
        const items = [...p.items];
        items[idx] = { ...items[idx], outcome: "blocked", blockedReason: blockedText, carryTo: null };
        p.items = items; next[activePerson] = p; return next;
      });
    }
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
  // Buffer outcome helpers
  const updateBufferOutcome = (val) => {
    if (val === "blocked") {
      if (person?.bufferOutcome === "blocked") {
        setCommitments(prev => {
          const next = [...prev]; const p = { ...next[activePerson] };
          p.bufferOutcome = null; p.bufferBlockedReason = "";
          next[activePerson] = p; return next;
        });
        return;
      }
      setBlockedText(person?.bufferBlockedReason || "");
      setBlockedModal({ idx: "buffer" });
      return;
    }
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      p.bufferOutcome = p.bufferOutcome === val ? null : val;
      if (p.bufferOutcome !== "carry" && p.bufferOutcome !== "done_carry") p.bufferCarryTo = null;
      if (p.bufferOutcome !== "blocked") p.bufferBlockedReason = "";
      next[activePerson] = p; return next;
    });
  };
  const updateBufferCarryTo = (week) => {
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      p.bufferCarryTo = p.bufferCarryTo === week ? null : week;
      next[activePerson] = p; return next;
    });
  };

  // Deprioritize — unlocks the week so buffer can be filled and re-locked
  const deprioritizeSlot = (idx, reason) => {
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      p.deselected = idx;
      p.depriReason = reason || "";
      p.lockedAt = null;
      p.lockedAtTime = null;
      next[activePerson] = p; return next;
    });
    if (setIsLocked) setIsLocked(false);
  };
  const restoreSlot = () => {
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      p.deselected = -1; p.depriReason = ""; p.buffer = ""; p.bufferProject = "";
      p.bufferStage = ""; p.bufferType = ""; p.bufferDuration = 1;
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
    { key: "ArrowUp", fn: () => { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.max(0, i - 1)); }, force: true },
    { key: "ArrowDown", fn: () => { localSearchRef.current?.blur(); setKbActive(true); setFocusIdx(i => Math.min(filtered.length - 1, i + 1)); }, force: true },
    { key: "Enter", fn: () => { if (kbActive && filtered[focusIdx]) openPerson(commitments.indexOf(filtered[focusIdx])); }, force: true },
    { key: "Escape", fn: () => { if (search) { setSearch(""); setFocusIdx(0); setRowAnimKey(k => k + 1); localSearchRef.current?.blur(); setKbActive(true); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); setKbActive(true); } else if (kbActive) { setKbActive(false); } }, force: true },
    { key: "/", fn: (e) => { e.preventDefault(); localSearchRef.current?.focus(); setSearchGlow(true); setKbActive(false); setTimeout(() => setSearchGlow(false), 1200); }, force: true },
  ] : [], [filtered.length, focusIdx, activePerson, kbActive]);

  // ── Lock validation — no buffer during planning ──
  const filledSlots = person ? person.items.slice(0, 3).filter((it) => it.title.trim()).length : 0;
  const bufferActive = person ? person.deselected >= 0 : false;
  const bufferFilled = person ? (bufferActive && (person.buffer || "").trim() && person.bufferProject) : false;

  // readyCount: active slots fully complete (title + project + valid stage + type) + buffer
  const validStagesForReady = ["PRD", "Design", "Dev", "QA"];
  const readyCount = person ? (
    person.items.slice(0, 3).filter((it, idx) => person.deselected !== idx && it.title.trim() && it.project && it.stage && validStagesForReady.includes(it.stage) && it.type).length
    + (bufferFilled ? 1 : 0)
  ) : 0;

  const lockBlockers = [];
  if (person && !isLocked) {
    const validStages = ["PRD", "Design", "Dev", "QA"];
    const isComplete = (it) => it.title.trim() && it.project && it.stage && validStages.includes(it.stage) && it.type;
    if (bufferActive) {
      // After deprioritize: need 2 active slots complete + buffer filled
      const activeCompleteCount = person.items.slice(0, 3).filter((it, idx) => person.deselected !== idx && isComplete(it)).length;
      if (activeCompleteCount < 2) lockBlockers.push(`Need 2 fully filled commits (have ${activeCompleteCount})`);
      if (!bufferFilled) lockBlockers.push("Buffer: fill in the replacement task");
      person.items.slice(0, 3).forEach((it, idx) => {
        if (person.deselected === idx) return;
        if (it.title.trim() && !it.project) lockBlockers.push(`Task ${idx + 1}: select a project`);
        if (it.title.trim() && it.project && !it.stage) lockBlockers.push(`Task ${idx + 1}: select a stage`);
        if (it.title.trim() && it.project && !it.type) lockBlockers.push(`Task ${idx + 1}: select a type`);
      });
    } else {
      // Normal planning: need 3 fully filled slots
      const completeCount = person.items.slice(0, 3).filter(it => isComplete(it)).length;
      if (completeCount < 3) lockBlockers.push(`Need 3 fully filled commits (have ${completeCount})`);
      person.items.slice(0, 3).forEach((it, idx) => {
        if (it.title.trim() && !it.project) lockBlockers.push(`Task ${idx + 1}: select a project`);
        if (it.title.trim() && it.project && !it.stage) lockBlockers.push(`Task ${idx + 1}: select a stage`);
        if (it.title.trim() && it.project && !it.type) lockBlockers.push(`Task ${idx + 1}: select a type`);
      });
    }
  }
  const canLock = person ? lockBlockers.length === 0 : false;

  // Lock is permanent — no cooldown. Unlock is always allowed via explicit action.
  const canUnlock = true;

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
    { key: "Escape", fn: () => { if (depriModal) { setDepriModal(null); setDepriText(""); } else if (blockedModal) { setBlockedModal(null); setBlockedText(""); } else if (confirmAction) { setConfirmAction(null); } else if (closingModeRef.current) { setClosingMode(false); } else goBackToList(); }, force: true },
    { key: "l", fn: () => { if (phase === "planning" && canLock) setConfirmAction("lock"); } },
    { key: "u", fn: () => { if (isLocked && !closingMode && canUnlock) setConfirmAction("unlock"); } },
    { key: "f", fn: () => { if (phase === "locked") setClosingMode(true); } },
    { key: "ArrowUp", fn: () => setDetailFocus(i => Math.max(0, i - 1)) },
    { key: "ArrowDown", fn: () => setDetailFocus(i => Math.min(person.items.length - 1, i + 1)) },
  ] : [], [activePerson, isLocked, filledSlots, person?.items?.length, closingMode, phase]);

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
    const closed = filtered.filter(cm => !!cm.closedAt).length;
    const locked = filtered.filter(cm => !!cm.lockedAt && !cm.closedAt).length;
    const filled = filtered.filter(cm => !cm.lockedAt && !cm.closedAt && cm.items.slice(0, 3).filter(it => it.title.trim()).length >= 3).length;
    const partial = filtered.filter(cm => { const f = cm.items.slice(0, 3).filter(it => it.title.trim()).length; return !cm.lockedAt && !cm.closedAt && f > 0 && f < 3; }).length;
    const empty = total - closed - locked - filled - partial;
    const pctLocked = total > 0 ? Math.round((locked / total) * 100) : 0;

    // Total commits (first 3 items per person)
    const totalCommitments = filtered.reduce((sum, cm) =>
      sum + cm.items.slice(0, 3).filter(it => it.title.trim()).length, 0
    );

    // Outcome metrics — from closed people's commits only (first 3 slots + buffer)
    const closedPeople = filtered.filter(cm => !!cm.closedAt);
    const closedItems = closedPeople.flatMap(cm => {
      const items = cm.items.slice(0, 3).filter((it, idx) => it.title.trim() && cm.deselected !== idx);
      if (cm.deselected >= 0 && (cm.buffer || "").trim() && cm.bufferProject) {
        items.push({ outcome: cm.bufferOutcome || null });
      }
      return items;
    });
    const totalOutcomes = closedItems.length;
    const completed = closedItems.filter(it => it.outcome === "done" || it.outcome === "done_carry").length;
    const blockedCount = closedItems.filter(it => it.outcome === "blocked").length;
    const carried = closedItems.filter(it => it.outcome === "carry").length;
    const pctCompleted = totalOutcomes > 0 ? Math.round((completed / totalOutcomes) * 100) : 0;
    const pctBlocked = totalOutcomes > 0 ? Math.round((blockedCount / totalOutcomes) * 100) : 0;
    const pctCarried = totalOutcomes > 0 ? Math.round((carried / totalOutcomes) * 100) : 0;

    // Deprioritized metrics — locked people who deprioritized a slot
    const deprioritizedCount = filtered.filter(cm => !!cm.lockedAt && cm.deselected >= 0).length;
    const pctDeprioritized = total > 0 ? Math.round((deprioritizedCount / total) * 100) : 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 128px)", marginBottom: -60 }}>
        {/* ── Frozen top — never scrolls ── */}
        <div style={{
          flexShrink: 0,
          paddingBottom: space[3],
          display: "flex", flexDirection: "column", gap: space[3] - 2,
        }}>

        {/* UNIFIED SUMMARY — 3 sections, full width */}
        <div className="flow-mission-grid" style={{ padding: `${space[3]}px ${space[4]}px` }}>
          <div style={{
            display: "flex", alignItems: "center",
            position: "relative", zIndex: 1,
          }}>
            {/* Section 1: Team breakdown — clickable filters */}
            <div style={{ flex: 5, display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
              <SummaryTile value={total} label="Team" color={c.text} hero />
              <SummaryTile value={filled} label="Ready" color={c.cyan} active={filterStatus === "ready"} onClick={() => { setFilterStatus(filterStatus === "ready" ? null : "ready"); setRowAnimKey(k => k + 1); }} />
              <SummaryTile value={partial} label="Partial" color={c.orange} active={filterStatus === "partial"} onClick={() => { setFilterStatus(filterStatus === "partial" ? null : "partial"); setRowAnimKey(k => k + 1); }} />
              <SummaryTile value={empty} label="Empty" color={c.red} active={filterStatus === "empty"} onClick={() => { setFilterStatus(filterStatus === "empty" ? null : "empty"); setRowAnimKey(k => k + 1); }} />
              <SummaryTile value={locked} label="Locked" color={c.green} active={filterStatus === "locked"} onClick={() => { setFilterStatus(filterStatus === "locked" ? null : "locked"); setRowAnimKey(k => k + 1); }} />
            </div>

            <VDivider height={32} style={{ margin: `0 ${space[3]}px` }} />

            {/* Section 2: Commit metrics — mirrors Pulse */}
            <div style={{ flex: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
              <MetricCompact value={totalCommitments} label="Commits" color={c.text} hero />
              <MetricCompact value={locked + closed} label="Locked" color={c.text} />
              <MetricCompact value={`${total > 0 ? Math.round(((locked + closed) / total) * 100) : 0}%`} label="Lock Rate" color={(locked + closed) === total && total > 0 ? c.green : (locked + closed) / total >= 0.5 ? c.orange : c.textDim} />
            </div>

            <VDivider height={32} style={{ margin: `0 ${space[3]}px` }} />

            {/* Section 3: Outcome breakdown — mirrors Pulse */}
            <div style={{ flex: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
              <SummaryTile value={closed} label="Closed" color={c.textMid} active={filterStatus === "closed"} onClick={() => { setFilterStatus(filterStatus === "closed" ? null : "closed"); setRowAnimKey(k => k + 1); }} hero />
              <MetricCompact value={`${pctCompleted}%`} label="Complete" color={pctCompleted > 0 ? c.green : c.textDim} />
              <MetricCompact value={`${pctCarried}%`} label="Carry" color={carried > 0 ? c.orange : c.textDim} />
              <MetricCompact value={`${pctBlocked}%`} label="Blocked" color={blockedCount > 0 ? c.red : c.textDim} />
              <MetricCompact value={`${pctDeprioritized}%`} label="Deprioritized" color={deprioritizedCount > 0 ? c.orange : c.textDim} />
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input
            ref={localSearchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setFocusIdx(0); setRowAnimKey(k => k + 1); }}
            onBlur={() => setSearchGlow(false)}
            placeholder="Search people by name, role, or squad..."
            style={{
              width: "100%", padding: `${space[3]}px ${space[4]}px ${space[3]}px 38px`,
              borderRadius: layout.radiusMd,
              border: `1px solid ${searchGlow ? c.accent : c.border}`,
              background: c.surfaceAlt, color: c.text,
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
              outline: "none", boxSizing: "border-box",
              boxShadow: searchGlow ? `0 0 0 3px ${c.accent}25, 0 0 12px ${c.accent}15` : "none",
              transition: `border-color 0.3s ease, box-shadow 0.3s ease`,
            }}
          />
          {/* Search icon — minimal line SVG */}
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", transition: "opacity 0.3s ease" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchGlow ? c.accent : c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
          {/* Keycap hint */}
          {!search && <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 600,
            color: c.textDim, lineHeight: 1,
            padding: `3px 7px 4px`, borderRadius: 4,
            background: `linear-gradient(180deg, ${c.surfaceAlt} 0%, ${c.bg} 100%)`,
            border: `1px solid ${c.border}`,
            boxShadow: `0 2px 0 ${c.border}, 0 2px 3px ${c.shadow}`,
            pointerEvents: "none",
          }}>/</span>}
        </div>

        </div>{/* end frozen top */}

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto", position: "relative", zIndex: 1 }}>

        {/* Commits table — moved to Pulse tab */}
        {false && (() => {
          const allItems = filtered.flatMap(cm => {
            if (!cm.lockedAt) return [];
            const rows = cm.items.slice(0, 3)
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
            <div style={{ borderRadius: layout.radius, border: `1px solid ${c.border}`, background: c.surfaceData }}>
              <div style={{ borderRadius: layout.radius }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: colWidths.squad.min }}>Squad</Th>
                      <Th col="person" style={{ minWidth: colWidths.person.min, borderLeft: `1px dotted ${c.border}` }}>Person</Th>
                      <Th col="project" style={{ minWidth: colWidths.identity.min, borderLeft: `1px dotted ${c.border}` }}>Project</Th>
                      <Th col="title" style={{ minWidth: colWidths.commit.min, borderLeft: `1px dotted ${c.border}` }}>Commit</Th>
                      <Th col="type" style={{ minWidth: colWidths.status.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Type</Th>
                      <Th col="stage" style={{ minWidth: colWidths.phase.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Stage</Th>
                      <Th col="status" style={{ minWidth: colWidths.status.min, textAlign: "center", borderLeft: `1px dotted ${c.border}` }}>Status</Th>
                    </tr>
                  </thead>
                  <tbody key={rowAnimKey}>
                    {sortedItems.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: `${space[7]}px 0`, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>No locked commits yet</td></tr>
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
                      const rowBg = it._status === "Completed" || it._status === "Completed+Carry" ? `${c.green}08`
                        : it._status === "Blocked" ? `${c.red}08`
                        : "transparent";
                      const isDepri = it._status === "Deprioritized";
                      return (
                        <tr key={`${it.person}-${it.project}-${ri}`} className="flow-row" style={{
                          animation: `rowSlideIn 0.3s ${motion.interaction.easing} both`,
                          animationDelay: `${Math.min(ri * 20, 600)}ms`,
                          opacity: isDepri ? 0.35 : 1,
                          background: rowBg,
                          textDecoration: isDepri ? "line-through" : "none",
                          pointerEvents: isDepri ? "none" : "auto",
                        }}>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.textMid, borderBottom: `1px dotted ${c.border}`, position: "sticky", left: 0, background: c.bg, zIndex: 1 }}>{pObj?.squad || "\u2014"}</td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <EntityLink type="person" onClick={() => { const idx = commitments.findIndex(cm => cm.person === it.person); if (idx >= 0) openPerson(idx); }} underline style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600 }}>{it.person}</EntityLink>
                          </td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}` }}>
                            <EntityLink type="project" style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700 }}>{it.project}</EntityLink>
                            {proj && <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.text, marginLeft: space[1] }}>{proj.name}</span>}
                          </td>
                          <td style={{ padding: `${space[2]}px ${space[3]}px`, borderBottom: `1px dotted ${c.border}`, borderLeft: `1px dotted ${c.border}`, fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text, }}>{it.title}</td>
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
        {(() => {
          const commitStatusColors = { Closed: c.textMid, Locked: c.green, Ready: c.cyan, Partial: c.orange, Empty: c.red };
          const groupOrder = [
            { key: "Closed", label: "Closed", color: c.textMid, icon: "✓" },
            { key: "Locked", label: "Locked", color: c.green, icon: "●" },
            { key: "Ready", label: "Ready to Lock", color: c.cyan, icon: "◉" },
            { key: "Partial", label: "Partial", color: c.orange, icon: "◐" },
            { key: "Empty", label: "Empty", color: c.red, icon: "○" },
          ];
          // Build rows with status info
          const rows = filtered.map(cm => {
            const pObj = people.find(p => p.name === cm.person);
            const filledCount = cm.items.slice(0, 3).filter((it) => it.title.trim()).length;
            const isClosed = !!cm.closedAt;
            const isLkd = !!cm.lockedAt && !cm.closedAt;
            const status = isClosed ? "Closed" : isLkd ? "Locked" : filledCount >= 3 ? "Ready" : filledCount > 0 ? "Partial" : "Empty";
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

          const cellPad = `${space[1]}px ${space[2] - 2}px`;
          const dotBorder = `1px dotted ${c.border}`;

          return (
            <Surface variant="data" compact style={{ padding: 0 }}>
              <div style={{
                borderRadius: layout.radius,
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      <Th col="squad" style={{ position: "sticky", left: 0, top: 0, background: c.bg, zIndex: 3, minWidth: 70 }}>Squad</Th>
                      <Th col="person" style={{ minWidth: 150, borderLeft: dotBorder }}>Name</Th>
                      <Th col="role" style={{ minWidth: 100, borderLeft: dotBorder }}>Role</Th>
                      <Th col="filled" style={{ minWidth: 120, textAlign: "center", borderLeft: dotBorder }}>Filled</Th>
                      <Th col="status" style={{ minWidth: 80, textAlign: "center", borderLeft: dotBorder }}>Status</Th>
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
                            className="flow-row"
                            onClick={() => openPerson(row.realIdx)}
                            style={{
                              cursor: "pointer",
                              background: isFocused ? `${c.accent}10` : "transparent",
                              boxShadow: isFocused ? `inset 3px 0 0 ${c.accent}` : "none",
                              transition: `background ${motion.interaction.duration}, box-shadow ${motion.interaction.duration}`,
                              animation: `rowSlideIn 0.3s ${motion.critical.easing} both`,
                              animationDelay: `${Math.min(ri * 30, 600)}ms`,
                            }}
                          >
                            {/* Squad */}
                            <td style={{
                              padding: cellPad,
                              fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                              fontWeight: 600, color: c.textMid,
                              borderBottom: dotBorder,
                              position: "sticky", left: 0, background: isFocused ? c.surfaceAlt : c.bg, zIndex: 1,
                            }}>{row.pObj?.squad || "\u2014"}</td>
                            {/* Name */}
                            <td style={{ padding: cellPad, borderBottom: dotBorder, borderLeft: dotBorder }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{
                                  fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                                  fontWeight: 600, color: c.text,
                                }}>{row.cm.person}</span>
                              </div>
                            </td>
                            {/* Role */}
                            <td style={{
                              padding: cellPad, borderBottom: dotBorder, borderLeft: dotBorder,
                              fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                              fontWeight: 500, color: c.textMid, whiteSpace: "nowrap",
                            }}>{row.pObj?.role || "\u2014"}</td>
                            {/* Filled — 3-slot bars */}
                            <td style={{ padding: cellPad, textAlign: "center", borderBottom: dotBorder, borderLeft: dotBorder }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  {[0, 1, 2].map(si => (
                                    <div key={si} style={{
                                      width: 14, height: 5, borderRadius: 2.5,
                                      background: si < row.filledCount ? sColor : `${c.textDim}18`,
                                      border: si < row.filledCount ? "none" : `1px solid ${c.border}`,
                                      transition: `all ${motion.critical.duration} ${motion.critical.easing}`,
                                    }} />
                                  ))}
                                </div>
                                <span style={{
                                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                                  fontWeight: typo.monoMd.weight, color: sColor,
                                }}>{row.filledCount}/3</span>
                              </div>
                            </td>
                            {/* Status */}
                            <td style={{ padding: cellPad, textAlign: "center", borderBottom: dotBorder, borderLeft: dotBorder }}>
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
                              padding: `${space[2]}px ${space[2] - 2}px`,
                              background: `${group.color}06`,
                              borderBottom: `1px dotted ${c.border}`,
                              borderTop: `1px dotted ${c.border}`,
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
            </Surface>
          );
        })()}
        <div style={{ flexShrink: 0, height: space[8] }} />
        </div>{/* end scrollable content */}
      </div>
    );
  }

  // ═══ COMMIT EDITOR (detail view) — Phase-driven ═══════════════
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

  // Closing phase: track outcomes — only first 3 commit slots (excluding deprioritized)
  const activeItems = person.items.slice(0, 3)
    .map((it, idx) => ({ ...it, idx }))
    .filter(it => it.title.trim() && person.deselected !== it.idx);
  const bufferNeedsOutcome = bufferActive && (person.buffer || "").trim();
  const totalToResolve = activeItems.length + (bufferNeedsOutcome ? 1 : 0);
  const fullyResolved = activeItems.filter(it => {
    if (!it.outcome) return false;
    if ((it.outcome === "carry" || it.outcome === "done_carry") && !it.carryTo) return false;
    if (it.outcome === "blocked" && !(it.blockedReason || "").trim()) return false;
    return true;
  }).length + (bufferNeedsOutcome && person.bufferOutcome && (() => {
    const bo = person.bufferOutcome;
    if ((bo === "carry" || bo === "done_carry") && !person.bufferCarryTo) return false;
    if (bo === "blocked" && !(person.bufferBlockedReason || "").trim()) return false;
    return true;
  })() ? 1 : 0);
  const allDeclared = fullyResolved === totalToResolve && totalToResolve > 0;
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

        {/* Left: Avatar + Name + Role·Squad + Date */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: c.accentDim, border: `2px solid ${c.accent}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 15, color: c.accent, flexShrink: 0,
          }}>{person.person.charAt(0)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{
              fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
              fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking, color: c.text,
            }}>{person.person}</span>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              {personMeta && (
                <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.textMid }}>
                  {personMeta.role} · {personMeta.squad}
                </span>
              )}
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                fontWeight: 600, color: c.textMid,
                padding: `1px ${space[2]}px`, borderRadius: layout.radiusTag,
                background: c.surfaceAlt, border: `1px solid ${c.border}`,
              }}>{weekLabel}</span>
            </div>
          </div>
        </div>

        {/* Right: Status + action */}
        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            {/* Planning: filled count + Lock button */}
            {phase === "planning" && (
              <>
                <Btn variant="secondary" size="sm" onClick={() => { if (onSave) onSave(); }}>
                  Save
                </Btn>
                <Btn variant="success" size="sm" disabled={!canLock} onClick={() => { if (canLock) setConfirmAction("lock"); }}>
                  Lock Week
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
                  {Array.from({ length: totalToResolve }, (_, i) => (
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
                }}>{weekComplete ? "ALL RESOLVED" : `${fullyResolved}/${totalToResolve} RESOLVED`}</span>
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
      </div>

      {/* ═══ PLANNING PHASE — Dot Navigation + Spotlight ═══ */}
      {phase === "planning" && (() => {
        const spotItem = person.items[detailFocus];
        const spotProj = projects.find(p => p.id === spotItem?.project);
        const spotEmpty = !spotItem?.project && !(spotItem?.title || "").trim();
        const spotHasProject = !!spotItem?.project;
        const spotHasTitle = !!(spotItem?.title || "").trim();
        const slotFilled = person.items.slice(0, 3).map((it) =>
          !!it.project && !!(it.title || "").trim() && !!it.stage && ["PRD", "Design", "Dev", "QA"].includes(it.stage) && !!it.type
        );
        const bufProj = bufferActive ? projects.find(p => p.id === person.bufferProject) : null;
        const bufferHasContent = bufferActive && (person.buffer || "").trim() && person.bufferProject;

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
                    <div onClick={() => setDetailFocus(di)} style={{
                      width: 36, height: 36, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, cursor: "pointer",
                      position: "relative",
                      transition: `all 0.2s ${motion.interaction.easing}`,
                      ...(depri && active ? { background: `${c.red}12`, border: `2px solid ${c.red}50`, color: c.red, opacity: 0.7, transform: "scale(1.08)" }
                        : depri ? { background: `${c.red}08`, border: `2px solid ${c.red}25`, color: c.red, opacity: 0.5 }
                        : active ? { background: `${c.accent}15`, border: `2px solid ${c.accent}`, color: c.accent, boxShadow: `0 0 20px ${c.accent}25`, transform: "scale(1.12)" }
                        : filled ? { background: `${c.green}10`, border: `2px solid ${c.green}30`, color: c.green }
                        : { background: "transparent", border: `2px solid ${c.border}`, color: c.textDim }),
                    }}>
                      {di + 1}
                      {depri && <div style={{ position: "absolute", top: "50%", left: "20%", right: "20%", height: 2, background: c.red, borderRadius: 1, transform: "translateY(-50%) rotate(-45deg)" }} />}
                      {!depri && filled && (
                        <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: c.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: c.bg, fontWeight: 900 }}>{"\u2713"}</div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              {/* B circle — locked unless buffer is active */}
              <div style={{ width: 20, height: 0, borderTop: `1px dashed ${bufferActive ? c.purple + "60" : c.border}` }} />
              <div onClick={() => { if (bufferActive) setDetailFocus(3); }} style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, position: "relative",
                cursor: bufferActive ? "pointer" : "default",
                transition: `all 0.2s ${motion.interaction.easing}`,
                ...(bufferActive && detailFocus === 3
                  ? { background: `${c.purple}15`, border: `2px solid ${c.purple}`, color: c.purple, boxShadow: `0 0 20px ${c.purple}25`, transform: "scale(1.12)" }
                  : bufferActive
                  ? { background: `${c.purple}08`, border: `2px solid ${c.purple}40`, color: c.purple }
                  : { border: `2px dashed ${c.border}`, color: c.textDim, opacity: 0.3 }),
              }}>B
                {bufferHasContent && (
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: c.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: c.bg, fontWeight: 900 }}>{"\u2713"}</div>
                )}
              </div>
            </div>

            {/* ── Deprioritized slot — same layout as regular card, dimmed ── */}
            {detailFocus <= 2 && person.deselected === detailFocus && (() => {
              const depriItem = spotItem;
              const depriProj = projects.find(p => p.id === depriItem?.project);
              return (
                <div style={{
                  maxWidth: 640, margin: "0 auto", width: "100%",
                  background: c.surface, border: `1px solid ${c.border}`,
                  borderRadius: layout.radius, padding: `${space[4] + 2}px ${space[5] + 2}px`,
                  display: "flex", flexDirection: "column", gap: space[2] + 2,
                  opacity: 0.6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: layout.radiusSm,
                      background: `${c.red}08`, border: `1px solid ${c.red}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.textMid,
                    }}>{detailFocus + 1}</div>
                    {depriProj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: c.textMid }}>{depriProj.id}</span>}
                    {depriProj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.textMid }}>{depriProj.name}</span>}
                  </div>
                  <div style={{ marginLeft: 34, marginRight: 12, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  <div style={{ fontFamily: typo.bodyLg.font, fontSize: 15, fontWeight: 500, color: c.textMid, lineHeight: 1.5, paddingLeft: 34 }}>{depriItem?.title}</div>
                  {person.depriReason && (
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red, paddingLeft: 34 }}>
                      Reason: {person.depriReason}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 34, marginTop: space[1] }}>
                    <Badge color={c.red} bg={`${c.red}08`} style={{ border: `1px solid ${c.red}20` }}>Deprioritized</Badge>
                    <button onClick={restoreSlot} style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
                      color: c.accent, cursor: "pointer", background: `${c.accent}08`,
                      border: `1px solid ${c.accent}20`, borderRadius: layout.radiusSm,
                      padding: `${space[1]}px ${space[3]}px`,
                      transition: "all 0.2s ease",
                    }} onMouseEnter={e => { e.target.style.background = `${c.accent}15`; e.target.style.borderColor = `${c.accent}40`; }}
                       onMouseLeave={e => { e.target.style.background = `${c.accent}08`; e.target.style.borderColor = `${c.accent}20`; }}>Restore</button>
                  </div>
                </div>
              );
            })()}

            {/* ── Buffer form (planning phase, after deprioritize) ── */}
            {detailFocus === 3 && bufferActive && (
              <div style={{
                maxWidth: 640, margin: "0 auto", width: "100%",
                background: !bufferHasContent ? `${c.purple}02` : c.surface,
                border: !bufferHasContent ? `1.5px dashed ${c.purple}20` : `1px solid ${c.border}`,
                borderRadius: layout.radius + 2, padding: `${space[6]}px`,
                display: "flex", flexDirection: "column", gap: space[4],
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <div style={{ width: 32, height: 32, borderRadius: layout.radiusMd, background: `${c.purple}10`, border: `1px solid ${c.purple}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: c.purple, flexShrink: 0 }}>B</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: bufProj ? c.text : c.textMid }}>{bufProj ? bufProj.name : "Buffer Task"}</div>
                    <div style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, color: c.textDim, marginTop: 2 }}>{bufProj ? `${bufProj.id} · Replacing #${person.deselected + 1}` : `Replacing task #${person.deselected + 1} — pick a project to start`}</div>
                  </div>
                  {!!person.bufferProject && (
                    <div style={{ display: "flex", gap: 2, background: c.surfaceAlt, borderRadius: layout.radiusSm, padding: 2, border: `1px solid ${c.border}`, flexShrink: 0 }}>
                      {["BUILD", "JAM"].map(t => {
                        const cfg = tc[t] || {};
                        const active = person.bufferType === t;
                        return (
                          <button key={t} onClick={() => updatePerson("bufferType", t)} style={{
                            fontFamily: typo.monoSm.font, fontSize: 12, fontWeight: 700,
                            letterSpacing: "0.05em", padding: `5px 14px`,
                            borderRadius: layout.radiusSm - 1, border: "none", cursor: "pointer",
                            background: active ? `${cfg.color || c.accent}18` : "transparent",
                            color: active ? (cfg.color || c.accent) : c.textDim,
                            transition: "all 0.15s ease",
                          }}>{cfg.label || t}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>{person.bufferProject ? "Project" : "Which project are you working on?"}</div>
                  <ProjectSearchSelect projects={projects} value={person.bufferProject || ""} onChange={val => updatePerson("bufferProject", val)} placeholder="Search by name or ID (e.g. X21)..." />
                </div>
                {!!person.bufferProject && (
                  <div>
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>What are you delivering this week?</div>
                    <TextArea value={person.buffer || ""} onChange={e => updatePerson("buffer", e.target.value)} placeholder="Describe what you'll deliver" rows={3} />
                  </div>
                )}
                {!!person.bufferProject && !!(person.buffer || "").trim() && (
                  <div style={{ display: "flex", gap: space[4] }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Stage</div>
                      <ChoiceGroup options={phaseNames.map(s => ({ value: s, label: s, color: pc[s] || c.textDim }))} value={person.bufferStage} onChange={val => updatePerson("bufferStage", val)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Estimated timeline</div>
                      <ChoiceGroup mono options={[1, 2, 3, 4].map(w => ({ value: w, label: `${w}w` }))} value={person.bufferDuration || 1} onChange={val => updatePerson("bufferDuration", val)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Regular Spotlight Card ── */}
            {detailFocus <= 2 && person.deselected !== detailFocus && (
              <div style={{
                maxWidth: 640, margin: "0 auto", width: "100%",
                background: spotEmpty ? `${c.accent}02` : c.surface,
                border: spotEmpty ? `1.5px dashed ${c.accent}20` : `1px solid ${c.border}`,
                borderRadius: layout.radius + 2, padding: `${space[6]}px`,
                display: "flex", flexDirection: "column", gap: space[4],
              }}>
                {/* Header — number badge + title + type toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: layout.radiusMd,
                    background: `${c.accent}10`, border: `1px solid ${c.accent}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: c.accent, flexShrink: 0,
                  }}>{detailFocus + 1}</div>
                  <div style={{
                    fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
                    fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
                    color: spotProj ? c.text : c.textMid, flex: 1,
                  }}>{spotProj ? spotProj.name : `Commit ${detailFocus + 1}`}</div>
                  {spotHasProject && (
                    <div style={{ display: "flex", gap: 2, background: c.surfaceAlt, borderRadius: layout.radiusSm, padding: 2, border: `1px solid ${c.border}`, flexShrink: 0 }}>
                      {["BUILD", "JAM"].map(t => {
                        const cfg = tc[t] || {};
                        const active = spotItem.type === t;
                        return (
                          <button key={t} onClick={() => updateItem(detailFocus, "type", t)} style={{
                            fontFamily: typo.monoSm.font, fontSize: 12, fontWeight: 700,
                            letterSpacing: "0.05em", padding: `5px 14px`,
                            borderRadius: layout.radiusSm - 1, border: "none", cursor: "pointer",
                            background: active ? `${cfg.color || c.accent}18` : "transparent",
                            color: active ? (cfg.color || c.accent) : c.textDim,
                            transition: "all 0.15s ease",
                          }}>{cfg.label || t}</button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Project search — clickable to change */}
                <div>
                  <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>
                    {spotHasProject ? "Project" : "Which project are you working on?"}
                  </div>
                  <ProjectSearchSelect
                    projects={projects}
                    value={spotItem.project}
                    onChange={val => {
                      updateItem(detailFocus, "project", val);
                    }}
                    placeholder="Search by name or ID (e.g. X21)..."
                  />
                </div>

                {/* Deliverable — appears after project */}
                {spotHasProject && (
                  <div>
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>What are you delivering this week?</div>
                    <TextArea
                      value={spotItem.title}
                      onChange={e => updateItem(detailFocus, "title", e.target.value)}
                      placeholder="Describe what you'll deliver"
                      rows={3}
                    />
                  </div>
                )}

                {/* Stage + Estimated timeline — single row */}
                {spotHasProject && spotHasTitle && (
                  <div style={{ display: "flex", gap: space[4] }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Stage</div>
                      <ChoiceGroup options={phaseNames.map(s => ({ value: s, label: s, color: pc[s] || c.textDim }))} value={spotItem.stage} onChange={val => updateItem(detailFocus, "stage", val)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Estimated timeline</div>
                      <ChoiceGroup mono options={[1, 2, 3, 4].map(w => ({ value: w, label: `${w}w` }))} value={spotItem.duration || 1} onChange={val => updateItem(detailFocus, "duration", val)} />
                    </div>
                  </div>
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

              </div>
            )}

          </>
        );
      })()}

      {/* ═══ LOCKED PHASE — all 3 cards stacked + buffer ═══ */}
      {phase === "locked" && (() => {
        const bufferHasContent = bufferActive && (person.buffer || "").trim() && person.bufferProject;
        const showBufferForm = bufferActive;
        const bufProj = projects.find(p => p.id === person.bufferProject);

        return (
        <>
          {/* ── All cards stacked ── */}
          <div style={{ maxWidth: 640, margin: `${space[4]}px auto 0`, width: "100%", display: "flex", flexDirection: "column", gap: space[3] + 2 }}>
          {person.items.slice(0, 3).map((item, idx) => {
            if (!item.project && !(item.title || "").trim()) return null;
            const isDepri = person.deselected === idx;
            const projObj = projects.find(p => p.id === item.project);
            const stageColor = pc[item.stage] || c.textDim;
            const tCfg = tc[item.type] || {};

            if (isDepri) {
              return (
                <div key={idx} style={{
                  background: c.surface, border: `1px solid ${c.border}`,
                  borderRadius: layout.radius, padding: `${space[4] + 2}px ${space[5] + 2}px`,
                  display: "flex", flexDirection: "column", gap: space[2] + 2,
                  opacity: 0.6,
                }}>
                  {/* Header — badge + ID + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: layout.radiusSm,
                      background: `${c.red}08`, border: `1px solid ${c.red}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.textMid,
                    }}>{idx + 1}</div>
                    {projObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: c.textMid }}>{projObj.id}</span>}
                    {projObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.textMid }}>{projObj.name}</span>}
                  </div>
                  <div style={{ marginLeft: 34, marginRight: 12, height: 1, background: "rgba(255,255,255,0.06)" }} />
                  {/* Deliverable */}
                  <div style={{ fontFamily: typo.bodyLg.font, fontSize: 15, fontWeight: 500, color: c.textMid, lineHeight: 1.5, paddingLeft: 34 }}>{item.title}</div>
                  {/* Reason */}
                  {/* Reason + Deprioritized + Restore — all one line */}
                  <div style={{ display: "flex", alignItems: "center", gap: space[2], paddingLeft: 34, marginTop: space[1] }}>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red, flex: 1 }}>
                      {person.depriReason ? `Reason: ${person.depriReason}` : ""}
                    </span>
                    <Badge color={c.red} bg={`${c.red}08`} style={{ border: `1px solid ${c.red}20`, flexShrink: 0 }}>Deprioritized</Badge>
                    <button onClick={restoreSlot} style={{
                      fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
                      color: c.accent, cursor: "pointer", background: `${c.accent}08`,
                      border: `1px solid ${c.accent}20`, borderRadius: layout.radiusSm,
                      padding: `${space[1]}px ${space[3]}px`, flexShrink: 0,
                      transition: "all 0.2s ease",
                    }} onMouseEnter={e => { e.target.style.background = `${c.accent}15`; e.target.style.borderColor = `${c.accent}40`; }}
                       onMouseLeave={e => { e.target.style.background = `${c.accent}08`; e.target.style.borderColor = `${c.accent}20`; }}>Restore</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} style={{
                background: c.surface, border: `1px solid ${c.border}`,
                borderRadius: layout.radius, padding: `${space[4] + 2}px ${space[5] + 2}px`,
                display: "flex", flexDirection: "column", gap: space[2] + 2,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: layout.radiusSm,
                    background: `${entityColors().project}10`, border: `1px solid ${entityColors().project}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: entityColors().project,
                  }}>{idx + 1}</div>
                  {projObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: entityColors().project }}>{projObj.id}</span>}
                  {projObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{projObj.name}</span>}
                  {!bufferActive && (
                    <button onClick={() => { setDepriModal({ idx }); setDepriText(""); }} style={{
                      marginLeft: "auto", cursor: "pointer", border: `1px solid ${c.orange}20`,
                      background: `${c.orange}06`, borderRadius: layout.radiusSm,
                      padding: `${space[1]}px ${space[3]}px`,
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
                      letterSpacing: typo.monoSm.tracking, color: c.orange, opacity: 0.7,
                      transition: `all 0.2s ease`,
                    }} onMouseEnter={e => { e.target.style.opacity = "1"; e.target.style.background = `${c.orange}12`; }}
                       onMouseLeave={e => { e.target.style.opacity = "0.7"; e.target.style.background = `${c.orange}06`; }}
                    >Deprioritize</button>
                  )}
                </div>
                <div style={{ marginLeft: 34, marginRight: 12, height: 1, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ fontFamily: typo.bodyLg.font, fontSize: 15, fontWeight: 500, color: c.text, lineHeight: 1.5, paddingLeft: 34 }}>{item.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: space[1] + 1, flexWrap: "wrap", paddingLeft: 34 }}>
                  {item.stage && <Badge color={stageColor} bg={stageColor + "10"} style={{ border: `1px solid ${stageColor}15` }}>{item.stage}</Badge>}
                  {item.type && <Badge color={tCfg.color || c.textDim} bg={tCfg.bg || c.surfaceAlt} style={{ border: `1px solid ${(tCfg.color || c.textDim)}15` }}>{tCfg.label || item.type}</Badge>}
                  <span style={{ marginLeft: "auto", fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.textMid, padding: `3px ${space[2] + 2}px`, borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>{item.duration || 1}w</span>
                </div>
              </div>
            );
          })}

          {/* ── Buffer card (locked phase — read-only, same style as other cards) ── */}
          {bufferActive && bufferHasContent && (
            <div style={{
              background: c.surface, border: `1px solid ${c.border}`,
              borderRadius: layout.radius, padding: `${space[4] + 2}px ${space[5] + 2}px`,
              display: "flex", flexDirection: "column", gap: space[2] + 2,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: layout.radiusSm,
                  background: `${c.purple}10`, border: `1px solid ${c.purple}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.purple,
                }}>B</div>
                {bufProj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: entityColors().project }}>{bufProj.id}</span>}
                {bufProj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{bufProj.name}</span>}
              </div>
              <div style={{ marginLeft: 34, marginRight: 12, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ fontFamily: typo.bodyLg.font, fontSize: 15, fontWeight: 500, color: c.text, lineHeight: 1.5, paddingLeft: 34 }}>{person.buffer}</div>
              <div style={{ display: "flex", alignItems: "center", gap: space[1] + 1, flexWrap: "wrap", paddingLeft: 34 }}>
                {person.bufferStage && (() => { const sc = pc[person.bufferStage] || c.textDim; return <Badge color={sc} bg={sc + "10"} style={{ border: `1px solid ${sc}15` }}>{person.bufferStage}</Badge>; })()}
                {person.bufferType && (() => { const btc = tc[person.bufferType] || {}; return <Badge color={btc.color || c.textDim} bg={btc.bg || c.surfaceAlt} style={{ border: `1px solid ${(btc.color || c.textDim)}15` }}>{btc.label || person.bufferType}</Badge>; })()}
                <span style={{ marginLeft: "auto", fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.textMid, padding: `3px ${space[2] + 2}px`, borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>{person.bufferDuration || 1}w</span>
              </div>
            </div>
          )}

          {/* ── Buffer form (locked phase — empty, needs filling) ── */}
          {bufferActive && !bufferHasContent && (() => {
            // This shouldn't normally show in locked phase since deprioritize unlocks,
            // but keeping as safety net
            return null;
          })()}

          </div>
        </>
        );
      })()}

      {/* ── Deprioritize Reason Modal ── */}
      {depriModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: layout.radius + 4, padding: `${space[6]}px`,
            maxWidth: 480, width: "90%",
            display: "flex", flexDirection: "column", gap: space[4],
          }}>
            <div>
              <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text, marginBottom: space[1] }}>
                Deprioritize this commit
              </div>
              <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>
                Add a reason for deprioritization
              </div>
            </div>
            <TextArea value={depriText} onChange={e => setDepriText(e.target.value)} placeholder="E.g., priorities shifted, blocked by dependency, scope changed..." rows={3} autoFocus />
            <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end" }}>
              <Btn variant="ghost" size="sm" onClick={() => { setDepriModal(null); setDepriText(""); }}>Cancel</Btn>
              <Btn variant="danger" size="sm" disabled={!depriText.trim()} onClick={() => {
                deprioritizeSlot(depriModal.idx, depriText.trim());
                setDetailFocus(3); // Jump to buffer
                setDepriModal(null); setDepriText("");
              }}>Deprioritize</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CLOSING PHASE — card + extension pattern ═══ */}
      {phase === "closing" && (
        <div style={{ maxWidth: 640, margin: `${space[4]}px auto 0`, width: "100%", display: "flex", flexDirection: "column", gap: space[2] + 2 }}>
          {person.items.slice(0, 3).map((item, idx) => {
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

          {/* Buffer task card in closing mode */}
          {bufferNeedsOutcome && (() => {
            const bufProjObj = projects.find(p => p.id === person.bufferProject);
            const bufStageColor = pc[person.bufferStage] || c.textDim;
            const bufTCfg = tc[person.bufferType] || {};
            const bufOutcome = person.bufferOutcome;
            const bufOutcomeColor = bufOutcome === "done" ? c.green : bufOutcome === "carry" ? c.cyan : bufOutcome === "blocked" ? c.red : bufOutcome === "done_carry" ? c.orange : null;
            const bufWrapBg = bufOutcome === "done" || bufOutcome === "done_carry" ? `${c.green}02` : bufOutcome === "carry" ? `${c.cyan}02` : bufOutcome === "blocked" ? `${c.red}02` : c.surface;
            const bufWrapBorder = bufOutcome === "done" || bufOutcome === "done_carry" ? `${c.green}12` : bufOutcome === "carry" ? `${c.cyan}12` : bufOutcome === "blocked" ? `${c.red}12` : c.border;
            const bufCarryColor = bufOutcome === "done_carry" ? c.orange : c.cyan;

            return (
              <div style={{
                borderRadius: layout.radius, overflow: "hidden",
                border: `1px solid ${bufWrapBorder}`, background: bufWrapBg,
                borderLeft: `3px solid ${c.purple}`,
                transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
              }}>
                <div style={{ padding: `${space[4] + 2}px ${space[5] + 2}px`, display: "flex", flexDirection: "column", gap: space[2] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] + 2 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: layout.radiusSm,
                      background: bufOutcomeColor ? `${bufOutcomeColor}12` : `${c.purple}08`,
                      border: `1px solid ${bufOutcomeColor ? bufOutcomeColor + "20" : c.purple + "15"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800,
                      color: bufOutcomeColor || c.purple,
                    }}>{bufOutcome === "done" || bufOutcome === "done_carry" ? "\u2713" : bufOutcome === "carry" ? "\u2192" : bufOutcome === "blocked" ? "!" : "B"}</div>
                    <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: entityColors().project }}>{bufProjObj?.id}</span>
                    <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{bufProjObj?.name}</span>
                    <Badge color={c.purple} bg={c.purple + "10"} style={{ marginLeft: 4 }}>Buffer</Badge>
                    <span style={{
                      marginLeft: "auto", fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                      fontWeight: 600, color: c.textMid, padding: `3px ${space[2] + 2}px`,
                      borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}`,
                    }}>{person.bufferDuration || 1}w</span>
                  </div>
                  <div style={{
                    fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size - 1, fontWeight: 500,
                    color: (bufOutcome === "done" || bufOutcome === "done_carry") ? c.textMid : c.text,
                    lineHeight: 1.5, paddingLeft: 34,
                    textDecoration: (bufOutcome === "done" || bufOutcome === "done_carry") ? "line-through" : "none",
                  }}>{person.buffer}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: space[1] + 1, paddingLeft: 34 }}>
                    {person.bufferStage && <Badge color={bufStageColor} bg={bufStageColor + "10"}>{person.bufferStage}</Badge>}
                    {person.bufferType && <Badge color={bufTCfg.color || c.textDim} bg={bufTCfg.bg || c.surfaceAlt}>{bufTCfg.label || person.bufferType}</Badge>}
                  </div>
                  {bufOutcome === "blocked" && person.bufferBlockedReason && (
                    <Surface compact variant="data" style={{ borderLeft: `3px solid ${c.red}`, marginLeft: 34 }}>
                      <TelemetryLabel color={c.red} style={{ marginBottom: 2 }}>Blocker</TelemetryLabel>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 400, color: c.textMid, lineHeight: typo.bodySm.lineHeight }}>{person.bufferBlockedReason}</div>
                    </Surface>
                  )}
                </div>
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
                      { val: "blocked", label: "Blocked", clr: c.red },
                    ].map(btn => {
                      const active = bufOutcome === btn.val;
                      return (
                        <button key={btn.val} onClick={() => updateBufferOutcome(btn.val)} style={{
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
                  {(bufOutcome === "carry") && (
                    <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
                      <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: bufCarryColor, textTransform: "uppercase" }}>Carry to</span>
                      {weeks.map(wk => {
                        const sel = person.bufferCarryTo === wk.value;
                        return (
                          <button key={wk.value} onClick={() => updateBufferCarryTo(wk.value)} style={{
                            padding: `4px ${space[2] + 2}px`, borderRadius: layout.radiusTag + 1,
                            fontSize: typo.monoSm.size, fontWeight: 600, fontFamily: typo.monoSm.font,
                            border: `1px solid ${sel ? bufCarryColor + "30" : c.border}`,
                            background: sel ? `${bufCarryColor}10` : "transparent",
                            color: sel ? bufCarryColor : c.textDim,
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
          })()}
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
              {weekComplete ? "All commits resolved" : `${fullyResolved}/${totalToResolve} resolved`}
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
                const carriedItems = p.items.slice(0, 3).filter((it, idx) =>
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
                // Carry buffer task if applicable
                if (p.bufferOutcome === "carry" && p.bufferCarryTo && (p.buffer || "").trim()) {
                  const bufItem = {
                    title: p.buffer, type: p.bufferType || "", project: p.bufferProject || "", stage: p.bufferStage || "",
                    duration: p.bufferDuration || 1,
                    outcome: null, carryTo: null, blockedReason: "", carriedFrom: weekLabel,
                  };
                  const existingIdx = next.findIndex(c => c.person === p.person && c !== p);
                  if (existingIdx === -1) {
                    next.push({ person: p.person, items: [bufItem, { title: "", type: "", project: "", stage: "", duration: 1 }, { title: "", type: "", project: "", stage: "", duration: 1 }], buffer: "", deselected: -1, weekStart: p.bufferCarryTo });
                  } else {
                    const target = { ...next[existingIdx] }; const targetItems = [...target.items];
                    const emptyIdx = targetItems.findIndex(t => !t.title.trim());
                    if (emptyIdx !== -1) targetItems[emptyIdx] = bufItem; else targetItems.push(bufItem);
                    target.items = targetItems; next[existingIdx] = target;
                  }
                }
                p.closedAt = new Date().toISOString(); next[activePerson] = p; return next;
              });
              setClosingMode(false);
              goBackToList();
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
                ? `You're locking ${activeItems.length + (bufferFilled ? 1 : 0)} commits for the week of ${weekLabel}. Once locked, your plan is set and visible to your team.`
                : "Tasks will become editable again. Any changes made will be updated in the system."}
            </div>
            {confirmAction === "lock" && (
              <Surface compact variant="data" style={{
                display: "flex", alignItems: "flex-start", gap: space[2],
                borderLeft: `3px solid ${c.red}`, marginBottom: space[4],
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="8" cy="8" r="7" stroke={c.red} strokeWidth="1.3" fill="none" />
                  <line x1="8" y1="4" x2="8" y2="9" stroke={c.red} strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.8" fill={c.red} />
                </svg>
                <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.red, lineHeight: 1.5 }}>
                  This is permanent. Once locked, you will not be able to edit these commits. You can deprioritize one task and add a buffer, but nothing else.
                </span>
              </Surface>
            )}
            {/* Commit summary for lock confirmation */}
            {confirmAction === "lock" && (
              <div style={{
                padding: `${space[3]}px ${space[3] + 2}px`, borderRadius: layout.radiusMd,
                background: c.surfaceAlt, border: `1px solid ${c.border}`, marginBottom: space[5],
                display: "flex", flexDirection: "column", gap: space[1] + 2,
              }}>
                <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: "0.04em", color: c.textDim, textTransform: "uppercase", marginBottom: 2 }}>Your commits</div>
                {person.items.slice(0, 3).map((it, ci) => {
                  if (person.deselected === ci) return null;
                  if (!it.title.trim()) return null;
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
                {/* Buffer item */}
                {bufferFilled && (() => {
                  const bProj = projects.find(p => p.id === person.bufferProject);
                  const bTC = tc[person.bufferType] || {};
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: layout.radiusSm,
                        background: `${c.purple}08`, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color: c.purple,
                      }}>B</div>
                      <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text, flex: 1 }}>{bProj?.name || person.bufferProject}</span>
                      {person.bufferType && <Badge color={bTC.color || c.textDim} bg={bTC.bg || c.surfaceAlt} style={{ marginLeft: "auto" }}>{bTC.label || person.bufferType}</Badge>}
                    </div>
                  );
                })()}
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
      {/* ═══ RESET FAB — bottom-right, only in detail view when not locked ═══ */}
      {person && !isLocked && !closingMode && (
        <button onClick={() => setConfirmReset(true)} style={{
          position: "fixed", bottom: space[7], right: space[7], zIndex: 50,
          padding: `${space[2]}px ${space[4]}px`, borderRadius: layout.radiusMd,
          border: `1px solid ${c.red}30`, cursor: "pointer",
          background: `${c.red}12`, color: c.red,
          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: space[1],
          boxShadow: "none",
          transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
          opacity: 0.7,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = `${c.red}20`; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = `${c.red}12`; }}
        >Reset</button>
      )}

      {/* ═══ RESET CONFIRMATION MODAL ═══════════════════════════════ */}
      {confirmReset && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setConfirmReset(false)} style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          }} />
          <Surface variant="overlay" style={{
            position: "relative", zIndex: 1,
            border: `1px solid ${c.red}40`,
            borderRadius: layout.radiusLg + 2, padding: `${space[6]}px ${space[7] - 4}px`, width: 460, maxWidth: "90vw",
            boxShadow: c.shadowOverlay,
          }}>
            <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, color: c.text, marginBottom: space[2] }}>
              Reset all commits?
            </div>
            <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[4] }}>
              Are you sure you want to reset? All progress for this week will be lost.
            </div>
            <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={() => {
                setCommitments(prev => {
                  const next = [...prev];
                  const p = { ...next[activePerson] };
                  p.items = [
                    { title: '', type: '', project: '', stage: '' },
                    { title: '', type: '', project: '', stage: '' },
                    { title: '', type: '', project: '', stage: '' },
                  ];
                  p.buffer = '';
                  p.bufferType = '';
                  p.bufferProject = '';
                  p.bufferStage = '';
                  p.deselected = -1;
                  next[activePerson] = p;
                  return next;
                });
                setConfirmReset(false);
                setDetailFocus(0);
              }}>Yes, Reset</Btn>
            </div>
          </Surface>
        </div>
      )}

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
