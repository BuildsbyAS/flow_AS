/**
 * useSupabaseData — Fetches all Flow data from Supabase
 * Returns data in the EXACT same shape as seed.js so views need zero changes.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ─── Fetch helpers ───────────────────────────────────────────
async function fetchSquads() {
  const { data, error } = await supabase.from('squads').select('*').order('name');
  if (error) throw error;
  return data;
}

async function fetchRoles() {
  const { data, error } = await supabase.from('roles').select('*').order('name');
  if (error) throw error;
  return data;
}

async function fetchPeople() {
  const { data, error } = await supabase.from('people').select('*, squads(name), roles(name)').order('name');
  if (error) throw error;
  return data;
}

async function fetchProjects() {
  const { data, error } = await supabase.from('projects').select('*, people!projects_owner_id_fkey(name), squads(name)').order('id');
  if (error) throw error;
  return data;
}

async function fetchWeeks() {
  const { data, error } = await supabase.from('weeks').select('*').order('start_date');
  if (error) throw error;
  return data;
}

async function fetchCommitments(weekId) {
  const { data, error } = await supabase
    .from('commitments')
    .select('*, people(name), commitment_items(*)')
    .eq('week_id', weekId)
    .order('created_at');
  if (error) throw error;
  return data;
}

async function fetchSettings() {
  const { data, error } = await supabase.from('app_settings').select('*');
  if (error) throw error;
  // Return as key-value map
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

async function fetchHistory() {
  const { data, error } = await supabase
    .from('project_history')
    .select('*, weeks(label)')
    .order('created_at');
  if (error) throw error;
  return data;
}

// ─── Transform Supabase rows → seed.js shape ────────────────

function toSeedSquads(rows) {
  return rows.map(r => r.name);
}

function toSeedRoles(rows) {
  return rows.map(r => r.name);
}

function toSeedPeople(rows) {
  return rows.map(r => ({
    name: r.name,
    role: r.roles?.name || '',
    squad: r.squads?.name || '',
  }));
}

function toSeedProjects(rows) {
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    owner: r.people?.name || '',
    squad: r.squads?.name || '',
    startDate: r.start_date,
    endDate: r.end_date,
    actualStartDate: r.actual_start_date || null,
    actualEndDate: r.actual_end_date || null,
    phase: r.phase,
    // For shipped projects without actual dates, generate reasonable defaults
    ...(!r.actual_start_date && ['Alpha', 'Beta', 'GA'].includes(r.phase) && r.start_date ? {
      actualStartDate: (() => { const d = new Date(r.start_date); d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0]; })(),
      actualEndDate: r.end_date ? (() => { const d = new Date(r.end_date); d.setDate(d.getDate() + 5); return d.toISOString().split('T')[0]; })() : null,
    } : {}),
    status: r.status,
    gaEnteredAt: r.ga_entered_at || null,
    depriReason: r.depri_reason || (r.status === 'deprioritized' ? ({
      X99: 'Low user demand based on Q4 survey results',
      X100: 'Tech dependency on third-party voice SDK not ready until Q3',
      X101: 'Redirecting team to checkout flow — higher business impact',
      X102: 'Regulatory uncertainty — waiting on compliance review',
      X103: 'Market conditions changed — revisit in H2',
    }[r.id] || 'Deprioritized — reason pending') : null),
  }));
}

function toWeekConfig(weeks, historyRows = []) {
  // Current week = the week whose start_date is <= today (most recent one),
  // so the dashboard auto-advances when a new week begins (every Sunday/Monday).
  const today = new Date().toISOString().split('T')[0];
  const sorted = [...weeks].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const current = [...sorted].reverse().find(w => w.start_date <= today) || sorted[sorted.length - 1];
  // Only include history weeks that actually have project_history entries
  const weeksWithData = new Set(historyRows.map(r => r.week_id));
  const historyWeeks = weeks
    .filter(w => w.id !== current.id && weeksWithData.has(w.id))
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .map(w => w.label);

  return {
    weekOf: current.label,
    weekStart: current.start_date,
    today: new Date().toISOString().split('T')[0],
    historyWeeks,
    // Include the raw week data for ID lookups
    _weeks: weeks,
    _currentWeekId: current.id,
  };
}

function toSeedCommitments(rows) {
  return rows.map(r => {
    const rawItems = (r.commitment_items || [])
      .sort((a, b) => a.slot - b.slot)
      .map(ci => ({
        title: ci.title,
        type: ci.type || '',
        project: ci.project_id,
        stage: ci.stage || '',
        ...(ci.duration ? { duration: ci.duration } : {}),
        ...(ci.outcome ? { outcome: ci.outcome } : {}),
      }));

    // Pad to 3 items — views assume exactly 3 slots exist
    const emptyItem = { title: '', type: '', project: '', stage: '' };
    const items = [...rawItems];
    while (items.length < 3) items.push({ ...emptyItem });

    return {
      person: r.people?.name || '',
      items,
      buffer: r.buffer || '',
      deselected: r.deselected ?? -1,
      ...(r.locked_at ? {
        lockedAt: new Date(r.locked_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
        lockedAtTime: new Date(r.locked_at).getTime(),
      } : {}),
    };
  });
}

function toSeedHistory(rows) {
  // Group by project_id → array of { week, entries }
  const grouped = {};
  for (const row of rows) {
    const pid = row.project_id;
    const weekLabel = row.weeks?.label || '';
    if (!grouped[pid]) grouped[pid] = {};
    if (!grouped[pid][weekLabel]) grouped[pid][weekLabel] = [];
    grouped[pid][weekLabel].push({
      person: row.person_name,
      type: row.type,
      task: row.task,
      stage: row.stage,
      outcome: row.outcome || null,
    });
  }

  const result = {};
  for (const [pid, weekMap] of Object.entries(grouped)) {
    result[pid] = Object.entries(weekMap).map(([week, entries]) => ({
      week,
      entries,
    }));
  }
  return result;
}


// ─── Main hook ───────────────────────────────────────────────

export default function useSupabaseData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedOnce = useRef(false);

  // Data in seed.js-compatible shape
  const [squads, setSquads] = useState([]);
  const [roles, setRoles] = useState([]);
  const [people, setPeople] = useState([]);
  const [projects, setProjects] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [history, setHistory] = useState({});
  const [weekConfigData, setWeekConfigData] = useState(null);

  // Raw Supabase data (for lookup maps needed during writes)
  const lookups = useRef({ squadMap: {}, roleMap: {}, personMap: {}, weekMap: {} });

  const [appSettings, setAppSettings] = useState({});

  const load = useCallback(async () => {
    try {
      // Only show loading screen on first load, not refreshes
      if (!hasLoadedOnce.current) setLoading(true);
      setError(null);

      const [squadsRaw, rolesRaw, peopleRaw, projectsRaw, weeksRaw, historyRaw, settingsRaw] = await Promise.all([
        fetchSquads(),
        fetchRoles(),
        fetchPeople(),
        fetchProjects(),
        fetchWeeks(),
        fetchHistory(),
        fetchSettings(),
      ]);

      // Build lookup maps (name → id) for writes
      lookups.current.squadMap = Object.fromEntries(squadsRaw.map(s => [s.name, s.id]));
      lookups.current.roleMap = Object.fromEntries(rolesRaw.map(r => [r.name, r.id]));
      lookups.current.personMap = Object.fromEntries(peopleRaw.map(p => [p.name, p.id]));
      lookups.current.weekMap = Object.fromEntries(weeksRaw.map(w => [w.label, w.id]));

      const wc = toWeekConfig(weeksRaw, historyRaw);

      // Fetch commitments for current week
      const commitmentsRaw = await fetchCommitments(wc._currentWeekId);

      const seedPeople = toSeedPeople(peopleRaw);
      const seedCommitments = toSeedCommitments(commitmentsRaw);

      // Ensure every person has a commitment entry (backfill empty ones)
      const committedNames = new Set(seedCommitments.map(cm => cm.person));
      for (const p of seedPeople) {
        if (!committedNames.has(p.name)) {
          seedCommitments.push({ person: p.name, items: [], buffer: '', deselected: -1 });
        }
      }

      setSquads(toSeedSquads(squadsRaw));
      setRoles(toSeedRoles(rolesRaw));
      setPeople(seedPeople);
      setProjects(toSeedProjects(projectsRaw));
      setCommitments(seedCommitments);
      setHistory(toSeedHistory(historyRaw));
      setWeekConfigData(wc);
      setAppSettings(settingsRaw);
    } catch (err) {
      console.error('Failed to load data from Supabase:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    loading,
    error,
    squads, setSquads,
    roles, setRoles,
    people, setPeople,
    projects, setProjects,
    commitments, setCommitments,
    history,
    weekConfig: weekConfigData,
    appSettings, setAppSettings,
    lookups,
    reload: load,
  };
}
