import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiTemplates,
  fetchWeeklyKpiSelection,
  fetchAdminSetting,
  fetchScorecards,
  upsertScorecard,
} from '../lib/supabase.js';
import { getMondayOf, isWeekClosed, formatWeekRange } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, SCORECARD_COPY } from '../data/content.js';

// Motion props shared by all views — matches KpiSelection.jsx pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

export default function Scorecard() {
  const { partner } = useParams();
  const navigate = useNavigate();

  // ---- Hooks declared BEFORE any early return (Phase 15 P-U2) ----

  // Data/loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [noSelection, setNoSelection] = useState(false);

  // v2.0 row shape: array of kpi_templates composing this week's scorecard
  const [rows, setRows] = useState([]);
  const [weeklySel, setWeeklySel] = useState(null);
  const [allScorecards, setAllScorecards] = useState([]);

  // View state — 'editing' (input form + sticky bar) | 'submitted' (read-only)
  const [view, setView] = useState('editing');

  // Editing/current-week working state — keyed by kpi_template_id
  // { [template_id]: { result: 'yes'|'no'|null, reflection: string, count: number } }
  const [kpiResults, setKpiResults] = useState({});
  const [committedAt, setCommittedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedVisible, setSavedVisible] = useState(false);

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

  // Stable week anchor — computed once per mount
  const currentWeekOfRef = useRef(getMondayOf());
  const currentWeekOf = currentWeekOfRef.current;

  // Debounce timer refs for saved indicator
  const savedTimerRef = useRef(null);
  const savedFadeRef = useRef(null);

  // Ref to skip weekRating auto-save on initial mount
  const weekRatingInitialized = useRef(false);

  // ---- Derived values (before early returns) ----

  const weekClosed = useMemo(() => isWeekClosed(currentWeekOf), [currentWeekOf]);

  const historyRows = useMemo(
    () => allScorecards.filter((s) => s.week_of !== currentWeekOf),
    [allScorecards, currentWeekOf]
  );

  // ---- Mount guards + data fetch (Pattern 5 — composite fetch) ----
  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }

    Promise.all([
      fetchKpiTemplates(),
      fetchWeeklyKpiSelection(partner, currentWeekOf),
      partner === 'jerry'
        ? fetchAdminSetting('jerry_sales_kpi_active').then((r) => r?.value === true)
        : Promise.resolve(false),
      fetchScorecards(partner),
    ])
      .then(([templates, sel, jerryActive, scorecards]) => {
        setAllScorecards(scorecards);

        // Empty guard: no weekly KPI selected for current week
        if (!sel || !sel.kpi_template_id) {
          setRows([]);
          setNoSelection(true);
          return;
        }

        // Compose rows (Pattern 5): mandatory (non-conditional) + conditional (if jerry+active) + weekly choice
        const mandatory = templates.filter(
          (t) =>
            t.mandatory === true &&
            (t.partner_scope === partner || t.partner_scope === 'both' || t.partner_scope === 'shared') &&
            t.conditional === false
        );
        const conditional =
          partner === 'jerry' && jerryActive
            ? templates.find((t) => t.conditional === true && t.partner_scope === 'jerry')
            : null;
        const weeklyTpl = templates.find((t) => t.id === sel.kpi_template_id);

        const composed = [
          ...mandatory,
          ...(conditional ? [conditional] : []),
          ...(weeklyTpl ? [weeklyTpl] : []),
        ];

        setRows(composed);
        setWeeklySel(sel);

        // Hydrate / seed row results. If already submitted this week → hydrate from scorecards row.
        // Otherwise → seed count from sel.counter_value (COUNT-04).
        const thisWeekRow = scorecards.find((s) => s.week_of === currentWeekOf);
        const seededResults = {};
        composed.forEach((tpl) => {
          const existing = thisWeekRow?.kpi_results?.[tpl.id];
          seededResults[tpl.id] = {
            result: existing?.result ?? null,
            reflection: existing?.reflection ?? '',
            count: existing?.count ?? sel.counter_value?.[tpl.id] ?? 0,
          };
        });
        setKpiResults(seededResults);

        if (thisWeekRow?.submitted_at) {
          setView('submitted');
          setCommittedAt(thisWeekRow.committed_at ?? thisWeekRow.submitted_at);
          setTasksCompleted(thisWeekRow.tasks_completed ?? '');
          setTasksCarriedOver(thisWeekRow.tasks_carried_over ?? '');
          setWeeklyWin(thisWeekRow.weekly_win ?? '');
          setWeeklyLearning(thisWeekRow.weekly_learning ?? '');
          setWeekRating(thisWeekRow.week_rating ?? null);
        } else if (thisWeekRow) {
          // Partial draft row exists. Hydrate reflection fields if present.
          setCommittedAt(thisWeekRow.committed_at ?? null);
          setTasksCompleted(thisWeekRow.tasks_completed ?? '');
          setTasksCarriedOver(thisWeekRow.tasks_carried_over ?? '');
          setWeeklyWin(thisWeekRow.weekly_win ?? '');
          setWeeklyLearning(thisWeekRow.weekly_learning ?? '');
          setWeekRating(thisWeekRow.week_rating ?? null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  // Auto-save when weekRating changes (after initial mount)
  useEffect(() => {
    if (!weekRatingInitialized.current) {
      weekRatingInitialized.current = true;
      return;
    }
    if (weekClosed || view === 'submitted') return;
    persistDraft(kpiResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRating]);

  // ---- Handlers ----

  // Build kpi_results JSONB for a scorecards upsert (Pitfall 1 — key by kpi_template_id,
  // include label: tpl.baseline_action so seasonStats.js continues to work label-keyed).
  function buildKpiResultsPayload(draft) {
    return Object.fromEntries(
      rows.map((tpl) => {
        const entry = draft[tpl.id] ?? { result: null, reflection: '', count: 0 };
        const payload = {
          result: entry.result ?? null,
          reflection: entry.reflection ?? '',
          label: tpl.baseline_action,
        };
        if (tpl.countable) {
          payload.count = Number(entry.count ?? 0);
        }
        return [tpl.id, payload];
      })
    );
  }

  // Draft persist — same shape as submit but without final submitted_at semantics.
  async function persistDraft(nextKpiResults) {
    if (weekClosed || view === 'submitted') return;
    setSaving(true);
    setSaveError(null);
    try {
      const nowIso = new Date().toISOString();
      const row = await upsertScorecard({
        partner,
        week_of: currentWeekOf,
        kpi_results: buildKpiResultsPayload(nextKpiResults),
        committed_at: committedAt ?? nowIso,
        tasks_completed: tasksCompleted,
        tasks_carried_over: tasksCarriedOver,
        weekly_win: weeklyWin,
        weekly_learning: weeklyLearning,
        week_rating: weekRating,
      });
      if (!committedAt) setCommittedAt(row.committed_at ?? nowIso);
      setAllScorecards((prev) => {
        const without = prev.filter((s) => s.week_of !== row.week_of);
        return [row, ...without].sort((a, b) => b.week_of.localeCompare(a.week_of));
      });
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      savedTimerRef.current = setTimeout(() => {
        setSavedVisible(true);
        savedFadeRef.current = setTimeout(() => setSavedVisible(false), 2000);
      }, 800);
    } catch (err) {
      console.error(err);
      setSaveError(SCORECARD_COPY.submitErrorDb);
    } finally {
      setSaving(false);
    }
  }

  function setResult(templateId, result) {
    if (weekClosed || view === 'submitted') return;
    const next = {
      ...kpiResults,
      [templateId]: {
        result,
        reflection: kpiResults[templateId]?.reflection ?? '',
        count: kpiResults[templateId]?.count ?? 0,
      },
    };
    setKpiResults(next);
    persistDraft(next);
  }

  function setReflectionLocal(templateId, text) {
    setKpiResults((prev) => ({
      ...prev,
      [templateId]: {
        result: prev[templateId]?.result ?? null,
        reflection: text,
        count: prev[templateId]?.count ?? 0,
      },
    }));
  }

  function setCountLocal(templateId, value) {
    const numeric = value === '' ? 0 : Math.max(0, Number(value));
    setKpiResults((prev) => ({
      ...prev,
      [templateId]: {
        result: prev[templateId]?.result ?? null,
        reflection: prev[templateId]?.reflection ?? '',
        count: Number.isFinite(numeric) ? numeric : 0,
      },
    }));
  }

  function persistField() {
    if (weekClosed || view === 'submitted') return;
    persistDraft(kpiResults);
  }

  async function handleSubmit() {
    if (submitting) return;
    const incomplete = rows.some((tpl) => {
      const r = kpiResults[tpl.id]?.result;
      return r !== 'yes' && r !== 'no';
    });
    if (incomplete) {
      setSubmitError(SCORECARD_COPY.submitErrorIncomplete);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const nowIso = new Date().toISOString();
      await upsertScorecard({
        partner,
        week_of: currentWeekOf,
        kpi_results: buildKpiResultsPayload(kpiResults),
        committed_at: committedAt ?? nowIso,
        submitted_at: nowIso,
        tasks_completed: tasksCompleted,
        tasks_carried_over: tasksCarriedOver,
        weekly_win: weeklyWin,
        weekly_learning: weeklyLearning,
        week_rating: weekRating,
      });
      setView('submitted');
      const refreshed = await fetchScorecards(partner);
      setAllScorecards(refreshed);
    } catch (err) {
      console.error(err);
      setSubmitError(SCORECARD_COPY.submitErrorDb);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleHistoryRow(weekOf) {
    setExpandedHistoryWeek((prev) => (prev === weekOf ? null : weekOf));
  }

  // Render the history section — dynamic row count (no hardcoded 7/5)
  function renderHistory() {
    const currentLabelMap = Object.fromEntries(
      rows.map((tpl) => [tpl.id, tpl.baseline_action])
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
                        const label = r?.label || currentLabelMap[id] || '(Previous KPI)';
                        const resultLabel = result === 'yes' ? 'Met' : result === 'no' ? 'Not Met' : '\u2014';
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

  // ---- Early returns (AFTER all hooks) ----

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

  if (noSelection) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="scorecard-commit-gate">
            <h3>{SCORECARD_COPY.emptyGuardHeading}</h3>
            <p className="muted">{SCORECARD_COPY.emptyGuardBody}</p>
            <div className="nav-row" style={{ marginTop: 16 }}>
              <Link to={`/hub/${partner}`} className="btn-ghost">
                {SCORECARD_COPY.emptyGuardCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const answeredCount = rows.reduce((n, tpl) => {
    const r = kpiResults[tpl.id]?.result;
    return r === 'yes' || r === 'no' ? n + 1 : n;
  }, 0);
  const isSubmitted = view === 'submitted';

  // ---- Render ----
  return (
    <div className="app-shell">
      <div className="container" style={{ paddingBottom: isSubmitted ? undefined : 96 }}>
        <AnimatePresence mode="wait">
          <motion.div key={view} className="screen" {...motionProps}>
            <div className="nav-row" style={{ marginBottom: 12 }}>
              <Link to={`/hub/${partner}`} className="btn-ghost">
                {'\u2190'} Back to Hub
              </Link>
            </div>
            <div className="eyebrow">{SCORECARD_COPY.eyebrow}</div>
            <div className="screen-header">
              <h2>{partnerName}</h2>
            </div>

            {isSubmitted && (
              <div className="scorecard-commit-gate" style={{ marginBottom: 20 }}>
                <p className="muted" style={{ margin: 0 }}>{SCORECARD_COPY.submittedNotice}</p>
              </div>
            )}

            {!isSubmitted && (
              <div className="scorecard-meta-row">
                <span className={`scorecard-counter${answeredCount === rows.length ? ' complete' : ''}`}>
                  {answeredCount === rows.length
                    ? SCORECARD_COPY.counterComplete(rows.length)
                    : SCORECARD_COPY.counter(answeredCount, rows.length)}
                </span>
                <span className={`scorecard-saved${savedVisible ? ' visible' : ''}`}>
                  {SCORECARD_COPY.savedIndicator}
                </span>
              </div>
            )}

            {weekClosed && !isSubmitted && (
              <p className="muted" style={{ marginBottom: 16 }}>
                {SCORECARD_COPY.weekClosedBanner(formatWeekRange(currentWeekOf))}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rows.map((tpl) => {
                const entry = kpiResults[tpl.id] || { result: null, reflection: '', count: 0 };
                const rowClass = [
                  'scorecard-kpi-row',
                  entry.result === 'yes' ? 'yes' : '',
                  entry.result === 'no' ? 'no' : '',
                ].filter(Boolean).join(' ');
                const disabled = weekClosed || isSubmitted;
                return (
                  <div key={tpl.id} className={rowClass}>
                    <div className="scorecard-baseline-label">{tpl.baseline_action}</div>
                    <div className="scorecard-growth-clause">
                      {SCORECARD_COPY.growthPrefix} {tpl.growth_clause}
                    </div>

                    {isSubmitted ? (
                      <div className="scorecard-yn-row">
                        <span
                          className={`scorecard-yn-btn ${entry.result === 'yes' ? 'yes active' : entry.result === 'no' ? 'no active' : ''}`}
                          style={{ cursor: 'default' }}
                        >
                          {entry.result === 'yes' ? 'Met' : entry.result === 'no' ? 'Not Met' : '\u2014'}
                        </span>
                      </div>
                    ) : (
                      <div className="scorecard-yn-row">
                        <button
                          type="button"
                          className={`scorecard-yn-btn yes${entry.result === 'yes' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'yes')}
                          disabled={disabled}
                        >
                          Met
                        </button>
                        <button
                          type="button"
                          className={`scorecard-yn-btn no${entry.result === 'no' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'no')}
                          disabled={disabled}
                        >
                          Not Met
                        </button>
                      </div>
                    )}

                    {tpl.countable && (
                      <div className="scorecard-count-field" style={{ marginTop: 12 }}>
                        <label className="scorecard-reflection-label">{SCORECARD_COPY.countLabel}</label>
                        {isSubmitted ? (
                          <span>{entry.count ?? 0}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            className="scorecard-count-input"
                            value={entry.count ?? 0}
                            onChange={(e) => setCountLocal(tpl.id, e.target.value)}
                            onBlur={persistField}
                            disabled={disabled}
                          />
                        )}
                      </div>
                    )}

                    <div className="scorecard-reflection" style={{ marginTop: 12 }}>
                      <label className="scorecard-reflection-label">{SCORECARD_COPY.reflectionLabel}</label>
                      {isSubmitted ? (
                        <p className="muted" style={{ margin: 0 }}>{entry.reflection || '\u2014'}</p>
                      ) : (
                        <textarea
                          value={entry.reflection}
                          onChange={(e) => setReflectionLocal(tpl.id, e.target.value)}
                          onBlur={persistField}
                          disabled={disabled}
                          rows={3}
                          placeholder={SCORECARD_COPY.reflectionPlaceholder}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly Reflection section */}
            <div className="scorecard-reflection-section">
              <div className="eyebrow">{SCORECARD_COPY.weeklyReflectionHeading}</div>

              <div className="scorecard-tasks-row">
                <div>
                  <label className="scorecard-reflection-label">{SCORECARD_COPY.tasksCompletedLabel}</label>
                  {isSubmitted ? (
                    <p className="muted" style={{ margin: 0 }}>{tasksCompleted || '\u2014'}</p>
                  ) : (
                    <textarea
                      className="textarea"
                      value={tasksCompleted}
                      onChange={(e) => setTasksCompleted(e.target.value)}
                      onBlur={persistField}
                      placeholder={SCORECARD_COPY.tasksCompletedPlaceholder}
                      disabled={weekClosed}
                      rows={3}
                    />
                  )}
                </div>
                <div>
                  <label className="scorecard-reflection-label">{SCORECARD_COPY.tasksCarriedOverLabel}</label>
                  {isSubmitted ? (
                    <p className="muted" style={{ margin: 0 }}>{tasksCarriedOver || '\u2014'}</p>
                  ) : (
                    <textarea
                      className="textarea"
                      value={tasksCarriedOver}
                      onChange={(e) => setTasksCarriedOver(e.target.value)}
                      onBlur={persistField}
                      placeholder={SCORECARD_COPY.tasksCarriedOverPlaceholder}
                      disabled={weekClosed}
                      rows={3}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.biggestWinLabel}</label>
                {isSubmitted ? (
                  <p className="muted" style={{ margin: 0 }}>{weeklyWin || '\u2014'}</p>
                ) : (
                  <textarea
                    className="textarea"
                    value={weeklyWin}
                    onChange={(e) => setWeeklyWin(e.target.value)}
                    onBlur={persistField}
                    placeholder={SCORECARD_COPY.biggestWinPlaceholder}
                    disabled={weekClosed}
                    rows={3}
                  />
                )}
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.learningLabel}</label>
                {isSubmitted ? (
                  <p className="muted" style={{ margin: 0 }}>{weeklyLearning || '\u2014'}</p>
                ) : (
                  <textarea
                    className="textarea"
                    value={weeklyLearning}
                    onChange={(e) => setWeeklyLearning(e.target.value)}
                    onBlur={persistField}
                    placeholder={SCORECARD_COPY.learningPlaceholder}
                    disabled={weekClosed}
                    rows={3}
                  />
                )}
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.weekRatingLabel}</label>
                {isSubmitted ? (
                  <p className="muted" style={{ margin: 0 }}>{weekRating ? `${weekRating} / 5` : '\u2014'}</p>
                ) : (
                  <>
                    <div className="scorecard-rating-row">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`scorecard-yn-btn${weekRating === n ? ' active' : ''}`}
                          onClick={() => setWeekRating(n)}
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
                  </>
                )}
              </div>
            </div>

            {saveError && !isSubmitted && (
              <p className="muted" style={{ color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>{saveError}</p>
            )}
            {submitError && !isSubmitted && (
              <p className="muted" style={{ color: 'var(--miss)', textAlign: 'center', marginTop: 8 }}>{submitError}</p>
            )}

            {renderHistory()}
          </motion.div>
        </AnimatePresence>
      </div>

      {!isSubmitted && !weekClosed && (
        <div className="scorecard-sticky-bar">
          <span className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
            {SCORECARD_COPY.stickyNote}
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {SCORECARD_COPY.submitCta}
          </button>
        </div>
      )}
    </div>
  );
}
