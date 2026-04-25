// Season stats computation helpers (Phase 11 — rewritten Phase 15 per D-22 / P-B1)

import { SEASON_START_DATE } from '../data/content.js';
import { getMondayOf, effectiveResult } from './week.js';

/**
 * Computes cumulative season hit rate and per-KPI stats.
 * v2.0 rewrite: iterates JSONB entries directly using entry.label (label-keyed),
 * so historical scorecards with rotated weekly-choice IDs continue to contribute.
 * See Phase 15 CONTEXT D-22 / pitfall P-B1.
 *
 * @param {Array} kpiSelections - Array of { id, label_snapshot, ... } — used only
 *                                 to drive the current perKpiStats list ordering
 * @param {Array} scorecards - Array of { week_of, committed_at, kpi_results: { [id]: { result, label } }, ... }
 * @returns {{ seasonHitRate: number|null, perKpiStats: Array }}
 */
export function computeSeasonStats(kpiSelections, scorecards) {
  const committed = scorecards.filter((c) => c.committed_at);

  let hits = 0;
  let possible = 0;
  const perLabelMap = {};  // key = label (string); value = { hits, possible }

  for (const card of committed) {
    const results = card.kpi_results ?? {};
    for (const [, entry] of Object.entries(results)) {
      const label = entry?.label;
      if (!label) continue;  // skip orphan/malformed entries (pre-Phase-4 rows)
      if (!perLabelMap[label]) {
        perLabelMap[label] = { hits: 0, possible: 0 };
      }
      // Phase 17 D-02: read entry.result through effectiveResult so post-Saturday-close
      // pending entries are coerced to 'no' for season aggregation. Live pending (week
      // not yet closed) still flows through as 'pending' and is skipped — same treatment
      // as null. Closed-week pending counts toward possible (and toward miss totals).
      const eff = effectiveResult(entry.result, card.week_of);
      if (eff === 'yes') {
        hits++;
        possible++;
        perLabelMap[label].hits++;
        perLabelMap[label].possible++;
      } else if (eff === 'no') {
        possible++;
        perLabelMap[label].possible++;
      }
      // null, undefined, or live 'pending': skip entirely
    }
  }

  const seasonHitRate = possible > 0 ? Math.round((hits / possible) * 100) : null;

  // perKpiStats keyed to CURRENT selections (for hub sparkline order).
  // Looks up each selection's label in the label-keyed map.
  const perKpiStats = kpiSelections.map((k) => {
    const label = k.label_snapshot;
    const s = perLabelMap[label] ?? { hits: 0, possible: 0 };
    return {
      id: k.id,
      label,
      hitRate: s.possible > 0 ? Math.round((s.hits / s.possible) * 100) : null,
      hits: s.hits,
      possible: s.possible,
    };
  });

  return { seasonHitRate, perKpiStats };
}

/**
 * Computes consecutive miss streaks per KPI.
 * v2.0 rewrite: matches scorecard entries by label_snapshot rather than id,
 * so rotating weekly-choice IDs do not silently break streak detection.
 * Walks committed scorecards newest-first; breaks on 'yes' OR null (not just 'yes').
 * @param {Array} kpiSelections - Array of { id, label_snapshot, ... }
 * @param {Array} scorecards - Array sorted newest-first with committed_at filter
 * @returns {Array} of { id, label, streak: number }
 */
export function computeStreaks(kpiSelections, scorecards) {
  const committed = scorecards.filter((c) => c.committed_at);
  return kpiSelections.map((k) => {
    const label = k.label_snapshot;
    let streak = 0;
    for (const card of committed) {
      const results = card.kpi_results ?? {};
      // find the entry that matches this label (historical IDs won't match k.id)
      const entry = Object.values(results).find((e) => e?.label === label);
      // Phase 17 D-02: post-close pending coerces to 'no' so closed-week pendings
      // extend the miss streak rather than silently breaking it.
      const eff = effectiveResult(entry?.result, card.week_of);
      if (eff === 'no') {
        streak++;
      } else {
        break;  // 'yes' OR null OR live 'pending' OR missing — break streak
      }
    }
    return { id: k.id, label, streak };
  });
}

/**
 * Returns the 1-based week number from SEASON_START_DATE to current Monday.
 * Uses local-time Date construction — NEVER new Date(string).
 * @returns {number}
 */
export function computeWeekNumber() {
  const [sy, sm, sd] = SEASON_START_DATE.split('-').map(Number);
  const seasonStart = new Date(sy, sm - 1, sd);

  const currentMonday = getMondayOf();
  const [cy, cm, cd] = currentMonday.split('-').map(Number);
  const current = new Date(cy, cm - 1, cd);

  const diffMs = current - seasonStart;
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks + 1);
}

/**
 * Returns the appropriate CSS color variable for a given hit rate.
 * @param {number|null} hitRate
 * @returns {string}
 */
export function getPerformanceColor(hitRate) {
  if (hitRate === null) return 'var(--border)';
  if (hitRate >= 80) return 'var(--success)';
  if (hitRate >= 50) return 'var(--gold)';
  return 'var(--miss)';
}
