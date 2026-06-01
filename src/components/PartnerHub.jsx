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
  fetchWeekPlanForWeek,
  fetchWeeklyObjectivesForPartner,
  fetchWeeklyGrowthCommitment,
  upsertWeeklyGrowthCommitment,
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
// Tier 2: ROLE_IDENTITY moved to RoleDiscovery.jsx consumer; PartnerHub no
// longer renders role-identity content.
// Tier 2: RoleIdentitySection moved to dedicated /role-discovery/:partner page.
// Import retained as comment for git-history breadcrumb only — no runtime import.
import ThisWeekKpisSection from './ThisWeekKpisSection.jsx';
import PersonalGrowthSection from './PersonalGrowthSection.jsx';
import BusinessPrioritiesSection from './BusinessPrioritiesSection.jsx';
import WeekPlanCard from './WeekPlanCard.jsx';
import PageHeader from './PageHeader.jsx';
import SupportProtocolCallout from './SupportProtocolCallout.jsx';
import { formatWeekRange } from '../lib/week.js';
import EditableElement from './admin/EditableElement.jsx';
import { useElementConfig } from '../lib/elementConfig.js';

export default function PartnerHub() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Treat as admin view if EITHER the URL has ?admin=1 (existing convention
  // from AdminProfile / AdminPartners links) OR the session role flag set at
  // login says 'admin'. The latter survives internal nav inside the partner
  // hub stack (Scorecard, KpiSelectionView, etc.) that strips the query param.
  const sessionRole = (() => {
    try { return sessionStorage.getItem('cardinal-role'); } catch { return null; }
  })();
  const adminView =
    new URLSearchParams(location.search).get('admin') === '1' ||
    sessionRole === 'admin';

  // ---- Data state ----
  const [submission, setSubmission] = useState(null);
  const [kpiSelections, setKpiSelections] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [allSubs, setAllSubs] = useState([]);
  const [weeklySelection, setWeeklySelection] = useState(null);
  const [previousSelection, setPreviousSelection] = useState(null);
  const [growthPriorities, setGrowthPriorities] = useState([]);
  const [businessPriorities, setBusinessPriorities] = useState(null);
  const [weeklyCommitment, setWeeklyCommitment] = useState(null);
  // UAT 2026-05-18 (Week Objectives): holds this partner's objective cards
  // for the current week (null = still loading, [] = loaded but empty).
  const [weekObjectives, setWeekObjectives] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Tier 2: role-narrative + section-collapse state removed. Those toggles
  // belong on the RoleDiscovery page now (the role identity content moved).

  // ---- Derived before early return ----
  // WR-03: Anchor currentMonday in a ref so a midnight Sunday→Monday rollover
  // mid-session doesn't change the captured fetch effect's week. Matches the
  // pattern in Scorecard.jsx and WeeklyKpiSelectionFlow.jsx.
  const currentMondayRef = useRef(getMondayOf());
  const currentMonday = currentMondayRef.current;
  // role const removed (Tier 2) — RoleDiscovery owns the lookup now.

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
      // UAT 2026-05-18 (Week Objectives): pull this partner's card-based
      // accountability objectives for the current week. .catch swallows to []
      // so a transient failure on this card doesn't block the rest of the hub.
      fetchWeeklyObjectivesForPartner(partner, currentMonday).catch(() => []),
      // 2026-06-01: this week's mandatory day-pick commitment. May be null
      // (partner hasn't picked yet).
      fetchWeeklyGrowthCommitment(partner, currentMonday).catch(() => null),
    ])
      .then(([sub, sels, cards, subs, thisWeek, prevWeek, growth, bizPriorities, objectives, commitment]) => {
        setSubmission(sub);
        setKpiSelections(sels);
        setScorecards(cards);
        setAllSubs(subs);
        setWeeklySelection(thisWeek);
        setPreviousSelection(prevWeek);
        setGrowthPriorities(growth);
        setBusinessPriorities(bizPriorities);
        setWeekObjectives(objectives);
        setWeeklyCommitment(commitment);
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

  // 2026-06-01: persist the partner's weekly day pick. The required_count
  // (2 for Theo, 3 for Jerry) is carried into the table so admin reports
  // don't need to look it up.
  async function handleConfirmWeeklyDays(days) {
    const requiredCountByPartner = { theo: 2, jerry: 3, test: 2 };
    const required_count = requiredCountByPartner[partner] ?? 2;
    const saved = await upsertWeeklyGrowthCommitment({
      partner,
      week_of: currentMonday,
      days,
      required_count,
    });
    setWeeklyCommitment(saved);
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const copy = HUB_COPY.partner;

  // Scorecard state derivation — kpiReady-based per D-06
  const committedThisWeek = Boolean(thisWeekCard?.committed_at);
  // UAT A1/A2 (2026-04-25): the scorecard composes 6 mandatory + 1 weekly choice = 7 rows
  // (Scorecard.jsx Pattern 5 composition). Count over the full set, not just mandatory,
  // so the hub-card "X of Y checked in" denominator matches Scorecard's "Y / 7" counter.
  // The weekly choice template_id lives in weeklySelection (weekly_kpi_selections row).
  // WR-05 (UAT 2026-04-25): dedupe via Set so a weekly choice that overlaps with an
  // entry in kpi_selections (rare but possible from past lock state) doesn't inflate
  // the denominator. Mirrors Scorecard.jsx Pattern 5's distinct-row composition.
  const scorecardTemplateIds = Array.from(new Set([
    ...kpiSelections.map((k) => k.template_id),
    ...(weeklySelection?.kpi_template_id ? [weeklySelection.kpi_template_id] : []),
  ]));
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

  // Element configs — partner-aware. When admin edits while viewing /hub/theo,
  // saves default to theo-only; same for jerry.
  const greetingConfig = useElementConfig('hub-greeting', partner);
  const dashboardCardConfig = useElementConfig('hub-dashboard-card', partner);
  const workflowConfig = useElementConfig('hub-workflow-cards', partner);
  const weekPlanConfig = useElementConfig('hub-week-plan', partner);
  const thisWeekConfig = useElementConfig('hub-this-week-kpis', partner);
  const growthConfig = useElementConfig('hub-personal-growth', partner);
  const businessConfig = useElementConfig('hub-business-priorities', partner);

  // Inline-style helper — sets CSS variables on the section wrapper which
  // the inner card CSS consumes via var(--inner-*). Earlier wave only piped
  // background + radius; 2026-06-01 expanded to padding, border (color +
  // width), and heading (color + size) so admin can tune the full card
  // chrome from the editor panel.
  const sectionVars = (cfg) => ({
    '--inner-bg': cfg.background,
    '--inner-radius': cfg.radius,
    '--inner-padding': cfg.padding,
    '--inner-border-color': cfg.borderColor,
    '--inner-border-width': cfg.borderWidth != null ? `${cfg.borderWidth}px` : undefined,
    '--inner-heading-color': cfg.headingColor,
    '--inner-heading-size': cfg.headingSize,
    display: cfg.visible === false ? 'none' : undefined,
  });

  const greetingNode = greetingConfig.visible === false ? null : (
    <EditableElement
      id="hub-greeting"
      as="span"
      className="hub-greeting-editable"
      style={{
        color: greetingConfig.textColor,
        fontSize: greetingConfig.size,
      }}
    >
      {(greetingConfig.override && greetingConfig.override.trim())
        ? greetingConfig.override
        : copy.greeting(partnerName)}
    </EditableElement>
  );

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          {/* Tier 3 v2 Wave 4: Slim page header replaces the big greeting block.
              Sidebar handles nav (no more in-page "Back to Trace Hub" row).
              Inline greeting preserved per cross-AI synthesis. */}
          <PageHeader
            eyebrow={`Week of ${formatWeekRange(currentMonday)}`}
            greeting={greetingNode}
          />
          {statusText && <p className="status-line">{statusText}</p>}

          {/* Tier 2 (post-Phase-19 follow-up): Role identity moved to a dedicated
              /role-discovery/:partner surface. Per Gemini's "banner blindness to
              constants" framing, static identity content goes invisible on a
              daily-visit hub within days; moving it behind a deliberate nav
              step actually increases its impact. */}

          {/* Async content — only render after fetches resolve */}
          {loading ? null : (
            <>
              {/* Tier 3 v2 Wave 4: Dashboard grid wrapper. On desktop (>= 901px)
                  this becomes a 2-column layout with KPIs/Plan on the left and
                  Growth/Priorities on the right. On mobile, the children stack
                  vertically as they did before. */}
              <div className="hub-dashboard">
                {/* This Week's Plan — CSS vars cascade to inner section */}
                <EditableElement id="hub-week-plan" style={sectionVars(weekPlanConfig)}>
                  <WeekPlanCard objectives={weekObjectives} />
                </EditableElement>

                {/* This Week's KPIs */}
                {kpiReady && (
                  <EditableElement id="hub-this-week-kpis" style={sectionVars(thisWeekConfig)}>
                    <ThisWeekKpisSection
                      partner={partner}
                      mandatorySelections={mandatorySelections}
                      thisWeekCard={thisWeekCard}
                      weeklySelection={weeklySelection}
                      previousSelection={previousSelection}
                      counters={counters}
                      onIncrementCounter={handleIncrementCounter}
                    />
                  </EditableElement>
                )}

                {/* Personal Growth */}
                <EditableElement id="hub-personal-growth" style={sectionVars(growthConfig)}>
                  <PersonalGrowthSection
                    partner={partner}
                    growthPriorities={growthPriorities}
                    onSaveSelfChosen={handleSaveSelfChosen}
                    weeklyCommitment={weeklyCommitment}
                    onConfirmWeeklyDays={handleConfirmWeeklyDays}
                    isReadOnly={adminView}
                  />
                </EditableElement>

                {/* Business Priorities */}
                <EditableElement id="hub-business-priorities" style={sectionVars(businessConfig)}>
                  <BusinessPrioritiesSection priorities={businessPriorities} />
                </EditableElement>

                {/* 2026-06-01: Reaching-out-for-support protocol. Same shape on
                    both partner hubs with the counterpart's name interpolated. */}
                <SupportProtocolCallout partner={partner} />
              </div>

              {/* Workflow card grid (D-07 bottom; D-08 card roster).
                  Tier 3 v2 follow-up: editable as 'hub-workflow-cards'.
                  Apply card background + radius via CSS custom properties
                  scoped to this grid so all child .hub-card descendants
                  inherit the overrides. */}
              <EditableElement
                id="hub-workflow-cards"
                className="hub-grid"
                style={{
                  '--hub-card-bg': workflowConfig.cardBackground,
                  '--hub-card-radius': workflowConfig.cardRadius,
                }}
              >
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

                {/* Tier 2: Counterpart's Scorecard — read-only view of the OTHER
                    partner's weekly scorecard. Scorecard.jsx detects when the
                    URL :partner !== sessionRole and disables editing. Lets Theo
                    and Jerry see each other's progress through the week.
                    Hidden on the test profile — test has no real counterpart
                    and its own scorecard view already shows all templates.
                    2026-05-24: kpiReady gate removed — partners can browse
                    the counterpart's scorecard independent of their own
                    season-KPI setup. Scorecard.jsx counterpart-view also
                    bypasses the "no weekly KPI picked" empty-guard, so the
                    mandatory rows always render even when the counterpart
                    hasn't picked this week's optional KPI yet. */}
                {partner !== 'test' && (
                  <Link
                    to={`/scorecard/${partner === 'theo' ? 'jerry' : 'theo'}`}
                    className="hub-card hub-card--partner-view"
                  >
                    <span className="eyebrow">PARTNER VIEW</span>
                    <h3>{PARTNER_DISPLAY[partner === 'theo' ? 'jerry' : 'theo']}'s Scorecard</h3>
                    <p>Read-only view of {partner === 'theo' ? 'Jerry' : 'Theo'}'s weekly check-in and history. See where they stand alongside your own.</p>
                    <span className="hub-card-cta">View {partner === 'theo' ? 'Jerry' : 'Theo'}'s scorecard {'→'}</span>
                  </Link>
                )}

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
                    <p>Browse all past Friday Reviews and Monday Preps: stop-by-stop notes from every ended session.</p>
                    <span className="hub-card-cta">Browse meetings {'\u2192'}</span>
                  </Link>
                )}

                {/* Tier 2: Role Discovery — secondary nav card. Replaces the
                    raw Role Questionnaire Submissions card. The questionnaire
                    comparison still lives behind the Role Discovery page. */}
                <Link to={`/role-discovery/${partner}`} className="hub-card">
                  <span className="eyebrow">RE-ANCHOR</span>
                  <h3>Role Discovery</h3>
                  <p>Who you are at Cardinal, what you focus on, what your day looks like. Open the role questionnaire comparison from here.</p>
                  <span className="hub-card-cta">Open Role Discovery {'→'}</span>
                </Link>
              </EditableElement>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
