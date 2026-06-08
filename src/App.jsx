import { Retune } from 'retune';
import ProjectDetailSheet from './components/project-detail/ProjectDetailSheet.jsx';

export default function App() {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        background:
          'radial-gradient(1200px 600px at 12% 10%, #F5F6FA 0%, #EEF0F4 60%), #EEF0F4',
        overflow: 'hidden',
      }}
    >
      {/* Mock app surface behind the sheet — visual context, not interactive. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          padding: '40px 56px',
          color: 'var(--c-text-muted)',
          fontSize: 13,
          letterSpacing: '0.2px',
          textTransform: 'uppercase',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.55 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #1d2539, #475067)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            F
          </div>
          <span style={{ fontWeight: 600 }}>Flow</span>
          <span style={{ marginLeft: 16, color: 'var(--c-text-muted)' }}>· Projects</span>
        </div>
        <div
          style={{
            marginTop: 96,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            maxWidth: 760,
            opacity: 0.35,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 96,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid var(--c-border-primary)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Backdrop */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.18)',
          backdropFilter: 'blur(2px)',
        }}
      />

      <ProjectDetailSheet />

      <Retune />
    </div>
  );
}
