/**
 * Backfill script: Updates existing project_history with blocked outcomes,
 * adds data for Mar 9, Mar 16, Mar 23, and varies people participation.
 *
 * Run with: node supabase/backfill-history.mjs
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
  if (method === 'PATCH' || method === 'DELETE') {
    // Need to allow filtering
    opts.headers['Prefer'] = 'return=minimal';
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${table}${query}: ${res.status} ${err}`);
  }
  if (method === 'DELETE' || method === 'PATCH') return null;
  return res.json();
}

// Week IDs from Supabase
const WEEKS = {
  'Jan 26': 'f5baca00-96ac-4a0f-ae18-a27eb52ce650',
  'Feb 2':  '2f78e24e-c4e0-48f6-b266-7dd0db2f140f',
  'Feb 9':  '502474a1-c509-4515-a70a-7ac2f0a1f325',
  'Feb 16': 'c9553711-667e-4b4e-ad7d-e74dbb64c8b6',
  'Feb 23': '485a7820-f50b-4e36-9a9b-d4ca11e642c2',
  'Mar 2':  '5701ba95-1df3-4d2b-be55-b1016e4cb7a2',
  'Mar 9':  '942a170f-c60d-40f2-a070-ad72bf6c1cdc',
  'Mar 16': '88ffc2d3-9502-4616-add4-e60fafff9fc1',
  'Mar 23': '6f2091d4-7d64-4270-a16c-00c40ccb8f65',
};

const ALL_PEOPLE = [
  "Rania K.", "Ahmed R.", "Soumya P.", "Faisal M.", "Sara L.",
  "Priya D.", "Karthik S.", "Tariq A.", "Omar H.", "Nadia F.",
  "Youssef B.", "Layla M.", "Hamza T.", "Dina A.", "Zain Q.",
  "Mariam R.", "Ali S.", "Hana W.", "Khalid N.", "Amira J.",
  "Raj P.", "Fatima H.", "Ibrahim K.", "Noura S.", "Samir D.",
  "Lina B.", "Ayman G.", "Reema V.", "Bilal C.", "Salma E.",
];

const PROJECTS = [
  "X01","X02","X03","X04","X05","X06","X07","X08","X09","X10",
  "X11","X12","X13","X14","X15","X16","X17","X18","X19","X20",
  "X21","X22","X23","X24","X25","X26","X27","X28","X29","X30",
  "X31","X32","X33","X34","X35","X36","X37","X38","X39","X40",
  "X41","X42","X43","X44","X45","X46","X47","X48","X49","X50",
  "X51","X52","X53","X54","X55","X56","X57","X58","X59","X60",
  "X61","X62","X63","X64","X65","X66","X67","X68","X69","X70",
  "X71","X72","X73","X74","X75","X76","X77","X78","X79","X80",
  "X81","X82","X83","X84","X85",
];

const STAGES = ["PRD", "Design", "Dev", "Alpha", "Beta", "QA", "GA"];

const TASKS_BUILD = [
  "Ship error handling for", "Build frontend components for", "Set up data models for",
  "Create caching layer for", "Implement API endpoints for", "Build mobile layout for",
  "Write unit tests for", "Set up CI/CD pipeline for", "Migrate database for",
  "Build admin panel for", "Implement search indexing for", "Create webhook handlers for",
  "Build notification system for", "Implement auth flow for", "Create dashboard widgets for",
  "Build export functionality for", "Implement pagination for", "Create batch processing for",
  "Build real-time sync for", "Implement rate limiting for", "Ship v2 rollout of",
  "Finalize integration tests for", "Build monitoring dashboard for", "Create rollback mechanism for",
];

const TASKS_JAM = [
  "Whiteboard architecture for", "Sync on priorities for", "Design review for",
  "Sprint planning for", "Cross-team alignment on", "Scope refinement for",
  "Technical spec review for", "Stakeholder demo of", "Backlog grooming for",
  "Risk assessment for", "Dependency mapping for", "Capacity planning for",
];

const TASKS_BLOCKED = [
  "Blocked on API dependency for", "Waiting on design approval for",
  "Blocked on third-party integration for", "Waiting on legal review for",
  "Blocked on infrastructure provisioning for", "Waiting on security audit for",
  "Blocked on data migration for", "Waiting on vendor response for",
  "Blocked on upstream team for", "Waiting on staging environment for",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function pickOutcome(doneRate, carryRate, blockedRate) {
  const r = Math.random();
  if (r < doneRate) return "done";
  if (r < doneRate + carryRate) return "carry";
  if (r < doneRate + carryRate + blockedRate) return "blocked";
  return "done"; // fallback
}

function pickType(blockedRate) {
  const r = Math.random();
  if (r < blockedRate) return "BLOCKED";
  if (r < blockedRate + 0.25) return "JAM";
  return "BUILD";
}

function generateWeekEntries(weekLabel, weekId, peopleCount, entryCount, outcomeRates) {
  const activePeople = shuffle(ALL_PEOPLE).slice(0, peopleCount);
  const activeProjects = shuffle(PROJECTS).slice(0, Math.floor(entryCount / 3) + 5);
  const entries = [];

  // Distribute entries across people (2-4 per person)
  for (const person of activePeople) {
    const numEntries = 2 + Math.floor(Math.random() * 2); // 2-3
    for (let i = 0; i < numEntries && entries.length < entryCount; i++) {
      const type = pickType(outcomeRates.blockedType || 0.08);
      const project = pick(activeProjects);
      const stage = pick(STAGES);
      const taskList = type === "BLOCKED" ? TASKS_BLOCKED : type === "JAM" ? TASKS_JAM : TASKS_BUILD;
      const task = `${pick(taskList)} ${project}`;
      const outcome = pickOutcome(outcomeRates.done, outcomeRates.carry, outcomeRates.blocked);
      entries.push({ project_id: project, week_id: weekId, person_name: person, type, task, stage, outcome });
    }
  }

  return entries;
}

async function main() {
  console.log('🔄 Backfilling project_history data...\n');

  // Step 1: Delete ALL existing project_history
  console.log('1/4 Clearing existing project_history...');
  await fetch(`${SUPABASE_URL}/rest/v1/project_history?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
  });
  console.log('   ✅ Cleared');

  // Step 2: Generate data for each week
  const weekConfigs = [
    { label: "Jan 26", people: 25, entries: 72, rates: { done: 0.65, carry: 0.18, blocked: 0.12, blockedType: 0.07 } },
    { label: "Feb 2",  people: 27, entries: 78, rates: { done: 0.62, carry: 0.20, blocked: 0.13, blockedType: 0.08 } },
    { label: "Feb 9",  people: 23, entries: 65, rates: { done: 0.58, carry: 0.22, blocked: 0.15, blockedType: 0.10 } },
    { label: "Feb 16", people: 28, entries: 82, rates: { done: 0.70, carry: 0.15, blocked: 0.10, blockedType: 0.06 } },
    { label: "Feb 23", people: 26, entries: 75, rates: { done: 0.64, carry: 0.17, blocked: 0.14, blockedType: 0.09 } },
    { label: "Mar 2",  people: 29, entries: 85, rates: { done: 0.68, carry: 0.16, blocked: 0.11, blockedType: 0.07 } },
    { label: "Mar 9",  people: 27, entries: 78, rates: { done: 0.60, carry: 0.20, blocked: 0.15, blockedType: 0.10 } },
    { label: "Mar 16", people: 28, entries: 80, rates: { done: 0.66, carry: 0.18, blocked: 0.12, blockedType: 0.08 } },
    { label: "Mar 23", people: 22, entries: 55, rates: { done: 0.55, carry: 0.22, blocked: 0.18, blockedType: 0.12 } },
  ];

  console.log('\n2/4 Generating new history entries...');
  const allEntries = [];

  for (const wc of weekConfigs) {
    const weekId = WEEKS[wc.label];
    if (!weekId) { console.log(`   ⚠️  No week ID for ${wc.label}`); continue; }
    const entries = generateWeekEntries(wc.label, weekId, wc.people, wc.entries, wc.rates);
    allEntries.push(...entries);

    // Count stats
    const types = { BUILD: 0, JAM: 0, BLOCKED: 0 };
    const outcomes = { done: 0, carry: 0, blocked: 0 };
    const people = new Set();
    entries.forEach(e => {
      types[e.type] = (types[e.type] || 0) + 1;
      outcomes[e.outcome] = (outcomes[e.outcome] || 0) + 1;
      people.add(e.person_name);
    });
    console.log(`   ${wc.label}: ${entries.length} entries, ${people.size} people | BUILD=${types.BUILD} JAM=${types.JAM} BLOCKED=${types.BLOCKED} | done=${outcomes.done} carry=${outcomes.carry} blocked=${outcomes.blocked}`);
  }

  // Step 3: Insert in batches
  console.log(`\n3/4 Inserting ${allEntries.length} entries...`);
  for (let i = 0; i < allEntries.length; i += 100) {
    const batch = allEntries.slice(i, i + 100);
    await fetch(`${SUPABASE_URL}/rest/v1/project_history`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(batch),
    }).then(async res => {
      if (!res.ok) throw new Error(`Insert batch failed: ${res.status} ${await res.text()}`);
    });
    process.stdout.write(`   Batch ${Math.floor(i/100) + 1}/${Math.ceil(allEntries.length/100)} ✅\n`);
  }

  // Step 4: Close old weeks, keep Mar 16 & Mar 23 as declare
  console.log('\n4/4 Updating week statuses...');
  const closeWeeks = ["Jan 26", "Feb 2", "Feb 9", "Feb 16", "Feb 23", "Mar 2", "Mar 9"];
  for (const wl of closeWeeks) {
    const weekId = WEEKS[wl];
    await fetch(`${SUPABASE_URL}/rest/v1/weeks?id=eq.${weekId}`, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'closed' }),
    });
  }
  // Close Mar 16 too (it's a past week now)
  await fetch(`${SUPABASE_URL}/rest/v1/weeks?id=eq.${WEEKS['Mar 16']}`, {
    method: 'PATCH',
    headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status: 'closed' }),
  });
  console.log('   ✅ Weeks Jan 26 → Mar 16 closed, Mar 23 stays as declare');

  console.log('\n🎉 Backfill complete!');
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
