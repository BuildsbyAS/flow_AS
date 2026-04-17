/**
 * Backfill: Create commitments for Mar 23 week with realistic distribution.
 * Run with: node supabase/backfill-commitments.mjs
 */

const SUPABASE_URL = 'https://raubchfrczupoqbsjpff.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWJjaGZyY3p1cG9xYnNqcGZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3MjI5MiwiZXhwIjoyMDg5NDQ4MjkyfQ.iHxJJilR-G6Tj4aDpU2weOmIPti9GJ3vsakyDKzkpQ4';
const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const MAR23_WEEK_ID = '6f2091d4-7d64-4270-a16c-00c40ccb8f65';

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Work-function stages only. Alpha/Beta/GA are project lifecycle states,
// not commit stages — the Commit tab never offers them.
const STAGES = ["PRD", "Design", "Dev", "QA"];
const TYPES = ["BUILD", "JAM", "BLOCKED"];
const PROJECTS = [
  "X01","X02","X03","X05","X06","X08","X10","X12","X13","X15",
  "X17","X19","X21","X23","X25","X27","X29","X30","X34","X36",
  "X39","X41","X42","X44","X46","X47","X49","X50","X51","X53",
];

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
  "Blocked on third-party API integration",
  "Waiting on design approval for homepage",
  "Blocked on infrastructure provisioning",
  "Build notification system for returns",
  "Implement search indexing for products",
  "Stakeholder demo of subscription box",
  "Backlog grooming for brand pages",
  "Migrate database for multi-currency",
];

async function main() {
  console.log('🔄 Creating commitments for Mar 23...\n');

  // 1. Get all people
  const res = await fetch(`${SUPABASE_URL}/rest/v1/people?select=id,name&order=name`, {
    headers: HEADERS,
  });
  const people = await res.json();
  console.log(`Found ${people.length} people\n`);

  // 2. Delete any existing Mar 23 commitments
  await fetch(`${SUPABASE_URL}/rest/v1/commitment_items?commitment_id=in.(select id from commitments where week_id=eq.${MAR23_WEEK_ID})`, {
    method: 'DELETE', headers: { ...HEADERS, 'Prefer': 'return=minimal' },
  }).catch(() => {});

  // Delete via commitment items first (FK constraint)
  const existing = await fetch(`${SUPABASE_URL}/rest/v1/commitments?select=id&week_id=eq.${MAR23_WEEK_ID}`, { headers: HEADERS }).then(r => r.json());
  for (const c of existing) {
    await fetch(`${SUPABASE_URL}/rest/v1/commitment_items?commitment_id=eq.${c.id}`, {
      method: 'DELETE', headers: { ...HEADERS, 'Prefer': 'return=minimal' },
    });
  }
  await fetch(`${SUPABASE_URL}/rest/v1/commitments?week_id=eq.${MAR23_WEEK_ID}`, {
    method: 'DELETE', headers: { ...HEADERS, 'Prefer': 'return=minimal' },
  });
  console.log('Cleared existing Mar 23 commitments\n');

  // 3. Define distribution (index-based for determinism)
  // 8 locked, 5 closed, 5 ready (filled not locked), 7 partial, 3 empty, 2 deprioritized
  const distribution = people.map((p, i) => {
    if (i < 8) return 'locked';
    if (i < 13) return 'closed';
    if (i < 18) return 'ready';
    if (i < 25) return 'partial';
    if (i < 28) return 'empty';
    return 'depri';
  });

  const outcomes = ['done', 'done', 'done', 'done', 'carry', 'carry', 'blocked', 'done', 'done_carry', 'done'];
  let outcomeIdx = 0;

  let commitCount = 0;
  let itemCount = 0;

  for (let pi = 0; pi < people.length; pi++) {
    const person = people[pi];
    const type = distribution[pi];

    // Create commitment
    const lockedAt = (type === 'locked' || type === 'closed')
      ? new Date(2026, 2, 21 + Math.floor(pi / 4), 9 + pi % 8, pi * 7 % 60).toISOString()
      : null;

    const closedAt = type === 'closed'
      ? new Date(2026, 2, 22, 10 + pi % 6, pi * 11 % 60).toISOString()
      : null;

    const deselected = type === 'depri' ? (pi % 2 === 0 ? 1 : 2) : -1;

    const commitData = {
      person_id: person.id,
      week_id: MAR23_WEEK_ID,
      buffer: type === 'depri' ? 'Replacement task for deprioritized item' : '',
      deselected,
      locked_at: lockedAt,
    };

    const [commitment] = await fetch(`${SUPABASE_URL}/rest/v1/commitments`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify([commitData]),
    }).then(r => r.json());

    // Create items based on type
    const items = [];

    if (type === 'empty') {
      // 3 empty slots
      for (let s = 0; s < 3; s++) {
        items.push({ commitment_id: commitment.id, slot: s, title: '', type: '', project_id: null, stage: '', outcome: null });
      }
    } else if (type === 'partial') {
      // 1-2 filled slots
      const filledCount = 1 + (pi % 2);
      for (let s = 0; s < 3; s++) {
        if (s < filledCount) {
          items.push({
            commitment_id: commitment.id, slot: s,
            title: pick(TASKS), type: pick(["BUILD", "JAM"]),
            project_id: pick(PROJECTS), stage: pick(STAGES), outcome: null,
          });
        } else {
          items.push({ commitment_id: commitment.id, slot: s, title: '', type: '', project_id: null, stage: '', outcome: null });
        }
      }
    } else if (type === 'closed') {
      // All 3 filled with outcomes
      for (let s = 0; s < 3; s++) {
        const outcome = outcomes[outcomeIdx % outcomes.length];
        outcomeIdx++;
        items.push({
          commitment_id: commitment.id, slot: s,
          title: pick(TASKS), type: pick(["BUILD", "BUILD", "JAM"]),
          project_id: pick(PROJECTS), stage: pick(STAGES),
          outcome,
        });
      }
    } else {
      // locked, ready, depri — all 3 filled, no outcomes
      for (let s = 0; s < 3; s++) {
        items.push({
          commitment_id: commitment.id, slot: s,
          title: pick(TASKS), type: pick(["BUILD", "BUILD", "JAM", "BLOCKED"]),
          project_id: pick(PROJECTS), stage: pick(STAGES), outcome: null,
        });
      }
    }

    if (items.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/commitment_items`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify(items),
      });
      itemCount += items.length;
    }

    commitCount++;
    const status = type === 'closed' ? '✓ closed' : type === 'locked' ? '🔒 locked' : type === 'ready' ? '● ready' : type === 'partial' ? '◐ partial' : type === 'empty' ? '○ empty' : '⊘ depri';
    console.log(`  ${person.name}: ${status}`);
  }

  console.log(`\n✅ Created ${commitCount} commitments with ${itemCount} items for Mar 23`);
  console.log('\n🎉 Done! Refresh the dashboard.');
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
