// NowClock — Tier 3 v2 follow-up (2026-05-24).
//
// Small, muted, always-visible time + day display. Lives in the top-right
// area of every page that uses AppShell, and also in the meeting-shell
// header (which bypasses AppShell so it can run full-bleed for TV/projector
// use during Monday Prep and Friday Review).
//
// Ticks once per minute — fine resolution for an accountability workspace,
// no setInterval-on-the-second waste. Updates use a setTimeout aligned to
// the next minute boundary so the displayed minute matches wall-clock time
// even after the tab sits idle.
//
// Variants:
//   - default            tasteful muted bar, suits the AppShell top
//   - "meeting"          larger, light-on-dark, suits the TV-readable
//                        meeting-shell-header

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useElementConfig } from '../lib/elementConfig.js';

function formatNow(d) {
  // "Mon, 9:32 AM" — short day + 12-hour clock. toLocaleDateString +
  // toLocaleTimeString are locale-aware; en-US fallback covers the
  // construction-industry use case.
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

function msUntilNextMinute() {
  const now = new Date();
  // Next minute boundary in the local timezone.
  return 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
}

export default function NowClock({ variant, className = '' }) {
  const [now, setNow] = useState(() => new Date());
  // Element-level config: admin can change size/position/visibility live.
  // `variant` prop overrides config (used by the meeting-shell which always
  // wants the larger TV-readable style regardless of admin preference).
  const config = useElementConfig('now-clock');

  useEffect(() => {
    let timeoutId;
    let intervalId;

    function tick() {
      setNow(new Date());
      if (!intervalId) {
        intervalId = setInterval(() => setNow(new Date()), 60000);
      }
    }

    timeoutId = setTimeout(tick, msUntilNextMinute());

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Hidden via admin config → render nothing (but still keep the ticking
  // interval alive so toggling back is instant).
  if (config.visible === false && !variant) return null;

  const effectiveVariant = variant || `size-${config.size || 'sm'}`;
  const iconSize =
    effectiveVariant === 'meeting' ? 14
    : effectiveVariant === 'size-lg' ? 16
    : effectiveVariant === 'size-md' ? 14
    : 12;

  const label = formatNow(now);
  // Phase 3 (2026-05-24): positionable element — apply saved dragX/dragY as
  // a CSS transform. Drag persistence happens in EditableElement; this
  // component just reads + renders.
  const hasOffset = (config.dragX || 0) !== 0 || (config.dragY || 0) !== 0;
  const offsetStyle = hasOffset
    ? { transform: `translate(${config.dragX || 0}px, ${config.dragY || 0}px)` }
    : undefined;

  return (
    <div
      className={`now-clock now-clock--${effectiveVariant} ${className}`}
      data-position={variant ? undefined : config.position}
      style={offsetStyle}
      aria-label={`Current time: ${label}`}
    >
      <Clock size={iconSize} strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
