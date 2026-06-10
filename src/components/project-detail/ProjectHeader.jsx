import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DirectionFilled,
  WatchlistOff,
  WatchlistOn,
  CalendarIconButton,
  DownChevronIconButton,
  AddIconButton,
} from './icons.jsx';
import {
  mockProject,
  availableStatuses,
  statusTone,
  availableSquads,
  availableComplexity,
  availableTags,
  tagTone,
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
  complexity,
  onComplexityChange,
  tags = [],
  onTagsChange,
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
          rowGap: 4,
          columnGap: 0,
          gridTemplateRows: 'repeat(2, fit-content(100%))',
          // Uniform 168px tracks, no gutter. The multi-select Squad value
          // truncates within its single track; Tags overflow freely.
          gridTemplateColumns: 'repeat(6, 168px)',
        }}
      >
        {/* Labels */}
        <span style={{ ...labelStyle, gridColumn: 1, justifySelf: 'start', alignSelf: 'center' }}>Created on</span>
        <span style={{ ...labelStyle, gridColumn: 2, justifySelf: 'start', alignSelf: 'center' }}>Due date</span>
        <span style={{ ...labelStyle, gridColumn: 3, justifySelf: 'start', alignSelf: 'center' }}>Status</span>
        <span style={{ ...labelStyle, gridColumn: 4, justifySelf: 'start', alignSelf: 'center' }}>Complexity</span>
        <span style={{ ...labelStyle, gridColumn: 5, justifySelf: 'start', alignSelf: 'center' }}>Squad</span>
        <span style={{ ...labelStyle, gridColumn: 6, justifySelf: 'start', alignSelf: 'center' }}>Additional tag</span>

        {/* Values */}
        <span style={{ gridColumn: 1, gridRow: 2, justifySelf: 'start', alignSelf: 'center', minWidth: 0 }}>
          <DateField ariaLabel={`Created on ${fmtDate(createdAt)}`} value={createdAt} onChange={onCreatedAtChange} />
        </span>
        <span style={{ gridColumn: 2, gridRow: 2, justifySelf: 'start', alignSelf: 'center', minWidth: 0 }}>
          <DateField ariaLabel={`Due date ${fmtDate(dueDate)}`} value={dueDate} onChange={onDueDateChange} />
        </span>
        <span style={{ gridColumn: 3, gridRow: 2, justifySelf: 'start', alignSelf: 'center', minWidth: 0 }}>
          <StatusField statusKey={statusKey} onChange={onStatusKeyChange} />
        </span>
        <span style={{ gridColumn: 4, gridRow: 2, justifySelf: 'start', alignSelf: 'center', minWidth: 0 }}>
          <ComplexityField complexity={complexity} onChange={onComplexityChange} />
        </span>
        {/* Squad — multi-select. Truncates within its 168px track, with 12px
            of right padding so the ellipsis lands clear of the next column. */}
        <span style={{ gridColumn: 5, gridRow: 2, justifySelf: 'stretch', alignSelf: 'center', minWidth: 0, overflow: 'hidden', paddingRight: 12 }}>
          <SquadField squads={squads} onChange={onSquadsChange} truncate />
        </span>
        {/* Tag — multi-select. Anchored to col 6 and free to overflow. */}
        <span style={{ gridColumn: 6, gridRow: 2, justifySelf: 'start', alignSelf: 'center', minWidth: 0, overflow: 'visible' }}>
          <TagField tags={tags} onChange={onTagsChange} />
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
function SquadField({ squads, onChange, truncate = false }) {
  function toggleSquad(s) {
    const next = squads.includes(s) ? squads.filter((x) => x !== s) : [...squads, s];
    onChange(next);
  }
  const displayValue = squads.length === 0 ? 'None' : squads.join(', ');
  return (
    <EditableValue
      ariaLabel="Change squads"
      hoverIcon={<DownChevronIconButton size={24} />}
      style={truncate ? { maxWidth: '100%', minWidth: 0 } : undefined}
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
      <span
        style={{
          ...valueStyle,
          ...(truncate
            ? { display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }
            : {}),
        }}
      >
        {displayValue}
      </span>
    </EditableValue>
  );
}

// ── Editable complexity (radio: low / medium / high) ─────────────────────
function ComplexityField({ complexity, onChange }) {
  const current = availableComplexity.find((c) => c.key === complexity);
  return (
    <EditableValue
      ariaLabel="Change complexity"
      hoverIcon={<DownChevronIconButton size={24} />}
      renderPopover={({ anchor, close }) => (
        <FloatingPopover anchor={anchor} onClose={close} width={180}>
          <ListPicker
            items={availableComplexity}
            value={complexity}
            onSelect={(k) => {
              onChange(k);
              close();
            }}
            renderItem={(it) => <span style={{ fontSize: 13, color: 'var(--c-text-primary)' }}>{it.label}</span>}
          />
        </FloatingPopover>
      )}
    >
      <span style={valueStyle}>{current?.label || 'Not set'}</span>
    </EditableValue>
  );
}

// ── Additional tags (max 3) ──────────────────────────────────────────────
// Pills + a hover-reveal + to add. No remove cross — click a pill for a
// Replace / Remove menu, both routed through the same tag picker. The picker
// also lets you filter the preset tags or create a brand-new custom tag.
const TAG_FALLBACK = { bg: '#F1F5F9', fg: '#475569' };

function TagField({ tags, onChange }) {
  const addRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [picker, setPicker] = useState(null); // { anchor, replaceIndex }
  const [ctx, setCtx] = useState(null); // { x, y, index }

  const choices = picker
    ? availableTags.filter((t) => !tags.some((tk, i) => i !== picker.replaceIndex && tk === t.key))
    : [];

  function openAdd() {
    if (tags.length >= 3) return;
    const r = addRef.current?.getBoundingClientRect();
    if (r) setPicker({ anchor: r, replaceIndex: null });
  }
  function openReplace(index, rect) {
    setCtx(null);
    setPicker({ anchor: rect, replaceIndex: index });
  }
  function pick(key) {
    if (picker?.replaceIndex != null) {
      const next = tags.slice();
      next[picker.replaceIndex] = key;
      onChange(next);
    } else if (tags.length < 3 && !tags.includes(key)) {
      onChange([...tags, key]);
    }
    setPicker(null);
  }
  function remove(index) {
    onChange(tags.filter((_, i) => i !== index));
    setCtx(null);
  }

  const canAdd = tags.length < 3;
  return (
    <span
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 28 }}
    >
      {tags.map((key, i) => (
        <TagPill
          key={`${key}-${i}`}
          tagKey={key}
          onActivate={(rect) => setCtx({ x: rect.left, y: rect.bottom + 6, index: i })}
        />
      ))}

      {canAdd && tags.length === 0 && (
        <button
          ref={addRef}
          type="button"
          onClick={openAdd}
          aria-label="Add tag"
          onMouseEnter={(e) => (e.currentTarget.style.background = '#FBF9F8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            padding: '3px 9px 3px 7px',
            borderRadius: 8,
            border: '1px dashed #F1EAE4',
            background: 'transparent',
            color: '#6E5649',
            fontFamily: 'var(--f-sans)',
            fontWeight: 500,
            fontSize: 14,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'background 140ms var(--ease-out)',
          }}
        >
          <span aria-hidden style={{ fontSize: 16, lineHeight: 1, fontWeight: 400 }}>+</span>
          New tag
        </button>
      )}

      {canAdd && tags.length > 0 && (
        <button
          ref={addRef}
          type="button"
          onClick={openAdd}
          aria-label="Add tag"
          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            padding: 0,
            background: 'transparent',
            lineHeight: 0,
            cursor: 'pointer',
            // Only revealed on hover of the whole Additional-tag cell.
            opacity: hovered || picker ? 1 : 0,
            pointerEvents: hovered || picker ? 'auto' : 'none',
            transition: 'opacity 160ms var(--ease-out), transform 160ms var(--ease-out)',
          }}
        >
          <AddIconButton size={24} />
        </button>
      )}

      {picker &&
        createPortal(
          <FloatingPopover anchor={picker.anchor} onClose={() => setPicker(null)} width={220}>
            <TagPicker choices={choices} usedKeys={tags} onPick={pick} />
          </FloatingPopover>,
          document.body
        )}

      {ctx &&
        createPortal(
          <TagContextMenu
            anchor={ctx}
            onClose={() => setCtx(null)}
            onReplace={() => openReplace(ctx.index, { left: ctx.x, right: ctx.x, top: ctx.y, bottom: ctx.y })}
            onRemove={() => remove(ctx.index)}
          />,
          document.body
        )}
    </span>
  );
}

function TagPill({ tagKey, onActivate }) {
  const tag = availableTags.find((t) => t.key === tagKey);
  const tone = tagTone[tagKey] || TAG_FALLBACK;
  const [hover, setHover] = useState(false);
  function activate(e) {
    onActivate(e.currentTarget.getBoundingClientRect());
  }
  return (
    <span
      role="button"
      tabIndex={0}
      aria-haspopup="menu"
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(e);
        }
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      title="Click to replace or remove"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 6,
        background: tone.bg,
        color: tone.fg,
        fontFamily: 'var(--f-sans)',
        fontWeight: 600,
        fontSize: 14,
        lineHeight: '20px',
        letterSpacing: '-0.1px',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: hover ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)' : 'inset 0 0 0 1px transparent',
        transition: 'box-shadow 120ms var(--ease-out)',
      }}
    >
      {tag?.label || tagKey}
    </span>
  );
}

// ── Tag picker (filter + create custom) ──────────────────────────────────
// A search box filters the preset choices as you type. When the query doesn't
// exactly match an existing tag, a "Create <query>" row appears so the user can
// mint a custom tag on the fly. Custom tags use the typed text as both key and
// label and render with the neutral fallback tone.
function TagPicker({ choices, usedKeys, onPick }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const q = query.trim();
  const ql = q.toLowerCase();
  const filtered = q ? choices.filter((t) => t.label.toLowerCase().includes(ql)) : choices;

  // Don't offer "Create" if the text already matches a preset label or an
  // already-applied tag (case-insensitive).
  const matchesExisting =
    availableTags.some((t) => t.label.toLowerCase() === ql) ||
    (usedKeys || []).some((k) => k.toLowerCase() === ql);
  const canCreate = q.length > 0 && !matchesExisting;

  function submit() {
    if (filtered.length) onPick(filtered[0].key);
    else if (canCreate) onPick(q);
  }

  return (
    <div>
      <div style={{ padding: 8, borderBottom: '1px solid var(--c-border-primary)' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Find or create a tag…"
          aria-label="Find or create a tag"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--c-border-primary)',
            background: 'var(--c-surface-inset, #F3F3F6)',
            fontFamily: 'var(--f-sans)',
            fontSize: 13,
            color: 'var(--c-text-primary)',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ maxHeight: 220, overflowY: 'auto', padding: 6 }}>
        {filtered.map((it) => {
          const tone = tagTone[it.key] || TAG_FALLBACK;
          return (
            <TagOption
              key={it.key}
              onClick={() => onPick(it.key)}
              icon={<span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: tone.fg, flexShrink: 0 }} />}
              label={it.label}
            />
          );
        })}

        {canCreate && (
          <TagOption
            onClick={() => onPick(q)}
            icon={
              <span aria-hidden style={{ color: 'var(--c-text-action)', fontSize: 15, lineHeight: 1, fontWeight: 600, width: 8, textAlign: 'center' }}>+</span>
            }
            label={
              <span style={{ color: 'var(--c-text-secondary)' }}>
                Create <strong style={{ color: 'var(--c-text-primary)', fontWeight: 600 }}>“{q}”</strong>
              </span>
            }
          />
        )}

        {!filtered.length && !canCreate && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--c-text-muted)' }}>No more tags</div>
        )}
      </div>
    </div>
  );
}

function TagOption({ onClick, icon, label }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="option"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 6,
        background: hover ? '#F4EEEB' : 'transparent',
        textAlign: 'left',
        transition: 'background 120ms var(--ease-out)',
      }}
    >
      {icon}
      <span style={{ fontSize: 13, color: 'var(--c-text-primary)' }}>{label}</span>
    </button>
  );
}

function TagContextMenu({ anchor, onClose, onReplace, onRemove }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: anchor.x, y: anchor.y });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = anchor.x;
    let y = anchor.y;
    if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
    if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
    setPos({ x, y });
  }, [anchor.x, anchor.y]);
  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
        zIndex: 1000,
        minWidth: 160,
        padding: 6,
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 10,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16), 0 4px 10px rgba(15, 23, 42, 0.08)',
        transformOrigin: 'top left',
        animation: 'flow-pop-out 150ms var(--ease-out) both',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <TagMenuItem label="Replace tag" onClick={onReplace} />
      <TagMenuItem label="Remove tag" tone="danger" onClick={onRemove} />
    </div>
  );
}

function TagMenuItem({ label, onClick, tone }) {
  const [hover, setHover] = useState(false);
  const danger = tone === 'danger';
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex',
        width: '100%',
        padding: '8px 10px',
        borderRadius: 6,
        background: hover ? (danger ? '#FBE7E7' : '#F4EEEB') : 'transparent',
        color: danger ? '#C13B3B' : 'var(--c-text-primary)',
        fontSize: 13,
        fontWeight: 500,
        textAlign: 'left',
        transition: 'background 120ms var(--ease-out)',
      }}
    >
      {label}
    </button>
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
