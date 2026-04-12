import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchSubmission,
  fetchKpiSelections,
  fetchGrowthPriorities,
  fetchScorecards,
  resetTestSubmission,
  resetTestKpis,
  resetTestScorecards,
  reopenScorecardWeek,
} from '../../lib/supabase.js';
import { isWeekClosed, formatWeekRange } from '../../lib/week.js';

const ARM_TIMEOUT_MS = 3000;

function isAdminClosed(row) {
  if (!row) return false;
  if (row.admin_reopened_at) return false;
  return isWeekClosed(row.week_of);
}

function getLabelForEntry(kpiId, entry, lockedKpis) {
  if (entry && entry.label) return entry.label;
  const match = lockedKpis.find((k) => k.id === kpiId);
  return match?.label_snapshot ?? '(unknown KPI)';
}

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
  const [pendingReopen, setPendingReopen] = useState({});
  const [reopeningKey, setReopeningKey] = useState(null);
  const disarmTimerRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    };
  }, []);

  function armReopen(weekOf) {
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    setPendingReopen({ [weekOf]: true });
    disarmTimerRef.current = setTimeout(() => setPendingReopen({}), ARM_TIMEOUT_MS);
  }

  async function confirmReopen(weekOf) {
    setReopeningKey(weekOf);
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    try {
      await reopenScorecardWeek('test', weekOf);
      await loadState();
      setPendingReopen({});
    } catch (err) {
      console.error(err);
      setStatusMsg('Reopen failed. Check console.');
    } finally {
      setReopeningKey(null);
    }
  }

  function handleReopenClick(weekOf) {
    if (pendingReopen[weekOf]) {
      confirmReopen(weekOf);
    } else {
      armReopen(weekOf);
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
                  <Link
                    to="/admin/test/meeting-summary-mock"
                    className="btn-ghost"
                    style={{ textDecoration: 'none' }}
                  >
                    View Mock Meeting Summary
                  </Link>
                </div>
              </div>

              {/* Scorecard Oversight */}
              <div className="summary-section">
                <h4>Scorecard Oversight</h4>
                {scorecards.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>No scorecards yet. Submit a week from the test partner hub first.</p>
                ) : (
                  <div className="scorecard-oversight-grid">
                    {scorecards.map((row) => {
                      const closed = isAdminClosed(row);
                      const reopened = Boolean(row.admin_reopened_at);
                      const results = row.kpi_results || {};
                      const entries = Object.entries(results);
                      const isArmed = Boolean(pendingReopen[row.week_of]);
                      const isReopening = reopeningKey === row.week_of;

                      return (
                        <div key={row.week_of} className="scorecard-oversight-row">
                          <div className="scorecard-oversight-header" style={{ gridTemplateColumns: '200px 1fr 200px' }}>
                            <div className="scorecard-oversight-cell week">
                              {formatWeekRange(row.week_of)}
                              {reopened && <span className="scorecard-reopened-badge"> Reopened</span>}
                            </div>
                            <div className="scorecard-oversight-cell">
                              {closed ? 'Closed' : 'Active'}
                            </div>
                            <div className="scorecard-oversight-cell" style={{ textAlign: 'right' }}>
                              {closed && !reopened ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => handleReopenClick(row.week_of)}
                                  disabled={isReopening}
                                  style={isArmed ? { borderColor: 'var(--red)', color: 'var(--text)', background: 'rgba(196,30,58,0.14)' } : undefined}
                                >
                                  {isArmed ? 'Confirm Reopen' : 'Reopen'}
                                </button>
                              ) : (
                                <span className="muted" style={{ fontSize: 13 }}>Editable</span>
                              )}
                            </div>
                          </div>

                          {isArmed && (
                            <div className="muted" style={{ padding: '0 16px 12px', color: 'var(--red)', fontSize: 13 }}>
                              This will reopen the week for the test account. Click Confirm to proceed.
                            </div>
                          )}

                          {/* KPI results */}
                          <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                            {entries.length === 0 ? (
                              <p className="muted" style={{ fontSize: 13 }}>No KPI results recorded.</p>
                            ) : (
                              entries.map(([kpiId, entry]) => {
                                const label = getLabelForEntry(kpiId, entry, kpis);
                                const r = entry?.result;
                                const dot = r === 'yes' ? '✓' : r === 'no' ? '✗' : '—';
                                const dotColor = r === 'yes' ? 'var(--success)' : r === 'no' ? 'var(--miss)' : 'var(--muted-2)';
                                return (
                                  <div key={kpiId} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ color: dotColor, fontWeight: 700, minWidth: 16 }}>{dot}</span>
                                      <span style={{ fontWeight: 600 }}>{label}</span>
                                    </div>
                                    {entry?.reflection && (
                                      <div className="muted" style={{ marginTop: 4, fontSize: 13, paddingLeft: 24 }}>{entry.reflection}</div>
                                    )}
                                  </div>
                                );
                              })
                            )}

                            {/* Weekly reflection fields */}
                            {(row.weekly_win || row.weekly_learning || row.week_rating || row.tasks_completed || row.tasks_carried_over) && (
                              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                <div className="eyebrow" style={{ fontSize: 11, marginBottom: 8 }}>Weekly Reflection</div>
                                {row.tasks_completed && (
                                  <div style={{ marginBottom: 6 }}>
                                    <span className="muted" style={{ fontSize: 12 }}>Tasks Completed: </span>
                                    <span style={{ fontSize: 13 }}>{row.tasks_completed}</span>
                                  </div>
                                )}
                                {row.tasks_carried_over && (
                                  <div style={{ marginBottom: 6 }}>
                                    <span className="muted" style={{ fontSize: 12 }}>Carried Over: </span>
                                    <span style={{ fontSize: 13 }}>{row.tasks_carried_over}</span>
                                  </div>
                                )}
                                {row.weekly_win && (
                                  <div style={{ marginBottom: 6 }}>
                                    <span className="muted" style={{ fontSize: 12 }}>Weekly Win: </span>
                                    <span style={{ fontSize: 13 }}>{row.weekly_win}</span>
                                  </div>
                                )}
                                {row.weekly_learning && (
                                  <div style={{ marginBottom: 6 }}>
                                    <span className="muted" style={{ fontSize: 12 }}>Learning: </span>
                                    <span style={{ fontSize: 13 }}>{row.weekly_learning}</span>
                                  </div>
                                )}
                                {row.week_rating && (
                                  <div>
                                    <span className="muted" style={{ fontSize: 12 }}>Week Rating: </span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{row.week_rating} / 5</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
