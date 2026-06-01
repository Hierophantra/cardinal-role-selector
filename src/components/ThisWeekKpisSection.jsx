// src/components/ThisWeekKpisSection.jsx — Phase 15 Wave 2 (extended Phase 16 Wave 3)
// Presentation-only. Hub (Wave 3) supplies all data via props.
// See .planning/phases/15-role-identity-hub-redesign/15-UI-SPEC.md.
// Phase 16 extension: inline +1 counter pill per countable KPI row + locked weekly-choice card.
//
// 2026-06-01: the section now collapses (collapsed by default) so the hub
// leads with Personal Growth + Business Priorities and partners drill into
// KPIs intentionally. Toggle state persists per partner via localStorage so
// admins / partners don't fight the collapse every page load.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WEEKLY_KPI_COPY } from '../data/content.js';
import { effectiveResult, isWeekClosed } from '../lib/week.js';
import TagPill from './TagPill.jsx';

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
    if (weekOf && isWeekClosed(weekOf)) return 'kpi-status-dot--pending';
    return 'kpi-status-dot--pending-active';
  }
  return 'kpi-status-dot--pending';
}

void effectiveResult;

const COLLAPSE_KEY = (partner) => `cardinal:thisWeekKpis:collapsed:${partner}`;

export default function ThisWeekKpisSection({
  partner,
  mandatorySelections,
  thisWeekCard,
  weeklySelection,
  previousSelection,
  counters = {},
  onIncrementCounter,
}) {
  // 2026-06-01: collapsed by default. localStorage holds the preference per
  // partner so it survives reloads but doesn't bleed across roles.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = window.localStorage.getItem(COLLAPSE_KEY(partner));
      // Default = collapsed. Only honor an explicit "open" preference.
      return v === 'open' ? false : true;
    } catch {
      return true;
    }
  });

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY(partner), next ? 'collapsed' : 'open');
      } catch {}
      return next;
    });
  }

  const hasSelection = Boolean(weeklySelection?.kpi_template_id);
  const hasPrevious = Boolean(previousSelection);

  // Compact head-line counters surfaced in the collapsed header so partners
  // see "Yes / Pending / No" at a glance without expanding.
  const counts = mandatorySelections.reduce((acc, k) => {
    const r = thisWeekCard?.kpi_results?.[k.template_id]?.result ?? null;
    if (r === 'yes') acc.yes += 1;
    else if (r === 'no') acc.no += 1;
    else if (r === 'pending') acc.pending += 1;
    else acc.unanswered += 1;
    return acc;
  }, { yes: 0, no: 0, pending: 0, unanswered: 0 });
  const totalRows = mandatorySelections.length + (hasSelection ? 1 : 0);

  return (
    <section className="this-week-kpis-section hub-section">
      <button
        type="button"
        className="hub-section-toggle this-week-kpis-toggle"
        onClick={toggle}
        aria-expanded={!collapsed}
      >
        <div className="this-week-kpis-toggle__title">
          <h3>This Week's KPIs</h3>
          <div className="this-week-kpis-toggle__summary">
            <span className="kpi-summary-chip kpi-summary-chip--met">{counts.yes} met</span>
            {counts.pending > 0 && (
              <span className="kpi-summary-chip kpi-summary-chip--pending">{counts.pending} pending</span>
            )}
            {counts.no > 0 && (
              <span className="kpi-summary-chip kpi-summary-chip--missed">{counts.no} missed</span>
            )}
            <span className="kpi-summary-chip kpi-summary-chip--muted">
              {counts.unanswered} of {totalRows} not yet
            </span>
          </div>
        </div>
        <span className="hub-section-chevron" aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </span>
      </button>

      <div className={`hub-collapsible${collapsed ? '' : ' expanded'}`}>
        <ul className="kpi-week-list">
          {mandatorySelections.map((k) => {
            const result = thisWeekCard?.kpi_results?.[k.template_id]?.result ?? null;
            const isCountable = Boolean(k.kpi_templates?.countable);
            const count = counters?.[k.template_id] ?? 0;
            const category = k.kpi_templates?.category;
            return (
              <li key={k.id} className="kpi-week-row">
                <span
                  className={`kpi-status-dot ${statusModifierClass(result, thisWeekCard?.week_of)}`}
                  aria-hidden="true"
                />
                <span className="kpi-week-label">{k.label_snapshot}</span>
                {category && <TagPill category={category} size="sm" />}
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

        {hasPrevious && (
          <p className="weekly-choice-hint">
            Last week you picked: {previousSelection.label_snapshot}
          </p>
        )}

        <div className="weekly-choice-card">
          {hasSelection ? (
            <>
              <h4>{WEEKLY_KPI_COPY.hubLockedHeadingTemplate(weeklySelection.label_snapshot)}</h4>
              <span className="weekly-choice-locked-label">{WEEKLY_KPI_COPY.hubLockedLabel}</span>
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
      </div>
    </section>
  );
}
