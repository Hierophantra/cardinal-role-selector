import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchKpiSelections, fetchGrowthPriorities } from '../lib/supabase.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, KPI_COPY } from '../data/content.js';

export default function KpiSelectionView() {
  const { partner } = useParams();
  const navigate = useNavigate();

  const [selections, setSelections] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    // Guard 1: invalid partner slug
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    // Guard 2: test partner has no accountability data (DB CHECK, Pitfall 3)
    if (partner === 'test') {
      navigate(`/hub/${partner}`, { replace: true });
      return;
    }

    Promise.all([fetchKpiSelections(partner), fetchGrowthPriorities(partner)])
      .then(([sels, prios]) => {
        // D-13: if no selections OR not locked, bounce back to selection flow
        if (sels.length === 0 || !sels[0].locked_until) {
          navigate(`/kpi/${partner}`, { replace: true });
          return;
        }
        setSelections(sels);
        setPriorities(prios);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [partner]);

  if (loading) return null;

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="screen fade-in">
            <div className="eyebrow">{KPI_COPY.readOnly.eyebrow}</div>
            <div className="screen-header">
              <h2>{KPI_COPY.readOnly.heading}</h2>
            </div>
            <p className="error">{KPI_COPY.selection.errorLoad}</p>
            <div className="nav-row">
              <Link to={`/hub/${partner}`} className="btn-ghost">
                {'\u2190'} Back to Hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const lockedUntilDate = selections[0]?.locked_until
    ? new Date(selections[0].locked_until).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const personalPriority = priorities.find((p) => p.type === 'personal');
  const businessPriorities = priorities.filter((p) => p.type === 'business');

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <div className="eyebrow">{KPI_COPY.readOnly.eyebrow}</div>
          <div className="screen-header">
            <h2>{KPI_COPY.readOnly.heading}</h2>
          </div>
          <span className="kpi-lock-badge">
            {KPI_COPY.readOnly.lockedUntilBadge(lockedUntilDate)}
          </span>

          <div className="summary-section">
            <h4>{KPI_COPY.readOnly.kpiSectionLabel}</h4>
            <div className="kpi-list">
              {selections.map((sel) => (
                <div key={sel.id} className="kpi-card">
                  <span className="kpi-category-tag">{sel.category_snapshot}</span>
                  <span className="kpi-card-label">{sel.label_snapshot}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section">
            <h4>{KPI_COPY.readOnly.growthSectionLabel}</h4>
            {personalPriority && (
              <div className="growth-priority-group">
                <span className="growth-priority-group-label">
                  {KPI_COPY.selection.growth.personalLabel}
                </span>
                <p>{personalPriority.description}</p>
              </div>
            )}
            {businessPriorities[0] && (
              <div className="growth-priority-group">
                <span className="growth-priority-group-label">
                  {KPI_COPY.selection.growth.businessLabel1}
                </span>
                <p>{businessPriorities[0].description}</p>
              </div>
            )}
            {businessPriorities[1] && (
              <div className="growth-priority-group">
                <span className="growth-priority-group-label">
                  {KPI_COPY.selection.growth.businessLabel2}
                </span>
                <p>{businessPriorities[1].description}</p>
              </div>
            )}
          </div>

          <div className="nav-row">
            <Link to={`/hub/${partner}`} className="btn-ghost">
              {'\u2190'} Back to Hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
