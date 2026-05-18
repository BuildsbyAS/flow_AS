/**
 * mutations.js — Supabase write operations for Flow
 *
 * All mutations are "fire and forget" — the UI updates optimistically
 * via React state, and these functions sync to Supabase in the background.
 * Errors are logged but don't block the UI.
 */
import { supabase } from './supabase';
import {
  logProjectCreated,
  logProjectPhaseChange,
  logProjectStatusChange,
  logProjectOwnerChange,
  logProjectSquadChange,
  logProjectMemberAdded,
  logProjectMemberRemoved,
} from './activityLog';
import { isDevSeedMode, devStore } from '../data/devSeed';

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
  if (data?.id) logProjectCreated(data.id, project.name);
  return data?.id || null;
}

export async function updateProjectInDB(projectId, changes) {
  // changes = { name, owner, squad, phase, status, startDate, endDate, actualStartDate, actualEndDate, depriReason }
  const updates = {};

  // Snapshot the row before update so we can log diffs after. Joins pull the
  // owner/squad display names too — activity_log entries record names, not
  // FK ids, so the feed stays readable even if rows are later renamed.
  const { data: cur } = await supabase
    .from('projects')
    .select('id, name, phase, status, owner:owner_id ( name ), squad:squad_id ( name )')
    .eq('id', projectId)
    .maybeSingle();
  const oldName       = cur?.name || projectId;
  const oldPhase      = cur?.phase || null;
  const oldStatus     = cur?.status || null;
  const oldOwnerName  = cur?.owner?.name || null;
  const oldSquadName  = cur?.squad?.name || null;

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

  // ── Emit granular activity_log entries for diffed fields ─────────
  // Fire-and-forget — we don't want logging failures to block the UI.
  const newName = changes.name !== undefined ? changes.name : oldName;
  if (changes.phase !== undefined && changes.phase !== oldPhase) {
    logProjectPhaseChange(projectId, newName, oldPhase, changes.phase);
  }
  if (changes.status !== undefined && changes.status !== oldStatus) {
    logProjectStatusChange(projectId, newName, oldStatus, changes.status);
  }
  if (changes.owner !== undefined && changes.owner !== oldOwnerName) {
    logProjectOwnerChange(projectId, newName, oldOwnerName, changes.owner);
  }
  if (changes.squad !== undefined && changes.squad !== oldSquadName) {
    logProjectSquadChange(projectId, newName, oldSquadName, changes.squad);
  }
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
    // Explicitly write null/empty for every persisted field so clearing works
    // (e.g. unlock → closed_at=null, restore → depri_reason='', toggle-off →
    // buffer_outcome=null). Previous "if truthy" gates left stale values in DB.
    const upsertData = {
      person_id: personId,
      week_id: commitment._weekId,
      buffer: commitment.buffer || null,
      deselected: commitment.deselected ?? -1,
      locked_at: commitment.lockedAt
        ? (commitment._lockedAtISO || new Date().toISOString())
        : null,
      buffer_project: commitment.bufferProject || null,
      // buffer_type / buffer_stage / buffer_blocked_reason are declared
      // NOT NULL DEFAULT '' in migration 005, so an empty buffer must send
      // '' (not null) or the upsert fails with 23502.
      buffer_type: commitment.bufferType || '',
      buffer_stage: commitment.bufferStage || '',
      buffer_duration: commitment.bufferDuration || null,
      buffer_outcome: commitment.bufferOutcome || null,
      buffer_carry_to: commitment.bufferCarryTo || null,
      buffer_blocked_reason: commitment.bufferBlockedReason || '',
      // depri_reason is NOT NULL DEFAULT '' in migration 005 — send '' not null.
      depri_reason: commitment.depriReason || '',
      closed_at: commitment.closedAt || null,
    };

    const { data: commitRow, error: commitError } = await supabase
      .from('commitments')
      .upsert(upsertData, { onConflict: 'person_id,week_id' })
      .select('id')
      .single();

    if (commitError) throw commitError;

    // 2. Build new items first, insert, then delete old (safer order)
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
        // blocked_reason + carried_from are NOT NULL DEFAULT '' (migration 005)
        // — send '' not null so empty strings clear stale values without 23502.
        blocked_reason: item.blockedReason || '',
        carry_to: item.carryTo || null,
        weeks_remaining: item.weeksRemaining || null,
        carried_from: item.carriedFrom || '',
      }));

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

// ─── PROJECT MEMBERS ─────────────────────────────────────────
//
// Membership = the set of people other than the project owner who are
// allowed to post on a project. The owner is NOT stored here — they're
// derived from projects.owner_id and the RLS helper is_project_owner().

// `personName` and `projectName` are passed in by the caller so we don't
// need a second round-trip to render the activity-log entry — the caller
// already has both in hand.
export async function addProjectMemberToDB(projectId, personId, addedById, { personName, projectName } = {}) {
  if (isDevSeedMode()) {
    devStore.addMember(projectId, personId, addedById);
    if (personName) devStore.logEvent({ projectId, action: 'member_added', details: { person_name: personName } });
    return { ok: true };
  }
  const { data, error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, person_id: personId, added_by: addedById || null })
    .select('id, person_id, added_at')
    .single();
  if (error) {
    // Unique constraint violation = already a member; surface as success.
    if (error.code === '23505') return { ok: true, alreadyMember: true };
    logError('addProjectMember', error);
    return { ok: false, error };
  }
  if (personName) logProjectMemberAdded(projectId, projectName || projectId, personName);
  return { ok: true, row: data };
}

export async function removeProjectMemberFromDB(projectId, personId, { personName, projectName } = {}) {
  if (isDevSeedMode()) {
    devStore.removeMember(projectId, personId);
    if (personName) devStore.logEvent({ projectId, action: 'member_removed', details: { person_name: personName } });
    return { ok: true };
  }
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('person_id', personId);
  if (error) { logError('removeProjectMember', error); return { ok: false, error }; }
  if (personName) logProjectMemberRemoved(projectId, projectName || projectId, personName);
  return { ok: true };
}

// ─── PROJECT COMMENTS ────────────────────────────────────────

export async function addProjectCommentToDB(projectId, authorId, body) {
  const trimmed = (body || '').trim();
  if (!trimmed) return { ok: false, error: { message: 'Empty body' } };
  if (isDevSeedMode()) {
    const row = devStore.addComment(projectId, authorId, trimmed);
    return { ok: true, row };
  }
  const { data, error } = await supabase
    .from('project_comments')
    .insert({ project_id: projectId, author_id: authorId, body: trimmed })
    .select('id, project_id, author_id, body, created_at, edited_at, deleted_at')
    .single();
  if (error) { logError('addProjectComment', error); return { ok: false, error }; }
  return { ok: true, row: data };
}

export async function editProjectCommentInDB(commentId, body) {
  const trimmed = (body || '').trim();
  if (!trimmed) return { ok: false, error: { message: 'Empty body' } };
  if (isDevSeedMode()) {
    const row = devStore.editComment(commentId, trimmed);
    return row ? { ok: true, row } : { ok: false, error: { message: 'Comment not found' } };
  }
  const { data, error } = await supabase
    .from('project_comments')
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('id, body, edited_at')
    .single();
  if (error) { logError('editProjectComment', error); return { ok: false, error }; }
  return { ok: true, row: data };
}

// Soft delete — we never hard-delete from the app so the timeline still
// has a placeholder ("deleted by author") for context.
export async function softDeleteProjectCommentFromDB(commentId) {
  if (isDevSeedMode()) {
    devStore.softDeleteComment(commentId);
    return { ok: true };
  }
  const { error } = await supabase
    .from('project_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) { logError('softDeleteProjectComment', error); return { ok: false, error }; }
  return { ok: true };
}
