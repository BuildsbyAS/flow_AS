import { useState } from 'react';
import { SectionHead, IconBtn } from '../shared.jsx';
import {
  PlusIcon,
  ArrowUpRight,
  FigmaLogo,
  FilePdf,
  FileDeck,
  FileLink,
  FileData,
} from '../icons.jsx';
import { mockResources } from '../../data/mockProject.js';

const TYPE_ICON = {
  figma: FigmaLogo,
  pdf: FilePdf,
  deck: FileDeck,
  link: FileLink,
  data: FileData,
};

export default function ResourcesSection() {
  const [resources, setResources] = useState(mockResources);
  const [hoverIdx, setHoverIdx] = useState(null);

  function addResource() {
    const samples = [
      { id: `r-${Date.now()}`, type: 'pdf', title: 'Research notes', subtitle: 'PDF • 8 pg' },
      { id: `r-${Date.now()}`, type: 'figma', title: 'Concept explorations', subtitle: 'Figma • 12 frames' },
      { id: `r-${Date.now()}`, type: 'link', title: 'Hotjar replay set', subtitle: 'Link • Replay' },
    ];
    setResources((prev) => [...prev, samples[prev.length % samples.length]]);
  }

  const overlap = 36;

  return (
    <section>
      <SectionHead
        title="Resources"
        count={resources.length}
        right={
          <IconBtn ariaLabel="Add resource" tone="actionSoft" size={28} onClick={addResource}>
            <PlusIcon size={14} />
          </IconBtn>
        }
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          paddingTop: 4,
          paddingBottom: 4,
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {resources.map((r, i) => {
          const Icon = TYPE_ICON[r.type] || FileLink;
          const isHover = hoverIdx === i;
          const offset = i === 0 ? 0 : -overlap;
          const spread = hoverIdx != null && i > hoverIdx ? 24 : 0;
          return (
            <div
              key={r.id}
              className="flow-stack"
              onMouseEnter={() => setHoverIdx(i)}
              style={{
                marginLeft: offset,
                transform: `translateX(${spread}px) translateY(${isHover ? -4 : 0}px)`,
                zIndex: isHover ? resources.length + 1 : resources.length - i,
                background: 'var(--c-surface-secondary)',
                border: '1px solid var(--c-border-primary)',
                borderRadius: 12,
                padding: '12px 14px',
                width: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: isHover ? 'var(--sh-elevated)' : 'var(--sh-card)',
                cursor: 'pointer',
                transition:
                  'transform 240ms var(--ease-interaction), box-shadow 240ms var(--ease-interaction), margin-left 240ms var(--ease-interaction), background 200ms var(--ease-interaction)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--c-surface-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--c-border-primary)',
                  }}
                >
                  <Icon size={16} />
                </div>
                <span
                  style={{
                    opacity: isHover ? 1 : 0.45,
                    color: 'var(--c-text-secondary)',
                    transition: 'opacity 200ms var(--ease-interaction)',
                  }}
                >
                  <ArrowUpRight size={14} />
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                  {r.title}
                </span>
                <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)' }}>{r.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
