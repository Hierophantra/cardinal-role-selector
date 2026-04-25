// src/components/ThisWeekKpisSection.jsx — Phase 15 Wave 2 (extended Phase 16 Wave 3)
// Presentation-only. Hub (Wave 3) supplies all data via props.
// See .planning/phases/15-role-identity-hub-redesign/15-UI-SPEC.md.
// Phase 16 extension: inline +1 counter pill per countable KPI row + locked weekly-choice card.

import React from 'react';
import { Link } from 'react-router-dom';
import { WEEKLY_KPI_COPY } from '../data/content.js';
import { effectiveResult, isWeekClosed } from '../lib/week.js';

/**
 * Maps scorecard entry raw result to status-dot color class.
 * 'yes' → green (met), 'no' → red (missed).
 * Phase 17 D-02 + D-08: 'pending' branches by week-closed state —
 *   live pending (week still open) → amber `--pending-active` (active commitment)
 *   closed-week pending (auto-coerced to 'no' by effectiveResult) → gray `--pending`
 * null / undefined / unknown → gray `--pending` (preserves existing "not yet
 * answered" semantics).
 *
 * Exported (not just module-private) so it can be unit-tested directly
 * (per Phase 15 checker B1, 2026-04-16). Pure function, no side effects.
 *
 * @param {string|null|undefined} rawResult
 * @param {string} [weekOf] 'YYYY-MM-DD' Monday — required to distinguish live vs
 *   closed pending; falsy treats pending as live (active amber).
 */
export function statusModifierClass(rawResult, weekOf) {
  if (rawResult === 'yes') return 'kpi-status-dot--met';
  if (rawResult === 'no') return 'kpi-status-dot--missed';
  if (rawResult === 'pending') {
    // Use effectiveResult to detect post-close coercion: pending + closed → 'no' →
    // this row will already render with the missed dot via the rawResult==='no' branch
    // when callers pre-coerce. For uncoerced raw 'pending', still distinguish by week:
    if (weekOf && isWeekClosed(weekOf)) return 'kpi-status-dot--pending';
    return 'kpi-status-dot--pending-active';
  }
  return 'kpi-status-dot--pending';
}

// Internal sanity reference to keep effectiveResult import live for future call-sites
// (Phase 17 D-02 audit footprint). statusModifierClass branches above already cover
// the live-vs-closed distinction; effectiveResult is exported by week.js for parity
// with other consumers in this audit (PartnerHub, seasonStats).
void effectiveResult;

export default function ThisWeekKpisSection({
  partner,
  mandatorySelections,
  thisWeekCard,
  weeklySelection,
  previousSelection,
  counters = {},
  onIncrementCounter,
}) {
  // IN-06: weeklyChoiceLocked prop removed. D-03 always shows the locked
  // label when hasSelection is true. Phase 17 introduces a Pending-Saturday
  // state; if a separate locked-vs-pending distinction is needed then,
  // re-add a prop with concrete semantics rather than an eslint-disable.
  // A weekly_kpi_selections row can exist with kpi_template_id=NULL when the counter
  // auto-create path (incrementKpiCounter) seeded it before the partner picked a KPI.
  // Treat only rows with a non-null template as a real selection (D-19 / D-21).
  const hasSelection = Boolean(weeklySelection?.kpi_template_id);
  const hasPrevious = Boolean(previousSelection);

  return (
    <section className="this-week-kpis-section hub-section">
      <h3>This Week's KPIs</h3>

      {/* Mandatory KPI list with status dots (HUB-02) + inline +1 counter pill (COUNT-01) */}
      <ul className="kpi-week-list">
        {mandatorySelections.map((k) => {
          // kpi_results is keyed by kpi_templates.id (v2.0 Scorecard write shape) — read by k.template_id
          const result = thisWeekCard?.kpi_results?.[k.template_id]?.result ?? null;
          const isCountable = Boolean(k.kpi_templates?.countable);
          const count = counters?.[k.template_id] ?? 0;
          return (
            <li key={k.id} className="kpi-week-row">
              <span
                className={`kpi-status-dot ${statusModifierClass(result, thisWeekCard?.week_of)}`}
                aria-hidden="true"
              />
              <span className="kpi-week-label">{k.label_snapshot}</span>
              {isCountable && onIncrementCounter && (
                <div className={`kpi-counter${count > 0 ? ' has-count' : ''}`}>
                  <span className="kpi-counter-number">{count}</span>
                  <button
                    type="button"
                    className="kpi-counter-btn"
                    onClick={() => onIncrementCounter(k.template_id)}
                    aria-label={`Increment ${k.label_snapshot || 'counter'}`}
                  >+1</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Last-week hint (HUB-05) — always visible when a previous selection exists, per D-13 */}
      {hasPrevious && (
        <p className="weekly-choice-hint">
          Last week you picked: {previousSelection.label_snapshot}
        </p>
      )}

      {/* Weekly-choice amber card (HUB-03, HUB-04, D-12) + post-commit locked state (D-03) */}
      <div className="weekly-choice-card">
        {hasSelection ? (
          <>
            <h4>{WEEKLY_KPI_COPY.hubLockedHeadingTemplate(weeklySelection.label_snapshot)}</h4>
            <span className="weekly-choice-locked-label">{WEEKLY_KPI_COPY.hubLockedLabel}</span>
            {/* D-03: no Change link; selection locks at confirm per D-01 */}
          </>
        ) : (
          <>
            <h4>Choose your KPI for this week</h4>
            <Link to={`/weekly-kpi/${partner}`} className="weekly-choice-cta">
              Choose this week's KPI
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
