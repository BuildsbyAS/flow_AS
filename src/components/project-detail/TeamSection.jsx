import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon, AddIconButton, ArrowRightIcon } from '../icons.jsx';
import { mockTeam, mockAvailableMembers } from '../../data/mockProject.js';

// TeamSection — Figma 583:12302 + tooltip 607:16032
// ──────────────────────────────────────────────────
// Layout
//   • Header: auto-width <h2>Team</h2> + 12px gap + plus button.
//     Plus button is invisible until the section is hovered (or picker is open),
//     opacity-only so there's zero layout shift on hover.
//   • Cards: flex-wrap, rowGap 8 / columnGap 12 (per user spec).
//
// Stacking fix
//   • Tooltip, picker dropdown, and context menu are all rendered to a portal
//     at document.body with position: fixed. That bypasses both the .flow-hscroll
//     overflow clip and the document-order stacking conflict with ResourcesSection.
//
// Interactions (Emil's framework)
//   • Card hover: 200ms ease-out lift + bg fade (#F4EEEB).
//   • Tooltip (Sonner pattern): 200ms delay on first open, instant on subsequent
//     siblings, 400ms grace before delay resets.
//   • Tooltip stays open while the cursor is inside it OR back on the card —
//     a 160ms close-debounce lets users cross the 8px gap to click the arrow CTA.
//   • Right-click / Ctrl+click → quick-actions menu, transform-origin at pointer.
//   • Press: scale(0.98) on pointerdown.

const WARM_BG = '#FBF9F8';
const WARM_HOVER = '#F4EEEB';
const ROLE_FG = '#6E5649';

const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 12 };

const cardsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  rowGap: 8,
  columnGap: 12,
  alignItems: 'center',
  isolation: 'isolate',
  width: '100%',
};

const cardBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 10px 6px 6px',
  borderRadius: 12,
  background: 'transparent',
  cursor: 'pointer',
  position: 'relative',
  zIndex: 1,
  transition:
    'background 200ms var(--ease-out), transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
};

export default function TeamSection() {
  const [team, setTeam] = useState(mockTeam);
  const [sectionHovered, setSectionHovered] = useState(false);

  // tooltip state
  const [tooltipFor, setTooltipFor] = useState(null); // id
  const [tooltipMode, setTooltipMode] = useState('delayed'); // 'delayed' | 'instant'
  const [tooltipAnchor, setTooltipAnchor] = useState(null); // DOMRect of card
  const [tooltipHovered, setTooltipHovered] = useState(false);
  const openTimer = useRef();
  const closeTimer = useRef();
  const resetTimer = useRef();

  // context menu
  const [contextMenu, setContextMenu] = useState(null); // { id, x, y }

  // picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);

  const addBtnRef = useRef(null);
  const sectionRef = useRef(null);

  // ── Tooltip pacing ──────────────────────────────────────────────────────
  function openTooltip(id, cardEl) {
    clearTimeout(closeTimer.current);
    clearTimeout(resetTimer.current);
    const rect = cardEl.getBoundingClientRect();
    if (tooltipMode === 'instant') {
      setTooltipFor(id);
      setTooltipAnchor(rect);
      return;
    }
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setTooltipFor(id);
      setTooltipAnchor(rect);
      setTooltipMode('instant');
    }, 200);
  }
  function startTooltipClose() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!tooltipHovered) {
        setTooltipFor(null);
        clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setTooltipMode('delayed'), 400);
      }
    }, 160);
  }
  function cancelTooltipClose() {
    clearTimeout(closeTimer.current);
  }

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
      clearTimeout(resetTimer.current);
    },
    []
  );

  // Close tooltip + picker if user scrolls the sheet — keeps positions sane.
  useEffect(() => {
    function onScroll() {
      setTooltipFor(null);
      setPickerOpen(false);
      setContextMenu(null);
    }
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // ── Context menu ────────────────────────────────────────────────────────
  function openContextMenu(e, id) {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
    setTooltipFor(null);
  }
  function closeContextMenu() {
    setContextMenu(null);
  }

  // ── Picker ─────────────────────────────────────────────────────────────
  function togglePicker() {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    const rect = addBtnRef.current?.getBoundingClientRect();
    if (rect) setPickerAnchor(rect);
    setPickerOpen(true);
  }
  function addMember(person) {
    setTeam((t) => [...t, person]);
    setPickerOpen(false);
  }
  function removeMember(id) {
    setTeam((t) => t.filter((m) => m.id !== id));
  }

  const inProject = new Set(team.map((m) => m.id));
  const available = mockAvailableMembers.filter((m) => !inProject.has(m.id));

  // Escape + outside click close
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setPickerOpen(false);
        setTooltipFor(null);
      }
    }
    function onDocPointer(e) {
      // we cannot rely on the section ref because portals are outside it —
      // check by data-tag attributes on the portaled surfaces instead
      const inPortal = e.target.closest?.('[data-team-portal]');
      const inSection = sectionRef.current?.contains(e.target);
      if (!inPortal && !inSection) {
        setContextMenu(null);
        setPickerOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer);
    };
  }, []);

  const addVisible = sectionHovered || pickerOpen;
  const tooltipMember = team.find((m) => m.id === tooltipFor);

  return (
    <section
      ref={sectionRef}
      style={sectionStyle}
      onPointerEnter={() => setSectionHovered(true)}
      onPointerLeave={() => setSectionHovered(false)}
    >
      {/* Header — auto-width, 12px gap, hover-only plus button */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          width: 'fit-content',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--f-sans)',
            fontWeight: 600,
            fontSize: 16,
            lineHeight: '24px',
            letterSpacing: '-0.1px',
            color: 'var(--c-text-primary)',
          }}
        >
          Team
        </h2>

        <AddButton
          ref={addBtnRef}
          visible={addVisible}
          open={pickerOpen}
          onClick={togglePicker}
        />
      </div>

      {/* Cards */}
      <div style={cardsRowStyle}>
        {team.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            isTooltipTarget={tooltipFor === m.id}
            onEnter={(el) => openTooltip(m.id, el)}
            onLeave={() => startTooltipClose()}
            onClick={() => console.info('open profile:', m.name)}
            onContextMenu={(e) => openContextMenu(e, m.id)}
          />
        ))}
      </div>

      {/* Portaled overlays */}
      {tooltipMember &&
        tooltipAnchor &&
        createPortal(
          <Tooltip
            member={tooltipMember}
            anchor={tooltipAnchor}
            instant={tooltipMode === 'instant'}
            onEnter={() => {
              cancelTooltipClose();
              setTooltipHovered(true);
            }}
            onLeave={() => {
              setTooltipHovered(false);
              startTooltipClose();
            }}
            onArrow={() => {
              console.info('open profile via tooltip arrow:', tooltipMember.name);
              setTooltipFor(null);
            }}
          />,
          document.body
        )}

      {pickerOpen &&
        pickerAnchor &&
        createPortal(
          <Picker
            anchor={pickerAnchor}
            available={available}
            onPick={addMember}
            onClose={() => setPickerOpen(false)}
          />,
          document.body
        )}

      {contextMenu &&
        createPortal(
          <ContextMenu
            anchor={contextMenu}
            onClose={closeContextMenu}
            onProfile={() => {
              console.info('view profile');
              closeContextMenu();
            }}
            onMessage={() => {
              console.info('send message');
              closeContextMenu();
            }}
            onChangeRole={() => {
              console.info('change role');
              closeContextMenu();
            }}
            onRemove={() => {
              removeMember(contextMenu.id);
              closeContextMenu();
            }}
          />,
          document.body
        )}
    </section>
  );
}

// ── Member card ──────────────────────────────────────────────────────────
function MemberCard({ member, isTooltipTarget, onEnter, onLeave, onClick, onContextMenu }) {
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      type="button"
      onPointerEnter={() => onEnter(ref.current)}
      onPointerLeave={onLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(0.98)';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = isTooltipTarget ? 'translateY(-2px)' : 'translateY(0)';
      }}
      style={{
        ...cardBase,
        background: isTooltipTarget ? WARM_HOVER : 'transparent',
        transform: isTooltipTarget ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isTooltipTarget ? '0 6px 18px rgba(15, 23, 42, 0.06)' : 'none',
        zIndex: isTooltipTarget ? 10 : 1,
      }}
      aria-haspopup="menu"
    >
      <CardAvatar name={member.name} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 12,
            lineHeight: '16px',
            fontWeight: 500,
            color: 'var(--c-text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          {member.name}
        </span>
        <RoleLine roles={member.roles} />
      </span>
    </button>
  );
}

function CardAvatar({ name }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: WARM_BG,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--f-sans)',
        fontWeight: 600,
        fontSize: 12,
        lineHeight: '16px',
        color: 'var(--c-text-primary)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {initials}
    </span>
  );
}

function RoleLine({ roles }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {roles.map((r, i) => (
        <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--f-sans)',
              fontSize: 12,
              lineHeight: '16px',
              fontWeight: 400,
              color: ROLE_FG,
              whiteSpace: 'nowrap',
            }}
          >
            {r}
          </span>
          {i < roles.length - 1 && (
            <span
              aria-hidden
              style={{
                width: 3,
                height: 3,
                borderRadius: 999,
                background: ROLE_FG,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
          )}
        </span>
      ))}
    </span>
  );
}

// ── Tooltip (Figma 607:16032) ────────────────────────────────────────────
// White surface, drop-shadow 0 2 6 rgba(14,14,14,0.12), radius 10, padding
// 10L 8R 8Y, gap 24. Name + email column, then a small WARM_BG round button
// with an arrow-right inside.
function Tooltip({ member, anchor, instant, onEnter, onLeave, onArrow }) {
  // Anchor below card with 8px gap. Clamp to viewport on the right edge.
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = anchor.left;
    let top = anchor.bottom + 8;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) {
      // flip above if it would overflow bottom
      top = anchor.top - r.height - 8;
    }
    setPos({ top, left });
  }, [anchor.left, anchor.bottom, anchor.top]);

  return (
    <div
      ref={ref}
      role="tooltip"
      data-team-portal
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
        background: 'var(--c-surface-primary)',
        borderRadius: 10,
        padding: '8px 8px 8px 10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 24,
        filter: 'drop-shadow(0px 2px 6px rgba(14, 14, 14, 0.12))',
        transformOrigin: 'top left',
        animation: instant
          ? 'flow-tt-fade 80ms linear both'
          : 'flow-tt-pop 150ms cubic-bezier(0.23, 1, 0.32, 1) both',
      }}
    >
      <span style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 96 }}>
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontWeight: 600,
            fontSize: 14,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: 'var(--c-text-primary)',
            whiteSpace: 'nowrap',
          }}
        >
          {member.name}
        </span>
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontWeight: 400,
            fontSize: 12,
            lineHeight: '20px',
            letterSpacing: '-0.1px',
            color: ROLE_FG,
            whiteSpace: 'nowrap',
          }}
        >
          {member.email}
        </span>
      </span>

      <button
        type="button"
        onClick={onArrow}
        aria-label={`View ${member.name}'s profile`}
        style={{
          width: 24,
          height: 24,
          padding: 0,
          borderRadius: 9999,
          background: 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 160ms var(--ease-out), filter 160ms var(--ease-out)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.96)')}
        onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <ArrowRightIcon size={24} />
      </button>
    </div>
  );
}

// ── + button ─────────────────────────────────────────────────────────────
import { forwardRef } from 'react';
const AddButton = forwardRef(function AddButton({ visible, open, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close picker' : 'Add team member'}
      aria-expanded={open}
      tabIndex={visible ? 0 : -1}
      style={{
        width: 24,
        height: 24,
        padding: 0,
        borderRadius: 9999,
        background: 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        pointerEvents: visible ? 'auto' : 'none',
        transition:
          'opacity 160ms var(--ease-out), transform 200ms var(--ease-out), filter 160ms var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        if (visible) e.currentTarget.style.filter = 'brightness(0.95)';
      }}
      onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
      onPointerDown={(e) => {
        if (visible) e.currentTarget.style.transform = 'scale(0.94)';
      }}
      onPointerUp={(e) => {
        if (visible) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          transition: 'transform 200ms var(--ease-out)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <AddIconButton size={24} />
      </span>
    </button>
  );
});

// ── Picker dropdown ──────────────────────────────────────────────────────
function Picker({ anchor, available, onPick, onClose }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = anchor.left;
    let top = anchor.bottom + 8;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = anchor.top - r.height - 8;
    setPos({ top, left });
  }, [anchor.left, anchor.bottom, anchor.top]);

  const filtered = available.filter(
    (m) =>
      m.name.toLowerCase().includes(q.toLowerCase()) ||
      m.roles.join(' ').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div
      ref={ref}
      role="listbox"
      data-team-portal
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
        width: 300,
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 12,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12), 0 6px 12px rgba(15, 23, 42, 0.06)',
        overflow: 'hidden',
        transformOrigin: 'top left',
        animation: 'flow-pop-out 180ms var(--ease-out) both',
      }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-border-primary)' }}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            fontFamily: 'var(--f-sans)',
            fontSize: 13,
            color: 'var(--c-text-primary)',
          }}
        />
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', padding: 6 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--c-text-muted)' }}>
            No matches
          </div>
        )}
        {filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: 8,
              borderRadius: 8,
              background: 'transparent',
              textAlign: 'left',
              transition: 'background 120ms var(--ease-out)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = WARM_HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <CardAvatar name={m.name} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-primary)' }}>{m.name}</span>
              <span style={{ fontSize: 12, color: ROLE_FG }}>{m.roles.join(' · ')}</span>
            </span>
            <span style={{ marginLeft: 'auto', color: 'var(--c-text-action)' }}>
              <PlusIcon size={14} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Context menu ─────────────────────────────────────────────────────────
function ContextMenu({ anchor, onProfile, onMessage, onChangeRole, onRemove }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: anchor.x, y: anchor.y });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let x = anchor.x;
    let y = anchor.y;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    setPos({ x, y });
  }, [anchor.x, anchor.y]);

  return (
    <div
      ref={ref}
      role="menu"
      data-team-portal
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
        zIndex: 1000,
        minWidth: 200,
        padding: 6,
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 10,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16), 0 4px 10px rgba(15, 23, 42, 0.08)',
        transformOrigin: 'top left',
        animation: 'flow-pop-out 150ms var(--ease-out) both',
      }}
    >
      <MenuItem onClick={onProfile} label="View profile" />
      <MenuItem onClick={onMessage} label="Send message" />
      <MenuItem onClick={onChangeRole} label="Change role" />
      <MenuDivider />
      <MenuItem onClick={onRemove} label="Remove from project" tone="danger" />
    </div>
  );
}

function MenuItem({ onClick, label, tone }) {
  const fg = tone === 'danger' ? '#C13B3B' : 'var(--c-text-primary)';
  const hoverBg = tone === 'danger' ? '#FBE7E7' : WARM_HOVER;
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        width: '100%',
        padding: '8px 10px',
        borderRadius: 6,
        background: 'transparent',
        textAlign: 'left',
        fontSize: 13,
        fontWeight: 500,
        color: fg,
        transition: 'background 120ms var(--ease-out)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div aria-hidden style={{ height: 1, margin: '4px 0', background: 'var(--c-border-primary)' }} />;
}
