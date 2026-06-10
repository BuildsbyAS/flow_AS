import { useEffect, useLayoutEffect, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon } from './icons.jsx';
import { mockTeam, mockAvailableMembers } from './mockProject.js';
import PersonDetailSheet from './PersonDetailSheet.jsx';

// TeamSection — Figma 583:12302
// ──────────────────────────────
// Cards hover-highlight (no tooltip/toast). Clicking a member opens a person
// side sheet. Right-click / the picker stay portal'd to <body> so they escape
// the sheet's overflow clip.

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

export default function TeamSection({ initialTeam = mockTeam, availableMembers = mockAvailableMembers }) {
  const [team, setTeam] = useState(initialTeam);
  const [sectionHovered, setSectionHovered] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [sheetPerson, setSheetPerson] = useState(null);

  // context menu
  const [contextMenu, setContextMenu] = useState(null); // { id, x, y }

  // picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);

  const addBtnRef = useRef(null);
  const sectionRef = useRef(null);

  // Close picker / context menu if the sheet scrolls — keeps positions sane.
  useEffect(() => {
    function onScroll() {
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

  function openContextMenu(e, id) {
    e.preventDefault();
    setContextMenu({ id, x: e.clientX, y: e.clientY });
  }
  function closeContextMenu() {
    setContextMenu(null);
  }

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
  const available = availableMembers.filter((m) => !inProject.has(m.id));

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setPickerOpen(false);
      }
    }
    function onDocPointer(e) {
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

  return (
    <section
      ref={sectionRef}
      style={sectionStyle}
      onPointerEnter={() => setSectionHovered(true)}
      onPointerLeave={() => setSectionHovered(false)}
    >
      {/* Header — auto-width, 12px gap, hover-only plus button */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, width: 'fit-content' }}>
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
        <AddButton ref={addBtnRef} visible={addVisible} open={pickerOpen} onClick={togglePicker} />
      </div>

      {/* Cards */}
      <div style={cardsRowStyle}>
        {team.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            hovered={hoveredId === m.id}
            onEnter={() => setHoveredId(m.id)}
            onLeave={() => setHoveredId((h) => (h === m.id ? null : h))}
            onClick={() => setSheetPerson(m)}
            onContextMenu={(e) => openContextMenu(e, m.id)}
          />
        ))}
      </div>

      {/* Picker */}
      {pickerOpen &&
        pickerAnchor &&
        createPortal(
          <Picker anchor={pickerAnchor} available={available} onPick={addMember} />,
          document.body
        )}

      {/* Context menu */}
      {contextMenu &&
        createPortal(
          <ContextMenu
            anchor={contextMenu}
            onProfile={() => {
              const m = team.find((x) => x.id === contextMenu.id);
              if (m) setSheetPerson(m);
              closeContextMenu();
            }}
            onMessage={closeContextMenu}
            onChangeRole={closeContextMenu}
            onRemove={() => {
              removeMember(contextMenu.id);
              closeContextMenu();
            }}
          />,
          document.body
        )}

      {/* Person side sheet */}
      <PersonDetailSheet person={sheetPerson} onClose={() => setSheetPerson(null)} />
    </section>
  );
}

// ── Member card ──────────────────────────────────────────────────────────
function MemberCard({ member, hovered, onEnter, onLeave, onClick, onContextMenu }) {
  return (
    <button
      type="button"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(0.98)';
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = hovered ? 'translateY(-2px)' : 'translateY(0)';
      }}
      style={{
        ...cardBase,
        background: hovered ? WARM_HOVER : 'transparent',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 18px rgba(15, 23, 42, 0.06)' : 'none',
        zIndex: hovered ? 10 : 1,
      }}
      aria-haspopup="dialog"
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
            <span aria-hidden style={{ width: 3, height: 3, borderRadius: 999, background: ROLE_FG, display: 'inline-block', flexShrink: 0 }} />
          )}
        </span>
      ))}
    </span>
  );
}

// ── + button (solid brown bg, cream icon — no hover state on the button) ──
const AddButton = forwardRef(function AddButton({ visible, open, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close picker' : 'Add team member'}
      aria-expanded={open}
      tabIndex={visible ? 0 : -1}
      onPointerDown={(e) => visible && (e.currentTarget.style.transform = 'scale(0.94)')}
      onPointerUp={(e) => visible && (e.currentTarget.style.transform = 'scale(1)')}
      style={{
        width: 24,
        height: 24,
        padding: 0,
        borderRadius: 9999,
        background: '#3D1602',
        color: WARM_BG,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.92)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 160ms var(--ease-out), transform 200ms var(--ease-out)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          transition: 'transform 200ms var(--ease-out)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        <PlusIcon size={14} />
      </span>
    </button>
  );
});

// ── Picker dropdown ──────────────────────────────────────────────────────
function Picker({ anchor, available, onPick }) {
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
          style={{ width: '100%', background: 'transparent', border: 'none', fontFamily: 'var(--f-sans)', fontSize: 13, color: 'var(--c-text-primary)' }}
        />
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', padding: 6 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--c-text-muted)' }}>No matches</div>
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
