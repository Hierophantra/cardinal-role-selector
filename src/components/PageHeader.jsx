// PageHeader — slim 24-32px header that lives at the top of each route's
// content. Replaces the "hero card" pattern (deliberately dropped per the
// v2 redesign, then preserved as inline greeting per ChatGPT synthesis).
//
// Structure:
//   ┌─ left: eyebrow ──────────────── right: greeting + pills ─┐
//   │ WEEK OF MAY 19 — MAY 25      Mon · Fri    Good morning, Theo │
//   └──────────────────────────────────────────────────────────┘
//
// Used by: PartnerHub, Scorecard, AdminHub, etc. — anywhere a route wants
// a slim contextual header above the main content. NOT required on every
// route — components can choose not to render it.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md §4 (Hub redesign, slim page header)

import { useElementConfig } from '../lib/elementConfig.js';
import EditableElement from './admin/EditableElement.jsx';

export default function PageHeader({ eyebrow, pills, greeting, className = '' }) {
  const config = useElementConfig('page-header');
  // Don't render the empty wrapper if nothing was passed.
  if (!eyebrow && !pills && !greeting) return null;
  if (config.visible === false) return null;
  const heightClass = `page-header--height-${config.height || 'standard'}`;
  return (
    <EditableElement id="page-header" className={`page-header ${heightClass} ${className}`}>
      <div className="page-header__left">
        {eyebrow && <span className="page-header__eyebrow">{eyebrow}</span>}
        {pills && <span className="page-header__pills">{pills}</span>}
      </div>
      {greeting && <div className="page-header__greeting">{greeting}</div>}
    </EditableElement>
  );
}
