import { useState } from 'react';
import PageHeader from './PageHeader.jsx';
import ProjectHeader from './ProjectHeader.jsx';
import TeamSection from './TeamSection.jsx';
import ResourcesSection from './ResourcesSection.jsx';
import GanttTimeline from './GanttTimeline.jsx';
import ActivityFeed from './ActivityFeed.jsx';
import { mockProject } from '../../data/mockProject.js';

export default function ProjectDetailSheet() {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(mockProject.bookmarked);
  const [createdAt, setCreatedAt] = useState(mockProject.createdAt);
  const [dueDate, setDueDate] = useState(mockProject.dueDate);
  const [statusKey, setStatusKey] = useState(mockProject.statusKey);
  const [squads, setSquads] = useState(mockProject.squads);

  // Sheet width is calibrated against Figma frame 486:13097 (1512×982 MacBook 14"):
  //   sheet 1056px / viewport 1512px ≈ 69.84% → 70vw
  // So the sheet keeps the same visual relationship to the page behind it on any
  // monitor (14"/16"/external) — gutters stay fixed at 16px so they read as
  // visual gutters rather than stretching whitespace.
  //   half-open: width = min(70vw, 1600px)  (1600px cap protects ultrawides)
  //   full:      width = 100vw, edge-to-edge, no rounding
  const positioning = expanded
    ? { top: 0, right: 0, bottom: 0, width: '100vw', borderRadius: 0 }
    : { top: 16, right: 16, bottom: 16, width: 'min(70vw, 1600px)', borderRadius: 24 };

  return (
    <aside
      role="dialog"
      aria-label={`${mockProject.name} — project detail`}
      style={{
        position: 'fixed',
        ...positioning,
        background: 'var(--c-surface-primary)',
        boxShadow: 'var(--sh-glass)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--f-sans)',
        transition:
          'width 360ms var(--ease-interaction), top 360ms var(--ease-interaction), right 360ms var(--ease-interaction), bottom 360ms var(--ease-interaction), border-radius 360ms var(--ease-interaction)',
      }}
      className="flow-rise"
    >
      <PageHeader
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        projectName={mockProject.name}
      />

      <div
        className="flow-hscroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px 32px 64px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <ProjectHeader
            bookmarked={bookmarked}
            onToggleBookmark={() => setBookmarked((v) => !v)}
            createdAt={createdAt}
            onCreatedAtChange={setCreatedAt}
            dueDate={dueDate}
            onDueDateChange={setDueDate}
            statusKey={statusKey}
            onStatusKeyChange={setStatusKey}
            squads={squads}
            onSquadsChange={setSquads}
          />
          <TeamSection />
          <ResourcesSection />
          <GanttTimeline />
          <ActivityFeed />
        </div>
      </div>
    </aside>
  );
}
