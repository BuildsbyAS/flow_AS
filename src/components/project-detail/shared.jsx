// Shared primitives — buttons, avatars, tags. Mirrors PM repo's shared.jsx style.

export function IconBtn({ children, onClick, tone = 'ghost', size = 28, ariaLabel, active = false, title }) {
  const tones = {
    ghost: { bg: 'transparent', fg: 'var(--c-text-secondary)', hover: 'var(--c-surface-tertiary)' },
    soft: { bg: 'var(--c-surface-secondary)', fg: 'var(--c-text-secondary)', hover: 'var(--c-surface-tertiary)' },
    action: { bg: 'var(--c-text-action)', fg: 'var(--c-text-on-action)', hover: '#0a4dd4' },
    actionSoft: { bg: '#E8F0FF', fg: 'var(--c-text-action)', hover: '#D7E4FF' },
    activeBookmark: { bg: '#FFF7E0', fg: '#F59E0B', hover: '#FFEFC2' },
  };
  const t = tones[tone];
  return (
    <button
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size >= 32 ? 10 : 8,
        background: t.bg,
        color: t.fg,
        transition: 'background 160ms var(--ease-interaction), transform 160ms var(--ease-interaction)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = t.bg)}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  );
}

export function Btn({ children, onClick, tone = 'soft', icon }) {
  const tones = {
    soft: { bg: 'var(--c-surface-secondary)', fg: 'var(--c-text-secondary)', hover: 'var(--c-surface-tertiary)' },
    action: { bg: 'var(--c-text-action)', fg: 'var(--c-text-on-action)', hover: '#0a4dd4' },
    ghost: { bg: 'transparent', fg: 'var(--c-text-secondary)', hover: 'var(--c-surface-tertiary)' },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 8,
        background: t.bg,
        color: t.fg,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '-0.05px',
        transition: 'background 160ms var(--ease-interaction)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = t.bg)}
    >
      {icon}
      {children}
    </button>
  );
}

const avatarPalette = [
  ['#FFE3CC', '#9A4D00'],
  ['#D9E8FF', '#0F47CC'],
  ['#DCFCE7', '#00744A'],
  ['#FCE7F3', '#9D174D'],
  ['#EDE9FE', '#5B21B6'],
  ['#FEF3C7', '#92400E'],
  ['#E0F2FE', '#075985'],
];

export function Avatar({ name, size = 36, radius = 10, ring = false }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarPalette.length;
  const [bg, fg] = avatarPalette[idx];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        color: fg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size <= 28 ? 11 : 12,
        fontWeight: 600,
        letterSpacing: '0.2px',
        boxShadow: ring ? '0 0 0 2px var(--c-surface-primary)' : 'none',
        flexShrink: 0,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

export function SectionHead({ title, right, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--c-text-primary)', letterSpacing: '-0.2px' }}>{title}</span>
        {count != null && (
          <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
            {count}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

export function StatusBadge({ label = 'In flight', tone = 'inflight' }) {
  const tones = {
    inflight: { bg: 'var(--c-inflight-bg)', fg: 'var(--c-inflight-fg)' },
    live: { bg: '#E6FBF1', fg: '#007A4A' },
    paused: { bg: '#FEF3C7', fg: '#92400E' },
  };
  const t = tones[tone] || tones.inflight;
  return (
    <span
      className="flow-chip"
      style={{ background: t.bg, color: t.fg, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: t.fg,
          display: 'inline-block',
        }}
        className="flow-pulse-dot"
      />
      {label}
    </span>
  );
}
