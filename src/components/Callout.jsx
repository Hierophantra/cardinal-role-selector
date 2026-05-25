// Callout — Tier 3 v2 Wave 7.
//
// Notion-style persistent informational/error block. Used for read-only
// banners, error states, info notes. Six color variants tied to the
// functional palette through --callout-{color}-bg/--callout-{color}-border
// tokens declared in :root.
//
// For transient success/info, use <Toast> instead.
// For interactive checklists, use <ChecklistBlock>.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §12 (Component pattern split)

import { Info, AlertCircle, AlertTriangle, CheckCircle2, Compass } from 'lucide-react';

const DEFAULT_ICON_BY_COLOR = {
  blue: Info,
  red: AlertCircle,
  gold: AlertTriangle,
  green: CheckCircle2,
  violet: Compass,
  orange: AlertTriangle,
  teal: Info,
  rose: AlertCircle,
};

export default function Callout({
  color = 'blue',
  icon,
  title,
  children,
  className = '',
  ...rest
}) {
  // Pick the icon: explicit `icon` prop wins (a Lucide component); otherwise
  // we derive from color. Pass `icon={null}` to render no icon.
  const IconComp = icon === undefined ? DEFAULT_ICON_BY_COLOR[color] : icon;
  return (
    <div
      className={`callout callout--${color} ${className}`}
      role="region"
      {...rest}
    >
      {IconComp && (
        <span className="callout__icon" aria-hidden="true">
          <IconComp size={18} strokeWidth={1.75} />
        </span>
      )}
      <div className="callout__body">
        {title && <div className="callout__title">{title}</div>}
        <div className="callout__content">{children}</div>
      </div>
    </div>
  );
}
