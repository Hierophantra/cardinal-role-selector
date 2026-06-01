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

export default function NowClock({ variant = 'default', className = '' }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId;
    let intervalId;

    function tick() {
      setNow(new Date());
      // Switch from the initial align-to-minute timeout to a steady
      // every-60s interval. The setTimeout path runs once; the interval
      // takes over afterwards.
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

  const label = formatNow(now);
  return (
    <div className={`now-clock now-clock--${variant} ${className}`} aria-label={`Current time: ${label}`}>
      <Clock size={variant === 'meeting' ? 14 : 12} strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
