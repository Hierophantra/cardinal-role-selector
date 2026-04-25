import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchMeeting,
  fetchMeetingNotes,
  fetchScorecard,
  fetchGrowthPriorities,
} from '../lib/supabase.js';
import { formatWeekRange, effectiveResult } from '../lib/week.js';
import { composePartnerKpis } from '../lib/partnerKpis.js';
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  MEETING_COPY,
  GROWTH_STATUS_COPY,
  FRIDAY_STOPS,
  MONDAY_STOPS,
  KPI_STOP_COUNT,
} from '../data/content.js';

const PARTNERS = ['theo', 'jerry'];

export default function MeetingSummary() {
  const { partner, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [notesByStop, setNotesByStop] = useState({});
  // UAT B3+B4: render both partners side-by-side per KPI/growth stop. data shape:
  //   { theo: { kpis, scorecard, growth }, jerry: { ... } }
  // Mirrors AdminMeetingSession's data shape so KPI + growth blocks render symmetrically.
  const [data, setData] = useState({
    theo: { kpis: [], scorecard: null, growth: [] },
    jerry: { kpis: [], scorecard: null, growth: [] },
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
        const [
          noteRows,
          theoKpis,
          jerryKpis,
          theoScorecard,
          jerryScorecard,
          theoGrowth,
          jerryGrowth,
        ] = await Promise.all([
          fetchMeetingNotes(ended.id),
          composePartnerKpis('theo', ended.week_of),
          composePartnerKpis('jerry', ended.week_of),
          fetchScorecard('theo', ended.week_of),
          fetchScorecard('jerry', ended.week_of),
          fetchGrowthPriorities('theo'),
          fetchGrowthPriorities('jerry'),
        ]);

        if (!alive) return;

        const notesMap = {};
        for (const row of noteRows ?? []) {
          notesMap[row.agenda_stop_key] = row.body ?? '';
        }

        setNotesByStop(notesMap);
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
                <h2>Meeting Summary — Week of {formatWeekRange(meeting.week_of)}</h2>
                <p className="muted" style={{ fontSize: 14 }}>
                  Recap of {new Date(meeting.ended_at).toLocaleDateString()} — read-only.
                </p>
              </div>

              {stops.map((stopKey, i) => (
                <StopBlock
                  key={stopKey}
                  stopKey={stopKey}
                  stopIndex={i}
                  notesByStop={notesByStop}
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

function StopBlock({ stopKey, stopIndex, notesByStop, data, meeting }) {
  const note = notesByStop[stopKey];

  // UAT A4 (2026-04-25): handle Phase 17 gate stop explicitly so it doesn't fall
  // into the kpi_* block. notes['kpi_review_optional'] holds 'review' | 'skip'.
  if (stopKey === 'kpi_review_optional') {
    const choice = note;
    const summary =
      choice === 'skip' ? 'Skipped — Yes/No KPIs not reviewed this meeting.'
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

  // Phase 17 saturday_recap stop — Monday only. Render notes (if any).
  if (stopKey === 'saturday_recap') {
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">SATURDAY RECAP</div>
        <h3 className="meeting-stop-heading">Last Friday&apos;s Pending Commitments</h3>
        {note
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{note}</p>
          : <p className="muted">No notes for this stop.</p>}
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
        <h3 className="meeting-stop-heading">{MEETING_COPY.stops.wrapHeading}</h3>
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
    const pfNote = notesByStop[stopKey] || '';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">PRIORITIES &amp; FOCUS</div>
        <h3 className="meeting-stop-heading">Top 2-3 Priorities</h3>
        {pfNote
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{pfNote}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'risks_blockers') {
    const rbNote = notesByStop[stopKey] || '';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">RISKS &amp; BLOCKERS</div>
        <h3 className="meeting-stop-heading">Risks &amp; Blockers</h3>
        {rbNote
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{rbNote}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
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
    const cmNote = notesByStop[stopKey] || '';
    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">COMMITMENTS</div>
        <h3 className="meeting-stop-heading">Walk-Away Commitments</h3>
        {cmNote
          ? <p style={{ fontSize: 15, lineHeight: 1.6 }}>{cmNote}</p>
          : <p className="muted">No notes for this stop.</p>}
      </div>
    );
  }

  return null;
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
