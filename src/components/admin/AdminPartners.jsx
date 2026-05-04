import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchSubmission,
  fetchKpiSelections,
  fetchGrowthPriorities,
  fetchScorecards,
  resetPartnerSubmission,
  resetPartnerKpiSelections,
  resetPartnerWeeklyKpiSelections,
  resetPartnerGrowthPriorities,
  resetPartnerScorecards,
  updateGrowthPriorityStatus,
  updateGrowthPriorityAdminNote,
} from '../../lib/supabase.js';
import { PARTNER_DISPLAY, GROWTH_STATUS_COPY, ADMIN_GROWTH_COPY, ADMIN_ACCOUNTABILITY_COPY } from '../../data/content.js';
import { effectiveResult, getMondayOf } from '../../lib/week.js';

const MANAGED = ['theo', 'jerry'];

// Growth priority status cycle (D-09, UI-SPEC 207-211): active -> achieved -> stalled -> deferred -> active
const STATUS_CYCLE = ['active', 'achieved', 'stalled', 'deferred'];
function nextStatus(current) {
  const i = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

export default function AdminPartners() {
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
            <Link to="/admin/hub" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              {'\u2190'} Back to Admin Hub
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">Partner Management</div>
            <h2>Theo &amp; Jerry</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              Review each partner's current state, open their profile or hub, and reset
              individual pieces of their data when needed.
            </p>
          </div>

          {MANAGED.map((p) => (
            <PartnerSection key={p} partner={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerSection({ partner }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [pendingReset, setPendingReset] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Growth priority admin state (P04-03)
  const [growthSaving, setGrowthSaving] = useState({}); // { [id]: 'status'|'note'|null }
  const [growthError, setGrowthError] = useState('');
  const [noteDrafts, setNoteDrafts] = useState({}); // { [id]: string }

  // UAT 2026-05-04: stable current-week anchor for week-scoped resets. Memoized
  // once per mount so the "This Week" reset variants always target the same
  // Monday even if the user holds the screen open across midnight.
  const currentMonday = useMemo(() => getMondayOf(), []);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sub, sels, gps, cards] = await Promise.all([
        fetchSubmission(partner),
        fetchKpiSelections(partner),
        fetchGrowthPriorities(partner),
        fetchScorecards(partner),
      ]);
      setSubmission(sub);
      setKpis(sels);
      setGrowth(gps);
      setScorecards(cards);
    } catch (err) {
      console.error(err);
      setError('Failed to load state.');
    } finally {
      setLoading(false);
    }
  }, [partner]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Seed note drafts whenever fresh growth rows arrive from loadState
  useEffect(() => {
    const seeded = {};
    for (const g of growth) seeded[g.id] = g.admin_note ?? '';
    setNoteDrafts(seeded);
  }, [growth]);

  async function handleCycleStatus(priorityId, currentStatus) {
    setGrowthSaving((s) => ({ ...s, [priorityId]: 'status' }));
    setGrowthError('');
    try {
      const ns = nextStatus(currentStatus || 'active');
      await updateGrowthPriorityStatus(priorityId, ns);
      await loadState();
    } catch (err) {
      console.error(err);
      setGrowthError(ADMIN_GROWTH_COPY.errors.statusFail);
    } finally {
      setGrowthSaving((s) => ({ ...s, [priorityId]: null }));
    }
  }

  async function handleSaveNote(priorityId) {
    const text = noteDrafts[priorityId] ?? '';
    setGrowthSaving((s) => ({ ...s, [priorityId]: 'note' }));
    setGrowthError('');
    try {
      await updateGrowthPriorityAdminNote(priorityId, text);
      await loadState();
    } catch (err) {
      console.error(err);
      setGrowthError(ADMIN_GROWTH_COPY.errors.noteFail);
    } finally {
      setGrowthSaving((s) => ({ ...s, [priorityId]: null }));
    }
  }

  async function performReset(kind) {
    setResetting(true);
    setStatusMsg('');
    try {
      // CR-01: Each branch lists exactly the surfaces it resets so 'all'
      // doesn't depend on a side effect inside any helper. resetPartnerScorecards
      // now only touches `scorecards` — 'all' must explicitly call
      // resetPartnerWeeklyKpiSelections to wipe the per-week pick row.
      // UAT 2026-05-04 (Path B): scoped resets split into "This Week" and "All
      // History" variants. The "This Week" variants pass currentMonday as the
      // weekOf arg so only this week's row is deleted; prior submissions stay.
      // The legacy 'weeklyKpi' / 'scorecards' kinds are preserved as aliases
      // for the all-history nuke path (back-compat for any external callers).
      if (kind === 'submission') {
        await resetPartnerSubmission(partner);
      } else if (kind === 'weeklyKpiThisWeek') {
        await resetPartnerWeeklyKpiSelections(partner, currentMonday);
      } else if (kind === 'weeklyKpiAll' || kind === 'weeklyKpi') {
        await resetPartnerWeeklyKpiSelections(partner);
      } else if (kind === 'growthPriorities') {
        await resetPartnerGrowthPriorities(partner);
      } else if (kind === 'scorecardsThisWeek') {
        await resetPartnerScorecards(partner, currentMonday);
      } else if (kind === 'scorecardsAll' || kind === 'scorecards') {
        await resetPartnerScorecards(partner);
      } else if (kind === 'all') {
        await resetPartnerSubmission(partner);
        await resetPartnerKpiSelections(partner);
        await resetPartnerGrowthPriorities(partner);
        await resetPartnerWeeklyKpiSelections(partner);
        await resetPartnerScorecards(partner);
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

  // Post-Phase-17 UAT 2026-04-25: same fix as AdminHub. Phase 14 SCHEMA-11
  // dropped the locked_until semantic; Phase 15 D-15 derives "locked" from
  // the presence of any kpi_selections row (mandatory + weekly-choice). The
  // prior `Boolean(kpis[0]?.locked_until)` check always returned false on
  // current data and falsely showed "(unlocked)" in Partner Management.
  const kpiLocked = kpis.length > 0;
  const committedScorecards = scorecards.filter((s) => s.committed_at).length;
  const latestWeek = scorecards.length > 0 ? scorecards[0].week_of : null;
  const name = PARTNER_DISPLAY[partner] ?? partner;

  // Phase 17 D-02: read entry.result through effectiveResult so post-Saturday-close
  // pending entries coerce to 'no' and contribute to the miss total. Without this,
  // closed-week pendings (auto-coerced everywhere else) would silently skip the
  // PIP-trigger threshold.
  const missCount = scorecards.reduce((total, card) => {
    const results = card.kpi_results ?? {};
    return total + Object.values(results).filter(
      (entry) => effectiveResult(entry?.result, card.week_of) === 'no'
    ).length;
  }, 0);
  const submittedWeekCount = scorecards.filter((s) => s.committed_at).length;
  const pipTriggered = missCount >= 5;

  return (
    <div
      className="summary-section"
      style={{
        padding: 20,
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 20,
      }}
    >
      <h3 style={{ marginTop: 0 }}>{name}</h3>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : error ? (
        <p className="muted" style={{ color: 'var(--miss)' }}>{error}</p>
      ) : (
        <>
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
                : `${scorecards.length} total \u00b7 ${committedScorecards} committed${
                    latestWeek ? ` \u00b7 latest week ${latestWeek}` : ''
                  }`}
            </div>
          </div>

          <div className="nav-row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            <Link to={`/admin/profile/${partner}`} className="btn-ghost" style={{ textDecoration: 'none' }}>
              View Full Profile
            </Link>
            <Link to={`/hub/${partner}?admin=1`} className="btn-ghost" style={{ textDecoration: 'none' }}>
              Open Partner Hub
            </Link>
            <Link
              to={`/admin/kpi?partner=${partner}`}
              className="btn btn-ghost"
              style={{ textDecoration: 'none' }}
            >
              Manage KPIs
            </Link>
          </div>

          {/* Growth Priorities editor (P04-03) */}
          <div className="eyebrow" style={{ marginTop: 24 }}>{ADMIN_GROWTH_COPY.eyebrow}</div>
          {growth.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              No growth priorities set.
            </p>
          ) : (
            growth.map((g) => (
              <div
                key={g.id}
                className="admin-growth-row"
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                }}
              >
                <div>
                  {g.description}
                  <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                    ({g.type})
                  </span>
                </div>
                <button
                  type="button"
                  className={`growth-status-badge ${g.status || 'active'}`}
                  onClick={() => handleCycleStatus(g.id, g.status)}
                  disabled={growthSaving[g.id] === 'status'}
                  style={{ marginTop: 8, cursor: 'pointer' }}
                >
                  {GROWTH_STATUS_COPY[g.status || 'active']}
                </button>
                <div style={{ marginTop: 12 }}>
                  <div className="eyebrow">{GROWTH_STATUS_COPY.adminNoteLabel}</div>
                  <textarea
                    value={noteDrafts[g.id] ?? ''}
                    onChange={(e) =>
                      setNoteDrafts((d) => ({ ...d, [g.id]: e.target.value }))
                    }
                    onBlur={() => handleSaveNote(g.id)}
                    placeholder={GROWTH_STATUS_COPY.adminNotePlaceholder(
                      PARTNER_DISPLAY[partner] || partner
                    )}
                    rows={3}
                    className="input"
                    style={{ width: '100%', resize: 'vertical', marginTop: 4 }}
                  />
                </div>
              </div>
            ))
          )}
          {growthError && (
            <div className="muted" style={{ color: 'var(--red)', marginTop: 8 }}>
              {growthError}
            </div>
          )}

          {/* Scorecard History deep link (P04-03) */}
          <div style={{ marginTop: 16 }}>
            <Link
              to={`/admin/scorecards?partner=${partner}`}
              className="btn btn-ghost"
              style={{ textDecoration: 'none' }}
            >
              View Scorecard History
            </Link>
          </div>

          {/* Accountability tracking (ADMIN-09, ADMIN-10) */}
          <div className="admin-accountability-card">
            <div className="eyebrow">{ADMIN_ACCOUNTABILITY_COPY.eyebrow}</div>
            <p className={`admin-miss-count${missCount === 0 ? ' admin-miss-count--zero' : ''}`}>
              {missCount === 0
                ? ADMIN_ACCOUNTABILITY_COPY.zeroMisses
                : ADMIN_ACCOUNTABILITY_COPY.missCount(missCount, submittedWeekCount)}
            </p>
            <p className="admin-miss-footnote">{ADMIN_ACCOUNTABILITY_COPY.footnote}</p>
            {pipTriggered && (
              <div className="admin-pip-flag">
                <p className="admin-pip-flag-heading">{ADMIN_ACCOUNTABILITY_COPY.pipHeading}</p>
                <p className="admin-pip-flag-body">{ADMIN_ACCOUNTABILITY_COPY.pipBody(missCount)}</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Reset Controls</div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Click once to arm, click again to confirm.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ResetButton
                label="Reset Submission"
                armedLabel="Click again to delete questionnaire submission"
                kind="submission"
                pending={pendingReset}
                resetting={resetting}
                onClick={handleResetClick}
              />
              {/* UAT 2026-05-04: scoped weekly KPI resets — default to current
                  week, separate destructive button for the all-history nuke. */}
              <ResetButton
                label="Reset This Week's KPI Pick"
                armedLabel="Click again to delete this week's KPI pick (history preserved)"
                kind="weeklyKpiThisWeek"
                pending={pendingReset}
                resetting={resetting}
                onClick={handleResetClick}
              />
              <ResetButton
                label="Reset All Weekly KPI History"
                armedLabel="Click again to delete ALL weekly KPI picks across every week"
                kind="weeklyKpiAll"
                pending={pendingReset}
                resetting={resetting}
                onClick={handleResetClick}
                destructive
              />
              <ResetButton
                label="Reset Growth Priorities"
                armedLabel="Click again to delete growth priorities"
                kind="growthPriorities"
                pending={pendingReset}
                resetting={resetting}
                onClick={handleResetClick}
              />
              {/* UAT 2026-05-04: scoped scorecard resets — default to current
                  week, separate destructive button for the all-history nuke. */}
              <ResetButton
                label="Reset This Week's Scorecard"
                armedLabel="Click again to delete this week's scorecard (prior submissions preserved)"
                kind="scorecardsThisWeek"
                pending={pendingReset}
                resetting={resetting}
                onClick={handleResetClick}
              />
              <ResetButton
                label="Reset All Scorecards"
                armedLabel="Click again to delete ALL scorecards across every week"
                kind="scorecardsAll"
                pending={pendingReset}
                resetting={resetting}
                onClick={handleResetClick}
                destructive
              />
              <ResetButton
                label="Reset Everything"
                armedLabel={`Click again to delete ALL ${name} data`}
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
  );
}

function ResetButton({ label, armedLabel, kind, pending, resetting, onClick, danger, destructive }) {
  const isArmed = pending === kind;
  const display = isArmed ? armedLabel : label;
  const style = {
    textAlign: 'left',
    justifyContent: 'flex-start',
  };
  if (isArmed) {
    style.borderColor = 'var(--miss)';
    style.color = 'var(--miss)';
  } else if (destructive) {
    // UAT 2026-05-04: visual cue for all-history nuke variants so admins
    // notice they're picking the wider blast radius. Amber left border
    // distinguishes them from the safer "This Week" defaults without
    // shouting like the fully-armed red state.
    style.borderLeft = '3px solid var(--miss)';
  } else if (danger) {
    style.borderColor = 'var(--border)';
  }
  return (
    <button
      type="button"
      className="btn btn-ghost"
      data-destructive={destructive ? 'true' : undefined}
      style={style}
      onClick={() => onClick(kind)}
      disabled={resetting}
    >
      {display}
    </button>
  );
}
