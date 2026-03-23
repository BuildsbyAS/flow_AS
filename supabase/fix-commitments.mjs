/**
 * Fix:
 * 1. Deprioritized people must be locked (they deprioritized after locking)
 * 2. Add buffer project/stage/type for deprioritized people
 * 3. Add varied duration (1-3 weeks) to all commitment items
 *
 * Run with: node supabase/fix-commitments.mjs
 */

const SUPABASE_URL = 'https://raubchfrczupoqbsjpff.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWJjaGZyY3p1cG9xYnNqcGZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3MjI5MiwiZXhwIjoyMDg5NDQ4MjkyfQ.iHxJJilR-G6Tj4aDpU2weOmIPti9GJ3vsakyDKzkpQ4';
const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

const MAR23_WEEK_ID = '6f2091d4-7d64-4270-a16c-00c40ccb8f65';

async function main() {
  console.log('🔧 Fixing commitment data...\n');

  // ── Fix 1: Lock deprioritized people ──
  console.log('1/3 Locking deprioritized commitments...');
  const depriIds = [
    '9d86fbe3-3aeb-41b0-ae99-b3bd5a05ab81', // Soumya P.
    '2cb909ee-d4bf-4a6c-88d1-d56871736073', // Tariq A.
    '7a077425-8e88-4e0c-9877-81c6fb055d1a', // Youssef B.
    '0f499cc5-1103-4d14-bf89-2996be4011fd', // Zain Q.
  ];

  const bufferProjects = ['X15', 'X08', 'X25', 'X44'];
  const bufferTasks = [
    'Unblock API dependency for checkout flow',
    'Ship monitoring dashboard for product recs',
    'Build rollback mechanism for inventory sync',
    'Finalize integration tests for RFM engine',
  ];

  for (let i = 0; i < depriIds.length; i++) {
    const lockedAt = new Date(2026, 2, 22, 14 + i, 30).toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/commitments?id=eq.${depriIds[i]}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({
        locked_at: lockedAt,
        buffer: bufferTasks[i],
      }),
    });
  }
  console.log('   ✅ 4 deprioritized commitments now locked with buffer tasks');

  // ── Fix 2: Add varied duration to ALL items ──
  console.log('\n2/3 Adding duration to all commitment items...');

  // Get all items for Mar 23
  const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/commitment_items?select=id,slot,title,commitment_id&commitment_id=in.(${
    await fetch(`${SUPABASE_URL}/rest/v1/commitments?select=id&week_id=eq.${MAR23_WEEK_ID}`, {
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
    }).then(r => r.json()).then(rows => rows.map(r => `"${r.id}"`).join(','))
  })`, {
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
  });
  const allItems = await itemsRes.json();

  let updated = 0;
  for (const item of allItems) {
    if (!item.title || !item.title.trim()) continue; // skip empty slots

    // Assign duration: ~50% get 1 week, ~30% get 2 weeks, ~20% get 3 weeks
    const r = Math.random();
    const duration = r < 0.50 ? 1 : r < 0.80 ? 2 : 3;

    await fetch(`${SUPABASE_URL}/rest/v1/commitment_items?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ duration }),
    });
    updated++;
  }
  console.log(`   ✅ Updated duration on ${updated} items (1-3 weeks distribution)`);

  // ── Fix 3: Also update Mar 16 items with duration ──
  console.log('\n3/3 Adding duration to Mar 16 items too...');
  const MAR16_WEEK_ID = '88ffc2d3-9502-4616-add4-e60fafff9fc1';

  const items16Res = await fetch(`${SUPABASE_URL}/rest/v1/commitment_items?select=id,title,commitment_id&commitment_id=in.(${
    await fetch(`${SUPABASE_URL}/rest/v1/commitments?select=id&week_id=eq.${MAR16_WEEK_ID}`, {
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
    }).then(r => r.json()).then(rows => rows.map(r => `"${r.id}"`).join(','))
  })`, {
    headers: { ...HEADERS, 'Prefer': 'return=representation' },
  });
  const items16 = await items16Res.json();

  let updated16 = 0;
  for (const item of items16) {
    if (!item.title || !item.title.trim()) continue;
    const r = Math.random();
    const duration = r < 0.50 ? 1 : r < 0.80 ? 2 : 3;
    await fetch(`${SUPABASE_URL}/rest/v1/commitment_items?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ duration }),
    });
    updated16++;
  }
  console.log(`   ✅ Updated duration on ${updated16} Mar 16 items`);

  console.log('\n🎉 All fixes applied!');
}

main().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
