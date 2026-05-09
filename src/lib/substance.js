// Wave 3 (UAT 2026-05-09): substance metrics for scorecard submissions.
//
// Powers two surfaces:
//   - LastWeekCommitments.jsx — pulls last week's Pending rows so the
//     partner sees their open commitments before filling out this week.
//   - AdminPartners.jsx — Substance card showing reflection density +
//     structured-field completion + week-over-week trend.
//
// All helpers are pure; no Supabase access. Callers fetch scorecards/templates
// once and pass them in.

import { effectiveResult } from './week.js';

// --- Tier 3 helper ------------------------------------------------------

/**
 * Extract last week's Pending commitments from a scorecard row, with their
 * resolution state derived from the SAME row's `kpi_results` (a Pending row
 * that the partner converted to 'yes' before Saturday close, or that
 * coerced to 'no' after close).
 *
 * Returns an array of:
 *   { kpiId, label, commitment, status: 'met' | 'not_converted' | 'live' }
 *
 * 'live' only fires for the *current* week (week not yet closed). Historic
 * scorecards always coerce live Pending to 'not_converted' via effectiveResult.
 *
 * @param {object|null} scorecard scorecards row (may be null when partner has
 *   no submission for that week)
 * @returns {Array<{kpiId: string, label: string, commitment: string, status: string}>}
 */
export function extractPendingCommitments(scorecard) {
  if (!scorecard || !scorecard.kpi_results) return [];
  const weekOf = scorecard.week_of;
  const out = [];
  for (const [kpiId, entry] of Object.entries(scorecard.kpi_results)) {
    if (!entry) continue;
    const commitment = (entry.pending_text ?? '').trim();
    // Surface only rows that captured a Pending commitment. Yes-conversion
    // rows preserve pending_text per Phase 17 D-01 / Pitfall 4 so they still
    // show up here with the original commitment text.
    if (!commitment) continue;
    const raw = entry.result;
    // Was this row Pending at submit time? Two cases:
    //   - raw === 'pending' — still pending (live or coerced)
    //   - raw === 'yes' AND pending_text non-empty — Pending converted to Met
    // (raw === 'no' with pending_text would be a partner manually swapping
    // pending → no; treat as not_converted.)
    let status;
    if (raw === 'yes') {
      status = 'met';
    } else if (raw === 'pending') {
      const eff = effectiveResult(raw, weekOf);
      status = eff === 'no' ? 'not_converted' : 'live';
    } else {
      // raw === 'no' or null with pending_text — treat as not_converted
      status = 'not_converted';
    }
    out.push({
      kpiId,
      label: entry.label || '(KPI)',
      commitment,
      status,
    });
  }
  return out;
}

// --- Tier 4 helpers -----------------------------------------------------

// Word counter — splits on whitespace, drops empties. Used for reflection
// density across all KPI rows + weekly reflection fields.
function wordCount(text) {
  if (typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

// Walk a structured_data block and count populated leaf fields against the
// schema's expected leaf count. Returns { populated, expected } so the caller
// can aggregate across all KPIs before computing the percentage.
//
// "Populated" = non-empty primitive (string trim non-empty; number finite;
// yes_no === 'yes'|'no'). row_list children count one populated per child
// row that has at least one populated sub-field. count_noteworthy and
// row_per_item count their `count` value as one expected/populated, then
// each rowField across rows.
function structuredCompletion(schema, data) {
  if (!schema || !schema.pattern) return { populated: 0, expected: 0 };
  const isPopulatedPrimitive = (field, value) => {
    if (field?.type === 'yes_no') return value === 'yes' || value === 'no';
    if (field?.type === 'number' || field?.type === 'currency') {
      return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value));
    }
    return typeof value === 'string' && value.trim().length > 0;
  };

  if (schema.pattern === 'count_noteworthy') {
    const count = Number(data?.count);
    const countPopulated = Number.isFinite(count) && count >= 0 && Number.isInteger(count);
    let populated = countPopulated ? 1 : 0;
    let expected = 1;
    const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];
    const noteworthy = Array.isArray(data?.noteworthy) ? data.noteworthy : [];
    // Only require rowFields when count > 0 AND the partner curated rows. The
    // number of "expected" leaf fields scales with curated rows, not count —
    // count_noteworthy lets the partner choose how many to surface.
    for (const row of noteworthy) {
      for (const f of rowFields) {
        expected += 1;
        if (isPopulatedPrimitive(f, row?.[f.key])) populated += 1;
      }
    }
    return { populated, expected };
  }

  if (schema.pattern === 'row_per_item') {
    const count = Number(data?.count);
    const countPopulated = Number.isFinite(count) && count >= 0 && Number.isInteger(count);
    let populated = countPopulated ? 1 : 0;
    let expected = 1;
    const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    // Expected leaf fields = count * rowFields.length (one row per item).
    if (Number.isFinite(count) && count > 0) {
      expected += count * rowFields.length;
      for (const row of rows) {
        for (const f of rowFields) {
          if (isPopulatedPrimitive(f, row?.[f.key])) populated += 1;
        }
      }
    }
    return { populated, expected };
  }

  if (schema.pattern === 'named_fields') {
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    let populated = 0;
    let expected = 0;
    for (const f of fields) {
      if (f.type === 'row_list') {
        const subFields = Array.isArray(f.rowFields) ? f.rowFields : [];
        const subRows = Array.isArray(data?.[f.key]) ? data[f.key] : [];
        // row_list always contributes its declared sub-fields per row that
        // exists. Empty row_list contributes 0/0.
        for (const row of subRows) {
          for (const sf of subFields) {
            expected += 1;
            if (isPopulatedPrimitive(sf, row?.[sf.key])) populated += 1;
          }
        }
      } else {
        expected += 1;
        if (isPopulatedPrimitive(f, data?.[f.key])) populated += 1;
      }
    }
    return { populated, expected };
  }

  return { populated: 0, expected: 0 };
}

/**
 * Compute substance metrics for a single scorecard.
 *
 * @param {object} scorecard scorecards row
 * @param {Array<{id:string, key_fields:object|null}>} templates kpi_templates
 *   list — used to look up key_fields for completion math.
 * @returns {{week_of:string, total_reflection_words:number,
 *   structured_field_completion_pct:number, pending_count:number,
 *   yes_count:number, no_count:number}}
 */
export function computeSubmissionSubstance(scorecard, templates) {
  if (!scorecard) {
    return {
      week_of: null,
      total_reflection_words: 0,
      structured_field_completion_pct: 0,
      pending_count: 0,
      yes_count: 0,
      no_count: 0,
    };
  }
  const results = scorecard.kpi_results ?? {};
  const tplById = Object.fromEntries((templates ?? []).map((t) => [t.id, t]));

  let totalWords = 0;
  let pending = 0;
  let yes = 0;
  let no = 0;
  let populated = 0;
  let expected = 0;

  for (const [kpiId, entry] of Object.entries(results)) {
    if (!entry) continue;
    totalWords += wordCount(entry.reflection ?? '');
    totalWords += wordCount(entry.pending_text ?? '');
    const eff = effectiveResult(entry.result, scorecard.week_of);
    if (eff === 'yes') yes += 1;
    else if (eff === 'no') no += 1;
    else if (eff === 'pending') pending += 1;
    const tpl = tplById[kpiId];
    if (tpl?.key_fields && entry.structured_data) {
      const sc = structuredCompletion(tpl.key_fields, entry.structured_data);
      populated += sc.populated;
      expected += sc.expected;
    }
  }

  // Weekly reflection fields contribute to total reflection density too.
  totalWords += wordCount(scorecard.tasks_completed ?? '');
  totalWords += wordCount(scorecard.tasks_carried_over ?? '');
  totalWords += wordCount(scorecard.weekly_win ?? '');
  totalWords += wordCount(scorecard.weekly_learning ?? '');

  const completionPct = expected === 0 ? 0 : Math.round((populated / expected) * 100);

  return {
    week_of: scorecard.week_of,
    total_reflection_words: totalWords,
    structured_field_completion_pct: completionPct,
    pending_count: pending,
    yes_count: yes,
    no_count: no,
  };
}

/**
 * Aggregate substance metrics across the most recent N submissions and
 * compute a trend indicator vs the prior submission.
 *
 * Input scorecards are the full fetchScorecards() array (newest first).
 * Only scorecards with submitted_at !== null are considered (drafts skip).
 *
 * Returns array (newest first) of:
 *   { ...computeSubmissionSubstance(scorecard, templates),
 *     trend: 'up' | 'down' | 'flat' | null }
 *
 * trend === null when there is no prior submission to compare against.
 *
 * @param {Array<object>} scorecards newest-first list of scorecards rows
 * @param {Array<object>} templates kpi_templates list
 * @param {number} [n=4] max submissions to include
 */
export function computeRecentSubstance(scorecards, templates, n = 4) {
  const submitted = (scorecards ?? []).filter((s) => s.submitted_at);
  // submitted is already newest-first by fetchScorecards order.
  const recent = submitted.slice(0, n);
  // We need access to the next-older submission too, to compute trend on the
  // OLDEST entry in recent. Slice one extra item if available.
  const oneMore = submitted[n] ?? null;
  const enriched = recent.map((sc) => computeSubmissionSubstance(sc, templates));
  const olderMetric = oneMore ? computeSubmissionSubstance(oneMore, templates) : null;

  // Trend: compare each row's reflection density to the NEXT-OLDER row's
  // (i.e. enriched[i+1] for i < length-1, olderMetric for the last entry).
  return enriched.map((row, i) => {
    const prior = i < enriched.length - 1 ? enriched[i + 1] : olderMetric;
    if (!prior) return { ...row, trend: null };
    const cur = row.total_reflection_words;
    const prev = prior.total_reflection_words;
    let trend;
    if (prev === 0 && cur === 0) trend = 'flat';
    else if (cur > prev) trend = 'up';
    else if (cur < prev) trend = 'down';
    else trend = 'flat';
    return { ...row, trend };
  });
}
