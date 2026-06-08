import { useState } from 'react';
import { Avatar, SectionHead, IconBtn } from '../shared.jsx';
import { PlusIcon } from '../icons.jsx';
import { mockTeam } from '../../data/mockProject.js';

export default function TeamSection() {
  const [team, setTeam] = useState(mockTeam);
  const [hoverIdx, setHoverIdx] = useState(null);

  function addMember() {
    const sample = [
      { id: `u-${Date.now()}`, name: 'Diya Ramesh', roles: ['UX Researcher'] },
      { id: `u-${Date.now()}`, name: 'Karan Mehta', roles: ['Data Analyst'] },
      { id: `u-${Date.now()}`, name: 'Maya Iyer', roles: ['QA Engineer'] },
    ];
    setTeam((prev) => [...prev, sample[prev.length % sample.length]]);
  }

  const overlap = 24; // px of left-shift per card when stacked

  return (
    <section>
      <SectionHead
        title="Team"
        count={team.length}
        right={
          <IconBtn
            ariaLabel="Add member"
            tone="actionSoft"
            size={28}
            onClick={addMember}
          >
            <PlusIcon size={14} />
          </IconBtn>
        }
      />

      <div
        style={{ display: 'flex', alignItems: 'center', paddingTop: 4, paddingBottom: 4 }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {team.map((m, i) => {
          const isHover = hoverIdx === i;
          const offset = i === 0 ? 0 : -overlap;
          // when any card hovered, spread all to the right of hovered
          const spread = hoverIdx != null && i > hoverIdx ? 16 : 0;
          return (
            <div
              key={m.id}
              className="flow-stack"
              onMouseEnter={() => setHoverIdx(i)}
              style={{
                marginLeft: offset,
                transform: `translateX(${spread}px) translateY(${isHover ? -3 : 0}px)`,
                zIndex: isHover ? team.length + 1 : team.length - i,
                background: 'var(--c-surface-primary)',
                border: '1px solid var(--c-border-primary)',
                borderRadius: 12,
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: isHover ? 'var(--sh-elevated)' : 'var(--sh-card)',
                cursor: 'pointer',
                transition:
                  'transform 240ms var(--ease-interaction), box-shadow 240ms var(--ease-interaction), margin-left 240ms var(--ease-interaction)',
                minWidth: 170,
              }}
            >
              <Avatar name={m.name} size={36} radius={10} ring />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                  {m.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--c-text-tertiary)',
                    letterSpacing: '-0.05px',
                  }}
                >
                  {m.roles.join(' • ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
