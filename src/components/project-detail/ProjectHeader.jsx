import { useEffect, useRef, useState } from 'react';
import {
  DirectionFilled,
  WatchlistOff,
  WatchlistOn,
  CalendarIconButton,
  DownChevronIconButton,
} from './icons.jsx';
import {
  mockProject,
  availableStatuses,
  statusTone,
  availableSquads,
} from './mockProject.js';
import {
  FloatingPopover,
  Calendar,
  ListPicker,
  EditableValue,
} from './pickers.jsx';

// ProjectHeader — Figma 581:11714 (info group) + 581:11724 (metadata grid).
// All four metadata fields (Created on / Due date / Status / Squad) are
// individually editable: hover affordance like Team, click opens a portal'd
// floating picker (Calendar for dates, ListPicker for status/squad).

const sansBase = { fontFamily: 'var(--f-sans)', whiteSpace: 'nowrap' };

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

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProjectHeader({
  name = mockProject.name,
  code = mockProject.code,
  updatedAt = mockProject.updatedAt,
  bookmarked,
  onToggleBookmark,
  createdAt,
  onCreatedAtChange,
  dueDate,
  onDueDateChange,
  statusKey,
  onStatusKeyChange,
  squads,
  onSquadsChange,
}) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Info group */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={codeStyle}>{code}</span>
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
          <span style={updatedStyle}>Updated {updatedAt}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={titleStyle}>{name}</h1>
          <WatchlistGroup bookmarked={bookmarked} onToggleBookmark={onToggleBookmark} />
        </div>
      </div>

      {/* Metadata grid */}
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
        {/* Labels */}
        <span style={{ ...labelStyle, justifySelf: 'start', alignSelf: 'center' }}>Created on</span>
        <span style={{ ...labelStyle, justifySelf: 'start', alignSelf: 'center' }}>Due date</span>
        <span style={{ ...labelStyle, justifySelf: 'start', alignSelf: 'center' }}>Status</span>
        <span style={{ ...labelStyle, justifySelf: 'start', alignSelf: 'center' }}>Squad</span>

        {/* Values */}
        <span style={{ justifySelf: 'start', alignSelf: 'center' }}>
          <DateField
            ariaLabel={`Created on ${fmtDate(createdAt)}`}
            value={createdAt}
            onChange={onCreatedAtChange}
          />
        </span>
        <span style={{ justifySelf: 'start', alignSelf: 'center' }}>
          <DateField
            ariaLabel={`Due date ${fmtDate(dueDate)}`}
            value={dueDate}
            onChange={onDueDateChange}
          />
        </span>
        <span style={{ justifySelf: 'start', alignSelf: 'center' }}>
          <StatusField statusKey={statusKey} onChange={onStatusKeyChange} />
        </span>
        <span style={{ justifySelf: 'start', alignSelf: 'center' }}>
          <SquadField squads={squads} onChange={onSquadsChange} />
        </span>
      </div>
    </header>
  );
}

// ── Editable date ────────────────────────────────────────────────────────
function DateField({ value, onChange, ariaLabel }) {
  return (
    <EditableValue
      ariaLabel={ariaLabel}
      hoverIcon={<CalendarIconButton size={24} />}
      renderPopover={({ anchor, close }) => (
        <FloatingPopover anchor={anchor} onClose={close} width={280}>
          <Calendar
            selected={value}
            onSelect={(d) => {
              onChange(d);
              close();
            }}
          />
        </FloatingPopover>
      )}
    >
      <span style={valueStyle}>{fmtDate(value)}</span>
    </EditableValue>
  );
}

// ── Editable status ──────────────────────────────────────────────────────
function StatusField({ statusKey, onChange }) {
  return (
    <EditableValue
      ariaLabel="Change status"
      dense
      hoverIcon={<DownChevronIconButton size={24} />}
      renderPopover={({ anchor, close }) => (
        <FloatingPopover anchor={anchor} onClose={close} width={220}>
          <ListPicker
            items={availableStatuses}
            value={statusKey}
            onSelect={(k) => {
              onChange(k);
              close();
            }}
            renderItem={(it) => {
              const tone = statusTone[it.key];
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: tone.fg,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--c-text-primary)' }}>{it.label}</span>
                </span>
              );
            }}
          />
        </FloatingPopover>
      )}
    >
      <StatusPill statusKey={statusKey} />
    </EditableValue>
  );
}

function StatusPill({ statusKey, small }) {
  const status = availableStatuses.find((s) => s.key === statusKey);
  const tone = statusTone[statusKey];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: small ? '2px 6px 2px 4px' : '4px 8px 4px 6px',
        borderRadius: 6,
        background: tone.bg,
        color: tone.fg,
        fontFamily: 'var(--f-sans)',
        fontWeight: 600,
        fontSize: small ? 11 : 14,
        lineHeight: small ? '14px' : '20px',
        letterSpacing: '-0.1px',
        whiteSpace: 'nowrap',
      }}
    >
      {statusKey === 'inflight' ? (
        <DirectionFilled size={small ? 11 : 14} />
      ) : (
        <span
          aria-hidden
          style={{
            width: small ? 5 : 6,
            height: small ? 5 : 6,
            borderRadius: 999,
            background: tone.fg,
            display: 'inline-block',
          }}
        />
      )}
      {status?.label}
    </span>
  );
}

// ── Editable squads (multi-select) ───────────────────────────────────────
// Project can belong to multiple service squads — checkbox list, no auto-close.
function SquadField({ squads, onChange }) {
  function toggleSquad(s) {
    const next = squads.includes(s) ? squads.filter((x) => x !== s) : [...squads, s];
    onChange(next);
  }
  const displayValue = squads.length === 0 ? 'None' : squads.join(', ');
  return (
    <EditableValue
      ariaLabel="Change squads"
      hoverIcon={<DownChevronIconButton size={24} />}
      renderPopover={({ anchor, close }) => (
        <FloatingPopover anchor={anchor} onClose={close} width={220}>
          <ListPicker
            items={availableSquads}
            value={squads}
            multi
            onSelect={toggleSquad}
            renderItem={(it) => (
              <span style={{ fontSize: 13, color: 'var(--c-text-primary)' }}>{it}</span>
            )}
          />
        </FloatingPopover>
      )}
    >
      <span style={valueStyle}>{displayValue}</span>
    </EditableValue>
  );
}

// ── Watchlist toggle + confirmation toast ───────────────────────────────
// On false → true transition, a small toast slides in to the right of the
// button confirming the watch. Styled to match the Team member tooltip
// (white card + drop-shadow + Geist SemiBold 14/20 + Regular 12/20 cocoa).
// Auto-dismisses after 4s; instantly cleared if the user un-watches.
function WatchlistGroup({ bookmarked, onToggleBookmark }) {
  // `message` holds the most recent transition text. We don't tear it down
  // when the toast hides so the exit animation can play with the last text.
  const [showToast, setShowToast] = useState(false);
  const [message, setMessage] = useState('');
  const prevRef = useRef(bookmarked);
  const timerRef = useRef(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (bookmarked === prev) return;
    if (bookmarked && !prev) {
      setMessage('You are now watching this project & will know of all updates');
    } else if (!bookmarked && prev) {
      setMessage('You will no longer receive any updates on this project');
    }
    setShowToast(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowToast(false), 4000);
    prevRef.current = bookmarked;
    return () => clearTimeout(timerRef.current);
  }, [bookmarked]);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <WatchlistButton on={bookmarked} onClick={onToggleBookmark} />
      <WatchlistToast show={showToast} message={message} />
    </div>
  );
}

function WatchlistToast({ show, message }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 'calc(100% + 12px)',
        top: '50%',
        transform: show
          ? 'translateY(-50%) translateX(0)'
          : 'translateY(-50%) translateX(-8px)',
        opacity: show ? 1 : 0,
        pointerEvents: 'none',
        zIndex: 20,
        background: 'var(--c-surface-primary)',
        borderRadius: 10,
        padding: '8px 12px',
        filter: 'drop-shadow(0px 2px 6px rgba(14, 14, 14, 0.12))',
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        transition: 'opacity 200ms var(--ease-out), transform 220ms var(--ease-out)',
        fontFamily: 'var(--f-sans)',
        fontWeight: 500,
        fontSize: 14,
        lineHeight: '20px',
        letterSpacing: '-0.1px',
        color: 'var(--c-text-primary)',
      }}
    >
      {message}
    </div>
  );
}

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
        willChange: 'transform',
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: on ? 0 : 1,
          transform: on ? 'scale(0.92)' : 'scale(1)',
          transition: 'opacity 180ms var(--ease-out), transform 220ms var(--ease-out)',
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
          transition: 'opacity 180ms var(--ease-out), transform 280ms var(--ease-spring)',
          willChange: 'opacity, transform',
        }}
      >
        <WatchlistOn size={36} />
      </span>
    </button>
  );
}
