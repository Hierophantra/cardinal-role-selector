// src/components/WeekPlanCard.jsx
// UAT 2026-05-18 (Week Objectives): rewritten from the 3-textbox week-plan
// display to a card list. Surfaces this partner's accountability objectives
// for the current week — one card per objective, each with priority, risks &
// blockers, and a deadline / commitment window. Trace builds these in Monday
// meeting mode; partners view only.
// Receives `objectives` — the array from fetchWeeklyObjectivesForPartner.
//   null      -> still loading, render nothing
//   []        -> loaded, none captured -> empty state

export default function WeekPlanCard({ objectives }) {
  if (objectives === null || objectives === undefined) return null;

  return (
    <section className="week-plan-card hub-section">
      <div className="eyebrow">THIS WEEK</div>
      <h3 className="week-plan-card__heading">Accountability Objectives</h3>

      {objectives.length === 0 ? (
        <p className="week-plan-card__empty">
          No objectives captured yet. See you at Monday Prep.
        </p>
      ) : (
        <div className="objective-board objective-board--hub">
          {objectives.map((obj) => (
            <div key={obj.id} className="objective-card objective-card--readonly">
              <div className="objective-readonly-field">
                <span className="objective-field-label">Priority</span>
                <p>{obj.priority?.trim() || '—'}</p>
              </div>
              {obj.risks?.trim() && (
                <div className="objective-readonly-field">
                  <span className="objective-field-label">Risks &amp; blockers</span>
                  <p>{obj.risks.trim()}</p>
                </div>
              )}
              {obj.deadline?.trim() && (
                <div className="objective-card-deadline">
                  <span className="objective-field-label">Deadline</span>
                  <span className="objective-card-deadline-value">{obj.deadline.trim()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
