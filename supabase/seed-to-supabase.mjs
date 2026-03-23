/**
 * Seed script: Converts seed.js data → Supabase tables
 * Run with: node supabase/seed-to-supabase.mjs
 */

import { seedSquads, seedRoles, seedPeople, seedProjects, seedCommitments, seedHistory, weekConfig } from '../src/data/seed.js';

const SUPABASE_URL = 'https://raubchfrczupoqbsjpff.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWJjaGZyY3p1cG9xYnNqcGZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3MjI5MiwiZXhwIjoyMDg5NDQ4MjkyfQ.iHxJJilR-G6Tj4aDpU2weOmIPti9GJ3vsakyDKzkpQ4';

async function api(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to insert into ${table}: ${res.status} ${err}`);
  }
  return res.json();
}

async function main() {
  console.log('🚀 Starting seed...\n');

  // 1. Squads
  console.log('1/7 Squads...');
  const squadsData = seedSquads.map(name => ({ name }));
  const squadsResult = await api('squads', squadsData);
  const squadMap = Object.fromEntries(squadsResult.map(s => [s.name, s.id]));
  console.log(`   ✅ ${squadsResult.length} squads created`);

  // 2. Roles
  console.log('2/7 Roles...');
  const rolesData = seedRoles.map(name => ({ name }));
  const rolesResult = await api('roles', rolesData);
  const roleMap = Object.fromEntries(rolesResult.map(r => [r.name, r.id]));
  console.log(`   ✅ ${rolesResult.length} roles created`);

  // 3. People
  console.log('3/7 People...');
  const peopleData = seedPeople.map(p => ({
    name: p.name,
    squad_id: squadMap[p.squad],
    role_id: roleMap[p.role]
  }));
  const peopleResult = await api('people', peopleData);
  const personMap = Object.fromEntries(peopleResult.map(p => [p.name, p.id]));
  console.log(`   ✅ ${peopleResult.length} people created`);

  // 4. Projects
  console.log('4/7 Projects...');
  const projectsData = seedProjects.map(p => ({
    id: p.id,
    name: p.name,
    owner_id: personMap[p.owner] || null,
    squad_id: squadMap[p.squad],
    phase: p.phase || 'PRD',
    ship: p.ship || false,
    status: p.status || 'active',
    start_date: p.startDate || null,
    end_date: p.endDate || null
  }));
  // Insert in batches of 50 (102 projects)
  for (let i = 0; i < projectsData.length; i += 50) {
    const batch = projectsData.slice(i, i + 50);
    await api('projects', batch);
  }
  console.log(`   ✅ ${projectsData.length} projects created`);

  // 5. Weeks
  console.log('5/7 Weeks...');
  const weeksData = [];
  // Current week
  const currentWeekStart = new Date(weekConfig.weekStart);
  weeksData.push({
    label: weekConfig.weekOf,
    start_date: weekConfig.weekStart,
    end_date: new Date(currentWeekStart.getTime() + 6 * 86400000).toISOString().split('T')[0],
    status: 'declare'
  });
  // History weeks
  const year = 2026;
  const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5 };
  for (const wk of weekConfig.historyWeeks) {
    const [mon, day] = wk.split(' ');
    const startDate = new Date(year, monthMap[mon], parseInt(day));
    const endDate = new Date(startDate.getTime() + 6 * 86400000);
    weeksData.push({
      label: wk,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'closed'
    });
  }
  const weeksResult = await api('weeks', weeksData);
  const weekMap = Object.fromEntries(weeksResult.map(w => [w.label, w.id]));
  console.log(`   ✅ ${weeksResult.length} weeks created`);

  // 6. Commitments + Items
  console.log('6/7 Commitments + Items...');
  const currentWeekId = weekMap[weekConfig.weekOf];
  let itemCount = 0;

  for (const c of seedCommitments) {
    const personId = personMap[c.person];
    if (!personId) {
      console.log(`   ⚠️  Skipping commitment for unknown person: ${c.person}`);
      continue;
    }

    const [commitmentResult] = await api('commitments', [{
      person_id: personId,
      week_id: currentWeekId,
      buffer: c.buffer || null,
      deselected: c.deselected ?? -1,
      locked_at: c.lockedAt || null
    }]);

    const items = c.items.map((item, idx) => ({
      commitment_id: commitmentResult.id,
      slot: idx,
      project_id: item.project || null,
      type: item.type || '',
      stage: item.stage || '',
      title: item.title || '',
      duration: item.duration || null,
      outcome: item.outcome || null
    }));

    if (items.length > 0) {
      await api('commitment_items', items);
      itemCount += items.length;
    }
  }
  console.log(`   ✅ ${seedCommitments.length} commitments, ${itemCount} items created`);

  // 7. Project History
  console.log('7/7 Project History...');
  let historyCount = 0;
  const historyBatch = [];

  for (const [projectId, weekEntries] of Object.entries(seedHistory)) {
    for (const weekEntry of weekEntries) {
      const weekId = weekMap[weekEntry.week];
      if (!weekId) continue;

      for (const entry of weekEntry.entries) {
        historyBatch.push({
          project_id: projectId,
          week_id: weekId,
          person_name: entry.person,
          type: entry.type || '',
          task: entry.task || '',
          stage: entry.stage || ''
        });
      }
    }
  }

  // Insert in batches of 100
  for (let i = 0; i < historyBatch.length; i += 100) {
    const batch = historyBatch.slice(i, i + 100);
    await api('project_history', batch);
    historyCount += batch.length;
  }
  console.log(`   ✅ ${historyCount} history entries created`);

  console.log('\n🎉 Seed complete! All data is now in Supabase.');
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
