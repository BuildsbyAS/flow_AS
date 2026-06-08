import { DirectionFilled, WatchlistOff, WatchlistOn } from '../icons.jsx';
import { mockProject } from '../../data/mockProject.js';

// ProjectHeader — mirrors Figma 581:11714 (info group) + 581:11724 (metadata grid).
//
// Outer: flex column with 24px gap holding two children:
//   1. Info group — flex column, 6px gap:
//      Row 1: code + 3px dot + "Updated 3h ago"   (8px gap)
//      Row 2: title  + watchlist button           (12px gap, title auto-width)
//   2. Metadata grid — inline-grid 4×2 (40px column gap, 6px row gap).

const sansBase = {
  fontFamily: 'var(--f-sans)',
  whiteSpace: 'nowrap',
};

const labelStyle = {
  ...sansBase,
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 400,
  letterSpacing: '-0.1px',
  color: 'var(--c-text-tertiary)',
};

const valueStyle = {
  ...sansBase,
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 600,
  letterSpacing: '-0.014px',
  color: 'var(--c-text-primary)',
};

const codeStyle = {
  ...sansBase,
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 400,
  letterSpacing: '-0.014px',
  color: 'var(--c-text-tertiary)',
};

const updatedStyle = {
  ...sansBase,
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 400,
  letterSpacing: '-0.014px',
  color: 'var(--c-text-primary)',
};

const titleStyle = {
  margin: 0,
  fontFamily: 'var(--f-sans)',
  fontSize: 40,
  lineHeight: '48px',
  letterSpacing: '-1px',
  fontWeight: 500,
  color: 'var(--c-text-primary)',
  whiteSpace: 'nowrap',
};

export default function ProjectHeader({ bookmarked, onToggleBookmark }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Info group — code/updated + title/watchlist */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'flex-start',
        }}
      >
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={codeStyle}>{mockProject.code}</span>
          <span
            aria-hidden
            style={{
              width: 3,
              height: 3,
              borderRadius: 999,
              background: 'var(--c-text-muted)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span style={updatedStyle}>Updated {mockProject.updatedAt}</span>
        </div>

        {/* Row 2 — auto-width title + watchlist with 12px gap */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={titleStyle}>{mockProject.name}</h1>
          <WatchlistButton on={bookmarked} onClick={onToggleBookmark} />
        </div>
      </div>

      {/* Metadata grid — 4 cols × 2 rows */}
      <div
        style={{
          display: 'inline-grid',
          alignSelf: 'stretch',
          padding: 0,
          rowGap: 6,
          columnGap: 40,
          gridTemplateRows: 'repeat(2, fit-content(100%))',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        }}
      >
        {/* Row 1 — labels */}
        <span style={{ ...labelStyle, justifySelf: 'start', alignSelf: 'center' }}>
          Created on
        </span>
        <span style={{ ...labelStyle, justifySelf: 'start', alignSelf: 'center' }}>
          Due date
        </span>
        <span style={{ ...labelStyle, justifySelf: 'start', alignSelf: 'center' }}>
          Status
        </span>
        <span style={{ ...labelStyle, justifySelf: 'stretch', alignSelf: 'start' }}>
          Squad
        </span>

        {/* Row 2 — values */}
        <span
          style={{
            ...valueStyle,
            justifySelf: 'start',
            alignSelf: 'center',
            padding: '4px 0',
          }}
        >
          {mockProject.createdAt}
        </span>
        <span
          style={{
            ...valueStyle,
            justifySelf: 'stretch',
            alignSelf: 'stretch',
            padding: '4px 0',
          }}
        >
          {mockProject.dueDate}
        </span>
        <span style={{ justifySelf: 'start', alignSelf: 'start' }}>
          <InFlightBadge />
        </span>
        <span
          style={{
            ...valueStyle,
            justifySelf: 'stretch',
            alignSelf: 'stretch',
            padding: '4px 0',
          }}
        >
          {mockProject.squad}
        </span>
      </div>
    </header>
  );
}

// In-flight status badge — Figma 581:11738
function InFlightBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '4px 8px 4px 6px',
        borderRadius: 6,
        background: 'var(--c-inflight-bg)',
        color: 'var(--c-inflight-fg)',
        fontFamily: 'var(--f-sans)',
        fontWeight: 600,
        fontSize: 14,
        lineHeight: '20px',
        letterSpacing: '-0.1px',
        whiteSpace: 'nowrap',
        width: 'fit-content',
      }}
    >
      <DirectionFilled size={14} />
      In flight
    </span>
  );
}

// Watchlist toggle — layered Off/On SVGs, no scale(0) entry, transition-based
// (interruptible), spring overshoot on activate, opacity-only under reduced motion.
function WatchlistButton({ on, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? 'Remove from watchlist' : 'Add to watchlist'}
      title={on ? 'Remove from watchlist' : 'Add to watchlist'}
      onClick={onClick}
      className="flow-watchlist-btn"
      style={{
        position: 'relative',
        width: 36,
        height: 36,
        padding: 0,
        flexShrink: 0,
        background: 'transparent',
        borderRadius: 9999,
        cursor: 'pointer',
        transition: 'transform 160ms var(--ease-out)',
        // hint to the compositor — promoting to its own layer keeps the spring smooth
        willChange: 'transform',
      }}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: on ? 0 : 1,
          transform: on ? 'scale(0.92)' : 'scale(1)',
          transition:
            'opacity 180ms var(--ease-out), transform 220ms var(--ease-out)',
          willChange: 'opacity, transform',
        }}
      >
        <WatchlistOff size={36} />
      </span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: on ? 1 : 0,
          transform: on ? 'scale(1)' : 'scale(0.88)',
          transition:
            'opacity 180ms var(--ease-out), transform 280ms var(--ease-spring)',
          willChange: 'opacity, transform',
        }}
      >
        <WatchlistOn size={36} />
      </span>
    </button>
  );
}
