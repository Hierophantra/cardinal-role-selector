// Motion tokens for Framer Motion call sites.
//
// Mirrors the --duration-* and --ease-* CSS custom properties defined in
// src/index.css. Keeping the values here in JS (instead of reading the CSS
// vars at runtime) means we don't pay a getComputedStyle cost on every
// transition and motion stays consistent between CSS hover states and
// JS-driven Framer Motion entrances.
//
// Reference: docs/tier3-visual-overhaul/RESEARCH.md §2.5

// Durations expressed in seconds (Framer Motion convention),
// not milliseconds (CSS convention). The numeric value matches:
//   --duration-fast = 120ms = 0.12s
//   --duration-base = 180ms = 0.18s
//   --duration-slow = 280ms = 0.28s
export const DURATION_FAST = 0.12;
export const DURATION_BASE = 0.18;
export const DURATION_SLOW = 0.28;

// Easing curves expressed as cubic-bezier control points (Framer Motion
// accepts a 4-tuple). Matches:
//   --ease-out    = cubic-bezier(0.16, 1, 0.3, 1)
//   --ease-in-out = cubic-bezier(0.65, 0, 0.35, 1)
export const EASE_OUT = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];

// Convenience: the canonical screen-transition object. Used by
// Questionnaire, KpiSelection, Scorecard, PartnerProgress, etc. — all
// previously used { duration: 0.28, ease: 'easeOut' }.
export const SCREEN_TRANSITION = {
  duration: DURATION_SLOW,
  ease: EASE_OUT,
};

// Faster variant used by the admin meeting session for in-stop reveals
// (previously { duration: 0.22, ease: 'easeOut' }).
export const STOP_TRANSITION = {
  duration: DURATION_BASE,
  ease: EASE_OUT,
};
