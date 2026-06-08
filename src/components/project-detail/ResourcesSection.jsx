import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { forwardRef } from 'react';
import {
  PlusIcon,
  AddIconButton,
  ExternalLinkIcon,
  FigmaLogo,
  CategoryCool,
  CategoryWarm,
} from './icons.jsx';
import { mockResources } from './mockProject.js';

// ResourcesSection — Figma 583:12341
// ──────────────────────────────────
// Header: auto-width "Resources" + 12px gap + hover-only plus button.
// Cards: flex-wrap, rowGap 8 / columnGap 12 (no z-stacking).
// Each card: 200×auto, bg #FBF9F8, 1px white border, radius 10, padding 10/16/10/12.
// Inside: icon-group (24×24 white tile + 18px type icon) then a Geist Regular 14/20
// title. An "open external" 18px icon appears top-right ONLY on card hover.
// Motion: 200ms ease-out on bg + transform, scale(0.98) on press, never scale(0).

const WARM_BG = '#FBF9F8';
const WARM_HOVER = '#F4EEEB';

const TYPE_ICON = {
  figma: FigmaLogo,
  'category-cool': CategoryCool,
  'category-warm': CategoryWarm,
};

const ADD_OPTIONS = [
  { key: 'figma', label: 'Connect Figma file', hint: 'Paste a figma.com URL' },
  { key: 'upload', label: 'Upload file', hint: 'PDF, deck, image, doc' },
  { key: 'link', label: 'Add link', hint: 'Linear, Notion, doc URL' },
];

export default function ResourcesSection({ resources: initialResources = mockResources }) {
  const [resources, setResources] = useState(initialResources);
  const [sectionHovered, setSectionHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);

  const addBtnRef = useRef(null);
  const sectionRef = useRef(null);

  function togglePicker() {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    const rect = addBtnRef.current?.getBoundingClientRect();
    if (rect) setPickerAnchor(rect);
    setPickerOpen(true);
  }
  function addResource(key) {
    const samples = {
      figma: { type: 'figma', title: 'New Figma file' },
      upload: { type: 'category-cool', title: 'Untitled doc' },
      link: { type: 'category-warm', title: 'External link' },
    };
    const sample = samples[key] || samples.link;
    setResources((r) => [
      ...r,
      { id: `r-${Date.now()}`, href: '#', ...sample },
    ]);
    setPickerOpen(false);
  }

  // Outside-click + escape close
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setPickerOpen(false);
    }
    function onDocPointer(e) {
      const inPortal = e.target.closest?.('[data-resources-portal]');
      const inSection = sectionRef.current?.contains(e.target);
      if (!inPortal && !inSection) setPickerOpen(false);
    }
    function onScroll() {
      setPickerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const addVisible = sectionHovered || pickerOpen;

  return (
    <section
      ref={sectionRef}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      onPointerEnter={() => setSectionHovered(true)}
      onPointerLeave={() => setSectionHovered(false)}
    >
      {/* Header */}
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
          Resources
        </h2>

        <AddButton
          ref={addBtnRef}
          visible={addVisible}
          open={pickerOpen}
          onClick={togglePicker}
        />
      </div>

      {/* Cards — wrap, gap 8 row / 12 col */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: 8,
          columnGap: 12,
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {resources.map((r) => (
          <ResourceCard key={r.id} resource={r} />
        ))}
      </div>

      {pickerOpen &&
        pickerAnchor &&
        createPortal(
          <AddPicker anchor={pickerAnchor} onPick={addResource} onClose={() => setPickerOpen(false)} />,
          document.body
        )}
    </section>
  );
}

// ── Resource card ────────────────────────────────────────────────────────
function ResourceCard({ resource }) {
  const [hover, setHover] = useState(false);
  const Icon = TYPE_ICON[resource.type] || CategoryCool;

  return (
    <a
      href={resource.href || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        // demo only — don't actually navigate
        if (resource.href === '#') e.preventDefault();
        console.info('open resource:', resource.title);
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'translateY(-1px) scale(0.99)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = hover ? 'translateY(-2px)' : 'translateY(0)')}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        justifyContent: 'center',
        width: 200,
        padding: '10px 16px 10px 12px',
        background: hover ? WARM_HOVER : WARM_BG,
        border: '1px solid #FFFFFF',
        borderRadius: 10,
        textDecoration: 'none',
        color: 'inherit',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover ? '0 6px 18px rgba(15, 23, 42, 0.06)' : 'none',
        transition:
          'background 200ms var(--ease-out), transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
        <span
          aria-hidden
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Icon size={18} />
        </span>
        <span
          style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 14,
            lineHeight: '20px',
            fontWeight: 400,
            letterSpacing: '-0.1px',
            color: 'var(--c-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {resource.title}
        </span>
      </div>

      {/* "Open external" — hover-only, top-right (Figma ExternalLinkIcon) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 7,
          right: 7,
          width: 18,
          height: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3D1602',
          opacity: hover ? 1 : 0,
          transform: hover ? 'translateY(0)' : 'translateY(-2px)',
          transition: 'opacity 160ms var(--ease-out), transform 160ms var(--ease-out)',
          pointerEvents: 'none',
        }}
      >
        <ExternalLinkIcon size={18} />
      </span>
    </a>
  );
}

// ── + button (mirrors Team) ──────────────────────────────────────────────
const AddButton = forwardRef(function AddButton({ visible, open, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close picker' : 'Add resource'}
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
function AddPicker({ anchor, onPick }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });

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

  return (
    <div
      ref={ref}
      role="menu"
      data-resources-portal
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
        width: 260,
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 12,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12), 0 6px 12px rgba(15, 23, 42, 0.06)',
        padding: 6,
        transformOrigin: 'top left',
        animation: 'flow-pop-out 180ms var(--ease-out) both',
      }}
    >
      {ADD_OPTIONS.map((opt) => (
        <PickerItem key={opt.key} opt={opt} onClick={() => onPick(opt.key)} />
      ))}
    </div>
  );
}

function PickerItem({ opt, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 6,
        background: hover ? WARM_HOVER : 'transparent',
        transition: 'background 120ms var(--ease-out)',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-primary)' }}>
        {opt.label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--c-text-tertiary)' }}>{opt.hint}</span>
    </button>
  );
}
