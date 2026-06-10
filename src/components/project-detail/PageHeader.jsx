import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExpandIcon, ContractIcon, ChevronDown } from './icons.jsx';
import { mockProject } from './mockProject.js';

// Hover color for breadcrumb items — warm brown (#7E5E4E)
const BREADCRUMB_HOVER_FG = '#7E5E4E';

// PageHeader — Figma 729:19530
// ----------------------------
// Left: expand/contract + breadcrumb. Right: dark "Quick actions" button that
// opens a menu (copy link, duplicate, project actions, delete) + a close X.

const crumbTextStyle = {
  fontFamily: 'var(--f-sans)',
  fontWeight: 500,
  fontSize: 14,
  lineHeight: '20px',
  letterSpacing: '-0.1px',
  color: 'var(--c-text-primary)',
  whiteSpace: 'nowrap',
};

export default function PageHeader({ expanded, onToggleExpand, onProjectsClick, onProjectMenuClick, onClose, onQuickAction, projectName = mockProject.name }) {
  const Icon = expanded ? ContractIcon : ExpandIcon;
  const label = expanded ? 'Contract view' : 'Expand view';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '20px 16px 20px 24px',
        background: 'var(--c-surface-primary)',
        borderBottom: '1px solid var(--c-border-primary)',
        fontFamily: 'var(--f-sans)',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-label={label}
        title={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 8,
          color: 'var(--c-text-secondary)',
          background: 'transparent',
          transition:
            'background 160ms var(--ease-interaction), color 160ms var(--ease-interaction), transform 160ms var(--ease-interaction)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--c-surface-secondary)';
          e.currentTarget.style.color = 'var(--c-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--c-text-secondary)';
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Icon size={20} />
      </button>

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <button
          type="button"
          onClick={onProjectsClick}
          style={{ ...crumbTextStyle, padding: 0, background: 'transparent', transition: 'color 160ms var(--ease-out), opacity 160ms var(--ease-out)', opacity: 0.78 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = 1;
            e.currentTarget.style.color = BREADCRUMB_HOVER_FG;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = 0.78;
            e.currentTarget.style.color = 'var(--c-text-primary)';
          }}
        >
          Projects
        </button>

        <span style={{ ...crumbTextStyle, color: 'var(--c-text-muted)' }} aria-hidden>/</span>

        <button
          type="button"
          onClick={onProjectMenuClick}
          style={{ display: 'inline-flex', alignItems: 'center', padding: 0, background: 'transparent', color: 'var(--c-text-primary)', transition: 'color 160ms var(--ease-out)', minWidth: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = BREADCRUMB_HOVER_FG)}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-text-primary)')}
        >
          <span style={{ ...crumbTextStyle, color: 'inherit' }}>{projectName}</span>
        </button>
      </nav>

      {/* Right group */}
      <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <QuickActions onAction={onQuickAction} />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              color: 'var(--c-text-secondary)',
              background: 'transparent',
              transition: 'background 160ms var(--ease-interaction), color 160ms var(--ease-interaction)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-surface-secondary)'; e.currentTarget.style.color = 'var(--c-text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-text-secondary)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Quick actions button + menu ───────────────────────────────────────────
function QuickActions({ onAction }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setAnchor(btnRef.current?.getBoundingClientRect());
    setOpen(true);
  }
  function run(key) {
    onAction?.(key);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-quick-actions-trigger
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 6px 8px 12px',
          borderRadius: 8,
          background: '#280E01',
          color: '#fff',
          fontFamily: 'var(--f-sans)',
          fontWeight: 600,
          fontSize: 14,
          lineHeight: '20px',
          letterSpacing: '-0.1px',
          transition: 'filter 140ms var(--ease-out), transform 140ms var(--ease-out)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.4)')}
        onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Quick actions
        <span style={{ display: 'inline-flex', transition: 'transform 200ms var(--ease-out)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown size={18} />
        </span>
      </button>

      {open && anchor && createPortal(<QuickActionsMenu anchor={anchor} onClose={() => setOpen(false)} onRun={run} />, document.body)}
    </>
  );
}

function QuickActionsMenu({ anchor, onClose, onRun }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = anchor.right - r.width; // right-align under the button
    let top = anchor.bottom + 8;
    if (left < 8) left = 8;
    if (top + r.height > window.innerHeight - 8) top = Math.max(8, anchor.top - r.height - 8);
    setPos({ top, left });
  }, [anchor.left, anchor.right, anchor.bottom, anchor.top]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current?.contains(e.target) || e.target.closest?.('[data-quick-actions-trigger]')) return;
      onClose();
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
        top: pos.top,
        left: pos.left,
        zIndex: 1400,
        width: 232,
        padding: 6,
        background: 'var(--c-surface-primary)',
        borderRadius: 14,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16), 0 4px 10px rgba(15, 23, 42, 0.08)',
        transformOrigin: 'top right',
        animation: 'flow-pop-out 160ms var(--ease-out) both',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <MenuItem icon={<LinkIcn />} label="Copy link" onClick={() => onRun('copy')} />
      <MenuItem icon={<DuplicateIcn />} label="Duplicate project" onClick={() => onRun('duplicate')} />
      <Divider />
      <MenuItem icon={<BlockIcn />} label="Mark as blocked" onClick={() => onRun('block')} />
      <MenuItem icon={<DeprioritizeIcn />} label="De-prioritize" onClick={() => onRun('deprioritize')} />
      <MenuItem icon={<ShipIcn />} label="Ship it" onClick={() => onRun('ship')} />
      <Divider />
      <MenuItem icon={<TrashIcn />} label="Delete project" tone="danger" onClick={() => onRun('delete')} />
    </div>
  );
}

function MenuItem({ icon, label, onClick, tone }) {
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
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 8,
        background: hover ? (danger ? '#FBE7E7' : '#F4EEEB') : 'transparent',
        color: danger ? '#C13B3B' : 'var(--c-text-primary)',
        fontSize: 13,
        fontWeight: 500,
        textAlign: 'left',
        transition: 'background 120ms var(--ease-out)',
      }}
    >
      <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', color: danger ? '#C13B3B' : 'var(--c-text-secondary)' }}>{icon}</span>
      {label}
    </button>
  );
}

function Divider() {
  return <div aria-hidden style={{ height: 1, margin: '4px 6px', background: 'var(--c-border-primary)' }} />;
}

// ── Inline menu icons ─────────────────────────────────────────────────────
const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
function LinkIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...ic}><path d="M7 9a3 3 0 0 0 4.2.2l2-2a3 3 0 0 0-4.2-4.2L7.6 4.4" /><path d="M9 7a3 3 0 0 0-4.2-.2l-2 2a3 3 0 0 0 4.2 4.2l1.4-1.4" /></svg>;
}
function DuplicateIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...ic}><rect x="5.5" y="5.5" width="8" height="8" rx="2" /><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" /></svg>;
}
function BlockIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...ic}><circle cx="8" cy="8" r="5.5" /><path d="M4.1 4.1l7.8 7.8" /></svg>;
}
function DeprioritizeIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...ic}><path d="M8 3v10M4.5 9.5L8 13l3.5-3.5" /></svg>;
}
function ShipIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...ic}><path d="M8 2.5c2.2 1 3.3 3 3.3 5.6 0 .9-.3 1.8-.7 2.6H5.4c-.4-.8-.7-1.7-.7-2.6C4.7 5.5 5.8 3.5 8 2.5Z" /><path d="M6.6 11.7c0 1 .6 1.8 1.4 1.8s1.4-.8 1.4-1.8M8 6.2v.01" /></svg>;
}
function TrashIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...ic}><path d="M3 4.5h10M6.5 4V2.8h3V4M5 4.5l.5 8.2a1 1 0 0 0 1 .9h3a1 1 0 0 0 1-.9L11 4.5" /></svg>;
}
