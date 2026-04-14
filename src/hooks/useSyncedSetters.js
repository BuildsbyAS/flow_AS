/**
 * useSyncedSetters — Two-tier persistence for Flow
 *
 * TIER 1 (Draft): Every edit saves to localStorage instantly (600ms debounce).
 *   → Survives refresh/tab close. No network calls.
 *
 * TIER 2 (Sync): DB writes happen on intentional actions:
 *   → Lock/unlock commit
 *   → Navigate away from a person (tab switch, back button)
 *   → Browser beforeunload (flush pending drafts)
 *
 * The sync toast fires on Tier 2 writes to give visual feedback.
 *
 * Squads, Roles, People, Projects — still sync immediately (infrequent, intentional actions).
 */
import { useCallback, useRef, useEffect } from 'react';
import {
  addSquadToDB, deleteSquadFromDB,
  addRoleToDB, deleteRoleFromDB,
  addPersonToDB, deletePersonFromDB, updatePersonInDB,
  createProjectInDB, updateProjectInDB,
  syncCommitmentToDB,
} from '../lib/mutations';
import {
  logProjectCreate, logProjectEdit,
  logPersonAdd, logSettingsChange,
  logCommitmentLock, logCommitmentUnlock, logCommitmentEdit,
} from '../lib/activityLog';

// ─── localStorage draft helpers ──────────────────────────────
const DRAFT_KEY = 'flow_commitment_drafts';

function saveDraftToLocal(personName, commitment) {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    drafts[personName] = { ...commitment, _draftedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch { /* quota exceeded or private mode — ignore */ }
}

function getDraftFromLocal(personName) {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    return drafts[personName] || null;
  } catch { return null; }
}

function clearDraftFromLocal(personName) {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    delete drafts[personName];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch { /* ignore */ }
}

function getAllDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
  } catch { return {}; }
}

// ─── Main hook ───────────────────────────────────────────────

export function useSyncedSetters({
  rawSetSquads, rawSetRoles, rawSetPeople, rawSetProjects, rawSetCommitments,
  squads, roles, people, projects, commitments,
  lookups,
  weekConfig,
  onSyncStart,  // callback: () => void — fires when DB sync begins
  onSyncDone,   // callback: (personName) => void — fires when DB sync completes
}) {
  // Refs to always have current values in callbacks
  const squadsRef = useRef(squads);
  squadsRef.current = squads;
  const rolesRef = useRef(roles);
  rolesRef.current = roles;
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const commitmentsRef = useRef(commitments);
  commitmentsRef.current = commitments;
  const weekConfigRef = useRef(weekConfig);
  weekConfigRef.current = weekConfig;
  const lookupsRef = useRef(lookups);
  lookupsRef.current = lookups;
  const onSyncStartRef = useRef(onSyncStart);
  onSyncStartRef.current = onSyncStart;
  const onSyncDoneRef = useRef(onSyncDone);
  onSyncDoneRef.current = onSyncDone;

  // Track which person names have dirty (unsaved) drafts
  const dirtySet = useRef(new Set());
  const flushingRef = useRef(false);

  // ─── Core sync function ────────────────────────────────────
  const syncPersonToDB = useCallback(async (commitment) => {
    const wc = weekConfigRef.current;
    const lk = lookupsRef.current;
    if (!lk?.current || !wc) return;

    if (onSyncStartRef.current) onSyncStartRef.current();

    try {
      await syncCommitmentToDB(
        { ...commitment, _weekId: wc._currentWeekId },
        lk.current
      );
      // Clear the localStorage draft after successful DB write
      clearDraftFromLocal(commitment.person);
      if (onSyncDoneRef.current) onSyncDoneRef.current(commitment.person);
    } catch (err) {
      console.error('[Flow DB] Sync failed for', commitment.person, err);
      // Signal error to SyncToast so it doesn't hang forever
      if (window.__flowSyncToast?.error) window.__flowSyncToast.error(commitment.person);
    }
  }, []);

  // Flush all dirty commitments to DB (with double-flush guard)
  const flushDirtyToDB = useCallback(async () => {
    if (flushingRef.current) return;
    const cms = commitmentsRef.current;
    const dirty = dirtySet.current;
    if (dirty.size === 0) return;

    flushingRef.current = true;
    const names = [...dirty];
    try {
      const results = await Promise.allSettled(
        names.map(name => {
          const cm = cms.find(c => c.person === name);
          return cm ? syncPersonToDB(cm) : Promise.resolve();
        })
      );
      // Only clear successfully synced names
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') dirty.delete(names[i]);
      });
    } finally {
      flushingRef.current = false;
    }
  }, [syncPersonToDB]);

  // ─── Flush on tab close / navigation ───────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Best-effort DB sync on tab close — these async calls may not complete
      // localStorage drafts (Tier 1) are the real safety net here
      const cms = commitmentsRef.current;
      dirtySet.current.forEach(name => {
        const cm = cms.find(c => c.person === name);
        if (cm) {
          const wc = weekConfigRef.current;
          const lk = lookupsRef.current;
          if (wc && lk?.current) {
            syncCommitmentToDB(
              { ...cm, _weekId: wc._currentWeekId },
              lk.current
            );
          }
        }
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ─── SQUADS ──────────────────────────────────────────────
  const setSquads = useCallback((updater) => {
    const prev = squadsRef.current;
    rawSetSquads(updater);

    setTimeout(() => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.length > prev.length) {
        const added = next.find(s => !prev.includes(s));
        if (added) { addSquadToDB(added); logSettingsChange('add_squad', { name: added }); }
      } else if (next.length < prev.length) {
        const removed = prev.find(s => !next.includes(s));
        if (removed) { deleteSquadFromDB(removed); logSettingsChange('delete_squad', { name: removed }); }
      } else {
        // Same length — check for renames
        for (let i = 0; i < next.length; i++) {
          if (next[i] !== prev[i]) {
            deleteSquadFromDB(prev[i]);
            addSquadToDB(next[i]);
            logSettingsChange('rename_squad', { from: prev[i], to: next[i] });
          }
        }
      }
    }, 0);
  }, [rawSetSquads]);

  // ─── ROLES ───────────────────────────────────────────────
  const setRoles = useCallback((updater) => {
    const prev = rolesRef.current;
    rawSetRoles(updater);

    setTimeout(() => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.length > prev.length) {
        const added = next.find(r => !prev.includes(r));
        if (added) { addRoleToDB(added); logSettingsChange('add_role', { name: added }); }
      } else if (next.length < prev.length) {
        const removed = prev.find(r => !next.includes(r));
        if (removed) { deleteRoleFromDB(removed); logSettingsChange('delete_role', { name: removed }); }
      } else {
        // Same length — check for renames
        for (let i = 0; i < next.length; i++) {
          if (next[i] !== prev[i]) {
            deleteRoleFromDB(prev[i]);
            addRoleToDB(next[i]);
            logSettingsChange('rename_role', { from: prev[i], to: next[i] });
          }
        }
      }
    }, 0);
  }, [rawSetRoles]);

  // ─── PEOPLE ──────────────────────────────────────────────
  const setPeople = useCallback((updater) => {
    const prev = peopleRef.current;
    rawSetPeople(updater);

    setTimeout(() => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.length > prev.length) {
        const added = next.find(p => !prev.some(pp => pp.name === p.name));
        if (added) {
          addPersonToDB(added.name, added.squad, added.role).then(newId => {
            // Update lookup map so commitment sync works for this person
            if (newId) {
              const lk = lookupsRef.current;
              if (lk) lk.personMap = { ...lk.personMap, [added.name]: newId };
            }
          });
          logPersonAdd(added.name);
          // Create an empty commitment so they appear in Commit immediately
          rawSetCommitments(prev => [
            ...prev,
            { person: added.name, items: [], buffer: '', deselected: -1 },
          ]);
        }
      } else if (next.length < prev.length) {
        const removed = prev.find(p => !next.some(pp => pp.name === p.name));
        if (removed) {
          deletePersonFromDB(removed.name);
          logSettingsChange('delete_person', { name: removed.name });
          // Remove their commitment from state
          rawSetCommitments(prev => prev.filter(cm => cm.person !== removed.name));
        }
      } else if (next.length === prev.length) {
        // Detect edits (same length, changed properties)
        for (let i = 0; i < next.length; i++) {
          const p = prev[i], n = next[i];
          if (p && n && (p.name !== n.name || p.squad !== n.squad || p.role !== n.role)) {
            updatePersonInDB(p.name, n.name, n.squad, n.role);
            logSettingsChange('edit_person', { old: p.name, name: n.name, squad: n.squad, role: n.role });
            // If name changed, update commitments and localStorage drafts
            if (p.name !== n.name) {
              rawSetCommitments(cms => cms.map(cm =>
                cm.person === p.name ? { ...cm, person: n.name } : cm
              ));
              // Update lookup map
              const lk = lookupsRef.current;
              if (lk?.personMap?.[p.name]) {
                lk.personMap[n.name] = lk.personMap[p.name];
                delete lk.personMap[p.name];
              }
            }
            break; // Only one edit at a time
          }
        }
      }
    }, 0);
  }, [rawSetPeople, rawSetCommitments]);

  // ─── PROJECTS ────────────────────────────────────────────
  const setProjects = useCallback((updater) => {
    const prev = projectsRef.current;
    rawSetProjects(updater);

    setTimeout(() => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      if (next.length > prev.length) {
        const added = next.find(p => !prev.some(pp => pp.id === p.id));
        if (added) {
          createProjectInDB(added).then(serverId => {
            if (serverId && serverId !== added.id) {
              // Replace the temp/optimistic ID with the server-generated one
              rawSetProjects(cur => cur.map(p => p.id === added.id ? { ...p, id: serverId } : p));
            }
          });
          logProjectCreate(added.id, added.name);
        }
      } else {
        for (const np of next) {
          const op = prev.find(p => p.id === np.id);
          if (!op) continue;
          const changes = {};
          if (op.owner !== np.owner) changes.owner = np.owner;
          if (op.squad !== np.squad) changes.squad = np.squad;
          if (op.phase !== np.phase) changes.phase = np.phase;
          if (op.status !== np.status) changes.status = np.status;
          if (op.depriReason !== np.depriReason) changes.depriReason = np.depriReason;
          if (Object.keys(changes).length > 0) {
            updateProjectInDB(np.id, changes);
            logProjectEdit(np.id, np.name, changes);
          }
        }
      }
    }, 0);
  }, [rawSetProjects]);

  // ─── COMMITS (two-tier: localStorage draft + DB on action) ──
  const draftTimers = useRef({});

  const setCommitments = useCallback((updater) => {
    const prev = commitmentsRef.current;
    rawSetCommitments(updater);

    setTimeout(() => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      for (let i = 0; i < next.length; i++) {
        if (i >= prev.length || next[i] !== prev[i]) {
          const changed = next[i];
          const wasLocked = prev[i]?.lockedAt;
          const nowLocked = changed.lockedAt;

          // TIER 2: Immediate DB sync on lock/unlock
          if (!wasLocked && nowLocked) {
            syncPersonToDB(changed);
            dirtySet.current.delete(changed.person);
            logCommitmentLock(changed.person, changed.items);
          } else if (wasLocked && !nowLocked) {
            syncPersonToDB(changed);
            dirtySet.current.delete(changed.person);
            logCommitmentUnlock(changed.person);
          } else {
            // TIER 1: Save draft to localStorage (debounced per-person)
            dirtySet.current.add(changed.person);
            clearTimeout(draftTimers.current[changed.person]);
            draftTimers.current[changed.person] = setTimeout(() => {
              saveDraftToLocal(changed.person, changed);
              // Build a summary of what changed
              const oldItems = prev[i]?.items || [];
              const newItems = changed.items || [];
              const changes = [];
              for (let s = 0; s < Math.max(oldItems.length, newItems.length); s++) {
                const o = oldItems[s], n = newItems[s];
                const pid = n?.projectId || n?.project_id || o?.projectId || o?.project_id;
                if (!o && n && pid) { changes.push(`+${pid}`); }
                else if (o && !n) { changes.push(`-${o.projectId || o.project_id || '?'}`); }
                else if (o && n) {
                  const oPid = o.projectId || o.project_id;
                  const nPid = n.projectId || n.project_id;
                  if (oPid !== nPid || o.title !== n.title || o.type !== n.type || o.stage !== n.stage) {
                    changes.push(nPid || '?');
                  }
                }
              }
              const detail = changes.length > 0
                ? { projects: changes.join(", ") }
                : { field: 'items' };
              logCommitmentEdit(changed.person, 'items', detail);
            }, 600);
          }
        }
      }
    }, 0);
  }, [rawSetCommitments, syncPersonToDB]);

  return {
    setSquads, setRoles, setPeople, setProjects, setCommitments,
    flushDirtyToDB,       // call when navigating away from Commit view
    getDraftFromLocal,    // for restoring drafts on load
    getAllDrafts,          // for checking if any unsaved drafts exist
  };
}
