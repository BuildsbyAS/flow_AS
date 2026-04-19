// Flow — Commit View (Phase-driven: Planning → Locked → Closing)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { c, layout, motion, space, typo, allPhases, commitPhases, shipPhases, typeConfig, phaseColors as getPhaseColors, entityColors } from "../styles/theme";
import { Badge, Surface, Modal, Inp, TextArea, ChoiceGroup, Btn, TelemetryLabel, Th as SharedTh, TableShell } from "../components/shared";
import { KpiGrid, KpiCard, HealthGauge, SectionHead, Pill, PillRow } from "../components/kpi";
import useKeyboard from "../hooks/useKeyboard";
import useDevLabel from "../hooks/useDevLabel";
import useExitAnimation from "../hooks/useExitAnimation";

// ─── PROJECT SEARCH/SELECT — supports typing project ID ──────────
const ProjectSearchSelect = ({ projects, value, onChange, placeholder }) => {
  const devRef = useDevLabel('ProjectSearchSelect', 'src/views/HumansView.jsx', 'Filterable project picker dropdown with ID and name search');
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
      <div ref={devRef} onClick={() => { onChange(""); setQuery(""); }} style={{
        display: "flex", alignItems: "center", gap: space[2],
        padding: `${space[2]}px ${space[3]}px`, borderRadius: layout.radiusSm,
        background: c.surfaceAlt, border: `1px solid ${c.border}`,
        cursor: "pointer", transition: `border-color ${motion.fast.duration} ${motion.fast.easing}`,
      }} onMouseEnter={e => e.currentTarget.style.borderColor = c.accent + "50"}
         onMouseLeave={e => e.currentTarget.style.borderColor = c.border}>
        <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, color: entityColors().project }}>{selected.id}</span>
        <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 500, color: c.text, flex: 1 }}>{selected.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.textDim} strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    );
  }

  return (
    <div ref={el => { ref.current = el; if (devRef) devRef.current = el; }} style={{ position: "relative" }}>
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
          animation: `fadeScaleIn ${motion.fast.duration} ${motion.fast.easing} both`,
          transformOrigin: "top center",
        }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => { onChange(p.id); setQuery(""); setOpen(false); }}
              className="flow-row" style={{
                padding: `${space[2]}px ${space[3]}px`, cursor: "pointer",
                display: "flex", alignItems: "center", gap: space[2],
                transition: `background ${motion.interaction.duration} ${motion.interaction.easing}`,
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

// Local YYYY-MM-DD formatter — avoids UTC-shift bugs from toISOString()
// for users east of UTC when computing carry-to dates.
const toLocalISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Full carry-forward row template — matches the shape the rest of the app expects.
const makeEmptySlot = () => ({ title: "", type: "", project: "", stage: "", duration: 1 });
const makeCarriedWeekRow = (person, weekStart, firstItem) => ({
  person,
  weekStart,
  items: [firstItem, makeEmptySlot(), makeEmptySlot()],
  buffer: "",
  bufferProject: "",
  bufferStage: "",
  bufferType: "",
  bufferDuration: 1,
  bufferOutcome: null,
  bufferCarryTo: null,
  bufferBlockedReason: "",
  deselected: -1,
  depriReason: "",
  lockedAt: null,
  lockedAtTime: null,
  wasLockedAtTime: null,
  closedAt: null,
});

const HumansView = ({ loading, error, commitments: rawCommitments, setCommitments: rawSetCommitments, projects, people, initialPerson, initialCommitIdx, setDetailLabel, setGoBack, setIsLocked, searchRef, globalFilters = {}, suppressBackRef, isHistorical, selectedWeekKey, weekConfig, onSave }) => {
  const devRef = useDevLabel('HumansView', 'src/views/HumansView.jsx', 'Commit tab — weekly 3-commitment cards per person');
  // Derive current week start from weekConfig
  const currentWeekStart = React.useMemo(() => {
    if (weekConfig?.weekStart) return new Date(String(weekConfig.weekStart).slice(0, 10) + "T00:00:00");
    // Fallback: compute Monday of current week
    const now = new Date(); const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }, [weekConfig?.weekStart]);
  // Normalize: ensure every commitment has a padded items array
  const commitments = React.useMemo(() => rawCommitments.map(ensureItems), [rawCommitments]);
  const _rawSet = (isHistorical || !rawSetCommitments) ? () => {} : rawSetCommitments;
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
  const prevDetailFocusRef = useRef(detailFocus);
  const slotDir = detailFocus >= prevDetailFocusRef.current ? "right" : "left";
  useEffect(() => { prevDetailFocusRef.current = detailFocus; }, [detailFocus]);
  const [closingMode, _setClosingMode] = useState(false);
  const closingModeRef = useRef(false);
  // Set by Close Week right before it exits closing mode, so the cleanup
  // below knows this exit is a successful close (preserve outcomes) vs.
  // an Escape/back exit (discard outcomes). Avoids relying on React's
  // state-batching order between the Close setCommitments and the
  // setClosingMode(false) that follows.
  const justClosedRef = useRef(false);
  const setClosingMode = (val) => {
    // When leaving closing mode, clear any partial outcome writes that may have
    // landed during the transition — they'd otherwise display under Locked phase.
    if (closingModeRef.current && !val && rawSetCommitments) {
      const wasJustClosed = justClosedRef.current;
      justClosedRef.current = false;
      if (!wasJustClosed) {
        rawSetCommitments(prev => {
          if (!prev || activePerson < 0 || activePerson >= prev.length) return prev;
          const next = [...prev]; const p = { ...next[activePerson] };
          if (!p.closedAt) {
            p.items = (p.items || []).map(it => ({ ...it, outcome: null, carryTo: null, blockedReason: "" }));
            p.bufferOutcome = null; p.bufferCarryTo = null; p.bufferBlockedReason = "";
            next[activePerson] = p;
            return next;
          }
          return prev;
        });
      }
    }
    closingModeRef.current = val;
    _setClosingMode(val);
  };
  const [confirmAction, setConfirmAction] = useState(null); // "lock" | "unlock" | null
  const [confirmReset, setConfirmReset] = useState(false);
  const [blockedModal, setBlockedModal] = useState(null); // { idx: number } | null
  const [blockedText, setBlockedText] = useState("");
  const [depriModal, setDepriModal] = useState(null); // { idx: number } | null
  const [depriText, setDepriText] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  // lockSuccess interstitial removed — locking goes straight to the locked
  // panel. Flag + setter are no-ops so older call sites don't error.
  const lockSuccess = false;
  const setLockSuccess = () => {};
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | "saving" | "saved"
  const autoSaveTimer = useRef(null);
  const autoSaveStatusTimer = useRef(null);
  const overflowRef = useRef(null);
  const triggerAutoSave = useCallback(() => {
    // Do NOT auto-save while the user is in closing mode. Outcome edits
    // (Done / Partial / Carry / Blocked) are pending selections until the
    // user presses "Close Week" — only then should they hit the DB.
    // Pressing Escape during closing reverts these edits, so persisting
    // them mid-flow would write state the user never confirmed.
    if (closingModeRef.current) return;
    clearTimeout(autoSaveTimer.current);
    // Surface a "pending" state during the debounce window so the user
    // knows edits are unsaved — previously the UI was silent for 800ms.
    setAutoSaveStatus("pending");
    autoSaveTimer.current = setTimeout(async () => {
      if (onSave) {
        setAutoSaveStatus("saving");
        try { await onSave(); } catch (_) { /* flush best-effort */ }
      }
      clearTimeout(autoSaveStatusTimer.current);
      setAutoSaveStatus("saved");
      autoSaveStatusTimer.current = setTimeout(() => setAutoSaveStatus(null), 2000);
    }, 800);
  }, [onSave]);

  // Signal App-level Escape handler to skip goBack when a sub-state is active
  useEffect(() => {
    if (suppressBackRef) suppressBackRef.current = !!(closingMode || confirmAction || depriModal || blockedModal || reviewMode || lockSuccess);
  }, [closingMode, confirmAction, depriModal, blockedModal, reviewMode, lockSuccess, suppressBackRef]);

  // Reset transient modals when switching person so a prior open modal
  // doesn't re-surface when re-entering a detail view.
  useEffect(() => {
    setBlockedModal(null); setBlockedText("");
    setDepriModal(null); setDepriText("");
    setConfirmAction(null); setConfirmReset(false);
    setReviewMode(false); setLockSuccess(false);
  }, [activePerson]);
  // Close overflow menu on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const close = (e) => { if (overflowRef.current && !overflowRef.current.contains(e.target)) setOverflowOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [overflowOpen]);

  const [sortCol, setSortCol] = useState("squad");
  const [sortDir, setSortDir] = useState("asc");
  const [filterStatus, setFilterStatus] = useState(null); // "closed" | "locked" | "open" | null
  const [rowAnimKey, setRowAnimKey] = useState(0);
  const [searchGlow, setSearchGlow] = useState(false);
  const localSearchRef = useRef(null);
  // Ordered realIdx values in VISUAL render order (grouped + sorted). Populated
  // during render so keyboard Enter opens the person the user actually sees
  // highlighted, not whoever sits at filtered[focusIdx] in the raw list.
  const visibleOrderRef = useRef([]);

  const person = (activePerson >= 0 && activePerson < commitments.length) ? commitments[activePerson] : null;
  const filtered = commitments.filter(cm => {
    const pObj = people.find(p => p.name === cm.person);
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = cm.person.toLowerCase().includes(q);
      const roleMatch = (pObj?.role || "").toLowerCase().includes(q);
      const squadMatch = (pObj?.squad || "").toLowerCase().includes(q);
      if (!nameMatch && !roleMatch && !squadMatch) return false;
    }
    if (globalFilters.squad?.length > 0 && !globalFilters.squad.includes(pObj?.squad)) return false;
    if (globalFilters.person?.length > 0 && !globalFilters.person.includes(cm.person)) return false;
    if (globalFilters.owner?.length > 0) {
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

  // Resolve initialPerson once commitments finish loading (deeplink race).
  // Guarded with a ref so realtime updates to `commitments` don't re-open the
  // person and clobber in-progress detailFocus/closingMode/reviewMode state.
  const resolvedDeeplinkRef = useRef(null);
  useEffect(() => {
    if (!initialPerson) return;
    if (resolvedDeeplinkRef.current === initialPerson) return;
    if (activePerson >= 0) return;
    const idx = commitments.findIndex(cm => cm.person === initialPerson);
    if (idx >= 0) {
      resolvedDeeplinkRef.current = initialPerson;
      openPerson(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitments.length, initialPerson]);

  // ── Derived phase ──
  // Use lockedAtTime (numeric) as the source of truth; fall back to lockedAt
  // display string for older rows that pre-date lockedAtTime. closedAt is a
  // stronger signal than lockedAt — if the week was closed, the wizard stays
  // read-only even if lockedAt was later cleared via unlock. Keeps this view
  // in sync with PulseView, which groups on closedAt.
  const isClosed = person ? !!person.closedAt : false;
  const isLocked = person ? !!(person.lockedAtTime || person.lockedAt || person.closedAt) : false;
  const phase = !isLocked ? "planning" : closingMode ? "closing" : "locked";

  // Exit animations for gated sections
  const lockSuccessAnim = useExitAnimation(phase === "locked" && lockSuccess, 250);
  const reviewModeAnim = useExitAnimation(phase === "planning" && reviewMode, 250);
  const overflowAnim = useExitAnimation(overflowOpen, 150);

  // ── Mutations ──
  const updateItem = (idx, field, val) => {
    if (isLocked || isHistorical || activePerson < 0) return;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      const items = [...p.items]; items[idx] = { ...items[idx], [field]: val };
      if (field === "duration") items[idx].weeksRemaining = val;
      p.items = items; next[activePerson] = p; return next;
    });
    triggerAutoSave();
  };
  const updatePerson = (field, val) => {
    if (isLocked || isHistorical) return;
    setCommitments(prev => {
      const next = [...prev];
      next[activePerson] = { ...next[activePerson], [field]: val };
      return next;
    });
    triggerAutoSave();
  };
  const updateOutcome = (idx, val) => {
    if (isHistorical) return;
    // Use derived isLocked (lockedAtTime || lockedAt || closedAt) so outcome
    // writes never silently drop on zombie rows where only one of the three
    // lock signals is set. Block once the week is closed.
    if (!person || !isLocked || isClosed || !closingModeRef.current) return;
    // Blocked: toggle off if already blocked, otherwise open modal
    if (val === "blocked") {
      if (person?.items[idx]?.outcome === "blocked") {
        setCommitments(prev => {
          const next = [...prev]; const p = { ...next[activePerson] };
          const items = [...p.items];
          items[idx] = { ...items[idx], outcome: null, blockedReason: "" };
          p.items = items; next[activePerson] = p; return next;
        });
        triggerAutoSave();
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
      // Auto-set carryTo for carry outcomes + decrement weeksRemaining for done_carry
      if (newOutcome === "carry" || newOutcome === "done_carry") {
        const base = new Date(currentWeekStart);
        base.setDate(base.getDate() + 7);
        items[idx].carryTo = toLocalISODate(base);
        if (newOutcome === "done_carry") {
          items[idx].weeksRemaining = Math.max(1, (item.weeksRemaining || item.duration || 1) - 1);
        }
      }
      // Clear blockedReason when switching away from blocked
      if (newOutcome !== "blocked") items[idx].blockedReason = "";
      p.items = items; next[activePerson] = p; return next;
    });
    triggerAutoSave();
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
    triggerAutoSave();
  };
  const updateCarryTo = (idx, week) => {
    if (isHistorical) return;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      const items = [...p.items];
      // Only allow switching — clicking the same week is a no-op so users
      // don't accidentally un-resolve a carry commit.
      if (items[idx].carryTo === week) return prev;
      items[idx] = { ...items[idx], carryTo: week };
      p.items = items; next[activePerson] = p; return next;
    });
    triggerAutoSave();
  };
  // Buffer outcome helpers
  const updateBufferOutcome = (val) => {
    if (isHistorical) return;
    if (val === "blocked") {
      if (person?.bufferOutcome === "blocked") {
        setCommitments(prev => {
          const next = [...prev]; const p = { ...next[activePerson] };
          p.bufferOutcome = null; p.bufferBlockedReason = "";
          next[activePerson] = p; return next;
        });
        triggerAutoSave();
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
      // Auto-set bufferCarryTo for carry outcomes (match regular slot behavior)
      if (p.bufferOutcome === "carry" || p.bufferOutcome === "done_carry") {
        const base = new Date(currentWeekStart);
        base.setDate(base.getDate() + 7);
        p.bufferCarryTo = toLocalISODate(base);
      }
      if (p.bufferOutcome !== "blocked") p.bufferBlockedReason = "";
      next[activePerson] = p; return next;
    });
    triggerAutoSave();
  };
  const updateBufferCarryTo = (week) => {
    if (isHistorical) return;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      if (p.bufferCarryTo === week) return prev;
      p.bufferCarryTo = week;
      next[activePerson] = p; return next;
    });
    triggerAutoSave();
  };

  // Deprioritize — unlocks the week so buffer can be filled and re-locked
  // Preserves lockedAtTime so restoreSlot can re-lock
  const deprioritizeSlot = (idx, reason) => {
    if (isHistorical || isClosed) return;
    if (idx < 0 || idx > 2) return;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      p.deselected = idx;
      p.depriReason = reason || "";
      // Preserve BOTH the timestamp and the display string + ISO so restore
      // can reconstitute the exact original lock moment instead of stamping "now".
      p.wasLockedAtTime = p.lockedAtTime || null;
      p.wasLockedAt = p.lockedAt || null;
      p.wasLockedAtISO = p._lockedAtISO || null;
      p.lockedAt = null;
      p.lockedAtTime = null;
      p._lockedAtISO = null;
      next[activePerson] = p; return next;
    });
    if (setIsLocked) setIsLocked(false);
    triggerAutoSave();
  };
  const restoreSlot = () => {
    if (isHistorical || isClosed) return;
    setCommitments(prev => {
      const next = [...prev]; const p = { ...next[activePerson] };
      // Re-lock if person was locked before deprioritize — restore the
      // original display string and ISO so the UI doesn't falsely imply
      // a re-lock at the restore moment.
      if (p.wasLockedAtTime && !p.lockedAt) {
        p.lockedAt = p.wasLockedAt || new Date(p.wasLockedAtTime).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        p.lockedAtTime = p.wasLockedAtTime;
        p._lockedAtISO = p.wasLockedAtISO || new Date(p.wasLockedAtTime).toISOString();
        if (setIsLocked) setIsLocked(true);
      }
      p.wasLockedAtTime = null;
      p.wasLockedAt = null;
      p.wasLockedAtISO = null;
      p.deselected = -1; p.depriReason = ""; p.buffer = ""; p.bufferProject = "";
      p.bufferStage = ""; p.bufferType = ""; p.bufferDuration = 1;
      p.bufferOutcome = null; p.bufferCarryTo = null; p.bufferBlockedReason = "";
      next[activePerson] = p; return next;
    });
    triggerAutoSave();
  };

  const goBackToList = () => {
    clearTimeout(autoSaveTimer.current);
    if (onSave) onSave(); // flush immediately on exit
    setActivePerson(-1); setDetailFocus(0); setClosingMode(false); setReviewMode(false); setLockSuccess(false);
    if (setDetailLabel) setDetailLabel(null);
    if (setGoBack) setGoBack(null);
    if (setIsLocked) setIsLocked(false);
  };
  const openPerson = (realIdx) => {
    setActivePerson(realIdx); setSearch(""); setDetailFocus(0); setClosingMode(false); setReviewMode(false); setLockSuccess(false);
    const name = commitments[realIdx]?.person;
    if (setDetailLabel) setDetailLabel(name);
    if (setGoBack) setGoBack(goBackToList);
    if (setIsLocked) setIsLocked(!!commitments[realIdx]?.lockedAt);
  };

  // ── Keyboard: list view ──
  useKeyboard(!person ? [
    // First arrow press activates kb-focus mode WITHOUT moving, so the highlight
    // lands on the current focusIdx (row 0 on fresh load). Subsequent presses
    // step through rows.
    { key: "ArrowUp", fn: () => { if (document.activeElement !== localSearchRef.current) { if (!kbActive) { setKbActive(true); return; } setFocusIdx(i => Math.max(0, i - 1)); } } },
    { key: "ArrowDown", fn: () => { if (document.activeElement !== localSearchRef.current) { if (!kbActive) { setKbActive(true); return; } setFocusIdx(i => Math.min(filtered.length - 1, i + 1)); } } },
    { key: "Enter", fn: () => { if (!kbActive) return; const realIdx = visibleOrderRef.current[focusIdx]; if (realIdx != null && commitments[realIdx]) openPerson(realIdx); }, force: true },
    { key: "Escape", fn: () => { if (search) { setSearch(""); setFocusIdx(0); setRowAnimKey(k => k + 1); localSearchRef.current?.blur(); setKbActive(true); } else if (document.activeElement === localSearchRef.current) { localSearchRef.current.blur(); setKbActive(true); } else if (kbActive) { setKbActive(false); } }, force: true },
    { key: "/", fn: (e) => { e.preventDefault(); localSearchRef.current?.focus(); setSearchGlow(true); setKbActive(false); setTimeout(() => setSearchGlow(false), 1200); }, force: true },
  ] : [], [filtered.length, focusIdx, activePerson, kbActive]);

  // ── Lock validation — no buffer during planning ──
  const filledSlots = person ? person.items.slice(0, 3).filter((it) => (it.title || "").trim()).length : 0;
  const bufferActive = person ? person.deselected >= 0 : false;
  const bufferFilled = person ? (bufferActive && (person.buffer || "").trim() && person.bufferProject && person.bufferStage && person.bufferType) : false;

  // readyCount: active slots fully complete (title + project + valid stage + type) + buffer
  const validStagesForReady = [...commitPhases, ...shipPhases];
  const readyCount = person ? (
    person.items.slice(0, 3).filter((it, idx) => person.deselected !== idx && (it.title || "").trim() && it.project && it.stage && validStagesForReady.includes(it.stage) && it.type).length
    + (bufferFilled ? 1 : 0)
  ) : 0;

  const lockBlockers = [];
  if (person && !isLocked) {
    const validStages = [...commitPhases, ...shipPhases];
    const projectExists = (id) => !!projects.find(pr => pr.id === id);
    const isComplete = (it) => (it.title || "").trim() && it.project && projectExists(it.project) && it.stage && validStages.includes(it.stage) && it.type;
    if (bufferActive) {
      // After deprioritize: need 2 active slots complete + buffer filled
      const activeCompleteCount = person.items.slice(0, 3).filter((it, idx) => person.deselected !== idx && isComplete(it)).length;
      if (activeCompleteCount < 2) lockBlockers.push(`Need 2 fully filled commits (have ${activeCompleteCount})`);
      if (!bufferFilled) lockBlockers.push("Buffer: fill in the replacement task");
      person.items.slice(0, 3).forEach((it, idx) => {
        if (person.deselected === idx) return;
        if ((it.title || "").trim() && !it.project) lockBlockers.push(`Task ${idx + 1}: select a project`);
        if ((it.title || "").trim() && it.project && !it.stage) lockBlockers.push(`Task ${idx + 1}: select a stage`);
        if ((it.title || "").trim() && it.project && !it.type) lockBlockers.push(`Task ${idx + 1}: select a type`);
      });
    } else {
      // Normal planning: need 3 fully filled slots
      const completeCount = person.items.slice(0, 3).filter(it => isComplete(it)).length;
      if (completeCount < 3) lockBlockers.push(`Need 3 fully filled commits (have ${completeCount})`);
      person.items.slice(0, 3).forEach((it, idx) => {
        if ((it.title || "").trim() && !it.project) lockBlockers.push(`Task ${idx + 1}: select a project`);
        if ((it.title || "").trim() && it.project && !it.stage) lockBlockers.push(`Task ${idx + 1}: select a stage`);
        if ((it.title || "").trim() && it.project && !it.type) lockBlockers.push(`Task ${idx + 1}: select a type`);
      });
    }
  }
  const canLock = person ? lockBlockers.length === 0 : false;

  // ── Review mode is entered explicitly via "Review Plan" button (Step 5) ──
  const allSlotsFilled = person && !isLocked && canLock;
  // Exit review if user edits and breaks a slot
  useEffect(() => {
    if (reviewMode && !allSlotsFilled && !isLocked) setReviewMode(false);
  }, [allSlotsFilled, isLocked, reviewMode]);

  // Unlock is allowed on locked-but-not-closed weeks. A closed week is
  // read-only — reopening it requires its own dedicated Reopen affordance.
  const canUnlock = !isClosed && !isHistorical;

  const handleLock = () => {
    if (!canLock || isLocked) return;
    const now = new Date();
    const ts = now.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const iso = now.toISOString();
    const nowMs = now.getTime();
    setCommitments(prev => {
      if (activePerson < 0 || activePerson >= prev.length) return prev;
      const next = [...prev]; const p = { ...next[activePerson] };
      // Initialize weeksRemaining from duration on lock, preserving any decremented value carried forward.
      p.items = p.items.map(it => ({
        ...it,
        weeksRemaining: (typeof it.weeksRemaining === "number" && it.weeksRemaining > 0) ? it.weeksRemaining : (it.duration || 1),
      }));
      // Stamp _lockedAtISO at click time so DB locked_at reflects when the
      // user actually locked, not when the background sync happened.
      next[activePerson] = { ...p, lockedAt: ts, lockedAtTime: nowMs, _lockedAtISO: iso };
      return next;
    });
    if (setIsLocked) setIsLocked(true);
    setLockSuccess(true);
    // Leave review mode — the week is locked; no more editing.
    setReviewMode(false);
  };
  // Commits outcomes + carry-forward + closedAt to the DB. Called from the
  // floating dock's "Confirm Close" CTA in closing phase.
  const confirmCloseWeek = () => {
    setCommitments(prev => {
      if (activePerson < 0 || activePerson >= prev.length) return prev;
      const next = [...prev];
      const p = { ...next[activePerson] };
      const normalizeWeek = (ws) => ws ? String(ws).slice(0, 10) : "";
      const myWeekStart = normalizeWeek(p.weekStart);

      const alreadyCarriedByKey = (targetRow, sourceKey) =>
        (targetRow.items || []).some(t => t && t._carrySourceKey === sourceKey);

      // 1. Collect all carry intents (slots + buffer) with stable source keys.
      const carries = [];
      p.items.slice(0, 3).forEach((it, idx) => {
        if (!(it.title || "").trim()) return;
        if (p.deselected === idx) return;
        if (it.outcome !== "carry" && it.outcome !== "done_carry") return;
        if (!it.carryTo) return;
        const targetWeek = normalizeWeek(it.carryTo);
        if (!targetWeek || targetWeek === myWeekStart) return;
        const nextWeeksRemaining = it.outcome === "done_carry"
          ? Math.max(1, it.weeksRemaining || 1)
          : Math.max(1, (it.weeksRemaining || it.duration || 1) - 1);
        carries.push({
          targetWeek,
          sourceKey: `${myWeekStart}:slot:${idx}`,
          newItem: {
            title: it.title, type: it.type, project: it.project, stage: it.stage,
            duration: nextWeeksRemaining,
            weeksRemaining: nextWeeksRemaining,
            outcome: null, carryTo: null, blockedReason: "",
            carriedFrom: weekLabel,
            _carrySourceKey: `${myWeekStart}:slot:${idx}`,
          },
        });
      });
      const bufferTarget = normalizeWeek(p.bufferCarryTo);
      if ((p.bufferOutcome === "carry" || p.bufferOutcome === "done_carry") && bufferTarget && (p.buffer || "").trim() && bufferTarget !== myWeekStart) {
        carries.push({
          targetWeek: bufferTarget,
          sourceKey: `${myWeekStart}:buffer`,
          newItem: {
            title: p.buffer, type: p.bufferType || "", project: p.bufferProject || "", stage: p.bufferStage || "",
            duration: p.bufferDuration || 1,
            weeksRemaining: p.bufferDuration || 1,
            outcome: null, carryTo: null, blockedReason: "",
            carriedFrom: weekLabel,
            _carrySourceKey: `${myWeekStart}:buffer`,
          },
        });
      }

      // 2. Group by target week and apply in one pass per target.
      const byTarget = new Map();
      for (const c of carries) {
        if (!byTarget.has(c.targetWeek)) byTarget.set(c.targetWeek, []);
        byTarget.get(c.targetWeek).push(c);
      }

      for (const [targetWeek, group] of byTarget) {
        let targetIdx = next.findIndex((entry, ei) =>
          entry.person === p.person && ei !== activePerson &&
          normalizeWeek(entry.weekStart) === targetWeek
        );
        if (targetIdx !== -1 && next[targetIdx].closedAt) {
          console.warn("[Flow] Carry target week is closed; dropping carries", group.map(g => g.sourceKey));
          continue;
        }
        let target;
        if (targetIdx === -1) {
          target = makeCarriedWeekRow(p.person, targetWeek, group[0].newItem);
          for (let gi = 1; gi < group.length; gi++) {
            const { newItem, sourceKey } = group[gi];
            if (alreadyCarriedByKey(target, sourceKey)) continue;
            const items = target.items || [];
            const emptyIdx = items.findIndex(t => !(t && (t.title || "").trim()));
            if (emptyIdx !== -1 && emptyIdx < 3) {
              items[emptyIdx] = newItem;
            } else if (!(target.buffer || "").trim()) {
              target.buffer = newItem.title;
              target.bufferProject = newItem.project;
              target.bufferStage = newItem.stage;
              target.bufferType = newItem.type;
              target.bufferDuration = newItem.duration;
            } else {
              console.warn("[Flow] Carry target week is full; dropping", sourceKey);
            }
          }
          next.push(target);
        } else {
          target = { ...next[targetIdx], items: [...(next[targetIdx].items || [])] };
          for (const { newItem, sourceKey } of group) {
            if (alreadyCarriedByKey(target, sourceKey)) continue;
            const emptyIdx = target.items.findIndex(t => !(t && (t.title || "").trim()));
            if (emptyIdx !== -1 && emptyIdx < 3) {
              target.items[emptyIdx] = newItem;
            } else if (!(target.buffer || "").trim()) {
              target.buffer = newItem.title;
              target.bufferProject = newItem.project;
              target.bufferStage = newItem.stage;
              target.bufferType = newItem.type;
              target.bufferDuration = newItem.duration;
            } else {
              console.warn("[Flow] Carry target week is full; dropping", sourceKey);
            }
          }
          next[targetIdx] = target;
        }
      }

      p.closedAt = new Date().toISOString();
      p.closedAtDate = toLocalISODate(new Date());
      next[activePerson] = p; return next;
    });
    justClosedRef.current = true;
    setTimeout(async () => {
      setClosingMode(false);
      if (onSave) { try { await onSave(); } catch (_) {} }
      goBackToList();
    }, 0);
  };
  const handleUnlock = () => {
    if (!canUnlock || isClosed || isHistorical) return;
    setCommitments(prev => {
      const next = [...prev];
      const p = { ...next[activePerson] };
      p.lockedAt = null;
      p.lockedAtTime = null;
      // Clear any closing-phase state so the reopened plan is a clean slate.
      p.items = (p.items || []).map(it => ({ ...it, outcome: null, carryTo: null, blockedReason: "" }));
      p.bufferOutcome = null;
      p.bufferCarryTo = null;
      p.bufferBlockedReason = "";
      next[activePerson] = p;
      return next;
    });
    if (setIsLocked) setIsLocked(false);
    setClosingMode(false);
  };

  // ── Keyboard: detail view ──
  useKeyboard(person ? [
    { key: "Escape", fn: () => { if (depriModal) { setDepriModal(null); setDepriText(""); } else if (blockedModal) { setBlockedModal(null); setBlockedText(""); } else if (confirmAction) { setConfirmAction(null); } else if (lockSuccess) { setLockSuccess(false); } else if (closingModeRef.current) { setClosingMode(false); } else if (reviewMode) { setReviewMode(false); } else goBackToList(); }, force: true },
    { key: "l", fn: () => { if (phase === "planning" && canLock) setConfirmAction("lock"); } },
    { key: "u", fn: () => { if (isLocked && !closingMode && canUnlock) setConfirmAction("unlock"); } },
    { key: "c", fn: () => { if (phase === "locked" && !isClosed) setClosingMode(true); } },
    { key: "ArrowUp", fn: () => setDetailFocus(i => Math.max(0, i - 1)) },
    { key: "ArrowDown", fn: () => setDetailFocus(i => Math.min(person.items.length - 1, i + 1)) },
  ] : [], [activePerson, isLocked, isClosed, filledSlots, person?.items?.length, closingMode, phase, reviewMode, allSlotsFilled, lockSuccess]);

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

  // ═══ LOADING / ERROR STATES ═══
  if (loading && commitments.length === 0) {
    return (
      <div ref={devRef} style={{ padding: space[8], textAlign: "center", background: c.surface, border: `1px solid ${c.border}`, borderRadius: layout.radiusLg, boxShadow: c.shadowCard, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.textDim }}>Loading commitments…</div>
    );
  }
  if (error) {
    return (
      <div ref={devRef} style={{ padding: space[6], background: c.surface, border: `1px solid ${c.red}40`, borderLeft: `3px solid ${c.red}`, borderRadius: layout.radiusLg, boxShadow: c.shadowCard, fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, color: c.text }}>
        <div style={{ fontWeight: 600, color: c.red, marginBottom: space[2] }}>Couldn't load commitments</div>
        <div style={{ color: c.textMid, fontSize: typo.bodySm.size }}>{String(error?.message || error)}</div>
      </div>
    );
  }

  // ═══ PEOPLE QUEUE (list view) ═══
  if (!person) {
    const total = filtered.length;
    const closed = filtered.filter(cm => !!cm.closedAt).length;
    const locked = filtered.filter(cm => !!cm.lockedAt && !cm.closedAt).length;
    const isSlotComplete = (it) => (it.title || "").trim() && it.project && it.stage && it.type;
    const isBufferComplete = (cm) => cm.deselected >= 0 && (cm.buffer || "").trim() && cm.bufferProject && cm.bufferStage && cm.bufferType;
    // A person counts as Ready if either all 3 slots are complete, or they
    // deprioritized one slot and have filled the replacement buffer + the other 2 slots.
    const isReady = (cm) => {
      if (cm.lockedAt || cm.closedAt) return false;
      const completeSlots = cm.items.slice(0, 3).filter((it, i) => cm.deselected !== i && isSlotComplete(it)).length;
      if (cm.deselected >= 0) return completeSlots >= 2 && isBufferComplete(cm);
      return completeSlots >= 3;
    };
    const filled = filtered.filter(isReady).length;
    const partial = filtered.filter(cm => {
      if (cm.lockedAt || cm.closedAt) return false;
      if (isReady(cm)) return false;
      const anyTitle = cm.items.slice(0, 3).some(it => (it.title || "").trim());
      return anyTitle || (cm.deselected >= 0 && (cm.buffer || "").trim());
    }).length;
    const empty = Math.max(0, total - closed - locked - filled - partial);
    const pctLocked = total > 0 ? Math.round((locked / total) * 100) : 0;

    // Total commits (first 3 items per person)
    const totalCommitments = filtered.reduce((sum, cm) =>
      sum + cm.items.slice(0, 3).filter(it => (it.title || "").trim()).length, 0
    );
    // Commitments from locked or closed people — used by the "Commitments Locked"
    // card (mirrors Pulse's `lockedCount`).
    const lockedCommitments = filtered
      .filter(cm => !!cm.lockedAt || !!cm.closedAt)
      .reduce((sum, cm) => sum + cm.items.slice(0, 3).filter((it, idx) => (it.title || "").trim() && cm.deselected !== idx).length, 0);

    // Outcome metrics — from closed people's commits only (first 3 slots + buffer)
    const closedPeople = filtered.filter(cm => !!cm.closedAt);
    const closedItems = closedPeople.flatMap(cm => {
      const items = cm.items.slice(0, 3).filter((it, idx) => (it.title || "").trim() && cm.deselected !== idx);
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
      <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        {/* ── Top strip — scrolls with the page ── */}
        <div style={{
          display: "flex", flexDirection: "column", gap: space[2],
        }}>

        {/* ═══════════════════════════════════════════════════════════
            KPI GRID — 4 purpose-built cards per design-directions.html §KPI
            Layout: 1.5fr / 1fr / 1fr / 1fr. Fourth card is the inverted
            dark health gauge showing % completed from closed weeks.
            ═══════════════════════════════════════════════════════════ */}
        <KpiGrid>
          <KpiCard
            label="Team"
            value={total}
            sub={`${total} of ${people.length} ${people.length === 1 ? "person" : "people"} this week`}
          >
            <PillRow>
              <Pill count={closed} label="Closed" color={c.textMid}
                active={filterStatus === "closed"}
                onClick={() => { setFilterStatus(filterStatus === "closed" ? null : "closed"); setRowAnimKey(k => k + 1); }} />
              <Pill count={locked} label="Locked" color={c.green}
                active={filterStatus === "locked"}
                onClick={() => { setFilterStatus(filterStatus === "locked" ? null : "locked"); setRowAnimKey(k => k + 1); }} />
              <Pill count={filled + partial + empty} label="Open" color={c.orange}
                active={filterStatus === "open"}
                onClick={() => { setFilterStatus(filterStatus === "open" ? null : "open"); setRowAnimKey(k => k + 1); }} />
            </PillRow>
          </KpiCard>
          <KpiCard
            label="Commitments Locked"
            value={lockedCommitments}
            sub={totalCommitments > 0 ? `out of ${totalCommitments} total` : "awaiting declare"}
          />
          <KpiCard
            label="Lock Rate"
            value={`${total > 0 ? Math.round(((locked + closed) / total) * 100) : 0}%`}
            sub={
              total === 0
                ? "—"
                : (locked + closed) === 0
                  ? (isHistorical ? "no locks" : "declaring")
                  : ((locked + closed) / total) >= 0.8
                    ? "on track"
                    : ((locked + closed) / total) >= 0.5
                      ? "behind pace"
                      : "at risk"
            }
            onClick={() => { setFilterStatus(filterStatus === "locked" ? null : "locked"); setRowAnimKey(k => k + 1); }}
            active={filterStatus === "locked"}
          />
          <HealthGauge
            value={(() => {
              // Person-level close progress: fraction of lockable people who
              // have actually closed. Matches the narrative of the sub copy.
              const denom = locked + closed;
              return denom > 0 ? Math.round((closedPeople.length / denom) * 100) : 0;
            })()}
            label="Completion"
            sub={(() => {
              const denom = locked + closed;
              if (denom === 0) return "no one lockable yet";
              return `${closedPeople.length} of ${denom} closed`;
            })()}
          />
        </KpiGrid>

        {/* SEARCH */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input
            ref={localSearchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setFocusIdx(0); }}
            onBlur={() => setSearchGlow(false)}
            maxLength={100}
            placeholder="Search people by name, role, or squad..."
            style={{
              width: "100%", height: 40, padding: `0 ${space[4]}px 0 38px`,
              borderRadius: layout.radiusSm,
              border: `1px solid ${searchGlow ? c.accent : c.border}`,
              background: c.surfaceAlt, color: c.text,
              fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: typo.bodyMd.weight,
              outline: "none", boxSizing: "border-box",
              boxShadow: searchGlow ? `0 0 0 3px ${c.accentDim}` : "none",
              transition: `border-color ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}`,
            }}
          />
          {/* Search icon — minimal line SVG */}
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", transition: `opacity ${motion.fast.duration} ${motion.fast.easing}, stroke ${motion.fast.duration} ${motion.fast.easing}` }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={searchGlow ? c.accent : c.textDim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10.5" cy="10.5" r="7" /><line x1="15.5" y1="15.5" x2="21" y2="21" />
          </svg>
          {/* Keycap hint */}
          {!search && <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 600,
            color: c.textDim, lineHeight: 1,
            padding: `4px 8px`, borderRadius: layout.radiusXs,
            background: `linear-gradient(180deg, ${c.surface} 0%, ${c.surfaceAlt} 100%)`,
            border: `1px solid ${c.borderMedium || c.border}`,
            boxShadow: c.shadowSm,
            pointerEvents: "none",
          }}>/</span>}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION HEADER — title (sec-head pattern)
            ═══════════════════════════════════════════════════════════ */}
        <SectionHead title="Commitments by Person" />

        </div>{/* end frozen top */}

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <div style={{ position: "relative", zIndex: 1 }}>

        {/* People table — grouped by operational status */}
        {(() => {
          // Canonical 3-state palette — matches Pulse tab. Closed=gray (archived),
          // Locked=green (committed), Open=orange (still drafting).
          const commitStatusColors = { Closed: c.textMid, Locked: c.green, Open: c.orange };
          const groupOrder = [
            { key: "Closed", label: "Closed", color: c.textMid, icon: "✓" },
            { key: "Locked", label: "Locked", color: c.green, icon: "●" },
            { key: "Open", label: "Open", color: c.orange, icon: "○" },
          ];
          // Build rows with status info. Ready / Partial / Empty all collapse
          // into "Open" — we still track the finer-grained state for sorting
          // (ready rows first inside the Open bucket), but don't show it as a
          // separate group.
          const validStagesForRow = [...commitPhases, ...shipPhases];
          const rows = filtered.map(cm => {
            const pObj = people.find(p => p.name === cm.person);
            // Mirror the detail view's readyCount: title + project + valid stage
            // + type, excluding deprioritized slots. Previously counted by title
            // alone, which disagreed with the detail's "X/3 filled" card.
            const completeCount = cm.items.slice(0, 3).filter((it, idx) =>
              cm.deselected !== idx &&
              (it.title || "").trim() &&
              it.project &&
              it.stage && validStagesForRow.includes(it.stage) &&
              it.type
            ).length;
            const anyStarted = cm.items.slice(0, 3).some((it) => (it.title || "").trim());
            const filledCount = completeCount;
            const isClosed = !!cm.closedAt;
            const isLkd = !!cm.lockedAt && !cm.closedAt;
            const status = isClosed ? "Closed" : isLkd ? "Locked" : "Open";
            // Sub-state orders rows within Open: ready → partial → empty.
            const openSub = completeCount >= 3 ? 0 : anyStarted ? 1 : 2;
            return { cm, pObj, filledCount, status, openSub, realIdx: commitments.indexOf(cm) };
          });

          // Sort within each group (Closed → Locked → Open; within Open: ready → partial → empty)
          const statusOrder = { Closed: 0, Locked: 1, Open: 2 };
          const sortRows = (arr) => [...arr].sort((a, b) => {
            let va, vb;
            if (sortCol === "person") { va = a.cm.person; vb = b.cm.person; }
            else if (sortCol === "role") { va = a.pObj?.role || ""; vb = b.pObj?.role || ""; }
            else if (sortCol === "filled") { va = a.filledCount; vb = b.filledCount; }
            else if (sortCol === "status") {
              // Primary: group order. Secondary: open-sub-state (ready → partial → empty).
              va = (statusOrder[a.status] ?? 5) * 10 + (a.status === "Open" ? a.openSub : 0);
              vb = (statusOrder[b.status] ?? 5) * 10 + (b.status === "Open" ? b.openSub : 0);
            }
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

          // Mirror the visual render order into the ref so the keyboard Enter
          // handler maps focusIdx → the correct person. Without this, Enter
          // would open filtered[focusIdx] (raw commitments order) instead of
          // the visually highlighted row.
          visibleOrderRef.current = groupedData.flatMap(g => g.rows.map(r => r.realIdx));

          let globalRowIdx = 0;

          const cellPad = `${space[2]}px ${space[3]}px`;
          const dotBorder = `1px dotted ${c.border}`;

          return (
            <TableShell minWidth={700} separate>
                  <thead>
                    <tr>
                      <Th col="squad" style={{ position: "sticky", left: 0, top: "var(--flow-sticky-top, 0px)", background: c.tableHeader || c.surfaceAlt, zIndex: 3, minWidth: 70 }}>Squad</Th>
                      <Th col="person" style={{ minWidth: 150, borderLeft: dotBorder }}>Name</Th>
                      <Th col="role" style={{ minWidth: 100, borderLeft: dotBorder }}>Role</Th>
                      <Th col="filled" style={{ minWidth: 120, textAlign: "center", borderLeft: dotBorder }}>Filled</Th>
                      <Th col="status" style={{ minWidth: 80, textAlign: "center", borderLeft: dotBorder }}>Status</Th>
                    </tr>
                  </thead>
                  <tbody key={rowAnimKey}>
                    {groupedData.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: `${space[7]}px ${space[4]}px`, color: c.textMid }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: space[3] }}>
                          <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 500, color: c.textMid }}>No one matches those filters.</div>
                          {(search || filterStatus) && (
                            <button onClick={() => { setSearch(""); setFilterStatus(null); setRowAnimKey(k => k + 1); }} style={{
                              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
                              color: c.accent, background: `${c.accent}10`, border: `1px solid ${c.accent}25`,
                              borderRadius: layout.radiusSm, padding: `${space[1]}px ${space[3]}px`, cursor: "pointer",
                            }}>Clear filters</button>
                          )}
                        </div>
                      </td></tr>
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
                            role="button"
                            tabIndex={0}
                            aria-label={`Open ${row.cm.person}'s commits`}
                            onClick={() => openPerson(row.realIdx)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPerson(row.realIdx); } }}
                            style={{
                              cursor: "pointer",
                              background: isFocused ? `${c.accent}10` : "transparent",
                              boxShadow: isFocused ? `inset 3px 0 0 ${c.accent}` : "none",
                              transition: `background ${motion.interaction.duration} ${motion.interaction.easing}, box-shadow ${motion.interaction.duration} ${motion.interaction.easing}`,
                              animation: `rowSlideIn ${motion.normal.duration} ${motion.normal.easing} both`,
                              animationDelay: `${Math.min(ri * 12, 120)}ms`,
                            }}
                          >
                            {/* Squad */}
                            <td style={{
                              padding: cellPad,
                              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                              fontWeight: 600, color: c.textMid,
                              borderBottom: dotBorder,
                              position: "sticky", left: 0, background: isFocused ? `${c.accent}10` : c.surface, zIndex: 1,
                            }}>{row.pObj?.squad || "\u2014"}</td>
                            {/* Name */}
                            <td style={{ padding: cellPad, borderBottom: dotBorder, borderLeft: dotBorder }}>
                              <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                                <span style={{
                                  fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                                  fontWeight: 600, color: c.text,
                                }}>{row.cm.person}</span>
                              </div>
                            </td>
                            {/* Role */}
                            <td style={{
                              padding: cellPad, borderBottom: dotBorder, borderLeft: dotBorder,
                              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                              fontWeight: 500, color: c.textMid, whiteSpace: "nowrap",
                            }}>{row.pObj?.role || "\u2014"}</td>
                            {/* Filled — 3-slot bars */}
                            <td style={{ padding: cellPad, textAlign: "center", borderBottom: dotBorder, borderLeft: dotBorder }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space[2] }}>
                                <div style={{ display: "flex", alignItems: "center", gap: space[1] }}>
                                  {[0, 1, 2].map(si => (
                                    <div key={si} style={{
                                      width: 14, height: 6, borderRadius: 3,
                                      background: si < row.filledCount ? sColor : (c.borderMedium || c.border),
                                      border: "none",
                                      transition: `background ${motion.fast.duration} ${motion.fast.easing}`,
                                    }} />
                                  ))}
                                </div>
                                <span style={{
                                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                                  fontWeight: typo.monoMd.weight, color: sColor,
                                  fontVariantNumeric: "tabular-nums",
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
                              padding: `${space[2]}px ${space[2]}px`,
                              background: `${group.color}06`,
                              borderBottom: `1px dotted ${c.border}`,
                              borderTop: `1px dotted ${c.border}`,
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                                <div style={{
                                  width: 6, height: 6, borderRadius: "50%",
                                  background: group.color,
                                }} />
                                <span style={{
                                  fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                                  fontWeight: 700, color: group.color, letterSpacing: "0",
                                }}>{group.label}</span>
                                <span style={{
                                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                                  fontWeight: typo.monoMd.weight, color: group.color,
                                  fontVariantNumeric: "tabular-nums",
                                }}>{group.rows.length}</span>
                              </div>
                            </td>
                          </tr>
                        ),
                        ...sectionRows,
                      ];
                    })}
                  </tbody>
            </TableShell>
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
  const weeks = [];
  for (let w = 1; w <= 4; w++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + w * 7);
    weeks.push({ value: toLocalISODate(d), label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
  }

  // Current week frame label
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${currentWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2013 ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  // Closing phase: track outcomes — only first 3 commit slots (excluding deprioritized)
  // Include every non-deprioritized locked slot, even if title is blank — a
  // race that leaves an empty slot after lock shouldn't silently drop it from
  // the resolve count (user would close a 2/3 week thinking all is done).
  // Title-required validation is enforced at lock time.
  const activeItems = person.items.slice(0, 3)
    .map((it, idx) => ({ ...it, idx }))
    .filter(it => person.deselected !== it.idx && (isLocked || (it.title || "").trim()));
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
  // An empty locked week (e.g. legacy malformed rows) has nothing to resolve —
  // do NOT let the user close an empty week. Require at least one resolvable item.
  const allDeclared = totalToResolve > 0 && fullyResolved === totalToResolve;
  const weekComplete = allDeclared;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>

      {/* ═══ HISTORICAL READ-ONLY BANNER ═══ */}
      {isHistorical && (
        <div style={{
          padding: `${space[2]}px ${space[4]}px`,
          background: c.amberDim, border: `1px solid ${c.amberBorder}`,
          borderRadius: layout.radiusSm,
          display: "flex", alignItems: "center", gap: space[2],
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="7" stroke={c.amber} strokeWidth="2" fill="none" />
            <line x1="8" y1="4" x2="8" y2="9" stroke={c.amber} strokeWidth="2" strokeLinecap="round" />
            <circle cx="8" cy="11.5" r="0.8" fill={c.amber} />
          </svg>
          <span style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 600, color: c.amber }}>
            Viewing a past week — this data is read-only.
          </span>
        </div>
      )}

      {/* ═══ DETAIL HEADER — Steel & Orange §8.2 ═══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: space[6],
        background: c.surface, border: `1px solid ${c.border}`,
        borderRadius: layout.radiusLg, position: "relative", overflow: "visible",
        boxShadow: c.shadowCard,
      }}>
        {/* Left: Avatar + Name + Role·Squad + Date */}
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div style={{
            width: 36, height: 36, borderRadius: layout.radiusSm,
            background: c.surfaceAlt, border: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: typo.monoMd.font, fontWeight: 700, fontSize: typo.displaySm.size,
            letterSpacing: typo.monoMd.tracking, color: c.text, flexShrink: 0,
          }}>{person.person.split(" ").map(w => w.charAt(0)).slice(0, 2).join("").toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{
              fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
              fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
              color: c.text, lineHeight: 1.2,
            }}>{person.person}</span>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              {personMeta && (
                <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: typo.bodySm.weight, color: c.textMid }}>
                  {personMeta.role} · {personMeta.squad}
                </span>
              )}
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                fontWeight: 600, color: c.textMid,
                padding: `1px ${space[2]}px`, borderRadius: layout.radiusXs,
                background: c.surfaceAlt, border: `1px solid ${c.border}`,
                fontVariantNumeric: "tabular-nums",
              }}>{weekLabel}</span>
            </div>
          </div>
        </div>

        {/* Right: Status + action */}
        <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            {/* Planning: auto-save indicator + overflow menu */}
            {phase === "planning" && (
              <div key="planning-cluster" style={{ display: "flex", alignItems: "center", gap: space[2], animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>
                {/* Auto-save status */}
                <span role="status" aria-live="polite" aria-atomic="true" style={{ display: "inline-flex", alignItems: "center" }}>
                  {autoSaveStatus === "pending" && (
                    <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.textDim, letterSpacing: typo.monoSm.tracking }}>Unsaved</span>
                  )}
                  {autoSaveStatus === "saved" && (
                    <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.green, letterSpacing: typo.monoSm.tracking, animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>{"\u2713"} Saved</span>
                  )}
                  {autoSaveStatus === "saving" && (
                    <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.textMid, letterSpacing: typo.monoSm.tracking, animation: `savingPulse 1400ms ${motion.normal.easing} infinite` }}>Saving...</span>
                  )}
                  {autoSaveStatus === "error" && (
                    <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.red, letterSpacing: typo.monoSm.tracking, animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>{"\u2715"} Save failed — retry</span>
                  )}
                </span>
                {/* Overflow menu */}
                <div ref={overflowRef} style={{ position: "relative" }}>
                  <button onClick={() => setOverflowOpen(o => !o)} aria-label="More actions" title="More actions" style={{
                    width: 40, height: 40, borderRadius: layout.radiusSm, border: `1px solid ${c.border}`,
                    background: overflowOpen ? c.surfaceAlt : "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: typo.monoMd.font, color: c.textMid, fontSize: typo.displaySm.size, fontWeight: 700, letterSpacing: "0.1em",
                    transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                  }}>···</button>
                  {overflowAnim.mounted && (
                    <div style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 50,
                      background: c.surfaceOverlay, border: `1px solid ${c.border}`,
                      borderRadius: layout.radiusSm, boxShadow: c.shadowOverlay,
                      minWidth: 200, padding: `${space[1]}px 0`, whiteSpace: "nowrap",
                      animation: overflowAnim.visible
                        ? `fadeScaleIn ${motion.fast.duration} ${motion.fast.easing} both`
                        : `fadeScaleOut ${motion.fast.duration} ${motion.fast.easing} both`,
                      transformOrigin: "top center",
                    }}>
                      <button onClick={() => { setOverflowOpen(false); setConfirmReset(true); }} style={{
                        width: "100%", padding: `${space[2]}px ${space[3]}px`, border: "none",
                        background: "transparent", cursor: "pointer", textAlign: "left",
                        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500,
                        color: c.red, display: "flex", alignItems: "center", gap: space[2],
                        transition: `background ${motion.interaction.duration} ${motion.interaction.easing}`,
                      }} onMouseEnter={e => e.currentTarget.style.background = `${c.red}08`}
                         onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        Reset all commits
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Locked: Locked pill with timer + Close button. Once closedAt is
                set, swap to a gray "Closed" pill and drop the Close CTA. */}
            {phase === "locked" && (
              <div key="locked-cluster" style={{ display: "flex", alignItems: "center", gap: space[2], animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: space[2],
                  padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm,
                  background: isClosed ? c.surfaceAlt : c.greenDim,
                  border: `1px solid ${isClosed ? c.border : c.greenBorder}`,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: isClosed ? c.textMid : c.green }} />
                  <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, letterSpacing: typo.monoMd.tracking, color: isClosed ? c.textMid : c.green, textTransform: "uppercase" }}>{isClosed ? "Closed" : "Locked"}</span>
                </div>
                {/* Close CTA lives in the floating action dock (bottom-right) */}
              </div>
            )}
            {/* Closing: progress bars + resolved text + Closing pill + Back button */}
            {phase === "closing" && (
              <div key="closing-cluster" style={{ display: "flex", alignItems: "center", gap: space[2], animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={totalToResolve} aria-valuenow={fullyResolved} aria-label="Commitments resolved" style={{ display: "flex", gap: space[1] }}>
                  {Array.from({ length: totalToResolve }, (_, i) => (
                    <div key={i} style={{
                      width: 20, height: 4, borderRadius: layout.radiusXs,
                      background: i < fullyResolved ? c.green : c.surfaceAlt,
                      border: `1px solid ${i < fullyResolved ? "transparent" : c.border}`,
                      transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                    }} />
                  ))}
                </div>
                <span style={{
                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                  fontWeight: typo.monoMd.weight, color: weekComplete ? c.green : c.textMid,
                  fontVariantNumeric: "tabular-nums",
                }}>{weekComplete ? "ALL RESOLVED" : `${fullyResolved}/${totalToResolve} RESOLVED`}</span>
                <div style={{
                  padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm,
                  background: c.accentDim, border: `1px solid ${c.accent}30`,
                  display: "flex", alignItems: "center", gap: space[1],
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.accent, animation: `savingPulse 1600ms ${motion.normal.easing} infinite` }} />
                  <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight, letterSpacing: typo.monoMd.tracking, color: c.accent, textTransform: "uppercase" }}>Closing</span>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => setClosingMode(false)}>Back to Locked</Btn>
              </div>
            )}
        </div>
      </div>

      {/* ═══ HERO KPI GRID — compact week summary ═══ */}
      {(() => {
        const lockedCount = readyCount;
        const lockStateLabel = isHistorical ? "Past" : isClosed ? "Closed" : phase === "locked" ? "Locked" : phase === "closing" ? "Closing" : allSlotsFilled ? "Ready" : filledSlots > 0 ? "Partial" : "Empty";
        const lockStateColor = isClosed ? c.textMid : phase === "locked" ? c.green : phase === "closing" ? c.accent : allSlotsFilled ? c.accent : c.textMid;
        const lockStateSub = isHistorical ? "read-only" : isClosed ? "week closed" : phase === "locked" ? "locked for the week" : phase === "closing" ? "closing phase" : "planning phase";
        const weekStateLabel = isHistorical ? (person?.closedAt ? "Closed" : "Past") : isClosed ? "Closed" : phase === "closing" ? (totalToResolve > 0 ? `${Math.round((fullyResolved / totalToResolve) * 100)}%` : "—") : phase === "locked" ? "In progress" : "Planning";
        const weekStateSub = isHistorical ? weekLabel : isClosed ? weekLabel : phase === "closing" ? `${fullyResolved} of ${totalToResolve} resolved` : phase === "locked" ? weekLabel : "Not yet locked";
        return (
          <KpiGrid cols="1fr 1fr 1fr">
            <KpiCard label="Commitments" value={<span style={{ fontVariantNumeric: "tabular-nums" }}>{lockedCount}/3</span>} sub="filled this week" />
            <KpiCard label="Lock State" value={<span style={{ color: lockStateColor }}>{lockStateLabel}</span>} sub={lockStateSub} />
            <KpiCard label="This Week" value={<span style={{ fontVariantNumeric: "tabular-nums" }}>{weekStateLabel}</span>} sub={weekStateSub} />
          </KpiGrid>
        );
      })()}

      {/* ═══ PLANNING PHASE — Dot Navigation + Spotlight ═══ */}
      {phase === "planning" && (() => {
        const spotItem = person.items[detailFocus];
        const spotProj = projects.find(p => p.id === spotItem?.project);
        const spotEmpty = !spotItem?.project && !(spotItem?.title || "").trim();
        const spotHasProject = !!spotItem?.project;
        const spotHasTitle = !!(spotItem?.title || "").trim();
        const slotFilled = person.items.slice(0, 3).map((it) =>
          !!it.project && !!(it.title || "").trim() && !!it.stage && allPhases.includes(it.stage) && !!it.type
        );
        const bufProj = bufferActive ? projects.find(p => p.id === person.bufferProject) : null;
        const bufferHasContent = bufferActive && (person.buffer || "").trim() && person.bufferProject && person.bufferStage && person.bufferType;
        const activeItems = person.items.slice(0, 3).filter((_, idx) => person.deselected !== idx);

        // ── Review Mode: stacked cards (Lock CTA is in the dock) ──
        if (reviewModeAnim.mounted) {
          return (
            <div style={{
              maxWidth: 640, margin: `${space[4]}px auto 0`, width: "100%",
              animation: reviewModeAnim.visible
                ? `fadeIn ${motion.normal.duration} ${motion.normal.easing} both`
                : `fadeOut ${motion.normal.duration} ${motion.normal.easing} both`,
            }}>
              {/* Review header */}
              <div style={{ textAlign: "center", marginBottom: space[4] }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: space[2], marginBottom: space[1] }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  <TelemetryLabel color={c.green} style={{ marginBottom: 0 }}>Review Your Plan</TelemetryLabel>
                </div>
                <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid }}>
                  {activeItems.length + (bufferFilled ? 1 : 0)} commits ready for <span style={{ color: c.text, fontWeight: 600 }}>{weekLabel}</span>. Review and lock when ready.
                </span>
              </div>
              {/* spacer */}
              {/* Incomplete warning */}
              {!canLock && (
                <div style={{
                  padding: `${space[3]}px ${space[3]}px`, borderRadius: layout.radiusSm,
                  background: `${c.orange}06`, border: `1px solid ${c.orange}18`, borderLeft: `3px solid ${c.orange}`,
                  marginBottom: space[3],
                }}>
                  <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.orange }}>Some commits are incomplete. Click a card to finish editing.</span>
                </div>
              )}
              {/* Stacked review cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                {person.items.slice(0, 3).map((item, idx) => {
                  const projObj = projects.find(p => p.id === item.project);
                  const stageColor = pc[item.stage] || c.textDim;
                  const tCfg = tc[item.type] || {};
                  if (person.deselected === idx) {
                    return (
                      <div key={idx} style={{
                        background: c.surface, border: `1px solid ${c.border}`,
                        borderRadius: layout.radiusLg, padding: space[6],
                        display: "flex", flexDirection: "column", gap: space[3],
                        opacity: 0.78,
                        animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                        animationDelay: `${idx * 50}ms`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: layout.radiusSm,
                            background: `${c.red}08`, border: `1px solid ${c.red}18`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.textMid,
                          }}>{idx + 1}</div>
                          {projObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: c.textMid }}>{projObj.id}</span>}
                          {projObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.textMid }}>{projObj.name}</span>}
                        </div>
                        <div style={{ marginLeft: space[7], marginRight: space[3], height: 1, background: c.border }} />
                        {item.title && <div style={{ fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight, color: c.textMid, lineHeight: typo.bodyXl.lineHeight, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>{item.title}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: space[2], paddingLeft: space[7], marginTop: space[1] }}>
                          <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red, flex: 1 }}>
                            {person.depriReason ? `Reason: ${person.depriReason}` : ""}
                          </span>
                          <Badge color={c.red} bg={`${c.red}08`} style={{ border: `1px solid ${c.red}20`, flexShrink: 0 }}>Deprioritized</Badge>
                          {!isHistorical && !isClosed && (
                            <button className="flow-press" onClick={restoreSlot} style={{
                              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
                              color: c.accent, cursor: "pointer", background: `${c.accent}08`,
                              border: `1px solid ${c.accent}20`, borderRadius: layout.radiusSm,
                              padding: `${space[1]}px ${space[3]}px`, flexShrink: 0,
                              transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${c.accent}15`; e.currentTarget.style.borderColor = `${c.accent}40`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${c.accent}08`; e.currentTarget.style.borderColor = `${c.accent}20`; }}>Restore</button>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} role="button" tabIndex={0} className="flow-focus-ring flow-press"
                      aria-label={`Edit commit ${idx + 1}${projObj ? ` — ${projObj.name}` : ""}`}
                      onClick={() => { setReviewMode(false); setDetailFocus(idx); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReviewMode(false); setDetailFocus(idx); } }}
                      style={{
                      background: c.surface, border: `1px solid ${c.border}`,
                      borderRadius: layout.radiusLg, padding: space[6],
                      display: "flex", flexDirection: "column", gap: space[3],
                      cursor: "pointer",
                      boxShadow: c.shadowCard,
                      animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                      animationDelay: `${idx * 50}ms`,
                      transition: `border-color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}`,
                    }} onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.accent}40`; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = c.shadowElevated; }}
                       onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = c.shadowCard; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: layout.radiusSm,
                          background: `${c.green}10`, border: `1px solid ${c.green}20`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.green,
                        }}>{idx + 1}</div>
                        {projObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: entityColors().project }}>{projObj.id}</span>}
                        {projObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{projObj.name}</span>}
                        {!bufferActive && !isHistorical && !isClosed && (item.title || "").trim() && (
                          <button className="flow-press"
                            onClick={(e) => { e.stopPropagation(); setDepriModal({ idx }); setDepriText(""); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
                            title="Deprioritize this slot and open a buffer replacement"
                            style={{
                              marginLeft: "auto", cursor: "pointer", border: `1px solid ${c.orange}35`,
                              background: `${c.orange}0C`, borderRadius: layout.radiusSm,
                              padding: `${space[1]}px ${space[3]}px`,
                              fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                              letterSpacing: typo.monoSm.tracking, color: c.orange,
                              transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${c.orange}1A`; e.currentTarget.style.borderColor = `${c.orange}60`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${c.orange}0C`; e.currentTarget.style.borderColor = `${c.orange}35`; }}
                          >Deprioritize</button>
                        )}
                      </div>
                      <div style={{ marginLeft: space[7], marginRight: space[3], height: 1, background: c.border }} />
                      <div style={{ fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight, color: c.text, lineHeight: typo.bodyXl.lineHeight, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>{item.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: space[1], flexWrap: "wrap", paddingLeft: space[7] }}>
                        {tc[item.type] && <Badge color={tCfg.color} bg={tCfg.bg} style={{ border: `1px solid ${tCfg.color}15` }}>{tCfg.label}</Badge>}
                        {item.stage && <Badge color={stageColor} bg={stageColor + "10"} style={{ border: `1px solid ${stageColor}15` }}>{item.stage}</Badge>}
                        <span style={{ marginLeft: "auto", fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.textMid, padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>{item.duration || 1}w</span>
                      </div>
                    </div>
                  );
                })}
                {/* Buffer review card */}
                {bufferActive && bufferFilled && (() => {
                  const bProj = projects.find(p => p.id === person.bufferProject);
                  const bStageColor = pc[person.bufferStage] || c.textDim;
                  const bTCfg = tc[person.bufferType] || {};
                  return (
                    <div role="button" tabIndex={0}
                      aria-label={`Edit buffer commit${bProj ? ` — ${bProj.name}` : ""}`}
                      onClick={() => { setReviewMode(false); setDetailFocus(3); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setReviewMode(false); setDetailFocus(3); } }}
                      style={{
                      background: c.surface, border: `1px solid ${c.cyan}20`,
                      borderRadius: layout.radiusLg, padding: space[6],
                      display: "flex", flexDirection: "column", gap: space[3],
                      cursor: "pointer", transition: `border-color ${motion.fast.duration} ${motion.fast.easing}`,
                    }} onMouseEnter={e => e.currentTarget.style.borderColor = `${c.cyan}40`}
                       onMouseLeave={e => e.currentTarget.style.borderColor = `${c.cyan}20`}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: layout.radiusSm,
                          background: `${c.cyan}10`, border: `1px solid ${c.cyan}20`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.cyan,
                        }}>B</div>
                        {bProj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: entityColors().project }}>{bProj.id}</span>}
                        {bProj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{bProj.name}</span>}
                      </div>
                      <div style={{ marginLeft: space[7], marginRight: space[3], height: 1, background: c.border }} />
                      <div style={{ fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight, color: c.text, lineHeight: typo.bodyXl.lineHeight, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>{person.buffer}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: space[1], flexWrap: "wrap", paddingLeft: space[7] }}>
                        {person.bufferType && <Badge color={bTCfg.color || c.textDim} bg={bTCfg.bg || c.surfaceAlt} style={{ border: `1px solid ${(bTCfg.color || c.textDim)}15` }}>{bTCfg.label || person.bufferType}</Badge>}
                        {person.bufferStage && <Badge color={bStageColor} bg={bStageColor + "10"} style={{ border: `1px solid ${bStageColor}15` }}>{person.bufferStage}</Badge>}
                        <Badge color={c.cyan} bg={`${c.cyan}10`} style={{ border: `1px solid ${c.cyan}15` }}>Buffer</Badge>
                        <span style={{ marginLeft: "auto", fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.textMid, padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>{person.bufferDuration || 1}w</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* Edit hint — stays inline under the cards */}
              <div style={{ textAlign: "center", marginTop: space[5] }}>
                <span style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, color: c.textMid }}>Click any commit above to edit</span>
              </div>
            </div>
          );
        }

        return (
          <>
            <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
              <SectionHead title="Plan This Week" />
            </div>
            {/* ── Slot picker — numbered buttons for quick jumping ── */}
            <div style={{ maxWidth: 640, margin: `0 auto ${space[4]}px`, width: "100%", display: "flex", alignItems: "center", gap: space[3] }}>
              <div role="tablist" aria-label="Commit slots" style={{ display: "flex", gap: space[1], flex: 1 }}>
                {[0, 1, 2].map((di) => {
                  const filled = slotFilled[di];
                  const active = di === detailFocus;
                  const depri = person.deselected === di;
                  // Semantic color encodes state (depri=red, filled=green, empty=neutral).
                  // Active state uses a heavier accent border + inner ring — it does NOT
                  // override the fill color, so a selected filled slot still reads as filled.
                  const stateColor = depri ? c.red : filled ? c.green : c.textDim;
                  const baseBg = depri ? `${c.red}08` : filled ? `${c.green}08` : c.surfaceAlt;
                  const baseBorder = depri ? `${c.red}25` : filled ? `${c.green}25` : c.border;
                  return (
                    <button
                      key={di}
                      role="tab"
                      aria-selected={active}
                      aria-label={`Commit ${di + 1}${depri ? " (deprioritized)" : filled ? " (filled)" : " (empty)"}`}
                      onClick={() => setDetailFocus(di)}
                      className="flow-press flow-focus-ring"
                      style={{
                        flex: 1, height: 32, padding: `0 ${space[3]}px`,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: space[1] + 2,
                        borderRadius: layout.radiusSm, cursor: "pointer",
                        background: baseBg,
                        border: `1px solid ${active ? c.accent : baseBorder}`,
                        boxShadow: active ? `inset 0 0 0 1px ${c.accent}40` : "none",
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                        fontWeight: active ? 800 : 700, letterSpacing: typo.monoSm.tracking,
                        color: stateColor,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, box-shadow ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = `${stateColor}60`; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = baseBorder; } }}
                    >
                      <span style={{ opacity: 0.8 }}>{di + 1}</span>
                      {/* Status dot — green=filled, red=depri, hollow=empty */}
                      <span aria-hidden style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: depri ? c.red : filled ? c.green : "transparent",
                        border: `1px solid ${depri ? c.red : filled ? c.green : c.border}`,
                        flexShrink: 0,
                      }} />
                    </button>
                  );
                })}
              </div>
              {/* Counter */}
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                letterSpacing: typo.monoSm.tracking,
                color: allSlotsFilled ? c.green : c.textDim,
              }}>{slotFilled.filter(Boolean).length} / 3</span>
              {/* Buffer indicator */}
              {bufferActive && (
                <div
                  role="button"
                  tabIndex={0}
                  className="flow-focus-ring"
                  aria-label="Go to buffer slot"
                  aria-current={detailFocus === 3 ? "step" : undefined}
                  onClick={() => setDetailFocus(3)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailFocus(3); } }}
                  onMouseEnter={e => { if (detailFocus !== 3) { e.currentTarget.style.background = `${c.purple}10`; e.currentTarget.style.borderColor = c.purple + "60"; } }}
                  onMouseLeave={e => { if (detailFocus !== 3) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = c.purple + "30"; } }}
                  style={{
                  width: 18, height: 18, borderRadius: layout.radiusXs, cursor: "pointer",
                  background: detailFocus === 3 ? `${c.purple}20` : "transparent",
                  border: `1.5px solid ${detailFocus === 3 ? c.purple : c.purple + "30"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.purple,
                  transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                }}>B</div>
              )}
            </div>

            {/* ── Deprioritized slot — same layout as regular card, dimmed ── */}
            {detailFocus <= 2 && person.deselected === detailFocus && (() => {
              const depriItem = spotItem;
              const depriProj = projects.find(p => p.id === depriItem?.project);
              return (
                <div style={{
                  maxWidth: 640, margin: "0 auto", width: "100%",
                  background: c.surface, border: `1px solid ${c.border}`,
                  borderRadius: layout.radiusLg, padding: space[6],
                  display: "flex", flexDirection: "column", gap: space[3],
                  opacity: 0.78,
                  animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: layout.radiusSm,
                      background: `${c.red}08`, border: `1px solid ${c.red}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.textMid,
                    }}>{detailFocus + 1}</div>
                    {depriProj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: c.textMid }}>{depriProj.id}</span>}
                    {depriProj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.textMid }}>{depriProj.name}</span>}
                  </div>
                  <div style={{ marginLeft: space[7], marginRight: space[3], height: 1, background: c.border }} />
                  <div style={{ fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight, color: c.textMid, lineHeight: typo.bodyXl.lineHeight, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>{depriItem?.title}</div>
                  {person.depriReason && (
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, paddingLeft: space[7] }}>
                      <span style={{ color: c.red, fontWeight: 600 }}>Reason:</span> {person.depriReason}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: space[7], marginTop: space[1] }}>
                    <Badge color={c.red} bg={`${c.red}08`} style={{ border: `1px solid ${c.red}20` }}>Deprioritized</Badge>
                    {!isHistorical && !isClosed && (
                      <button className="flow-press" onClick={restoreSlot} style={{
                        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
                        color: c.accent, cursor: "pointer", background: `${c.accent}08`,
                        border: `1px solid ${c.accent}20`, borderRadius: layout.radiusSm,
                        padding: `${space[1]}px ${space[3]}px`,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.instant.duration} ${motion.instant.easing}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${c.accent}15`; e.currentTarget.style.borderColor = `${c.accent}40`; }}
                         onMouseLeave={e => { e.currentTarget.style.background = `${c.accent}08`; e.currentTarget.style.borderColor = `${c.accent}20`; }}>Restore</button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Buffer form (planning phase, after deprioritize) ── */}
            {detailFocus === 3 && bufferActive && (
              <div style={{
                maxWidth: 640, margin: "0 auto", width: "100%",
                background: !bufferHasContent ? `${c.purple}08` : c.surface,
                border: !bufferHasContent ? `1.5px dashed ${c.purple}20` : `1px solid ${c.border}`,
                borderRadius: layout.radiusLg, padding: space[6],
                display: "flex", flexDirection: "column", gap: space[4],
                animation: `fadeScaleIn ${motion.normal.duration} ${motion.normal.easing} both`,
                transformOrigin: "top center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <div aria-label="Buffer" title="Buffer commit" style={{ width: 32, height: 32, borderRadius: layout.radiusMd, background: `${c.purple}10`, border: `1px solid ${c.purple}25`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: c.purple, flexShrink: 0 }}>B</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size, fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking, color: bufProj ? c.text : c.textMid }}>{bufProj ? bufProj.name : "Buffer Commit"}</div>
                    <div style={{ fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size, color: c.textMid, marginTop: space[1] }}>{bufProj ? `${bufProj.id} · Replacing #${person.deselected + 1}` : `Replacing commit #${person.deselected + 1} — pick a project to start`}</div>
                  </div>
                  {!!person.bufferProject && (
                    <div style={{ display: "flex", gap: space[1], background: c.surfaceAlt, borderRadius: layout.radiusSm, padding: space[1], border: `1px solid ${c.border}`, flexShrink: 0 }}>
                      {["BUILD", "JAM"].map(t => {
                        const cfg = tc[t] || {};
                        const active = person.bufferType === t;
                        return (
                          <button key={t} onClick={() => updatePerson("bufferType", t)} style={{
                            fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: typo.monoMd.weight,
                            letterSpacing: "0.05em", padding: `${space[1]}px ${space[3]}px`,
                            borderRadius: layout.radiusXs, border: "none", cursor: "pointer",
                            background: active ? `${cfg.color || c.accent}18` : "transparent",
                            color: active ? (cfg.color || c.accent) : c.textDim,
                            transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
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
                  <div style={{ animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>What are you delivering this week?</div>
                    <TextArea value={person.buffer || ""} onChange={e => updatePerson("buffer", e.target.value)} placeholder="Describe what you'll deliver" rows={3} maxLength={280} />
                  </div>
                )}
                {!!person.bufferProject && !!(person.buffer || "").trim() && (
                  <div style={{ display: "flex", gap: space[4], animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Stage</div>
                      <ChoiceGroup options={commitPhases.map(s => ({ value: s, label: s, color: pc[s] || c.textDim }))} value={person.bufferStage} onChange={val => updatePerson("bufferStage", val)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600, color: c.text, marginBottom: space[1] }}>Estimated timeline</div>
                      <ChoiceGroup mono options={[1, 2, 3, 4].map(w => ({ value: w, label: `${w}w` }))} value={person.bufferDuration || 1} onChange={val => updatePerson("bufferDuration", val)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Spotlight Card — immersive editing surface ── */}
            {detailFocus <= 2 && person.deselected !== detailFocus && (
              <div key={detailFocus} style={{
                maxWidth: 640, margin: "0 auto", width: "100%",
                display: "flex", flexDirection: "column", gap: space[5],
                animation: `${slotDir === "right" ? "slotSlideInRight" : "slotSlideInLeft"} ${motion.normal.duration} ${motion.normal.easing} both`,
              }}>
                {/* ── Top line: large number + project name ── */}
                <div style={{ display: "flex", alignItems: "baseline", gap: space[3] }}>
                  <span style={{
                    fontFamily: typo.displayHero.font, fontSize: typo.displayHero.size, fontWeight: typo.displayHero.weight,
                    letterSpacing: typo.displayHero.tracking, color: c.textGhost, lineHeight: 1,
                  }}>{detailFocus + 1}</span>
                  <div style={{
                    fontFamily: typo.displayLg.font, fontSize: typo.displayLg.size,
                    fontWeight: typo.displayLg.weight, letterSpacing: typo.displayLg.tracking,
                    color: spotProj ? c.text : c.textDim, lineHeight: 1.2, flex: 1,
                  }}>{spotProj ? spotProj.name : "Select a project"}</div>
                </div>

                {/* ── Divider ── */}
                <div style={{ height: 1, background: c.border }} />

                {/* ── Project search ── */}
                <div>
                  <div style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                    letterSpacing: typo.monoSm.tracking, textTransform: "uppercase",
                    color: c.textDim, marginBottom: space[2],
                  }}>Project</div>
                  <ProjectSearchSelect
                    projects={projects}
                    value={spotItem.project}
                    onChange={val => updateItem(detailFocus, "project", val)}
                    placeholder="Search by name or ID (e.g. X21)..."
                  />
                </div>

                {/* ── Deliverable ── */}
                {spotHasProject && (
                  <div style={{ animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both`, animationDelay: "0ms" }}>
                    <div style={{
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                      letterSpacing: typo.monoSm.tracking, textTransform: "uppercase",
                      color: c.textDim, marginBottom: space[2],
                    }}>Deliverable</div>
                    <TextArea
                      value={spotItem.title}
                      onChange={e => updateItem(detailFocus, "title", e.target.value)}
                      placeholder="What will you ship this week?"
                      rows={2}
                      maxLength={280}
                    />
                  </div>
                )}

                {/* ── Type · Stage · Timeline — unified row ── */}
                {spotHasProject && spotHasTitle && (
                  <div style={{
                    display: "flex", alignItems: "flex-end", gap: space[2], flexWrap: "wrap", rowGap: space[3],
                    padding: `${space[3]}px ${space[4]}px`,
                    background: c.surfaceAlt, borderRadius: layout.radiusMd,
                    border: `1px solid ${c.border}`,
                    animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both`,
                    animationDelay: "60ms",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: c.textMid, marginBottom: space[1],
                      }}>Type</div>
                      <ChoiceGroup options={["BUILD", "JAM"].map(t => {
                        const cfg = tc[t] || {};
                        return { value: t, label: cfg.label || t, color: cfg.color || c.accent };
                      })} value={spotItem.type} onChange={val => updateItem(detailFocus, "type", val)} />
                    </div>
                    <div style={{ width: 1, height: 28, background: c.border, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: c.textMid, marginBottom: space[1],
                      }}>Stage</div>
                      <ChoiceGroup options={commitPhases.map(s => ({ value: s, label: s, color: pc[s] || c.textDim }))} value={spotItem.stage} onChange={val => updateItem(detailFocus, "stage", val)} />
                    </div>
                    <div style={{ width: 1, height: 28, background: c.border, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        color: c.textMid, marginBottom: space[1],
                      }}>Timeline</div>
                      <ChoiceGroup mono options={[1, 2, 3, 4].map(w => ({ value: w, label: `${w}w` }))} value={spotItem.duration || 1} onChange={val => updateItem(detailFocus, "duration", val)} />
                    </div>
                  </div>
                )}

                {/* Next / Review Plan CTA lives in the floating action dock */}

              </div>
            )}

          </>
        );
      })()}

      {/* ═══ LOCKED PHASE — all 3 cards stacked + buffer ═══ */}
      {phase === "locked" && (() => {
        const bufferHasContent = bufferActive && (person.buffer || "").trim() && person.bufferProject && person.bufferStage && person.bufferType;
        const showBufferForm = bufferActive;
        const bufProj = projects.find(p => p.id === person.bufferProject);

        return (
        <>
          <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
            <SectionHead title="This Week's Commitments" />
          </div>
          {/* ── All cards stacked ── */}
          <div style={{ maxWidth: 640, margin: `0 auto`, width: "100%", display: "flex", flexDirection: "column", gap: space[3] }}>
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
                  borderRadius: layout.radiusLg, padding: space[6],
                  display: "flex", flexDirection: "column", gap: space[3],
                  opacity: 0.78,
                  animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                  animationDelay: `${idx * 50}ms`,
                }}>
                  {/* Header — badge + ID + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: layout.radiusSm,
                      background: `${c.red}08`, border: `1px solid ${c.red}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.textMid,
                    }}>{idx + 1}</div>
                    {projObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: c.textMid }}>{projObj.id}</span>}
                    {projObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.textMid }}>{projObj.name}</span>}
                  </div>
                  <div style={{ marginLeft: space[7], marginRight: space[3], height: 1, background: c.border }} />
                  {/* Deliverable */}
                  <div style={{ fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight, color: c.textMid, lineHeight: typo.bodyXl.lineHeight, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>{item.title}</div>
                  {/* Reason */}
                  {/* Reason + Deprioritized + Restore — all one line */}
                  <div style={{ display: "flex", alignItems: "center", gap: space[2], paddingLeft: space[7], marginTop: space[1] }}>
                    <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.red, flex: 1 }}>
                      {person.depriReason ? `Reason: ${person.depriReason}` : ""}
                    </span>
                    <Badge color={c.red} bg={`${c.red}08`} style={{ border: `1px solid ${c.red}20`, flexShrink: 0 }}>Deprioritized</Badge>
                    {!isHistorical && !isClosed && (
                      <button className="flow-press" onClick={restoreSlot} style={{
                        fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 600,
                        color: c.accent, cursor: "pointer", background: `${c.accent}08`,
                        border: `1px solid ${c.accent}20`, borderRadius: layout.radiusSm,
                        padding: `${space[1]}px ${space[3]}px`, flexShrink: 0,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.instant.duration} ${motion.instant.easing}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${c.accent}15`; e.currentTarget.style.borderColor = `${c.accent}40`; }}
                         onMouseLeave={e => { e.currentTarget.style.background = `${c.accent}08`; e.currentTarget.style.borderColor = `${c.accent}20`; }}>Restore</button>
                    )}
                  </div>
                </div>
              );
            }

            // ── Outcome styling (closed weeks only) ──
            // Surfaces final outcomes on archived cards: tinted slot chip,
            // outcome badge, carry-to date, and blocker reason. No
            // strikethrough — this is a record, not a crossed-off todo.
            const outcome = isClosed ? item.outcome : null;
            const outcomeColor = outcome === "done" || outcome === "done_carry" ? c.green
              : outcome === "blocked" ? c.red
              : outcome === "carry" ? c.cyan
              : outcome === "partial" ? c.orange
              : null;
            const outcomeIcon = outcome === "done" || outcome === "done_carry" ? "\u2713"
              : outcome === "carry" ? "\u2192"
              : outcome === "blocked" ? "!"
              : outcome === "partial" ? "\u00BD"
              : null;
            // Format carryTo ISO date → "Apr 27"
            const carryToLabel = item.carryTo
              ? (() => { try { const d = new Date(item.carryTo + "T00:00:00"); return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return null; } })()
              : null;
            const cardBorder = outcomeColor ? `${outcomeColor}25` : c.border;
            const cardBg = outcomeColor ? `${outcomeColor}08` : c.surface;

            return (
              <div key={idx} style={{
                background: cardBg, border: `1px solid ${cardBorder}`,
                borderRadius: layout.radiusLg, padding: space[6],
                display: "flex", flexDirection: "column", gap: space[3],
                animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                animationDelay: `${idx * 50}ms`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: layout.radiusSm,
                    background: outcomeColor ? `${outcomeColor}15` : `${entityColors().project}10`,
                    border: `1px solid ${outcomeColor ? outcomeColor + "25" : entityColors().project + "20"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800,
                    color: outcomeColor || entityColors().project,
                  }}>{outcomeIcon || (idx + 1)}</div>
                  {projObj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: entityColors().project }}>{projObj.id}</span>}
                  {projObj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{projObj.name}</span>}
                  {outcome && (
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: space[1], flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {outcome === "done" && (
                        <Badge color={c.green} bg={`${c.green}12`} style={{ border: `1px solid ${c.green}25` }}>Completed</Badge>
                      )}
                      {outcome === "done_carry" && (
                        <>
                          <Badge color={c.green} bg={`${c.green}12`} style={{ border: `1px solid ${c.green}25` }}>Completed</Badge>
                          {carryToLabel && <Badge color={c.amber || c.orange} bg={`${c.amber || c.orange}12`} style={{ border: `1px solid ${(c.amber || c.orange)}25` }}>Continues {carryToLabel}</Badge>}
                        </>
                      )}
                      {outcome === "carry" && (
                        <Badge color={c.cyan} bg={`${c.cyan}12`} style={{ border: `1px solid ${c.cyan}25` }}>{carryToLabel ? `Carry \u2192 ${carryToLabel}` : "Carry"}</Badge>
                      )}
                      {outcome === "blocked" && (
                        <Badge color={c.red} bg={`${c.red}12`} style={{ border: `1px solid ${c.red}25` }}>Blocked</Badge>
                      )}
                      {outcome === "partial" && (
                        <Badge color={c.orange} bg={`${c.orange}12`} style={{ border: `1px solid ${c.orange}25` }}>Partial</Badge>
                      )}
                    </div>
                  )}
                  {!outcome && !bufferActive && !isHistorical && !isClosed && (
                    <button className="flow-press" onClick={() => { setDepriModal({ idx }); setDepriText(""); }} style={{
                      marginLeft: "auto", cursor: "pointer", border: `1px solid ${c.orange}35`,
                      background: `${c.orange}0C`, borderRadius: layout.radiusSm,
                      padding: `${space[1]}px ${space[3]}px`,
                      fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight,
                      letterSpacing: typo.monoSm.tracking, color: c.orange,
                      transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.instant.duration} ${motion.instant.easing}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${c.orange}1A`; e.currentTarget.style.borderColor = `${c.orange}60`; }}
                       onMouseLeave={e => { e.currentTarget.style.background = `${c.orange}0C`; e.currentTarget.style.borderColor = `${c.orange}35`; }}
                    >Deprioritize</button>
                  )}
                </div>
                <div style={{ marginLeft: space[7], marginRight: space[3], height: 1, background: c.border }} />
                <div style={{ fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight, color: c.text, lineHeight: typo.bodyXl.lineHeight, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>{item.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: space[1], flexWrap: "wrap", paddingLeft: space[7] }}>
                  {tc[item.type] && <Badge color={tCfg.color} bg={tCfg.bg} style={{ border: `1px solid ${tCfg.color}15` }}>{tCfg.label}</Badge>}
                  {item.stage && <Badge color={stageColor} bg={stageColor + "10"} style={{ border: `1px solid ${stageColor}15` }}>{item.stage}</Badge>}
                  <span style={{ marginLeft: "auto", fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.textMid, padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>{item.duration || 1}w</span>
                </div>
                {/* Blocker reason — mirrors the closing-phase callout */}
                {outcome === "blocked" && (item.blockedReason || "").trim() && (
                  <div style={{
                    marginLeft: space[7], padding: `${space[2]}px ${space[3]}px`,
                    borderLeft: `3px solid ${c.red}`, background: `${c.red}08`,
                    borderRadius: `0 ${layout.radiusSm}px ${layout.radiusSm}px 0`,
                  }}>
                    <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: c.red, textTransform: "uppercase", marginBottom: 2 }}>Blocker</div>
                    <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 400, color: c.textMid, lineHeight: typo.bodySm.lineHeight }}>{item.blockedReason}</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Buffer card (locked phase — read-only, same style as other cards) ── */}
          {bufferActive && bufferHasContent && (
            <div style={{
              background: c.surface, border: `1px solid ${c.border}`,
              borderRadius: layout.radiusLg, padding: space[6],
              display: "flex", flexDirection: "column", gap: space[3],
              animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
              animationDelay: "150ms",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                <div style={{
                  width: 24, height: 24, borderRadius: layout.radiusSm,
                  background: `${c.purple}10`, border: `1px solid ${c.purple}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.purple,
                }}>B</div>
                {bufProj && <span style={{ fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, fontWeight: 700, letterSpacing: typo.monoMd.tracking, color: entityColors().project }}>{bufProj.id}</span>}
                {bufProj && <span style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, color: c.text }}>{bufProj.name}</span>}
              </div>
              <div style={{ marginLeft: space[7], marginRight: space[3], height: 1, background: c.border }} />
              <div style={{ fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight, color: c.text, lineHeight: typo.bodyXl.lineHeight, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0 }}>{person.buffer}</div>
              <div style={{ display: "flex", alignItems: "center", gap: space[1], flexWrap: "wrap", paddingLeft: space[7] }}>
                {person.bufferType && (() => { const btc = tc[person.bufferType] || {}; return <Badge color={btc.color || c.textDim} bg={btc.bg || c.surfaceAlt} style={{ border: `1px solid ${(btc.color || c.textDim)}15` }}>{btc.label || person.bufferType}</Badge>; })()}
                {person.bufferStage && (() => { const sc = pc[person.bufferStage] || c.textDim; return <Badge color={sc} bg={sc + "10"} style={{ border: `1px solid ${sc}15` }}>{person.bufferStage}</Badge>; })()}
                <span style={{ marginLeft: "auto", fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, color: c.textMid, padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}` }}>{person.bufferDuration || 1}w</span>
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
      <Modal open={!!depriModal} onClose={() => { setDepriModal(null); setDepriText(""); }} title="Deprioritize this commit" width={480}>
        <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid, marginBottom: space[3] }}>
          Add a reason for deprioritization. This temporarily unlocks the week so you can fill a buffer replacement — re-lock when ready.
        </div>
        <TextArea value={depriText} onChange={e => setDepriText(e.target.value)} placeholder="E.g., priorities shifted, blocked by dependency, scope changed..." rows={3} data-autofocus />
        <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end", marginTop: space[4] }}>
          <Btn variant="ghost" size="sm" onClick={() => { setDepriModal(null); setDepriText(""); }}>Cancel</Btn>
          <Btn variant="danger" size="sm" disabled={!depriText.trim()} onClick={() => {
            deprioritizeSlot(depriModal.idx, depriText.trim());
            setDetailFocus(3);
            setDepriModal(null); setDepriText("");
          }}>Deprioritize</Btn>
        </div>
      </Modal>

      {/* ═══ CLOSING PHASE — card + extension pattern ═══ */}
      {phase === "closing" && (
        <>
          <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
            <SectionHead title="Close Out The Week" />
          </div>
          <div style={{ maxWidth: 640, margin: `0 auto`, width: "100%", display: "flex", flexDirection: "column", gap: space[3] }}>
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
            const wrapBg = outcome === "done" || outcome === "done_carry" ? `${c.green}0A` : outcome === "carry" ? `${c.cyan}0A` : outcome === "blocked" ? `${c.red}0A` : c.surface;
            const wrapBorder = outcome === "done" || outcome === "done_carry" ? `${c.green}12` : outcome === "carry" ? `${c.cyan}12` : outcome === "blocked" ? `${c.red}12` : c.border;

            return (
              <div key={idx} style={{
                borderRadius: layout.radiusLg, overflow: "hidden",
                border: `1px solid ${wrapBorder}`, background: wrapBg,
                transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                animationDelay: `${idx * 50}ms`,
              }}>
                {/* Card inner — info only */}
                <div style={{ padding: space[6], display: "flex", flexDirection: "column", gap: space[2] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
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
                      fontWeight: 600, color: c.textMid, padding: `${space[1]}px ${space[3]}px`,
                      borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}`,
                    }}>{item.weeksRemaining || item.duration || 1}w</span>
                  </div>
                  <div style={{
                    fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight,
                    color: (outcome === "done" || outcome === "done_carry") ? c.textMid : c.text,
                    lineHeight: 1.5, paddingLeft: space[7], overflowWrap: "anywhere", wordBreak: "break-word", minWidth: 0,
                    textDecoration: (outcome === "done" || outcome === "done_carry") ? "line-through" : "none",
                    textDecorationColor: (outcome === "done" || outcome === "done_carry") ? c.textMid : "transparent",
                    transition: `color ${motion.fast.duration} ${motion.fast.easing}, text-decoration-color ${motion.fast.duration} ${motion.fast.easing}`,
                  }}>{item.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: space[1], paddingLeft: space[7] }}>
                    {tc[item.type] && <Badge color={tCfg.color} bg={tCfg.bg}>{tCfg.label}</Badge>}
                    {item.stage && <Badge color={stageColor} bg={stageColor + "10"}>{item.stage}</Badge>}
                  </div>
                  {/* Blocked reason */}
                  {outcome === "blocked" && item.blockedReason && (
                    <Surface compact variant="data" style={{ borderLeft: `3px solid ${c.red}`, marginLeft: space[7], animation: `fadeIn ${motion.fast.duration} ${motion.fast.easing} both` }}>
                      <TelemetryLabel color={c.red} style={{ marginBottom: 2 }}>Blocker</TelemetryLabel>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 400, color: c.textMid, lineHeight: typo.bodySm.lineHeight }}>{item.blockedReason}</div>
                    </Surface>
                  )}
                </div>
                {/* Extension layer — outcome buttons */}
                <div style={{
                  padding: `${space[3]}px ${space[6]}px ${space[3]}px`,
                  background: c.surfaceAlt,
                  borderTop: `1px solid ${c.border}`,
                  display: "flex", flexDirection: "column", gap: space[2],
                }}>
                  <div style={{ display: "flex", gap: space[1], flexWrap: "wrap" }}>
                    {[
                      { val: "done", label: "Done", clr: c.green },
                      { val: "partial", label: "Partial", clr: c.orange },
                      { val: "carry", label: "Carry", clr: c.cyan },
                      ...(showDoneCarry ? [{ val: "done_carry", label: "Done + Carry", clr: c.orange }] : []),
                      { val: "blocked", label: "Blocked", clr: c.red },
                    ].map(btn => {
                      const active = outcome === btn.val;
                      return (
                        <button key={btn.val} className="flow-press" onClick={() => updateOutcome(idx, btn.val)} style={{
                          padding: `${space[1]}px ${space[2] + 2}px`, borderRadius: layout.radiusSm,
                          fontSize: typo.bodySm.size, fontWeight: 600, fontFamily: typo.bodySm.font,
                          border: `1px solid ${active ? btn.clr + "30" : c.border}`,
                          background: active ? `${btn.clr}10` : "transparent",
                          color: active ? btn.clr : c.textMid,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                          transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.instant.duration} ${motion.instant.easing}`,
                        }}>
                          {active && <span style={{ animation: `fadeScaleIn ${motion.fast.duration} ${motion.fast.easing} both` }}>{btn.val === "blocked" ? "!" : "\u2713"}</span>}
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Carry-to row */}
                  {(outcome === "carry" || outcome === "done_carry") && (
                    <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap", animation: `fadeScaleIn ${motion.fast.duration} ${motion.fast.easing} both`, transformOrigin: "top left" }}>
                      <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: carryColor, textTransform: "uppercase" }}>Carry to</span>
                      {weeks.map(wk => {
                        const sel = item.carryTo === wk.value;
                        return (
                          <button key={wk.value} className="flow-press" onClick={() => updateCarryTo(idx, wk.value)} style={{
                            padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm,
                            fontSize: typo.bodySm.size, fontWeight: 600, fontFamily: typo.bodySm.font,
                            border: `1px solid ${sel ? carryColor + "30" : c.border}`,
                            background: sel ? `${carryColor}10` : "transparent",
                            color: sel ? carryColor : c.textMid,
                            cursor: "pointer",
                            transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.instant.duration} ${motion.instant.easing}`,
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
            const bufWrapBg = bufOutcome === "done" || bufOutcome === "done_carry" ? `${c.green}0A` : bufOutcome === "carry" ? `${c.cyan}0A` : bufOutcome === "blocked" ? `${c.red}0A` : c.surface;
            const bufWrapBorder = bufOutcome === "done" || bufOutcome === "done_carry" ? `${c.green}12` : bufOutcome === "carry" ? `${c.cyan}12` : bufOutcome === "blocked" ? `${c.red}12` : c.border;
            const bufCarryColor = bufOutcome === "done_carry" ? c.orange : c.cyan;

            return (
              <div style={{
                borderRadius: layout.radiusLg, overflow: "hidden",
                border: `1px solid ${bufWrapBorder}`, background: bufWrapBg,
                borderLeft: `3px solid ${c.purple}`,
                transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}`,
                animation: `cardFadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
                animationDelay: "150ms",
              }}>
                <div style={{ padding: space[6], display: "flex", flexDirection: "column", gap: space[2] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
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
                      fontWeight: 600, color: c.textMid, padding: `${space[1]}px ${space[3]}px`,
                      borderRadius: layout.radiusSm, background: c.surfaceAlt, border: `1px solid ${c.border}`,
                    }}>{person.bufferDuration || 1}w</span>
                  </div>
                  <div style={{
                    fontFamily: typo.bodyXl.font, fontSize: typo.bodyXl.size, fontWeight: typo.bodyXl.weight,
                    color: (bufOutcome === "done" || bufOutcome === "done_carry") ? c.textMid : c.text,
                    lineHeight: 1.5, paddingLeft: space[7],
                    textDecoration: (bufOutcome === "done" || bufOutcome === "done_carry") ? "line-through" : "none",
                  }}>{person.buffer}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: space[1], paddingLeft: space[7] }}>
                    {person.bufferType && <Badge color={bufTCfg.color || c.textDim} bg={bufTCfg.bg || c.surfaceAlt}>{bufTCfg.label || person.bufferType}</Badge>}
                    {person.bufferStage && <Badge color={bufStageColor} bg={bufStageColor + "10"}>{person.bufferStage}</Badge>}
                  </div>
                  {bufOutcome === "blocked" && person.bufferBlockedReason && (
                    <Surface compact variant="data" style={{ borderLeft: `3px solid ${c.red}`, marginLeft: space[7] }}>
                      <TelemetryLabel color={c.red} style={{ marginBottom: 2 }}>Blocker</TelemetryLabel>
                      <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 400, color: c.textMid, lineHeight: typo.bodySm.lineHeight }}>{person.bufferBlockedReason}</div>
                    </Surface>
                  )}
                </div>
                <div style={{
                  padding: `${space[3]}px ${space[6]}px ${space[3]}px`,
                  background: c.surfaceAlt,
                  borderTop: `1px solid ${c.border}`,
                  display: "flex", flexDirection: "column", gap: space[2],
                }}>
                  <div style={{ display: "flex", gap: space[1], flexWrap: "wrap" }}>
                    {[
                      { val: "done", label: "Done", clr: c.green },
                      { val: "partial", label: "Partial", clr: c.orange },
                      { val: "done_carry", label: "Done + Carry", clr: c.orange },
                      { val: "carry", label: "Carry", clr: c.cyan },
                      { val: "blocked", label: "Blocked", clr: c.red },
                    ].map(btn => {
                      const active = bufOutcome === btn.val;
                      return (
                        <button key={btn.val} className="flow-press" onClick={() => updateBufferOutcome(btn.val)} style={{
                          padding: `${space[1]}px ${space[2] + 2}px`, borderRadius: layout.radiusSm,
                          fontSize: typo.bodySm.size, fontWeight: 600, fontFamily: typo.bodySm.font,
                          border: `1px solid ${active ? btn.clr + "30" : c.border}`,
                          background: active ? `${btn.clr}10` : "transparent",
                          color: active ? btn.clr : c.textMid,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                          transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.instant.duration} ${motion.instant.easing}`,
                        }}>
                          {active && <span style={{ animation: `fadeScaleIn ${motion.fast.duration} ${motion.fast.easing} both` }}>{btn.val === "blocked" ? "!" : "\u2713"}</span>}
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                  {(bufOutcome === "carry" || bufOutcome === "done_carry") && (
                    <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap", animation: `fadeScaleIn ${motion.fast.duration} ${motion.fast.easing} both`, transformOrigin: "top left" }}>
                      <span style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: typo.monoSm.tracking, color: bufCarryColor, textTransform: "uppercase" }}>Carry to</span>
                      {weeks.map(wk => {
                        const sel = person.bufferCarryTo === wk.value;
                        return (
                          <button key={wk.value} className="flow-press" onClick={() => updateBufferCarryTo(wk.value)} style={{
                            padding: `${space[1]}px ${space[3]}px`, borderRadius: layout.radiusSm,
                            fontSize: typo.bodySm.size, fontWeight: 600, fontFamily: typo.bodySm.font,
                            border: `1px solid ${sel ? bufCarryColor + "30" : c.border}`,
                            background: sel ? `${bufCarryColor}10` : "transparent",
                            color: sel ? bufCarryColor : c.textDim,
                            cursor: "pointer",
                            transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}, transform ${motion.instant.duration} ${motion.instant.easing}`,
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
        </>
      )}

      {/* Lock blockers removed — wizard flow prevents incomplete data. Edge cases handled in review mode. */}

      {/* ═══ CLOSE WEEK BAR ════════════════════════════════════ */}
      {phase === "closing" && (
        <Surface compact style={{
          maxWidth: 640, margin: "0 auto", width: "100%",
          background: weekComplete ? `${c.green}08` : c.surfaceAlt,
          borderLeft: `3px solid ${weekComplete ? c.green : c.border}`,
        }}>
          <div style={{ fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size, fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking, color: weekComplete ? c.green : c.textMid }}>
            {weekComplete ? "All commits resolved" : `${fullyResolved}/${totalToResolve} resolved`}
          </div>
          <div style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textDim, marginTop: 2 }}>
            {weekComplete ? "Confirm close in the action dock" : "Resolve all items to close the week"}
          </div>
        </Surface>
      )}

      {/* ═══ CONFIRMATION MODAL (Lock / Unlock) ═══════════════════ */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "lock" ? "Lock this week?" : "Unlock this week?"}
        accent={confirmAction === "lock" ? c.green : c.orange}
      >
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          {confirmAction === "lock"
            ? `You're locking ${activeItems.length + (bufferFilled ? 1 : 0)} commits for the week of ${weekLabel}. Once locked, your plan is set and visible to your team.`
            : (() => {
              const outcomeCount = (person?.items || []).slice(0, 3).filter(it => it.outcome).length + (person?.bufferOutcome ? 1 : 0);
              return outcomeCount > 0
                ? `Tasks will become editable again. This will also discard ${outcomeCount} outcome choice${outcomeCount === 1 ? "" : "s"} (done / carry / blocked) and any carry-forward plans you've recorded.`
                : "Tasks will become editable again. Any changes made will be updated in the system.";
            })()}
        </div>
        {confirmAction === "lock" && (
          <Surface compact variant="data" style={{
            display: "flex", alignItems: "flex-start", gap: space[2],
            borderLeft: `3px solid ${c.red}`, marginBottom: space[4],
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="8" cy="8" r="7" stroke={c.red} strokeWidth="2" fill="none" />
              <line x1="8" y1="4" x2="8" y2="9" stroke={c.red} strokeWidth="2" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.8" fill={c.red} />
            </svg>
            <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, fontWeight: 500, color: c.red, lineHeight: 1.5 }}>
              Once locked, your plan is visible to your team. You can deprioritize one task and add a buffer, but the 3 commits themselves are final for the week.
            </span>
          </Surface>
        )}
        {confirmAction === "lock" && (
          <div style={{
            padding: `${space[3]}px ${space[3]}px`, borderRadius: layout.radiusMd,
            background: c.surfaceAlt, border: `1px solid ${c.border}`, marginBottom: space[5],
            display: "flex", flexDirection: "column", gap: space[2],
          }}>
            <div style={{ fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: typo.monoSm.weight, letterSpacing: "0.04em", color: c.textDim, textTransform: "uppercase", marginBottom: 2 }}>Your commits</div>
            {person.items.slice(0, 3).map((it, ci) => {
              if (person.deselected === ci) return null;
              if (!(it.title || "").trim()) return null;
              const proj = projects.find(p => p.id === it.project);
              const tC = tc[it.type] || {};
              return (
                <div key={ci} style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: layout.radiusSm,
                    background: `${c.accent}08`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.accent,
                  }}>{ci + 1}</div>
                  <span style={{ fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.text, flex: 1 }}>{proj?.name || it.project}</span>
                  {it.type && <Badge color={tC.color || c.textDim} bg={tC.bg || c.surfaceAlt} style={{ marginLeft: "auto" }}>{tC.label || it.type}</Badge>}
                </div>
              );
            })}
            {bufferFilled && (() => {
              const bProj = projects.find(p => p.id === person.bufferProject);
              const bTC = tc[person.bufferType] || {};
              return (
                <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: layout.radiusSm,
                    background: `${c.purple}08`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size, fontWeight: 800, color: c.purple,
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
      </Modal>

      {/* ═══ BLOCKED REASON MODAL ═══════════════════════════════════ */}
      {/* Reset FAB removed — now accessible via overflow menu in header */}

      {/* ═══ RESET CONFIRMATION MODAL ═══════════════════════════════ */}
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all commits?" accent={c.red}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[4] }}>
          Are you sure you want to reset? All commits, buffer, and outcomes for this week will be cleared.
        </div>
        <div style={{ display: "flex", gap: space[3], justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => {
            if (isHistorical || isClosed || isLocked) { setConfirmReset(false); return; }
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
              p.bufferDuration = 1;
              p.bufferOutcome = null;
              p.bufferCarryTo = null;
              p.bufferBlockedReason = '';
              p.depriReason = '';
              p.deselected = -1;
              next[activePerson] = p;
              return next;
            });
            setConfirmReset(false);
            setDetailFocus(0);
          }}>Yes, Reset</Btn>
        </div>
      </Modal>

      <Modal open={!!blockedModal} onClose={() => { setBlockedModal(null); setBlockedText(""); }} title="Why is this blocked?" accent={c.red}>
        <div style={{ fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size, fontWeight: 400, color: c.textMid, lineHeight: 1.6, marginBottom: space[3] }}>
          Describe the blocker so your team knows what needs to be resolved.
        </div>
        <div style={{ marginBottom: space[3] }}>
          <TelemetryLabel color={c.red} style={{ marginBottom: space[1] }}>Blocker Description</TelemetryLabel>
          <TextArea
            data-autofocus
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
      </Modal>

      {/* ═══ FLOATING ACTION DOCK ═══════════════════════════════════════
          Single primary CTA anchored bottom-right. Label + action
          derived from the current phase so the user always knows the
          next step and never hunts for it inline.
          ═══════════════════════════════════════════════════════════════ */}
      {(() => {
        if (!person || activePerson < 0) return null;
        if (isHistorical || isClosed) return null;
        let action = null;
        // Phase wins over reviewMode — once locked, the dock advances even
        // if reviewMode is still true from the previous step.
        if (phase === "closing") {
          action = { label: "Confirm Close", variant: "success", disabled: !weekComplete,
                     onClick: confirmCloseWeek };
        } else if (phase === "locked") {
          action = { label: "Close Week \u2192", variant: "primary",
                     onClick: () => setClosingMode(true) };
        } else if (reviewMode) {
          action = { label: "Lock Week", variant: "success", disabled: !canLock,
                     onClick: () => { if (canLock) setConfirmAction("lock"); } };
        } else if (allSlotsFilled) {
          action = { label: "Review Plan \u2192", variant: "success",
                     onClick: () => setReviewMode(true) };
        } else {
          const dockSlotFilled = person.items.slice(0, 3).map(it =>
            !!it?.project && !!(it?.title || "").trim() && !!it?.stage && allPhases.includes(it?.stage) && !!it?.type
          );
          if (detailFocus >= 0 && detailFocus < 2 && dockSlotFilled[detailFocus]) {
            action = { label: "Next \u2192", variant: "primary",
                       onClick: () => setDetailFocus(detailFocus + 1) };
          }
        }
        if (!action) return null;
        return (
          <div role="toolbar" aria-label="Primary action" style={{
            position: "fixed", bottom: space[5], right: space[5],
            padding: space[2],
            background: c.surface, border: `1px solid ${c.border}`,
            borderRadius: layout.radiusLg, boxShadow: c.shadowElevated,
            zIndex: 40,
            animation: `fadeIn ${motion.normal.duration} ${motion.normal.easing} both`,
          }}>
            <Btn variant={action.variant} size="md" disabled={action.disabled} onClick={action.onClick}>
              {action.label}
            </Btn>
          </div>
        );
      })()}
    </div>
  );
};

export default HumansView;
