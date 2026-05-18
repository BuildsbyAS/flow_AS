// Flow — Activity Logger
// Writes structured log entries to Supabase activity_log table

import { supabase } from "./supabase";

/**
 * Log an activity.
 * @param {string} action - e.g. "login", "lock_commitment", "edit_project", "create_project", "add_person"
 * @param {object} opts
 * @param {string} opts.entityType - "commitment" | "project" | "person" | "squad" | "role" | "session"
 * @param {string} opts.entityId - ID of the entity
 * @param {string} opts.entityName - human-readable name
 * @param {object} opts.details - any extra JSON data
 */
export async function logActivity(action, {
  entityType = null,
  entityId = null,
  entityName = null,
  details = null,
} = {}) {
  try {
    // Get current user from Supabase auth
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // Only use Flow people-record name; fall back to "anonymous" if not onboarded
    let userName = "anonymous";
    if (user?.id) {
      const { data: profile } = await supabase
        .from("people")
        .select("name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (profile?.name) userName = profile.name;
    }

    await supabase.from("activity_log").insert({
      user_email: user?.email || "anonymous",
      user_name: userName,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      details,
    });
  } catch (err) {
    // Don't let logging failures break the app
    console.warn("Activity log failed:", err);
  }
}

// Convenience helpers
export const logLogin = () => logActivity("login", { entityType: "session" });
export const logLogout = () => logActivity("logout", { entityType: "session" });

export const logCommitmentLock = (personName, items) => {
  const projects = (items || [])
    .filter(it => it.projectId || it.project_id)
    .map(it => `${it.projectId || it.project_id}: ${it.title || "untitled"}`)
    .join(", ");
  logActivity("lock_commitment", {
    entityType: "commitment",
    entityName: personName,
    details: projects ? { projects } : null,
  });
};

export const logCommitmentUnlock = (personName) =>
  logActivity("unlock_commitment", { entityType: "commitment", entityName: personName });

export const logCommitmentEdit = (personName, field, changeDetails) =>
  logActivity("edit_commitment", {
    entityType: "commitment",
    entityName: personName,
    details: changeDetails || { field },
  });

export const logProjectEdit = (projectId, projectName, changes) =>
  logActivity("edit_project", { entityType: "project", entityId: projectId, entityName: projectName, details: changes });

export const logProjectCreate = (projectId, projectName) =>
  logActivity("create_project", { entityType: "project", entityId: projectId, entityName: projectName });

// Granular project events — drive the per-project Activity feed.
export const logProjectCreated = (projectId, projectName) =>
  logActivity("project_created", { entityType: "project", entityId: projectId, entityName: projectName });

export const logProjectPhaseChange = (projectId, projectName, from, to) =>
  logActivity("project_phase_changed", { entityType: "project", entityId: projectId, entityName: projectName, details: { from, to } });

export const logProjectStatusChange = (projectId, projectName, from, to) =>
  logActivity("project_status_changed", { entityType: "project", entityId: projectId, entityName: projectName, details: { from, to } });

export const logProjectOwnerChange = (projectId, projectName, fromName, toName) =>
  logActivity("project_owner_changed", { entityType: "project", entityId: projectId, entityName: projectName, details: { from: fromName, to: toName } });

export const logProjectSquadChange = (projectId, projectName, fromName, toName) =>
  logActivity("project_squad_changed", { entityType: "project", entityId: projectId, entityName: projectName, details: { from: fromName, to: toName } });

export const logProjectMemberAdded = (projectId, projectName, personName) =>
  logActivity("member_added", { entityType: "project", entityId: projectId, entityName: projectName, details: { person_name: personName } });

export const logProjectMemberRemoved = (projectId, projectName, personName) =>
  logActivity("member_removed", { entityType: "project", entityId: projectId, entityName: projectName, details: { person_name: personName } });

export const logPersonAdd = (personName) =>
  logActivity("add_person", { entityType: "person", entityName: personName });

export const logSettingsChange = (what, details) =>
  logActivity("settings_change", { entityType: "settings", entityName: what, details });

export const logTerminalAttempt = (success) =>
  logActivity(success ? "terminal_unlock" : "terminal_attempt", { entityType: "terminal", details: { success } });

export const logAdminAttempt = (success) =>
  logActivity(success ? "admin_unlock" : "admin_attempt", { entityType: "terminal", details: { success } });
