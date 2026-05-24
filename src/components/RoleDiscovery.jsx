// src/components/RoleDiscovery.jsx — Tier 2 (post-Phase-19 follow-up)
//
// Secondary "Re-anchor" surface. Pulls the role-identity content that used to
// live on the main hub into a dedicated card the partner navigates to
// deliberately. Per Gemini's "banner blindness to constants" insight: static
// content on a daily-visit hub becomes wallpaper within days — moving it
// behind a deliberate navigation step actually increases its impact because
// visiting becomes a conscious act of re-alignment.
//
// Layout: title + subtitle framing → role title → self-quote → full narrative
// (no Read more truncation here — this IS the reference surface) → focus
// areas (expanded) → day-in-life bullets (expanded) → Role Questionnaire
// Submissions link.
//
// Test profile: ROLE_IDENTITY['test'] doesn't exist. Exposes a toggle so
// the test profile can preview EITHER Theo's or Jerry's role identity from
// one place — matches how the test scorecard surfaces all non-conditional
// KPI templates for QA review.

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSubmissions } from '../lib/supabase.js';
import { VALID_PARTNERS, PARTNER_DISPLAY } from '../data/content.js';
import { ROLE_IDENTITY } from '../data/roles.js';

export default function RoleDiscovery() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const [allSubs, setAllSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  // Test profile only: which partner's role to preview.
  const [testRoleScope, setTestRoleScope] = useState('theo');

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    fetchSubmissions()
      .then((subs) => setAllSubs(subs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [partner, navigate]);

  // For test partner: resolve the role identity to view based on the toggle.
  // For real partners: their own role identity.
  const isTestProfile = partner === 'test';
  const effectiveRoleKey = isTestProfile ? testRoleScope : partner;
  const role = ROLE_IDENTITY[effectiveRoleKey];

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const roleSubjectName = PARTNER_DISPLAY[effectiveRoleKey] ?? effectiveRoleKey;
  const comparisonReady = (allSubs?.length ?? 0) >= 2;
  const adminView = (() => {
    try { return sessionStorage.getItem('cardinal-role') === 'admin'; } catch { return false; }
  })();
  const backHref = `/hub/${partner}${adminView ? '?admin=1' : ''}`;

  if (!role) return null;

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in role-discovery">
          <div className="nav-row" style={{ marginBottom: 16 }}>
            <Link to={backHref} className="btn-ghost">{'←'} Back to Hub</Link>
          </div>

          <div className="eyebrow">Role Discovery</div>
          <div className="screen-header">
            <h2>
              {isTestProfile
                ? `${roleSubjectName.split(' ')[0]}'s Role (test profile)`
                : `${partnerName.split(' ')[0]}'s Role`}
            </h2>
            <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
              {isTestProfile
                ? `Previewing ${roleSubjectName.split(' ')[0]}'s role identity. Test profile — switch between partners using the toggle below.`
                : 'Re-anchor: who you are at Cardinal and why this work matters.'}
            </p>
          </div>

          {/* Test profile only: scope toggle. */}
          {isTestProfile && (
            <div className="role-discovery-test-toggle">
              <span className="role-discovery-test-toggle__label">View as:</span>
              {['theo', 'jerry'].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`role-discovery-test-toggle__btn${testRoleScope === p ? ' active' : ''}`}
                  onClick={() => setTestRoleScope(p)}
                >
                  {PARTNER_DISPLAY[p] ?? p}
                </button>
              ))}
            </div>
          )}

          <section className="role-discovery-card">
            <h3 className="role-title">{role.title}</h3>

            <blockquote className="role-self-quote">
              {role.selfQuote}
            </blockquote>

            <p className="role-narrative role-narrative--full">
              {role.narrative}
            </p>
          </section>

          <section className="role-discovery-card">
            <h3 className="role-discovery-section-heading">What {isTestProfile ? `${roleSubjectName.split(' ')[0]} Focuses` : 'You Focus'} On</h3>
            <div className="focus-area-list">
              {role.focusAreas.map((fa, i) => (
                <div key={i} className="focus-area-row">
                  <strong>{fa.label}</strong>
                  <span className="focus-area-detail"> &mdash; {fa.detail}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="role-discovery-card">
            <h3 className="role-discovery-section-heading">{isTestProfile ? `${roleSubjectName.split(' ')[0]}'s Day Might Involve` : 'Your Day Might Involve'}</h3>
            <ul className="day-in-life-list">
              {role.dayInLifeBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>

          <section className="role-discovery-card role-discovery-card--cta">
            <h3 className="role-discovery-section-heading">Role Questionnaire</h3>
            {loading ? null : comparisonReady ? (
              <>
                <p className="muted" style={{ fontSize: 14 }}>
                  Compare your role definition against your partner's — see where you align and
                  where the boundaries sit.
                </p>
                <Link to="/comparison" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: 12 }}>
                  Open Role Questionnaire Comparison
                </Link>
              </>
            ) : (
              <p className="muted" style={{ fontSize: 14 }}>
                Comparison unlocks once both partners have submitted the role questionnaire.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
