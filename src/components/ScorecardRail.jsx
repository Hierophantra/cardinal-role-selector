// ScorecardRail — Tier 3 v2 Wave 5.
//
// Sticky left-rail navigation that lists every KPI row on the Scorecard
// with its status + answered indicator. Clicking an item smooth-scrolls
// to the matching `#kpi-${tpl.id}` anchor in the form.
//
// Desktop-only — mobile keeps the existing vertical-scroll experience.
// The rail provides ChatGPT's "orientation + visible remaining work +
// navigable structure" win without changing the form's internal mechanics.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §4 (Scorecard redesign)

import { useEffect, useState } from 'react';
import { effectiveResult } from '../lib/week.js';
import { getCategoryColor } from '../data/content.js';

function statusModifierClass(rawResult, weekOf) {
  // Mirrors ThisWeekKpisSection.statusModifierClass — kept inline to avoid
  // a circular import. Both files compute the same status semantics.
  const effective = effectiveResult(rawResult, weekOf);
  if (effective === 'yes') return 'rail-status-dot--met';
  if (effective === 'no') return 'rail-status-dot--missed';
  if (effective === 'pending') return 'rail-status-dot--pending-active';
  return 'rail-status-dot--unanswered';
}

export default function ScorecardRail({
  rows,
  kpiResults,
  currentWeekOf,
  answeredCount,
  totalCount,
}) {
  // Track which row is currently in view. Updated on scroll via IntersectionObserver
  // so the rail item matching the visible row gets a subtle highlight.
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!rows || rows.length === 0) return;
    // Watch each KPI row's anchor. Whichever is most central in the viewport
    // (top within the upper 40% of the screen) becomes the active item.
    const targets = rows
      .map((tpl) => document.getElementById(`kpi-${tpl.id}`))
      .filter(Boolean);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's still visible.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id.replace(/^kpi-/, '');
          setActiveId(id);
        }
      },
      {
        // Trigger when a row's top edge crosses the upper 40% of the viewport.
        rootMargin: '-10% 0px -60% 0px',
        threshold: 0,
      }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rows]);

  function handleClick(e, id) {
    e.preventDefault();
    const target = document.getElementById(`kpi-${id}`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Set active immediately so the user gets feedback even before the
    // observer catches up.
    setActiveId(id);
  }

  return (
    <aside className="scorecard-rail" aria-label="KPI navigation">
      <div className="scorecard-rail__header">
        <span className="scorecard-rail__eyebrow">This Week</span>
        <span className="scorecard-rail__count">
          {answeredCount} / {totalCount}
        </span>
      </div>
      <ul className="scorecard-rail__list">
        {rows.map((tpl) => {
          const entry = kpiResults[tpl.id];
          const result = entry?.result ?? null;
          const dotClass = statusModifierClass(result, currentWeekOf);
          const isActive = activeId === tpl.id;
          const category = tpl.category;
          const categoryVar = category ? getCategoryColor(category) : null;
          return (
            <li key={tpl.id}>
              <a
                href={`#kpi-${tpl.id}`}
                className={`scorecard-rail__item ${isActive ? 'scorecard-rail__item--active' : ''}`}
                onClick={(e) => handleClick(e, tpl.id)}
                style={categoryVar ? { '--rail-category-color': `var(${categoryVar})` } : undefined}
              >
                <span className={`rail-status-dot ${dotClass}`} aria-hidden="true" />
                <span className="scorecard-rail__label">
                  {tpl.baseline_action || tpl.label || `KPI ${tpl.id}`}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
