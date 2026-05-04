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
  // UAT 2026-04-30: per-template-id map alongside the existing label aggregation.
  // The label-keyed map preserves Phase 15 D-22 / P-B1 rotation aggregation for
  // historical entries that may share labels; the template-id map provides the
  // robust join key for perKpiStats since kpi_selections.label_snapshot can drift
  // from the live kpi_templates.baseline_action (which scorecards write).
  const perLabelMap = {};        // key = label (string); value = { hits, possible }
  const perTemplateMap = {};     // key = template_id (JSONB entry key); value = { hits, possible }

  for (const card of committed) {
    const results = card.kpi_results ?? {};
    for (const [tplId, entry] of Object.entries(results)) {
      const label = entry?.label;
      // Always populate template-id map (does not require a label).
      if (!perTemplateMap[tplId]) {
        perTemplateMap[tplId] = { hits: 0, possible: 0 };
      }
      // Skip label-keyed map for orphan/malformed entries (pre-Phase-4 rows).
      const labelOk = Boolean(label);
      if (labelOk && !perLabelMap[label]) {
        perLabelMap[label] = { hits: 0, possible: 0 };
      }
      // Phase 17 D-02: read entry.result through effectiveResult so post-Saturday-close
      // pending entries are coerced to 'no' for season aggregation. Live pending (week
      // not yet closed) still flows through as 'pending' and is skipped — same treatment
      // as null. Closed-week pending counts toward possible (and toward miss totals).
      const eff = effectiveResult(entry?.result, card.week_of);
      if (eff === 'yes') {
        hits++;
        possible++;
        perTemplateMap[tplId].hits++;
        perTemplateMap[tplId].possible++;
        if (labelOk) {
          perLabelMap[label].hits++;
          perLabelMap[label].possible++;
        }
      } else if (eff === 'no') {
        possible++;
        perTemplateMap[tplId].possible++;
        if (labelOk) {
          perLabelMap[label].possible++;
        }
      }
      // null, undefined, or live 'pending': skip entirely
    }
  }

  const seasonHitRate = possible > 0 ? Math.round((hits / possible) * 100) : null;

  // perKpiStats keyed to CURRENT selections (for hub sparkline order).
  // UAT 2026-04-30: match by template_id (stable across the kpi_selections /
  // kpi_results tables) instead of label_snapshot (which drifts when seeds change).
  // Display label prefers the live kpi_templates.baseline_action (joined via
  // fetchKpiSelections) and falls back to the snapshot.
  const perKpiStats = kpiSelections.map((k) => {
    const stats = perTemplateMap[k.template_id] ?? { hits: 0, possible: 0 };
    const liveLabel = k.kpi_templates?.baseline_action;
    return {
      id: k.id,
      label: liveLabel || k.label_snapshot,
      hitRate: stats.possible > 0 ? Math.round((stats.hits / stats.possible) * 100) : null,
      hits: stats.hits,
      possible: stats.possible,
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
    // UAT 2026-04-30: match by template_id (stable) rather than label_snapshot
    // (which drifts after seed changes). The kpi_results JSONB is keyed by
    // template_id directly, so the lookup is exact and free.
    const liveLabel = k.kpi_templates?.baseline_action;
    const label = liveLabel || k.label_snapshot;
    let streak = 0;
    for (const card of committed) {
      const results = card.kpi_results ?? {};
      const entry = results?.[k.template_id];
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
