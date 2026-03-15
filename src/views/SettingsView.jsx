// Flow — Settings View (Phase 6: Futuristic Admin Console)
import React, { useState, useRef, useEffect } from "react";
import { c, display, body, mono, phaseNames, phaseColors as getPhaseColors, layout } from "../styles/theme";
import { Badge } from "../components/shared";
import useKeyboard from "../hooks/useKeyboard";

/* ── style helpers ──────────────────────────────────────── */
const fld = (mb = 3, extra = {}) => ({ fontFamily: mono, fontSize: 9, color: c.textDim, marginBottom: mb, letterSpacing: "0.08em", textTransform: "uppercase", ...extra });
const inp = (extra = {}) => ({
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text,
  fontFamily: body, fontSize: 13, outline: "none", boxSizing: "border-box",
  ...extra,
});
const sel = (extra = {}) => ({
  ...inp(), appearance: "auto", cursor: "pointer", ...extra,
});
const btnStyle = (active, color = c.accent) => ({
  padding: "8px 16px", borderRadius: 8, border: "none", cursor: active ? "pointer" : "default",
  background: active ? color : c.surfaceAlt, color: active ? "#fff" : c.textDim,
  fontFamily: body, fontSize: 12, fontWeight: 700,
});

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: display, fontSize: 20, fontWeight: 800, color: c.text, marginBottom: 4 }}>Settings</div>
          <p style={{ fontFamily: body, fontSize: 13, color: c.textMid, lineHeight: 1.5, margin: 0 }}>
            Define squads, roles, people, and projects.
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => { setSimMode(!simMode); setBulkOp(null); setBulkResult(null); setDryRunPreview(null); }}
            className="flow-cmd-btn"
            style={{
              padding: "7px 14px", borderRadius: 8,
              border: `1px solid ${simMode ? c.orange + "60" : c.border}`,
              background: simMode ? `${c.orange}15` : "transparent",
              color: simMode ? c.orange : c.textDim,
              fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {simMode ? "◉ SIM ON" : "◎ SIMULATE"}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 3, background: c.surface, borderRadius: 12, padding: 4, border: `1px solid ${c.border}` }}>
          <span style={{ fontFamily: mono, fontSize: 8, color: c.textDim, letterSpacing: "0.08em", padding: "0 6px", alignSelf: "center" }}>OPS</span>
          {subTabs.filter(st => st.key === "people").map(st => (
            <button key={st.key} onClick={() => setSubTab(st.key)} style={{
              padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: subTab === st.key ? c.accentDim : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}>
              <span style={{ fontFamily: display, fontSize: 14, fontWeight: subTab === st.key ? 700 : 500, color: subTab === st.key ? c.accent : c.textMid }}>{st.label}</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: subTab === st.key ? c.accent : c.textDim, background: subTab === st.key ? `${c.accent}15` : c.surfaceAlt, padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{st.count}</span>
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 28, background: c.border }} />
        <div style={{ display: "flex", gap: 3, background: c.surface, borderRadius: 12, padding: 4, border: `1px solid ${c.border}` }}>
          <span style={{ fontFamily: mono, fontSize: 8, color: c.textDim, letterSpacing: "0.08em", padding: "0 6px", alignSelf: "center" }}>CONFIG</span>
          {subTabs.filter(st => st.key === "squads" || st.key === "roles").map(st => (
            <button key={st.key} onClick={() => setSubTab(st.key)} style={{
              padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              background: subTab === st.key ? c.accentDim : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.15s",
            }}>
              <span style={{ fontFamily: display, fontSize: 14, fontWeight: subTab === st.key ? 700 : 500, color: subTab === st.key ? c.accent : c.textMid }}>{st.label}</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: subTab === st.key ? c.accent : c.textDim, background: subTab === st.key ? `${c.accent}15` : c.surfaceAlt, padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>{st.count}</span>
            </button>
          ))}
        </div>
      </div>


      {/* ═══ SQUADS ═══ */}
      {subTab === "squads" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => setPanel({ type: "squad", mode: "create" })} className="flow-cmd-btn flow-cmd-btn-edit" style={{ padding: "8px 16px", fontSize: 10 }}>
              <span style={{ fontSize: 12 }}>+</span> ADD SQUAD
            </button>
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
                    <span style={{ fontFamily: display, fontSize: 14, fontWeight: 600, color: c.text }}>{sq}</span>
                    <span style={{ fontFamily: mono, fontSize: 12, color: c.textMid }}>{memberCount}</span>
                    <span style={{ fontFamily: mono, fontSize: 12, color: c.textMid }}>{projCount}</span>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button onClick={() => requestDelete("squad", i, sq)} className="flow-cmd-btn flow-cmd-btn-delete">
                        <span>✕</span> DELETE
                      </button>
                    </div>
                  </div>
                );
              })}
              {squads.length === 0 && <div style={{ textAlign: "center", padding: "30px 0", fontFamily: body, fontSize: 13, color: c.textDim }}>No squads defined</div>}
            </div>
          </div>
        </div>
      )}


      {/* ═══ ROLES ═══ */}
      {subTab === "roles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => setPanel({ type: "role", mode: "create" })} className="flow-cmd-btn flow-cmd-btn-edit" style={{ padding: "8px 16px", fontSize: 10 }}>
              <span style={{ fontSize: 12 }}>+</span> ADD ROLE
            </button>
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
                    <span style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text }}>{rl}</span>
                    <span style={{ fontFamily: mono, fontSize: 12, color: c.textMid }}>{holderCount}</span>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      <button onClick={() => requestDelete("role", i, rl)} className="flow-cmd-btn flow-cmd-btn-delete">
                        <span>✕</span> DELETE
                      </button>
                    </div>
                  </div>
                );
              })}
              {roles.length === 0 && <div style={{ textAlign: "center", padding: "30px 0", fontFamily: body, fontSize: 13, color: c.textDim }}>No roles defined</div>}
            </div>
          </div>
        </div>
      )}


      {/* ═══ PEOPLE ═══ */}
      {subTab === "people" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => setPanel({ type: "person", mode: "create" })} className="flow-cmd-btn flow-cmd-btn-edit" style={{ padding: "8px 16px", fontSize: 10 }}>
              <span style={{ fontSize: 12 }}>+</span> ADD PERSON
            </button>
          </div>

          {squads.map(sq => {
            const members = people.filter(p => p.squad === sq);
            if (!members.length) return null;
            return (
              <div key={sq}>
                <div style={{ fontFamily: display, fontSize: 15, fontWeight: 800, color: c.accent, marginBottom: 6 }}>{sq} · {members.length}</div>
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
                        <span style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: c.text }}>{p.name}</span>
                        <span style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>{p.role}</span>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button onClick={() => requestDelete("person", gi, p.name)} className="flow-cmd-btn flow-cmd-btn-delete">
                            <span>✕</span> DELETE
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}




      {/* ═══ SIMULATION MODE — Bulk Operations ═══ */}
      {simMode && (
        <div style={{
          background: c.surface, borderRadius: 12, padding: "16px 22px",
          border: `1px solid ${c.orange}25`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: c.orange }}>Simulation Mode</span>
              <span style={{ fontFamily: mono, fontSize: 9, color: c.bg, background: c.orange, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>SAFE PREVIEW</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[
                { key: "csv", label: "CSV IMPORT" },
                { key: "reassign", label: "REASSIGN" },
                { key: "phase", label: "MIGRATE" },
              ].map(op => (
                <button key={op.key} onClick={() => { setBulkOp(bulkOp === op.key ? null : op.key); setBulkResult(null); setDryRunPreview(null); }}
                  className="flow-cmd-btn"
                  style={{
                    borderColor: bulkOp === op.key ? c.orange + "60" : c.border,
                    background: bulkOp === op.key ? `${c.orange}15` : "transparent",
                    color: bulkOp === op.key ? c.orange : c.textDim,
                  }}
                >{op.label}</button>
              ))}
            </div>
          </div>

          {/* Result report */}
          {bulkResult && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: c.greenDim, border: `1px solid ${c.green}25`, marginBottom: 12 }}>
              <div style={{ fontFamily: body, fontSize: 12, fontWeight: 700, color: c.green, marginBottom: 4 }}>
                Completed: {bulkResult.success} of {bulkResult.total} succeeded
              </div>
              {bulkResult.exceptions.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: c.orange, marginBottom: 4 }}>EXCEPTIONS ({bulkResult.exceptions.length})</div>
                  {bulkResult.exceptions.map((ex, i) => (
                    <div key={i} style={{ fontFamily: body, fontSize: 11, color: c.textMid, padding: "2px 0" }}>• {ex}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CSV Import */}
          {bulkOp === "csv" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>
                Import people as CSV: <span style={{ fontFamily: mono, fontSize: 10, color: c.accent }}>Name, Role, Squad</span> — one per line
              </div>
              <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setDryRunPreview(null); }} placeholder={"Aisha K., Engineer, Platform\nZaid M., Designer, Consumer"} style={{
                width: "100%", height: 100, padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${c.border}`, background: c.surfaceAlt, color: c.text,
                fontFamily: mono, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box",
              }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>{csvText.trim() ? csvText.trim().split("\n").length : 0} rows</span>
                <button onClick={dryRunCsvImport} disabled={!csvText.trim()} className="flow-cmd-btn" style={{
                  padding: "7px 16px",
                  borderColor: csvText.trim() ? c.orange + "60" : c.border,
                  color: csvText.trim() ? c.orange : c.textDim,
                  cursor: csvText.trim() ? "pointer" : "default",
                }}>PREVIEW</button>
              </div>
            </div>
          )}

          {/* Owner Reassign */}
          {bulkOp === "reassign" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>Reassign all projects from one owner to another</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 10, alignItems: "end" }}>
                <div>
                  <div style={fld()}>FROM</div>
                  <select value={reassignFrom} onChange={e => { setReassignFrom(e.target.value); setDryRunPreview(null); }} className="flow-input" style={sel()}>
                    <option value="">Select owner...</option>
                    {[...new Set(projects.map(p => p.owner).filter(Boolean))].sort().map(o => {
                      const cnt = projects.filter(p => p.owner === o).length;
                      return <option key={o} value={o}>{o} ({cnt})</option>;
                    })}
                  </select>
                </div>
                <span style={{ fontFamily: mono, fontSize: 14, color: c.textDim, paddingBottom: 8 }}>→</span>
                <div>
                  <div style={fld()}>TO</div>
                  <select value={reassignTo} onChange={e => { setReassignTo(e.target.value); setDryRunPreview(null); }} className="flow-input" style={sel()}>
                    <option value="">Select owner...</option>
                    {people.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={dryRunReassign} disabled={!reassignFrom || !reassignTo || reassignFrom === reassignTo}
                  className="flow-cmd-btn" style={{
                    padding: "7px 16px",
                    borderColor: (reassignFrom && reassignTo && reassignFrom !== reassignTo) ? c.orange + "60" : c.border,
                    color: (reassignFrom && reassignTo && reassignFrom !== reassignTo) ? c.orange : c.textDim,
                    cursor: (reassignFrom && reassignTo && reassignFrom !== reassignTo) ? "pointer" : "default",
                  }}>PREVIEW</button>
              </div>
            </div>
          )}

          {/* Phase Migration */}
          {bulkOp === "phase" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontFamily: body, fontSize: 12, color: c.textMid }}>Migrate all projects from one phase to another</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                <div>
                  <div style={fld()}>FROM PHASE</div>
                  <select value={migrateFromPhase} onChange={e => { setMigrateFromPhase(e.target.value); setDryRunPreview(null); }} className="flow-input" style={sel()}>
                    <option value="">Select...</option>
                    {phaseNames.map(p => {
                      const cnt = projects.filter(pr => pr.phase === p && (!migrateSquadFilter || pr.squad === migrateSquadFilter)).length;
                      return <option key={p} value={p}>{p} ({cnt})</option>;
                    })}
                  </select>
                </div>
                <span style={{ fontFamily: mono, fontSize: 14, color: c.textDim, paddingBottom: 8 }}>→</span>
                <div>
                  <div style={fld()}>TO PHASE</div>
                  <select value={migrateToPhase} onChange={e => { setMigrateToPhase(e.target.value); setDryRunPreview(null); }} className="flow-input" style={sel()}>
                    <option value="">Select...</option>
                    {phaseNames.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={fld()}>SQUAD (opt.)</div>
                  <select value={migrateSquadFilter} onChange={e => { setMigrateSquadFilter(e.target.value); setDryRunPreview(null); }} className="flow-input" style={sel()}>
                    <option value="">All squads</option>
                    {squads.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button onClick={dryRunPhaseMigrate} disabled={!migrateFromPhase || !migrateToPhase || migrateFromPhase === migrateToPhase}
                  className="flow-cmd-btn" style={{
                    padding: "7px 16px",
                    borderColor: (migrateFromPhase && migrateToPhase && migrateFromPhase !== migrateToPhase) ? c.orange + "60" : c.border,
                    color: (migrateFromPhase && migrateToPhase && migrateFromPhase !== migrateToPhase) ? c.orange : c.textDim,
                    cursor: (migrateFromPhase && migrateToPhase && migrateFromPhase !== migrateToPhase) ? "pointer" : "default",
                  }}>PREVIEW</button>
              </div>
            </div>
          )}

          {!bulkOp && <div style={{ fontFamily: body, fontSize: 12, color: c.textDim, textAlign: "center", padding: "6px 0" }}>Select an operation above</div>}

          {/* ── Git-style Diff Viewer ── */}
          {dryRunPreview && (
            <div style={{ marginTop: 14 }} className="flow-diff-viewer">
              <div className="flow-diff-header">
                <span style={{ color: c.orange, fontWeight: 700 }}>DIFF</span>
                <span style={{ color: c.textDim }}>|</span>
                <span>{dryRunPreview.summary}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={() => setDryRunPreview(null)} className="flow-cmd-btn flow-cmd-btn-delete" style={{ fontSize: 8 }}>DISCARD</button>
                  <button onClick={dryRunPreview.execute} disabled={dryRunPreview.items.length === 0}
                    className="flow-cmd-btn flow-cmd-btn-archive" style={{ fontSize: 8, opacity: dryRunPreview.items.length === 0 ? 0.4 : 1 }}>
                    APPLY ({dryRunPreview.items.length})
                  </button>
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
                <div style={{ padding: "8px 14px", background: `${c.orange}08`, borderTop: `1px solid ${c.orange}20` }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: c.orange, marginBottom: 4 }}>WARNINGS ({dryRunPreview.exceptions.length})</div>
                  {dryRunPreview.exceptions.map((ex, i) => (
                    <div key={i} style={{ fontFamily: body, fontSize: 11, color: c.orange, padding: "2px 0" }}>! {ex}</div>
                  ))}
                </div>
              )}

              {dryRunPreview.items.length === 0 && (
                <div className="flow-diff-line flow-diff-line-ctx" style={{ textAlign: "center", padding: "16px 0" }}>No changes to apply — check warnings</div>
              )}
            </div>
          )}
        </div>
      )}


      {/* ═══ AUDIT LOG — Event Stream ═══ */}
      {auditLog.length > 0 && (
        <div style={{
          background: c.surface, borderRadius: 12, padding: "16px 22px",
          border: `1px solid ${c.blue}25`,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: display, fontSize: 15, fontWeight: 700, color: c.text }}>Audit Stream</span>
              <span style={{ fontFamily: mono, fontSize: 9, color: c.bg, background: c.blue, padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{auditLog.length} EVENTS</span>
            </div>
            <button onClick={() => setAuditLog([])} className="flow-cmd-btn flow-cmd-btn-delete" style={{ fontSize: 8 }}>CLEAR</button>
          </div>

          <div className="flow-audit-stream">
            {auditLog.map((log, li) => {
              const severity = getAuditSeverity(log.action);
              return (
                <div key={li} className="flow-audit-event" style={{ animationDelay: `${li * 0.03}s` }}>
                  <div className={`flow-audit-severity-dot flow-audit-severity-dot-${severity}`} />
                  <span className="flow-audit-timestamp">{new Date(log.at).toLocaleTimeString()}</span>
                  <span className={`flow-audit-severity-${severity}`} style={{
                    fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    minWidth: 80,
                  }}>{log.action}</span>
                  <span style={{ fontFamily: mono, fontSize: 9, color: c.textDim }}>{log.entity}</span>
                  <span style={{ fontFamily: body, fontSize: 12, fontWeight: 600, color: c.text }}>{log.name}</span>
                  {(log.before || log.after) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                      {log.before && <span style={{ fontFamily: mono, fontSize: 10, color: c.red, textDecoration: "line-through" }}>{log.before}</span>}
                      {log.before && log.after && <span style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>→</span>}
                      {log.after && <span style={{ fontFamily: mono, fontSize: 10, color: c.green, fontWeight: 600 }}>{log.after}</span>}
                    </div>
                  )}
                  {!log.before && !log.after && log.detail && (
                    <span style={{ fontFamily: body, fontSize: 11, color: c.textDim, marginLeft: "auto" }}>{log.detail}</span>
                  )}
                  <span style={{ fontFamily: mono, fontSize: 9, color: c.blue }}>{log.by}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ═══ SLIDE-OVER PANEL ═══ */}
      {panel && (
        <div className="flow-slide-over-overlay" style={{ position: "fixed", inset: 0, zIndex: 190, display: "flex", justifyContent: "flex-end" }} onClick={closePanel}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
          <div className="flow-slide-over" onClick={e => e.stopPropagation()} style={{
            position: "relative", width: 460, height: "100%",
            background: c.surfaceSolid, borderLeft: `1px solid ${c.border}`,
            boxShadow: "-8px 0 30px rgba(0,0,0,0.3)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Panel header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: c.text }}>
                    {panel.type === "squad" ? "Add Squad" : panel.type === "role" ? "Add Role" : "Add Person"}
                  </span>
                </div>
                <button onClick={closePanel} className="flow-btn" style={{
                  width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`,
                  background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: c.textDim,
                }}>✕</button>
              </div>

            </div>

            {/* Panel body */}
            <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Squad form */}
              {panel.type === "squad" && (
                <div>
                  <div style={fld()}>SQUAD NAME</div>
                  <input value={newSquad} onChange={e => setNewSquad(e.target.value)} placeholder="New squad name..."
                    onKeyDown={e => e.key === "Enter" && addSquad()} className="flow-input" style={inp()} autoFocus />
                </div>
              )}

              {/* Role form */}
              {panel.type === "role" && (
                <div>
                  <div style={fld()}>ROLE NAME</div>
                  <input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="New role / designation..."
                    onKeyDown={e => e.key === "Enter" && addRole()} className="flow-input" style={inp()} autoFocus />
                </div>
              )}

              {/* Person form */}
              {panel.type === "person" && (
                <>
                  <div>
                    <div style={fld()}>NAME</div>
                    <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Full name" className="flow-input" style={inp()} autoFocus />
                  </div>
                  <div>
                    <div style={fld()}>ROLE</div>
                    <select value={pRole} onChange={e => setPRole(e.target.value)} className="flow-input" style={sel()}>
                      <option value="">Select...</option>{roles.map((r, i) => <option key={i} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={fld()}>SQUAD</div>
                    <select value={pSquad} onChange={e => setPSquad(e.target.value)} className="flow-input" style={sel()}>
                      <option value="">Select...</option>{squads.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    </select>
                  </div>
                </>
              )}

            </div>

            {/* Panel footer */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${c.border}`, display: "flex", gap: 8, justifyContent: "space-between", flexShrink: 0 }}>
              <button onClick={closePanel} className="flow-cmd-btn flow-cmd-btn-delete" style={{ padding: "8px 18px", fontSize: 10 }}>CANCEL</button>

              <div style={{ display: "flex", gap: 8 }}>
                {/* Submit buttons */}
                {panel.type === "squad" && (
                  <button onClick={() => { addSquad(); closePanel(); }} className="flow-btn" style={btnStyle(!!newSquad.trim())}>Add Squad</button>
                )}
                {panel.type === "role" && (
                  <button onClick={() => { addRole(); closePanel(); }} className="flow-btn" style={btnStyle(!!newRole.trim())}>Add Role</button>
                )}
                {panel.type === "person" && (
                  <button onClick={() => { addPerson(); closePanel(); }} className="flow-btn" style={btnStyle(pName.trim() && pRole && pSquad)}>Add Person</button>
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
          <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, background: "rgba(0,0,0,0.5)" }} onClick={() => setConfirmAction(null)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: c.surfaceSolid, borderRadius: 16, padding: "24px 28px", width: 420,
              border: `1px solid ${confirmAction.blocked ? c.red + "60" : c.border}`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.4)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: confirmAction.blocked ? (c.redDim || `${c.red}10`) : isDone ? c.greenDim : (c.orangeDim || `${c.orange}10`),
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{icon}</div>
                <div>
                  <div style={{ fontFamily: display, fontSize: 16, fontWeight: 700, color: c.text }}>{title}</div>
                  <div style={{ fontFamily: mono, fontSize: 12, color: c.accent, fontWeight: 600 }}>{confirmAction.name}</div>
                </div>
              </div>

              {confirmAction.deps.length > 0 && (
                <div style={{
                  background: `${confirmAction.blocked ? c.red : c.orange}08`,
                  border: `1px solid ${confirmAction.blocked ? c.red : c.orange}20`,
                  borderRadius: 10, padding: "10px 12px", marginBottom: 16,
                }}>
                  <div style={{ fontFamily: body, fontSize: 11, fontWeight: 700, color: confirmAction.blocked ? c.red : c.orange, marginBottom: 6 }}>
                    {confirmAction.blocked ? "Hard-blocked — resolve dependencies first:" : "Dependencies found:"}
                  </div>
                  {confirmAction.deps.map((d, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: confirmAction.blocked ? c.red : c.orange, fontSize: 10 }}>•</span>
                        <span style={{ fontFamily: body, fontSize: 12, color: confirmAction.blocked ? c.red : c.orange }}>{d.text}</span>
                      </div>
                      {d.items && d.items.length > 0 && (
                        <div style={{ paddingLeft: 16, marginTop: 2 }}>
                          {d.items.slice(0, 5).map((item, j) => (
                            <div key={j} style={{ fontFamily: mono, fontSize: 10, color: c.textDim, padding: "1px 0" }}>{item}</div>
                          ))}
                          {d.items.length > 5 && <div style={{ fontFamily: mono, fontSize: 10, color: c.textDim }}>...and {d.items.length - 5} more</div>}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ fontFamily: body, fontSize: 11, color: c.textMid, marginTop: 8 }}>
                    {confirmAction.blocked ? "Reassign or remove all dependencies before deleting." : "This cannot be undone."}
                  </div>
                </div>
              )}

              {confirmAction.deps.length === 0 && (
                <div style={{ fontFamily: body, fontSize: 13, color: c.textMid, marginBottom: 16 }}>
                  {isDelete ? "This action cannot be undone. Are you sure?" : "Are you sure you want to mark this project as completed?"}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmAction(null)} className="flow-cmd-btn flow-cmd-btn-delete" style={{ padding: "8px 20px", fontSize: 10 }}>
                  {confirmAction.blocked ? "CLOSE" : "CANCEL"}
                </button>
                {!confirmAction.blocked && (
                  <button onClick={executeConfirmAction} className="flow-btn" style={{
                    padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: accentColor, fontFamily: body, fontSize: 13, fontWeight: 700, color: "#fff",
                  }}>{confirmLabel}</button>
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
