// ═══════════════════════════════════════════════════════════════════
// Flow RBAC — Role-Based Access Control
//
// Three permission tiers per project:
//   admin  — full control everywhere
//   owner  — full control over projects they own
//   member — add resources + add members on projects they belong to
//   viewer — read-only + post comments + create projects
//
// Usage:
//   const role = getProjectRole(viewerId, proj, memberIds, isAdmin);
//   if (can.editProject(role)) { ... }
// ═══════════════════════════════════════════════════════════════════

/**
 * Determine the viewer's role for a specific project.
 * @param {string|null} viewerId  - The current user's person ID
 * @param {object}      project   - The project object (needs `owner_id`)
 * @param {Set}         memberIds - Set of person IDs who are members
 * @param {boolean}     isAdmin   - Whether the viewer is a global admin
 * @returns {"admin"|"owner"|"member"|"viewer"}
 */
export function getProjectRole(viewerId, project, memberIds, isAdmin) {
  if (isAdmin) return "admin";
  if (viewerId && project?.owner_id && viewerId === project.owner_id) return "owner";
  if (viewerId && memberIds?.has?.(viewerId)) return "member";
  return "viewer";
}

/**
 * Permission checks — each takes a role string and returns boolean.
 * Controls are hidden (not disabled) when the check fails.
 */
export const can = {
  editProject:   (role) => role === "admin" || role === "owner",
  deleteProject: (role) => role === "admin" || role === "owner",
  changeStatus:  (role) => role === "admin" || role === "owner",
  manageTracks:  (role) => role === "admin" || role === "owner",
  addResources:  (role) => role === "admin" || role === "owner" || role === "member",
  addMembers:    (role) => role === "admin" || role === "owner" || role === "member",
  removeMembers: (role) => role === "admin" || role === "owner",
  deleteComment: (role) => role === "admin" || role === "owner",
};
