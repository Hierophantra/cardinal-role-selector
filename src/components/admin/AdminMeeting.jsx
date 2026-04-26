import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createMeeting, fetchMeetings, resetMeeting } from '../../lib/supabase.js';
import { getMondayOf, formatWeekRange } from '../../lib/week.js';
import { MEETING_COPY, MONDAY_PREP_COPY, SEASON_START_DATE, SEASON_END_DATE } from '../../data/content.js';

// UAT post-Batch-D: two-click arm/confirm pattern matches AdminMeetingSession's
// END_DISARM_MS for End Meeting. 3 seconds is long enough to read the warning,
// short enough that an accidental first click doesn't linger as a footgun.
const RESET_DISARM_MS = 3000;

// Build week options from the current week through SEASON_END_DATE, newest first.
// Each option value is a 'YYYY-MM-DD' Monday local-time string from getMondayOf.
function buildWeekOptions() {
  const options = [];
  const end = new Date(SEASON_END_DATE);
  const start = getMondayOf(); // current week — never show weeks in the past
  // Walk from end back to current week in 7-day steps
  let d = new Date(end);
  while (getMondayOf(d) >= start) {
    const monday = getMondayOf(d);
    if (!options.includes(monday)) {
      options.push(monday);
    }
    d.setDate(d.getDate() - 7);
  }
  return options;
}

export default function AdminMeeting() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekOf, setWeekOf] = useState(() => getMondayOf());
  const [starting, setStarting] = useState(null);
  // UAT post-Batch-D: per-meeting two-click reset arm. Map keyed by meeting.id;
  // value is the meeting id currently armed (only one at a time). resetting holds
  // the id whose write is in flight so the row's button shows "Resetting…".
  const [armedResetId, setArmedResetId] = useState(null);
  const [resetting, setResetting] = useState(null);
  const resetDisarmRef = useRef(null);

  const weekOptions = useMemo(() => buildWeekOptions(), []);

  const fridayExistsForWeek = meetings.some(
    (m) => m.week_of === weekOf && m.meeting_type === 'friday_review'
  );
  const mondayExistsForWeek = meetings.some(
    (m) => m.week_of === weekOf && m.meeting_type === 'monday_prep'
  );

  useEffect(() => {
    let alive = true;
    fetchMeetings()
      .then((rows) => {
        if (!alive) return;
        setMeetings(rows ?? []);
      })
      .catch((err) => {
        console.error(err);
        if (!alive) return;
        setError(MEETING_COPY.errors.loadFail);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleStart(meetingType) {
    setStarting(meetingType);
    setError('');
    try {
      const meeting = await createMeeting(weekOf, meetingType);
      navigate(`/admin/meeting/${meeting.id}`);
    } catch (err) {
      console.error(err);
      setError(MEETING_COPY.errors.loadFail);
    } finally {
      setStarting(null);
    }
  }

  // UAT R3: two-click arm/confirm reset for a single meeting. Reset is now
  // destructive — first click arms the row's button (3s auto-disarm); second
  // click within the window calls resetMeeting (DELETEs meeting_notes + the
  // meetings row itself) and refreshes the list so the meeting disappears
  // from past meeting history. Mirrors AdminMeetingSession.handleEndClick.
  async function handleResetClick(meetingId) {
    if (resetting) return;
    if (armedResetId !== meetingId) {
      // Arm this row; clear any prior arm timer.
      if (resetDisarmRef.current) clearTimeout(resetDisarmRef.current);
      setArmedResetId(meetingId);
      resetDisarmRef.current = setTimeout(() => {
        setArmedResetId(null);
        resetDisarmRef.current = null;
      }, RESET_DISARM_MS);
      return;
    }
    // Second click within window — confirm.
    if (resetDisarmRef.current) {
      clearTimeout(resetDisarmRef.current);
      resetDisarmRef.current = null;
    }
    setResetting(meetingId);
    setError('');
    try {
      await resetMeeting(meetingId);
      const fresh = await fetchMeetings();
      setMeetings(fresh ?? []);
    } catch (err) {
      console.error(err);
      setError('Reset failed. Check console.');
    } finally {
      setResetting(null);
      setArmedResetId(null);
    }
  }

  // Cleanup any pending arm timer on unmount.
  useEffect(() => () => {
    if (resetDisarmRef.current) clearTimeout(resetDisarmRef.current);
  }, []);

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
            <div className="eyebrow">MEETING MODE</div>
            <h2>Meeting Mode</h2>
            <p className="muted" style={{ fontSize: 15 }}>
              Start a Friday Review or Monday Prep session for the selected week.
            </p>
          </div>

          {error && (
            <p
              className="muted"
              style={{ color: 'var(--red)', marginBottom: 16, fontSize: 14 }}
            >
              {error}
            </p>
          )}

          {/* Start Meeting panel */}
          <div
            className="hub-card--hero"
            style={{
              padding: 32,
              borderRadius: 16,
              marginBottom: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <label
                htmlFor="meeting-week-picker"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--muted)',
                  letterSpacing: '0.04em',
                }}
              >
                {MEETING_COPY.weekPickerLabel}
              </label>
              <select
                id="meeting-week-picker"
                className="input"
                value={weekOf}
                onChange={(e) => setWeekOf(e.target.value)}
                style={{ minWidth: 220, maxWidth: 320 }}
              >
                {weekOptions.map((monday) => (
                  <option key={monday} value={monday}>
                    {formatWeekRange(monday)}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 16, marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleStart('friday_review')}
                  disabled={starting !== null || loading || fridayExistsForWeek}
                  title={fridayExistsForWeek ? 'Already started for this week' : undefined}
                >
                  {starting === 'friday_review' ? 'Starting\u2026' : 'Start Friday Review'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary--monday"
                  onClick={() => handleStart('monday_prep')}
                  disabled={starting !== null || loading || mondayExistsForWeek}
                  title={mondayExistsForWeek ? 'Already started for this week' : undefined}
                >
                  {starting === 'monday_prep' ? 'Starting\u2026' : 'Start Monday Prep'}
                </button>
              </div>
            </div>
          </div>

          {/* Past Meetings list */}
          <div className="screen-header" style={{ marginTop: 0, marginBottom: 16 }}>
            <div className="eyebrow">HISTORY</div>
            <h3 style={{ margin: 0 }}>Past Meetings</h3>
          </div>

          {loading ? (
            <p className="muted" style={{ fontSize: 14 }}>
              {`Loading meetings${'\u2026'}`}
            </p>
          ) : meetings.length === 0 ? (
            <p className="muted" style={{ fontSize: 14 }}>
              {MEETING_COPY.landingEmpty}
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {meetings.map((m) => {
                const heldAt = m.held_at ? new Date(m.held_at).toLocaleString() : '—';
                const endedLabel = m.ended_at
                  ? new Date(m.ended_at).toLocaleString()
                  : 'In progress';
                const isMonday = m.meeting_type === 'monday_prep';
                return (
                  <div
                    key={m.id}
                    className="hub-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div
                          className="eyebrow"
                          style={{ fontSize: 11, marginBottom: 4 }}
                        >
                          WEEK OF
                        </div>
                        <h4 style={{ margin: 0, fontSize: 16 }}>
                          {formatWeekRange(m.week_of)}
                        </h4>
                      </div>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        background: isMonday ? 'rgba(37,99,235,0.15)' : 'rgba(196,30,58,0.15)',
                        color: isMonday ? 'var(--blue)' : 'var(--red)',
                        border: `1px solid ${isMonday ? 'rgba(37,99,235,0.3)' : 'rgba(196,30,58,0.3)'}`,
                      }}>
                        {isMonday ? 'Monday Prep' : 'Friday Review'}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Link
                          to={`/admin/meeting/${m.id}`}
                          className="btn btn-ghost"
                          style={{ textDecoration: 'none' }}
                        >
                          Open
                        </Link>
                        {/* UAT R3: Reset is now destructive — permanently
                            deletes the meeting + all notes. The meeting is
                            removed from past meeting history. Two-click
                            arm/confirm with 3s auto-disarm — armed state borrows
                            AdminMeetingSession's End Meeting visual treatment. */}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleResetClick(m.id)}
                          disabled={resetting !== null && resetting !== m.id}
                          style={
                            armedResetId === m.id
                              ? {
                                  background: 'rgba(196,30,58,0.14)',
                                  borderColor: 'var(--red)',
                                  color: 'var(--text)',
                                }
                              : undefined
                          }
                          title={
                            armedResetId === m.id
                              ? 'This will permanently delete this meeting and all notes. Continue?'
                              : 'Permanently delete this meeting and all its notes'
                          }
                        >
                          {resetting === m.id
                            ? 'Resetting…'
                            : armedResetId === m.id
                              ? 'Confirm reset?'
                              : 'Reset'}
                        </button>
                      </div>
                    </div>
                    <div
                      className="muted"
                      style={{
                        fontSize: 14,
                        display: 'flex',
                        gap: 16,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>Held: {heldAt}</span>
                      <span>Ended: {endedLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
