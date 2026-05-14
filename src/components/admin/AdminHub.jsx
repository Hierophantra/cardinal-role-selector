import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchWeeklyKpiSelection, fetchScorecard } from '../../lib/supabase.js';
import { getMondayOf } from '../../lib/week.js';
import { HUB_COPY } from '../../data/content.js';

export default function AdminHub() {
  const navigate = useNavigate();
  const [theoWeekly, setTheoWeekly] = useState(null);
  const [jerryWeekly, setJerryWeekly] = useState(null);
  const [theoDraft, setTheoDraft] = useState(null);
  const [jerryDraft, setJerryDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const currentMonday = getMondayOf();
    Promise.all([
      fetchWeeklyKpiSelection('theo', currentMonday).catch(() => null),
      fetchWeeklyKpiSelection('jerry', currentMonday).catch(() => null),
      fetchScorecard('theo', currentMonday).catch(() => null),
      fetchScorecard('jerry', currentMonday).catch(() => null),
    ])
      .then(([theoRow, jerryRow, theoSc, jerrySc]) => {
        setTheoWeekly(theoRow);
        setJerryWeekly(jerryRow);
        setTheoDraft(theoSc);
        setJerryDraft(jerrySc);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Phase 19 follow-up: per-partner draft progress signal. Counts how many
  // KPI rows have been touched this week (non-null result OR any structured
  // data) and surfaces the most recent edit time. Helps Trace spot partners
  // who're saving everything Friday morning vs engaging through the week.
  function summarizeDraft(scorecard) {
    if (!scorecard || !scorecard.kpi_results) {
      return { touched: 0, total: 0, lastEdit: null, submitted: false };
    }
    const entries = Object.values(scorecard.kpi_results || {});
    const touched = entries.filter((e) => {
      if (!e) return false;
      if (e.result === 'yes' || e.result === 'no' || e.result === 'pending') return true;
      if (typeof e.reflection === 'string' && e.reflection.trim().length > 0) return true;
      if (e.structured_data && Object.keys(e.structured_data).length > 0) return true;
      return false;
    }).length;
    const lastEdit = entries
      .map((e) => e?.updated_at)
      .filter(Boolean)
      .sort()
      .pop() || null;
    return {
      touched,
      total: entries.length,
      lastEdit,
      submitted: !!scorecard.submitted_at,
    };
  }

  function formatRelative(iso) {
    if (!iso) return 'no activity yet';
    const dt = new Date(iso);
    const ms = Date.now() - dt.getTime();
    const hours = Math.floor(ms / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const theoSummary = summarizeDraft(theoDraft);
  const jerrySummary = summarizeDraft(jerryDraft);

  if (loading) return null;

  const copy = HUB_COPY.admin;

  // Build status lines
  const statusLines = [];
  if (error) {
    statusLines.push({ text: copy.errorLoad, style: 'muted' });
  } else {
    // Pre-launch fix (2026-04-29): "locked" now means the partner has picked
    // their OPTIONAL WEEKLY KPI for the CURRENT week. The previous check
    // (kpi_selections row count) fired immediately because mandatory KPIs are
    // auto-seeded into kpi_selections, so the hub always said "locked" the
    // moment a partner first opened the app.
    //
    // Correct semantics: a row exists in weekly_kpi_selections for
    // (partner, currentMonday) AND kpi_template_id IS NOT NULL — the latter
    // filters out counter-only seed rows that incrementKpiCounter creates
    // before the partner picks (CR-02 / WR-09).
    const theoLocked = Boolean(theoWeekly?.kpi_template_id);
    const jerryLocked = Boolean(jerryWeekly?.kpi_template_id);

    if (theoLocked && jerryLocked) {
      statusLines.push({ text: copy.status.bothWeeklyKpisLocked, style: 'gold' });
    } else if (theoLocked) {
      statusLines.push({ text: copy.status.oneWeeklyKpiLocked('Theo', 'Jerry'), style: 'muted' });
    } else if (jerryLocked) {
      statusLines.push({ text: copy.status.oneWeeklyKpiLocked('Jerry', 'Theo'), style: 'muted' });
    } else {
      statusLines.push({ text: copy.status.noWeeklyKpisLocked, style: 'muted' });
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

          {/* Phase 19 follow-up: draft progress indicator. Shows per-partner
              touch count + last activity so Trace can spot Friday-morning
              cramming versus genuine through-the-week engagement. */}
          <div className="draft-progress">
            <div className="draft-progress-heading">Draft progress (this week)</div>
            <div className="draft-progress-row">
              <span className="draft-progress-label">Theo</span>
              <span className="draft-progress-stat">
                {theoSummary.touched}/{theoSummary.total || '—'} KPIs touched
              </span>
              <span className={`draft-progress-time${theoSummary.submitted ? ' draft-progress-time--submitted' : ''}`}>
                {theoSummary.submitted ? 'Submitted' : `Last edit: ${formatRelative(theoSummary.lastEdit)}`}
              </span>
            </div>
            <div className="draft-progress-row">
              <span className="draft-progress-label">Jerry</span>
              <span className="draft-progress-stat">
                {jerrySummary.touched}/{jerrySummary.total || '—'} KPIs touched
              </span>
              <span className={`draft-progress-time${jerrySummary.submitted ? ' draft-progress-time--submitted' : ''}`}>
                {jerrySummary.submitted ? 'Submitted' : `Last edit: ${formatRelative(jerrySummary.lastEdit)}`}
              </span>
            </div>
          </div>

          {/* Meeting Mode Hero Card (per D-02 / Pitfall 6) — lives OUTSIDE .hub-grid so it renders full-width */}
          <Link to="/admin/meeting" className="hub-card hub-card--hero" style={{ textDecoration: 'none' }}>
                        <h3>{copy.cards.meetingMode.title}</h3>
            <p>{copy.cards.meetingMode.description}</p>
          </Link>

          {/* Partners Section (per D-05) */}
          <div className="hub-section">
            <div className="eyebrow">{copy.sections.partners}</div>
            <div className="hub-grid">
              <Link to="/admin" className="hub-card">
                                <h3>{copy.cards.dashboard.title}</h3>
                <p>{copy.cards.dashboard.description}</p>
              </Link>
              <Link to="/admin/partners" className="hub-card">
                                <h3>{copy.cards.partnerProfiles.title}</h3>
                <p>{copy.cards.partnerProfiles.description}</p>
              </Link>
              <Link to="/admin/comparison" className="hub-card">
                                <h3>{copy.cards.comparison.title}</h3>
                <p>{copy.cards.comparison.description}</p>
              </Link>
              <Link to="/admin/test" className="hub-card">
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
                                <h3>{copy.cards.kpiManagement.title}</h3>
                <p>{copy.cards.kpiManagement.description}</p>
              </Link>
              <Link to="/admin/scorecards" className="hub-card">
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
