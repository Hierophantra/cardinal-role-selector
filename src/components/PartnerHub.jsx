import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  fetchSubmission,
  fetchSubmissions,
  fetchKpiSelections,
  fetchScorecards,
  fetchWeeklyKpiSelection,
  fetchPreviousWeeklyKpiSelection,
  fetchGrowthPriorities,
  fetchBusinessPriorities,
  upsertGrowthPriority,
  incrementKpiCounter,
} from '../lib/supabase.js';
import { getMondayOf } from '../lib/week.js';
import { computeSeasonStats, computeStreaks, computeWeekNumber, getPerformanceColor } from '../lib/seasonStats.js';
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  HUB_COPY,
  SCORECARD_COPY,
  PROGRESS_COPY,
} from '../data/content.js';
import { ROLE_IDENTITY } from '../data/roles.js';
import RoleIdentitySection from './RoleIdentitySection.jsx';
import ThisWeekKpisSection from './ThisWeekKpisSection.jsx';
import PersonalGrowthSection from './PersonalGrowthSection.jsx';
import BusinessPrioritiesSection from './BusinessPrioritiesSection.jsx';

export default function PartnerHub() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const adminView = new URLSearchParams(location.search).get('admin') === '1';

  // ---- Data state ----
  const [submission, setSubmission] = useState(null);
  const [kpiSelections, setKpiSelections] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [allSubs, setAllSubs] = useState([]);
  const [weeklySelection, setWeeklySelection] = useState(null);
  const [previousSelection, setPreviousSelection] = useState(null);
  const [growthPriorities, setGrowthPriorities] = useState([]);
  const [businessPriorities, setBusinessPriorities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ---- UI toggle state (D-09, D-02) — declared BEFORE early return per D-24 / P-U2 ----
  const [focusAreasOpen, setFocusAreasOpen] = useState(true);       // D-09 expanded by default
  const [dayInLifeOpen, setDayInLifeOpen] = useState(false);        // D-09 collapsed by default
  const [narrativeExpanded, setNarrativeExpanded] = useState(false); // D-02 collapsed by default

  // ---- Derived before early return ----
  // WR-03: Anchor currentMonday in a ref so a midnight Sunday→Monday rollover
  // mid-session doesn't change the captured fetch effect's week. Matches the
  // pattern in Scorecard.jsx and WeeklyKpiSelectionFlow.jsx.
  const currentMondayRef = useRef(getMondayOf());
  const currentMonday = currentMondayRef.current;
  const role = ROLE_IDENTITY[partner];  // undefined for 'test' partner — defensive

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
      fetchWeeklyKpiSelection(partner, currentMonday),
      fetchPreviousWeeklyKpiSelection(partner, currentMonday),
      fetchGrowthPriorities(partner),
      fetchBusinessPriorities(),
    ])
      .then(([sub, sels, cards, subs, thisWeek, prevWeek, growth, bizPriorities]) => {
        setSubmission(sub);
        setKpiSelections(sels);
        setScorecards(cards);
        setAllSubs(subs);
        setWeeklySelection(thisWeek);
        setPreviousSelection(prevWeek);
        setGrowthPriorities(growth);
        setBusinessPriorities(bizPriorities);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner, navigate]);

  // kpiReady gating per D-06 — partner has selections, ready to use KPI features
  const kpiReady = kpiSelections.length > 0;

  const seasonStats = useMemo(
    () => (kpiReady ? computeSeasonStats(kpiSelections, scorecards) : null),
    [kpiReady, kpiSelections, scorecards]
  );
  const streaks = useMemo(
    () => (kpiReady ? computeStreaks(kpiSelections, scorecards) : []),
    [kpiReady, kpiSelections, scorecards]
  );
  const weekNumber = useMemo(() => computeWeekNumber(), []);
  const worstStreak = useMemo(() => {
    if (!streaks.length) return null;
    const active = streaks.filter((s) => s.streak >= 2);
    if (!active.length) return null;
    return active.reduce((worst, s) => (s.streak > worst.streak ? s : worst), active[0]);
  }, [streaks]);

  const mandatorySelections = useMemo(
    () => kpiSelections.filter((s) => s.kpi_templates?.mandatory),
    [kpiSelections]
  );

  const thisWeekCard = useMemo(
    () => scorecards.find((s) => s.week_of === currentMonday) ?? null,
    [scorecards, currentMonday]
  );

  // ---- Counter state + 500ms batched debounce (Phase 16 COUNT-01..03; RESEARCH Pitfall 2) ----
  const [counters, setCounters] = useState({});
  const timersRef = useRef({});
  const pendingDeltaRef = useRef({});
  // Serialize all counter writes through a single promise chain (WR-02) —
  // prevents concurrent timers for different templates from racing each other's
  // read-modify-write on the counter_value JSONB column.
  const counterQueueRef = useRef(Promise.resolve());

  // Seed counters from DB when weeklySelection loads (COUNT-04 reload persistence)
  useEffect(() => {
    if (weeklySelection?.counter_value) {
      setCounters(weeklySelection.counter_value);
    }
  }, [weeklySelection]);

  function handleIncrementCounter(templateId) {
    // Optimistic local update — UI reflects all taps immediately.
    setCounters((prev) => ({ ...prev, [templateId]: (prev[templateId] ?? 0) + 1 }));
    // Accumulate per-template delta (Pitfall 2: batched debounce so rapid taps don't lose increments).
    pendingDeltaRef.current[templateId] = (pendingDeltaRef.current[templateId] ?? 0) + 1;
    if (timersRef.current[templateId]) clearTimeout(timersRef.current[templateId]);
    timersRef.current[templateId] = setTimeout(() => {
      const delta = pendingDeltaRef.current[templateId] ?? 0;
      pendingDeltaRef.current[templateId] = 0;
      // Chain onto the shared queue so concurrent timers across templates do not
      // overlap their fetch→compute→upsert windows and clobber each other.
      counterQueueRef.current = counterQueueRef.current
        .then(async () => {
          for (let i = 0; i < delta; i++) {
            await incrementKpiCounter(partner, currentMonday, templateId);
          }
        })
        .catch((err) => console.error(err));
    }, 500);
  }

  // WR-01: On unmount, flush any pending counter increments rather than just
  // clearing the debounce timers. Otherwise rapid taps + immediate navigation
  // shows the optimistic +N in UI but only landed +N-K writes in DB; the
  // user's count silently reverts on next page load.
  useEffect(() => () => {
    const partnerSnapshot = partner;
    const mondaySnapshot = currentMondayRef.current;
    Object.entries(timersRef.current).forEach(([templateId, t]) => {
      clearTimeout(t);
      const delta = pendingDeltaRef.current[templateId] ?? 0;
      if (delta > 0) {
        pendingDeltaRef.current[templateId] = 0;
        counterQueueRef.current = counterQueueRef.current
          .then(async () => {
            for (let i = 0; i < delta; i++) {
              await incrementKpiCounter(partnerSnapshot, mondaySnapshot, templateId);
            }
          })
          .catch((err) => console.error(err));
      }
    });
  }, [partner]);

  // IN-06: weeklyChoiceLocked derivation removed — the only consumer was a
  // ThisWeekKpisSection prop that was eslint-disabled and never read.

  // Save handler for self-chosen growth (D-15, D-16). Called from PersonalGrowthSection.
  // No "pending" state — approval_state='approved' means locked on save.
  // Per checker N8 (2026-04-16): refetch is wrapped in its own try/catch so a
  // post-save fetch blip does NOT surface as "Couldn't save your priority."
  // The save itself is what the child component reports on; the refetch is best-effort.
  async function handleSaveSelfChosen(description) {
    await upsertGrowthPriority({
      partner,
      type: 'personal',
      subtype: 'self_personal',
      approval_state: 'approved',
      description,
      status: 'active',
    });
    try {
      const refetched = await fetchGrowthPriorities(partner);
      setGrowthPriorities(refetched);
    } catch (refetchErr) {
      // Save succeeded; refetch failed (network blip etc.). Log but don't rethrow.
      // The next page navigation will pull fresh data; the save itself is durable.
      console.error('growth priorities refetch failed after save', refetchErr);
    }
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const copy = HUB_COPY.partner;

  // Scorecard state derivation — kpiReady-based per D-06
  const committedThisWeek = Boolean(thisWeekCard?.committed_at);
  // UAT A1/A2 (2026-04-25): the scorecard composes 6 mandatory + 1 weekly choice = 7 rows
  // (Scorecard.jsx Pattern 5 composition). Count over the full set, not just mandatory,
  // so the hub-card "X of Y checked in" denominator matches Scorecard's "Y / 7" counter.
  // The weekly choice template_id lives in weeklySelection (weekly_kpi_selections row).
  const scorecardTemplateIds = [
    ...kpiSelections.map((k) => k.template_id),
    ...(weeklySelection?.kpi_template_id ? [weeklySelection.kpi_template_id] : []),
  ];
  // kpi_results is keyed by kpi_templates.id (v2.0 Scorecard write shape).
  // Phase 17 D-02: 'pending' is a fully-answered terminal state (partner picked it
  // and supplied pending_text) — count it as answered alongside 'yes' and 'no'.
  const scorecardAnsweredCount = thisWeekCard
    ? scorecardTemplateIds.reduce((n, tplId) => {
        const r = thisWeekCard.kpi_results?.[tplId]?.result;
        return r === 'yes' || r === 'no' || r === 'pending' ? n + 1 : n;
      }, 0)
    : 0;
  const scorecardTotalCount = scorecardTemplateIds.length;
  const scorecardAllComplete = thisWeekCard && scorecardTotalCount > 0
    ? scorecardTemplateIds.every((tplId) => {
        const r = thisWeekCard.kpi_results?.[tplId];
        if (!r || (r.result !== 'yes' && r.result !== 'no' && r.result !== 'pending')) return false;
        if (r.result === 'no') return r.reflection?.trim().length > 0;
        if (r.result === 'pending') return r.pending_text?.trim().length > 0;
        return true;
      })
    : false;
  const scorecardState = !kpiReady
    ? 'hidden'
    : scorecardAllComplete
      ? 'complete'
      : committedThisWeek
        ? 'inProgress'
        : 'notCommitted';

  const perKpiStats = seasonStats?.perKpiStats ?? [];
  const theoSubmitted = allSubs.some((s) => s.partner === 'theo');
  const jerrySubmitted = allSubs.some((s) => s.partner === 'jerry');
  const comparisonReady = theoSubmitted && jerrySubmitted;

  // UAT A2 (2026-04-25): When kpiReady, the scorecard hub-card already surfaces
  // commit/progress/complete state with the correct count. The duplicated
  // "This week: X of Y" status line above was wrong (was 0/6 because it counted
  // only mandatory selections, not the full 7) and redundant. Suppress the status
  // line entirely when kpiReady — partners get the truth from the scorecard card.
  const statusText = error
    ? copy.errorLoad
    : kpiReady
      ? null
      : (submission
          ? copy.status.roleCompleteNoKpis
          : copy.status.roleNotComplete);

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          {adminView && (
            <div className="nav-row" style={{ marginBottom: 12 }}>
              <Link to="/admin/hub" className="btn-ghost">
                {'\u2190'} Back to Trace Hub
              </Link>
            </div>
          )}
          <div className="eyebrow">{copy.eyebrow}</div>
          <div className="partner-greeting">
            <div className="screen-header">
              <h2>{copy.greeting(partnerName)}</h2>
            </div>
            {statusText && <p className="status-line">{statusText}</p>}
          </div>

          {/* Role Identity — renders immediately from static data (UI-SPEC success criterion 1, P-U1) */}
          {role && (
            <RoleIdentitySection
              role={role}
              narrativeExpanded={narrativeExpanded}
              onToggleNarrative={() => setNarrativeExpanded((v) => !v)}
              focusAreasOpen={focusAreasOpen}
              onToggleFocusAreas={() => setFocusAreasOpen((v) => !v)}
              dayInLifeOpen={dayInLifeOpen}
              onToggleDayInLife={() => setDayInLifeOpen((v) => !v)}
            />
          )}

          {/* Async content — only render after fetches resolve */}
          {loading ? null : (
            <>
              {/* This Week's KPIs (HUB-02..HUB-05) */}
              {kpiReady && (
                <ThisWeekKpisSection
                  partner={partner}
                  mandatorySelections={mandatorySelections}
                  thisWeekCard={thisWeekCard}
                  weeklySelection={weeklySelection}
                  previousSelection={previousSelection}
                  counters={counters}
                  onIncrementCounter={handleIncrementCounter}
                />
              )}

              {/* Personal Growth (HUB-06, HUB-07) — no `partner` prop per 15-02 M5 */}
              <PersonalGrowthSection
                growthPriorities={growthPriorities}
                onSaveSelfChosen={handleSaveSelfChosen}
              />

              {/* Business Priorities (Phase 18 BIZ-02, D-10) — shared, identical for both partners */}
              <BusinessPrioritiesSection priorities={businessPriorities} />

              {/* Workflow card grid (D-07 bottom; D-08 card roster) */}
              <div className="hub-grid">
                {/* Season Overview (kept, D-08) */}
                {kpiReady && (
                  <Link to={`/progress/${partner}`} className="hub-card">
                    <span className="eyebrow">SEASON OVERVIEW</span>
                    <h3>{PROGRESS_COPY.hubCard.title}</h3>
                    <p>{PROGRESS_COPY.hubCard.description}</p>
                    <span
                      className="progress-hit-rate"
                      style={{
                        color:
                          seasonStats?.seasonHitRate !== null
                            ? getPerformanceColor(seasonStats.seasonHitRate)
                            : 'var(--muted)',
                      }}
                    >
                      {seasonStats?.seasonHitRate !== null
                        ? PROGRESS_COPY.hubCard.hitRateFmt(seasonStats.seasonHitRate)
                        : PROGRESS_COPY.hubCard.hitRateEmpty}
                    </span>
                    <span className="progress-week-label">
                      {PROGRESS_COPY.hubCard.weekFmt(weekNumber)}
                    </span>
                    {worstStreak && (
                      <span className="progress-streak-alert">
                        {PROGRESS_COPY.hubCard.streakFmt(worstStreak.label, worstStreak.streak)}
                      </span>
                    )}
                    <div className="progress-sparklines">
                      {perKpiStats.map((kpi) => (
                        <div
                          key={kpi.id}
                          className="progress-sparkline-bar"
                          style={{
                            width: `${kpi.hitRate ?? 0}%`,
                            background: getPerformanceColor(kpi.hitRate),
                          }}
                        />
                      ))}
                    </div>
                    <span className="hub-card-cta">{PROGRESS_COPY.hubCard.cta}</span>
                  </Link>
                )}

                {/* View Questionnaire (was "Role Definition", retitled D-08) */}
                <Link to={`/q/${partner}`} className="hub-card">
                  <h3>{copy.cards.roleDefinition.title}</h3>
                  <p>{copy.cards.roleDefinition.description}</p>
                </Link>

                {/* Weekly Scorecard (kept, D-08) */}
                {kpiReady && (
                  <Link to={`/scorecard/${partner}`} className="hub-card">
                    <h3>{SCORECARD_COPY.hubCard.title}</h3>
                    <p>{SCORECARD_COPY.hubCard.description}</p>
                    <span className="hub-card-cta">
                      {scorecardState === 'complete'
                        ? SCORECARD_COPY.hubCard.ctaComplete
                        : scorecardState === 'inProgress'
                          ? SCORECARD_COPY.hubCard.ctaInProgress(scorecardAnsweredCount, scorecardTotalCount)
                          : SCORECARD_COPY.hubCard.ctaNotCommitted}
                    </span>
                  </Link>
                )}

                {/* Meeting History (kept, D-08) */}
                {kpiReady && (
                  <Link to={`/meeting-history/${partner}`} className="hub-card">
                    <h3>Meeting History</h3>
                    <p>Browse all past Friday Reviews and Monday Preps — stop-by-stop notes from every ended session.</p>
                    <span className="hub-card-cta">Browse meetings {'\u2192'}</span>
                  </Link>
                )}

                {/* Side-by-Side Comparison (kept, D-08) */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
