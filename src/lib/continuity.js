// State continuity helpers — Tier 3 v2 Wave 4.
//
// Pure functions for computing the temporal-memory primitives that show
// up across the redesigned UI (hub, scorecard, season overview).
// No side effects, no fetches — callers pass in the scorecards array.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §13 (State Continuity Layer)
// — ChatGPT's "rhythm over time" framing.

import { effectiveResult } from './week.js';

/**
 * Count consecutive 'yes' (hit) results for a KPI, newest-first.
 * Mirrors the existing computeStreaks in seasonStats.js but counts hits
 * instead of misses. Returns 0 if the most recent week wasn't a hit.
 *
 * @param {string} templateId — kpi_templates.id to look up in kpi_results
 * @param {Array} scorecards — newest-first array of scorecard rows (any
 *   ordering accepted; non-committed rows are filtered out)
 * @returns {number} consecutive hits
 */
export function computeHitStreak(templateId, scorecards) {
  if (!templateId || !Array.isArray(scorecards)) return 0;
  const committed = scorecards
    .filter((c) => c.committed_at)
    .sort((a, b) => (b.week_of > a.week_of ? 1 : -1));

  let streak = 0;
  for (const card of committed) {
    const entry = card.kpi_results?.[templateId];
    const eff = effectiveResult(entry?.result, card.week_of);
    if (eff === 'yes') {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Count consecutive weeks a KPI has been in 'pending' state without a
 * resolution to yes/no. A 'pending' that post-closes to 'no' (via
 * effectiveResult) does NOT count — that's a miss, not a still-pending.
 *
 * Useful for surfacing items that have been carrying over unresolved
 * for multiple weeks (a behavioral pattern worth highlighting).
 *
 * @param {string} templateId
 * @param {Array} scorecards
 * @returns {number} consecutive pending weeks
 */
export function computePendingWeekCount(templateId, scorecards) {
  if (!templateId || !Array.isArray(scorecards)) return 0;
  const committed = scorecards
    .filter((c) => c.committed_at)
    .sort((a, b) => (b.week_of > a.week_of ? 1 : -1));

  let count = 0;
  for (const card of committed) {
    const entry = card.kpi_results?.[templateId];
    // Use raw result here, not effectiveResult — we want to count
    // weeks where the user explicitly left it pending, not weeks
    // where the system auto-coerced pending to no after week-close.
    if (entry?.result === 'pending') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Returns one of 'up' | 'down' | 'flat' describing the week-over-week
 * trend for a KPI. Compares the most recent committed scorecard's result
 * for this KPI to the prior week's:
 *   yes  vs no/pending  → 'up'
 *   no   vs yes         → 'down'
 *   no   vs pending     → 'down' (regression)
 *   pending vs yes      → 'down'
 *   pending vs no       → 'up' (improvement toward resolution)
 *   yes  vs yes         → 'flat'
 *   no   vs no          → 'flat'
 *   pending vs pending  → 'flat'
 *   missing prior week  → null (no trend yet)
 *
 * @param {string} templateId
 * @param {Array} scorecards
 * @returns {'up' | 'down' | 'flat' | null}
 */
export function computeWeekOverWeekTrend(templateId, scorecards) {
  if (!templateId || !Array.isArray(scorecards)) return null;
  const committed = scorecards
    .filter((c) => c.committed_at)
    .sort((a, b) => (b.week_of > a.week_of ? 1 : -1));
  if (committed.length < 2) return null;

  const rank = (r) => {
    if (r === 'yes') return 2;
    if (r === 'pending') return 1;
    if (r === 'no') return 0;
    return null;
  };

  const cur = rank(committed[0].kpi_results?.[templateId]?.result);
  const prv = rank(committed[1].kpi_results?.[templateId]?.result);
  if (cur === null || prv === null) return null;
  if (cur > prv) return 'up';
  if (cur < prv) return 'down';
  return 'flat';
}

/**
 * Returns the prior week's reflection text for a KPI, if present.
 * Used by the GhostedPriorContext primitive on Scorecard rows.
 *
 * @param {string} templateId
 * @param {Array} scorecards
 * @param {string} currentWeekOf — 'YYYY-MM-DD' Monday of the current week
 * @returns {string | null}
 */
export function priorWeekReflection(templateId, scorecards, currentWeekOf) {
  if (!templateId || !Array.isArray(scorecards) || !currentWeekOf) return null;
  // Compute the prior Monday in local time. Don't use Date(string) — would
  // be UTC. Mirrors getMondayOf conventions in week.js.
  const [y, m, d] = currentWeekOf.split('-').map(Number);
  const prev = new Date(y, m - 1, d - 7);
  const yy = prev.getFullYear();
  const mm = String(prev.getMonth() + 1).padStart(2, '0');
  const dd = String(prev.getDate()).padStart(2, '0');
  const prevMonday = `${yy}-${mm}-${dd}`;

  const card = scorecards.find((c) => c.week_of === prevMonday && c.committed_at);
  const reflection = card?.kpi_results?.[templateId]?.reflection;
  return reflection && reflection.trim() ? reflection : null;
}
