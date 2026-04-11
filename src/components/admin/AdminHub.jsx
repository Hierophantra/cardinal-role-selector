import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchSubmissions, fetchKpiSelections } from '../../lib/supabase.js';
import { PARTNER_DISPLAY, HUB_COPY } from '../../data/content.js';

export default function AdminHub() {
  const navigate = useNavigate();
  const [subs, setSubs] = useState([]);
  const [theoKpis, setTheoKpis] = useState([]);
  const [jerryKpis, setJerryKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchSubmissions().catch(() => []),
      fetchKpiSelections('theo').catch(() => []),
      fetchKpiSelections('jerry').catch(() => []),
    ])
      .then(([subsData, theoKpisData, jerryKpisData]) => {
        setSubs(subsData);
        setTheoKpis(theoKpisData);
        setJerryKpis(jerryKpisData);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const copy = HUB_COPY.admin;

  // Build status lines
  const statusLines = [];
  if (error) {
    statusLines.push({ text: copy.errorLoad, style: 'muted' });
  } else {
    const theoSub = subs.find((s) => s.partner === 'theo');
    const jerrySub = subs.find((s) => s.partner === 'jerry');

    // Submission status
    if (theoSub && jerrySub) {
      statusLines.push({ text: copy.status.bothSubmitted, style: 'success' });
    } else if (theoSub) {
      statusLines.push({ text: copy.status.oneSubmitted('Theo', 'Jerry'), style: 'muted' });
    } else if (jerrySub) {
      statusLines.push({ text: copy.status.oneSubmitted('Jerry', 'Theo'), style: 'muted' });
    } else {
      statusLines.push({ text: copy.status.noneSubmitted, style: 'muted' });
    }

    // KPI lock status
    const theoLocked = theoKpis.some((k) => k.locked_until && new Date(k.locked_until) > new Date());
    const jerryLocked = jerryKpis.some((k) => k.locked_until && new Date(k.locked_until) > new Date());

    if (theoLocked && jerryLocked) {
      statusLines.push({ text: copy.status.bothKpisLocked, style: 'gold' });
    } else if (theoLocked) {
      statusLines.push({ text: copy.status.oneKpiLocked('Theo'), style: 'gold' });
    } else if (jerryLocked) {
      statusLines.push({ text: copy.status.oneKpiLocked('Jerry'), style: 'gold' });
    } else {
      statusLines.push({ text: copy.status.noKpisLocked, style: 'muted' });
    }
  }

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <div className="eyebrow">{copy.eyebrow}</div>
          <div className="screen-header">
            <h2>{copy.greeting}</h2>
          </div>

          {/* Status Summary (per D-06) */}
          <div className="status-summary">
            <h4>{copy.statusHeading}</h4>
            {statusLines.map((line, i) => (
              <div key={i} className={`status-item status-item--${line.style}`}>
                {line.text}
              </div>
            ))}
          </div>

          {/* Meeting Mode Hero Card (per D-02 / Pitfall 6) — lives OUTSIDE .hub-grid so it renders full-width */}
          <Link to="/admin/meeting" className="hub-card hub-card--hero" style={{ textDecoration: 'none' }}>
            <div className="hub-card-icon">{'\u{1F91D}'}</div>
            <h3>{copy.cards.meetingMode.title}</h3>
            <p>{copy.cards.meetingMode.description}</p>
          </Link>

          {/* Partners Section (per D-05) */}
          <div className="hub-section">
            <div className="eyebrow">{copy.sections.partners}</div>
            <div className="hub-grid">
              <Link to="/admin" className="hub-card">
                <div className="hub-card-icon">{'\u{1F4CA}'}</div>
                <h3>{copy.cards.dashboard.title}</h3>
                <p>{copy.cards.dashboard.description}</p>
              </Link>
              <Link to="/admin/partners" className="hub-card">
                <div className="hub-card-icon">{'\u{1F464}'}</div>
                <h3>{copy.cards.partnerProfiles.title}</h3>
                <p>{copy.cards.partnerProfiles.description}</p>
              </Link>
              <Link to="/admin/comparison" className="hub-card">
                <div className="hub-card-icon">{'\u{1F500}'}</div>
                <h3>{copy.cards.comparison.title}</h3>
                <p>{copy.cards.comparison.description}</p>
              </Link>
              <Link to="/admin/test" className="hub-card">
                <div className="hub-card-icon">{'\u{1F9EA}'}</div>
                <h3>Test Account</h3>
                <p>View current state and reset individual pieces of the test account.</p>
              </Link>
            </div>
          </div>

          {/* Accountability Section (per D-05) — Meeting Mode promoted to hero above; only two cards remain here */}
          <div className="hub-section">
            <div className="eyebrow">{copy.sections.accountability}</div>
            <div className="hub-grid">
              <Link to="/admin/kpi" className="hub-card">
                <div className="hub-card-icon">{'\u{1F3AF}'}</div>
                <h3>{copy.cards.kpiManagement.title}</h3>
                <p>{copy.cards.kpiManagement.description}</p>
              </Link>
              <Link to="/admin/scorecards" className="hub-card">
                <div className="hub-card-icon">{'\u{1F4CB}'}</div>
                <h3>{copy.cards.scorecardOversight.title}</h3>
                <p>{copy.cards.scorecardOversight.description}</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
