import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SectionHead } from './shared.jsx';
import { CloseIcon, PlusIcon, Refresh, DirectionFilled } from './icons.jsx';
import {
  mockPhases,
  mockBars,
  mockMonths,
  PHASE_ORDER,
  PHASE_LABELS,
} from './mockProject.js';
import { color } from './ds.js';
import { FloatingPopover, ListPicker } from './pickers.jsx';

// GanttTimeline — Figma 583:12380
// ───────────────────────────────
// Rows are KEYED BY PHASE (PHASE_ORDER). Every Design bar lives in the Design
// row; every QA bar lives in the QA row. Inactive phases render as muted
// bands across the full chart width with a centered "<Phase> · Inactive" label.
//
// Widths are FLUID. Months use flex: 1 0 0 so the chart fills its container
// regardless of viewport — no horizontal scroll. Bar positions are stored as
// week indexes and rendered as `left: x%`, `width: y%` of the total span.
//
// Drag-to-create:
//   1. Hover the chart → "+ Add phase" pill fades in at the top-right.
//   2. Click + → portaled dropdown with the 6 phase types.
//   3. Pick a phase → crosshair cursor + hint banner; new bar will land in that
//      phase's row.
//   4. Click and drag horizontally on the chart → ghost bar follows cursor,
//      snapped to week cells.
//   5. Release → committed. If the phase was inactive, it becomes active.

// Layout — matches Figma 583:12380 (h-[408px] chart, 6 rows × 68px pitch).
// BAR_INSET centers the 60px bar inside its 68px row.
const ROW_HEIGHT = 68;
const BAR_HEIGHT = 60;
const BAR_INSET = (ROW_HEIGHT - BAR_HEIGHT) / 2; // 4
const ROW_GAP = BAR_INSET; // alias used by InactiveBand math

// Project epoch — week 0 = Jan 1, 2026.
const EPOCH = new Date(2026, 0, 1);
function weekToDate(w) {
  const d = new Date(EPOCH);
  d.setDate(d.getDate() + w * 7);
  return d;
}
function fmtRange(startWeek, spanWeeks) {
  const start = weekToDate(startWeek);
  const end = weekToDate(startWeek + spanWeeks);
  const fmt = (d) => `${d.getDate()} ${d.toLocaleDateString('en', { month: 'short' })}`;
  return `${fmt(start)} → ${fmt(end)}`;
}

const ADDABLE_PHASES = PHASE_ORDER.map((k) => ({ key: k, label: PHASE_LABELS[k] }));

function rowForPhase(phaseKey) {
  const i = PHASE_ORDER.indexOf(phaseKey);
  return i === -1 ? 0 : i;
}

export default function GanttTimeline({ phases: phasesProp = mockPhases, bars: barsProp = mockBars, months = mockMonths, rangeLabel = 'May 12 — Jul 23' }) {
  const [phases, setPhases] = useState(phasesProp);
  const [bars, setBars] = useState(barsProp);
  const [drawingPhase, setDrawingPhase] = useState(null);
  const [ghostBar, setGhostBar] = useState(null);
  const [chartHovered, setChartHovered] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addAnchor, setAddAnchor] = useState(null);

  const chartRef = useRef(null);
  const addBtnRef = useRef(null);

  // Bar drag-to-move state
  const [draggingBarKey, setDraggingBarKey] = useState(null);
  const dragRef = useRef({ originalStartWeek: 0, cursorStartPct: 0 });

  const totalWeeks = months.reduce((sum, m) => sum + m.weeks, 0);
  const chartHeight = PHASE_ORDER.length * ROW_HEIGHT;

  // ─── Phase chip / band toggles ──────────────────────────────────────────
  // We keep bars in state regardless of active/inactive — the visibleBars
  // filter below hides them when the phase is inactive and re-shows them on
  // re-activation. That preserves user-added bars across an accidental close.
  function togglePhase(key) {
    setPhases((prev) =>
      prev.map((p) =>
        p.key === key
          ? p.active
            ? { ...p, active: false, status: null }
            : { ...p, active: true, status: p.status || { kind: 'live', text: 'Live just now' } }
          : p
      )
    );
  }

  // ─── Drawing mode ───────────────────────────────────────────────────────
  function getWeekFromEvent(e) {
    const chart = chartRef.current;
    if (!chart) return 0;
    const rect = chart.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    return Math.max(0, Math.min(totalWeeks - 1, Math.floor(pct * totalWeeks)));
  }

  function startDrawing(phaseKey) {
    const phase = ADDABLE_PHASES.find((p) => p.key === phaseKey);
    if (!phase) return;
    setDrawingPhase(phase);
    setAddOpen(false);
  }
  function cancelDrawing() {
    setDrawingPhase(null);
    setGhostBar(null);
  }

  function onChartPointerDown(e) {
    if (!drawingPhase) return;
    e.preventDefault();
    e.stopPropagation();
    const week = getWeekFromEvent(e);
    setGhostBar({ startWeek: week, endWeek: week });
  }

  // ─── Bar interactions ───────────────────────────────────────────────────
  function removeBar(barKey) {
    setBars((prev) => prev.filter((b) => b.key !== barKey));
  }

  function startBarDrag(bar, e) {
    if (drawingPhase) return;
    e.preventDefault();
    e.stopPropagation();
    const chart = chartRef.current;
    if (!chart) return;
    const rect = chart.getBoundingClientRect();
    const cursorPct = (e.clientX - rect.left) / rect.width;
    dragRef.current = {
      originalStartWeek: bar.startWeek,
      cursorStartPct: cursorPct,
    };
    setDraggingBarKey(bar.key);
  }

  useEffect(() => {
    if (!draggingBarKey) return;
    function onMove(e) {
      const chart = chartRef.current;
      if (!chart) return;
      const rect = chart.getBoundingClientRect();
      const cursorPct = (e.clientX - rect.left) / rect.width;
      const deltaPct = cursorPct - dragRef.current.cursorStartPct;
      const deltaWeeks = Math.round(deltaPct * totalWeeks);
      const candidate = dragRef.current.originalStartWeek + deltaWeeks;
      setBars((prev) =>
        prev.map((b) => {
          if (b.key !== draggingBarKey) return b;
          const clamped = Math.max(0, Math.min(totalWeeks - b.spanWeeks, candidate));
          if (clamped === b.startWeek) return b;
          return {
            ...b,
            startWeek: clamped,
            dateRange: fmtRange(clamped, b.spanWeeks),
          };
        })
      );
    }
    function onUp() {
      setDraggingBarKey(null);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [draggingBarKey, totalWeeks]);

  useEffect(() => {
    if (!ghostBar || !drawingPhase) return;
    function onMove(e) {
      const week = getWeekFromEvent(e);
      setGhostBar((g) => (g ? { ...g, endWeek: week } : g));
    }
    function onUp() {
      const a = Math.min(ghostBar.startWeek, ghostBar.endWeek);
      const b = Math.max(ghostBar.startWeek, ghostBar.endWeek);
      const dragSpan = b - a;
      const spanWeeks = dragSpan === 0 ? 4 : dragSpan + 1;
      const startWeek = a;

      const newBar = {
        key: `${drawingPhase.key}-${Date.now()}`,
        phase: drawingPhase.key,
        label: drawingPhase.label,
        startWeek,
        spanWeeks,
        dateRange: fmtRange(startWeek, spanWeeks),
      };
      setBars((prev) => [...prev, newBar]);
      setPhases((prev) =>
        prev.map((p) =>
          p.key === drawingPhase.key && !p.active
            ? { ...p, active: true, status: { kind: 'live', text: 'Live just now' } }
            : p
        )
      );
      cancelDrawing();
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [ghostBar, drawingPhase]);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (ghostBar) return;
      if (drawingPhase) cancelDrawing();
      if (addOpen) setAddOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawingPhase, ghostBar, addOpen]);

  function toggleAdd() {
    if (drawingPhase) {
      cancelDrawing();
      return;
    }
    if (addOpen) {
      setAddOpen(false);
      return;
    }
    const rect = addBtnRef.current?.getBoundingClientRect();
    if (rect) setAddAnchor(rect);
    setAddOpen(true);
  }

  const addBtnVisible = chartHovered || addOpen || !!drawingPhase;

  // Active bars filtered against current phase state (light Discovery is OK
  // since 'design' is always active in the mock).
  const visibleBars = bars.filter((b) => {
    const phase = phases.find((p) => p.key === b.phase);
    return phase?.active || b.light;
  });

  return (
    <section>
      <SectionHead
        title="Track timeline"
        right={
          <span style={{ fontSize: 14, color: 'var(--c-text-tertiary)', fontWeight: 400, letterSpacing: '-0.1px' }}>
            {rangeLabel}
          </span>
        }
      />

      {/* Phase chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-start',
          width: '100%',
          marginBottom: 16,
          isolation: 'isolate',
        }}
      >
        {phases.map((p) => (
          <PhaseChip key={p.key} phase={p} onToggle={() => togglePhase(p.key)} />
        ))}
      </div>

      {/* Chart */}
      <div
        style={{
          position: 'relative',
          background: 'var(--c-surface-primary)',
          border: '1px solid var(--c-border-primary)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
        onPointerEnter={() => setChartHovered(true)}
        onPointerLeave={() => setChartHovered(false)}
      >
        {/* + Add phase button */}
        <button
          ref={addBtnRef}
          type="button"
          onClick={toggleAdd}
          aria-label={drawingPhase ? 'Cancel adding phase' : 'Add phase'}
          aria-expanded={addOpen}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px 6px 8px',
            borderRadius: 999,
            background: drawingPhase ? '#1d2539' : 'var(--c-surface-primary)',
            color: drawingPhase ? '#fff' : 'var(--c-text-primary)',
            border: drawingPhase ? '1px solid #1d2539' : '1px solid var(--c-border-primary)',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '-0.05px',
            opacity: addBtnVisible ? 1 : 0,
            transform: addBtnVisible ? 'scale(1)' : 'scale(0.92)',
            pointerEvents: addBtnVisible ? 'auto' : 'none',
            transition:
              'opacity 160ms var(--ease-out), transform 200ms var(--ease-out), background 160ms var(--ease-out), color 160ms var(--ease-out)',
          }}
          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span
            style={{
              display: 'inline-flex',
              transition: 'transform 200ms var(--ease-out)',
              transform: drawingPhase ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          >
            <PlusIcon size={12} />
          </span>
          {drawingPhase ? 'Cancel' : 'Add phase'}
        </button>

        {/* Drawing mode hint */}
        {drawingPhase && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 8,
              background: color.phase[drawingPhase.key],
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '-0.05px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.12)',
              animation: 'flow-tt-pop 200ms var(--ease-out) both',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: '#fff',
                transform: 'rotate(45deg)',
                display: 'inline-block',
              }}
            />
            Click &amp; drag to place {drawingPhase.label}
            <span style={{ opacity: 0.7, marginLeft: 6, fontWeight: 500 }}>Esc to cancel</span>
          </div>
        )}

        {/* Chart body — rows on top, month axis below */}
        <div
          ref={chartRef}
          onPointerDown={onChartPointerDown}
          style={{
            position: 'relative',
            width: '100%',
            height: chartHeight,
            cursor: drawingPhase ? 'crosshair' : 'default',
          }}
        >
          {/* Month boundary grid (vertical dashed lines) */}
          <MonthGrid totalWeeks={totalWeeks} months={months} />

          {/* Per-phase rows: inactive bands (click to activate) or active row */}
          {PHASE_ORDER.map((phaseKey, rowIdx) => {
            const phase = phases.find((p) => p.key === phaseKey);
            if (phase?.active) return null;
            return (
              <InactiveBand
                key={phaseKey}
                top={rowIdx * ROW_HEIGHT + BAR_INSET}
                height={BAR_HEIGHT}
                label={PHASE_LABELS[phaseKey]}
                onActivate={() => togglePhase(phaseKey)}
                muted={!!drawingPhase}
              />
            );
          })}

          {/* Bars */}
          {visibleBars.map((bar) => (
            <Bar
              key={bar.key}
              bar={bar}
              totalWeeks={totalWeeks}
              row={rowForPhase(bar.phase)}
              muted={!!drawingPhase}
              dragging={draggingBarKey === bar.key}
              onBeginDrag={(e) => startBarDrag(bar, e)}
              onRemove={() => removeBar(bar.key)}
            />
          ))}

          {/* Ghost bar */}
          {ghostBar && drawingPhase && (
            <GhostBar
              ghostBar={ghostBar}
              phaseKey={drawingPhase.key}
              label={drawingPhase.label}
              row={rowForPhase(drawingPhase.key)}
              totalWeeks={totalWeeks}
            />
          )}
        </div>

        {/* Month axis */}
        <MonthAxis months={months} />
      </div>

      {addOpen &&
        addAnchor &&
        createPortal(
          <FloatingPopover anchor={addAnchor} onClose={() => setAddOpen(false)} width={200}>
            <ListPicker
              items={ADDABLE_PHASES}
              value={null}
              onSelect={startDrawing}
              renderItem={(it) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: color.phase[it.key],
                      transform: 'rotate(45deg)',
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--c-text-primary)' }}>{it.label}</span>
                </span>
              )}
            />
          </FloatingPopover>,
          document.body
        )}
    </section>
  );
}

// ─── Month vertical grid (background) ────────────────────────────────────
function MonthGrid({ totalWeeks, months }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: months.map(() => '1fr').join(' '),
        background:
          'linear-gradient(180deg, var(--c-surface-primary) 0%, var(--c-surface-secondary) 100%)',
        pointerEvents: 'none',
      }}
    >
      {months.map((m, i) => (
        <div
          key={m.key}
          style={{
            borderRight: i < months.length - 1 ? '1px solid var(--c-border-primary)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─── Inactive phase band (click to activate) ────────────────────────────
function InactiveBand({ top, height, label, onActivate, muted }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={muted ? undefined : onActivate}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      aria-label={`Activate ${label}`}
      title={`Activate ${label}`}
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height,
        background: hover ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.035)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 6,
        cursor: muted ? 'crosshair' : 'pointer',
        pointerEvents: muted ? 'none' : 'auto',
        opacity: muted ? 0.55 : 1,
        transition:
          'background 160ms var(--ease-out), opacity 200ms var(--ease-out), transform 160ms var(--ease-out)',
      }}
      onPointerDown={(e) => !muted && (e.currentTarget.style.transform = 'scale(0.998)')}
      onPointerUp={(e) => !muted && (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '20px',
          letterSpacing: '-0.1px',
          color: hover ? 'var(--c-text-secondary)' : 'var(--c-text-muted)',
          transition: 'color 160ms var(--ease-out)',
        }}
      >
        {label}
      </span>
      <span
        aria-hidden
        style={{
          width: 4,
          height: 4,
          borderRadius: 999,
          background: hover ? 'var(--c-text-secondary)' : 'var(--c-text-muted)',
          display: 'inline-block',
          transition: 'background 160ms var(--ease-out)',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '20px',
          letterSpacing: '-0.1px',
          color: hover ? 'var(--c-text-secondary)' : 'var(--c-text-muted)',
          transition: 'color 160ms var(--ease-out)',
        }}
      >
        {hover ? 'Click to activate' : 'Inactive'}
      </span>
    </button>
  );
}

// ─── Bar (proportional, drag-to-move + remove) ───────────────────────────
function Bar({ bar, totalWeeks, row, muted, dragging, onBeginDrag, onRemove }) {
  const [hover, setHover] = useState(false);
  const fg = color.phase[bar.phase];
  const isLight = bar.light;
  const leftPct = (bar.startWeek / totalWeeks) * 100;
  const widthPct = (bar.spanWeeks / totalWeeks) * 100;
  const lifted = hover && !dragging && !muted;
  return (
    <div
      className="flow-rise"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={muted ? undefined : (e) => onBeginDrag(e)}
      style={{
        position: 'absolute',
        top: row * ROW_HEIGHT + BAR_INSET,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: BAR_HEIGHT,
        background: isLight ? color.phaseSoft[bar.phase] : fg,
        border: isLight ? `1px solid var(--c-surface-primary)` : 'none',
        borderRadius: 6,
        padding: '10px 12px',
        color: isLight ? fg : '#fff',
        boxShadow: dragging
          ? '0 12px 28px rgba(15, 23, 42, 0.18), 0 4px 8px rgba(15, 23, 42, 0.06)'
          : lifted
            ? '0 6px 14px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.08)'
            : isLight
              ? 'none'
              : '0 1px 1px rgba(0, 0, 0, 0.08), 0 3px 1.5px rgba(0, 0, 0, 0.07), 0 7px 2px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        cursor: muted ? 'crosshair' : dragging ? 'grabbing' : 'grab',
        pointerEvents: muted ? 'none' : 'auto',
        opacity: muted ? 0.55 : 1,
        overflow: 'hidden',
        transform: lifted ? 'translateY(-2px)' : 'translateY(0)',
        zIndex: dragging ? 5 : lifted ? 4 : 1,
        transition: dragging
          ? 'none'
          : 'transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out), opacity 200ms var(--ease-out)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '20px',
          letterSpacing: '-0.1px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          // give the × button breathing room
          paddingRight: hover ? 22 : 0,
          transition: 'padding 160ms var(--ease-out)',
        }}
      >
        {bar.label}
      </span>
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: 12,
          fontWeight: 400,
          lineHeight: '16px',
          letterSpacing: '-0.1px',
          opacity: 0.92,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {bar.dateRange}
      </span>

      {/* × remove — top-right, hover-only */}
      <RemoveBarButton
        hover={hover && !dragging && !muted}
        isLight={isLight}
        phaseColor={fg}
        onRemove={onRemove}
      />
    </div>
  );
}

function RemoveBarButton({ hover, isLight, phaseColor, onRemove }) {
  return (
    <button
      type="button"
      aria-label="Remove phase"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = isLight
          ? 'rgba(0, 0, 0, 0.10)'
          : 'rgba(255, 255, 255, 0.32)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = isLight
          ? 'rgba(0, 0, 0, 0.06)'
          : 'rgba(255, 255, 255, 0.20)')
      }
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.20)',
        color: isLight ? phaseColor : '#fff',
        opacity: hover ? 1 : 0,
        transform: hover ? 'scale(1)' : 'scale(0.85)',
        pointerEvents: hover ? 'auto' : 'none',
        transition:
          'opacity 160ms var(--ease-out), transform 200ms var(--ease-out), background 160ms var(--ease-out)',
      }}
    >
      <CloseIcon size={10} />
    </button>
  );
}

// ─── Ghost bar (live preview) ────────────────────────────────────────────
function GhostBar({ ghostBar, phaseKey, label, row, totalWeeks }) {
  const fg = color.phase[phaseKey];
  const start = Math.min(ghostBar.startWeek, ghostBar.endWeek);
  const end = Math.max(ghostBar.startWeek, ghostBar.endWeek);
  const spanWeeks = end - start + 1;
  const leftPct = (start / totalWeeks) * 100;
  const widthPct = (spanWeeks / totalWeeks) * 100;
  return (
    <div
      style={{
        position: 'absolute',
        top: row * ROW_HEIGHT + BAR_INSET,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height: BAR_HEIGHT,
        background: fg,
        opacity: 0.88,
        border: '1.5px dashed rgba(255,255,255,0.7)',
        borderRadius: 6,
        padding: '10px 12px',
        color: '#fff',
        boxShadow: '0 6px 14px rgba(15, 23, 42, 0.14)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 2,
        pointerEvents: 'none',
        overflow: 'hidden',
        animation: 'flow-tt-pop 180ms var(--ease-out) both',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: '20px',
          letterSpacing: '-0.1px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--f-sans)',
          fontSize: 12,
          fontWeight: 400,
          lineHeight: '16px',
          letterSpacing: '-0.1px',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {fmtRange(start, spanWeeks)}
      </span>
    </div>
  );
}

// ─── Month axis (bottom) ─────────────────────────────────────────────────
function MonthAxis({ months }) {
  return (
    <div
      style={{
        display: 'flex',
        borderTop: '1px solid var(--c-border-primary)',
        background: 'var(--c-surface-primary)',
        width: '100%',
      }}
    >
      {months.map((m, i) => (
        <div
          key={m.key}
          style={{
            flex: '1 0 0',
            minWidth: 0,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignItems: 'center',
            borderRight: i < months.length - 1 ? '1px solid var(--c-border-primary)' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              fontWeight: 400,
              lineHeight: '17px',
              letterSpacing: '-0.1px',
              color: 'var(--c-text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Array.from({ length: m.weeks }).map((_, w) => (
              <span key={w}>W{w + 1}</span>
            ))}
          </div>
          <div
            style={{
              alignSelf: 'flex-start',
              paddingTop: 8,
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: '17px',
              letterSpacing: '-0.1px',
              color: 'var(--c-text-primary)',
            }}
          >
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Phase chip (Figma 583:12388–12431) ──────────────────────────────────
function PhaseChip({ phase, onToggle }) {
  const fg = color.phase[phase.key];
  const isLive = phase.status?.kind === 'live';
  const isReopened = phase.status?.kind === 'reopened';

  if (!phase.active) {
    return (
      <button
        onClick={onToggle}
        aria-label={`Activate ${phase.label}`}
        style={{
          flex: '1 0 0',
          minWidth: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 0,
          padding: 10,
          background: 'var(--c-surface-secondary)',
          border: 'none',
          borderRadius: 8,
          textAlign: 'left',
          transition: 'background 160ms var(--ease-out)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-surface-tertiary)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface-secondary)')}
      >
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 14,
            fontWeight: 500,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: 'var(--c-text-secondary)',
          }}
        >
          {phase.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 12,
            fontWeight: 400,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: 'var(--c-text-tertiary)',
          }}
        >
          Inactive
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 148,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 10,
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 2,
            background: fg,
            transform: 'rotate(45deg)',
            flexShrink: 0,
            display: 'inline-block',
          }}
        />
        <span
          style={{
            flex: '1 1 0',
            minWidth: 0,
            fontFamily: 'var(--f-sans)',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: 'var(--c-text-primary)',
          }}
        >
          {phase.label}
        </span>
        <button
          onClick={onToggle}
          aria-label={`Remove ${phase.label} phase`}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--c-surface-tertiary)',
            color: 'var(--c-text-secondary)',
            transition: 'background 160ms var(--ease-out), color 160ms var(--ease-out)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--c-border-primary)';
            e.currentTarget.style.color = 'var(--c-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--c-surface-tertiary)';
            e.currentTarget.style.color = 'var(--c-text-secondary)';
          }}
        >
          <CloseIcon size={10} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
        {isReopened ? <Refresh size={12} /> : isLive ? <DirectionFilled size={12} /> : null}
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 12,
            fontWeight: 400,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: isLive ? 'var(--c-text-action)' : 'var(--c-text-secondary)',
          }}
        >
          {phase.status?.text}
        </span>
      </div>
    </div>
  );
}
