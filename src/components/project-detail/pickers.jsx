import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Shared portal-based pickers used by editable metadata fields and elsewhere.
// Each picker mounts into <body> with position: fixed, so they escape any
// scroller's overflow clip and stack above siblings regardless of DOM order.
//
// Motion (Emil's framework):
//   • Open  — 180ms cubic-bezier(0.23, 1, 0.32, 1), opacity + scale(0.96 → 1)
//   • Origin — top-left, anchored to the trigger's bottom-left + 8 (auto-flips up)
//   • Close — no exit animation (avoid lingering ghosts during rapid retriggers)

const WARM_HOVER = '#F4EEEB';
const WARM_BG = '#FBF9F8';

// ── Floating popover wrapper ─────────────────────────────────────────────
// Computes position relative to the trigger rect, clamps to viewport, closes
// on outside click / Escape / scroll. Children are rendered into document.body.
export function FloatingPopover({ anchor, onClose, children, width }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = anchor.left;
    let top = anchor.bottom + 8;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (left < 8) left = 8;
    if (top + r.height > window.innerHeight - 8) {
      top = anchor.top - r.height - 8;
    }
    setPos({ top, left });
  }, [anchor.left, anchor.bottom, anchor.top, anchor.right]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    function onPointer(e) {
      const inPopover = e.target.closest?.('[data-floating-popover]');
      if (!inPopover) onClose();
    }
    function onScroll() {
      onClose();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      data-floating-popover
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
        width,
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 12,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14), 0 6px 12px rgba(15, 23, 42, 0.06)',
        transformOrigin: 'top left',
        animation: 'flow-pop-out 180ms var(--ease-out) both',
        overflow: 'hidden',
        fontFamily: 'var(--f-sans)',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ── Calendar ─────────────────────────────────────────────────────────────
// Minimal month grid. Header with month/year + prev/next chevrons. Sunday-first.
// Selected day fills with action blue, today shows a soft border, weekends slightly muted.
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function Calendar({ selected, onSelect }) {
  const [display, setDisplay] = useState(() => startOfMonth(selected || new Date()));
  const today = new Date();

  const year = display.getFullYear();
  const month = display.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const dim = daysInMonth(display);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function prev() {
    setDisplay(new Date(year, month - 1, 1));
  }
  function next() {
    setDisplay(new Date(year, month + 1, 1));
  }
  function pick(d) {
    if (d == null) return;
    onSelect(new Date(year, month, d));
  }

  return (
    <div style={{ padding: 12, width: 280 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <ChevronBtn onClick={prev} dir="prev" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>
          {display.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <ChevronBtn onClick={next} dir="next" />
      </div>

      {/* Day labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <span
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.4px',
              color: 'var(--c-text-muted)',
              padding: '4px 0',
            }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d == null) return <span key={i} aria-hidden style={{ visibility: 'hidden' }}>·</span>;
          const cell = new Date(year, month, d);
          const isSel = selected && sameDay(cell, selected);
          const isToday = sameDay(cell, today);
          return (
            <CalendarDay key={i} day={d} isSel={isSel} isToday={isToday} onClick={() => pick(d)} />
          );
        })}
      </div>
    </div>
  );
}

function CalendarDay({ day, isSel, isToday, onClick }) {
  const [hover, setHover] = useState(false);
  const bg = isSel
    ? 'var(--c-text-action)'
    : hover
      ? WARM_HOVER
      : 'transparent';
  const fg = isSel ? 'var(--c-text-on-action)' : 'var(--c-text-primary)';
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{
        aspectRatio: '1 / 1',
        borderRadius: 8,
        background: bg,
        color: fg,
        fontSize: 12,
        fontWeight: isSel ? 600 : 500,
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isToday && !isSel ? 'inset 0 0 0 1px var(--c-border-strong)' : 'none',
        transition:
          'background 120ms var(--ease-out), transform 120ms var(--ease-out), color 120ms var(--ease-out)',
      }}
    >
      {day}
    </button>
  );
}

function ChevronBtn({ onClick, dir }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous month' : 'Next month'}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--c-text-secondary)',
        background: 'transparent',
        transition: 'background 120ms var(--ease-out)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = WARM_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
        <path
          d={dir === 'prev' ? 'M10 4l-4 4 4 4' : 'M6 4l4 4-4 4'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ── ListPicker ──────────────────────────────────────────────────────────
// Single-select by default. Pass `multi` and an array `value` to switch to
// checkbox-style multi-select. Multi mode does not auto-close — caller
// decides when the picker dismisses (typically click outside).
export function ListPicker({ items, value, onSelect, renderItem, getKey, getLabel, multi = false }) {
  const selectedSet = multi ? new Set(value || []) : null;
  return (
    <div style={{ padding: 6, minWidth: 200 }}>
      {items.map((it) => {
        const key = getKey ? getKey(it) : (typeof it === 'object' ? it.key : it);
        const isSel = multi ? selectedSet.has(key) : key === value;
        return (
          <ListItem
            key={key}
            selected={isSel}
            multi={multi}
            onSelect={() => onSelect(key)}
            renderItem={() => (renderItem ? renderItem(it, isSel) : getLabel ? getLabel(it) : String(it))}
          />
        );
      })}
    </div>
  );
}

function ListItem({ selected, onSelect, renderItem, multi }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 6,
        background: hover ? WARM_HOVER : selected && !multi ? WARM_BG : 'transparent',
        textAlign: 'left',
        transition: 'background 120ms var(--ease-out)',
      }}
    >
      {multi && <Checkbox checked={selected} />}
      {renderItem()}
      {selected && !multi && (
        <span aria-hidden style={{ marginLeft: 'auto', color: 'var(--c-text-action)' }}>
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

function Checkbox({ checked }) {
  return (
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: checked ? 'var(--c-text-action)' : 'var(--c-surface-primary)',
        border: checked ? '1px solid var(--c-text-action)' : '1.5px solid var(--c-border-strong)',
        color: '#fff',
        transition: 'background 120ms var(--ease-out), border-color 120ms var(--ease-out)',
      }}
    >
      {checked && (
        <svg width={11} height={11} viewBox="0 0 16 16" fill="none">
          <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

// ── EditableValue wrapper ────────────────────────────────────────────────
// Wraps a value in a button-like trigger with hover affordance + opens a
// FloatingPopover. Optional `hoverIcon` renders on the right with an
// opacity/translate transition driven by hover/open state.
export function EditableValue({
  children,
  ariaLabel,
  renderPopover,
  style = {},
  dense = false,
  hoverIcon = null,
}) {
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(false);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor(rect);
    setOpen(true);
  }

  const active = hover || open;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: dense ? '2px 6px' : '4px 8px',
          margin: dense ? '-2px -6px' : '-4px -8px',
          borderRadius: 6,
          // No hover background — only the trailing icon reveals on hover
          background: 'transparent',
          color: 'inherit',
          transition: 'transform 120ms var(--ease-out)',
          cursor: 'pointer',
          ...style,
        }}
      >
        {children}
        {hoverIcon && (
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: active ? 1 : 0,
              transform: active ? 'translateX(0) scale(1)' : 'translateX(-2px) scale(0.92)',
              transition: 'opacity 160ms var(--ease-out), transform 200ms var(--ease-out)',
            }}
          >
            {hoverIcon}
          </span>
        )}
      </button>
      {open && anchor &&
        renderPopover({
          anchor,
          close: () => setOpen(false),
        })}
    </>
  );
}
