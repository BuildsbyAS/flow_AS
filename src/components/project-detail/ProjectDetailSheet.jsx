import { useState, useEffect } from 'react';
import './project-detail.css';
import PageHeader from './PageHeader.jsx';
import ProjectHeader from './ProjectHeader.jsx';
import TeamSection from './TeamSection.jsx';
import ResourcesSection from './ResourcesSection.jsx';
import GanttTimeline from './GanttTimeline.jsx';
import ActivityFeed from './ActivityFeed.jsx';
import { mockProject } from './mockProject.js';

export default function ProjectDetailSheet({ project = mockProject, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(project.bookmarked);
  const [createdAt, setCreatedAt] = useState(project.createdAt);
  const [dueDate, setDueDate] = useState(project.dueDate);
  const [statusKey, setStatusKey] = useState(project.statusKey);
  const [squads, setSquads] = useState(project.squads);

  // When switching to a different project the sheet stays mounted (no re-slide);
  // refresh the editable header fields in place.
  useEffect(() => {
    setBookmarked(project.bookmarked);
    setCreatedAt(project.createdAt);
    setDueDate(project.dueDate);
    setStatusKey(project.statusKey);
    setSquads(project.squads);
  }, [project.code]); // eslint-disable-line react-hooks/exhaustive-deps

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
      aria-label={`${project.name} — project detail`}
      style={{
        position: 'fixed',
        pointerEvents: 'auto',
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
      className="flow-pd pd-slide-in"
    >
      <PageHeader
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        projectName={project.name}
        onClose={onClose}
      />

      <div
        className="pd-hscroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px 32px 64px',
        }}
      >
        <div key={project.code} style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <ProjectHeader
            name={project.name}
            code={project.code}
            updatedAt={project.updatedAt}
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
          <TeamSection initialTeam={project.team} availableMembers={project.availableMembers} />
          <ResourcesSection resources={project.resources} />
          <GanttTimeline phases={project.phases} bars={project.bars} months={project.months} rangeLabel={project.rangeLabel} />
          <ActivityFeed posts={project.activity} />
        </div>
      </div>
    </aside>
  );
}
