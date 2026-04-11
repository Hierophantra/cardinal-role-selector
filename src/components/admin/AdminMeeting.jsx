import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createMeeting, fetchMeetings } from '../../lib/supabase.js';
import { getMondayOf, formatWeekRange } from '../../lib/week.js';
import { MEETING_COPY } from '../../data/content.js';

// Build 9 week options: current Monday plus the 8 previous Mondays, newest first.
// Each option value is a 'YYYY-MM-DD' Monday local-time string from getMondayOf.
function buildWeekOptions(count = 9) {
  const options = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    const monday = getMondayOf(d);
    if (!options.includes(monday)) {
      options.push(monday);
    }
  }
  return options;
}

export default function AdminMeeting() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekOf, setWeekOf] = useState(() => getMondayOf());
  const [starting, setStarting] = useState(false);

  const weekOptions = useMemo(() => buildWeekOptions(9), []);

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

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      const meeting = await createMeeting(weekOf);
      navigate(`/admin/meeting/${meeting.id}`);
    } catch (err) {
      console.error(err);
      setError(MEETING_COPY.errors.loadFail);
    } finally {
      setStarting(false);
    }
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
          <div style={{ marginBottom: 16 }}>
            <Link to="/admin/hub" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              {'\u2190'} Back to Admin Hub
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">{MEETING_COPY.landingEyebrow}</div>
            <h2>Friday Review</h2>
            <p className="muted" style={{ fontSize: 15 }}>
              {MEETING_COPY.heroCardDescription}
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStart}
                disabled={starting}
                style={{ marginLeft: 'auto' }}
              >
                {starting ? `Starting${'\u2026'}` : MEETING_COPY.startCta}
              </button>
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
                      <Link
                        to={`/admin/meeting/${m.id}`}
                        className="btn btn-ghost"
                        style={{ textDecoration: 'none' }}
                      >
                        Open
                      </Link>
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
