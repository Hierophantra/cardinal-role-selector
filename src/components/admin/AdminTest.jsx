import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchSubmission,
  fetchKpiSelections,
  fetchGrowthPriorities,
  fetchScorecards,
  resetTestSubmission,
  resetTestKpis,
  resetTestScorecards,
} from '../../lib/supabase.js';

export default function AdminTest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [pendingReset, setPendingReset] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sub, sels, gps, cards] = await Promise.all([
        fetchSubmission('test'),
        fetchKpiSelections('test'),
        fetchGrowthPriorities('test'),
        fetchScorecards('test'),
      ]);
      setSubmission(sub);
      setKpis(sels);
      setGrowth(gps);
      setScorecards(cards);
    } catch (err) {
      console.error(err);
      setError('Failed to load test account state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function performReset(kind) {
    setResetting(true);
    setStatusMsg('');
    try {
      if (kind === 'submission' || kind === 'all') {
        await resetTestSubmission();
      }
      if (kind === 'kpis' || kind === 'all') {
        await resetTestKpis();
      }
      if (kind === 'scorecards' || kind === 'all') {
        await resetTestScorecards();
      }
      setStatusMsg(`Reset complete: ${kind}`);
      await loadState();
    } catch (err) {
      console.error(err);
      setStatusMsg('Reset failed. Check console.');
    } finally {
      setResetting(false);
      setPendingReset(null);
    }
  }

  function handleResetClick(kind) {
    if (pendingReset === kind) {
      performReset(kind);
    } else {
      setPendingReset(kind);
      setStatusMsg('');
    }
  }

  const kpiLocked = kpis.length > 0 && Boolean(kpis[0]?.locked_until);
  const committedScorecards = scorecards.filter((s) => s.committed_at).length;
  const latestWeek = scorecards.length > 0 ? scorecards[0].week_of : null;

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <img src="/logo.png" alt="Cardinal" />
          <span>Role Definition Tool</span>
        </div>
        <div className="partner-tag">Admin · Test</div>
      </div>
      <div className="container">
        <div className="screen fade-in">
          <div style={{ marginBottom: 16 }}>
            <Link to="/admin/hub" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              {'\u2190'} Back to Admin Hub
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">Test Account</div>
            <h2>Test Account Management</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              View current state and reset individual pieces of the test account. Resets only
              affect <code>partner='test'</code> — Theo and Jerry are never touched.
            </p>
          </div>

          {loading ? (
            <p className="muted">Loading test account state...</p>
          ) : error ? (
            <p className="muted" style={{ color: 'var(--miss)' }}>{error}</p>
          ) : (
            <>
              <div className="summary-section">
                <h4>Current State</h4>
                <div className="kv">
                  <div className="k">Role Definition</div>
                  <div>
                    {submission
                      ? `Submitted ${new Date(submission.submitted_at).toLocaleString()}`
                      : 'Not submitted'}
                  </div>
                  <div className="k">KPI Selections</div>
                  <div>
                    {kpis.length === 0
                      ? 'None'
                      : `${kpis.length} selected${kpiLocked ? ' (locked)' : ' (unlocked)'}`}
                  </div>
                  <div className="k">Growth Priorities</div>
                  <div>{growth.length === 0 ? 'None' : `${growth.length} set`}</div>
                  <div className="k">Scorecards</div>
                  <div>
                    {scorecards.length === 0
                      ? 'None'
                      : `${scorecards.length} total · ${committedScorecards} committed${latestWeek ? ` · latest week ${latestWeek}` : ''}`}
                  </div>
                </div>
              </div>

              <div className="summary-section">
                <h4>Quick Links</h4>
                <div className="nav-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <Link to="/hub/test" className="btn-ghost" style={{ textDecoration: 'none' }}>
                    Open Test Partner Hub
                  </Link>
                  <Link to="/admin/profile/test" className="btn-ghost" style={{ textDecoration: 'none' }}>
                    View Test Profile
                  </Link>
                  <Link
                    to="/admin/test/meeting-mock"
                    className="btn-ghost"
                    style={{ textDecoration: 'none' }}
                  >
                    Launch Mock Meeting Session
                  </Link>
                </div>
              </div>

              <div className="summary-section">
                <h4>Reset Controls</h4>
                <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                  Click once to arm, click again to confirm. Each button only deletes rows where
                  <code> partner='test'</code>.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ResetButton
                    label="Reset Role Definition"
                    armedLabel="Click again to delete role submission"
                    kind="submission"
                    pending={pendingReset}
                    resetting={resetting}
                    onClick={handleResetClick}
                  />
                  <ResetButton
                    label="Reset KPIs & Growth Priorities"
                    armedLabel="Click again to delete KPIs and growth priorities"
                    kind="kpis"
                    pending={pendingReset}
                    resetting={resetting}
                    onClick={handleResetClick}
                  />
                  <ResetButton
                    label="Reset Scorecards"
                    armedLabel="Click again to delete all scorecards"
                    kind="scorecards"
                    pending={pendingReset}
                    resetting={resetting}
                    onClick={handleResetClick}
                  />
                  <ResetButton
                    label="Reset Everything"
                    armedLabel="Click again to delete ALL test account data"
                    kind="all"
                    pending={pendingReset}
                    resetting={resetting}
                    onClick={handleResetClick}
                    danger
                  />
                </div>
                {statusMsg && (
                  <p className="muted" style={{ marginTop: 12, color: 'var(--success)' }}>
                    {statusMsg}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetButton({ label, armedLabel, kind, pending, resetting, onClick, danger }) {
  const isArmed = pending === kind;
  const display = isArmed ? armedLabel : label;
  const style = {
    textAlign: 'left',
    justifyContent: 'flex-start',
  };
  if (isArmed) {
    style.borderColor = 'var(--miss)';
    style.color = 'var(--miss)';
  } else if (danger) {
    style.borderColor = 'var(--border)';
  }
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={style}
      onClick={() => onClick(kind)}
      disabled={resetting}
    >
      {display}
    </button>
  );
}
