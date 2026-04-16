// src/components/RoleIdentitySection.jsx — Phase 15 Wave 2
// Pure presentation component. Parent (PartnerHub, Wave 3) owns all expand/collapse state.
// See .planning/phases/15-role-identity-hub-redesign/15-UI-SPEC.md for layout + copy.

import React from 'react';

export default function RoleIdentitySection({
  role,
  narrativeExpanded,
  onToggleNarrative,
  focusAreasOpen,
  onToggleFocusAreas,
  dayInLifeOpen,
  onToggleDayInLife,
}) {
  if (!role) return null;

  return (
    <section className="role-identity-section">
      {/* Role title — Cardinal red, 28px, weight 700 (UI-SPEC Display) */}
      <h2 className="role-title">{role.title}</h2>

      {/* Self-quote — italic with red left-border accent (ROLE-02) */}
      <blockquote className="role-self-quote">
        {role.selfQuote}
      </blockquote>

      {/* Narrative with Read more toggle (D-02, ROLE-02) */}
      <p className="role-narrative">
        {narrativeExpanded ? role.narrative : role.narrativePreview}{' '}
        <button
          type="button"
          className="role-read-more-btn"
          onClick={onToggleNarrative}
        >
          {narrativeExpanded ? 'Show less' : 'Read more'}
        </button>
      </p>

      {/* What You Focus On — expanded by default (D-09, ROLE-03) */}
      <div className="hub-section">
        <button
          type="button"
          className="hub-section-toggle"
          onClick={onToggleFocusAreas}
          aria-expanded={focusAreasOpen}
        >
          <h3>What You Focus On</h3>
          <span className="hub-section-chevron" aria-hidden="true">
            {focusAreasOpen ? '\u25BE' : '\u25B8'}
          </span>
        </button>
        <div className={`hub-collapsible ${focusAreasOpen ? 'expanded' : ''}`}>
          <div className="focus-area-list">
            {role.focusAreas.map((fa, i) => (
              <div key={i} className="focus-area-row">
                <strong>{fa.label}</strong>
                <span className="focus-area-detail"> &mdash; {fa.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Your Day Might Involve — collapsed by default (D-09, ROLE-04) */}
      <div className="hub-section">
        <button
          type="button"
          className="hub-section-toggle"
          onClick={onToggleDayInLife}
          aria-expanded={dayInLifeOpen}
        >
          <h3>Your Day Might Involve</h3>
          <span className="hub-section-chevron" aria-hidden="true">
            {dayInLifeOpen ? '\u25BE' : '\u25B8'}
          </span>
        </button>
        <div className={`hub-collapsible ${dayInLifeOpen ? 'expanded' : ''}`}>
          <ul className="day-in-life-list">
            {role.dayInLifeBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
