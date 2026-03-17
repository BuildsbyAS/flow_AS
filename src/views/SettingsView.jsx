// Flow — Settings View (Phase 5+6: Admin Console Design System)
import React, { useState, useRef, useEffect } from "react";
import { c, typo, phaseNames, phaseColors as getPhaseColors, layout, space, motion } from "../styles/theme";
import { Badge, Tag, Surface, Btn, Inp, Sel, Label, TelemetryLabel, EmptyState } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";

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

const SettingsView = ({ squads, setSquads, roles, setRoles, people, setPeople, projects, setProjects, commitments }) => {
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

  /* ── Bulk / Simulation mode ── */
  const [simMode, setSimMode] = useState(false);
  const [bulkOp, setBulkOp] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [reassignFrom, setReassignFrom] = useState("");
  const [reassignTo, setReassignTo] = useState("");
  const [migrateFromPhase, setMigrateFromPhase] = useState("");
  const [migrateToPhase, setMigrateToPhase] = useState("");
  const [migrateSquadFilter, setMigrateSquadFilter] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [dryRunPreview, setDryRunPreview] = useState(null);

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
      const cms = commitments ? commitments.filter(cm => cm.person === name) : [];
      if (cms.length) {
        const hasItems = cms.some(cm => cm.items.some(it => it.title && it.title.trim()));
        if (hasItems) { deps.push({ text: "Has active commitments this week" }); blocked = true; }
      }
      const ownedProj = projects.filter(p => p.owner === name);
      if (ownedProj.length) { deps.push({ text: `Owns ${ownedProj.length} projects`, items: ownedProj.map(p => p.id) }); blocked = true; }
    } else if (type === "project") {
      const projItems = commitments ? commitments.flatMap(cm => cm.items.filter(it => it.project === name)) : [];
      if (projItems.length) { deps.push({ text: `${projItems.length} active commitments reference this project` }); blocked = true; }
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

  /* ── Dry-run generators ── */
  const dryRunCsvImport = () => {
    const lines = csvText.trim().split("\n").filter(l => l.trim());
    const items = [];
    const exceptions = [];
    lines.forEach((line, li) => {
      const parts = line.split(",").map(s => s.trim());
      if (parts.length < 3) { exceptions.push(`Row ${li + 1}: needs Name, Role, Squad (got ${parts.length} fields)`); return; }
      const [name, role, squad] = parts;
      if (!name || !role || !squad) { exceptions.push(`Row ${li + 1}: empty field(s)`); return; }
      if (people.some(p => p.name === name)) { exceptions.push(`Row ${li + 1}: "${name}" already exists — skipped`); return; }
      if (!roles.includes(role)) { exceptions.push(`Row ${li + 1}: role "${role}" not in org config — will still import`); }
      if (!squads.includes(squad)) { exceptions.push(`Row ${li + 1}: squad "${squad}" not in org config — will still import`); }
      items.push({ name, role, squad });
    });
    setDryRunPreview({
      type: "csv", items, exceptions,
      summary: `${items.length} people will be imported, ${exceptions.length} issues`,
      execute: () => {
        let added = 0;
        items.forEach(({ name, role, squad }) => {
          setPeople(prev => [...prev, { name, role, squad }]);
          logAction("import", "person", name, `CSV import`, null, `${role}, ${squad}`);
          added++;
        });
        setBulkResult({ success: added, total: lines.length, exceptions });
        setDryRunPreview(null);
        setCsvText("");
      },
    });
  };

  const dryRunReassign = () => {
    if (!reassignFrom || !reassignTo || reassignFrom === reassignTo) return;
    const affected = projects.filter(p => p.owner === reassignFrom);
    setDryRunPreview({
      type: "reassign",
      items: affected.map(p => ({ id: p.id, name: p.name, before: reassignFrom, after: reassignTo })),
      exceptions: [],
      summary: `${affected.length} projects: ${reassignFrom} → ${reassignTo}`,
      execute: () => {
        let count = 0;
        setProjects(prev => prev.map(p => {
          if (p.owner === reassignFrom) { count++; return { ...p, owner: reassignTo }; }
          return p;
        }));
        logAction("bulk reassign", "project", reassignFrom, `→ ${reassignTo}`, reassignFrom, `${reassignTo} (${count} projects)`);
        setBulkResult({ success: count, total: affected.length, exceptions: [] });
        setDryRunPreview(null);
        setReassignFrom(""); setReassignTo("");
      },
    });
  };

  const dryRunPhaseMigrate = () => {
    if (!migrateFromPhase || !migrateToPhase || migrateFromPhase === migrateToPhase) return;
    const affected = projects.filter(p => p.phase === migrateFromPhase && (!migrateSquadFilter || p.squad === migrateSquadFilter));
    setDryRunPreview({
      type: "phase",
      items: affected.map(p => ({ id: p.id, name: p.name, before: migrateFromPhase, after: migrateToPhase })),
      exceptions: [],
      summary: `${affected.length} projects: ${migrateFromPhase} → ${migrateToPhase}${migrateSquadFilter ? ` (${migrateSquadFilter})` : ""}`,
      execute: () => {
        let count = 0;
        setProjects(prev => prev.map(p => {
          if (p.phase === migrateFromPhase && (!migrateSquadFilter || p.squad === migrateSquadFilter)) {
            count++; return { ...p, phase: migrateToPhase };
          }
          return p;
        }));
        logAction("bulk migrate", "project", migrateFromPhase, `→ ${migrateToPhase}`, migrateFromPhase, `${migrateToPhase} (${count} projects)`);
        setBulkResult({ success: count, total: affected.length, exceptions: [] });
        setDryRunPreview(null);
        setMigrateFromPhase(""); setMigrateToPhase(""); setMigrateSquadFilter("");
      },
    });
  };

  /* ── Keyboard ── */
  useKeyboard([
    { key: "ArrowLeft", fn: () => setSubTab(t => { const i = subTabKeys.indexOf(t); return subTabKeys[Math.max(0, i - 1)]; }) },
    { key: "ArrowRight", fn: () => setSubTab(t => { const i = subTabKeys.indexOf(t); return subTabKeys[Math.min(subTabKeys.length - 1, i + 1)]; }) },
  ], [subTab]);

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
    if (!v || squads.includes(v)) return;
    setSquads(prev => [...prev, v]);
    logAction("add", "squad", v, "Created", null, v);
    setNewSquad("");
  };
  const addRole = () => {
    const v = newRole.trim();
    if (!v || roles.includes(v)) return;
    setRoles(prev => [...prev, v]);
    logAction("add", "role", v, "Created", null, v);
    setNewRole("");
  };
  const addPerson = () => {
    if (!pName.trim() || !pRole || !pSquad) return;
    const name = pName.trim();
    setPeople(prev => [...prev, { name, role: pRole, squad: pSquad }]);
    logAction("add", "person", name, `${pRole}, ${pSquad}`, null, `${name} (${pRole}, ${pSquad})`);
    setPName(""); setPRole(""); setPSquad("");
  };

  const closePanel = () => {
    setNewSquad(""); setNewRole("");
    setPName(""); setPRole(""); setPSquad("");
    setPanel(null);
    setPanelStep(0);
  };

  const subTabs = [
    { key: "people", label: "People", count: people.length },
    { key: "squads", label: "Squads", count: squads.length },
    { key: "roles", label: "Roles", count: roles.length },
  ];

  const pc = getPhaseColors();


  /* ═══ RENDER ════════════════════════════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontFamily: typo.displayMd.font, fontSize: typo.displayMd.size,
            fontWeight: typo.displayMd.weight, letterSpacing: typo.displayMd.tracking,
            color: c.text, marginBottom: space[1],
          }}>Settings</div>
          <p style={{
            fontFamily: typo.bodyMd.font, fontSize: typo.bodyMd.size,
            color: c.textMid, lineHeight: typo.bodyMd.lineHeight, margin: 0,
          }}>
            Define squads, roles, people, and projects.
          </p>
        </div>
        <Btn
          variant={simMode ? "command" : "secondary"}
          size="sm"
          onClick={() => { setSimMode(!simMode); setBulkOp(null); setBulkResult(null); setDryRunPreview(null); }}
          style={{
            fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
            fontWeight: 700, letterSpacing: typo.monoMd.tracking,
            ...(simMode ? {
              borderColor: c.orange + "60",
              background: `${c.orange}15`,
              color: c.orange,
            } : {}),
          }}
        >
          {simMode ? "◉ SIM ON" : "◎ SIMULATE"}
        </Btn>
      </div>

      {/* ── Sub-tabs ── */}
      <div style={{ display: "flex", gap: space[2], alignItems: "center" }}>
        <div style={{
          display: "flex", gap: space[1], background: c.surfaceData,
          borderRadius: layout.radiusLg, padding: space[1], border: `1px solid ${c.border}`,
        }}>
          <TelemetryLabel style={{ padding: `0 ${space[2]}px`, alignSelf: "center" }}>OPS</TelemetryLabel>
          {subTabs.filter(st => st.key === "people").map(st => (
            <button key={st.key} className="flow-btn" onClick={() => setSubTab(st.key)} style={{
              padding: `${space[2]}px ${space[3]}px`, borderRadius: layout.radiusMd, border: "none", cursor: "pointer",
              background: subTab === st.key ? c.accentDim : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: space[2],
              transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
            }}>
              <span style={{
                fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                fontWeight: subTab === st.key ? 700 : 500,
                color: subTab === st.key ? c.accent : c.textMid,
              }}>{st.label}</span>
              <Tag
                color={subTab === st.key ? c.accent : c.textMid}
                bg={subTab === st.key ? `${c.accent}15` : c.surfaceAlt}
              >{st.count}</Tag>
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: c.border, flexShrink: 0 }} />
        <div style={{
          display: "flex", gap: space[1], background: c.surfaceData,
          borderRadius: layout.radiusLg, padding: space[1], border: `1px solid ${c.border}`,
        }}>
          <TelemetryLabel style={{ padding: `0 ${space[2]}px`, alignSelf: "center" }}>CONFIG</TelemetryLabel>
          {subTabs.filter(st => st.key === "squads" || st.key === "roles").map(st => (
            <button key={st.key} className="flow-btn" onClick={() => setSubTab(st.key)} style={{
              padding: `${space[2]}px ${space[3]}px`, borderRadius: layout.radiusMd, border: "none", cursor: "pointer",
              background: subTab === st.key ? c.accentDim : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: space[2],
              transition: `all ${motion.interaction.duration} ${motion.interaction.easing}`,
            }}>
              <span style={{
                fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                fontWeight: subTab === st.key ? 700 : 500,
                color: subTab === st.key ? c.accent : c.textMid,
              }}>{st.label}</span>
              <Tag
                color={subTab === st.key ? c.accent : c.textMid}
                bg={subTab === st.key ? `${c.accent}15` : c.surfaceAlt}
              >{st.count}</Tag>
            </button>
          ))}
        </div>
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
            <div className="flow-data-grid-header" style={{ gridTemplateColumns: "4px 1fr 80px 80px 100px" }}>
              <span></span>
              <span>Squad</span>
              <span>Members</span>
              <span>Projects</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {squads.map((sq, i) => {
                const memberCount = people.filter(p => p.squad === sq).length;
                const projCount = projects.filter(p => p.squad === sq).length;
                return (
                  <div key={i} className="flow-data-grid-row" style={{ gridTemplateColumns: "4px 1fr 80px 80px 100px" }}>
                    <div style={{ width: 4, height: 24, borderRadius: 2, background: c.accent }} />
                    <span style={{
                      fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                      fontWeight: typo.bodyLg.weight, color: c.text,
                    }}>{sq}</span>
                    <span style={{
                      fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                      fontWeight: typo.monoLg.weight, color: c.textMid,
                    }}>{memberCount}</span>
                    <span style={{
                      fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                      fontWeight: typo.monoLg.weight, color: c.textMid,
                    }}>{projCount}</span>
                    <div style={{ display: "flex", gap: space[1], justifyContent: "flex-end" }}>
                      <Btn variant="danger" size="sm" onClick={() => requestDelete("squad", i, sq)}>
                        <span>✕</span> DELETE
                      </Btn>
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
            <div className="flow-data-grid-header" style={{ gridTemplateColumns: "1fr 80px 100px" }}>
              <span>Role</span>
              <span>Holders</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {roles.map((rl, i) => {
                const holderCount = people.filter(p => p.role === rl).length;
                return (
                  <div key={i} className="flow-data-grid-row" style={{ gridTemplateColumns: "1fr 80px 100px" }}>
                    <span style={{
                      fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                      fontWeight: typo.bodyLg.weight, color: c.text,
                    }}>{rl}</span>
                    <span style={{
                      fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                      fontWeight: typo.monoLg.weight, color: c.textMid,
                    }}>{holderCount}</span>
                    <div style={{ display: "flex", gap: space[1], justifyContent: "flex-end" }}>
                      <Btn variant="danger" size="sm" onClick={() => requestDelete("role", i, rl)}>
                        <span>✕</span> DELETE
                      </Btn>
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
                  <div className="flow-data-grid-header" style={{ gridTemplateColumns: "1fr 1fr 100px" }}>
                    <span>Name</span>
                    <span>Role</span>
                    <span style={{ textAlign: "right" }}>Actions</span>
                  </div>
                  {members.map((p, i) => {
                    const gi = people.indexOf(p);
                    return (
                      <div key={i} className="flow-data-grid-row" style={{ gridTemplateColumns: "1fr 1fr 100px" }}>
                        <span style={{
                          fontFamily: typo.bodyLg.font, fontSize: typo.bodyLg.size,
                          fontWeight: typo.bodyLg.weight, color: c.text,
                        }}>{p.name}</span>
                        <span style={{
                          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                          color: c.textMid,
                        }}>{p.role}</span>
                        <div style={{ display: "flex", gap: space[1], justifyContent: "flex-end" }}>
                          <Btn variant="danger" size="sm" onClick={() => requestDelete("person", gi, p.name)}>
                            <span>✕</span> DELETE
                          </Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

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




      {/* ═══ SIMULATION MODE — Bulk Operations ═══ */}
      {simMode && (
        <Surface variant="data" style={{
          padding: `${space[4]}px ${space[5]}px`,
          borderColor: c.orange + "25",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: space[3] }}>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <span style={{
                fontFamily: typo.displaySm.font, fontSize: typo.displaySm.size,
                fontWeight: typo.displaySm.weight, letterSpacing: typo.displaySm.tracking,
                color: c.orange,
              }}>Simulation Mode</span>
              <Tag color={c.bg} bg={c.orange} style={{ fontWeight: 700 }}>SAFE PREVIEW</Tag>
            </div>
            <div style={{ display: "flex", gap: space[1] }}>
              {[
                { key: "csv", label: "CSV IMPORT" },
                { key: "reassign", label: "REASSIGN" },
                { key: "phase", label: "MIGRATE" },
              ].map(op => (
                <Btn key={op.key} variant="secondary" size="sm"
                  onClick={() => { setBulkOp(bulkOp === op.key ? null : op.key); setBulkResult(null); setDryRunPreview(null); }}
                  style={{
                    fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size,
                    letterSpacing: typo.monoMd.tracking, fontWeight: 700,
                    ...(bulkOp === op.key ? {
                      borderColor: c.orange + "60",
                      background: `${c.orange}15`,
                      color: c.orange,
                    } : {}),
                  }}
                >{op.label}</Btn>
              ))}
            </div>
          </div>

          {/* Result report */}
          {bulkResult && (
            <div style={{
              padding: `${space[3]}px ${space[3]}px`, borderRadius: layout.radiusMd,
              background: c.greenDim, border: `1px solid ${c.green}25`, marginBottom: space[3],
            }}>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
                fontWeight: 700, color: c.green, marginBottom: space[1],
              }}>
                Completed: {bulkResult.success} of {bulkResult.total} succeeded
              </div>
              {bulkResult.exceptions.length > 0 && (
                <div style={{ marginTop: space[2] }}>
                  <TelemetryLabel color={c.orange} style={{ marginBottom: space[1], display: "block" }}>
                    EXCEPTIONS ({bulkResult.exceptions.length})
                  </TelemetryLabel>
                  {bulkResult.exceptions.map((ex, i) => (
                    <div key={i} style={{
                      fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                      color: c.textMid, padding: "2px 0",
                    }}>• {ex}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CSV Import */}
          {bulkOp === "csv" && (
            <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid,
              }}>
                Import people as CSV: <span style={{
                  fontFamily: typo.monoMd.font, fontSize: typo.monoMd.size, color: c.accent,
                }}>Name, Role, Squad</span> — one per line
              </div>
              <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setDryRunPreview(null); }}
                placeholder={"Aisha K., Engineer, Platform\nZaid M., Designer, Consumer"}
                className="flow-input"
                style={{
                  width: "100%", height: 100, padding: `${space[3]}px ${space[3]}px`,
                  borderRadius: layout.radiusMd,
                  border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text,
                  fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size, outline: "none",
                  resize: "vertical", boxSizing: "border-box",
                }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <TelemetryLabel>{csvText.trim() ? csvText.trim().split("\n").length : 0} rows</TelemetryLabel>
                <Btn variant="command" size="sm"
                  onClick={dryRunCsvImport}
                  disabled={!csvText.trim()}
                  style={csvText.trim() ? { borderColor: c.orange + "60", color: c.orange } : {}}
                >PREVIEW</Btn>
              </div>
            </div>
          )}

          {/* Owner Reassign */}
          {bulkOp === "reassign" && (
            <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid,
              }}>Reassign all projects from one owner to another</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: space[3], alignItems: "end" }}>
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>FROM</TelemetryLabel>
                  <Sel value={reassignFrom} onChange={e => { setReassignFrom(e.target.value); setDryRunPreview(null); }}>
                    <option value="">Select owner...</option>
                    {[...new Set(projects.map(p => p.owner).filter(Boolean))].sort().map(o => {
                      const cnt = projects.filter(p => p.owner === o).length;
                      return <option key={o} value={o}>{o} ({cnt})</option>;
                    })}
                  </Sel>
                </div>
                <span style={{
                  fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                  color: c.textDim, paddingBottom: space[2],
                }}>→</span>
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>TO</TelemetryLabel>
                  <Sel value={reassignTo} onChange={e => { setReassignTo(e.target.value); setDryRunPreview(null); }}>
                    <option value="">Select owner...</option>
                    {people.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </Sel>
                </div>
                <Btn variant="command" size="sm"
                  onClick={dryRunReassign}
                  disabled={!reassignFrom || !reassignTo || reassignFrom === reassignTo}
                  style={(reassignFrom && reassignTo && reassignFrom !== reassignTo) ? { borderColor: c.orange + "60", color: c.orange } : {}}
                >PREVIEW</Btn>
              </div>
            </div>
          )}

          {/* Phase Migration */}
          {bulkOp === "phase" && (
            <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{
                fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size, color: c.textMid,
              }}>Migrate all projects from one phase to another</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 1fr auto", gap: space[3], alignItems: "end" }}>
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>FROM PHASE</TelemetryLabel>
                  <Sel value={migrateFromPhase} onChange={e => { setMigrateFromPhase(e.target.value); setDryRunPreview(null); }}>
                    <option value="">Select...</option>
                    {phaseNames.map(p => {
                      const cnt = projects.filter(pr => pr.phase === p && (!migrateSquadFilter || pr.squad === migrateSquadFilter)).length;
                      return <option key={p} value={p}>{p} ({cnt})</option>;
                    })}
                  </Sel>
                </div>
                <span style={{
                  fontFamily: typo.monoLg.font, fontSize: typo.monoLg.size,
                  color: c.textDim, paddingBottom: space[2],
                }}>→</span>
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>TO PHASE</TelemetryLabel>
                  <Sel value={migrateToPhase} onChange={e => { setMigrateToPhase(e.target.value); setDryRunPreview(null); }}>
                    <option value="">Select...</option>
                    {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
                  </Sel>
                </div>
                <div>
                  <TelemetryLabel style={{ marginBottom: space[1], display: "block" }}>SQUAD (OPT.)</TelemetryLabel>
                  <Sel value={migrateSquadFilter} onChange={e => { setMigrateSquadFilter(e.target.value); setDryRunPreview(null); }}>
                    <option value="">All squads</option>
                    {squads.map(s => <option key={s} value={s}>{s}</option>)}
                  </Sel>
                </div>
                <Btn variant="command" size="sm"
                  onClick={dryRunPhaseMigrate}
                  disabled={!migrateFromPhase || !migrateToPhase || migrateFromPhase === migrateToPhase}
                  style={(migrateFromPhase && migrateToPhase && migrateFromPhase !== migrateToPhase) ? { borderColor: c.orange + "60", color: c.orange } : {}}
                >PREVIEW</Btn>
              </div>
            </div>
          )}

          {!bulkOp && (
            <div style={{
              fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
              color: c.textDim, textAlign: "center", padding: `${space[2]}px 0`,
            }}>Select an operation above</div>
          )}

          {/* ── Git-style Diff Viewer ── */}
          {dryRunPreview && (
            <div style={{ marginTop: space[3] }} className="flow-diff-viewer">
              <div className="flow-diff-header">
                <span style={{ color: c.orange, fontWeight: 700 }}>DIFF</span>
                <span style={{ color: c.textDim }}>|</span>
                <span>{dryRunPreview.summary}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: space[2] }}>
                  <Btn variant="danger" size="sm" onClick={() => setDryRunPreview(null)}>Discard</Btn>
                  <Btn variant="success" size="sm"
                    onClick={dryRunPreview.execute}
                    disabled={dryRunPreview.items.length === 0}
                  >Apply ({dryRunPreview.items.length})</Btn>
                </div>
              </div>

              {dryRunPreview.type === "csv" && (
                <>
                  <div className="flow-diff-hunk">@@ +{dryRunPreview.items.length} new people @@</div>
                  {dryRunPreview.items.map((item, i) => (
                    <div key={i} className="flow-diff-line flow-diff-line-add" style={{ animationDelay: `${i * 0.04}s` }}>
                      + {item.name} ({item.role}, {item.squad})
                    </div>
                  ))}
                </>
              )}

              {(dryRunPreview.type === "reassign" || dryRunPreview.type === "phase") && (
                <>
                  <div className="flow-diff-hunk">@@ {dryRunPreview.items.length} project{dryRunPreview.items.length !== 1 ? "s" : ""} modified @@</div>
                  {dryRunPreview.items.slice(0, 50).map((item, i) => (
                    <React.Fragment key={i}>
                      <div className="flow-diff-line flow-diff-line-del" style={{ animationDelay: `${i * 0.06}s` }}>
                        - {item.id} {item.name}: {dryRunPreview.type === "reassign" ? "owner" : "phase"}={item.before}
                      </div>
                      <div className="flow-diff-line flow-diff-line-add" style={{ animationDelay: `${i * 0.06 + 0.03}s` }}>
                        + {item.id} {item.name}: {dryRunPreview.type === "reassign" ? "owner" : "phase"}={item.after}
                      </div>
                    </React.Fragment>
                  ))}
                  {dryRunPreview.items.length > 50 && (
                    <div className="flow-diff-line flow-diff-line-ctx" style={{ fontStyle: "italic" }}>... and {dryRunPreview.items.length - 50} more</div>
                  )}
                </>
              )}

              {dryRunPreview.exceptions.length > 0 && (
                <div style={{
                  padding: `${space[2]}px ${space[3]}px`,
                  background: `${c.orange}08`, borderTop: `1px solid ${c.orange}20`,
                }}>
                  <TelemetryLabel color={c.orange} style={{ marginBottom: space[1], display: "block" }}>
                    WARNINGS ({dryRunPreview.exceptions.length})
                  </TelemetryLabel>
                  {dryRunPreview.exceptions.map((ex, i) => (
                    <div key={i} style={{
                      fontFamily: typo.bodyXs.font, fontSize: typo.bodyXs.size,
                      color: c.orange, padding: "2px 0",
                    }}>! {ex}</div>
                  ))}
                </div>
              )}

              {dryRunPreview.items.length === 0 && (
                <div className="flow-diff-line flow-diff-line-ctx" style={{
                  textAlign: "center", padding: `${space[4]}px 0`,
                }}>No changes to apply — check warnings</div>
              )}
            </div>
          )}
        </Surface>
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
                    fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
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
          <div className="flow-slide-over" onClick={e => e.stopPropagation()} style={{
            position: "relative", width: 460, height: "100%",
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
                  {panel.type === "squad" ? "Add Squad" : panel.type === "role" ? "Add Role" : "Add Person"}
                </span>
                <Btn variant="ghost" size="sm" onClick={closePanel} style={{
                  width: 28, height: 28, padding: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: typo.bodySm.size, color: c.textDim,
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

              {/* Person form */}
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
                  <Btn variant="primary" onClick={() => { addSquad(); closePanel(); }}
                    disabled={!newSquad.trim()}>Add Squad</Btn>
                )}
                {panel.type === "role" && (
                  <Btn variant="primary" onClick={() => { addRole(); closePanel(); }}
                    disabled={!newRole.trim()}>Add Role</Btn>
                )}
                {panel.type === "person" && (
                  <Btn variant="primary" onClick={() => { addPerson(); closePanel(); }}
                    disabled={!(pName.trim() && pRole && pSquad)}>Add Person</Btn>
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
          <div style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 200, background: "rgba(0,0,0,0.5)",
          }} onClick={() => setConfirmAction(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: c.surfaceOverlay, borderRadius: layout.radiusLg + 4, // 16px
              padding: `${space[6]}px ${space[7] - 4}px`, // 24px 28px
              width: 420,
              border: `1px solid ${confirmAction.blocked ? c.red + "60" : c.border}`,
              boxShadow: c.shadowOverlay,
            }}>
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
                          fontFamily: typo.bodySm.font, fontSize: typo.bodySm.size,
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
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SettingsView;
