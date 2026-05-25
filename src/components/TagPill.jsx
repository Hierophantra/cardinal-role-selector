// TagPill — small categorical/status pill used throughout the v2 redesign.
//
// Two ways to color it:
//   1. category="financial" | "sales" | "ops" | "quality" | "growth" |
//      "team" | "reflection" — resolves to the matching --category-*
//      token via getCategoryColor() in content.js.
//   2. color="--blue" | "--success" | etc. — pass a CSS custom property
//      name directly. Useful for ad-hoc status pills not tied to a KPI
//      category (e.g., "On track" / "Off track" status labels).
//
// Filled is the default (Gemini synthesis recommendation — better visual
// weight in dark mode). Pass `outlined` for dense lists where filled
// would feel heavy (e.g., AdminKpi editor list rail).
//
// Children optional — if you pass a `category` without children, the
// label resolves from CATEGORY_LABELS automatically.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §5 (Component patterns)

import { CATEGORY_LABELS, getCategoryColor } from '../data/content.js';

export default function TagPill({
  category,
  color,
  outlined = false,
  size = 'md',  // 'sm' | 'md' | 'lg'
  children,
  className = '',
  ...rest
}) {
  // Resolve the CSS custom property name:
  //   - explicit `color` prop wins (already a --token name)
  //   - else derive from `category`
  //   - else falls back to --muted
  const colorVarName = color || (category && getCategoryColor(category)) || '--muted';
  const label = children ?? (category && CATEGORY_LABELS[category]) ?? '';

  // Compose CSS classnames. The .tag-pill base styles + variant modifiers
  // live in src/index.css under "TagPill — Wave 2".
  const classes = [
    'tag-pill',
    outlined ? 'tag-pill--outlined' : 'tag-pill--filled',
    `tag-pill--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      // The pill reads its color through this CSS variable so callers
      // can set any token (--category-*, --blue, --success, etc.)
      // without us needing a switch on every color.
      style={{ '--tag-pill-color': `var(${colorVarName})` }}
      data-category={category || undefined}
      {...rest}
    >
      {label}
    </span>
  );
}
