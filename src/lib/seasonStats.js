// Season stats computation helpers (Phase 11)

import { SEASON_START_DATE } from '../data/content.js';
import { getMondayOf } from './week.js';

/**
 * Computes cumulative season hit rate and per-KPI stats.
 * Null results are excluded from both numerator and denominator.
 * @param {Array} kpiSelections - Array of { id, label_snapshot, ... }
 * @param {Array} scorecards - Array of { week_of, committed_at, kpi_results: { [id]: { result } }, ... }
 * @returns {{ seasonHitRate: number|null, perKpiStats: Array }}
 */
export function computeSeasonStats(kpiSelections, scorecards) {
  const committed = scorecards.filter((c) => c.committed_at);

  let hits = 0;
  let possible = 0;
  const perKpiMap = {};

  for (const k of kpiSelections) {
    perKpiMap[k.id] = { hits: 0, possible: 0, label: k.label_snapshot };
  }

  for (const card of committed) {
    for (const k of kpiSelections) {
      const result = card.kpi_results?.[k.id]?.result;
      if (result === 'yes') {
        hits++;
        possible++;
        perKpiMap[k.id].hits++;
        perKpiMap[k.id].possible++;
      } else if (result === 'no') {
        possible++;
        perKpiMap[k.id].possible++;
      }
      // null or missing: skip entirely
    }
  }

  const seasonHitRate = possible > 0 ? Math.round((hits / possible) * 100) : null;

  const perKpiStats = kpiSelections.map((k) => {
    const s = perKpiMap[k.id];
    return {
      id: k.id,
      label: k.label_snapshot,
      hitRate: s.possible > 0 ? Math.round((s.hits / s.possible) * 100) : null,
      hits: s.hits,
      possible: s.possible,
    };
  });

  return { seasonHitRate, perKpiStats };
}

/**
 * Computes consecutive miss streaks per KPI.
 * Walks committed scorecards newest-first; breaks on 'yes' OR null (not just 'yes').
 * @param {Array} kpiSelections - Array of { id, label_snapshot, ... }
 * @param {Array} scorecards - Array sorted newest-first with committed_at filter
 * @returns {Array} of { id, label, streak: number }
 */
export function computeStreaks(kpiSelections, scorecards) {
  const committed = scorecards.filter((c) => c.committed_at);

  return kpiSelections.map((k) => {
    let streak = 0;
    for (const card of committed) {
      const result = card.kpi_results?.[k.id]?.result;
      if (result === 'no') {
        streak++;
      } else {
        // 'yes' OR null OR missing — break streak
        break;
      }
    }
    return { id: k.id, label: k.label_snapshot, streak };
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
