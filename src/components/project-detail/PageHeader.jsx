import { ExpandIcon, ContractIcon, ChevronDown } from '../icons.jsx';
import { mockProject } from '../../data/mockProject.js';

// PageHeader
// ----------
// 28px horizontal padding (per spec).
// Left group: expand/contract icon button + breadcrumb.
// Breadcrumb mirrors Figma node 564:11354 exactly:
//   "Projects / Vendor portal redesign ⌄"
//   - Geist Medium 14/20, -0.1px tracking, #1d2539
//   - 8px gap between primary items, 2px gap before the chevron

const crumbTextStyle = {
  fontFamily: 'var(--f-sans)',
  fontWeight: 500,
  fontSize: 14,
  lineHeight: '20px',
  letterSpacing: '-0.1px',
  color: 'var(--c-text-primary)',
  whiteSpace: 'nowrap',
};

export default function PageHeader({ expanded, onToggleExpand, onProjectsClick, onProjectMenuClick }) {
  const Icon = expanded ? ContractIcon : ExpandIcon;
  const label = expanded ? 'Contract view' : 'Expand view';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 28px',
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

      <nav
        aria-label="Breadcrumb"
        style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
      >
        <button
          type="button"
          onClick={onProjectsClick}
          style={{
            ...crumbTextStyle,
            padding: 0,
            background: 'transparent',
            transition: 'opacity 160ms var(--ease-interaction)',
            opacity: 0.72,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.72)}
        >
          Projects
        </button>

        <span style={{ ...crumbTextStyle, color: 'var(--c-text-muted)' }} aria-hidden>
          /
        </span>

        <button
          type="button"
          onClick={onProjectMenuClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: 0,
            background: 'transparent',
            color: 'var(--c-text-primary)',
            transition: 'color 160ms var(--ease-interaction)',
            minWidth: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--c-text-action)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-text-primary)')}
          aria-haspopup="menu"
        >
          <span style={{ ...crumbTextStyle, color: 'inherit' }}>{mockProject.name}</span>
          <span
            style={{
              display: 'inline-flex',
              transition: 'transform 200ms var(--ease-interaction)',
              color: 'currentColor',
            }}
          >
            <ChevronDown size={18} />
          </span>
        </button>
      </nav>
    </div>
  );
}
