// src/components/BusinessPrioritiesSection.jsx — Phase 18 Wave 1 (BIZ-02)
// Read-only display of the 2 shared business priorities (D-05/D-08/D-12).
// Receives `priorities` array as prop; never fetches internally.
// Reuses Phase 15 ROLE-04 collapsible idiom (useState + max-height transition; no Framer Motion).
// Placeholder strings (D-13) render verbatim — no client-side filtering.

import React, { useState } from 'react';

export default function BusinessPrioritiesSection({ priorities }) {
  // Hooks-before-early-return (P-U2 / HUB-08): declare all useState before any null-fallback.
  // expanded[priorityId] === true means that card's deliverables list is open. Each card
  // toggles independently per UI-SPEC §"Interaction Contract".
  const [expanded, setExpanded] = useState({});

  // Loading: parent still resolving — render nothing. Parent owns the loading skeleton.
  if (priorities === null || priorities === undefined) return null;

  // Defensive empty state (migration 011 always seeds 2 rows; should not occur in production).
  if (priorities.length === 0) {
    return (
      <section className="business-priorities-section hub-section">
        <div className="eyebrow">SHARED FOCUS AREAS</div>
        <h3>Business Priorities</h3>
        <p className="business-priorities-subtext">
          Same for both partners. Discussion notes per meeting captured below.
        </p>
        <p className="business-priorities-empty">
          No business priorities are configured yet.
        </p>
      </section>
    );
  }

  return (
    <section className="business-priorities-section hub-section">
      <div className="eyebrow">SHARED FOCUS AREAS</div>
      <h3>Business Priorities</h3>
      <p className="business-priorities-subtext">
        Same for both partners — discussion notes per meeting captured below.
      </p>

      <ul className="business-priorities-list">
        {priorities.map((p) => {
          const isOpen = Boolean(expanded[p.id]);
          return (
            <li key={p.id} className="business-priority-card">
              <h4>{p.title}</h4>
              <p className="business-priority-description">{p.description}</p>

              <button
                type="button"
                className="business-priority-toggle"
                onClick={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
                aria-expanded={isOpen}
              >
                <span className="business-priority-toggle-chevron" aria-hidden="true">
                  {isOpen ? '▾' : '▸'}
                </span>
                {isOpen ? 'Hide deliverables' : 'Show deliverables'}
              </button>

              <div
                className={`business-priority-deliverables ${isOpen ? 'expanded' : ''}`}
              >
                <ul className="business-priority-deliverables-list day-in-life-list">
                  {(p.deliverables ?? []).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
