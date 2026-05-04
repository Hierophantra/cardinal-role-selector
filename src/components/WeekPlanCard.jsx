// src/components/WeekPlanCard.jsx — UAT 2026-05-04 Week Plan feature
// Read-only display of "This Week's Plan" — surfaces Monday Prep's per-partner
// notes (priorities_focus, risks_blockers, commitments) on each partner's hub.
// Receives `weekPlan` as the result shape from fetchWeekPlanForWeek.
// Empty state: weekPlan.meetingId === null → "No plan captured yet".
// Trace edits the plan via the meeting flow; partners view only.

import { PARTNER_DISPLAY } from '../data/content.js';

const PARTNERS = ['theo', 'jerry'];

const SECTIONS = [
  { key: 'priorities_focus', heading: 'Priorities' },
  { key: 'risks_blockers', heading: 'Risks & Blockers' },
  { key: 'commitments', heading: 'Walk-Away Commitments' },
];

export default function WeekPlanCard({ weekPlan }) {
  // Loading: parent still resolving — render nothing.
  if (weekPlan === null || weekPlan === undefined) return null;

  // Empty state: no Monday Prep meeting captured for this week.
  if (weekPlan.meetingId === null) {
    return (
      <section className="week-plan-card hub-section">
        <div className="eyebrow">MONDAY PREP</div>
        <h3 className="week-plan-card__heading">This Week&apos;s Plan</h3>
        <p className="week-plan-card__empty">
          No plan captured yet — see you at Monday Prep.
        </p>
      </section>
    );
  }

  const notes = weekPlan.notes ?? {};

  return (
    <section className="week-plan-card hub-section">
      <div className="eyebrow">MONDAY PREP</div>
      <h3 className="week-plan-card__heading">This Week&apos;s Plan</h3>

      {SECTIONS.map(({ key, heading }) => {
        const cell = notes[key] ?? { theo: '', jerry: '' };
        return (
          <div key={key} className="week-plan-card__section">
            <div className="week-plan-card__section-heading">{heading}</div>
            <div className="week-plan-card__partner-grid">
              {PARTNERS.map((p) => {
                const text = (cell[p] ?? '').trim();
                return (
                  <div key={p} className="week-plan-card__partner-cell">
                    <div className="week-plan-card__partner-name">
                      {PARTNER_DISPLAY[p] ?? p}
                    </div>
                    {text ? (
                      <p className="week-plan-card__partner-text">{text}</p>
                    ) : (
                      <p className="week-plan-card__partner-empty">
                        No notes captured.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
