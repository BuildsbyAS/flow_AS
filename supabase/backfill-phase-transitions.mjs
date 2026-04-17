/**
 * Backfill script: Generates synthetic phase-transition entries in activity_log
 * so the Project deep-dive PROGRESS bar shows dates under each past/current
 * phase pill for existing projects.
 *
 * Strategy: linear interpolation weighted by typical phase durations.
 *   PRD   10%    (cumulative entry:  0%)
 *   Design 15%   (cumulative entry: 10%)
 *   Dev   35%    (cumulative entry: 25%)
 *   QA    15%    (cumulative entry: 60%)
 *   Alpha 10%    (cumulative entry: 75%)
 *   Beta  10%    (cumulative entry: 85%)
 *   GA     5%    (cumulative entry: 95%)
 *
 * Range used for interpolation:
 *   actualEndDate (if set, e.g. shipped projects)
 *   else endDate  (planned end)
 *   else today    (fallback for projects with no end)
 * Clamped so transitions never land in the future of today.
 *
 * Idempotency: every synthetic row carries `details.backfilled = true`.
 * The script deletes and re-creates those rows on every run — real user
 * edits are never touched.
 *
 * Run with: node supabase/backfill-phase-transitions.mjs
 */

const SUPABASE_URL = 'https://raubchfrczupoqbsjpff.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWJjaGZyY3p1cG9xYnNqcGZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3MjI5MiwiZXhwIjoyMDg5NDQ4MjkyfQ.iHxJJilR-G6Tj4aDpU2weOmIPti9GJ3vsakyDKzkpQ4';

const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function api(method, table, data, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const opts = { method, headers: { ...HEADERS } };
  if (data) opts.body = JSON.stringify(data);
  if (method === 'DELETE') opts.headers['Prefer'] = 'return=minimal';
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${table}${query}: ${res.status} ${err}`);
  }
  if (method === 'DELETE') return null;
  return res.json();
}

// Cumulative entry percentage for each phase (matches the distribution above).
const PHASE_ENTRY_PCT = {
  PRD:    0.00,
  Design: 0.10,
  Dev:    0.25,
  QA:     0.60,
  Alpha:  0.75,
  Beta:   0.85,
  GA:     0.95,
};

// Canonical phase order (matches src/styles/theme.js phaseNames + shipPhases).
const PHASE_ORDER = ['PRD', 'Design', 'Dev', 'QA', 'Alpha', 'Beta', 'GA'];

function daysBetween(a, b) {
  return (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString();
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  console.log('→ Fetching projects…');
  // Try the richer select first; fall back if actual_end_date doesn't exist (pre-migration-004 schemas).
  let projects;
  try {
    projects = await api('GET', 'projects', null, '?select=id,name,phase,start_date,end_date,actual_end_date');
  } catch (e) {
    if (String(e.message).includes('actual_end_date')) {
      console.log('  (actual_end_date column missing — falling back to end_date only)');
      projects = await api('GET', 'projects', null, '?select=id,name,phase,start_date,end_date');
    } else {
      throw e;
    }
  }
  console.log(`  ${projects.length} projects`);

  const today = todayIsoDate();
  const rowsToInsert = [];
  let skipped = 0;

  for (const p of projects) {
    const phase = p.phase;
    const currentIdx = PHASE_ORDER.indexOf(phase);
    if (currentIdx < 0) { skipped++; continue; }

    const startDate = p.start_date;
    if (!startDate) { skipped++; continue; }

    // Pick the interpolation range end.
    const rangeEnd = p.actual_end_date || p.end_date || today;
    // Don't let synthetic transitions land in the future.
    const effectiveEnd = rangeEnd > today ? today : rangeEnd;
    const totalDays = daysBetween(startDate, effectiveEnd);
    if (totalDays < 0) { skipped++; continue; }

    // Emit one transition per phase entered, up to (and including) current.
    for (let i = 0; i <= currentIdx; i++) {
      const ph = PHASE_ORDER[i];
      const pct = PHASE_ENTRY_PCT[ph];
      const ts = pct === 0
        ? new Date(startDate + 'T00:00:00').toISOString()
        : addDays(startDate, totalDays * pct);
      rowsToInsert.push({
        user_email: 'anonymous',
        user_name: null,
        action: 'edit_project',
        entity_type: 'project',
        entity_id: p.id,
        entity_name: p.name,
        details: { phase: ph, backfilled: true },
        created_at: ts,
      });
    }
  }

  console.log(`→ Prepared ${rowsToInsert.length} transitions across ${projects.length - skipped} projects (skipped ${skipped}).`);

  // Idempotent: wipe previous backfill rows, then insert fresh.
  console.log('→ Deleting previous backfill rows…');
  await api('DELETE', 'activity_log', null, `?action=eq.edit_project&details->>backfilled=eq.true`);

  console.log('→ Inserting new rows in batches of 500…');
  for (let i = 0; i < rowsToInsert.length; i += 500) {
    const batch = rowsToInsert.slice(i, i + 500);
    await api('POST', 'activity_log', batch);
    process.stdout.write(`  ${Math.min(i + 500, rowsToInsert.length)}/${rowsToInsert.length}\r`);
  }
  console.log('\n✓ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
