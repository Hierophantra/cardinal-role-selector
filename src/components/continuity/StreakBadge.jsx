// StreakBadge — small "Nw streak" indicator next to a KPI label when a
// partner has hit it for ≥ 2 consecutive weeks. Renders nothing below
// the threshold so it doesn't clutter the typical case.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §13 (State Continuity Layer)

import { Flame } from 'lucide-react';

export default function StreakBadge({ weeks, threshold = 2, className = '' }) {
  if (!weeks || weeks < threshold) return null;
  return (
    <span
      className={`continuity-badge continuity-badge--streak ${className}`}
      title={`${weeks}-week streak`}
      aria-label={`${weeks}-week streak`}
    >
      <Flame size={12} strokeWidth={2} aria-hidden="true" />
      <span>{weeks}w</span>
    </span>
  );
}
