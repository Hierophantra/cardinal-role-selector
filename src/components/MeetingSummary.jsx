import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchMeeting,
  fetchMeetingNotes,
  fetchScorecards,
  fetchKpiSelections,
  fetchGrowthPriorities,
} from '../lib/supabase.js';
import { formatWeekRange } from '../lib/week.js';
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  MEETING_COPY,
  GROWTH_STATUS_COPY,
  AGENDA_STOPS,
} from '../data/content.js';

export default function MeetingSummary() {
  const { partner, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [meeting, setMeeting] = useState(null);
  const [notesByStop, setNotesByStop] = useState({});
  const [scorecard, setScorecard] = useState(null);
  const [kpiSelections, setKpiSelections] = useState([]);
  const [growth, setGrowth] = useState([]);

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

        const [noteRows, scorecards, kpis, growthRows] = await Promise.all([
          fetchMeetingNotes(ended.id),
          fetchScorecards(partner),
          fetchKpiSelections(partner),
          fetchGrowthPriorities(partner),
        ]);

        if (!alive) return;

        const notesMap = {};
        for (const row of noteRows ?? []) {
          notesMap[row.agenda_stop_key] = row.body ?? '';
        }

        const thisWeekCard = scorecards?.find((s) => s.week_of === ended.week_of) ?? null;

        setNotesByStop(notesMap);
        setScorecard(thisWeekCard);
        setKpiSelections(kpis ?? []);
        setGrowth(growthRows ?? []);
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

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;

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

              {AGENDA_STOPS.map((stopKey, i) => (
                <StopBlock
                  key={stopKey}
                  stopKey={stopKey}
                  stopIndex={i}
                  notesByStop={notesByStop}
                  scorecard={scorecard}
                  kpiSelections={kpiSelections}
                  growth={growth}
                  partnerName={partnerName}
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

function StopBlock({ stopKey, stopIndex, notesByStop, scorecard, kpiSelections, growth, partnerName }) {
  const note = notesByStop[stopKey];

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

  if (stopKey.startsWith('kpi_')) {
    const kpiIndex = Number(stopKey.split('_')[1]) - 1;
    const kpi = kpiSelections[kpiIndex];
    const entry = scorecard?.kpi_results?.[kpi?.id];
    const label = entry?.label ?? kpi?.label_snapshot ?? '(unknown KPI)';
    const result = entry?.result ?? null;
    const reflection = entry?.reflection ?? '';
    const resultLabel = result === 'yes' ? 'Hit' : result === 'no' ? 'Miss' : 'Pending';
    const cellClass = result === 'yes' ? 'yes' : result === 'no' ? 'no' : 'null';
    const n = kpiIndex + 1;

    return (
      <div className="meeting-stop" style={{ marginBottom: 24 }}>
        <div className="eyebrow meeting-stop-eyebrow">{MEETING_COPY.stops.kpiEyebrow(n)}</div>
        <h3 className="meeting-stop-heading">KPI {n}</h3>

        <div className="meeting-kpi-grid">
          <div className={`meeting-kpi-cell ${cellClass}`}>
            <div className="meeting-partner-name">{partnerName}</div>
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{resultLabel}</div>
            {reflection && (
              <div className="muted" style={{ fontSize: 14, fontStyle: 'italic' }}>
                {reflection}
              </div>
            )}
          </div>
        </div>

        {note
          ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{note}</p>
          : <p className="muted" style={{ marginTop: 12 }}>No notes for this stop.</p>}
      </div>
    );
  }

  if (stopKey === 'growth_personal') {
    const priority = growth.filter((g) => g.type === 'personal')[0];
    return (
      <GrowthStopBlock
        stopKey={stopKey}
        eyebrow={MEETING_COPY.stops.growthPersonalEyebrow}
        priority={priority}
        note={note}
      />
    );
  }

  if (stopKey === 'growth_business_1') {
    const priority = growth.filter((g) => g.type === 'business')[0];
    return (
      <GrowthStopBlock
        stopKey={stopKey}
        eyebrow={MEETING_COPY.stops.growthBusinessEyebrow(1)}
        priority={priority}
        note={note}
      />
    );
  }

  if (stopKey === 'growth_business_2') {
    const priority = growth.filter((g) => g.type === 'business')[1];
    return (
      <GrowthStopBlock
        stopKey={stopKey}
        eyebrow={MEETING_COPY.stops.growthBusinessEyebrow(2)}
        priority={priority}
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

  return null;
}

function GrowthStopBlock({ stopKey, eyebrow, priority, note }) {
  const status = priority?.status ?? 'active';
  const statusLabel = GROWTH_STATUS_COPY[status] ?? GROWTH_STATUS_COPY.active;

  return (
    <div className="meeting-stop" style={{ marginBottom: 24 }}>
      <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
      <h3 className="meeting-stop-heading">Growth Priority</h3>

      {priority ? (
        <div className="meeting-growth-grid">
          <div className="meeting-growth-cell">
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
        </div>
      ) : (
        <p className="muted">No growth priority set for this slot.</p>
      )}

      {note
        ? <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>{note}</p>
        : <p className="muted" style={{ marginTop: 12 }}>No notes for this stop.</p>}
    </div>
  );
}
