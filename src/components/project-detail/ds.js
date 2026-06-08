// Design system source of truth — Flow project detail page.
// Tokens mirror the Figma extraction for node 583:12223.

export const color = {
  surface: {
    primary: '#FFFFFF',
    secondary: '#F9F9FB',
    tertiary: '#F2F3F7',
    canvas: '#EEF0F4',
  },
  text: {
    primary: '#1D2539',
    secondary: '#475067',
    tertiary: '#666D85',
    muted: '#989FB3',
    action: '#0F61FF',
    onAction: '#FFFFFF',
  },
  border: {
    primary: '#EAECF0',
    subtle: '#F0F1F4',
    strong: '#D6D9E1',
  },
  status: {
    inflightBg: '#F5FAFF',
    inflightFg: '#0F7EFF',
    livefg: '#0F61FF',
    reopenedFg: '#475067',
  },
  phase: {
    prd: '#8B5CF6',
    design: '#5184FF',
    dev: '#00BF7C',
    alpha: '#F59E0B',
    beta: '#EC4899',
    qa: '#E10078',
  },
  phaseSoft: {
    prd: 'rgba(139, 92, 246, 0.16)',
    design: 'rgba(81, 132, 255, 0.18)',
    dev: 'rgba(0, 191, 124, 0.18)',
    alpha: 'rgba(245, 158, 11, 0.20)',
    beta: 'rgba(236, 72, 153, 0.18)',
    qa: 'rgba(225, 0, 120, 0.18)',
  },
};

export const space = {
  0: '0px',
  2: '2px',
  4: '4px',
  6: '6px',
  8: '8px',
  10: '10px',
  12: '12px',
  16: '16px',
  20: '20px',
  24: '24px',
  32: '32px',
  40: '40px',
  48: '48px',
};

export const radius = {
  0: '0px',
  4: '4px',
  6: '6px',
  8: '8px',
  10: '10px',
  12: '12px',
  16: '16px',
  24: '24px',
  full: '9999px',
};

export const shadow = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
  card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)',
  elevated: '0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
  float: '0 18px 40px rgba(15, 23, 42, 0.12), 0 6px 12px rgba(15, 23, 42, 0.06)',
  glass: '0 24px 60px rgba(15, 23, 42, 0.18), 0 8px 24px rgba(15, 23, 42, 0.08)',
  bar: '0 6px 14px rgba(15, 23, 42, 0.08), 0 1px 1px rgba(15, 23, 42, 0.08)',
};

export const font = {
  sans: '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

export const type = {
  h40: { size: '40px', line: '48px', weight: 500, track: '-1px' },
  h24: { size: '24px', line: '32px', weight: 600, track: '-0.4px' },
  h16: { size: '16px', line: '22px', weight: 600, track: '-0.1px' },
  b14: { size: '14px', line: '20px', weight: 400, track: '-0.1px' },
  b13: { size: '13px', line: '18px', weight: 400, track: '-0.05px' },
  b12: { size: '12px', line: '16px', weight: 400, track: '0px' },
  l11: { size: '11px', line: '14px', weight: 500, track: '0.2px' },
};

export const motion = {
  ambient: { duration: '600ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  interaction: { duration: '200ms', easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  critical: { duration: '120ms', easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  spring: { duration: '320ms', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
};
