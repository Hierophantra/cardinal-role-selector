// TrendArrow — micro arrow embedded inside status pills indicating
// week-over-week direction. Designed to be tiny — pure visual signal.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §13 (State Continuity Layer)

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function TrendArrow({ direction, className = '' }) {
  if (!direction) return null;
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  const label = direction === 'up' ? 'up from last week'
              : direction === 'down' ? 'down from last week'
              : 'unchanged from last week';
  return (
    <span
      className={`trend-arrow trend-arrow--${direction} ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon size={10} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}
