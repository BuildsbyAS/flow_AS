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
//
// The permission matrix is editable from Settings > Permissions.
// Config is stored in App.jsx state and persisted to localStorage.
// ═══════════════════════════════════════════════════════════════════

/** All permission keys with human-readable labels */
export const PERMISSION_KEYS = [
  { key: "editProject",   label: "Edit project fields" },
  { key: "changeStatus",  label: "Change status (ship, block)" },
  { key: "deleteProject", label: "Delete project" },
  { key: "manageTracks",  label: "Manage tracks" },
  { key: "boardDnD",      label: "Board drag-and-drop" },
  { key: "addResources",  label: "Add/remove resources" },
  { key: "addMembers",    label: "Add team members" },
  { key: "removeMembers", label: "Remove team members" },
  { key: "deleteComment", label: "Delete any comment" },
  { key: "createProject", label: "Create project" },
  { key: "postComments",  label: "Post comments" },
  { key: "viewAll",       label: "View, filter, search" },
];

/** The four role columns in the matrix */
export const ROLES = ["admin", "owner", "member", "viewer"];

/** Default permission matrix — matches the original hardcoded rules */
export const DEFAULT_PERM_CONFIG = {
  editProject:   { admin: true, owner: true, member: false, viewer: false },
  changeStatus:  { admin: true, owner: true, member: false, viewer: false },
  deleteProject: { admin: true, owner: true, member: false, viewer: false },
  manageTracks:  { admin: true, owner: true, member: false, viewer: false },
  boardDnD:      { admin: true, owner: true, member: false, viewer: false },
  addResources:  { admin: true, owner: true, member: true,  viewer: false },
  addMembers:    { admin: true, owner: true, member: true,  viewer: false },
  removeMembers: { admin: true, owner: true, member: false, viewer: false },
  deleteComment: { admin: true, owner: true, member: false, viewer: false },
  createProject: { admin: true, owner: true, member: true,  viewer: true  },
  postComments:  { admin: true, owner: true, member: true,  viewer: true  },
  viewAll:       { admin: true, owner: true, member: true,  viewer: true  },
};

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
 * Build a `can` checker from a config object.
 * Falls back to DEFAULT_PERM_CONFIG for any missing keys.
 * @param {object} config - permission config (same shape as DEFAULT_PERM_CONFIG)
 * @returns {object} - { editProject(role), deleteProject(role), ... }
 */
export function makeCanChecker(config) {
  const merged = { ...DEFAULT_PERM_CONFIG };
  if (config) {
    for (const key of Object.keys(merged)) {
      if (config[key]) merged[key] = { ...merged[key], ...config[key] };
    }
  }
  return {
    editProject:   (role) => !!merged.editProject[role],
    deleteProject: (role) => !!merged.deleteProject[role],
    changeStatus:  (role) => !!merged.changeStatus[role],
    manageTracks:  (role) => !!merged.manageTracks[role] || !!merged.boardDnD[role],
    addResources:  (role) => !!merged.addResources[role],
    addMembers:    (role) => !!merged.addMembers[role],
    removeMembers: (role) => !!merged.removeMembers[role],
    deleteComment: (role) => !!merged.deleteComment[role],
  };
}

/**
 * Default `can` checker — used when no config is provided.
 * Backward-compatible with the original hardcoded rules.
 */
export const can = makeCanChecker(null);

/**
 * Load persisted permission config from localStorage.
 * Returns null if nothing saved (uses defaults).
 */
export function loadPermConfig() {
  try {
    const raw = localStorage.getItem("flow_perm_config");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Save permission config to localStorage.
 */
export function savePermConfig(config) {
  try {
    localStorage.setItem("flow_perm_config", JSON.stringify(config));
  } catch { /* noop */ }
}
