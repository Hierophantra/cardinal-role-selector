// src/components/ThisWeekKpisSection.jsx — Phase 15 Wave 2
// Presentation-only. Hub (Wave 3) supplies all data via props.
// See .planning/phases/15-role-identity-hub-redesign/15-UI-SPEC.md.

import React from 'react';
import { Link } from 'react-router-dom';

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
}) {
  const hasSelection = Boolean(weeklySelection);
  const hasPrevious = Boolean(previousSelection);

  return (
    <section className="this-week-kpis-section hub-section">
      <h3>This Week's KPIs</h3>

      {/* Mandatory KPI list with status dots (HUB-02) */}
      <ul className="kpi-week-list">
        {mandatorySelections.map((k) => {
          const result = thisWeekCard?.kpi_results?.[k.id]?.result ?? null;
          return (
            <li key={k.id} className="kpi-week-row">
              <span
                className={`kpi-status-dot ${statusModifierClass(result)}`}
                aria-hidden="true"
              />
              <span className="kpi-week-label">{k.label_snapshot}</span>
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

      {/* Weekly-choice amber card (HUB-03, HUB-04, D-12) */}
      <div className="weekly-choice-card">
        {hasSelection ? (
          <>
            <h4>{weeklySelection.label_snapshot}</h4>
            <Link to={`/weekly-kpi/${partner}`} className="change-btn">Change</Link>
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
