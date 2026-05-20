// Flow — Settings View (Phase 5+6: Admin Console Design System)
import React, { useState, useRef, useEffect } from "react";
import { c, typo, phaseNames, phaseColors as getPhaseColors, layout, space, motion } from "../styles/theme";
import { Badge, Tag, Surface, Modal, Btn, Inp, Sel, Label, TelemetryLabel, EmptyState } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";
import useDevLabel from "../hooks/useDevLabel";

/* ── Severity helper for audit ──────────────────────────── */
const getAuditSeverity = (action) => {
  if (action.includes("delete")) return "danger";
  if (action.includes("bulk")) return "warn";
  if (action === "edit" || action.includes("migrate") || action.includes("reassign")) return "warn";
  if (action === "import") return "info";
  return "success"; // add, close, reopen
};



/* ═══════════════════════════════════════════════════════════ */
/*  SETTINGS VIEW                                            */
/* ═══════════════════════════════════════════════════════════ */

const SettingsView = ({ squads, setSquads, roles, setRoles, people, setPeople, projects, setProjects }) => {
  const devRef = useDevLabel('Admin console for managing squads, roles, and people with audit log');
  const [subTab, setSubTab] = useState("people");
  const subTabKeys = ["people", "squads", "roles"];

  /* ── Audit trail ── */
  const [auditLog, setAuditLog] = useState([]);
  const logAction = (action, entity, name, detail, before = null, after = null) => {
    setAuditLog(prev => [{
      action, entity, name, detail,
      before, after,
      at: new Date().toISOString(),
      by: "You",
    }, ...prev].slice(0, 100));
  };

  /* ── Confirmation dialog ── */
  const [confirmAction, setConfirmAction] = useState(null);

  const requestDelete = (type, idx, name) => {
    const deps = [];
    let blocked = false;
    if (type === "squad") {
      const members = people.filter(p => p.squad === name);
      const projs = projects.filter(p => p.squad === name);
      if (members.length) { deps.push({ text: `${members.length} people assigned`, items: members.map(m => m.name) }); blocked = true; }
      if (projs.length) { deps.push({ text: `${projs.length} projects in squad`, items: projs.map(p => p.id + " " + p.name) }); blocked = true; }
    } else if (type === "role") {
      const holders = people.filter(p => p.role === name);
      if (holders.length) { deps.push({ text: `${holders.length} people with this role`, items: holders.map(h => h.name) }); blocked = true; }
    } else if (type === "person") {
      const ownedProj = projects.filter(p => p.owner === name);
      if (ownedProj.length) { deps.push({ text: `Owns ${ownedProj.length} projects`, items: ownedProj.map(p => p.id) }); blocked = true; }
    } else if (type === "project") {
      const members = people.filter(p => projects.some(pr => pr.id === name && pr.owner === p.name));
      if (members.length) { deps.push({ text: `Has assigned owner` }); }
    }
    setConfirmAction({ kind: "delete", type, idx, name, deps, blocked });
  };

  const executeConfirmAction = () => {
    if (!confirmAction || confirmAction.blocked) return;
    const { kind, type, idx, name } = confirmAction;
    if (kind === "delete") {
      const before = type === "squad" ? squads[idx] : type === "role" ? roles[idx] : type === "person" ? { ...people[idx] } : null;
      if (type === "squad") setSquads(prev => prev.filter((_, i) => i !== idx));
      else if (type === "role") setRoles(prev => prev.filter((_, i) => i !== idx));
      else if (type === "person") setPeople(prev => prev.filter((_, i) => i !== idx));
      logAction("delete", type, name, "Deleted", JSON.stringify(before), null);
    }
    setConfirmAction(null);
  };

  /* ── Form state: Squads & Roles ── */
  const [newSquad, setNewSquad] = useState("");
  const [newRole, setNewRole] = useState("");

  /* ── Form state: People ── */
  const [pName, setPName] = useState("");
  const [pRole, setPRole] = useState("");
  const [pSquad, setPSquad] = useState("");

  const [panel, setPanel] = useState(null);
  const [panelStep, setPanelStep] = useState(0);

  const addSquad = () => {
    const v = newSquad.trim();
    if (!v || squads.includes(v)) return false;
    setSquads(prev => [...prev, v]);
    logAction("add", "squad", v, "Created", null, v);
    setNewSquad("");
    return true;
  };
  const addRole = () => {
    const v = newRole.trim();
    if (!v || roles.includes(v)) return false;
    setRoles(prev => [...prev, v]);
    logAction("add", "role", v, "Created", null, v);
    setNewRole("");
    return true;
  };
  const addPerson = () => {
    if (!pName.trim() || !pRole || !pSquad) return false;
    const name = pName.trim();
    if (people.some(p => p.name === name)) return false;
    setPeople(prev => [...prev, { name, role: pRole, squad: pSquad }]);
    logAction("add", "person", name, `${pRole}, ${pSquad}`, null, `${name} (${pRole}, ${pSquad})`);
    setPName(""); setPRole(""); setPSquad("");
    return true;
  };

  // Edit person state
  const [editPerson, setEditPerson] = useState(null); // { idx, name, role, squad }
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editSquad, setEditSquad] = useState("");

  const startEdit = (gi, p) => {
    setEditPerson({ idx: gi, name: p.name });
    setEditName(p.name);
    setEditRole(p.role || "");
    setEditSquad(p.squad || "");
    setPanel({ type: "editPerson" });
  };
  const saveEdit = () => {
    if (!editName.trim() || !editRole || !editSquad || !editPerson) return false;
    const oldName = editPerson.name;
    const newName = editName.trim();
    // Block duplicate name (unless unchanged)
    if (newName !== oldName && people.some(p => p.name === newName)) return false;
    setPeople(prev => prev.map(p =>
      p.name === oldName ? { ...p, name: newName, role: editRole, squad: editSquad } : p
    ));
    logAction("edit", "person", newName, `${editRole}, ${editSquad}`, `${oldName} (${editPerson.name})`, `${newName} (${editRole}, ${editSquad})`);
    setEditPerson(null);
    return true;
  };

  // Edit role state — renaming a role must cascade to every person currently
  // holding that role so we don't orphan them on a dead role name.
  const [editRoleTarget, setEditRoleTarget] = useState(null); // { idx, name }
  const [editRoleName, setEditRoleName] = useState("");

  const startEditRole = (idx, name) => {
    setEditRoleTarget({ idx, name });
    setEditRoleName(name);
    setPanel({ type: "editRole" });
  };
  const saveRoleEdit = () => {
    if (!editRoleTarget || !editRoleName.trim()) return false;
    const oldName = editRoleTarget.name;
    const newName = editRoleName.trim();
    if (newName === oldName) return true; // no-op
    if (roles.includes(newName)) return false; // duplicate guard
    // useSyncedSetters.setRoles handles: renameRoleInDB (UPDATE, preserves
    // UUID — no CASCADE wipe), in-memory people.role refresh via rawSetPeople,
    // and SyncToast show/done lifecycle. Do NOT call setPeople here — it
    // would trigger redundant per-person DB writes.
    setRoles(prev => prev.map(r => r === oldName ? newName : r));
    logAction("edit", "role", newName, "Renamed", oldName, newName);
    setEditRoleTarget(null);
    return true;
  };

  // Edit squad state — same pattern as role rename. useSyncedSetters.setSquads
  // handles the renameSquadInDB UPDATE + in-memory people.squad refresh.
  const [editSquadTarget, setEditSquadTarget] = useState(null); // { idx, name }
  const [editSquadName, setEditSquadName] = useState("");

  const startEditSquad = (idx, name) => {
    setEditSquadTarget({ idx, name });
    setEditSquadName(name);
    setPanel({ type: "editSquad" });
  };
  const saveSquadEdit = () => {
    if (!editSquadTarget || !editSquadName.trim()) return false;
    const oldName = editSquadTarget.name;
    const newName = editSquadName.trim();
    if (newName === oldName) return true; // no-op
    if (squads.includes(newName)) return false; // duplicate guard
    setSquads(prev => prev.map(s => s === oldName ? newName : s));
    logAction("edit", "squad", newName, "Renamed", oldName, newName);
    setEditSquadTarget(null);
    return true;
  };

  const closePanel = () => {
    setNewSquad(""); setNewRole("");
    setPName(""); setPRole(""); setPSquad("");
    setEditPerson(null);
    setEditRoleTarget(null); setEditRoleName("");
    setEditSquadTarget(null); setEditSquadName("");
    setPanel(null);
    setPanelStep(0);
  };

  /* ── Keyboard ── */
  useKeyboard([
    { key: "ArrowLeft", fn: () => { const tag = document.activeElement?.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return; setSubTab(t => { const i = subTabKeys.indexOf(t); return subTabKeys[Math.max(0, i - 1)]; }); } },
    { key: "ArrowRight", fn: () => { const tag = document.activeElement?.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return; setSubTab(t => { const i = subTabKeys.indexOf(t); return subTabKeys[Math.min(subTabKeys.length - 1, i + 1)]; }); } },
    { key: "Escape", fn: () => { if (confirmAction) { setConfirmAction(null); return; } if (panel) { closePanel(); } } },
  ], [subTab, confirmAction, panel]);

  const subTabs = [
    { key: "people", label: "People", count: people.length },
    { key: "squads", label: "Squads", count: squads.length },
    { key: "roles", label: "Roles", count: roles.length },
  ];

  const pc = getPhaseColors();


  /* ═══ RENDER ════════════════════════════════════════════ */
  return (
    <div ref={devRef} style={{ display: "flex", flexDirection: "column", gap: space[4] }}>

      {/* ── TAB SWITCHER — segmented toggle (matches Projects/Pulse pattern) ── */}
      <div style={{
        display: "flex", gap: 2,
        background: c.surfaceAlt, borderRadius: layout.radiusMd, padding: 3,
        border: `1px solid ${c.border}`,
      }}>
        {subTabs.map(tab => {
          const active = subTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setSubTab(tab.key)} style={{
              flex: 1, padding: `7px ${space[4]}px`,
              borderRadius: layout.radiusSm, border: "none", cursor: "pointer",
              background: active ? c.surface : "transparent",
              fontFamily: typo.bodyMd.font, fontSize: 13,
              fontWeight: 600,
              color: active ? c.text : c.textDim,
              transition: `background ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
              boxShadow: active ? c.shadowSm : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: space[2],
            }}>
              {tab.label}
              <span style={{
                fontFamily: typo.monoSm.font, fontSize: 11, fontWeight: 700,
                padding: "1px 5px", borderRadius: layout.radiusXs,
                background: c.surfaceAlt,
                color: c.textDim,
              }}>{tab.count}</span>
            </button>
          );
        })}
      </div>


      {/* ═══ SQUADS ═══ */}
      {subTab === "squads" && (
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Btn variant="command" size="sm" onClick={() => setPanel({ type: "squad", mode: "create" })}>
              <span style={{ fontSize: typo.bodyMd.size }}>+</span> Add Squad
            </Btn>
          </div>
          <div className="flow-data-grid">
            <div className="flow-data-grid-header" style={{ gridTemplateColumns: "1fr 100px 100px 140px" }}>
              <span>Squad</span>
              <span style={{ textAlign: "center" }}>Members</span>
              <span style={{ textAlign: "center" }}>Projects</span>
              <span style={{ textAlign: "right" }}></span>
            </div>
            <div style={{ overflowY: "auto" }}>
              {squads.map((sq, i) => {
                const memberCount = people.filter(p => p.squad === sq).length;
                const projCount = projects.filter(p => p.squad === sq).length;
                return (
                  <div key={i} className="flow-data-grid-row" style={{ gridTemplateColumns: "1fr 100px 100px 140px" }}>
                    <button
                      onClick={() => startEditSquad(i, sq)}
                      title="Rename squad"
                      style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        textAlign: "left", padding: 0,
                        fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                        fontWeight: typo.bodyLg.weight, color: c.text,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = c.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.color = c.text; }}
                    >{sq}</button>
                    <span style={{
                      fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                      fontWeight: typo.monoLg.weight, color: c.textMid,
                      textAlign: "center", fontVariantNumeric: "tabular-nums",
                    }}>{memberCount}</span>
                    <span style={{
                      fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                      fontWeight: typo.monoLg.weight, color: c.textMid,
                      textAlign: "center", fontVariantNumeric: "tabular-nums",
                    }}>{projCount}</span>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: space[1] }}>
                      <button onClick={() => startEditSquad(i, sq)} style={{
                        background: "transparent", border: `1px solid transparent`, cursor: "pointer",
                        fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid,
                        padding: "4px 10px", borderRadius: layout.radiusXs,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.borderColor = c.accent + "30"; e.currentTarget.style.background = c.accent + "08"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      >Edit</button>
                      <button onClick={() => requestDelete("squad", i, sq)} style={{
                        background: "transparent", border: `1px solid transparent`, cursor: "pointer",
                        fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid,
                        padding: "4px 10px", borderRadius: layout.radiusXs,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.color = c.red; e.currentTarget.style.borderColor = c.red + "30"; e.currentTarget.style.background = c.red + "08"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      >Delete</button>
                    </div>
                  </div>
                );
              })}
              {squads.length === 0 && (
                <EmptyState
                  icon="📂"
                  title="No squads defined"
                  message="Create a squad to organize your team."
                  action="Add Squad"
                  onAction={() => setPanel({ type: "squad", mode: "create" })}
                />
              )}
            </div>
          </div>
        </div>
      )}


      {/* ═══ ROLES ═══ */}
      {subTab === "roles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Btn variant="command" size="sm" onClick={() => setPanel({ type: "role", mode: "create" })}>
              <span style={{ fontSize: typo.bodyMd.size }}>+</span> Add Role
            </Btn>
          </div>
          <div className="flow-data-grid">
            <div className="flow-data-grid-header" style={{ gridTemplateColumns: "1fr 100px 140px" }}>
              <span>Role</span>
              <span style={{ textAlign: "center" }}>Holders</span>
              <span style={{ textAlign: "right" }}></span>
            </div>
            <div style={{ overflowY: "auto" }}>
              {roles.map((rl, i) => {
                const holderCount = people.filter(p => p.role === rl).length;
                return (
                  <div key={i} className="flow-data-grid-row" style={{ gridTemplateColumns: "1fr 100px 140px" }}>
                    <button
                      onClick={() => startEditRole(i, rl)}
                      title="Rename role"
                      style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        textAlign: "left", padding: 0,
                        fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                        fontWeight: typo.bodyLg.weight, color: c.text,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = c.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.color = c.text; }}
                    >{rl}</button>
                    <span style={{
                      fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                      fontWeight: typo.monoLg.weight, color: c.textMid,
                      textAlign: "center", fontVariantNumeric: "tabular-nums",
                    }}>{holderCount}</span>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: space[1] }}>
                      <button onClick={() => startEditRole(i, rl)} style={{
                        background: "transparent", border: `1px solid transparent`, cursor: "pointer",
                        fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid,
                        padding: "4px 10px", borderRadius: layout.radiusXs,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.borderColor = c.accent + "30"; e.currentTarget.style.background = c.accent + "08"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      >Edit</button>
                      <button onClick={() => requestDelete("role", i, rl)} style={{
                        background: "transparent", border: `1px solid transparent`, cursor: "pointer",
                        fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid,
                        padding: "4px 10px", borderRadius: layout.radiusXs,
                        transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                      }}
                        onMouseEnter={e => { e.currentTarget.style.color = c.red; e.currentTarget.style.borderColor = c.red + "30"; e.currentTarget.style.background = c.red + "08"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      >Delete</button>
                    </div>
                  </div>
                );
              })}
              {roles.length === 0 && (
                <EmptyState
                  icon="🏷"
                  title="No roles defined"
                  message="Create a role to define team designations."
                  action="Add Role"
                  onAction={() => setPanel({ type: "role", mode: "create" })}
                />
              )}
            </div>
          </div>
        </div>
      )}


      {/* ═══ PEOPLE ═══ */}
      {subTab === "people" && (
        <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Btn variant="command" size="sm" onClick={() => setPanel({ type: "person", mode: "create" })}>
              <span style={{ fontSize: typo.bodyMd.size }}>+</span> Add Person
            </Btn>
          </div>

          {squads.map(sq => {
            const members = people.filter(p => p.squad === sq);
            if (!members.length) return null;
            return (
              <div key={sq}>
                <div style={{
                  display: "flex", alignItems: "baseline", gap: space[2],
                  marginBottom: space[2],
                }}>
                  <span style={{
                    fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
                    fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
                    color: c.accent,
                  }}>{sq}</span>
                  <Tag color={c.accent} bg={c.accentDim}>{members.length}</Tag>
                </div>
                <div className="flow-data-grid">
                  <div className="flow-data-grid-header" style={{ gridTemplateColumns: "1fr 1fr 120px" }}>
                    <span>Name</span>
                    <span>Role</span>
                    <span style={{ textAlign: "right" }}></span>
                  </div>
                  {members.map((p, i) => {
                    const gi = people.indexOf(p);
                    return (
                      <div key={p.name} className="flow-data-grid-row" style={{ gridTemplateColumns: "1fr 1fr 120px" }}>
                        <span style={{
                          fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                          fontWeight: typo.bodyLg.weight, color: c.text,
                        }}>{p.name}</span>
                        <span style={{
                          fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size,
                          color: c.textMid,
                        }}>{p.role}</span>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: space[1] }}>
                          <button onClick={() => startEdit(gi, p)} style={{
                            background: "transparent", border: `1px solid transparent`, cursor: "pointer",
                            fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid,
                            padding: "4px 10px", borderRadius: layout.radiusXs,
                            transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.borderColor = c.accent + "30"; e.currentTarget.style.background = c.accent + "08"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                          >Edit</button>
                          <button onClick={() => requestDelete("person", gi, p.name)} style={{
                            background: "transparent", border: `1px solid transparent`, cursor: "pointer",
                            fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid,
                            padding: "4px 10px", borderRadius: layout.radiusXs,
                            transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = c.red; e.currentTarget.style.borderColor = c.red + "30"; e.currentTarget.style.background = c.red + "08"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                          >Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Unassigned people (squad missing or not in squads list) */}
          {(() => {
            const unassigned = people.filter(p => !p.squad || !squads.includes(p.squad));
            if (!unassigned.length) return null;
            return (
              <div>
                <div style={{
                  display: "flex", alignItems: "baseline", gap: space[2],
                  marginBottom: space[2],
                }}>
                  <span style={{
                    fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
                    fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
                    color: c.textDim,
                  }}>Unassigned</span>
                  <Tag color={c.textDim} bg={c.accentDim}>{unassigned.length}</Tag>
                </div>
                <div className="flow-data-grid">
                  <div className="flow-data-grid-header" style={{ gridTemplateColumns: "1fr 1fr 80px" }}>
                    <span>Name</span>
                    <span>Role</span>
                    <span style={{ textAlign: "right" }}></span>
                  </div>
                  {unassigned.map((p, i) => {
                    const gi = people.indexOf(p);
                    return (
                      <div key={i} className="flow-data-grid-row" style={{ gridTemplateColumns: "1fr 1fr 80px" }}>
                        <span style={{
                          fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                          fontWeight: typo.bodyLg.weight, color: c.text,
                        }}>{p.name}</span>
                        <span style={{
                          fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size,
                          color: c.textMid,
                        }}>{p.role}</span>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button onClick={() => requestDelete("person", gi, p.name)} style={{
                            background: "transparent", border: `1px solid transparent`, cursor: "pointer",
                            fontFamily: typo.bodySm.font, fontSize: 12, fontWeight: 600, color: c.textMid,
                            padding: "4px 10px", borderRadius: layout.radiusXs,
                            transition: `background ${motion.fast.duration} ${motion.fast.easing}, border-color ${motion.fast.duration} ${motion.fast.easing}, color ${motion.fast.duration} ${motion.fast.easing}`,
                          }}
                            onMouseEnter={e => { e.currentTarget.style.color = c.red; e.currentTarget.style.borderColor = c.red + "30"; e.currentTarget.style.background = c.red + "08"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = c.textMid; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                          >Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {people.length === 0 && (
            <EmptyState
              icon="👥"
              title="No people added"
              message="Add team members to get started."
              action="Add Person"
              onAction={() => setPanel({ type: "person", mode: "create" })}
            />
          )}
        </div>
      )}




      {/* ═══ AUDIT LOG — Event Stream ═══ */}
      {auditLog.length > 0 && (
        <Surface variant="data" style={{
          padding: `${space[4]}px ${space[5]}px`,
          borderColor: c.blue + "25",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: space[3],
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{
                fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
                fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
                color: c.text,
              }}>Audit Stream</span>
              <Tag color={c.bg} bg={c.blue} style={{ fontWeight: 700 }}>{auditLog.length} EVENTS</Tag>
            </div>
            <Btn variant="danger" size="sm" onClick={() => setAuditLog([])}>Clear</Btn>
          </div>

          <div className="flow-audit-stream">
            {auditLog.map((log, li) => {
              const severity = getAuditSeverity(log.action);
              return (
                <div key={li} className="flow-audit-event" style={{ animationDelay: `${li * 0.03}s` }}>
                  <div className={`flow-audit-severity-dot flow-audit-severity-dot-${severity}`} />
                  <span className="flow-audit-timestamp">{new Date(log.at).toLocaleTimeString()}</span>
                  <span className={`flow-audit-severity-${severity}`} style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                    fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: typo.monoSm.tracking, minWidth: 80,
                  }}>{log.action}</span>
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                    letterSpacing: typo.monoSm.tracking, color: c.textDim,
                  }}>{log.entity}</span>
                  <span style={{
                    fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size,
                    fontWeight: 600, color: c.text,
                  }}>{log.name}</span>
                  {(log.before || log.after) && (
                    <div style={{ display: "flex", alignItems: "center", gap: space[1], marginLeft: "auto" }}>
                      {log.before && <span style={{
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: c.red, textDecoration: "line-through",
                      }}>{log.before}</span>}
                      {log.before && log.after && <span style={{
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: c.textDim,
                      }}>→</span>}
                      {log.after && <span style={{
                        fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                        color: c.green, fontWeight: 600,
                      }}>{log.after}</span>}
                    </div>
                  )}
                  {!log.before && !log.after && log.detail && (
                    <span style={{
                      fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                      color: c.textDim, marginLeft: "auto",
                    }}>{log.detail}</span>
                  )}
                  <span style={{
                    fontFamily: typo.monoSm.font, fontSize: typo.monoSm.size,
                    color: c.blue,
                  }}>{log.by}</span>
                </div>
              );
            })}
          </div>
        </Surface>
      )}


      {/* ═══ SLIDE-OVER PANEL ═══ */}
      {panel && (
        <div className="flow-slide-over-overlay" style={{ position: "fixed", inset: 0, zIndex: 190, display: "flex", justifyContent: "flex-end" }} onClick={closePanel}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div
            className="flow-slide-over"
            role="dialog"
            aria-modal="true"
            ref={el => {
              if (!el) return;
              // Focus trap for slide-over
              const handleTab = (e) => {
                if (e.key !== "Tab") return;
                const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (!focusable.length) return;
                const first = focusable[0], last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
              };
              el._trapHandler = el._trapHandler || handleTab;
              el.removeEventListener("keydown", el._trapHandler);
              el.addEventListener("keydown", el._trapHandler);
            }}
            onClick={e => e.stopPropagation()}
            style={{
            position: "relative", width: "min(460px, 100vw)", height: "100%",
            background: c.surfaceOverlay, borderLeft: `1px solid ${c.border}`,
            boxShadow: c.shadowOverlay,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Panel header */}
            <div style={{
              padding: `${space[5]}px ${space[6]}px ${space[4]}px`,
              borderBottom: `1px solid ${c.border}`, flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
                  fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
                  color: c.text,
                }}>
                  {panel.type === "squad" ? "Add Squad" : panel.type === "role" ? "Add Role" : panel.type === "editRole" ? "Rename Role" : panel.type === "editSquad" ? "Rename Squad" : panel.type === "editPerson" ? "Edit Person" : "Add Person"}
                </span>
                <Btn variant="ghost" size="sm" onClick={closePanel} style={{
                  width: 28, height: 28, padding: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: typo.bodyMd.size, color: c.textDim,
                }}>✕</Btn>
              </div>
            </div>

            {/* Panel body */}
            <div style={{
              flex: 1, padding: space[6], overflowY: "auto",
              display: "flex", flexDirection: "column", gap: space[4],
            }}>

              {/* Squad form */}
              {panel.type === "squad" && (
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>SQUAD NAME</TelemetryLabel>
                  <Inp value={newSquad} onChange={e => setNewSquad(e.target.value)}
                    placeholder="New squad name..."
                    onKeyDown={e => e.key === "Enter" && addSquad()}
                    autoFocus
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {/* Role form */}
              {panel.type === "role" && (
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>ROLE NAME</TelemetryLabel>
                  <Inp value={newRole} onChange={e => setNewRole(e.target.value)}
                    placeholder="New role / designation..."
                    onKeyDown={e => e.key === "Enter" && addRole()}
                    autoFocus
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {/* Edit squad form */}
              {panel.type === "editSquad" && (
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>SQUAD NAME</TelemetryLabel>
                  <Inp value={editSquadName} onChange={e => setEditSquadName(e.target.value)}
                    placeholder="Squad name..."
                    onKeyDown={e => e.key === "Enter" && saveSquadEdit() && closePanel()}
                    autoFocus
                    style={{ width: "100%" }}
                  />
                  {editSquadName.trim() && editSquadName.trim() !== editSquadTarget?.name && squads.includes(editSquadName.trim()) && (
                    <div style={{ marginTop: space[2], fontFamily: typo.bodySm.font, fontSize: 12, color: c.red }}>A squad with this name already exists.</div>
                  )}
                  {editSquadTarget && editSquadName.trim() !== editSquadTarget.name && (() => {
                    const pc = people.filter(p => p.squad === editSquadTarget.name).length;
                    const prc = projects.filter(p => p.squad === editSquadTarget.name).length;
                    if (pc === 0 && prc === 0) return null;
                    const parts = [];
                    if (pc) parts.push(`${pc} person${pc === 1 ? "" : "s"}`);
                    if (prc) parts.push(`${prc} project${prc === 1 ? "" : "s"}`);
                    return (
                      <div style={{ marginTop: space[2], fontFamily: typo.bodySm.font, fontSize: 12, color: c.textMid }}>
                        {parts.join(" and ")} will be reassigned to the new name.
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Edit role form */}
              {panel.type === "editRole" && (
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>ROLE NAME</TelemetryLabel>
                  <Inp value={editRoleName} onChange={e => setEditRoleName(e.target.value)}
                    placeholder="Role / designation..."
                    onKeyDown={e => e.key === "Enter" && saveRoleEdit() && closePanel()}
                    autoFocus
                    style={{ width: "100%" }}
                  />
                  {editRoleName.trim() && editRoleName.trim() !== editRoleTarget?.name && roles.includes(editRoleName.trim()) && (
                    <div style={{ marginTop: space[2], fontFamily: typo.bodySm.font, fontSize: 12, color: c.red }}>A role with this name already exists.</div>
                  )}
                  {editRoleTarget && people.filter(p => p.role === editRoleTarget.name).length > 0 && editRoleName.trim() !== editRoleTarget.name && (
                    <div style={{ marginTop: space[2], fontFamily: typo.bodySm.font, fontSize: 12, color: c.textMid }}>
                      {people.filter(p => p.role === editRoleTarget.name).length} person{people.filter(p => p.role === editRoleTarget.name).length === 1 ? "" : "s"} will be reassigned to the new name.
                    </div>
                  )}
                </div>
              )}

              {/* Person form (add) */}
              {panel.type === "person" && (
                <>
                  <div>
                    <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>NAME</TelemetryLabel>
                    <Inp value={pName} onChange={e => setPName(e.target.value)}
                      placeholder="Full name" autoFocus style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>ROLE</TelemetryLabel>
                    <Sel value={pRole} onChange={e => setPRole(e.target.value)} style={{ width: "100%" }}>
                      <option value="">Select...</option>
                      {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>SQUAD</TelemetryLabel>
                    <Sel value={pSquad} onChange={e => setPSquad(e.target.value)} style={{ width: "100%" }}>
                      <option value="">Select...</option>
                      {squads.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </Sel>
                  </div>
                </>
              )}

              {/* Person form (edit) */}
              {panel.type === "editPerson" && (
                <>
                  <div>
                    <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>NAME</TelemetryLabel>
                    <Inp value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Full name" autoFocus style={{ width: "100%" }}
                    />
                    {editName.trim() && editName.trim() !== editPerson?.name && people.some(p => p.name === editName.trim()) && (
                      <div style={{ fontSize: typo.bodyMd.size, color: c.red, marginTop: space[1] }}>Name already taken</div>
                    )}
                  </div>
                  <div>
                    <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>ROLE</TelemetryLabel>
                    <Sel value={editRole} onChange={e => setEditRole(e.target.value)} style={{ width: "100%" }}>
                      <option value="">Select...</option>
                      {roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>SQUAD</TelemetryLabel>
                    <Sel value={editSquad} onChange={e => setEditSquad(e.target.value)} style={{ width: "100%" }}>
                      <option value="">Select...</option>
                      {squads.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </Sel>
                  </div>
                </>
              )}

            </div>

            {/* Panel footer */}
            <div style={{
              padding: `${space[4]}px ${space[6]}px`,
              borderTop: `1px solid ${c.border}`,
              display: "flex", gap: space[2], justifyContent: "space-between", flexShrink: 0,
            }}>
              <Btn variant="danger" size="sm" onClick={closePanel}>Cancel</Btn>

              <div style={{ display: "flex", gap: space[2] }}>
                {panel.type === "squad" && (
                  <Btn variant="primary" onClick={() => { if (addSquad()) closePanel(); }}
                    disabled={!newSquad.trim() || squads.includes(newSquad.trim())}>Add Squad</Btn>
                )}
                {panel.type === "role" && (
                  <Btn variant="primary" onClick={() => { if (addRole()) closePanel(); }}
                    disabled={!newRole.trim() || roles.includes(newRole.trim())}>Add Role</Btn>
                )}
                {panel.type === "editRole" && (
                  <Btn variant="primary" onClick={() => { if (saveRoleEdit()) closePanel(); }}
                    disabled={!editRoleName.trim() || (editRoleName.trim() !== editRoleTarget?.name && roles.includes(editRoleName.trim()))}>Save Changes</Btn>
                )}
                {panel.type === "editSquad" && (
                  <Btn variant="primary" onClick={() => { if (saveSquadEdit()) closePanel(); }}
                    disabled={!editSquadName.trim() || (editSquadName.trim() !== editSquadTarget?.name && squads.includes(editSquadName.trim()))}>Save Changes</Btn>
                )}
                {panel.type === "person" && (
                  <Btn variant="primary" onClick={() => { if (addPerson()) closePanel(); }}
                    disabled={!(pName.trim() && pRole && pSquad) || people.some(p => p.name === pName.trim())}>Add Person</Btn>
                )}
                {panel.type === "editPerson" && (
                  <Btn variant="primary" onClick={() => { if (saveEdit()) closePanel(); }}
                    disabled={!(editName.trim() && editRole && editSquad) || (editName.trim() !== editPerson?.name && people.some(p => p.name === editName.trim()))}>Save Changes</Btn>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CENTRALIZED CONFIRMATION DIALOG ═══ */}
      {confirmAction && (() => {
        const isDelete = confirmAction.kind === "delete";
        const isDone = confirmAction.kind === "done";
        const accentColor = isDelete ? c.red : c.green;
        const icon = confirmAction.blocked ? "🚫" : isDelete ? "🗑" : "✓";
        const title = confirmAction.blocked
          ? `Cannot delete ${confirmAction.type}`
          : isDelete
            ? `Delete ${confirmAction.type}?`
            : "Mark project as completed?";
        const confirmLabel = isDelete ? "Delete" : "Yes, mark done";
        return (
          <Modal open onClose={() => setConfirmAction(null)} accent={confirmAction.blocked ? c.red : undefined} width={420}>
              <div style={{ display: "flex", alignItems: "center", gap: space[3], marginBottom: space[4] }}>
                <div style={{
                  width: 36, height: 36, borderRadius: layout.radiusMd + 2,
                  background: confirmAction.blocked ? c.redDim : isDone ? c.greenDim : c.orangeDim,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{icon}</div>
                <div>
                  <div style={{
                    fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
                    fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
                    color: c.text,
                  }}>{title}</div>
                  <div style={{
                    fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                    fontWeight: typo.monoLg.weight, color: c.accent,
                  }}>{confirmAction.name}</div>
                </div>
              </div>

              {confirmAction.deps.length > 0 && (
                <div style={{
                  background: `${confirmAction.blocked ? c.red : c.orange}08`,
                  border: `1px solid ${confirmAction.blocked ? c.red : c.orange}20`,
                  borderRadius: layout.radiusMd + 2, padding: `${space[3]}px ${space[3]}px`,
                  marginBottom: space[4],
                }}>
                  <div style={{
                    fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                    fontWeight: 700, color: confirmAction.blocked ? c.red : c.orange,
                    marginBottom: space[2],
                  }}>
                    {confirmAction.blocked ? "Hard-blocked — resolve dependencies first:" : "Dependencies found:"}
                  </div>
                  {confirmAction.deps.map((d, i) => (
                    <div key={i} style={{ marginBottom: space[1] }}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                        <span style={{ color: confirmAction.blocked ? c.red : c.orange, fontSize: 12 }}>•</span>
                        <span style={{
                          fontFamily: typo.bodySm.font, fontSize: typo.bodyMd.size,
                          color: confirmAction.blocked ? c.red : c.orange,
                        }}>{d.text}</span>
                      </div>
                      {d.items && d.items.length > 0 && (
                        <div style={{ paddingLeft: space[4], marginTop: 2 }}>
                          {d.items.slice(0, 5).map((item, j) => (
                            <div key={j} style={{
                              fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                              color: c.textDim, padding: "1px 0",
                            }}>{item}</div>
                          ))}
                          {d.items.length > 5 && (
                            <div style={{
                              fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                              color: c.textDim,
                            }}>...and {d.items.length - 5} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{
                    fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                    color: c.textMid, marginTop: space[2],
                  }}>
                    {confirmAction.blocked ? "Reassign or remove all dependencies before deleting." : "This cannot be undone."}
                  </div>
                </div>
              )}

              {confirmAction.deps.length === 0 && (
                <div style={{
                  fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
                  color: c.textMid, marginBottom: space[4],
                }}>
                  {isDelete ? "This action cannot be undone. Are you sure?" : "Are you sure you want to mark this project as completed?"}
                </div>
              )}

              <div style={{ display: "flex", gap: space[2], justifyContent: "flex-end" }}>
                <Btn variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>
                  {confirmAction.blocked ? "Close" : "Cancel"}
                </Btn>
                {!confirmAction.blocked && (
                  <Btn variant="danger" onClick={executeConfirmAction}>{confirmLabel}</Btn>
                )}
              </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default SettingsView;
