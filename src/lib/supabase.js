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
    // UAT 2026-04-30: pull baseline_action so consumers (seasonStats per-KPI matching,
    // hub display) can use the live label rather than the potentially-stale
    // label_snapshot column. mandatory + countable kept for hub gating.
    .select('*, kpi_templates(mandatory, countable, baseline_action)')
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
  // BUG-2026-04-25 lib-level guard: catastrophic data loss can occur when a
  // caller passes kpi_results={} for a (partner,week_of) that already has a
  // submitted row with non-empty kpi_results. Supabase upsert() updates only
  // supplied columns, so {} replaces the existing JSONB while submitted_at,
  // committed_at, etc. (if not in the new record) survive — leaving a "row
  // exists, kpi_results blank" zombie. We refuse the write outright when:
  //
  //   - the new record's kpi_results is an empty object, AND
  //   - an existing row exists for (partner, week_of) with non-empty kpi_results
  //
  // This is a belt-and-suspenders backstop. The caller (Scorecard.jsx
  // persistDraft) also has a rows-length / hydration gate, but a lib-level
  // refusal protects against any future caller with the same shape.
  //
  // We also refuse when the existing row has submitted_at set and the new
  // record would clear submitted_at semantics by overwriting kpi_results
  // with {} (same shape — covered by the same condition since a submitted
  // row by definition has non-empty kpi_results).
  //
  // The check is best-effort: if the read fails, we let the original upsert
  // proceed rather than fail the user's submit. This errs on the side of
  // availability for the common case while still catching the documented
  // corruption pattern.
  // WR-04 (UAT 2026-04-25): widen the guard to also catch the all-null case.
  // The original guard only refused literal {} payloads. A non-empty object
  // where every entry has result===null carries the same blast radius (would
  // wipe a partner's submitted yes/no values), and an all-null write is never
  // a legitimate submit. Catching both shapes hardens the backstop without
  // false positives.
  const newKpis = record?.kpi_results;
  const isObjectKpis =
    newKpis !== undefined &&
    newKpis !== null &&
    typeof newKpis === 'object';
  const isEmptyKpis = isObjectKpis && Object.keys(newKpis).length === 0;
  const isAllNullKpis =
    isObjectKpis &&
    Object.keys(newKpis).length > 0 &&
    Object.values(newKpis).every((entry) => entry?.result == null);
  if (record && (isEmptyKpis || isAllNullKpis)) {
    try {
      const { data: existing } = await supabase
        .from('scorecards')
        .select('kpi_results, submitted_at')
        .eq('partner', record.partner)
        .eq('week_of', record.week_of)
        .maybeSingle();
      const existingKpis = existing?.kpi_results;
      // For the all-null case, "existing has data" must mean existing has at
      // least one non-null result — otherwise an all-null overwrite of an
      // already-all-null row is a no-op and shouldn't be blocked.
      const existingHasData =
        existingKpis &&
        typeof existingKpis === 'object' &&
        Object.keys(existingKpis).length > 0 &&
        (isEmptyKpis
          ? true
          : Object.values(existingKpis).some((entry) => entry?.result != null));
      if (existingHasData) {
        // Refuse the destructive write. Throw a typed error so callers can
        // surface a useful message instead of silently corrupting data.
        const shape = isEmptyKpis ? 'empty object' : 'all-null entries';
        const err = new Error(
          `Refusing to overwrite non-empty kpi_results with ${shape}. ` +
            'This is the BUG-2026-04-25 guard — caller passed a draft-shape ' +
            'kpi_results against an existing submitted/in-progress scorecard row.'
        );
        err.code = 'SCORECARD_EMPTY_OVERWRITE_BLOCKED';
        err.partner = record.partner;
        err.week_of = record.week_of;
        throw err;
      }
    } catch (probeErr) {
      // Re-throw our own guard error; swallow other probe errors so a
      // network blip on the read doesn't block legitimate writes.
      if (probeErr && probeErr.code === 'SCORECARD_EMPTY_OVERWRITE_BLOCKED') {
        throw probeErr;
      }
      // fall through — proceed with the upsert
    }
  }

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

// IN-02: 'test' is allowed here for AdminTest.jsx; AdminPartners only manages
// theo+jerry per its MANAGED constant. The test partner exercises the same
// code paths without being shown in the partner-management list.
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

export async function resetPartnerKpiSelections(partner) {
  assertResettable(partner);
  const { error } = await supabase.from('kpi_selections').delete().eq('partner', partner);
  if (error) throw error;
}

export async function resetPartnerWeeklyKpiSelections(partner) {
  assertResettable(partner);
  const { error } = await supabase.from('weekly_kpi_selections').delete().eq('partner', partner);
  if (error) throw error;
}

export async function resetPartnerGrowthPriorities(partner) {
  assertResettable(partner);
  const { error } = await supabase.from('growth_priorities').delete().eq('partner', partner);
  if (error) throw error;
}

export async function resetPartnerKpis(partner) {
  await resetPartnerKpiSelections(partner);
  await resetPartnerGrowthPriorities(partner);
}

export async function resetPartnerScorecards(partner) {
  assertResettable(partner);
  // CR-01: this function only resets `scorecards`. The 'all' caller in
  // AdminPartners.performReset is responsible for also calling
  // resetPartnerWeeklyKpiSelections so each helper does what its name says.
  const { error } = await supabase.from('scorecards').delete().eq('partner', partner);
  if (error) throw error;
}

// Test-specific aliases (used by existing AdminTest.jsx)
export const resetTestSubmission = () => resetPartnerSubmission('test');
export const resetTestKpis = () => resetPartnerKpis('test');
export const resetTestScorecards = () => resetPartnerScorecards('test');

// IN-03: removed unused commitScorecardWeek helper. Phase 16 wires commit
// semantics directly through upsertScorecard from inside Scorecard.jsx —
// committed_at is set on the first persistDraft and submitted_at on
// handleSubmit. No callers ever imported commitScorecardWeek.

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

/**
 * Idempotent end-of-meeting stamp. The first call sets `ended_at`; subsequent
 * calls are no-ops that return the existing row with the original stamp intact.
 *
 * Implementation: conditional UPDATE with `.is('ended_at', null)` so only the
 * first call matches. If the conditional update returns no row (already ended),
 * we fall back to a fetch and return the existing row. This makes the End
 * Meeting / Complete Meeting buttons safe to double-click without rewriting
 * the original timestamp.
 *
 * Post-Phase-17 UAT 2026-04-25: prior implementation overwrote ended_at on
 * every call, which clobbered the first-completion stamp on a re-click.
 *
 * @param {string} meetingId meetings.id UUID
 * @returns {Promise<object>} the meeting row (with ended_at set)
 */
export async function endMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', meetingId)
    .is('ended_at', null) // critical: only matches rows where ended_at IS NULL
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  // Already ended — fetch and return the existing row so callers see a stable
  // shape (and the original ended_at stamp).
  const existing = await fetchMeeting(meetingId);
  if (!existing) {
    throw new Error(`endMeeting: meeting ${meetingId} not found`);
  }
  return existing;
}

/**
 * Stamp `meetings.notes_updated_at = now()` to record a post-end note edit.
 * Callers must guard with `meeting.ended_at != null` — this function does not
 * itself enforce that, so an accidental pre-end call would falsely mark the
 * meeting as having post-end edits. The "Updated:" line in MeetingSummary
 * compares notes_updated_at to ended_at, so a pre-end stamp would surface as
 * a stale-edit hint that doesn't really exist.
 *
 * Migration 014 adds the column. Idempotent — every call sets the timestamp
 * to the current time; there is no conditional gate.
 *
 * @param {string} meetingId meetings.id UUID
 * @returns {Promise<object>} the updated meetings row
 */
export async function touchMeetingUpdatedAt(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ notes_updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Admin reset for a single meeting. Permanently deletes the meeting and all
 * its notes — Reset is destructive (UAT R3). After reset, the meeting is
 * gone from past meeting history; Trace re-creates a fresh meeting via the
 * Start Meeting panel if they want to re-run that week's session.
 *
 * @param {string} meetingId meetings.id UUID
 * @returns {Promise<void>} no row to return after delete
 */
export async function resetMeeting(meetingId) {
  if (!meetingId) {
    throw new Error('resetMeeting: meetingId is required');
  }
  // 1) Wipe all per-stop notes for this meeting (both shared body + per-partner columns).
  //    Cascade is by FK in migration 005 (meeting_notes.meeting_id REFERENCES meetings(id)),
  //    but we delete explicitly so the operation is auditable + survives FK schema changes.
  const { error: delErr } = await supabase
    .from('meeting_notes')
    .delete()
    .eq('meeting_id', meetingId);
  if (delErr) throw delErr;

  // 2) Delete the meetings row itself (UAT R3 — Reset is now destructive,
  //    not a rewind). The meeting disappears from past meeting history;
  //    MeetingHistory.jsx filters by ended_at!=null so a soft-cleared meeting
  //    would still surface as "in progress", which we explicitly do not want.
  const { error: rowErr } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId);
  if (rowErr) throw rowErr;
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

/**
 * Upsert per-partner meeting notes for a single stop. Used by UAT Batch
 * C2/C3/C4 partner-scoped Monday Prep stops (priorities_focus,
 * risks_blockers, commitments). Writes notes_theo + notes_jerry; the shared
 * body column is set to '' (NOT NULL constraint) and reserved for stops that
 * use the shared single-textarea path.
 *
 * The renderer chooses which function to call based on stop key — there is
 * no auto-detection in the lib layer. upsertMeetingNote stays unchanged for
 * shared-textarea stops.
 *
 * Migration 013 adds the two nullable columns. Pre-existing rows read the
 * new columns as NULL, which downstream consumers treat as empty string.
 *
 * @param {object} args
 * @param {string} args.meeting_id meetings.id UUID
 * @param {string} args.agenda_stop_key stop key (must be in CHECK constraint)
 * @param {{theo?: string, jerry?: string}} args.notes per-partner note bodies
 * @returns {Promise<object>} the upserted row
 */
export async function upsertMeetingNotePerPartner({ meeting_id, agenda_stop_key, notes }) {
  const { theo, jerry } = notes ?? {};
  const { data, error } = await supabase
    .from('meeting_notes')
    .upsert(
      {
        meeting_id,
        agenda_stop_key,
        // body is NOT NULL — keep it empty for per-partner rows so the row is
        // legal but the renderer reads from notes_theo / notes_jerry instead.
        body: '',
        notes_theo: theo ?? null,
        notes_jerry: jerry ?? null,
        updated_at: new Date().toISOString(),
      },
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
 *
 * CR-02 fix: Two-step write to avoid clobbering a concurrent KPI pick.
 * Earlier implementation upserted with kpi_template_id=NULL when no row existed,
 * which races with upsertWeeklyKpiSelection: if the partner picked their KPI
 * at the same moment as a counter tap, the counter upsert could land second
 * and silently null out kpi_template_id/label_snapshot.
 *
 * Now we:
 *  1. Insert a counter-only seed row with `ignoreDuplicates: true` — this
 *     creates the row only if it does not yet exist; if a pick already
 *     created the row, this is a no-op and leaves kpi_template_id intact.
 *  2. Read-modify-write the counter_value with an UPDATE that touches ONLY
 *     counter_value — never kpi_template_id or label_snapshot.
 *
 * Note: WR-09. Counter-only seed rows have kpi_template_id=NULL. Any code
 * that uses count(weekly_kpi_selections) as a "did the partner pick?" proxy
 * will be wrong — always check Boolean(row.kpi_template_id) instead.
 * The trigger ignores NULL kpi_template_id rows so back-to-back cannot fire
 * on counter-only rows (D-23).
 *
 * @param {'theo'|'jerry'|'test'} partner
 * @param {string} weekStartDate 'YYYY-MM-DD' Monday local string
 * @param {string} templateId kpi_templates.id UUID being counted
 * @returns {Promise<object>} the updated row (with updated counter_value)
 */
export async function incrementKpiCounter(partner, weekStartDate, templateId) {
  // Step 1: Read current state to compute nextCounters.
  const existing = await fetchWeeklyKpiSelection(partner, weekStartDate);
  const currentCounters = existing?.counter_value ?? {};
  const currentVal = Number(currentCounters[templateId] ?? 0);
  const nextCounters = { ...currentCounters, [templateId]: currentVal + 1 };

  // Step 2: If no row exists, seed an empty counter-only row.
  // ignoreDuplicates so a concurrent pick that landed first wins without error.
  if (!existing) {
    const { error: seedError } = await supabase
      .from('weekly_kpi_selections')
      .upsert(
        {
          partner,
          week_start_date: weekStartDate,
          kpi_template_id: null,
          label_snapshot: null,
          counter_value: {},
        },
        { onConflict: 'partner,week_start_date', ignoreDuplicates: true }
      );
    if (seedError) {
      if (isBackToBackViolation(seedError)) {
        throw new BackToBackKpiError(seedError.message, partner, templateId);
      }
      throw seedError;
    }
  }

  // Step 3: UPDATE only counter_value — never touches kpi_template_id or label_snapshot.
  // This is the safe path: a concurrent pick that completes between Step 1 and Step 3
  // is preserved because we never include those columns in the UPDATE.
  const { data, error } = await supabase
    .from('weekly_kpi_selections')
    .update({ counter_value: nextCounters })
    .eq('partner', partner)
    .eq('week_start_date', weekStartDate)
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

// --- Business Priorities (Phase 18, BIZ-01) ---
// Read-only fetch for the 2 shared business priorities seeded by migration 011.
// Returns rows ordered by id ascending (deterministic: lead_abatement_activation < salesmen_onboarding).
// No write functions in v2.0 (D-04) — content edited via SQL UPDATE on the migration-011 footer recipe.

/**
 * Fetch all business_priorities rows ordered by id ascending.
 * @returns {Promise<Array<{id: string, title: string, description: string, deliverables: string[]}>>}
 */
export async function fetchBusinessPriorities() {
  const { data, error } = await supabase
    .from('business_priorities')
    .select('id, title, description, deliverables')
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}
