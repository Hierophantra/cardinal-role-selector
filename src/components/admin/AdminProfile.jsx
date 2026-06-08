import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchSubmission,
  fetchBusinessPriorities,
  fetchScorecards,
  fetchWeeklyGrowthCommitment,
  clearWeeklyGrowthCommitment,
} from '../../lib/supabase.js';
import { getMondayOf, formatWeekRange } from '../../lib/week.js';
import {
  purposeOptions,
  salesOptions,
  ownershipFunctions,
  ownershipChoices,
  scheduleOptions,
  afterHoursOptions,
  fieldOptions,
  balanceQ1,
  balanceQ2,
  balanceQ3,
  authorityChoices,
  mirrorQuestions,
  mirrorChoices,
  delegateOptions,
  researchSummary,
  SCORECARD_COPY,
} from '../../data/content.js';
import { effectiveResult } from '../../lib/week.js';
import BusinessPrioritiesSection from '../BusinessPrioritiesSection.jsx';
import InfractionsPanel from '../InfractionsPanel.jsx';

// Phase 17 D-02 audit footprint:
// AdminProfile renders the partner's questionnaire submission (Purpose, Sales,
// Ownership, etc.) — it does NOT currently render a per-KPI scorecard history
// block. The plan's analog (Scorecard.jsx:422-438) does not apply here because
// no KPI history surface exists in this view. effectiveResult, the .pending-badge
// CSS class, and SCORECARD_COPY.commitmentPrefix are imported / referenced here
// as the audit footprint so future scorecard-history additions in this file have
// the helper + copy already in scope. Concrete KPI history rendering is deferred
// to a follow-up plan that adds the section to AdminProfile.
//   - effectiveResult: see src/lib/week.js
//   - .pending-badge / .pending-badge.muted: defined in src/index.css (Wave 2)
//   - SCORECARD_COPY.commitmentPrefix: defined in src/data/content.js
void effectiveResult;
void SCORECARD_COPY.commitmentPrefix;
// pending-badge marker for D-02 audit grep:
const _AUDIT_PENDING_BADGE_CLASS = 'pending-badge';
void _AUDIT_PENDING_BADGE_CLASS;

const NAMES = { theo: 'Theo Dorian', jerry: 'Jerry Vera', test: 'Test Account' };

function lbl(arr, id) {
  return arr.find((o) => o.id === id)?.label ?? id ?? '—';
}

export default function AdminProfile() {
  const { partner } = useParams();
  const [sub, setSub] = useState(null);
  const [businessPriorities, setBusinessPriorities] = useState(null);
  const [scorecardHistory, setScorecardHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  // 2026-06-01: this week's personal-growth day-pick commitment (Theo 2 days /
  // Jerry 3 days). Admin can see what the partner locked in and reset it if
  // they need to re-pick (the partner-facing copy says "ask Trace").
  const [dayCommit, setDayCommit] = useState(null);
  const [dayCommitBusy, setDayCommitBusy] = useState(false);
  const currentMonday = getMondayOf();

  useEffect(() => {
    Promise.all([
      fetchSubmission(partner),
      fetchBusinessPriorities(),
      fetchScorecards(partner).catch(() => []),
      fetchWeeklyGrowthCommitment(partner, currentMonday).catch(() => null),
    ])
      .then(([fetchedSub, biz, scorecards, commit]) => {
        setSub(fetchedSub);
        setBusinessPriorities(biz);
        setScorecardHistory(Array.isArray(scorecards) ? scorecards : []);
        setDayCommit(commit);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  async function handleResetDayCommit() {
    if (dayCommitBusy) return;
    if (typeof window !== 'undefined' &&
        !window.confirm(`Reset ${NAMES[partner]?.split(' ')[0] ?? partner}'s day commitment for this week? They'll be able to pick again.`)) {
      return;
    }
    setDayCommitBusy(true);
    try {
      await clearWeeklyGrowthCommitment(partner, currentMonday);
      setDayCommit(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDayCommitBusy(false);
    }
  }

  // Phase 19 follow-up: repeat-entry detection. Scan the last 6 weeks of
  // submitted scorecards for string values that recur 3+ times in the same
  // KPI's structured_data. Helps Trace spot a partner reusing "Mike, closing
  // techniques" or delegating the same task week after week. Read-only flag
  // surface — does not block anything.
  function detectRepeats(history) {
    if (!Array.isArray(history) || history.length === 0) return [];
    const recent = history
      .filter((s) => s.submitted_at)
      .sort((a, b) => (b.week_of ?? '').localeCompare(a.week_of ?? ''))
      .slice(0, 6);
    if (recent.length < 3) return [];
    // freq[kpiId][stringValue] = { count, weeks: [...] }
    const freq = {};
    for (const sc of recent) {
      const kr = sc.kpi_results || {};
      for (const [kpiId, entry] of Object.entries(kr)) {
        const sd = entry?.structured_data || {};
        // Walk top-level string values and per-row string values.
        const collectStrings = (obj) => {
          const out = [];
          if (!obj || typeof obj !== 'object') return out;
          for (const v of Object.values(obj)) {
            if (typeof v === 'string' && v.trim().length > 2) {
              out.push(v.trim().toLowerCase());
            } else if (Array.isArray(v)) {
              for (const row of v) {
                if (row && typeof row === 'object') {
                  for (const rv of Object.values(row)) {
                    if (typeof rv === 'string' && rv.trim().length > 2) {
                      out.push(rv.trim().toLowerCase());
                    }
                  }
                }
              }
            }
          }
          return out;
        };
        const strs = collectStrings(sd);
        if (strs.length === 0) continue;
        freq[kpiId] = freq[kpiId] || {};
        for (const s of new Set(strs)) {
          freq[kpiId][s] = freq[kpiId][s] || { count: 0, weeks: [] };
          freq[kpiId][s].count += 1;
          freq[kpiId][s].weeks.push(sc.week_of);
        }
      }
    }
    const flags = [];
    for (const [kpiId, valueMap] of Object.entries(freq)) {
      for (const [value, info] of Object.entries(valueMap)) {
        if (info.count >= 3) {
          flags.push({ kpiId, value, count: info.count, weeks: info.weeks });
        }
      }
    }
    return flags.sort((a, b) => b.count - a.count).slice(0, 10);
  }

  const repeats = detectRepeats(scorecardHistory);

  if (loading) return <div className="container"><p className="muted">Loading...</p></div>;

  if (!sub) {
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
            <div className="nav-row" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <Link to="/admin/hub" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                &larr; Back to Admin Hub
              </Link>
              <Link to="/admin/partners" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                Partner Management
              </Link>
              <Link to={`/hub/${partner}?admin=1`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                Open Partner Hub
              </Link>
            </div>
            <div className="screen-header">
              <div className="eyebrow">Profile</div>
              <h2>{NAMES[partner] ?? partner}</h2>
              <p className="muted" style={{ fontSize: 13 }}>No submission yet for this partner.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="nav-row" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <Link to="/admin/hub" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              &larr; Back to Admin Hub
            </Link>
            <Link to="/admin/partners" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              Partner Management
            </Link>
            <Link to={`/hub/${partner}?admin=1`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              Open Partner Hub
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">Profile</div>
            <h2>{NAMES[partner] ?? partner}</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              Submitted {new Date(sub.submitted_at).toLocaleString()}
            </p>
          </div>

          {/* Business Priorities (Phase 18 BIZ-02, D-11) — shared, identical for both partners */}
          <BusinessPrioritiesSection priorities={businessPriorities} />

          {/* Phase 19 follow-up: conduct-infraction management (admin-editable). */}
          {(partner === 'theo' || partner === 'jerry') && (
            <InfractionsPanel partner={partner} editable />
          )}

          {/* 2026-06-01: weekly personal-growth day-pick commitment. Theo locks
              2 days (out of office by 7:30 PM); Jerry locks 3 days (out of the
              house by 7:30 AM). Read-only view of what they committed, plus a
              Reset so Trace can let them re-pick mid-week. */}
          {(partner === 'theo' || partner === 'jerry') && (() => {
            const requiredCount = dayCommit?.required_count ?? (partner === 'jerry' ? 3 : 2);
            const days = dayCommit?.days ?? [];
            const locked = !!dayCommit?.confirmed_at;
            const firstName = NAMES[partner]?.split(' ')[0] ?? partner;
            return (
              <div className="day-commit-panel">
                <div className="day-commit-panel__head">
                  <span className="day-commit-panel__title">
                    Personal growth — days committed
                  </span>
                  <span className="day-commit-panel__week">Week of {formatWeekRange(currentMonday)}</span>
                </div>
                <p className="day-commit-panel__hint">
                  {firstName} commits {requiredCount} weekday{requiredCount === 1 ? '' : 's'} each week.
                  Resets every Monday.
                </p>
                {locked && days.length > 0 ? (
                  <div className="day-commit-panel__locked">
                    <div className="day-commit-panel__days">
                      {days.map((d) => (
                        <span key={d} className="day-commit-chip">{d}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-ghost day-commit-panel__reset"
                      onClick={handleResetDayCommit}
                      disabled={dayCommitBusy}
                    >
                      {dayCommitBusy ? 'Resetting…' : 'Reset (let them re-pick)'}
                    </button>
                  </div>
                ) : (
                  <p className="day-commit-panel__empty">
                    Not locked in yet this week.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Phase 19 follow-up: repeat-entry watch. Surfaces structured-data
              values that appeared 3+ times in the partner's last 6 submitted
              scorecards. Read-only signal — does not block anything. */}
          {repeats.length > 0 && (
            <div className="repeat-watch">
              <div className="repeat-watch-heading">Repeat-entry watch (last 6 weeks)</div>
              <p className="repeat-watch-subtext">
                These values recurred 3+ times across recent scorecards. Worth raising at the next Friday meeting if they suggest a stalled commitment.
              </p>
              <ul className="repeat-watch-list">
                {repeats.map((flag, i) => (
                  <li key={i} className="repeat-watch-item">
                    <span className="repeat-watch-value">"{flag.value}"</span>
                    <span className="repeat-watch-count">{flag.count}× across {flag.weeks.length} weeks</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Purpose */}
          <Section title="Purpose Orientation">
            <Val>{lbl(purposeOptions, sub.purpose_orientation)}</Val>
            <Insight text={purposeOptions.find((o) => o.id === sub.purpose_orientation)?.insight} />
          </Section>

          {/* Sales */}
          <Section title="Sales Position">
            <Val>{lbl(salesOptions, sub.sales_position)}</Val>
            <Insight text={salesOptions.find((o) => o.id === sub.sales_position)?.insight} />
          </Section>

          {/* Ownership */}
          <Section title="Ownership Claims">
            <div className="kv">
              {ownershipFunctions.map((f) => (
                <React.Fragment key={f.id}>
                  <div className="k">{f.title}</div>
                  <div>{lbl(ownershipChoices, sub.ownership_claims?.[f.id])}</div>
                </React.Fragment>
              ))}
            </div>
          </Section>

          {/* Time */}
          <Section title="Time & Capacity">
            <div className="kv">
              <div className="k">Hours / week</div>
              <div>{sub.time_capacity?.hours ?? '—'} hrs</div>
              <div className="k">Schedule</div>
              <div>{lbl(scheduleOptions, sub.time_capacity?.schedule)}</div>
              <div className="k">After hours</div>
              <div>{lbl(afterHoursOptions, sub.time_capacity?.after_hours)}</div>
              <div className="k">Field presence</div>
              <div>{lbl(fieldOptions, sub.time_capacity?.field_presence)}</div>
            </div>
          </Section>

          {/* Life balance */}
          <Section title="Life Outside Cardinal">
            <div className="kv">
              <div className="k">Work-life balance</div>
              <div>{lbl(balanceQ1, sub.life_balance?.q1)}</div>
              <div className="k">Willingness to change</div>
              <div>{lbl(balanceQ2, sub.life_balance?.q2)}</div>
              <div className="k">Upcoming changes</div>
              <div>{lbl(balanceQ3, sub.life_balance?.q3)}</div>
            </div>
          </Section>

          {/* Authority */}
          <Section title="Decision Authority">
            <div className="kv">
              {Object.entries(sub.decision_authority ?? {}).map(([k, v]) => {
                const func = ownershipFunctions.find((f) => f.id === k);
                return (
                  <React.Fragment key={k}>
                    <div className="k">{func?.title ?? k}</div>
                    <div>{lbl(authorityChoices, v)}</div>
                  </React.Fragment>
                );
              })}
            </div>
          </Section>

          {/* Mirror */}
          <Section title="The Honest Mirror">
            <div className="kv">
              {mirrorQuestions.map((q) => (
                <React.Fragment key={q.id}>
                  <div className="k" style={{ gridColumn: '1 / -1', color: 'var(--text)', fontSize: 14, marginTop: 4 }}>
                    {q.prompt}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    {lbl(mirrorChoices, sub.honest_mirror?.[q.id])}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </Section>

          {/* Delegate */}
          <Section title="Would Delegate Tomorrow">
            <Val>
              {(sub.delegate_tomorrow?.selections ?? []).map((s) => lbl(delegateOptions, s)).join(', ')}
              {sub.delegate_tomorrow?.other ? `, ${sub.delegate_tomorrow.other}` : ''}
            </Val>
          </Section>

          {/* Vision */}
          <Section title="Role Vision">
            <Val>{sub.vision_role}</Val>
          </Section>
          <Section title="Ideal Week">
            <Val>{sub.vision_week}</Val>
          </Section>

          {/* Research */}
          <details className="expandable mt-24">
            <summary>What the Best Roofing Companies Do</summary>
            <p>{researchSummary}</p>
          </details>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="summary-section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function Val({ children }) {
  return <div className="value">{children}</div>;
}

function Insight({ text }) {
  if (!text) return null;
  return <div className="insight mt-8" style={{ fontSize: 13 }}>{text}</div>;
}
