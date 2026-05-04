import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchMeeting,
  fetchMeetingNotes,
  fetchScorecard,
  fetchGrowthPriorities,
  fetchWeekPlanForWeek,
} from '../lib/supabase.js';
import { formatWeekRange, effectiveResult } from '../lib/week.js';
import { composePartnerKpis } from '../lib/partnerKpis.js';
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  MEETING_COPY,
  MONDAY_PREP_COPY,
  GROWTH_STATUS_COPY,
  FRIDAY_STOPS,
  MONDAY_STOPS,
  KPI_STOP_COUNT,
} from '../data/content.js';

const PARTNERS = ['theo', 'jerry'];

// UAT C2/C3/C4: same set as AdminMeetingSession — drives per-partner render
// dispatch in StopBlock for the Monday Prep stops that capture separate
// Theo + Jerry notes (notes_theo / notes_jerry columns from migration 013).
// UAT 2026-05-04 (Week Plan): 'week_plan_recap' added — Friday Review's
// per-partner recap of Monday's plan.
const PER_PARTNER_NOTE_STOPS = new Set([
  'priorities_focus',
  'risks_blockers',
  'commitments',
  'week_plan_recap',
]);

// Post-Phase-17 UAT 2026-04-25: mirror of the helper in AdminMeetingSession.
// Derives the previous week's Monday from a current Monday string using
// local-time arithmetic — no UTC ISO slicing per src/lib/week.js convention.
// Used by the Monday Prep summary load to fetch last-week scorecards so the
// saturday_recap StopBlock can render the same two-section layout the meeting
// itself shows.
function previousMondayOf(currentMondayStr) {
  const [y, m, d] = currentMondayStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 7);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Post-Phase-17 UAT 2026-04-25: pure helper shared with AdminMeetingSession's
// SaturdayRecapStop. Walks scorecards, picks rows where pending_text is set,
// and returns a flat list with conversion state derived via effectiveResult.
function collectRecapRows(scorecards) {
  const rows = [];
  for (const sc of scorecards ?? []) {
    const results = sc?.kpi_results ?? {};
    for (const [tplId, entry] of Object.entries(results)) {
      const pendingText = (entry?.pending_text ?? '').trim();
      if (!pendingText) continue;
      const eff = effectiveResult(entry?.result, sc.week_of);
      rows.push({
        partner: sc.partner,
        weekOf: sc.week_of,
        tplId,
        label: entry?.label ?? '(KPI)',
        pending_text: entry.pending_text,
        // 2026-04-29: surface partner reflection on Saturday recap rows so
        // the post-meeting summary shows commitment + reflection together
        // when both exist. Mirrors the AdminMeetingSession helper update.
        reflection: entry?.reflection ?? '',
        converted: eff === 'yes',
      });
    }
  }
  return rows;
}

export default function MeetingSummary() {
  const { partner, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [notesByStop, setNotesByStop] = useState({});
  // UAT C2/C3/C4: parallel map for per-partner stops keyed by stopKey ->
  // { theo, jerry }. notesByStop continues to map stopKey -> body for shared
  // stops; per-partner stops read from this map instead.
  const [perPartnerNotesByStop, setPerPartnerNotesByStop] = useState({});
  // UAT B3+B4: render both partners side-by-side per KPI/growth stop. data shape:
  //   { theo: { kpis, scorecard, growth }, jerry: { ... } }
  // Mirrors AdminMeetingSession's data shape so KPI + growth blocks render symmetrically.
  // Post-Phase-17 UAT 2026-04-25: lastWeekScorecards added to mirror the
  // saturday_recap extension in AdminMeetingSession — summary now surfaces
  // both last-week and current-week pending rows.
  const [data, setData] = useState({
    theo: { kpis: [], scorecard: null, growth: [] },
    jerry: { kpis: [], scorecard: null, growth: [] },
    lastWeekScorecards: [],
    // UAT 2026-05-04 (Week Plan): Friday Review summaries fetch Monday's plan
    // so the week_plan_recap stop renders self-contained. Null on Monday Prep
    // summaries (Monday IS the source).
    weekPlan: null,
  });

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }

    let alive = true;

    async function load() {
      try {
        const ended = await fetchMeeting(id);
        if (!alive) return;

        if (!ended || !ended.ended_at) {
          setEmpty(true);
          setLoading(false);
          return;
        }

        setMeeting(ended);

        // Fetch both partners' KPI compositions, scorecards, and growth priorities
        // for the week-of of the ended meeting. Composition mirrors AdminMeetingSession
        // (template_id-keyed) so kpi_results lookups line up across surfaces.
        // Post-Phase-17 UAT 2026-04-25: also fetch previous-week scorecards (Monday
        // Prep only — Friday Review summaries don't render a saturday_recap stop, so
        // the previous-week fetches are skipped to avoid two pointless network calls).
        const isMondayPrep = ended.meeting_type === 'monday_prep';
        const prevMonday = isMondayPrep ? previousMondayOf(ended.week_of) : null;

        const [
          noteRows,
          theoKpis,
          jerryKpis,
          theoScorecard,
          jerryScorecard,
          theoGrowth,
          jerryGrowth,
          theoPrevScorecard,
          jerryPrevScorecard,
          weekPlan,
        ] = await Promise.all([
          fetchMeetingNotes(ended.id),
          composePartnerKpis('theo', ended.week_of),
          composePartnerKpis('jerry', ended.week_of),
          fetchScorecard('theo', ended.week_of),
          fetchScorecard('jerry', ended.week_of),
          fetchGrowthPriorities('theo'),
          fetchGrowthPriorities('jerry'),
          isMondayPrep ? fetchScorecard('theo', prevMonday) : Promise.resolve(null),
          isMondayPrep ? fetchScorecard('jerry', prevMonday) : Promise.resolve(null),
          // UAT 2026-05-04 (Week Plan): pull Monday's plan for Friday Review
          // summaries so the week_plan_recap stop is self-contained. Skipped
          // for Monday Prep summaries — they ARE the plan.
          isMondayPrep ? Promise.resolve(null) : fetchWeekPlanForWeek(ended.week_of),
        ]);

        if (!alive) return;

        const notesMap = {};
        const perPartnerMap = {};
        for (const row of noteRows ?? []) {
          const key = row.agenda_stop_key;
          if (PER_PARTNER_NOTE_STOPS.has(key)) {
            perPartnerMap[key] = {
              theo: row.notes_theo ?? '',
              jerry: row.notes_jerry ?? '',
            };
          } else {
            notesMap[key] = row.body ?? '';
          }
        }

        const lastWeekScorecards = [theoPrevScorecard, jerryPrevScorecard].filter(Boolean);

        setNotesByStop(notesMap);
        setPerPartnerNotesByStop(perPartnerMap);
        setData({
          theo: {
            kpis: theoKpis ?? [],
            scorecard: theoScorecard ?? null,
            growth: theoGrowth ?? [],
          },
          jerry: {
            kpis: jerryKpis ?? [],
            scorecard: jerryScorecard ?? null,
            growth: jerryGrowth ?? [],
          },
          lastWeekScorecards,
          weekPlan,
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setError('Couldn\'t load meeting summary.');
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [partner, id, navigate]);

  if (loading) return null;

  // Select stop array based on meeting type; meeting may be null when error/empty shown
  const stops = meeting?.meeting_type === 'monday_prep' ? MONDAY_STOPS : FRIDAY_STOPS;

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <div className="nav-row" style={{ marginBottom: 12 }}>
            <Link to={`/meeting-history/${partner}`} className="btn-ghost">
              {'\u2190'} Back to History
            </Link>
          </div>

          {error ? (
            <>
              <div className="screen-header">
                <h2>Meeting Summary</h2>
              </div>
              <p className="muted" style={{ color: 'var(--red)' }}>{error}</p>
            </>
          ) : empty ? (
            <>
              <div className="screen-header">
                <h2>No meeting summaries yet</h2>
              </div>
              <p className="muted">Check back after your next Friday review ends.</p>
            </>
          ) : (
            <>
              <div className="eyebrow">{meeting.meeting_type === 'monday_prep' ? 'MONDAY PREP' : 'FRIDAY REVIEW'}</div>
              <div className="screen-header">
                <h2>Meeting Summary: Week of {formatWeekRange(meeting.week_of)}</h2>
                <p className="muted" style={{ fontSize: 14 }}>
                  Recap of {new Date(meeting.ended_at).toLocaleDateString()}. Read-only.
                </p>
                {/* Migration 014 / post-Phase-17 UAT: surface post-end note
                    edits via the meetings.notes_updated_at column. Only render
                    when notes_updated_at is strictly later than ended_at — a
                    same-instant stamp would just clutter the header. Format
                    matches the toLocaleString() convention used elsewhere. */}
                {meeting.notes_updated_at &&
                  new Date(meeting.notes_updated_at).getTime() > new Date(meeting.ended_at).getTime() && (
                    <p
                      className="muted meeting-summary-updated"
                      style={{ fontSize: 13, fontStyle: 'italic', marginTop: 4 }}
                    >
                      Updated: {new Date(meeting.notes_updated_at).toLocaleString()}
                    </p>
                  )}
              </div>

              {stops.map((stopKey, i) => (
                <StopBlock
                  key={stopKey}
                  stopKey={stopKey}
                  stopIndex={i}
                  notesByStop={notesByStop}
                  perPartnerNotesByStop={perPartnerNotesByStop}
                  data={data}
                  meeting={meeting}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// StopBlock — renders one agenda stop in read-only summary view
// --------------------------------------------------------------------------

function StopBlock({ stopKey, stopIndex, notesByStop, perPartnerNotesByStop, data, meeting }) {
  const note = notesByStop[stopKey];
  // UAT C2/C3/C4: per-partner notes lookup; null when stop is not in the
  // per-partner set or no row was written for this meeting.
  const perPartnerNotes = perPartnerNotesByStop?.[stopKey] ?? null;
  // WR-02 (UAT 2026-04-25): Mirror AdminMeetingSession's pattern — derive copy
  // from meeting_type so Monday Prep summaries render "Action Items & Commitments"
  // for the wrap heading instead of the Friday "This Week's Checkpoint". Only
  // wrap is practically reachable for Monday (intro / growth_* don't exist in
  // MONDAY_STOPS), but downstream stops can use this too if their copy diverges.
  const copy = meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY;

  // UAT A4 (2026-04-25): handle Phase 17 gate stop explicitly so it doesn't fall
  // into the kpi_* block. notes['kpi_review_optional'] holds 'review' | 'skip'.
  if (stopKey === 'kpi_review_optional') {
    const choice = note;
    const summary =
      choice === 'skip' ? 'Skipped: Yes/No KPIs not reviewed this meeting.'
      : choice === 'review' ? 'Reviewed KPIs.'
      : 'No choice recorded.';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">REVIEW KPIs?</div>
        <h3 className="meeting-stop-heading">KPI Review Gate</h3>
        <p className="muted" style={{ fontSize: 14 }}>{summary}</p>
      </div>
    );
  }

  // Phase 17 saturday_recap stop — Monday only. Mirrors AdminMeetingSession's
  // SaturdayRecapStop: surfaces pending follow-throughs from BOTH last week (with
  // conversion state) and the current week (live, awaiting Saturday close), plus
  // the captured note body.
  if (stopKey === 'saturday_recap') {
    const lastWeekRows = collectRecapRows(data?.lastWeekScorecards);
    const currentWeekScorecards = [data?.theo?.scorecard, data?.jerry?.scorecard].filter(Boolean);
    const currentWeekRows = collectRecapRows(currentWeekScorecards);
    const lastWeekEmpty = lastWeekRows.length === 0;
    const currentWeekEmpty = currentWeekRows.length === 0;
    const bothEmpty = lastWeekEmpty && currentWeekEmpty;
    const stopsCopy = copy.stops;

    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        {bothEmpty ? (
          <>
            <div className="eyebrow meeting-stop-eyebrow">{stopsCopy.saturdayRecapEyebrow}</div>
            <h3 className="meeting-stop-heading">{stopsCopy.saturdayRecapHeading}</h3>
            <div className="saturday-recap-empty">{stopsCopy.saturdayRecapEmpty}</div>
          </>
        ) : (
          <>
            {!lastWeekEmpty && (
              <>
                <div className="eyebrow meeting-stop-eyebrow">{stopsCopy.saturdayRecapEyebrow}</div>
                <h3 className="meeting-stop-heading">{stopsCopy.saturdayRecapHeading}</h3>
                <div className="saturday-recap-list">
                  {lastWeekRows.map((row, i) => (
                    <div key={`lw-${row.partner}-${row.tplId}-${i}`} className="saturday-recap-row">
                      <div
                        className="saturday-recap-label"
                        style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}
                      >
                        {PARTNER_DISPLAY[row.partner] ?? row.partner}: {row.label}
                      </div>
                      <div className="saturday-recap-commitment">
                        {stopsCopy.saturdayRecapCommitmentPrefix}{row.pending_text}
                      </div>
                      {row.reflection && (
                        <div className="saturday-recap-reflection">
                          {row.reflection}
                        </div>
                      )}
                      <div className={`saturday-recap-conversion ${row.converted ? 'met' : 'not-converted'}`}>
                        {row.converted ? stopsCopy.saturdayRecapMet : stopsCopy.saturdayRecapNotConverted}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!lastWeekEmpty && !currentWeekEmpty && (
              <hr className="meeting-shared-priority-divider" />
            )}

            {!currentWeekEmpty && (
              <>
                <div className="eyebrow meeting-stop-eyebrow">{stopsCopy.saturdayRecapCurrentWeekEyebrow}</div>
                <h3 className="meeting-stop-heading">{stopsCopy.saturdayRecapCurrentWeekHeading}</h3>
                <div className="saturday-recap-list">
                  {currentWeekRows.map((row, i) => (
                    <div key={`cw-${row.partner}-${row.tplId}-${i}`} className="saturday-recap-row">
                      <div
                        className="saturday-recap-label"
                        style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}
                      >
                        {PARTNER_DISPLAY[row.partner] ?? row.partner}: {row.label}
                      </div>
                      <div className="saturday-recap-commitment">
                        {stopsCopy.saturdayRecapCommitmentPrefix}{row.pending_text}
                      </div>
                      {row.reflection && (
                        <div className="saturday-recap-reflection">
                          {row.reflection}
                        </div>
                      )}
                      <div className="saturday-recap-conversion saturday-recap-conversion--live">
                        {stopsCopy.saturdayRecapLiveBadge}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {note
          ? <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 16 }}>{note}</p>
          : <p className="muted" style={{ marginTop: 16 }}>No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'intro') {
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">{MEETING_COPY.stops.introEyebrow}</div>
        <h3 className="meeting-stop-heading">Opening</h3>
        {note
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{note}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  // UAT A4 (2026-04-25): regex narrowed from startsWith('kpi_') to /^kpi_\d+$/
  // so the Phase 17 'kpi_review_optional' gate stop is NOT rendered as a KPI
  // (was producing "KPI NaN of Undefined" because Number('review') === NaN).
  // Same regex tightening Phase 17 Wave 1 applied to AdminMeetingSession StopRenderer.
  // UAT B4 (2026-04-25): render BOTH partners side-by-side per KPI stop using
  // composePartnerKpis output (template_id-keyed) so kpi_results lookups match the
  // write contract on both columns.
  if (/^kpi_\d+$/.test(stopKey)) {
    const kpiIndex = Number(stopKey.split('_')[1]) - 1;
    const n = kpiIndex + 1;
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">{MEETING_COPY.stops.kpiEyebrow(n, KPI_STOP_COUNT)}</div>
        <h3 className="meeting-stop-heading">KPI {n}</h3>

        <div className="meeting-kpi-grid">
          {PARTNERS.map((p) => {
            const locked = data[p].kpis[kpiIndex];
            const partnerName = PARTNER_DISPLAY[p] ?? p;
            if (!locked) {
              return (
                <div key={p} className="meeting-kpi-cell null">
                  <div className="meeting-partner-name">{partnerName}</div>
                  <div className="muted" style={{ fontSize: 14 }}>Not locked</div>
                </div>
              );
            }
            const kpiId = locked.id;
            const sc = data[p].scorecard;
            const entry = sc?.kpi_results?.[kpiId];
            const label = entry?.label ?? locked.label_snapshot ?? '(unknown KPI)';
            const rawResult = entry?.result ?? null;
            const result = effectiveResult(rawResult, sc?.week_of);
            const reflection = entry?.reflection ?? '';
            const pendingText = (entry?.pending_text ?? '').trim();
            const resultLabel =
              result === 'yes' ? 'Hit'
              : result === 'no' ? 'Miss'
              : result === 'pending' ? 'Pending'
              : '—';
            const cellClass =
              result === 'yes' ? 'yes'
              : result === 'no' ? 'no'
              : result === 'pending' ? 'pending'
              : 'null';
            return (
              <div key={p} className={`meeting-kpi-cell ${cellClass}`}>
                <div className="meeting-partner-name">{partnerName}</div>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{resultLabel}</div>
                {rawResult === 'pending' && pendingText !== '' && (
                  <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
                    By Saturday: {pendingText}
                  </div>
                )}
                {reflection && (
                  <div className="muted" style={{ fontSize: 14, fontStyle: 'italic' }}>
                    {reflection}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {note
          ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{note}</p>
          : <p className="muted" style={{ marginTop: 12 }}>No notes for this stop.</p>}
      </div>
    );
  }

  // UAT B3: per-partner growth render using both partners' growth arrays. The
  // personal stop is naturally per-partner; the business stops in v2.0 are
  // shared (Phase 18 BIZ-03 — same priority for both partners) so we surface
  // both partners' notes columns even when the priority itself is identical.
  if (stopKey === 'growth_personal') {
    return (
      <GrowthStopBlock
        eyebrow={MEETING_COPY.stops.growthPersonalEyebrow}
        kind="personal"
        ordinal={1}
        data={data}
        note={note}
      />
    );
  }

  if (stopKey === 'growth_business_1') {
    return (
      <GrowthStopBlock
        eyebrow={MEETING_COPY.stops.growthBusinessEyebrow(1)}
        kind="business"
        ordinal={1}
        data={data}
        note={note}
      />
    );
  }

  if (stopKey === 'growth_business_2') {
    return (
      <GrowthStopBlock
        eyebrow={MEETING_COPY.stops.growthBusinessEyebrow(2)}
        kind="business"
        ordinal={2}
        data={data}
        note={note}
      />
    );
  }

  if (stopKey === 'wrap') {
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">CLOSING</div>
        <h3 className="meeting-stop-heading">{copy.stops.wrapHeading}</h3>
        {note
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{note}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'clear_the_air') {
    const ctaNote = notesByStop[stopKey] || '';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">CLEAR THE AIR</div>
        <h3 className="meeting-stop-heading">Clear the Air</h3>
        {ctaNote
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{ctaNote}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'week_preview') {
    const wpNote = notesByStop[stopKey] || '';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">WEEK PREVIEW</div>
        <h3 className="meeting-stop-heading">What&apos;s Coming This Week</h3>
        {wpNote
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{wpNote}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'priorities_focus') {
    return (
      <PerPartnerNotesStopBlock
        eyebrow="PRIORITIES & FOCUS"
        heading="Top 2-3 Priorities"
        perPartnerNotes={perPartnerNotes}
      />
    );
  }

  if (stopKey === 'risks_blockers') {
    return (
      <PerPartnerNotesStopBlock
        eyebrow="RISKS & BLOCKERS"
        heading="Risks & Blockers"
        perPartnerNotes={perPartnerNotes}
      />
    );
  }

  if (stopKey === 'growth_checkin') {
    const gcNote = notesByStop[stopKey] || '';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">GROWTH CHECK-IN</div>
        <h3 className="meeting-stop-heading">Growth Priority Pulse</h3>
        <div className="meeting-growth-grid">
          {PARTNERS.map((p) => {
            const list = data[p].growth ?? [];
            const partnerName = PARTNER_DISPLAY[p] ?? p;
            return (
              <div key={p} className="meeting-growth-cell">
                <div className="meeting-partner-name">{partnerName}</div>
                {list.length === 0 ? (
                  <div className="muted" style={{ fontSize: 14 }}>No growth priorities set.</div>
                ) : (
                  list.map((g) => (
                    <div key={g.id} style={{ fontSize: 14, lineHeight: 1.55 }}>
                      <span className={`growth-status-badge ${g.status ?? 'active'}`}>
                        {GROWTH_STATUS_COPY[g.status ?? 'active']}
                      </span>
                      {' '}{g.description || g.custom_text || '\u2014'}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
        {gcNote
          ? <p style={{ fontSize: 15, lineHeight: 1.6, marginTop: 12 }}>{gcNote}</p>
          : <p className="muted" style={{ marginTop: 12 }}>No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'commitments') {
    return (
      <PerPartnerNotesStopBlock
        eyebrow="COMMITMENTS"
        heading="Walk-Away Commitments"
        perPartnerNotes={perPartnerNotes}
      />
    );
  }

  // Migration 014 / post-Phase-17 UAT — additional_notes appears at the end of
  // both Friday and Monday flows. Render the captured note like other shared
  // stop bodies; copy keys come from the active meeting_type's copy block.
  if (stopKey === 'additional_notes') {
    const stopsCopy = copy.stops;
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">{stopsCopy.additionalNotesEyebrow}</div>
        <h3 className="meeting-stop-heading">{stopsCopy.additionalNotesHeading}</h3>
        {note
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{note}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  // UAT 2026-05-04 (Week Plan) — Friday Review stop. Renders Monday's plan
  // read-only at the top + per-partner recap notes side-by-side. data.weekPlan
  // is fetched in the load effect for Friday meetings; null on Monday Prep
  // summaries (where this stop should not appear in MONDAY_STOPS anyway).
  if (stopKey === 'week_plan_recap') {
    const stopsCopy = copy.stops;
    const weekPlan = data?.weekPlan ?? null;
    const hasPlan = Boolean(weekPlan && weekPlan.meetingId);
    const planNotes = weekPlan?.notes ?? null;
    const sections = [
      { key: 'priorities_focus', heading: stopsCopy.weekPlanRecapPriorityHeading },
      { key: 'risks_blockers', heading: stopsCopy.weekPlanRecapRisksHeading },
      { key: 'commitments', heading: stopsCopy.weekPlanRecapCommitmentsHeading },
    ];
    const cur = perPartnerNotes ?? { theo: '', jerry: '' };
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">{stopsCopy.weekPlanRecapEyebrow}</div>
        <h3 className="meeting-stop-heading">{stopsCopy.weekPlanRecapHeading}</h3>
        {hasPlan ? (
          <div className="week-plan-recap-stop__plan-block week-plan-card">
            {sections.map(({ key, heading }) => {
              const cell = planNotes?.[key] ?? { theo: '', jerry: '' };
              return (
                <div key={key} className="week-plan-card__section">
                  <div className="week-plan-card__section-heading">{heading}</div>
                  <div className="week-plan-card__partner-grid">
                    {PARTNERS.map((p) => {
                      const text = (cell[p] ?? '').trim();
                      return (
                        <div key={p} className="week-plan-card__partner-cell">
                          <div className="week-plan-card__partner-name">
                            {PARTNER_DISPLAY[p] ?? p}
                          </div>
                          {text ? (
                            <p className="week-plan-card__partner-text">{text}</p>
                          ) : (
                            <p className="week-plan-card__partner-empty">No notes captured.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="week-plan-recap-stop__plan-block">
            <p className="week-plan-recap-stop__plan-empty">
              {stopsCopy.weekPlanRecapEmptyState}
            </p>
          </div>
        )}
        <div className="meeting-growth-grid" style={{ marginTop: 16 }}>
          {PARTNERS.map((p) => {
            const text = (cur[p] ?? '').trim();
            return (
              <div key={p} className="meeting-growth-cell">
                <div className="meeting-partner-name">{PARTNER_DISPLAY[p] ?? p}</div>
                {text
                  ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>{text}</p>
                  : <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>No recap notes for {PARTNER_DISPLAY[p] ?? p}.</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// UAT C2/C3/C4: read-only per-partner notes summary block. Renders Theo's and
// Jerry's notes side-by-side. Mirrors the side-by-side KPI/growth treatment
// other Phase B/UAT C rollouts established. perPartnerNotes is null when no
// row was saved for this meeting -- both columns render the empty placeholder.
function PerPartnerNotesStopBlock({ eyebrow, heading, perPartnerNotes }) {
  const cur = perPartnerNotes ?? { theo: '', jerry: '' };
  return (
    <div className="meeting-stop" style={{ marginBottom: 24 }}>
      <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
      <h3 className="meeting-stop-heading">{heading}</h3>
      <div className="meeting-growth-grid">
        {PARTNERS.map((p) => {
          const text = (cur[p] ?? '').trim();
          return (
            <div key={p} className="meeting-growth-cell">
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p] ?? p}</div>
              {text
                ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 6 }}>{text}</p>
                : <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>No notes for {PARTNER_DISPLAY[p] ?? p}.</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// UAT B3: render BOTH partners side-by-side per growth slot. For 'personal'
// each partner has their own priority; for 'business' (Phase 18 BIZ-03) the
// priority is shared so the title row appears once but both partners' status
// + notes still surface.
function GrowthStopBlock({ eyebrow, kind, ordinal, data, note }) {
  return (
    <div className="meeting-stop" style={{ marginBottom: 24 }}>
      <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
      <h3 className="meeting-stop-heading">Growth Priority</h3>

      <div className="meeting-growth-grid">
        {['theo', 'jerry'].map((p) => {
          const list = (data[p].growth ?? []).filter((g) => g.type === kind);
          const priority = list[ordinal - 1];
          const partnerName = PARTNER_DISPLAY[p] ?? p;
          if (!priority) {
            return (
              <div key={p} className="meeting-growth-cell">
                <div className="meeting-partner-name">{partnerName}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  No {kind} growth priority locked.
                </div>
              </div>
            );
          }
          const status = priority.status ?? 'active';
          const statusLabel = GROWTH_STATUS_COPY[status] ?? GROWTH_STATUS_COPY.active;
          return (
            <div key={p} className="meeting-growth-cell">
              <div className="meeting-partner-name">{partnerName}</div>
              <div style={{ fontSize: 15, lineHeight: 1.55 }}>
                {priority.description || priority.custom_text || '\u2014'}
              </div>
              <div>
                <span className={`growth-status-badge ${status}`}>{statusLabel}</span>
              </div>
              {priority.admin_note && (
                <div className="growth-admin-note">{priority.admin_note}</div>
              )}
            </div>
          );
        })}
      </div>

      {note
        ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{note}</p>
        : <p className="muted" style={{ marginTop: 12 }}>No notes for this stop.</p>}
    </div>
  );
}
