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
    .select('*, kpi_templates(mandatory, countable)')
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

// NOTE (v2.0, Phase 14): fetchGrowthPriorities and upsertGrowthPriority remain unchanged —
// supabase-js passes through the 4 new columns (subtype, approval_state, milestone_at, milestone_note)
// from the v2.0 schema without any code change required. See SCHEMA-10 / D-35.
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

// --- Weekly KPI Selections + Counters (Phase 14, v2.0) ---
// Binds to migration 009 (supabase/migrations/009_schema_v20.sql):
//   - weekly_kpi_selections table with composite PK (partner, week_start_date)
//   - trg_no_back_to_back trigger: ERRCODE P0001 + message prefix 'back_to_back_kpi_not_allowed'
// Error contract documented in .planning/phases/14-schema-seed/14-01-SUMMARY.md.

/**
 * Typed exception thrown by upsertWeeklyKpiSelection when the no-back-to-back
 * Postgres trigger rejects the write (same partner + same template as previous
 * week). UI layer uses `e instanceof BackToBackKpiError` to render inline error.
 */
export class BackToBackKpiError extends Error {
  constructor(message, partner, templateId) {
    super(message);
    this.name = 'BackToBackKpiError';
    this.partner = partner;
    this.templateId = templateId;
  }
}

// Internal helper: detect trg_no_back_to_back trigger rejection.
// Contract locked in Phase 14 Plan 01: error.code==='P0001' AND message begins
// with 'back_to_back_kpi_not_allowed'.
function isBackToBackViolation(error) {
  return error && error.code === 'P0001'
    && typeof error.message === 'string'
    && error.message.startsWith('back_to_back_kpi_not_allowed');
}

/**
 * Fetch the weekly_kpi_selections row for (partner, weekStartDate).
 * Returns null if no row exists (pre-selection state is valid, not an error).
 * @param {'theo'|'jerry'|'test'} partner
 * @param {string} weekStartDate 'YYYY-MM-DD' Monday local string (use getMondayOf)
 * @returns {Promise<object|null>}
 */
export async function fetchWeeklyKpiSelection(partner, weekStartDate) {
  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .select('*')
    .eq('partner', partner)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data; // null if absent
}

/**
 * Fetch the partner's prior-week weekly_kpi_selections row. Returns null if
 * none exists (first-week edge case per D-23 / WEEKLY-03). Computes previous
 * Monday in LOCAL time (y, m-1, d-7) to match getMondayOf conventions — never
 * use UTC arithmetic here.
 * @param {'theo'|'jerry'|'test'} partner
 * @param {string} weekStartDate 'YYYY-MM-DD' Monday local string for the CURRENT week
 * @returns {Promise<object|null>}
 */
export async function fetchPreviousWeeklyKpiSelection(partner, weekStartDate) {
  const [y, m, d] = weekStartDate.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 7);
  const yy = prev.getFullYear();
  const mm = String(prev.getMonth() + 1).padStart(2, '0');
  const dd = String(prev.getDate()).padStart(2, '0');
  const prevStr = `${yy}-${mm}-${dd}`;
  return fetchWeeklyKpiSelection(partner, prevStr);
}

/**
 * Upsert the weekly KPI selection for (partner, weekStartDate).
 * Throws BackToBackKpiError if the no-back-to-back trigger rejects the write.
 * Preserves existing counter_value if the row already exists by NOT including
 * counter_value in the update payload — the DB column default '{}' only applies
 * on INSERT, and the upsert body omits the column so pre-existing counts survive.
 * @param {'theo'|'jerry'|'test'} partner
 * @param {string} weekStartDate 'YYYY-MM-DD' Monday local string (use getMondayOf)
 * @param {string} templateId kpi_templates.id UUID
 * @param {string} labelSnapshot label captured at selection time
 * @returns {Promise<object>} the upserted row
 */
export async function upsertWeeklyKpiSelection(partner, weekStartDate, templateId, labelSnapshot) {
  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .upsert(
      { partner, week_start_date: weekStartDate, kpi_template_id: templateId, label_snapshot: labelSnapshot },
      { onConflict: 'partner,week_start_date' }
    )
    .select()
    .single();
  if (error) {
    if (isBackToBackViolation(error)) {
      throw new BackToBackKpiError(error.message, partner, templateId);
    }
    throw error;
  }
  return data;
}

/**
 * Increment counter_value->templateId by 1 for the (partner, weekStartDate) row.
 * Auto-creates the row with kpi_template_id=NULL, label_snapshot=NULL if absent
 * (D-19, D-21 auto-create path) — the trigger ignores NULL kpi_template_id rows
 * so back-to-back cannot fire on counter-only rows (D-23).
 *
 * Read-modify-write pattern: acceptable for this 3-user app with debounced UI
 * (Phase 16 COUNT-03 debouncing keeps the race window narrow).
 *
 * @param {'theo'|'jerry'|'test'} partner
 * @param {string} weekStartDate 'YYYY-MM-DD' Monday local string
 * @param {string} templateId kpi_templates.id UUID being counted
 * @returns {Promise<object>} the upserted row (with updated counter_value)
 */
export async function incrementKpiCounter(partner, weekStartDate, templateId) {
  const existing = await fetchWeeklyKpiSelection(partner, weekStartDate);
  const currentCounters = existing?.counter_value ?? {};
  const currentVal = Number(currentCounters[templateId] ?? 0);
  const nextCounters = { ...currentCounters, [templateId]: currentVal + 1 };

  const payload = {
    partner,
    week_start_date: weekStartDate,
    counter_value: nextCounters,
  };
  if (!existing) {
    // New row — leave kpi_template_id and label_snapshot NULL (D-19, D-21 auto-create path).
    // Trigger ignores NULL kpi_template_id so back-to-back cannot fire here.
    payload.kpi_template_id = null;
    payload.label_snapshot = null;
  }

  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .upsert(payload, { onConflict: 'partner,week_start_date' })
    .select()
    .single();
  if (error) {
    // Defensive: surface typed error even though trigger ignores NULL template rows.
    if (isBackToBackViolation(error)) throw new BackToBackKpiError(error.message, partner, templateId);
    throw error;
  }
  return data;
}

// --- Admin Settings (Phase 14, v2.0) ---
// Binds to migration 009 admin_settings table. Keys follow flat snake_case
// convention (D-14). Values are stored as flat JSONB scalars — number,
// boolean, or string — NEVER wrapped in objects (D-12). All 3 v2.0 keys are
// eager-seeded (theo_close_rate_threshold, jerry_conditional_close_rate_threshold,
// jerry_sales_kpi_active) so fetchAdminSetting returning null on a known key
// indicates a migration drift.

/**
 * Fetch a single admin_settings row by key. Returns null if the key does not
 * exist (callers must handle — but per D-13 all 3 v2.0 keys are eager-seeded
 * so null is unexpected for known keys and indicates a migration drift).
 * @param {string} key flat snake_case key (e.g. 'theo_close_rate_threshold')
 * @returns {Promise<{key:string,value:any,updated_at:string}|null>}
 */
export async function fetchAdminSetting(key) {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Upsert a single admin_settings row. `value` MUST be a flat scalar
 * (number, boolean, string); callers MUST NOT wrap in objects per D-12.
 * updated_at is set explicitly on every write to guarantee staleness
 * detection for downstream consumers.
 * @param {string} key flat snake_case key
 * @param {number|boolean|string} value flat JSONB scalar (no object wrappers)
 * @returns {Promise<object>} the upserted row
 */
export async function upsertAdminSetting(key, value) {
  const { data, error } = await supabase
    .from('admin_settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
