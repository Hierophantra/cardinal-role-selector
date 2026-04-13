import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { fetchSubmission, fetchSubmissions, fetchKpiSelections, fetchScorecards } from '../lib/supabase.js';
import { getMondayOf } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, HUB_COPY, KPI_COPY, SCORECARD_COPY } from '../data/content.js';

export default function PartnerHub() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const adminView = new URLSearchParams(location.search).get('admin') === '1';
  const [submission, setSubmission] = useState(null);
  const [kpiSelections, setKpiSelections] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [allSubs, setAllSubs] = useState([]);
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
      fetchScorecards(partner),
      fetchSubmissions().catch(() => []),
    ])
      .then(([sub, sels, cards, subs]) => {
        setSubmission(sub);
        setKpiSelections(sels);
        setScorecards(cards);
        setAllSubs(subs);
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

  // Scorecard state derivation (Phase 3 — D-19)
  const currentMonday = getMondayOf();
  const thisWeekCard = scorecards.find((s) => s.week_of === currentMonday);
  const committedThisWeek = Boolean(thisWeekCard?.committed_at);
  const scorecardAnsweredCount = thisWeekCard
    ? kpiSelections.reduce((n, k) => {
        const r = thisWeekCard.kpi_results?.[k.id]?.result;
        return r === 'yes' || r === 'no' ? n + 1 : n;
      }, 0)
    : 0;
  const scorecardAllComplete = thisWeekCard && kpiSelections.length > 0
    ? kpiSelections.every((k) => {
        const r = thisWeekCard.kpi_results?.[k.id];
        if (!r || (r.result !== 'yes' && r.result !== 'no')) return false;
        // Reflection required only on missed KPIs
        if (r.result === 'no') return r.reflection?.trim().length > 0;
        return true;
      })
    : false;
  const scorecardState = !kpiLocked
    ? 'hidden'
    : scorecardAllComplete
      ? 'complete'
      : committedThisWeek
        ? 'inProgress'
        : 'notCommitted';

  // Precedence: error > !kpiLocked existing branches > scorecard branches (new, when kpiLocked) > fallback
  const statusText = error
    ? copy.errorLoad
    : !kpiLocked
      ? (kpiInProgress && submission
          ? copy.status.roleCompleteKpisInProgress
          : submission
            ? copy.status.roleCompleteNoKpis
            : copy.status.roleNotComplete)
      : scorecardState === 'complete'
        ? copy.status.scorecardComplete
        : scorecardState === 'inProgress'
          ? copy.status.scorecardInProgress(scorecardAnsweredCount)
          : copy.status.scorecardNotCommitted;

  // Comparison is enabled only when both theo and jerry have submitted (D-comparison-gate)
  const theoSubmitted = allSubs.some((s) => s.partner === 'theo');
  const jerrySubmitted = allSubs.some((s) => s.partner === 'jerry');
  const comparisonReady = theoSubmitted && jerrySubmitted;

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          {adminView && (
            <div className="nav-row" style={{ marginBottom: 12 }}>
              <Link to="/admin/hub" className="btn-ghost">
                {'\u2190'} Back to Admin Hub
              </Link>
            </div>
          )}
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
                                <h3>{KPI_COPY.hubCard.title}</h3>
                <p>{KPI_COPY.hubCard.description}</p>
                <span className="hub-card-cta">{KPI_COPY.hubCard.ctaLocked}</span>
              </button>
            ) : (
              <Link to={`/kpi/${partner}`} className="hub-card">
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

            {/* Weekly Scorecard — three states per D-19 (hidden until KPIs locked per D-18) */}
            {kpiLocked && (
              <Link to={`/scorecard/${partner}`} className="hub-card">
                                <h3>{SCORECARD_COPY.hubCard.title}</h3>
                <p>{SCORECARD_COPY.hubCard.description}</p>
                <span className="hub-card-cta">
                  {scorecardState === 'complete'
                    ? SCORECARD_COPY.hubCard.ctaComplete
                    : scorecardState === 'inProgress'
                      ? SCORECARD_COPY.hubCard.ctaInProgress(scorecardAnsweredCount)
                      : SCORECARD_COPY.hubCard.ctaNotCommitted}
                </span>
              </Link>
            )}

            {/* Meeting Summary — visible only when KPIs are locked (D-18) */}
            {kpiLocked && (
              <Link to={`/meeting-summary/${partner}`} className="hub-card">
                                <h3>Meeting Summary</h3>
                <p>Review the latest Friday meeting — notes per stop and how the week scored.</p>
                <span className="hub-card-cta">View latest summary {'\u2192'}</span>
              </Link>
            )}

            {/* Side-by-Side Comparison — enabled only when both partners have submitted */}
            {comparisonReady ? (
              <Link
                to="/comparison"
                state={{ from: `/hub/${partner}${adminView ? '?admin=1' : ''}` }}
                className="hub-card"
              >
                                <h3>{copy.cards.comparison.title}</h3>
                <p>{copy.cards.comparison.description}</p>
              </Link>
            ) : (
              <div className="hub-card hub-card--disabled">
                                <h3>{copy.cards.comparison.title}</h3>
                <p>{copy.cards.comparison.description}</p>
                <span className="hub-card-disabled-label">
                  Unlocks when both partners submit
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
