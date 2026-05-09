// Wave 3 (UAT 2026-05-09) — Tier 3: last-week commitment carry-forward.
//
// Read-only context card rendered at the top of Scorecard.jsx (between the
// post-submit banner and the first KPI row). Surfaces last week's Pending
// commitments with their resolution state so the partner sees what's still
// open before starting this week's check-in.
//
// No new write semantics, no new schema. The card derives everything from
// last week's scorecards row:
//   - Pending rows where pending_text was non-empty
//   - Status comes from the row's same-week resolution:
//       * raw='yes'     → 'met' (Pending was converted to Met)
//       * raw='pending' + week closed → 'not_converted' (auto-coerced to no)
//       * raw='pending' + week open   → 'live' (rare — only relevant if the
//                                       caller passes the in-progress week)
//
// Empty case (no last-week scorecard, or no Pending commitments): renders
// nothing. The card never blocks scorecard input.

import { extractPendingCommitments } from '../lib/substance.js';
import { LAST_WEEK_COMMITMENTS_COPY } from '../data/content.js';

const STATUS_TEXT = {
  met: LAST_WEEK_COMMITMENTS_COPY.statusMet,
  not_converted: LAST_WEEK_COMMITMENTS_COPY.statusNotConverted,
  live: LAST_WEEK_COMMITMENTS_COPY.statusLive,
};

export default function LastWeekCommitments({ priorScorecard }) {
  const items = extractPendingCommitments(priorScorecard);
  if (items.length === 0) return null;

  return (
    <div className="last-week-commitments">
      <div className="last-week-commitments__eyebrow">
        {LAST_WEEK_COMMITMENTS_COPY.eyebrow}
      </div>
      <div className="last-week-commitments__heading">
        {LAST_WEEK_COMMITMENTS_COPY.heading}
      </div>
      <div className="last-week-commitments__subtext">
        {LAST_WEEK_COMMITMENTS_COPY.subtext}
      </div>
      <ul className="last-week-commitments__list">
        {items.map((item) => (
          <li key={item.kpiId} className="last-week-commitments__row">
            <div className="last-week-commitments__label">{item.label}</div>
            <div className="last-week-commitments__commitment">{item.commitment}</div>
            <div
              className={`last-week-commitments__status last-week-commitments__status--${item.status}`}
            >
              {STATUS_TEXT[item.status] ?? item.status}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
