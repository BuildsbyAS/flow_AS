/**
 * One-time migration: fix rows where `type` was seeded as "BLOCKED".
 *
 * `type` is an enum of { BUILD, JAM }. "blocked" is an outcome and should
 * never appear here. Earlier seeds (backfill-commitments, backfill-history,
 * seed-weeks-mar23-apr13) mistakenly wrote type="BLOCKED" for ~8% of rows,
 * which rendered as a gray "BLOCKED" badge on Commit cards.
 *
 * This script rewrites those rows to type="BUILD". Idempotent — safe to
 * re-run; does nothing after the first successful pass.
 *
 *   node supabase/fix-blocked-type.mjs
 */

const SUPABASE_URL = 'https://raubchfrczupoqbsjpff.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWJjaGZyY3p1cG9xYnNqcGZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3MjI5MiwiZXhwIjoyMDg5NDQ4MjkyfQ.iHxJJilR-G6Tj4aDpU2weOmIPti9GJ3vsakyDKzkpQ4';
const HEADERS = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function patch(url, body) {
  const res = await fetch(url, { method: 'PATCH', headers: HEADERS, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${await res.text()}`);
  return res.json();
}

async function select(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${await res.text()}`);
  return res.json();
}

async function fixTable(table, typeColumn = 'type') {
  // Peek to see if the column exists on this table — skip cleanly if not.
  try {
    const probe = await select(`${SUPABASE_URL}/rest/v1/${table}?select=${typeColumn}&limit=1`);
    if (!Array.isArray(probe)) return { table, skipped: true, reason: 'unexpected shape' };
  } catch (err) {
    return { table, skipped: true, reason: err.message };
  }

  const rows = await select(`${SUPABASE_URL}/rest/v1/${table}?${typeColumn}=eq.BLOCKED&select=id,${typeColumn}`);
  if (rows.length === 0) return { table, updated: 0 };

  // PATCH in bulk — Supabase REST accepts `in.(id1,id2,...)` filters.
  // Chunk to stay under URL length limits (100 ids per chunk is safe).
  let updated = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const ids = chunk.map(r => r.id).join(',');
    const result = await patch(
      `${SUPABASE_URL}/rest/v1/${table}?id=in.(${ids})`,
      { [typeColumn]: 'BUILD' }
    );
    updated += result.length;
  }
  return { table, updated };
}

async function main() {
  console.log('🔧 Rewriting type="BLOCKED" → type="BUILD"...\n');

  // Known tables that carry a `type` column. Unknown tables are skipped
  // silently. `bufferType` on commitments is a second column worth checking.
  const tasks = [
    { table: 'commitment_items', column: 'type' },
    { table: 'project_history',  column: 'type' },
    { table: 'commitments',      column: 'bufferType' },
    { table: 'commitments',      column: 'buffer_type' },
  ];

  for (const { table, column } of tasks) {
    try {
      const result = await fixTable(table, column);
      if (result.skipped) {
        console.log(`   ${table}.${column}: skipped (${result.reason})`);
      } else {
        console.log(`   ${table}.${column}: ${result.updated} rows updated`);
      }
    } catch (err) {
      console.log(`   ${table}.${column}: ERROR — ${err.message}`);
    }
  }

  console.log('\n✅ Done');
}

main().catch(err => { console.error(err); process.exit(1); });
