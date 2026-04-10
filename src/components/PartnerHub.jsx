import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSubmission } from '../lib/supabase.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, HUB_COPY } from '../data/content.js';

export default function PartnerHub() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    fetchSubmission(partner)
      .then(setSubmission)
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [partner]);

  if (loading) return null;

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const copy = HUB_COPY.partner;

  // Determine status line text (per D-04)
  const statusText = error
    ? copy.errorLoad
    : submission
      ? copy.status.roleCompleteNoKpis
      : copy.status.roleNotComplete;

  // Role Definition card CTA and route
  const roleCardCta = submission
    ? copy.cards.roleDefinition.ctaSubmitted
    : copy.cards.roleDefinition.ctaNotSubmitted;

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <div className="eyebrow">{copy.eyebrow}</div>
          <div className="partner-greeting">
            <div className="screen-header">
              <h2>{copy.greeting(partnerName)}</h2>
            </div>
            <p className="status-line">{statusText}</p>
          </div>

          <div className="hub-grid">
            {/* Role Definition — always shown (per D-01: only functional options) */}
            <Link to={`/q/${partner}`} className="hub-card">
              <div className="hub-card-icon">{'\u{1F4CB}'}</div>
              <h3>{copy.cards.roleDefinition.title}</h3>
              <p>{copy.cards.roleDefinition.description}</p>
            </Link>

            {/* KPI Selection and Scorecard cards hidden in Phase 1 per D-01 */}
            {/* They will be conditionally rendered when their respective phases ship */}
          </div>
        </div>
      </div>
    </div>
  );
}
