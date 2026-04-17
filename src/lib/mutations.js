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

// Rename a squad by UPDATEing the name on the existing row. Same rationale
// as renameRoleInDB — people.squad_id and projects.squad_id both CASCADE
// on squad delete, so delete+insert would destroy their data.
export async function renameSquadInDB(oldName, newName) {
  const { error } = await supabase.from('squads').update({ name: newName }).eq('name', oldName);
  if (error) { logError('renameSquad', error); return false; }
  return true;
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

// Rename a role by UPDATEing the name on the existing row. CRITICAL: never
// implement rename as delete+insert — people.role_id REFERENCES roles(id)
// ON DELETE CASCADE, so deleting a role would nuke every person holding it.
// UPDATE preserves the UUID and the FK integrity.
export async function renameRoleInDB(oldName, newName) {
  const { error } = await supabase.from('roles').update({ name: newName }).eq('name', oldName);
  if (error) { logError('renameRole', error); return false; }
  return true;
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

export async function updatePersonInDB(oldName, newName, squadName, roleName) {
  // Look up the person by old name to get their UUID
  const { data: person } = await supabase.from('people').select('id').eq('name', oldName).single();
  if (!person) { logError('updatePerson', { message: `Person not found: ${oldName}` }); return false; }

  // Look up squad and role IDs
  const [{ data: squad }, { data: role }] = await Promise.all([
    supabase.from('squads').select('id').eq('name', squadName).single(),
    supabase.from('roles').select('id').eq('name', roleName).single(),
  ]);
  if (!squad || !role) { logError('updatePerson', { message: `Squad or role not found: ${squadName}, ${roleName}` }); return false; }

  const { error } = await supabase.from('people').update({
    name: newName,
    squad_id: squad.id,
    role_id: role.id,
  }).eq('id', person.id);
  if (error) { logError('updatePerson', error); return false; }
  return true;
}

// ─── PROJECTS ────────────────────────────────────────────────

export async function createProjectInDB(project) {
  // project = { name, owner, squad, phase, startDate, endDate, status }
  // ID is generated server-side by the set_project_id trigger
  const [{ data: ownerRow }, { data: squadRow }] = await Promise.all([
    project.owner
      ? supabase.from('people').select('id').eq('name', project.owner).single()
      : { data: null },
    supabase.from('squads').select('id').eq('name', project.squad).single(),
  ]);

  if (!squadRow?.id) { logError('createProject', { message: `Squad not found: ${project.squad}` }); return null; }

  const { data, error } = await supabase.from('projects').insert({
    name: project.name,
    owner_id: ownerRow?.id || null,
    squad_id: squadRow.id,
    phase: project.phase || 'PRD',
    status: project.status || 'active',
    start_date: project.startDate || null,
    end_date: project.endDate || null,
  }).select('id').single();
  if (error) { logError('createProject', error); return null; }
  return data?.id || null;
}

export async function updateProjectInDB(projectId, changes) {
  // changes = { name, owner, squad, phase, status, startDate, endDate, actualStartDate, actualEndDate, depriReason }
  const updates = {};

  if (changes.name !== undefined) updates.name = changes.name;
  if (changes.phase !== undefined) {
    updates.phase = changes.phase;
    // Track when a project enters GA
    if (changes.phase === 'GA') updates.ga_entered_at = new Date().toISOString();
    else updates.ga_entered_at = null; // Clear if moved out of GA
  }
  if (changes.status !== undefined) updates.status = changes.status;
  if (changes.depriReason !== undefined) updates.depri_reason = changes.depriReason;
  if (changes.startDate !== undefined) updates.start_date = changes.startDate || null;
  if (changes.endDate !== undefined) updates.end_date = changes.endDate || null;
  if (changes.actualStartDate !== undefined) updates.actual_start_date = changes.actualStartDate || null;
  if (changes.actualEndDate !== undefined) updates.actual_end_date = changes.actualEndDate || null;
  if (changes.owner !== undefined) {
    const { data: ownerRow } = changes.owner
      ? await supabase.from('people').select('id').eq('name', changes.owner).single()
      : { data: null };
    updates.owner_id = ownerRow?.id || null;
  }
  if (changes.squad !== undefined) {
    const { data: squadRow } = await supabase.from('squads').select('id').eq('name', changes.squad).single();
    updates.squad_id = squadRow?.id || null;
  }

  if (Object.keys(updates).length === 0) return { ok: true };
  const { error } = await supabase.from('projects').update(updates).eq('id', projectId);
  if (error) { logError('updateProject', error); return { ok: false, error }; }
  return { ok: true };
}

/**
 * Checks how many active commitment items reference this project.
 * Returns { commitmentCount, peopleNames } for the confirmation UI.
 */
export async function getProjectDependencies(projectId) {
  const { data, error } = await supabase
    .from('commitment_items')
    .select('commitment_id, commitments!inner(people!inner(name))')
    .eq('project_id', projectId);
  if (error) { logError('getProjectDependencies', error); return { commitmentCount: 0, peopleNames: [] }; }
  const names = [...new Set((data || []).map(r => r.commitments?.people?.name).filter(Boolean))];
  return { commitmentCount: (data || []).length, peopleNames: names };
}

/**
 * Deletes a project after clearing commitment_items references.
 * project_history cascades automatically (ON DELETE CASCADE).
 */
export async function deleteProjectFromDB(projectId) {
  // 1. Clear project references from commitment items (nullable FK, no cascade)
  const { error: clearErr } = await supabase
    .from('commitment_items')
    .update({ project_id: null })
    .eq('project_id', projectId);
  if (clearErr) { logError('deleteProject:clearItems', clearErr); return false; }

  // 2. Delete the project (project_history cascades)
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) { logError('deleteProject', error); return false; }
  return true;
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
  const { personMap } = lookups;

  const personId = personMap[commitment.person];
  if (!personId) return logError('syncCommitment', { message: `Person not found: ${commitment.person}` });
  if (!commitment._weekId) return logError('syncCommitment', { message: `Missing _weekId for: ${commitment.person}` });

  try {
    // 1. Upsert the commitment row
    const upsertData = {
      person_id: personId,
      week_id: commitment._weekId,
      buffer: commitment.buffer || null,
      deselected: commitment.deselected ?? -1,
      // Preserve original lock timestamp; only set on first lock
      locked_at: commitment.lockedAt
        ? (commitment._lockedAtISO || new Date().toISOString())
        : null,
    };
    // Buffer metadata fields (require migration 005)
    // Only include if values exist to avoid schema errors on unmigrated DBs
    if (commitment.bufferProject) upsertData.buffer_project = commitment.bufferProject;
    if (commitment.bufferType) upsertData.buffer_type = commitment.bufferType;
    if (commitment.bufferStage) upsertData.buffer_stage = commitment.bufferStage;
    if (commitment.bufferDuration) upsertData.buffer_duration = commitment.bufferDuration;
    if (commitment.bufferOutcome) upsertData.buffer_outcome = commitment.bufferOutcome;
    if (commitment.bufferCarryTo) upsertData.buffer_carry_to = commitment.bufferCarryTo;
    if (commitment.bufferBlockedReason) upsertData.buffer_blocked_reason = commitment.bufferBlockedReason;
    if (commitment.depriReason) upsertData.depri_reason = commitment.depriReason;
    if (commitment.closedAt) upsertData.closed_at = commitment.closedAt;

    const { data: commitRow, error: commitError } = await supabase
      .from('commitments')
      .upsert(upsertData, { onConflict: 'person_id,week_id' })
      .select('id')
      .single();

    if (commitError) throw commitError;

    // 2. Build new items first, insert, then delete old (safer order)
    if (commitment.items && commitment.items.length > 0) {
      const items = commitment.items.map((item, idx) => {
        const row = {
          commitment_id: commitRow.id,
          slot: idx,
          project_id: item.project || null,
          type: item.type || '',
          stage: item.stage || '',
          title: item.title || '',
          duration: item.duration || null,
          outcome: item.outcome || null,
        };
        // Closing-phase fields (require migration 005)
        if (item.blockedReason) row.blocked_reason = item.blockedReason;
        if (item.carryTo) row.carry_to = item.carryTo;
        if (item.weeksRemaining) row.weeks_remaining = item.weeksRemaining;
        if (item.carriedFrom) row.carried_from = item.carriedFrom;
        return row;
      });

      // Upsert items by (commitment_id, slot) to avoid delete-then-insert race condition
      const { error: upsertError } = await supabase
        .from('commitment_items')
        .upsert(items, { onConflict: 'commitment_id,slot' });
      if (upsertError) throw upsertError;

      // Remove any extra slots beyond what we just wrote (e.g., if items shrunk)
      const maxSlot = items.length - 1;
      const { error: cleanupError } = await supabase
        .from('commitment_items')
        .delete()
        .eq('commitment_id', commitRow.id)
        .gt('slot', maxSlot);
      if (cleanupError) console.warn('[Flow] Slot cleanup failed:', cleanupError);
    } else {
      // No items — just clear existing
      const { error: delError } = await supabase
        .from('commitment_items')
        .delete()
        .eq('commitment_id', commitRow.id);
      if (delError) throw delError;
    }
  } catch (err) {
    logError('syncCommitment', err);
    throw err;
  }
}
