// ChecklistBlock — Tier 3 v2 Wave 7.
//
// Interactive checklist component. Renders a list of items, each of which
// may be clickable (e.g., scroll-to-anchor) and shows a check/circle state
// based on `done` flag.
//
// Designed to replace the scorecard-submit-checklist (the "Information
// still needed" submit gate). Not adopted yet — current submit checklist
// uses its own bespoke markup. Available for future migrations.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §12 (Component pattern split)

import { CheckCircle2, Circle } from 'lucide-react';

export default function ChecklistBlock({
  title,
  items = [],          // [{ id, label, done, onClick, anchor }]
  color = 'gold',      // matches Callout color tokens
  className = '',
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`checklist-block checklist-block--${color} ${className}`} role="region">
      {title && <div className="checklist-block__title">{title}</div>}
      <ul className="checklist-block__list">
        {items.map((it) => {
          const Icon = it.done ? CheckCircle2 : Circle;
          const Tag = it.onClick || it.anchor ? 'button' : 'div';
          const interactive = it.onClick || it.anchor;
          return (
            <li key={it.id}>
              <Tag
                type={Tag === 'button' ? 'button' : undefined}
                className={`checklist-block__item ${it.done ? 'checklist-block__item--done' : ''}`}
                onClick={() => {
                  if (it.onClick) it.onClick();
                  if (it.anchor) {
                    const target = document.getElementById(it.anchor);
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                disabled={Tag === 'button' && !interactive}
                aria-checked={it.done}
                role={Tag === 'button' ? 'checkbox' : undefined}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>{it.label}</span>
              </Tag>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
