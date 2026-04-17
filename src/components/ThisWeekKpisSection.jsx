// src/components/ThisWeekKpisSection.jsx — Phase 15 Wave 2 (extended Phase 16 Wave 3)
// Presentation-only. Hub (Wave 3) supplies all data via props.
// See .planning/phases/15-role-identity-hub-redesign/15-UI-SPEC.md.
// Phase 16 extension: inline +1 counter pill per countable KPI row + locked weekly-choice card.

import React from 'react';
import { Link } from 'react-router-dom';
import { WEEKLY_KPI_COPY } from '../data/content.js';

/**
 * Maps scorecard entry result to status-dot color class.
 * 'yes' → green (met), 'no' → red (missed), anything else → gray (not yet answered).
 * Per CONTEXT D-10 and UI-SPEC Status Dot States table.
 *
 * Exported (not just module-private) so it can be unit-tested directly
 * (per Phase 15 checker B1, 2026-04-16). Pure function, no side effects.
 */
export function statusModifierClass(result) {
  if (result === 'yes') return 'kpi-status-dot--met';
  if (result === 'no') return 'kpi-status-dot--missed';
  return 'kpi-status-dot--pending';
}

export default function ThisWeekKpisSection({
  partner,
  mandatorySelections,
  thisWeekCard,
  weeklySelection,
  previousSelection,
  counters = {},
  onIncrementCounter,
  // eslint-disable-next-line no-unused-vars -- accepted for forward compat; D-03 always shows locked label when hasSelection
  weeklyChoiceLocked = false,
}) {
  const hasSelection = Boolean(weeklySelection);
  const hasPrevious = Boolean(previousSelection);

  return (
    <section className="this-week-kpis-section hub-section">
      <h3>This Week's KPIs</h3>

      {/* Mandatory KPI list with status dots (HUB-02) + inline +1 counter pill (COUNT-01) */}
      <ul className="kpi-week-list">
        {mandatorySelections.map((k) => {
          const result = thisWeekCard?.kpi_results?.[k.id]?.result ?? null;
          const isCountable = Boolean(k.kpi_templates?.countable);
          const count = counters?.[k.template_id] ?? 0;
          return (
            <li key={k.id} className="kpi-week-row">
              <span
                className={`kpi-status-dot ${statusModifierClass(result)}`}
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
