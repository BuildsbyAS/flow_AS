/**
 * mutations.js — Supabase write operations for Flow
 *
 * All mutations are "fire and forget" — the UI updates optimistically
 * via React state, and these functions sync to Supabase in the background.
 * Errors are logged but don't block the UI.
 */
import { supabase } from './supabase';

function logError(op, err) {
  console.error(`[Flow DB] ${op} failed:`, err.message || err);
}

// ─── SQUADS ──────────────────────────────────────────────────

export async function addSquadToDB(name) {
  const { error } = await supabase.from('squads').insert({ name });
  if (error) logError('addSquad', error);
}

export async function deleteSquadFromDB(name) {
  const { error } = await supabase.from('squads').delete().eq('name', name);
  if (error) logError('deleteSquad', error);
}

// ─── ROLES ───────────────────────────────────────────────────

export async function addRoleToDB(name) {
  const { error } = await supabase.from('roles').insert({ name });
  if (error) logError('addRole', error);
}

export async function deleteRoleFromDB(name) {
  const { error } = await supabase.from('roles').delete().eq('name', name);
  if (error) logError('deleteRole', error);
}

// ─── PEOPLE ──────────────────────────────────────────────────

export async function addPersonToDB(name, squadName, roleName) {
  // Look up squad and role IDs
  const [{ data: squad }, { data: role }] = await Promise.all([
    supabase.from('squads').select('id').eq('name', squadName).single(),
    supabase.from('roles').select('id').eq('name', roleName).single(),
  ]);
  if (!squad || !role) return logError('addPerson', { message: `Squad or role not found: ${squadName}, ${roleName}` });

  const { data, error } = await supabase.from('people').insert({
    name,
    squad_id: squad.id,
    role_id: role.id,
  }).select('id').single();
  if (error) { logError('addPerson', error); return null; }
  return data?.id || null;
}

export async function deletePersonFromDB(name) {
  const { error } = await supabase.from('people').delete().eq('name', name);
  if (error) logError('deletePerson', error);
}

// ─── PROJECTS ────────────────────────────────────────────────

export async function createProjectInDB(project) {
  // project = { id, name, owner, squad, phase, startDate, endDate, ship, status }
  const [{ data: ownerRow }, { data: squadRow }] = await Promise.all([
    project.owner
      ? supabase.from('people').select('id').eq('name', project.owner).single()
      : { data: null },
    supabase.from('squads').select('id').eq('name', project.squad).single(),
  ]);

  const { error } = await supabase.from('projects').insert({
    id: project.id,
    name: project.name,
    owner_id: ownerRow?.id || null,
    squad_id: squadRow?.id,
    phase: project.phase || 'PRD',
    status: project.status || 'active',
    start_date: project.startDate || null,
    end_date: project.endDate || null,
  });
  if (error) logError('createProject', error);
}

export async function updateProjectInDB(projectId, changes) {
  // changes = { owner, squad, phase, status }
  const updates = {};

  if (changes.phase !== undefined) {
    updates.phase = changes.phase;
    // Track when a project enters GA
    if (changes.phase === 'GA') updates.ga_entered_at = new Date().toISOString();
    else updates.ga_entered_at = null; // Clear if moved out of GA
  }
  if (changes.status !== undefined) updates.status = changes.status;
  if (changes.depriReason !== undefined) updates.depri_reason = changes.depriReason;
  if (changes.owner !== undefined) {
    const { data: ownerRow } = await supabase.from('people').select('id').eq('name', changes.owner).single();
    updates.owner_id = ownerRow?.id || null;
  }
  if (changes.squad !== undefined) {
    const { data: squadRow } = await supabase.from('squads').select('id').eq('name', changes.squad).single();
    updates.squad_id = squadRow?.id || null;
  }

  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('projects').update(updates).eq('id', projectId);
  if (error) logError('updateProject', error);
}

// ─── COMMITS ─────────────────────────────────────────────────

/**
 * Syncs an entire commit (person's weekly data) to Supabase.
 * This is the main write path — called after any commit mutation.
 *
 * Strategy: upsert the commitment row, then replace all items.
 * This is simpler and safer than tracking individual field changes.
 */
export async function syncCommitmentToDB(commitment, lookups) {
  const { personMap, weekMap } = lookups;

  const personId = personMap[commitment.person];
  // Find current week ID (the non-closed week)
  const currentWeekId = Object.values(weekMap).find(id => id); // We'll pass this directly

  if (!personId) return logError('syncCommitment', { message: `Person not found: ${commitment.person}` });

  try {
    // 1. Upsert the commitment row
    const { data: commitRow, error: commitError } = await supabase
      .from('commitments')
      .upsert({
        person_id: personId,
        week_id: commitment._weekId,
        buffer: commitment.buffer || null,
        deselected: commitment.deselected ?? -1,
        // lockedAt from the UI is a display string (e.g. "Wed, Mar 19, 1:05 PM")
        // Convert to ISO timestamp for the DB, or null if not locked
        locked_at: commitment.lockedAt ? new Date().toISOString() : null,
      }, { onConflict: 'person_id,week_id' })
      .select('id')
      .single();

    if (commitError) throw commitError;

    // 2. Delete existing items and re-insert
    const { error: delError } = await supabase
      .from('commitment_items')
      .delete()
      .eq('commitment_id', commitRow.id);
    if (delError) throw delError;

    // 3. Insert current items
    if (commitment.items && commitment.items.length > 0) {
      const items = commitment.items.map((item, idx) => ({
        commitment_id: commitRow.id,
        slot: idx,
        project_id: item.project || null,
        type: item.type || '',
        stage: item.stage || '',
        title: item.title || '',
        duration: item.duration || null,
        outcome: item.outcome || null,
      }));

      const { error: insertError } = await supabase
        .from('commitment_items')
        .insert(items);
      if (insertError) throw insertError;
    }
  } catch (err) {
    logError('syncCommitment', err);
  }
}
