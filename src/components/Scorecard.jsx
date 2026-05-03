import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiTemplates,
  fetchWeeklyKpiSelection,
  fetchAdminSetting,
  fetchScorecards,
  fetchGrowthPriorities,
  upsertScorecard,
} from '../lib/supabase.js';
import { getMondayOf, isWeekClosed, formatWeekRange, effectiveResult } from '../lib/week.js';
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  SCORECARD_COPY,
  GROWTH_FOLLOWUP_FIELDS,
  GROWTH_FOLLOWUP_COPY,
  effectivePartnerScope,
} from '../data/content.js';

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

  // UAT C1: growth_followup JSONB form state. Schema is partner-driven via
  // GROWTH_FOLLOWUP_FIELDS and persists in scorecards.growth_followup
  // (migration 012). Self-chosen growth is rendered read-only above the form.
  const [growthFollowup, setGrowthFollowup] = useState({});
  const [growthPriorities, setGrowthPriorities] = useState([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // UAT C5: confirmation modal before persistDraft+submit fires.
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  // UAT C6: completion message picked once on submit success and held in
  // state so the post-submit view shows a stable string until the partner
  // navigates away (re-pick on next mount only).
  const [completionMessage, setCompletionMessage] = useState(null);

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

  // BUG-2026-04-25 hydration gate: persistDraft writes the ENTIRE row from
  // React state via Supabase upsert (which only updates supplied columns).
  // If any persist trigger fires BEFORE the mount fetch hydrates state,
  // every supplied column (kpi_results, weekly_win, weekly_learning,
  // week_rating, growth_followup, etc.) is written from initial useState
  // defaults — empty/null — overwriting the partner's submitted data.
  // We flip this ref to true only after the Promise.all hydration completes,
  // and gate every persist path on it.
  const hydratedRef = useRef(false);

  // ---- Derived values (before early returns) ----

  const weekClosed = useMemo(() => isWeekClosed(currentWeekOf), [currentWeekOf]);

  const historyRows = useMemo(
    () => allScorecards.filter((s) => s.week_of !== currentWeekOf),
    [allScorecards, currentWeekOf]
  );

  // ---- Mount guards + data fetch (Pattern 5 — composite fetch) ----
  useEffect(() => {
    // WR-07: Register cleanup BEFORE the early-return so any future side effect
    // added to the redirect path still cleans up its timers.
    const cleanup = () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };

    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return cleanup;
    }

    Promise.all([
      fetchKpiTemplates(),
      fetchWeeklyKpiSelection(partner, currentWeekOf),
      partner === 'jerry'
        ? fetchAdminSetting('jerry_sales_kpi_active').then((r) => r?.value === true)
        : Promise.resolve(false),
      fetchScorecards(partner),
      // UAT C1: growth priorities drive the mandatory + self-chosen reminders
      // alongside the KPI grid. Fetched on mount, refreshed only on partner
      // change (matches the existing kpi_templates fetch lifecycle).
      fetchGrowthPriorities(partner).catch(() => []),
    ])
      .then(([templates, sel, jerryActive, scorecards, growth]) => {
        setAllScorecards(scorecards);
        setGrowthPriorities(growth ?? []);

        // Empty guard: no weekly KPI selected for current week
        if (!sel || !sel.kpi_template_id) {
          setRows([]);
          setNoSelection(true);
          return;
        }

        // Compose rows (Pattern 5): mandatory (non-conditional) + conditional (if jerry+active) + weekly choice
        const scope = effectivePartnerScope(partner);
        const mandatory = templates.filter(
          (t) =>
            t.mandatory === true &&
            (t.partner_scope === scope || t.partner_scope === 'both' || t.partner_scope === 'shared') &&
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
            pending_text: existing?.pending_text ?? '',
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
          setGrowthFollowup(thisWeekRow.growth_followup ?? {});
        } else if (thisWeekRow) {
          // Partial draft row exists. Hydrate reflection fields if present.
          setCommittedAt(thisWeekRow.committed_at ?? null);
          setTasksCompleted(thisWeekRow.tasks_completed ?? '');
          setTasksCarriedOver(thisWeekRow.tasks_carried_over ?? '');
          setWeeklyWin(thisWeekRow.weekly_win ?? '');
          setWeeklyLearning(thisWeekRow.weekly_learning ?? '');
          setWeekRating(thisWeekRow.week_rating ?? null);
          setGrowthFollowup(thisWeekRow.growth_followup ?? {});
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => {
        // BUG-2026-04-25: flip hydration gate AFTER the Promise.all chain
        // resolves (success or failure). Set BEFORE setLoading(false) so
        // any blur/keystroke that fires immediately on the first painted
        // frame already sees hydratedRef=true. The .catch path also flips
        // it because setLoadError renders a different UI (no inputs), so
        // a stale persist can't be triggered there anyway — but keeping
        // the flip in .finally ensures the gate doesn't permanently block.
        hydratedRef.current = true;
        setLoading(false);
      });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  // Auto-save when weekRating changes (after initial mount)
  useEffect(() => {
    if (!weekRatingInitialized.current) {
      weekRatingInitialized.current = true;
      return;
    }
    if (weekClosed) return;
    // WR-04: call without arg so persistDraft reads the current kpiResults state
    // rather than a potentially stale closure snapshot.
    // UAT 2026-04-27: removed view==='submitted' gate — week rating stays
    // editable until Saturday close per the extended D-16 reopen window.
    persistDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRating]);

  // ---- Handlers ----

  // Build kpi_results JSONB for a scorecards upsert (Pitfall 1 — key by kpi_template_id,
  // include label: tpl.baseline_action so seasonStats.js continues to work label-keyed).
  function buildKpiResultsPayload(draft) {
    return Object.fromEntries(
      rows.map((tpl) => {
        const entry = draft[tpl.id] ?? { result: null, reflection: '', count: 0, pending_text: '' };
        const payload = {
          result: entry.result ?? null,
          reflection: entry.reflection ?? '',
          label: tpl.baseline_action,
        };
        if (tpl.countable) {
          payload.count = Number(entry.count ?? 0);
        }
        // Phase 17 D-01 + Pitfall 4 (Q1 strategy a): persist pending_text whenever the entry has it.
        // - When result === 'pending', pending_text holds the active commitment.
        // - When result === 'yes' (yes-conversion), preserve prior pending_text so SaturdayRecapStop
        //   can attribute the conversion at next Monday's recap.
        if (entry.result === 'pending') {
          payload.pending_text = entry.pending_text ?? '';
        } else if ((entry.pending_text ?? '') !== '') {
          payload.pending_text = entry.pending_text;
        }
        return [tpl.id, payload];
      })
    );
  }

  // Draft persist — same shape as submit but without final submitted_at semantics.
  // Callers may pass an explicit `nextKpiResults` when they have already computed
  // the next value (e.g. `setResult` — React state hasn't flushed yet). When no
  // argument is supplied, we fall back to the closed-over `kpiResults` state.
  // WR-04: this keeps the single source of truth consistent — the weekRating
  // effect calls `persistDraft()` with no arg so it reads the latest state.
  async function persistDraft(nextKpiResults) {
    if (weekClosed) return;
    // BUG-2026-04-25 hydration gate: never write before mount fetch hydrates
    // state from DB. Without this, any path that calls persistDraft pre-
    // hydration writes the initial useState defaults (kpi_results={}, win='',
    // learning='', week_rating=null, growth_followup={}) over the partner's
    // submitted row. The upsert preserves submitted_at because it isn't in
    // the payload, leaving a row with submitted_at + everything else wiped.
    if (!hydratedRef.current) return;
    // BUG-2026-04-25 rows guard: buildKpiResultsPayload returns {} when
    // rows=[]; calling upsertScorecard with kpi_results={} unconditionally
    // overwrites a previously-good submission. There is no legitimate
    // reason to persist a draft when the row composition has not loaded —
    // the partner cannot have edited anything yet — so bail.
    if (rows.length === 0) return;
    // UAT 2026-04-27: extended D-16 — all scorecard fields stay editable until
    // Saturday close, not just Pending re-open. The previous submitted-mode
    // pending-only guard (and its CR-01 yes-conversion patch) are no longer
    // needed: weekClosed is now the single policy gate. The hydratedRef +
    // rows.length defenses above (BUG-2026-04-25) are correctness guards and
    // remain in place.
    const draft = nextKpiResults ?? kpiResults;
    setSaving(true);
    setSaveError(null);
    try {
      const nowIso = new Date().toISOString();
      const row = await upsertScorecard({
        partner,
        week_of: currentWeekOf,
        kpi_results: buildKpiResultsPayload(draft),
        committed_at: committedAt ?? nowIso,
        tasks_completed: tasksCompleted,
        tasks_carried_over: tasksCarriedOver,
        weekly_win: weeklyWin,
        weekly_learning: weeklyLearning,
        week_rating: weekRating,
        // UAT C1: persist mandatory growth follow-up alongside the rest of the
        // scorecard. Empty object is the default — pre-Phase-C1 rows hydrate
        // unchanged because the column ships with default '{}'.
        growth_followup: growthFollowup ?? {},
      });
      if (!committedAt) setCommittedAt(row.committed_at ?? nowIso);
      setAllScorecards((prev) => {
        const without = prev.filter((s) => s.week_of !== row.week_of);
        return [row, ...without].sort((a, b) => b.week_of.localeCompare(a.week_of));
      });
      // Saved-indicator debounce: wait 800ms after the last persist before showing
      // "Saved" so rapid typing doesn't flash the indicator on every keystroke.
      // Then auto-hide 2000ms later for a brief confirmation pulse.
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
    // UAT 2026-04-27 (extended D-16): partners can edit ANY result until
    // Saturday close, not just Pending re-open. Submit state is informational
    // only; weekClosed is the single editability gate. pending_text is
    // PRESERVED on toggle (Q1 strategy a) so SaturdayRecap can detect
    // yes-conversion on the resulting persisted row.
    if (weekClosed) return;
    const current = kpiResults[templateId] ?? { result: null, reflection: '', count: 0, pending_text: '' };
    const next = {
      ...kpiResults,
      [templateId]: {
        result,
        reflection: current.reflection ?? '',
        count: current.count ?? 0,
        pending_text: current.pending_text ?? '',
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
        pending_text: prev[templateId]?.pending_text ?? '',
      },
    }));
  }

  function setPendingTextLocal(templateId, text) {
    setKpiResults((prev) => ({
      ...prev,
      [templateId]: {
        result: prev[templateId]?.result ?? null,
        reflection: prev[templateId]?.reflection ?? '',
        count: prev[templateId]?.count ?? 0,
        pending_text: text,
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
        pending_text: prev[templateId]?.pending_text ?? '',
      },
    }));
  }

  function persistField() {
    // UAT 2026-04-27: extended D-16 — all fields editable until Saturday close.
    // weekClosed is the only persistence gate.
    if (weekClosed) return;
    persistDraft(kpiResults);
  }

  // UAT C5: validate + open confirmation modal. The actual persist happens in
  // performSubmit (called from the confirm modal's primary CTA). This split
  // keeps validation errors visible without blocking the modal flow on success.
  function handleSubmit() {
    if (submitting) return;
    // WR-02: Force-blur the active element so any pending textarea onBlur
    // (which calls persistField → persistDraft) commits before we read
    // weeklyWin / weeklyLearning / tasks_* from React closure for the
    // submit payload. On mobile, tapping the Submit button does NOT fire
    // a blur on the previously-focused field, so without this we would
    // submit stale free-text values.
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    // WR-04: Clear stale draft-save errors at the start of submit so an
    // earlier persistDraft failure that the user has since recovered from
    // doesn't reappear when admin reopens the week.
    setSubmitError(null);
    setSaveError(null);
    // Defensive: rows must exist before submit. Array.some() on [] returns
    // false, so without this guard an empty-rows state would pass the
    // incomplete check and write a submitted row with kpi_results={}.
    if (rows.length === 0) {
      setSubmitError(SCORECARD_COPY.submitErrorIncomplete);
      return;
    }
    const incomplete = rows.some((tpl) => {
      const r = kpiResults[tpl.id]?.result;
      return r !== 'yes' && r !== 'no' && r !== 'pending';
    });
    if (incomplete) {
      setSubmitError(SCORECARD_COPY.submitErrorIncomplete);
      return;
    }
    // Phase 17 D-06 / KPI-02: every Pending row needs a non-empty 'what + by when' commitment.
    const pendingMissingText = rows.some((tpl) => {
      const entry = kpiResults[tpl.id];
      if (entry?.result !== 'pending') return false;
      return (entry.pending_text ?? '').trim().length === 0;
    });
    if (pendingMissingText) {
      setSubmitError(SCORECARD_COPY.submitErrorPendingTextRequired);
      return;
    }
    // Validation passed -- open the confirmation modal. The user must click
    // Confirm to actually persist (UAT C5).
    setConfirmingSubmit(true);
  }

  function cancelSubmitConfirm() {
    setConfirmingSubmit(false);
  }

  async function performSubmit() {
    if (submitting) return;
    setConfirmingSubmit(false);
    setSubmitting(true);
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
        // UAT C1: include growth_followup on submit (same persist path as draft).
        growth_followup: growthFollowup ?? {},
      });
      setView('submitted');
      // UAT C6: pick a completion message at random for the post-submit state.
      // Stable for this view -- the partner only sees one variant per submission.
      const messages = SCORECARD_COPY.completionMessages ?? [];
      if (messages.length > 0) {
        const pick = messages[Math.floor(Math.random() * messages.length)];
        setCompletionMessage(pick);
      }
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
              // WR-08: Hit rate denominator only counts answered KPIs (yes|no).
              // Admin overrides can leave a row with result=null; counting those
              // would render misleading fractions like "3/7" when one of the 7
              // was never rated.
              // Phase 17 D-02: aggregate via effectiveResult — historical rows are
              // by definition closed weeks, so any raw 'pending' coerces to 'no'.
              const answeredIds = allResultIds.filter((id) => {
                const eff = effectiveResult(rowResults[id]?.result, row.week_of);
                return eff === 'yes' || eff === 'no';
              });
              const totalKpis = answeredIds.length;
              const hitCount = answeredIds.reduce(
                (n, id) => (effectiveResult(rowResults[id]?.result, row.week_of) === 'yes' ? n + 1 : n),
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
                          const eff = effectiveResult(rowResults[id]?.result, row.week_of);
                          const cls = eff === 'yes' ? 'yes' : eff === 'no' ? 'no' : 'null';
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
                        const rawResult = r?.result;
                        // Phase 17 D-02: read-time coercion. Historical rows are closed weeks,
                        // so any raw 'pending' renders as Not Met with a muted "Pending \u2192 No" badge.
                        const effective = effectiveResult(rawResult, row.week_of);
                        const label = r?.label || currentLabelMap[id] || '(Previous KPI)';
                        const resultLabel = effective === 'yes' ? 'Met' : effective === 'no' ? 'Not Met' : '\u2014';
                        const resultClass = effective === 'yes' ? 'yes' : effective === 'no' ? 'no' : 'null';
                        const isLivePending = rawResult === 'pending' && effective === 'pending';
                        const isClosedPending = rawResult === 'pending' && effective === 'no';
                        return (
                          <div key={id} className="scorecard-history-kpi-detail">
                            <div className="scorecard-history-kpi-label">
                              {label}
                              {isLivePending && (
                                <span className="pending-badge">{SCORECARD_COPY.pendingBadge}</span>
                              )}
                              {isClosedPending && (
                                <span className="pending-badge muted">{SCORECARD_COPY.pendingBadgeMuted}</span>
                              )}
                            </div>
                            <div className={`scorecard-history-kpi-result ${resultClass}`}>{resultLabel}</div>
                            {rawResult === 'pending' && (r?.pending_text ?? '').trim() !== '' && (
                              <div className="scorecard-history-kpi-reflection" style={{ fontStyle: 'italic' }}>
                                {SCORECARD_COPY.bySaturdayPrefix}{r.pending_text}
                              </div>
                            )}
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
      <div className="container" style={{ paddingBottom: !weekClosed && !isSubmitted ? 96 : undefined }}>
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

            {/* UAT 2026-04-27: post-submit banner. The completion message bubble
                appears once-per-submission (state-pinned). Below it, a small
                status line states the editability window — "Editable until
                Saturday at 11:59 PM" while the week is open, swapping to the
                weekClosed banner once Saturday close fires. */}
            {isSubmitted && (
              <div className="scorecard-commit-gate" style={{ marginBottom: 16 }}>
                <p className="muted" style={{ margin: 0 }}>
                  {/* UAT C6: rotated completion message picked once on submit;
                      falls back to the canonical submittedNotice on remount. */}
                  {completionMessage ?? SCORECARD_COPY.submittedNotice}
                  {committedAt && (
                    <>
                      {' '}
                      <span style={{ opacity: 0.85 }}>
                        {SCORECARD_COPY.submittedOnPrefix}
                        {new Date(committedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </p>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12, fontStyle: 'italic' }}>
                  {weekClosed
                    ? SCORECARD_COPY.weekClosedBanner(formatWeekRange(currentWeekOf))
                    : SCORECARD_COPY.editableUntilSaturday}
                </p>
              </div>
            )}

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

            {weekClosed && !isSubmitted && (
              <p className="muted" style={{ marginBottom: 16 }}>
                {SCORECARD_COPY.weekClosedBanner(formatWeekRange(currentWeekOf))}
              </p>
            )}

            {/* UAT C1: self-chosen growth reminder — read-only, top of scorecard */}
            <SelfChosenGrowthReminder growthPriorities={growthPriorities} />


            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rows.map((tpl) => {
                const entry = kpiResults[tpl.id] || { result: null, reflection: '', count: 0, pending_text: '' };
                // Phase 17 D-02 / D-07: derive effective result + closed-pending modifier.
                const effective = effectiveResult(entry.result, currentWeekOf);
                const isLivePending = entry.result === 'pending' && effective === 'pending';
                const isClosedPending = entry.result === 'pending' && effective === 'no';
                // UAT 2026-04-27: extended D-16 — every field stays editable until
                // Saturday close. weekClosed is the single editability gate.
                // isPendingReopen now flags only "this is a post-submit edit of a
                // Pending row" for the inline hint copy, not for input gating.
                const isPendingReopen = isSubmitted && !weekClosed && entry.result === 'pending';
                const rowClass = [
                  'scorecard-kpi-row',
                  entry.result === 'yes' ? 'yes' : '',
                  entry.result === 'no' ? 'no' : '',
                  entry.result === 'pending' ? 'pending' : '',
                  isClosedPending ? 'muted' : '',
                ].filter(Boolean).join(' ');
                const pickerDisabled = weekClosed;
                const bodyDisabled = weekClosed;
                const showEditablePicker = !weekClosed;
                return (
                  <div key={tpl.id} className={rowClass}>
                    <div className="scorecard-baseline-label">
                      {tpl.baseline_action}
                      {isLivePending && (
                        <span className="pending-badge">{SCORECARD_COPY.pendingBadge}</span>
                      )}
                      {isClosedPending && (
                        <span className="pending-badge muted">{SCORECARD_COPY.pendingBadgeMuted}</span>
                      )}
                    </div>
                    <div className="scorecard-growth-clause">
                      {SCORECARD_COPY.growthPrefix} {tpl.growth_clause}
                    </div>

                    {isPendingReopen && (
                      <div className="scorecard-pending-update-note">{SCORECARD_COPY.pendingUpdateNote}</div>
                    )}

                    {showEditablePicker ? (
                      <div className="scorecard-yn-row">
                        <button
                          type="button"
                          className={`scorecard-yn-btn yes${entry.result === 'yes' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'yes')}
                          disabled={pickerDisabled}
                        >
                          Met
                        </button>
                        <button
                          type="button"
                          className={`scorecard-yn-btn no${entry.result === 'no' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'no')}
                          disabled={pickerDisabled}
                        >
                          Not Met
                        </button>
                        <button
                          type="button"
                          className={`scorecard-yn-btn pending${entry.result === 'pending' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'pending')}
                          disabled={pickerDisabled}
                        >
                          {SCORECARD_COPY.pendingBtn}
                        </button>
                      </div>
                    ) : (
                      <div className="scorecard-yn-row">
                        <span
                          className={`scorecard-yn-btn ${effective === 'yes' ? 'yes active' : effective === 'no' ? 'no active' : ''}`}
                          style={{ cursor: 'default' }}
                        >
                          {effective === 'yes' ? 'Met' : effective === 'no' ? 'Not Met' : '\u2014'}
                        </span>
                      </div>
                    )}

                    {/* Pending follow-through textarea reveal \u2014 D-06.
                        Mounted only when result === 'pending'; the .expanded modifier drives
                        the CSS max-height transition. Read-only when not editable. */}
                    <div className={`scorecard-pending-reveal${entry.result === 'pending' ? ' expanded' : ''}`}>
                      {entry.result === 'pending' && (
                        showEditablePicker ? (
                          <>
                            <label className="scorecard-reflection-label" htmlFor={`pending-${tpl.id}`}>
                              {SCORECARD_COPY.pendingFollowThroughLabel}
                            </label>
                            <textarea
                              id={`pending-${tpl.id}`}
                              rows={2}
                              value={entry.pending_text ?? ''}
                              onChange={(e) => setPendingTextLocal(tpl.id, e.target.value)}
                              onBlur={persistField}
                              placeholder={SCORECARD_COPY.pendingFollowThroughPlaceholder}
                              disabled={pickerDisabled}
                            />
                          </>
                        ) : (
                          (entry.pending_text ?? '').trim() !== '' && (
                            <div style={{ fontStyle: 'italic', color: 'var(--muted)', marginTop: 8 }}>
                              {SCORECARD_COPY.bySaturdayPrefix}{entry.pending_text}
                            </div>
                          )
                        )
                      )}
                    </div>

                    {tpl.countable && (
                      <div className="scorecard-count-field" style={{ marginTop: 12 }}>
                        <label className="scorecard-reflection-label">{SCORECARD_COPY.countLabel}</label>
                        {bodyDisabled ? (
                          <span>{entry.count ?? 0}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            className="scorecard-count-input"
                            value={entry.count ?? 0}
                            onChange={(e) => setCountLocal(tpl.id, e.target.value)}
                            onBlur={persistField}
                            disabled={bodyDisabled}
                          />
                        )}
                      </div>
                    )}

                    <div className="scorecard-reflection" style={{ marginTop: 12 }}>
                      <label className="scorecard-reflection-label">{SCORECARD_COPY.reflectionLabel}</label>
                      {bodyDisabled ? (
                        <p className="muted" style={{ margin: 0 }}>{entry.reflection || '\u2014'}</p>
                      ) : (
                        <textarea
                          value={entry.reflection}
                          onChange={(e) => setReflectionLocal(tpl.id, e.target.value)}
                          onBlur={persistField}
                          disabled={bodyDisabled}
                          rows={3}
                          placeholder={SCORECARD_COPY.reflectionPlaceholder}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UAT C1: mandatory growth weekly follow-up form — between KPI rows and Weekly Reflection */}
            <MandatoryGrowthFollowupForm
              partner={partner}
              growthPriorities={growthPriorities}
              growthFollowup={growthFollowup}
              setGrowthFollowup={setGrowthFollowup}
              onPersist={persistField}
              disabled={weekClosed}
            />

            {/* Weekly Reflection section */}
            <div className="scorecard-reflection-section">
              <div className="eyebrow">{SCORECARD_COPY.weeklyReflectionHeading}</div>

              {/* UAT 2026-04-27: extended D-16 \u2014 Weekly Reflection block stays
                  fully editable through Saturday close regardless of submit state. */}
              <div className="scorecard-tasks-row">
                <div>
                  <label className="scorecard-reflection-label">{SCORECARD_COPY.tasksCompletedLabel}</label>
                  <textarea
                    className="textarea"
                    value={tasksCompleted}
                    onChange={(e) => setTasksCompleted(e.target.value)}
                    onBlur={persistField}
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
                    onChange={(e) => setTasksCarriedOver(e.target.value)}
                    onBlur={persistField}
                    placeholder={SCORECARD_COPY.tasksCarriedOverPlaceholder}
                    disabled={weekClosed}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.biggestWinLabel}</label>
                <textarea
                  className="textarea"
                  value={weeklyWin}
                  onChange={(e) => setWeeklyWin(e.target.value)}
                  onBlur={persistField}
                  placeholder={SCORECARD_COPY.biggestWinPlaceholder}
                  disabled={weekClosed}
                  rows={3}
                />
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.learningLabel}</label>
                <textarea
                  className="textarea"
                  value={weeklyLearning}
                  onChange={(e) => setWeeklyLearning(e.target.value)}
                  onBlur={persistField}
                  placeholder={SCORECARD_COPY.learningPlaceholder}
                  disabled={weekClosed}
                  rows={3}
                />
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.weekRatingLabel}</label>
                <div className="scorecard-rating-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`scorecard-rating-btn${weekRating === n ? ' active' : ''}`}
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
              </div>
            </div>

            {saveError && (
              <p className="muted" style={{ color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>{saveError}</p>
            )}
            {submitError && (
              <p className="muted" style={{ color: 'var(--miss)', textAlign: 'center', marginTop: 8 }}>{submitError}</p>
            )}

            {renderHistory()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* UAT 2026-04-27 (extended D-16): sticky submit bar shows ONLY in pre-submit
          editing mode while the week is open. Once submitted, all fields stay editable
          but auto-save handles every change silently — no "Resubmit" CTA so the partner
          isn't tempted into thinking the auto-saved edits aren't already persisted.
          After Saturday close the bar disappears regardless of submit state. */}
      {!weekClosed && !isSubmitted && (
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

      {/* UAT C5: submit confirmation overlay — rendered above the sticky bar. */}
      {confirmingSubmit && (
        <div
          className="scorecard-submit-confirm-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
          }}
          onClick={cancelSubmitConfirm}
        >
          <div
            className="scorecard-submit-confirm-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '24px 24px 20px',
              borderRadius: 14,
              background: 'var(--card, #1a1a1a)',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {SCORECARD_COPY.submitConfirmEyebrow}
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, lineHeight: 1.3 }}>
              {SCORECARD_COPY.submitConfirmHeading}
            </h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
              {SCORECARD_COPY.submitConfirmBody}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelSubmitConfirm}
                disabled={submitting}
              >
                {SCORECARD_COPY.submitConfirmCancelCta}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={performSubmit}
                disabled={submitting}
              >
                {submitting ? SCORECARD_COPY.submitConfirmSubmittingCta : SCORECARD_COPY.submitConfirmCta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// UAT C1: SelfChosenGrowthReminder — top-of-scorecard read-only reminder card
// surfacing the partner's self-chosen personal growth priority. No inputs
// (the self-chosen priority is intentionally NOT tracked weekly per spec).
// --------------------------------------------------------------------------

function SelfChosenGrowthReminder({ growthPriorities }) {
  const selfChosen = (growthPriorities ?? []).find(
    (g) => g.type === 'personal' && g.subtype === 'self_personal'
  );
  if (!selfChosen) return null;
  const description = selfChosen.description || selfChosen.custom_text || '';
  if (!description) return null;
  return (
    <div
      className="scorecard-self-chosen-reminder"
      style={{
        padding: '12px 16px',
        marginBottom: 20,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
      }}
    >
      <div
        className="eyebrow"
        style={{ fontSize: 11, marginBottom: 4, color: 'var(--muted)' }}
      >
        {GROWTH_FOLLOWUP_COPY.selfChosenEyebrow}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{description}</div>
      <div
        className="muted"
        style={{ fontSize: 12, marginTop: 4, fontStyle: 'italic' }}
      >
        {GROWTH_FOLLOWUP_COPY.selfChosenSubtext}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// UAT C1: MandatoryGrowthFollowupForm — partner-specific structured follow-up
// for the mandatory personal growth priority. Field shape is content-driven
// (GROWTH_FOLLOWUP_FIELDS keyed by partner). Persists into
// scorecards.growth_followup JSONB on blur via the same persistField path
// used by reflection / count fields.
// --------------------------------------------------------------------------

function MandatoryGrowthFollowupForm({
  partner,
  growthPriorities,
  growthFollowup,
  setGrowthFollowup,
  onPersist,
  disabled,
}) {
  const fields = GROWTH_FOLLOWUP_FIELDS[partner];
  if (!fields || fields.length === 0) return null; // 'test' partner or unknown

  const mandatory = (growthPriorities ?? []).find(
    (g) =>
      g.type === 'personal' &&
      // Mandatory subtype labels vary across seeds; treat any non-self-chosen personal as mandatory.
      g.subtype !== 'self_personal'
  );
  const mandatoryDescription = mandatory?.description || mandatory?.custom_text || '';

  function setField(key, value) {
    setGrowthFollowup((prev) => ({ ...(prev ?? {}), [key]: value }));
  }

  return (
    <div
      className="scorecard-growth-followup"
      style={{
        marginTop: 24,
        padding: '20px 20px 16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {GROWTH_FOLLOWUP_COPY.eyebrow}
      </div>
      <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>
        {GROWTH_FOLLOWUP_COPY.heading}
      </h3>
      {mandatoryDescription ? (
        <p
          className="muted"
          style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.55 }}
        >
          {mandatoryDescription}
        </p>
      ) : (
        <p className="muted" style={{ margin: '0 0 16px', fontSize: 14, fontStyle: 'italic' }}>
          {GROWTH_FOLLOWUP_COPY.emptyMandatory}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fields.map((f) => {
          const value = (growthFollowup ?? {})[f.key] ?? '';
          return (
            <div key={f.key}>
              <label className="scorecard-reflection-label" htmlFor={`growth-followup-${f.key}`}>
                {f.label}
              </label>
              {disabled ? (
                <p className="muted" style={{ margin: 0 }}>{value || '—'}</p>
              ) : f.kind === 'textarea' ? (
                <textarea
                  id={`growth-followup-${f.key}`}
                  className="textarea"
                  rows={2}
                  value={value}
                  placeholder={f.placeholder}
                  onChange={(e) => setField(f.key, e.target.value)}
                  onBlur={onPersist}
                />
              ) : (
                <input
                  id={`growth-followup-${f.key}`}
                  type="text"
                  className="input"
                  value={value}
                  placeholder={f.placeholder}
                  onChange={(e) => setField(f.key, e.target.value)}
                  onBlur={onPersist}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
