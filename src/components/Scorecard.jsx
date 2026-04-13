import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiSelections,
  fetchScorecards,
  upsertScorecard,
  commitScorecardWeek,
} from '../lib/supabase.js';
import { getMondayOf, getSundayEndOf, isWeekClosed, formatWeekRange } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, SCORECARD_COPY } from '../data/content.js';

// Motion props shared by all three views — matches KpiSelection.jsx pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

export default function Scorecard() {
  const { partner } = useParams();
  const navigate = useNavigate();

  // Data/loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lockedKpis, setLockedKpis] = useState([]);         // kpi_selections rows (with label_snapshot)
  const [allScorecards, setAllScorecards] = useState([]);   // from fetchScorecards, newest first

  // View state
  const [view, setView] = useState('precommit');            // 'precommit' | 'editing' | 'success'

  // Precommit/commit action state
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);

  // Editing / current week working state
  const [kpiResults, setKpiResults] = useState({});         // { [kpi_selection_id]: { result, reflection } }
  const [committedAt, setCommittedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedVisible, setSavedVisible] = useState(false);  // controls .scorecard-saved.visible class

  // Weekly Reflection state
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [tasksCarriedOver, setTasksCarriedOver] = useState('');
  const [weeklyWin, setWeeklyWin] = useState('');
  const [weeklyLearning, setWeeklyLearning] = useState('');
  const [weekRating, setWeekRating] = useState(null); // 1-5 or null

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // History UI state
  const [expandedHistoryWeek, setExpandedHistoryWeek] = useState(null);

  // Stable week anchor — computed once per mount (edge case 3 in RESEARCH.md)
  const currentWeekOfRef = useRef(getMondayOf());
  const currentWeekOf = currentWeekOfRef.current;

  // Debounce timer refs for saved indicator
  const savedTimerRef = useRef(null);
  const savedFadeRef = useRef(null);

  // Ref to skip weekRating auto-save on initial mount
  const weekRatingInitialized = useRef(false);

  // ---- Mount guards + data fetch ----
  useEffect(() => {
    // Guard 1: invalid partner slug
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }

    Promise.all([fetchKpiSelections(partner), fetchScorecards(partner)])
      .then(([sels, scorecards]) => {
        // Guard 3: KPIs not locked yet → hub (D-18)
        if (sels.length === 0 || !sels[0]?.locked_until) {
          navigate(`/hub/${partner}`, { replace: true });
          return;
        }
        setLockedKpis(sels);
        setAllScorecards(scorecards);

        // Hydrate current-week state if a row exists and was committed
        const thisWeekRow = scorecards.find((s) => s.week_of === currentWeekOf);
        if (thisWeekRow?.committed_at) {
          setView('editing');
          setKpiResults(thisWeekRow.kpi_results || {});
          setCommittedAt(thisWeekRow.committed_at);
          // Hydrate reflection fields
          setTasksCompleted(thisWeekRow.tasks_completed ?? '');
          setTasksCarriedOver(thisWeekRow.tasks_carried_over ?? '');
          setWeeklyWin(thisWeekRow.weekly_win ?? '');
          setWeeklyLearning(thisWeekRow.weekly_learning ?? '');
          setWeekRating(thisWeekRow.week_rating ?? null);
        } else {
          setView('precommit');
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));

    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };
  }, [partner]);

  // Auto-save when weekRating changes (after initial mount)
  useEffect(() => {
    if (!weekRatingInitialized.current) {
      weekRatingInitialized.current = true;
      return;
    }
    if (weekClosed || !committedAt) return;
    persist(kpiResults);
  }, [weekRating]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Derived values ----
  const weekClosed = useMemo(() => isWeekClosed(currentWeekOf), [currentWeekOf]);

  const answeredCount = useMemo(
    () =>
      lockedKpis.reduce((n, k) => {
        const r = kpiResults[k.id]?.result;
        return r === 'yes' || r === 'no' ? n + 1 : n;
      }, 0),
    [lockedKpis, kpiResults]
  );

  const allKpisAnswered = useMemo(
    () => lockedKpis.length > 0 && lockedKpis.every(k => {
      const r = kpiResults[k.id]?.result;
      return r === 'yes' || r === 'no';
    }),
    [lockedKpis, kpiResults]
  );

  const allAnsweredWithRequiredReflection = useMemo(
    () =>
      lockedKpis.length > 0 &&
      lockedKpis.every((k) => {
        const r = kpiResults[k.id];
        if (!r || (r.result !== 'yes' && r.result !== 'no')) return false;
        // Reflection required only on missed KPIs — optional on hits
        if (r.result === 'no') return r.reflection?.trim().length > 0;
        return true;
      }),
    [lockedKpis, kpiResults]
  );

  const canSubmit = allAnsweredWithRequiredReflection && weeklyWin.trim().length > 0 && weekRating !== null;

  const historyRows = useMemo(
    () => allScorecards.filter((s) => s.week_of !== currentWeekOf),
    [allScorecards, currentWeekOf]
  );

  // ---- Handlers ----

  async function handleCommit() {
    if (committing) return;
    setCommitting(true);
    setCommitError(null);
    try {
      const kpiLabels = Object.fromEntries(
        lockedKpis.map((k) => [k.id, k.label_snapshot])
      );
      const row = await commitScorecardWeek(
        partner,
        currentWeekOf,
        lockedKpis.map((k) => k.id),
        kpiLabels
      );
      setKpiResults(row.kpi_results || {});
      setCommittedAt(row.committed_at);
      // Refresh allScorecards so the current row is reflected
      setAllScorecards((prev) => {
        const without = prev.filter((s) => s.week_of !== row.week_of);
        return [row, ...without].sort((a, b) => b.week_of.localeCompare(a.week_of));
      });
      setView('editing');
    } catch (err) {
      console.error(err);
      setCommitError(SCORECARD_COPY.errorCommit);
    } finally {
      setCommitting(false);
    }
  }

  // Core persist function — replace-in-place JSONB upsert (Pattern 3 in RESEARCH.md)
  async function persist(nextKpiResults) {
    setSaving(true);
    setSaveError(null);
    try {
      const row = await upsertScorecard({
        partner,
        week_of: currentWeekOf,
        kpi_results: nextKpiResults,
        committed_at: committedAt,
        submitted_at: new Date().toISOString(),
        tasks_completed: tasksCompleted,
        tasks_carried_over: tasksCarriedOver,
        weekly_win: weeklyWin,
        weekly_learning: weeklyLearning,
        week_rating: weekRating,
      });
      // Replace row in allScorecards so history + hub derivations stay consistent
      setAllScorecards((prev) => {
        const without = prev.filter((s) => s.week_of !== row.week_of);
        return [row, ...without].sort((a, b) => b.week_of.localeCompare(a.week_of));
      });
      // Saved indicator: show 800ms after resolve, fade out 2s later
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      savedTimerRef.current = setTimeout(() => {
        setSavedVisible(true);
        savedFadeRef.current = setTimeout(() => setSavedVisible(false), 2000);
      }, 800);
    } catch (err) {
      console.error(err);
      setSaveError(SCORECARD_COPY.errorSubmit);
    } finally {
      setSaving(false);
    }
  }

  function setResult(kpiId, result) {
    if (weekClosed) return;
    const next = {
      ...kpiResults,
      [kpiId]: {
        result,
        reflection: kpiResults[kpiId]?.reflection ?? '',
      },
    };
    setKpiResults(next);
    persist(next);
  }

  function setReflectionLocal(kpiId, text) {
    // Optimistic local update — persist on blur
    setKpiResults((prev) => ({
      ...prev,
      [kpiId]: {
        result: prev[kpiId]?.result ?? null,
        reflection: text,
      },
    }));
  }

  function persistReflection(kpiId) {
    if (weekClosed) return;
    const current = kpiResults[kpiId];
    if (!current) return;
    persist(kpiResults);
  }

  async function handleSubmit() {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await upsertScorecard({
        partner,
        week_of: currentWeekOf,
        kpi_results: kpiResults,
        committed_at: committedAt,
        submitted_at: new Date().toISOString(),
        tasks_completed: tasksCompleted,
        tasks_carried_over: tasksCarriedOver,
        weekly_win: weeklyWin,
        weekly_learning: weeklyLearning,
        week_rating: weekRating,
      });
      setView('success');
      setTimeout(() => navigate(`/hub/${partner}`), 1800);
    } catch (err) {
      console.error(err);
      setSubmitError(SCORECARD_COPY.errorSubmit);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleHistoryRow(weekOf) {
    setExpandedHistoryWeek((prev) => (prev === weekOf ? null : weekOf));
  }

  // Render the history section — used inside both precommit and editing views
  function renderHistory() {
    // Build a label lookup from current KPIs (for old scorecards that don't have embedded labels)
    const currentLabelMap = Object.fromEntries(
      lockedKpis.map((k) => [k.id, k.label_snapshot])
    );

    return (
      <>
        <hr className="scorecard-divider" />
        <div className="eyebrow" style={{ marginBottom: 16 }}>{SCORECARD_COPY.historyEyebrow}</div>
        {historyRows.length === 0 ? (
          <p className="scorecard-history-empty">{SCORECARD_COPY.historyEmpty}</p>
        ) : (
          <div className="scorecard-history-list">
            {historyRows.map((row) => {
              const expanded = expandedHistoryWeek === row.week_of;
              const rowResults = row.kpi_results || {};
              // Get all KPI IDs from this row's results (includes current + any orphaned from prior selections)
              const allResultIds = Object.keys(rowResults);
              const totalKpis = allResultIds.length;
              const hitCount = allResultIds.reduce(
                (n, id) => (rowResults[id]?.result === 'yes' ? n + 1 : n),
                0
              );
              return (
                <div
                  key={row.week_of}
                  className={`scorecard-history-row${expanded ? ' expanded' : ''}`}
                  onClick={() => toggleHistoryRow(row.week_of)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleHistoryRow(row.week_of);
                    }
                  }}
                >
                  <div className="scorecard-history-summary">
                    <span className="scorecard-history-week">{formatWeekRange(row.week_of)}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="scorecard-dots">
                        {allResultIds.map((id) => {
                          const r = rowResults[id]?.result;
                          const cls = r === 'yes' ? 'yes' : r === 'no' ? 'no' : 'null';
                          return <span key={id} className={`scorecard-dot ${cls}`} />;
                        })}
                      </div>
                      <span className="scorecard-hit-rate">{hitCount}/{totalKpis}</span>
                    </div>
                  </div>
                  {expanded && (
                    <div className="scorecard-history-detail">
                      {allResultIds.map((id) => {
                        const r = rowResults[id];
                        const result = r?.result;
                        // Label priority: embedded in JSONB > current selection > fallback
                        const label = r?.label || currentLabelMap[id] || '(Previous KPI)';
                        const resultLabel = result === 'yes' ? 'Yes' : result === 'no' ? 'No' : '\u2014';
                        const resultClass = result === 'yes' ? 'yes' : result === 'no' ? 'no' : 'null';
                        return (
                          <div key={id} className="scorecard-history-kpi-detail">
                            <div className="scorecard-history-kpi-label">{label}</div>
                            <div className={`scorecard-history-kpi-result ${resultClass}`}>{resultLabel}</div>
                            {r?.reflection && (
                              <div className="scorecard-history-kpi-reflection">{r.reflection}</div>
                            )}
                          </div>
                        );
                      })}
                      {/* Reflection fields from history */}
                      {row.weekly_win && (
                        <div className="scorecard-history-kpi-detail">
                          <div className="scorecard-reflection-label">{SCORECARD_COPY.weeklyWinLabel}</div>
                          <div className="scorecard-history-kpi-reflection">{row.weekly_win}</div>
                        </div>
                      )}
                      {row.weekly_learning && (
                        <div className="scorecard-history-kpi-detail">
                          <div className="scorecard-reflection-label">{SCORECARD_COPY.weeklyLearningLabel}</div>
                          <div className="scorecard-history-kpi-reflection">{row.weekly_learning}</div>
                        </div>
                      )}
                      {row.week_rating && (
                        <div className="scorecard-history-kpi-detail">
                          <div className="scorecard-reflection-label">{SCORECARD_COPY.weekRatingLabel}</div>
                          <div className="scorecard-history-kpi-reflection">{row.week_rating} / 5</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ---- Early returns ----
  if (loading) return null;

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="screen fade-in">
            <p className="muted" style={{ textAlign: 'center' }}>{SCORECARD_COPY.errorLoad}</p>
          </div>
        </div>
      </div>
    );
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;

  // ---- Render ----
  return (
    <div className="app-shell">
      <div className="container">
        <AnimatePresence mode="wait">
          {view === 'precommit' && (
            <motion.div key="precommit" className="screen" {...motionProps}>
              <div className="nav-row" style={{ marginBottom: 12 }}>
                <Link to={`/hub/${partner}`} className="btn-ghost">
                  {'\u2190'} Back to Hub
                </Link>
              </div>
              <div className="eyebrow">{SCORECARD_COPY.eyebrow}</div>
              <div className="screen-header">
                <h2>{SCORECARD_COPY.headingPreCommit}</h2>
                <p className="subtext">{SCORECARD_COPY.subtextPreCommit}</p>
              </div>

              <div className="scorecard-commit-gate">
                <ol
                  className="scorecard-kpi-preview-list"
                  style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {lockedKpis.map((k) => (
                    <li key={k.id} className="scorecard-kpi-preview">
                      {k.label_snapshot}
                      {k.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>}
                    </li>
                  ))}
                </ol>
                <div className="nav-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleCommit}
                    disabled={committing}
                  >
                    {committing ? SCORECARD_COPY.committingCta : SCORECARD_COPY.commitCta}
                  </button>
                </div>
                {commitError && (
                  <p className="muted" style={{ color: 'var(--red)', marginTop: 8 }}>{commitError}</p>
                )}
              </div>

              {renderHistory()}
            </motion.div>
          )}

          {view === 'editing' && (
            <motion.div key="editing" className="screen" {...motionProps}>
              <div className="nav-row" style={{ marginBottom: 12 }}>
                <Link to={`/hub/${partner}`} className="btn-ghost">
                  {'\u2190'} Back to Hub
                </Link>
              </div>
              <div className="eyebrow">{SCORECARD_COPY.eyebrow}</div>
              <div className="screen-header">
                <h2>{SCORECARD_COPY.headingEditing}</h2>
              </div>

              <div className="scorecard-meta-row">
                <span className={`scorecard-counter${answeredCount === lockedKpis.length ? ' complete' : ''}`}>
                  {answeredCount === lockedKpis.length
                    ? SCORECARD_COPY.counterComplete(lockedKpis.length)
                    : SCORECARD_COPY.counter(answeredCount, lockedKpis.length)}
                </span>
                <span className={`scorecard-saved${savedVisible ? ' visible' : ''}`}>
                  {SCORECARD_COPY.savedIndicator}
                </span>
              </div>

              {weekClosed && (
                <p className="muted" style={{ marginBottom: 16 }}>
                  {SCORECARD_COPY.weekClosedBanner(formatWeekRange(currentWeekOf))}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {lockedKpis.map((k) => {
                  const entry = kpiResults[k.id] || { result: null, reflection: '' };
                  const rowClass = [
                    'scorecard-kpi-row',
                    entry.result === 'yes' ? 'yes' : '',
                    entry.result === 'no' ? 'no' : '',
                  ].filter(Boolean).join(' ');
                  const promptLabel = entry.result === 'yes'
                    ? SCORECARD_COPY.prompts.success
                    : entry.result === 'no'
                      ? SCORECARD_COPY.prompts.blocker
                      : null;
                  return (
                    <div key={k.id} className={rowClass}>
                      <div className="scorecard-kpi-label">
                        {k.label_snapshot}
                        {k.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>}
                      </div>
                      <div className="scorecard-yn-row">
                        <button
                          type="button"
                          className={`scorecard-yn-btn yes${entry.result === 'yes' ? ' active' : ''}`}
                          onClick={() => setResult(k.id, 'yes')}
                          disabled={weekClosed}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`scorecard-yn-btn no${entry.result === 'no' ? ' active' : ''}`}
                          onClick={() => setResult(k.id, 'no')}
                          disabled={weekClosed}
                        >
                          No
                        </button>
                      </div>
                      {entry.result && (
                        <div className="scorecard-reflection">
                          <label className="scorecard-reflection-label">{promptLabel}</label>
                          <textarea
                            value={entry.reflection}
                            onChange={(e) => setReflectionLocal(k.id, e.target.value)}
                            onBlur={() => persistReflection(k.id)}
                            disabled={weekClosed}
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Weekly Reflection section — visible after all KPIs answered */}
              {allKpisAnswered && (
                <div className="scorecard-reflection-section">
                  <div className="eyebrow">{SCORECARD_COPY.reflectionEyebrow}</div>

                  {/* Tasks row — side by side */}
                  <div className="scorecard-tasks-row">
                    <div>
                      <label className="scorecard-reflection-label">{SCORECARD_COPY.tasksCompletedLabel}</label>
                      <textarea
                        className="textarea"
                        value={tasksCompleted}
                        onChange={e => setTasksCompleted(e.target.value)}
                        onBlur={() => persist(kpiResults)}
                        placeholder={SCORECARD_COPY.tasksCompletedPlaceholder}
                        disabled={weekClosed}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="scorecard-reflection-label">{SCORECARD_COPY.tasksCarriedOverLabel}</label>
                      <textarea
                        className="textarea"
                        value={tasksCarriedOver}
                        onChange={e => setTasksCarriedOver(e.target.value)}
                        onBlur={() => persist(kpiResults)}
                        placeholder={SCORECARD_COPY.tasksCarriedOverPlaceholder}
                        disabled={weekClosed}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Weekly Win — required */}
                  <div>
                    <label className="scorecard-reflection-label">
                      {SCORECARD_COPY.weeklyWinLabel}
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted-2)' }}>{SCORECARD_COPY.weeklyWinRequired}</span>
                    </label>
                    <textarea
                      className="textarea"
                      value={weeklyWin}
                      onChange={e => setWeeklyWin(e.target.value)}
                      onBlur={() => persist(kpiResults)}
                      placeholder={SCORECARD_COPY.weeklyWinPlaceholder}
                      disabled={weekClosed}
                      rows={3}
                    />
                  </div>

                  {/* Weekly Learning — optional */}
                  <div>
                    <label className="scorecard-reflection-label">{SCORECARD_COPY.weeklyLearningLabel}</label>
                    <textarea
                      className="textarea"
                      value={weeklyLearning}
                      onChange={e => setWeeklyLearning(e.target.value)}
                      onBlur={() => persist(kpiResults)}
                      placeholder={SCORECARD_COPY.weeklyLearningPlaceholder}
                      disabled={weekClosed}
                      rows={3}
                    />
                  </div>

                  {/* Week Rating — 1-5 buttons */}
                  <div>
                    <label className="scorecard-reflection-label">{SCORECARD_COPY.weekRatingLabel}</label>
                    <div className="scorecard-rating-row">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          className={`scorecard-rating-btn${weekRating === n ? ' active' : ''}`}
                          onClick={() => { setWeekRating(n); }}
                          disabled={weekClosed}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="scorecard-rating-labels">
                      <span>{SCORECARD_COPY.weekRatingLeft}</span>
                      <span>{SCORECARD_COPY.weekRatingRight}</span>
                    </div>
                  </div>
                </div>
              )}

              {!weekClosed && (
                <div className="nav-row" style={{ marginTop: 24 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                  >
                    {SCORECARD_COPY.submitCta}
                  </button>
                </div>
              )}
              {!weekClosed && !canSubmit && (
                <p className="scorecard-submit-note">{SCORECARD_COPY.submitNote}</p>
              )}
              {submitError && (
                <p className="muted" style={{ color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>{submitError}</p>
              )}
              {saveError && (
                <p className="muted" style={{ color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>{saveError}</p>
              )}

              {renderHistory()}
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div key="success" className="screen kpi-lock-success" {...motionProps}>
              <div className="screen-header" style={{ textAlign: 'center' }}>
                <h2>{SCORECARD_COPY.successHeading}</h2>
                <p className="subtext">{SCORECARD_COPY.successSubtext}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
