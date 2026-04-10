import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSubmission, fetchKpiSelections } from '../lib/supabase.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, HUB_COPY, KPI_COPY } from '../data/content.js';

export default function PartnerHub() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [kpiSelections, setKpiSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    Promise.all([
      fetchSubmission(partner),
      fetchKpiSelections(partner),
    ])
      .then(([sub, sels]) => {
        setSubmission(sub);
        setKpiSelections(sels);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [partner]);

  if (loading) return null;

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const copy = HUB_COPY.partner;

  const kpiLocked = kpiSelections.length > 0 && Boolean(kpiSelections[0]?.locked_until);
  const kpiInProgress = kpiSelections.length > 0 && !kpiLocked;
  const lockedUntilDate = kpiLocked
    ? new Date(kpiSelections[0].locked_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  // Status line priority: error > locked > in-progress > submitted-no-kpis > not-submitted
  const statusText = error
    ? copy.errorLoad
    : kpiLocked
      ? copy.status.roleCompleteKpisLocked(lockedUntilDate)
      : kpiInProgress && submission
        ? copy.status.roleCompleteKpisInProgress
        : submission
          ? copy.status.roleCompleteNoKpis
          : copy.status.roleNotComplete;

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

            {/* KPI Selection — three states per D-11 (always visible per D-12) */}
            {kpiLocked ? (
              <button
                type="button"
                className="hub-card"
                onClick={() => navigate(`/kpi-view/${partner}`)}
              >
                <div className="hub-card-icon">{'\u{1F512}'}</div>
                <h3>{KPI_COPY.hubCard.title}</h3>
                <p>{KPI_COPY.hubCard.description}</p>
                <span className="hub-card-cta">{KPI_COPY.hubCard.ctaLocked}</span>
              </button>
            ) : (
              <Link to={`/kpi/${partner}`} className="hub-card">
                <div className="hub-card-icon">{'\u{1F3AF}'}</div>
                <h3>{KPI_COPY.hubCard.title}</h3>
                <p>{KPI_COPY.hubCard.description}</p>
                {kpiInProgress && (
                  <span className="hub-card-in-progress">{KPI_COPY.hubCard.inProgressLabel}</span>
                )}
                <span className="hub-card-cta">
                  {kpiInProgress ? KPI_COPY.hubCard.ctaInProgress : KPI_COPY.hubCard.ctaNotStarted}
                </span>
              </Link>
            )}

            {/* Scorecard card hidden until Phase 3 ships */}
          </div>
        </div>
      </div>
    </div>
  );
}
