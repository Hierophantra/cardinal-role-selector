import { createClient } from '@supabase/supabase-js';
import { SEASON_END_DATE } from '../data/content.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

export async function upsertSubmission(record) {
  const { data, error } = await supabase
    .from('submissions')
    .upsert(record, { onConflict: 'partner' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchSubmissions() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSubmission(partner) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('partner', partner)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --- Accountability tables (Phase 1+) ---

export async function fetchKpiTemplates() {
  const { data, error } = await supabase
    .from('kpi_templates')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchKpiSelections(partner) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .select('*, kpi_templates(mandatory, measure)')
    .eq('partner', partner)
    .order('selected_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertKpiSelection(record) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .upsert(record, { onConflict: 'partner,template_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKpiSelection(id) {
  const { error } = await supabase
    .from('kpi_selections')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchGrowthPriorities(partner) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .select('*')
    .eq('partner', partner)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertGrowthPriority(record) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .upsert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchScorecard(partner, weekOf) {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('partner', partner)
    .eq('week_of', weekOf)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertScorecard(record) {
  const { data, error } = await supabase
    .from('scorecards')
    .upsert(record, { onConflict: 'partner,week_of' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- KPI Selection (Phase 2) ---

export async function fetchGrowthPriorityTemplates() {
  const { data, error } = await supabase
    .from('growth_priority_templates')
    .select('*')
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function lockKpiSelections(partner) {
  const lockedUntil = SEASON_END_DATE;
  const { error: e1 } = await supabase
    .from('kpi_selections')
    .update({ locked_until: lockedUntil })
    .eq('partner', partner);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('growth_priorities')
    .update({ locked_until: lockedUntil })
    .eq('partner', partner);
  if (e2) throw e2;
  return lockedUntil;
}

// --- Weekly Scorecard (Phase 3) ---

/**
 * Fetch all scorecards for a partner, newest week first.
 * Used by Scorecard.jsx (current-week lookup + history list) and PartnerHub.jsx (card state derivation).
 * Returns an array — may be empty.
 */
export async function fetchScorecards(partner) {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('partner', partner)
    .order('week_of', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Stamp committed_at for the current week, creating the scorecards row if it doesn't exist.
 * Initializes kpi_results with the given kpi_selection_ids mapped to { result: null, reflection: '' }
 * so downstream textareas are always controlled (never switch controlled<->uncontrolled).
 * Idempotent: re-calling on an already-committed week updates committed_at (acceptable; D-09 edge case 2).
 *
 * @param {'theo'|'jerry'} partner
 * @param {string} weekOf 'YYYY-MM-DD' Monday local-time string (use getMondayOf from ../lib/week.js)
 * @param {string[]} kpiSelectionIds array of kpi_selections.id UUIDs (typically 5)
 * @returns the created/updated row
 */
// --- Admin reset helpers ---
// Parameterized by partner. Guards against arbitrary values — only theo/jerry/test allowed.
// The test-specific wrappers below are kept as thin aliases for backward compatibility.

const RESETTABLE_PARTNERS = ['theo', 'jerry', 'test'];

function assertResettable(partner) {
  if (!RESETTABLE_PARTNERS.includes(partner)) {
    throw new Error(`Refusing to reset unknown partner: ${partner}`);
  }
}

export async function resetPartnerSubmission(partner) {
  assertResettable(partner);
  const { error } = await supabase.from('submissions').delete().eq('partner', partner);
  if (error) throw error;
}

export async function resetPartnerKpis(partner) {
  assertResettable(partner);
  const { error: e1 } = await supabase.from('kpi_selections').delete().eq('partner', partner);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('growth_priorities').delete().eq('partner', partner);
  if (e2) throw e2;
}

export async function resetPartnerScorecards(partner) {
  assertResettable(partner);
  const { error } = await supabase.from('scorecards').delete().eq('partner', partner);
  if (error) throw error;
}

// Test-specific aliases (used by existing AdminTest.jsx)
export const resetTestSubmission = () => resetPartnerSubmission('test');
export const resetTestKpis = () => resetPartnerKpis('test');
export const resetTestScorecards = () => resetPartnerScorecards('test');

export async function commitScorecardWeek(partner, weekOf, kpiSelectionIds, kpiLabels = {}) {
  const emptyResults = Object.fromEntries(
    kpiSelectionIds.map((id) => [id, { result: null, reflection: '', label: kpiLabels[id] || '' }])
  );
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('scorecards')
    .upsert(
      {
        partner,
        week_of: weekOf,
        kpi_results: emptyResults,
        committed_at: now,
        submitted_at: now,
      },
      { onConflict: 'partner,week_of' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Admin: KPI Template CRUD (ADMIN-04) — Phase 4 ---

export async function createKpiTemplate({ label, category, description, measure, partner_scope, mandatory }) {
  const { data, error } = await supabase
    .from('kpi_templates')
    .insert({ label, category, description, measure, partner_scope, mandatory })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateKpiTemplate(id, { label, category, description, measure, partner_scope, mandatory }) {
  const { data, error } = await supabase
    .from('kpi_templates')
    .update({ label, category, description, measure, partner_scope, mandatory, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKpiTemplate(id) {
  const { error } = await supabase.from('kpi_templates').delete().eq('id', id);
  if (error) throw error;
}

// --- Admin Model Evolution (Phase 7) ---

export async function cascadeTemplateLabelSnapshot(templateId, newLabel) {
  const { error } = await supabase
    .from('kpi_selections')
    .update({ label_snapshot: newLabel })
    .eq('template_id', templateId);
  if (error) throw error;
}

// --- Admin: Growth Priority Template CRUD (ADMIN-04) — Phase 4 ---

export async function createGrowthPriorityTemplate({ type, description, sort_order, mandatory, partner_scope, measure }) {
  const { data, error } = await supabase
    .from('growth_priority_templates')
    .insert({ type, description, sort_order, mandatory, partner_scope, measure })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGrowthPriorityTemplate(id, { type, description, sort_order, mandatory, partner_scope, measure }) {
  const { data, error } = await supabase
    .from('growth_priority_templates')
    .update({ type, description, sort_order, mandatory, partner_scope, measure })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGrowthPriorityTemplate(id) {
  const { error } = await supabase.from('growth_priority_templates').delete().eq('id', id);
  if (error) throw error;
}

// --- Admin: KPI Selection direct-edit (ADMIN-03) — Phase 4 ---
// CRITICAL (Pitfall 2 + 3): UPDATE the existing row by id — never DELETE+INSERT.
// kpi_results JSONB keys are kpi_selections.id UUIDs; reinserting orphans history.
// Also: locked_until is NOT touched here (D-05 — 90-day clock is preserved).

export async function adminEditKpiLabel(selectionId, newLabel) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .update({ label_snapshot: newLabel })
    .eq('id', selectionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminSwapKpiTemplate(selectionId, newTemplate) {
  // newTemplate: { id, label, category } from kpi_templates
  const { data, error } = await supabase
    .from('kpi_selections')
    .update({
      template_id: newTemplate.id,
      label_snapshot: newTemplate.label,
      category_snapshot: newTemplate.category,
      // locked_until is NOT touched — D-05 preserves 90-day clock
    })
    .eq('id', selectionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Admin: Unlock partner selections (ADMIN-02, D-04) — Phase 4 ---
// Sets locked_until = null on BOTH kpi_selections AND growth_priorities for the partner.
// Existing rows are preserved — partner re-enters KpiSelection.jsx with current picks pre-selected.

export async function unlockPartnerSelections(partner) {
  assertResettable(partner);
  const { error: e1 } = await supabase
    .from('kpi_selections')
    .update({ locked_until: null })
    .eq('partner', partner);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('growth_priorities')
    .update({ locked_until: null })
    .eq('partner', partner);
  if (e2) throw e2;
}

// --- Admin: Growth Priority status + admin note (ADMIN-05, ADMIN-06) — Phase 4 ---

export async function updateGrowthPriorityStatus(id, status) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGrowthPriorityAdminNote(id, adminNote) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .update({ admin_note: adminNote, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Admin: Scorecard reopen + override (D-15, D-21) — Phase 4 ---

export async function reopenScorecardWeek(partner, weekOf) {
  assertResettable(partner);
  const { data, error } = await supabase
    .from('scorecards')
    .update({ admin_reopened_at: new Date().toISOString() })
    .eq('partner', partner)
    .eq('week_of', weekOf)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminOverrideScorecardEntry(partner, weekOf, kpiId, entry, labelSnapshot) {
  // entry: { result, reflection } — label is snapshotted per D-06
  assertResettable(partner);
  const row = await fetchScorecard(partner, weekOf);
  const current = row?.kpi_results ?? {};
  const updated = {
    ...current,
    [kpiId]: { label: labelSnapshot, ...entry },
  };
  const { data, error } = await supabase
    .from('scorecards')
    .update({
      kpi_results: updated,
      admin_override_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .eq('partner', partner)
    .eq('week_of', weekOf)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Admin: Meetings + Meeting Notes (MEET-01, MEET-04) — Phase 4 ---

export async function createMeeting(weekOf, meetingType = 'friday_review') {
  const { data, error } = await supabase
    .from('meetings')
    .insert({ week_of: weekOf, meeting_type: meetingType, held_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMeetings() {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('held_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMeetingNotes(meetingId) {
  const { data, error } = await supabase
    .from('meeting_notes')
    .select('*')
    .eq('meeting_id', meetingId);
  if (error) throw error;
  return data;
}

export async function upsertMeetingNote({ meeting_id, agenda_stop_key, body }) {
  const { data, error } = await supabase
    .from('meeting_notes')
    .upsert(
      { meeting_id, agenda_stop_key, body, updated_at: new Date().toISOString() },
      { onConflict: 'meeting_id,agenda_stop_key' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
