/**
 * One-off seed: dummy data for Mar 23, Mar 30, Apr 6 (closed past weeks) and
 * top-up 10 more commitments on Apr 13 (current, declare).
 *
 * Run: node supabase/seed-weeks-mar23-apr13.mjs
 */

const SUPABASE_URL = 'https://raubchfrczupoqbsjpff.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWJjaGZyY3p1cG9xYnNqcGZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3MjI5MiwiZXhwIjoyMDg5NDQ4MjkyfQ.iHxJJilR-G6Tj4aDpU2weOmIPti9GJ3vsakyDKzkpQ4';
const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const WEEKS = {
  mar23: { id: '6f2091d4-7d64-4270-a16c-00c40ccb8f65', label: 'Mar 23', closedDate: '2026-03-27' },
  mar30: { id: '0c9bc7e5-54cd-458e-aeee-375b7559142d', label: 'Mar 30', closedDate: '2026-04-03' },
  apr06: { id: '06062d4c-51b5-486c-a6ce-2ffcb592db8f', label: 'Apr 6',  closedDate: '2026-04-10' },
  apr13: { id: '563feba4-9677-461d-86dd-7f372924977d', label: 'Apr 13', closedDate: null },
};

const PROJECTS = [
  "X01","X02","X03","X05","X06","X08","X10","X12","X13","X15",
  "X17","X19","X21","X23","X25","X27","X29","X30","X34","X36",
  "X39","X41","X42","X44","X46","X47","X49","X50","X51","X53",
  "X54","X56","X58","X60","X62","X65","X67","X69","X71","X73",
];

// Work-function stages only. Alpha/Beta/GA are project lifecycle states,
// not commit stages — the Commit tab never offers them.
const STAGES = ["PRD", "Design", "Dev", "QA"];

const TASKS = [
  "Ship error handling for checkout flow",
  "Build frontend components for dashboard",
  "Finalize PRD for loyalty tiers",
  "Implement API endpoints for notifications",
  "Create caching layer for search",
  "Write unit tests for payment gateway",
  "Build mobile layout for order tracking",
  "Fix pagination for product listing",
  "Set up monitoring for fraud detection",
  "Implement rate limiting for API",
  "Design review for AR try-on feature",
  "Build export functionality for analytics",
  "Scope refinement for inventory sync",
  "Sprint planning for delivery slots",
  "Ship v2 of coupon engine",
  "Build webhook handlers for notifications",
  "Implement auth flow for seller portal",
  "Create dashboard widgets for analytics",
  "Build real-time sync for inventory",
  "Finalize integration tests for wallet",
  "Technical spec review for size guide",
  "Cross-team alignment on search revamp",
  "Unblock third-party API integration",
  "Follow up on design approval for homepage",
  "Provision infrastructure for returns flow",
  "Build notification system for returns",
  "Implement search indexing for products",
  "Stakeholder demo of subscription box",
  "Backlog grooming for brand pages",
  "Migrate database for multi-currency",
];

// Deterministic PRNG so re-runs match.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

async function api(method, table, data, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const opts = { method, headers: { ...HEADERS } };
  if (method === 'PATCH' || method === 'DELETE') {
    opts.headers['Prefer'] = 'return=minimal';
  }
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${table}${query}: ${res.status} ${err}`);
  }
  if (method === 'DELETE' || method === 'PATCH') return null;
  return res.json();
}

async function fetchPeople() {
  return api('GET', 'people', null, '?select=id,name&order=name');
}

async function clearWeek(weekId) {
  // Fetch all commitment ids for this week, then delete items + commitments + history.
  const commits = await api('GET', 'commitments', null, `?select=id&week_id=eq.${weekId}`);
  for (const c of commits) {
    await api('DELETE', 'commitment_items', null, `?commitment_id=eq.${c.id}`);
  }
  await api('DELETE', 'commitments', null, `?week_id=eq.${weekId}`);
  await api('DELETE', 'project_history', null, `?week_id=eq.${weekId}`);
}

function pickItemType(rng) {
  const r = rng();
  if (r < 0.65) return "BUILD";
  if (r < 0.92) return "JAM";
  return "BLOCKED";
}

function pickOutcome(rng) {
  const r = rng();
  if (r < 0.58) return "done";
  if (r < 0.72) return "partial";
  if (r < 0.88) return "carry";
  if (r < 0.95) return "blocked";
  return "done_carry";
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// ─── Seed a closed past week (commitments + items + history) ───
async function seedClosedWeek(week, people, seed) {
  const rng = makeRng(seed);
  console.log(`\n━━━ ${week.label} — seeding closed week ━━━`);

  await clearWeek(week.id);
  console.log(`  cleared existing rows`);

  // 22 closed (with outcomes), 5 locked-but-not-closed, 3 depri
  // Every person gets a commitment; items filled in slots 0-2.
  const commits = people.map((p, i) => {
    const kind = i < 22 ? 'closed' : i < 27 ? 'locked' : 'depri';
    return { person: p, kind, idx: i };
  });

  // 1. Insert commitments
  const commitRows = commits.map(({ person, kind, idx }) => {
    const pad = (n) => String(n).padStart(2, '0');
    const lockedAt = kind === 'closed' || kind === 'locked'
      ? new Date(`${week.closedDate}T${pad(9 + (idx % 8))}:${pad(idx * 7 % 60)}:00Z`).toISOString()
      : null;
    const closedAt = kind === 'closed'
      ? new Date(`${week.closedDate}T${pad(15 + (idx % 3))}:${pad(idx * 11 % 60)}:00Z`).toISOString()
      : null;
    return {
      person_id: person.id,
      week_id: week.id,
      buffer: kind === 'depri' ? 'Replacement task for deprioritized item' : '',
      deselected: kind === 'depri' ? (idx % 2 === 0 ? 1 : 2) : -1,
      locked_at: lockedAt,
      closed_at: closedAt,
      depri_reason: kind === 'depri' ? 'Reprioritized mid-week' : '',
    };
  });
  const inserted = await api('POST', 'commitments', commitRows);
  console.log(`  inserted ${inserted.length} commitments`);

  // 2. Build items + history rows
  const items = [];
  const historyRows = [];
  for (let i = 0; i < inserted.length; i++) {
    const commitment = inserted[i];
    const { person, kind, idx } = commits[i];
    for (let slot = 0; slot < 3; slot++) {
      const title = pick(rng, TASKS);
      const project = pick(rng, PROJECTS);
      const stage = pick(rng, STAGES);
      const type = pickItemType(rng);
      // For depri commitments, skip the deselected slot by leaving outcome null.
      const isDeselected = kind === 'depri' && commitment.deselected === slot;
      const outcome = kind === 'closed' && !isDeselected ? pickOutcome(rng) : null;
      items.push({
        commitment_id: commitment.id, slot,
        title, type, project_id: project, stage,
        duration: 1 + (idx + slot) % 4,
        outcome,
        blocked_reason: outcome === 'blocked' ? 'Dependency not ready' : '',
      });
      // project_history reflects closed outcomes only (how the app uses it).
      if (kind === 'closed' && !isDeselected) {
        historyRows.push({
          project_id: project, week_id: week.id,
          person_name: person.name,
          type, stage, task: title, outcome,
        });
      }
    }
  }
  // Insert in chunks to avoid payload limits
  for (let i = 0; i < items.length; i += 100) {
    await api('POST', 'commitment_items', items.slice(i, i + 100));
  }
  console.log(`  inserted ${items.length} commitment items`);
  for (let i = 0; i < historyRows.length; i += 100) {
    await api('POST', 'project_history', historyRows.slice(i, i + 100));
  }
  console.log(`  inserted ${historyRows.length} project_history rows`);

  // 3. Mark week closed
  await api('PATCH', 'weeks', { status: 'closed' }, `?id=eq.${week.id}`);
  console.log(`  marked week status=closed`);
}

// ─── Top-up 10 more Apr 13 commitments for people who don't have one ───
async function topUpApr13(week, people, seed) {
  const rng = makeRng(seed);
  console.log(`\n━━━ ${week.label} — adding 10 more commitments (declare) ━━━`);

  const existing = await api('GET', 'commitments', null,
    `?select=person_id&week_id=eq.${week.id}`);
  const have = new Set(existing.map(r => r.person_id));
  const missing = people.filter(p => !have.has(p.id));
  const targets = missing.slice(0, 10);
  console.log(`  ${existing.length} existing, adding ${targets.length}`);

  const commitRows = targets.map((p, i) => ({
    person_id: p.id,
    week_id: week.id,
    buffer: '',
    deselected: -1,
    // Half locked (committed), half still drafting
    locked_at: i < 5 ? new Date('2026-04-14T10:30:00Z').toISOString() : null,
  }));
  const inserted = await api('POST', 'commitments', commitRows);

  const items = [];
  for (let i = 0; i < inserted.length; i++) {
    const commitment = inserted[i];
    for (let slot = 0; slot < 3; slot++) {
      items.push({
        commitment_id: commitment.id, slot,
        title: pick(rng, TASKS),
        type: pickItemType(rng),
        project_id: pick(rng, PROJECTS),
        stage: pick(rng, STAGES),
        duration: 1 + (i + slot) % 4,
        outcome: null,
      });
    }
  }
  await api('POST', 'commitment_items', items);
  console.log(`  inserted ${inserted.length} commitments, ${items.length} items`);
}

async function main() {
  const people = await fetchPeople();
  console.log(`Loaded ${people.length} people`);

  await seedClosedWeek(WEEKS.mar23, people, 2303);
  await seedClosedWeek(WEEKS.mar30, people, 3003);
  await seedClosedWeek(WEEKS.apr06, people, 4006);
  await topUpApr13(WEEKS.apr13, people, 4013);

  console.log('\nDone. Refresh the dashboard.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
