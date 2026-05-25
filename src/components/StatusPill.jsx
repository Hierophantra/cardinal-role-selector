// StatusPill — Tier 3 v2 Wave 7.
//
// Successor to the kpi-status-dot pattern. Renders as a small text+dot
// pill by default, with optional inline <TrendArrow> for week-over-week
// direction signals.
//
// Status values:
//   'met'     → green   ("On track")
//   'missed'  → red     ("Missed")
//   'pending' → gold    ("In progress")
//   'closed'  → muted   ("Missed" but post-close)
//   'unknown' → muted   ("Not yet rated")
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §5 (Component patterns)

import TrendArrow from './continuity/TrendArrow.jsx';

const STATUS_META = {
  met:     { label: 'On track',      cls: 'status-pill--met' },
  missed:  { label: 'Missed',        cls: 'status-pill--missed' },
  pending: { label: 'In progress',   cls: 'status-pill--pending' },
  closed:  { label: 'Missed',        cls: 'status-pill--closed' },
  unknown: { label: 'Not yet rated', cls: 'status-pill--unknown' },
};

export default function StatusPill({
  status = 'unknown',
  trend = null,         // 'up' | 'down' | 'flat' | null
  label,                // optional override
  size = 'md',          // 'sm' | 'md'
  dotOnly = false,      // collapse to a status-dot for tight spaces
  className = '',
}) {
  const meta = STATUS_META[status] || STATUS_META.unknown;
  const text = label ?? meta.label;

  if (dotOnly) {
    return (
      <span
        className={`status-dot ${meta.cls} ${className}`}
        aria-label={text}
        title={text}
      />
    );
  }

  return (
    <span className={`status-pill status-pill--${size} ${meta.cls} ${className}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      <span className="status-pill__label">{text}</span>
      {trend && <TrendArrow direction={trend} />}
    </span>
  );
}
