// PendingForBadge — small "pending Nw" indicator when a KPI has been
// in pending state for ≥ 2 consecutive weeks without resolution.
// Surfaces patterns the partner might otherwise miss.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §13 (State Continuity Layer)

import { Clock } from 'lucide-react';

export default function PendingForBadge({ weeks, threshold = 2, className = '' }) {
  if (!weeks || weeks < threshold) return null;
  return (
    <span
      className={`continuity-badge continuity-badge--pending-for ${className}`}
      title={`Pending for ${weeks} weeks — still unresolved`}
      aria-label={`Pending for ${weeks} weeks`}
    >
      <Clock size={12} strokeWidth={2} aria-hidden="true" />
      <span>pending {weeks}w</span>
    </span>
  );
}
