import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, ArrowUpRight } from './icons.jsx';

// PersonDetailSheet — a lightweight side sheet that slides in over the project
// sheet when a team member is clicked. Shows identity + contact + roles, plus a
// small mock "Active projects" list.

const WARM_BG = '#FBF9F8';
const WARM_HOVER = '#F4EEEB';
const ROLE_FG = '#6E5649';

const MOCK_PROJECTS = [
  { code: 'X15', name: 'Vendor portal redesign', tone: { bg: '#F5FAFF', fg: '#0F7EFF' }, status: 'In flight' },
  { code: 'P08', name: 'Checkout latency cut', tone: { bg: '#E6FBF1', fg: '#007A4A' }, status: 'Live' },
  { code: 'D21', name: 'Design system v3', tone: { bg: '#FFF7E0', fg: '#B45309' }, status: 'In review' },
];

export default function PersonDetailSheet({ person, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!person) return null;
  const initials = person.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return createPortal(
    <div className="flow-pd" style={{ position: 'fixed', inset: 0, zIndex: 1300, fontFamily: 'var(--f-sans)' }}>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(27, 20, 16, 0.18)', animation: 'flow-tt-fade 160ms var(--ease-out) both' }}
      />

      <aside
        role="dialog"
        aria-label={`${person.name} — profile`}
        className="pd-slide-in"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          bottom: 16,
          width: 'min(46vw, 480px)',
          background: 'var(--c-surface-primary)',
          borderRadius: 20,
          boxShadow: 'var(--sh-glass)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '14px 16px' }}>
          <IconBtn onClick={onClose} label="Close profile">
            <CloseIcon size={14} />
          </IconBtn>
        </div>

        <div className="pd-hscroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 28px 40px' }}>
          {/* Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: WARM_BG,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 22,
                letterSpacing: '-0.4px',
                color: 'var(--c-text-primary)',
              }}
            >
              {initials}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h1 style={{ margin: 0, fontSize: 24, lineHeight: '30px', fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--c-text-primary)' }}>
                {person.name}
              </h1>
              <span style={{ fontSize: 14, color: ROLE_FG }}>{person.roles.join(' · ')}</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <PrimaryBtn href={`mailto:${person.email}`}>Message</PrimaryBtn>
              <GhostBtn>
                View full profile
                <ArrowUpRight size={14} />
              </GhostBtn>
            </div>
          </div>

          {/* Contact */}
          <Section title="Contact">
            <Row label="Email" value={person.email} />
          </Section>

          {/* Roles */}
          <Section title="Roles">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {person.roles.map((r) => (
                <span
                  key={r}
                  style={{ padding: '4px 10px', borderRadius: 999, background: WARM_BG, color: ROLE_FG, fontSize: 12, fontWeight: 500 }}
                >
                  {r}
                </span>
              ))}
            </div>
          </Section>

          {/* Active projects (mock) */}
          <Section title="Active projects">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_PROJECTS.map((p) => (
                <ProjectRow key={p.code} project={p} />
              ))}
            </div>
          </Section>
        </div>
      </aside>
    </div>,
    document.body
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--c-text-tertiary)' }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 13, color: 'var(--c-text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text-primary)' }}>{value}</span>
    </div>
  );
}

function ProjectRow({ project }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 10,
        background: hover ? WARM_HOVER : 'transparent',
        transition: 'background 140ms var(--ease-out)',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-tertiary)', fontVariantNumeric: 'tabular-nums', minWidth: 30 }}>{project.code}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--c-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</span>
      <span style={{ padding: '2px 8px', borderRadius: 6, background: project.tone.bg, color: project.tone.fg, fontSize: 12, fontWeight: 600 }}>{project.status}</span>
    </div>
  );
}

function IconBtn({ children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: WARM_BG,
        color: 'var(--c-text-secondary)',
        transition: 'background 140ms var(--ease-out)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = WARM_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = WARM_BG)}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, href }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '9px 16px',
        borderRadius: 10,
        background: '#3D1602',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        textDecoration: 'none',
        transition: 'filter 140ms var(--ease-out)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
      onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
    >
      {children}
    </a>
  );
}

function GhostBtn({ children }) {
  return (
    <button
      type="button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '9px 14px',
        borderRadius: 10,
        background: WARM_BG,
        color: 'var(--c-text-secondary)',
        fontSize: 13,
        fontWeight: 600,
        transition: 'background 140ms var(--ease-out)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = WARM_HOVER)}
      onMouseLeave={(e) => (e.currentTarget.style.background = WARM_BG)}
    >
      {children}
    </button>
  );
}
