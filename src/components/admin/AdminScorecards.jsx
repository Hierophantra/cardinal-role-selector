import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchScorecards,
  fetchKpiSelections,
  reopenScorecardWeek,
} from '../../lib/supabase.js';
import { isWeekClosed, formatWeekRange } from '../../lib/week.js';
import { ADMIN_SCORECARD_COPY, PARTNER_DISPLAY } from '../../data/content.js';

const MANAGED = ['theo', 'jerry'];

// Pattern 7: admin-aware closed check. Uses isWeekClosed for date derivation,
// but overrides when admin_reopened_at is set (D-21). DO NOT modify week.js isWeekClosed
// — that helper is shared with partner Scorecard.jsx (Pitfall 5).
function isAdminClosed(row) {
  if (!row) return false;
  if (row.admin_reopened_at) return false; // admin explicitly reopened
  return isWeekClosed(row.week_of);
}

// Pattern 6: render-time label fallback for kpi_results (D-06).
// New rows (Phase 4+) have entry.label snapshotted at write time.
// Phase-3 rows do not — fall back to kpi_selections.label_snapshot lookup.
function getLabelForEntry(kpiId, entry, lockedKpis) {
  if (entry && entry.label) return entry.label;
  const match = lockedKpis.find((k) => k.id === kpiId);
  return match?.label_snapshot ?? '(unknown KPI)';
}

// Three-second auto-disarm window for two-click reopen (matches existing ResetButton convention)
const ARM_TIMEOUT_MS = 3000;

export default function AdminScorecards() {
  const [searchParams] = useSearchParams();
  const focusPartner = searchParams.get('partner'); // optional ?partner=theo

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    theo: { scorecards: [], kpis: [] },
    jerry: { scorecards: [], kpis: [] },
  });
  // Two-click arm state keyed on `${partner}_${weekOf}`
  const [pendingReopen, setPendingReopen] = useState({});
  const [reopeningKey, setReopeningKey] = useState(null);
  const disarmTimerRef = useRef(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [theoCards, theoKpis, jerryCards, jerryKpis] = await Promise.all([
        fetchScorecards('theo'),
        fetchKpiSelections('theo'),
        fetchScorecards('jerry'),
        fetchKpiSelections('jerry'),
      ]);
      setData({
        theo: { scorecards: theoCards, kpis: theoKpis },
        jerry: { scorecards: jerryCards, kpis: jerryKpis },
      });
    } catch (err) {
      console.error(err);
      setError(ADMIN_SCORECARD_COPY.errors.reopenFail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Clean up any pending auto-disarm timer on unmount
  useEffect(() => {
    return () => {
      if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    };
  }, []);

  function armReopen(partner, weekOf) {
    const key = `${partner}_${weekOf}`;
    // Clear any prior disarm timer
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    setPendingReopen({ [key]: true });
    // Auto-disarm after 3s
    disarmTimerRef.current = setTimeout(() => {
      setPendingReopen({});
    }, ARM_TIMEOUT_MS);
  }

  async function confirmReopen(partner, weekOf) {
    const key = `${partner}_${weekOf}`;
    setReopeningKey(key);
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    try {
      await reopenScorecardWeek(partner, weekOf);
      await loadState();
      setPendingReopen({});
    } catch (err) {
      console.error(err);
      setError(ADMIN_SCORECARD_COPY.errors.reopenFail);
    } finally {
      setReopeningKey(null);
    }
  }

  function handleReopenClick(partner, weekOf) {
    const key = `${partner}_${weekOf}`;
    if (pendingReopen[key]) {
      confirmReopen(partner, weekOf);
    } else {
      armReopen(partner, weekOf);
    }
  }

  // Partner order: if ?partner=jerry, show Jerry first
  const orderedPartners = focusPartner && MANAGED.includes(focusPartner)
    ? [focusPartner, ...MANAGED.filter((p) => p !== focusPartner)]
    : MANAGED;

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <img src="/logo.png" alt="Cardinal" />
          <span>Role Definition Tool</span>
        </div>
        <div className="partner-tag">Admin</div>
      </div>
      <div className="container">
        <div className="screen fade-in">
          <div style={{ marginBottom: 16 }}>
            <Link
              to="/admin/hub"
              className="btn btn-ghost"
              style={{ textDecoration: 'none' }}
            >
              {'\u2190'} Back to Admin Hub
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">{ADMIN_SCORECARD_COPY.eyebrow}</div>
            <h2>{ADMIN_SCORECARD_COPY.heading}</h2>
          </div>

          {error && (
            <p className="muted" style={{ color: 'var(--red)' }}>
              {error}
            </p>
          )}

          {loading ? (
            <p className="muted">Loading...</p>
          ) : (
            orderedPartners.map((p) => {
              const partnerName = PARTNER_DISPLAY[p] ?? p;
              const partnerData = data[p];
              const rows = partnerData?.scorecards ?? [];
              const lockedKpis = partnerData?.kpis ?? [];

              return (
                <div
                  key={p}
                  className="summary-section"
                  style={{
                    padding: 20,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    marginBottom: 20,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>{partnerName}</h3>

                  {rows.length === 0 ? (
                    <p className="muted">{ADMIN_SCORECARD_COPY.empty}</p>
                  ) : (
                    <div className="scorecard-oversight-grid">
                      {rows.map((row) => {
                        const key = `${p}_${row.week_of}`;
                        const closed = isAdminClosed(row);
                        const reopened = Boolean(row.admin_reopened_at);
                        const overridden = Boolean(row.admin_override_at);
                        const results = row.kpi_results || {};
                        const entries = Object.entries(results);
                        const isArmed = Boolean(pendingReopen[key]);
                        const isReopening = reopeningKey === key;

                        return (
                          <div key={row.week_of} className="scorecard-oversight-row">
                            <div
                              className="scorecard-oversight-header"
                              style={{
                                gridTemplateColumns: '200px 1fr 200px',
                              }}
                            >
                              <div className="scorecard-oversight-cell week">
                                {formatWeekRange(row.week_of)}
                                {reopened && (
                                  <span className="scorecard-reopened-badge">
                                    {' '}
                                    {ADMIN_SCORECARD_COPY.reopenedBadge}
                                  </span>
                                )}
                              </div>
                              <div className="scorecard-oversight-cell">
                                {closed ? 'Closed' : 'Active'}
                                {overridden && (
                                  <span
                                    className="meeting-admin-override-marker"
                                    style={{ marginLeft: 8 }}
                                  >
                                    {ADMIN_SCORECARD_COPY.overrideMarker}
                                  </span>
                                )}
                              </div>
                              <div
                                className="scorecard-oversight-cell"
                                style={{ textAlign: 'right' }}
                              >
                                {closed && !reopened ? (
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => handleReopenClick(p, row.week_of)}
                                    disabled={isReopening}
                                    style={
                                      isArmed
                                        ? {
                                            borderColor: 'var(--red)',
                                            color: 'var(--text)',
                                            background: 'rgba(196,30,58,0.14)',
                                          }
                                        : undefined
                                    }
                                  >
                                    {isArmed
                                      ? ADMIN_SCORECARD_COPY.reopenConfirmBtn
                                      : ADMIN_SCORECARD_COPY.reopenBtn}
                                  </button>
                                ) : (
                                  <span className="muted" style={{ fontSize: 13 }}>
                                    {reopened ? 'Editable' : 'Editable'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isArmed && (
                              <div
                                className="muted"
                                style={{
                                  padding: '0 16px 12px',
                                  color: 'var(--red)',
                                  fontSize: 13,
                                }}
                              >
                                {ADMIN_SCORECARD_COPY.reopenWarning(partnerName)}
                              </div>
                            )}

                            <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                              {entries.length === 0 ? (
                                <p className="muted" style={{ fontSize: 13 }}>
                                  No KPI results recorded.
                                </p>
                              ) : (
                                entries.map(([kpiId, entry]) => {
                                  const label = getLabelForEntry(kpiId, entry, lockedKpis);
                                  const r = entry?.result;
                                  const dot =
                                    r === 'yes' ? '\u2713' : r === 'no' ? '\u2717' : '\u2014';
                                  const dotColor =
                                    r === 'yes'
                                      ? 'var(--success)'
                                      : r === 'no'
                                      ? 'var(--miss)'
                                      : 'var(--muted-2)';
                                  return (
                                    <div
                                      key={kpiId}
                                      style={{
                                        marginBottom: 8,
                                        paddingBottom: 8,
                                        borderBottom: '1px dashed var(--border)',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: dotColor,
                                            fontWeight: 700,
                                            minWidth: 16,
                                          }}
                                        >
                                          {dot}
                                        </span>
                                        <span style={{ fontWeight: 600 }}>{label}</span>
                                      </div>
                                      {entry?.reflection && (
                                        <div
                                          className="muted"
                                          style={{
                                            marginTop: 4,
                                            fontSize: 13,
                                            paddingLeft: 24,
                                          }}
                                        >
                                          {entry.reflection}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
