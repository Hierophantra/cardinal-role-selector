// CarriedForwardBadge — explicit "this is from last week" marker.
// Surfaces on Week Objectives that are being repeated/extended week to
// week, so partners see when an objective is fresh vs recurring.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §13 (State Continuity Layer)

import { RotateCcw } from 'lucide-react';

export default function CarriedForwardBadge({ label = 'Carried forward', className = '' }) {
  return (
    <span
      className={`continuity-badge continuity-badge--carried-forward ${className}`}
      title={label}
      aria-label={label}
    >
      <RotateCcw size={11} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
