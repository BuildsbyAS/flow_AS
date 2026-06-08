import { useRef, useState } from 'react';
import { SectionHead } from '../shared.jsx';
import { CloseIcon, PlusIcon, Refresh, DirectionFilled } from '../icons.jsx';
import { mockPhases, mockBars, mockMonths } from '../../data/mockProject.js';
import { color } from '../../styles/ds.js';

const WEEK_PX = 36; // px per week column

export default function GanttTimeline() {
  const [phases, setPhases] = useState(mockPhases);
  const scrollerRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 });

  function togglePhase(key) {
    setPhases((prev) =>
      prev.map((p) =>
        p.key === key
          ? p.active
            ? { ...p, active: false, status: null }
            : { ...p, active: true, status: { kind: 'live', text: 'Live just now' } }
          : p
      )
    );
  }

  // grab-to-scroll: hold and drag horizontally
  function onMouseDown(e) {
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.pageX,
      startScroll: el.scrollLeft,
    };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  }
  function onMouseMove(e) {
    const el = scrollerRef.current;
    if (!el || !dragRef.current.active) return;
    el.scrollLeft = dragRef.current.startScroll - (e.pageX - dragRef.current.startX);
  }
  function endDrag() {
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current.active = false;
    el.style.cursor = 'grab';
    el.style.userSelect = 'auto';
  }

  const totalWeeks = mockMonths.reduce((sum, m) => sum + m.weeks, 0);
  const chartWidth = totalWeeks * WEEK_PX;
  const activeBars = mockBars.filter((b) => phases.find((p) => p.key === b.phase)?.active || b.light);

  return (
    <section>
      <SectionHead
        title="Track timeline"
        right={
          <span
            style={{
              fontSize: 13,
              color: 'var(--c-text-secondary)',
              fontWeight: 500,
            }}
          >
            May 12 — Jul 23
          </span>
        }
      />

      {/* phase chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {phases.map((p) => (
          <PhaseChip key={p.key} phase={p} onToggle={() => togglePhase(p.key)} />
        ))}
      </div>

      {/* chart */}
      <div
        style={{
          background: 'var(--c-surface-primary)',
          border: '1px solid var(--c-border-primary)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          ref={scrollerRef}
          className="flow-hscroll"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{
            overflowX: 'auto',
            cursor: 'grab',
            position: 'relative',
          }}
        >
          <div style={{ width: chartWidth, position: 'relative' }}>
            {/* week grid */}
            <div
              style={{
                position: 'relative',
                height: 280,
                display: 'grid',
                gridTemplateColumns: `repeat(${totalWeeks}, ${WEEK_PX}px)`,
                background:
                  'linear-gradient(180deg, var(--c-surface-primary) 0%, var(--c-surface-secondary) 100%)',
              }}
            >
              {Array.from({ length: totalWeeks }).map((_, i) => {
                const isMonthBoundary = i > 0 && i % 4 === 0;
                return (
                  <div
                    key={i}
                    style={{
                      borderLeft: isMonthBoundary
                        ? '1px dashed var(--c-border-primary)'
                        : '1px solid transparent',
                    }}
                  />
                );
              })}

              {/* bars */}
              {activeBars.map((bar, idx) => {
                const left = bar.startWeek * WEEK_PX + 4;
                const width = bar.spanWeeks * WEEK_PX - 8;
                const fg = color.phase[bar.phase];
                const isLight = bar.light;
                return (
                  <div
                    key={bar.key}
                    className="flow-rise"
                    style={{
                      position: 'absolute',
                      top: 40 + idx * 60,
                      left,
                      width,
                      height: 48,
                      background: isLight ? color.phaseSoft[bar.phase] : fg,
                      borderRadius: 10,
                      padding: '8px 12px',
                      color: isLight ? fg : '#fff',
                      boxShadow: isLight ? 'none' : 'var(--sh-bar)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      transition: 'transform 180ms var(--ease-interaction), box-shadow 180ms var(--ease-interaction)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.1px' }}>
                      {bar.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        opacity: 0.85,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {bar.dateRange}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* month axis */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mockMonths.map((m) => `${m.weeks * WEEK_PX}px`).join(' '),
                borderTop: '1px solid var(--c-border-primary)',
                background: 'var(--c-surface-secondary)',
              }}
            >
              {mockMonths.map((m) => (
                <div
                  key={m.key}
                  style={{
                    padding: '10px 12px 6px',
                    borderRight: '1px solid var(--c-border-primary)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '1px',
                      color: 'var(--c-text-tertiary)',
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${m.weeks}, 1fr)`,
                      gap: 0,
                      marginTop: 6,
                    }}
                  >
                    {Array.from({ length: m.weeks }).map((_, w) => (
                      <span
                        key={w}
                        style={{
                          fontSize: 11,
                          color: 'var(--c-text-muted)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        W{w + 1}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: 'var(--c-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Tip: hold and drag, or two-finger scroll horizontally to navigate the timeline.
      </div>
    </section>
  );
}

function PhaseChip({ phase, onToggle }) {
  const fg = color.phase[phase.key];
  const isLive = phase.status?.kind === 'live';
  const isReopened = phase.status?.kind === 'reopened';

  if (!phase.active) {
    return (
      <button
        onClick={onToggle}
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: 'var(--c-surface-secondary)',
          border: '1px solid var(--c-border-primary)',
          borderRadius: 10,
          minWidth: 140,
          textAlign: 'left',
          transition: 'background 160ms var(--ease-interaction), border-color 160ms var(--ease-interaction)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--c-surface-primary)';
          e.currentTarget.style.borderColor = 'var(--c-border-strong)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--c-surface-secondary)';
          e.currentTarget.style.borderColor = 'var(--c-border-primary)';
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            border: `1.5px dashed ${color.text.muted}`,
            transform: 'rotate(45deg)',
          }}
        />
        <span style={{ flex: 1, fontSize: 13, color: 'var(--c-text-tertiary)' }}>{phase.label}</span>
        <span style={{ color: 'var(--c-text-action)' }}>
          <PlusIcon size={12} />
        </span>
      </button>
    );
  }

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        background: 'var(--c-surface-primary)',
        border: '1px solid var(--c-border-primary)',
        borderRadius: 10,
        minWidth: 140,
        boxShadow: 'var(--sh-card)',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: fg,
          transform: 'rotate(45deg)',
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-primary)' }}>
          {phase.label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: isLive ? 'var(--c-text-action)' : 'var(--c-text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {isReopened ? <Refresh size={11} /> : <DirectionFilled size={10} />}
          {phase.status?.text}
        </span>
      </div>
      <button
        onClick={onToggle}
        aria-label={`Remove ${phase.label} phase`}
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--c-text-muted)',
          transition: 'background 160ms var(--ease-interaction), color 160ms var(--ease-interaction)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--c-surface-tertiary)';
          e.currentTarget.style.color = 'var(--c-text-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--c-text-muted)';
        }}
      >
        <CloseIcon size={12} />
      </button>
    </div>
  );
}
