import { ExpandIcon, ContractIcon } from '../icons.jsx';
import { mockProject } from '../../data/mockProject.js';

// Hover color for breadcrumb items — warm brown (#7E5E4E)
const BREADCRUMB_HOVER_FG = '#7E5E4E';

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
            transition: 'color 160ms var(--ease-out), opacity 160ms var(--ease-out)',
            opacity: 0.78,
          }}
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

        <span style={{ ...crumbTextStyle, color: 'var(--c-text-muted)' }} aria-hidden>
          /
        </span>

        <button
          type="button"
          onClick={onProjectMenuClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: 0,
            background: 'transparent',
            color: 'var(--c-text-primary)',
            transition: 'color 160ms var(--ease-out)',
            minWidth: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = BREADCRUMB_HOVER_FG)}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--c-text-primary)')}
        >
          <span style={{ ...crumbTextStyle, color: 'inherit' }}>{mockProject.name}</span>
        </button>
      </nav>
    </div>
  );
}
