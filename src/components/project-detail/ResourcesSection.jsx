import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { forwardRef } from 'react';
import {
  PlusIcon,
  ExternalLinkIcon,
  DeleteIcon,
  FigmaLogo,
  CategoryCool,
  CategoryWarm,
  FilePdf,
  FileDeck,
  FileLink,
  FileData,
  FilePrototype,
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
  sheet: FileData,
  doc: FileDeck,
  prd: FilePdf,
  prototype: FilePrototype,
  link: FileLink,
  custom: CategoryWarm,
  design: CategoryCool,
  'category-cool': CategoryCool,
  'category-warm': CategoryWarm,
};

// The recognised resource buckets. These double as the override chips in the
// add panel AND as the targets `detectResourceType` resolves a pasted link to.
// Order = chip order. `link` is the catch-all and always lives last.
const RESOURCE_TYPES = [
  { key: 'figma', label: 'Design', fallback: 'Design file' },
  { key: 'prototype', label: 'Prototype', fallback: 'Prototype' },
  { key: 'prd', label: 'PRD', fallback: 'PRD' },
  { key: 'doc', label: 'Doc', fallback: 'Document' },
  { key: 'sheet', label: 'Spreadsheet', fallback: 'Spreadsheet' },
  { key: 'link', label: 'Link', fallback: 'Link' },
];

// A string looks like a URL if it has a scheme or a dotted host. Bare text
// (e.g. "Design review notes") is treated as a custom name, not a link.
function isUrlish(v) {
  return /:\/\//.test(v) || /\.[a-z]{2,}(?:[/?#:]|$)/i.test(v);
}

// Turn a free-form input into a canonical href, or '#' when it isn't a link.
function normalizeHref(raw) {
  const v = (raw || '').trim();
  if (!isUrlish(v)) return '#';
  try {
    return new URL(v.includes('://') ? v : `https://${v}`).href;
  } catch {
    return '#';
  }
}

// Smart type detection — figures out whether a pasted link (or filename) is a
// design file, prototype, PRD, doc, spreadsheet, or just a generic link.
// Order matters: prototype is checked before design (Figma proto shares the
// figma.com host), and the PRD keyword sweep runs before the generic doc host
// list so "…/product-spec" lands on PRD rather than Doc.
function detectResourceType(raw) {
  const v = (raw || '').trim();
  if (!v) return null;

  let host = '';
  let path = '';
  if (isUrlish(v)) {
    try {
      const u = new URL(v.includes('://') ? v : `https://${v}`);
      host = u.hostname.replace(/^www\./, '').toLowerCase();
      path = (u.pathname + u.search + u.hash).toLowerCase();
    } catch {
      path = v.toLowerCase();
    }
  } else {
    // Bare filename like "Q3 PRD.pdf" — match on the text alone.
    path = v.toLowerCase();
  }

  const hp = host + path;
  const ext = (path.match(/\.([a-z0-9]+)(?:[?#:]|$)/) || [])[1] || '';

  // Prototype — interactive/clickable artefacts.
  if (
    /\/proto(?:type)?(?:[/?#]|$)/.test(path) ||
    /\bprototype\b/.test(path) ||
    host.includes('framer') ||
    host.includes('invision') ||
    host.includes('marvelapp') ||
    host === 'proto.io' ||
    host.includes('protopie') ||
    host.includes('principle')
  ) return 'prototype';

  // Design files.
  if (
    host.includes('figma.com') ||
    host.includes('sketch.com') ||
    host.includes('zeplin.io') ||
    host.includes('abstract.com') ||
    ['fig', 'sketch', 'xd', 'psd', 'ai'].includes(ext)
  ) return 'figma';

  // Spreadsheets.
  if (
    /docs\.google\.com\/spreadsheets/.test(hp) ||
    host.includes('sheets.google') ||
    host.includes('airtable.com') ||
    host.includes('smartsheet.com') ||
    ['csv', 'tsv', 'xls', 'xlsx', 'numbers'].includes(ext)
  ) return 'sheet';

  // PRD — semantic keyword sweep (works regardless of host). Boundaries are
  // "any non-alphanumeric" so we catch prd/spec across -, _, /, +, spaces, dots
  // without false-firing on substrings ("respect", "inspector").
  if (PRD_KEYWORDS.test(hp)) return 'prd';

  // Docs & decks.
  if (
    /docs\.google\.com\/(?:document|presentation)/.test(hp) ||
    host.includes('notion.so') ||
    host.includes('notion.site') ||
    host.includes('coda.io') ||
    host.includes('quip.com') ||
    host.includes('confluence') ||
    host.includes('atlassian.net') ||
    (host.includes('dropbox.com') && /paper/.test(path)) ||
    ['doc', 'docx', 'rtf', 'txt', 'md', 'pdf', 'ppt', 'pptx', 'key', 'pages'].includes(ext)
  ) return 'doc';

  // Anything else is just a link (or, if it isn't a URL, a custom name).
  return 'link';
}

// PRD keyword test. Leading boundary consumes a non-alnum char (or start);
// trailing boundary is a lookahead so it never eats the next separator.
const PRD_KEYWORDS = /(?:^|[^a-z0-9])(?:prd|spec|specification|requirements?|brief|rfc|one[\s_-]?pager)(?=[^a-z0-9]|$)/;

// Detect a resource type from a *file* (drop / upload). Files are matched on
// their extension — never routed through URL parsing, where a name like
// "report.ai" would be mistaken for an .ai design file vs an .ai domain.
function detectFileType(name) {
  const lower = String(name || '').toLowerCase();
  const ext = (lower.match(/\.([a-z0-9]+)$/) || [])[1] || '';
  if (['fig', 'sketch', 'xd', 'psd', 'ai'].includes(ext)) return 'figma';
  if (['csv', 'tsv', 'xls', 'xlsx', 'numbers'].includes(ext)) return 'sheet';
  if (PRD_KEYWORDS.test(lower)) return 'prd';
  if (['doc', 'docx', 'rtf', 'txt', 'md', 'pdf', 'ppt', 'pptx', 'key', 'pages'].includes(ext)) return 'doc';
  return 'link';
}

// Path segments that carry no human meaning — skip them when guessing a title.
const GENERIC_SEGMENTS = new Set([
  'edit', 'view', 'd', 'file', 'design', 'proto', 'document', 'presentation',
  'spreadsheets', 'spreadsheet', 'folders', 'drive', 'u', 'home', 's', 'p',
  'wiki', 'pages', 'dashboard', 'docs', 'doc',
]);

// Derive a readable title from a link, falling back to the type's label when
// the URL has nothing human-friendly to offer (e.g. a Notion id, /d/<id>/edit).
function smartTitle(raw, type) {
  const def = RESOURCE_TYPES.find((t) => t.key === type);
  const fallback = def?.fallback || 'Resource';
  const v = (raw || '').trim();

  if (!isUrlish(v)) return v ? v.slice(0, 48) : fallback;

  let u;
  try {
    u = new URL(v.includes('://') ? v : `https://${v}`);
  } catch {
    return v.slice(0, 48) || fallback;
  }

  const segs = u.pathname.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const seg = decodeURIComponent(segs[i]);
    if (GENERIC_SEGMENTS.has(seg.toLowerCase())) continue;
    // Drop a trailing Notion-style hex id, then normalise separators (slugs use
    // "-"/"_", Confluence encodes spaces as "+").
    const cleaned = seg.replace(/[-_][0-9a-f]{8,}$/i, '').replace(/[-_+]+/g, ' ').trim();
    if (!cleaned) continue;
    // A slug splits into words (has a space); an opaque id stays one token.
    // Skip bare numbers and long random single tokens (Google/Drive ids).
    const single = !/\s/.test(cleaned);
    if (single && /^\d+$/.test(cleaned)) continue;
    if (single && cleaned.length >= 16 && /\d/.test(cleaned)) continue;
    return cleaned.length > 48 ? `${cleaned.slice(0, 47)}…` : cleaned;
  }

  return fallback;
}

export default function ResourcesSection({ resources: initialResources = mockResources }) {
  const [resources, setResources] = useState(initialResources);
  const [sectionHovered, setSectionHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const [menu, setMenu] = useState(null); // { id, x, y }

  const addBtnRef = useRef(null);
  const sectionRef = useRef(null);

  function removeResource(id) {
    setResources((r) => r.filter((x) => x.id !== id));
  }
  function updateResource(id, patch) {
    setResources((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function openPicker(rect) {
    if (rect) setPickerAnchor(rect);
    setPickerOpen(true);
  }
  function togglePicker() {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    openPicker(addBtnRef.current?.getBoundingClientRect());
  }
  function addResource({ type, title, href }) {
    const def = RESOURCE_TYPES.find((t) => t.key === type);
    setResources((r) => [
      ...r,
      { id: `r-${Date.now()}`, href: href || '#', type, title: title || def?.fallback || 'New resource' },
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
    function onScroll(e) {
      // Ignore scrolls that come from inside the panel itself — e.g. pasting a
      // long URL scrolls the input horizontally and would otherwise close it.
      const t = e?.target;
      if (t?.closest?.('[data-resources-portal]') || sectionRef.current?.contains?.(t)) return;
      setPickerOpen(false);
    }
    function onResize() {
      setPickerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
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

      {/* Cards — wrap, gap 8 row / 12 col. A persistent "New resource" card
          trails the list (and is the whole view when empty). */}
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
          <ResourceCard
            key={r.id}
            resource={r}
            onDelete={() => removeResource(r.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ id: r.id, x: e.clientX, y: e.clientY });
            }}
          />
        ))}
        {resources.length === 0 && <NewResourceCard onOpen={openPicker} />}
      </div>

      {pickerOpen &&
        pickerAnchor &&
        createPortal(
          <AddResourcePanel anchor={pickerAnchor} onAdd={addResource} onClose={() => setPickerOpen(false)} />,
          document.body
        )}

      {menu &&
        resources.some((x) => x.id === menu.id) &&
        createPortal(
          <ResourceMenu
            anchor={menu}
            resource={resources.find((x) => x.id === menu.id)}
            onClose={() => setMenu(null)}
            onChangeLink={(href) => {
              // Re-detect the type from the new link, but only adopt a
              // confident guess — never downgrade a known type to a bare link.
              const detected = detectResourceType(href);
              const patch = { href };
              if (detected && detected !== 'link') patch.type = detected;
              updateResource(menu.id, patch);
              setMenu(null);
            }}
            onDelete={() => {
              removeResource(menu.id);
              setMenu(null);
            }}
          />,
          document.body
        )}
    </section>
  );
}

// ── Resource card ────────────────────────────────────────────────────────
function ResourceCard({ resource, onDelete, onContextMenu }) {
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
      }}
      onContextMenu={onContextMenu}
      title="Right-click for options"
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
        border: 'none',
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

      {/* Hover actions — delete then open-external (Figma 907:17472 / 907:17470).
          Delete sits 6px to the left of the external-link icon. */}
      <div
        style={{
          position: 'absolute',
          top: 7,
          right: 7,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          opacity: hover ? 1 : 0,
          transform: hover ? 'translateY(0)' : 'translateY(-2px)',
          transition: 'opacity 160ms var(--ease-out), transform 160ms var(--ease-out)',
          pointerEvents: hover ? 'auto' : 'none',
        }}
      >
        <DeleteAction onDelete={onDelete} />
        {/* External link is decorative — clicking the card already opens it. */}
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3D1602',
            pointerEvents: 'none',
          }}
        >
          <ExternalLinkIcon size={18} />
        </span>
      </div>
    </a>
  );
}

// Delete affordance on a card. A span (not a <button>) so it's valid inside the
// card's <a>; it swallows the click so the link never fires.
function DeleteAction({ onDelete }) {
  const [hover, setHover] = useState(false);
  function trigger(e) {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.();
  }
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Delete resource"
      title="Delete resource"
      onClick={trigger}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') trigger(e);
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        width: 18,
        height: 18,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: hover ? '#C13B3B' : '#3D1602',
        cursor: 'pointer',
        transition: 'color 140ms var(--ease-out)',
      }}
    >
      <DeleteIcon size={18} />
    </span>
  );
}

// ── + button (mirrors Team; solid brown bg, cream icon — no hover state) ──
const AddButton = forwardRef(function AddButton({ visible, open, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close picker' : 'Add resource'}
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

// ── Empty / add-resource card (dashed) ───────────────────────────────────
function NewResourceCard({ onOpen }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen(ref.current?.getBoundingClientRect())}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px 10px 12px',
        border: `1px dashed ${hover ? '#3D1602' : '#F1EAE4'}`,
        borderRadius: 10,
        background: hover ? WARM_BG : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 160ms var(--ease-out), background 160ms var(--ease-out), transform 160ms var(--ease-out)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: WARM_BG,
          color: '#3D1602',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PlusIcon size={20} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
        <span style={{ fontFamily: 'var(--f-sans)', fontSize: 12, fontWeight: 500, lineHeight: '16px', color: 'var(--c-text-primary)', whiteSpace: 'nowrap' }}>
          Add a resource
        </span>
        <span style={{ fontFamily: 'var(--f-sans)', fontSize: 12, fontWeight: 400, lineHeight: '16px', color: '#6E5649', whiteSpace: 'nowrap' }}>
          Paste a link — we’ll detect the type
        </span>
      </span>
    </button>
  );
}

// ── Resource right-click menu (Change link · Delete) ─────────────────────
function ResourceMenu({ anchor, resource, onClose, onChangeLink, onDelete }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [view, setView] = useState('menu');
  const [link, setLink] = useState(resource?.href && resource.href !== '#' ? resource.href : '');
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
  }, [anchor.x, anchor.y, view]);

  useEffect(() => {
    if (view === 'link') inputRef.current?.focus();
  }, [view]);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    function onScroll() {
      onClose();
    }
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  if (!resource) return null;

  return (
    <div
      ref={ref}
      data-resources-portal
      role="menu"
      style={{
        position: 'fixed',
        top: pos.y,
        left: pos.x,
        zIndex: 1000,
        width: view === 'link' ? 280 : 196,
        padding: view === 'link' ? 10 : 6,
        background: 'var(--c-surface-primary)',
        borderRadius: 14,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16), 0 4px 10px rgba(15, 23, 42, 0.08)',
        transformOrigin: 'top left',
        animation: 'flow-pop-out 150ms var(--ease-out) both',
        fontFamily: 'var(--f-sans)',
      }}
    >
      {view === 'menu' ? (
        <>
          <ResMenuRow icon={<LinkIcn />} label="Change link" onClick={() => setView('link')} />
          <div aria-hidden style={{ height: 1, margin: '4px 6px', background: 'var(--c-border-primary)' }} />
          <ResMenuRow icon={<TrashIcn />} label="Delete resource" tone="danger" onClick={onDelete} />
        </>
      ) : (
        <div>
          <input
            ref={inputRef}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && link.trim() && onChangeLink(link.trim())}
            placeholder="Paste a link"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--c-border-primary)',
              background: WARM_BG,
              fontFamily: 'var(--f-sans)',
              fontSize: 13,
              color: 'var(--c-text-primary)',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setView('menu')}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: WARM_BG, color: 'var(--c-text-secondary)', fontSize: 13, fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onChangeLink(link.trim())}
              disabled={!link.trim()}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                background: link.trim() ? '#3D1602' : 'var(--c-border-strong)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: link.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResMenuRow({ icon, label, onClick, tone }) {
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
        background: hover ? (danger ? '#FBE7E7' : WARM_HOVER) : 'transparent',
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

const resIc = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
function LinkIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...resIc}><path d="M7 9a3 3 0 0 0 4.2.2l2-2a3 3 0 0 0-4.2-4.2L7.6 4.4" /><path d="M9 7a3 3 0 0 0-4.2-.2l-2 2a3 3 0 0 0 4.2 4.2l1.4-1.4" /></svg>;
}
function TrashIcn() {
  return <svg width="15" height="15" viewBox="0 0 16 16" {...resIc}><path d="M3 4.5h10M6.5 4V2.8h3V4M5 4.5l.5 8.2a1 1 0 0 0 1 .9h3a1 1 0 0 0 1-.9L11 4.5" /></svg>;
}

// ── Add-resource panel ────────────────────────────────────────────────────
// Link-first: paste anything and the type is detected live. Chips below show
// the guess and let the user override it; files are detected the same way.
function AddResourcePanel({ anchor, onAdd, onClose }) {
  const ref = useRef(null);
  const fileRef = useRef(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });
  const [link, setLink] = useState('');
  const [type, setType] = useState('link'); // only used once `manual` is true
  const [manual, setManual] = useState(false); // did the user override the guess?
  const [dragOver, setDragOver] = useState(false);

  const trimmed = link.trim();
  const detected = trimmed ? detectResourceType(trimmed) : null;
  // Active type = the user's pick if they overrode, else the live guess.
  const activeType = manual ? type : detected || 'link';
  const typeDef = RESOURCE_TYPES.find((t) => t.key === activeType) || RESOURCE_TYPES[RESOURCE_TYPES.length - 1];
  const DetectedIcon = TYPE_ICON[activeType] || FileLink;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = anchor.left;
    let top = anchor.bottom + 8;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (left < 8) left = 8;
    if (top + r.height > window.innerHeight - 8) top = Math.max(8, anchor.top - r.height - 8);
    setPos({ top, left });
  }, [anchor.left, anchor.bottom, anchor.top]);

  function onLinkChange(v) {
    setLink(v);
    if (!v.trim()) setManual(false); // cleared → resume auto-detect
  }
  function pickType(key) {
    setManual(true);
    setType(key);
  }
  function submitLink() {
    if (!trimmed) return;
    onAdd({ type: activeType, title: smartTitle(trimmed, activeType), href: normalizeHref(trimmed) });
  }
  function onFiles(list) {
    const file = list && list[0];
    if (!file) {
      onAdd({ type: activeType, title: typeDef?.fallback, href: '#' });
      return;
    }
    const fileType = manual ? type : detectFileType(file.name);
    onAdd({
      type: fileType,
      title: file.name.replace(/\.[a-z0-9]+$/i, ''),
      href: '#',
    });
  }

  return (
    <div
      ref={ref}
      data-resources-portal
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
        width: 320,
        background: 'var(--c-surface-primary)',
        borderRadius: 16,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12), 0 6px 12px rgba(15, 23, 42, 0.06)',
        padding: 14,
        transformOrigin: 'top left',
        animation: 'flow-pop-out 180ms var(--ease-out) both',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)', marginBottom: 10 }}>Add resource</div>

      {/* Link input — the smart entry point */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          autoFocus
          value={link}
          onChange={(e) => onLinkChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitLink()}
          placeholder="Paste a link"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--c-border-primary)',
            background: WARM_BG,
            fontFamily: 'var(--f-sans)',
            fontSize: 13,
            color: 'var(--c-text-primary)',
          }}
        />
        <button
          type="button"
          onClick={submitLink}
          disabled={!trimmed}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: trimmed ? '#3D1602' : 'var(--c-border-strong)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: trimmed ? 'pointer' : 'not-allowed',
            transition: 'background 140ms var(--ease-out)',
          }}
        >
          Add
        </button>
      </div>

      {/* Detection read-out — only once there's a link, so the empty state stays clean */}
      {trimmed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            margin: '8px 2px 10px',
            fontSize: 11.5,
            color: '#6E4A36',
          }}
        >
          <DetectedIcon size={14} />
          <span>
            {manual ? 'Saving as' : 'Looks like a'}{' '}
            <strong style={{ fontWeight: 600, color: 'var(--c-text-primary)' }}>{typeDef?.fallback}</strong>
          </span>
        </div>
      )}

      {/* Type chips — confirm or override the guess */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: trimmed ? '0 0 12px' : '10px 0 12px' }}>
        {RESOURCE_TYPES.map((t) => {
          const Icon = TYPE_ICON[t.key];
          const on = t.key === activeType;
          const auto = on && !manual && !!trimmed;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => pickType(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px 5px 8px',
                borderRadius: 999,
                border: `1px solid ${on ? '#3D1602' : 'var(--c-border-primary)'}`,
                background: on ? '#FBF1EC' : '#fff',
                color: 'var(--c-text-primary)',
                fontSize: 12,
                fontWeight: 500,
                boxShadow: auto ? '0 0 0 2px rgba(61, 22, 2, 0.12)' : 'none',
                transition: 'border-color 120ms var(--ease-out), background 120ms var(--ease-out), box-shadow 120ms var(--ease-out)',
              }}
            >
              {Icon && <Icon size={14} />}
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px', color: 'var(--c-text-muted)', fontSize: 11 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--c-border-primary)' }} />
        or
        <span style={{ flex: 1, height: 1, background: 'var(--c-border-primary)' }} />
      </div>

      {/* Drop zone / upload */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          padding: '16px 12px',
          borderRadius: 10,
          border: `1px dashed ${dragOver ? '#3D1602' : '#E0D7D0'}`,
          background: dragOver ? '#FBF1EC' : WARM_BG,
          cursor: 'pointer',
          transition: 'border-color 140ms var(--ease-out), background 140ms var(--ease-out)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-primary)' }}>Drag a file here, or click to upload</span>
        <span style={{ fontSize: 11, color: 'var(--c-text-tertiary)', letterSpacing: '0.2px' }}>PDF, XML, DOC, PPT</span>
      </button>
      <input ref={fileRef} type="file" hidden onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
