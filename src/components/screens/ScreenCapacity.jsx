import {
  hoursOptions,
  scheduleOptions,
  afterHoursOptions,
  fieldOptions,
  capacityInsight,
} from '../../data/content.js';

export default function ScreenCapacity({ answers, updateAnswers, next, back }) {
  const cap = answers.time_capacity;

  function update(key, val) {
    updateAnswers({ time_capacity: { ...cap, [key]: val } });
  }

  const ready = cap.hours && cap.schedule && cap.after_hours && cap.field_presence;

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">Time &amp; Capacity</div>
        <h2>
          This isn't about who works harder. It's about building roles that fit the human holding
          them. Be honest. The structure only works if it matches your real life.
        </h2>
      </div>

      {/* Q1 Hours */}
      <div>
        <p className="muted" style={{ marginBottom: 12 }}>
          How many hours per week are you willing to commit to Cardinal?
        </p>
        <div className="hours-grid">
          {hoursOptions.map((h) => (
            <button
              key={h}
              className={cap.hours === h ? 'active' : ''}
              onClick={() => update('hours', h)}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Q2 Schedule */}
      <div>
        <p className="muted" style={{ marginBottom: 12 }}>
          What does your ideal work schedule look like?
        </p>
        <div className="option-list">
          {scheduleOptions.map((o) => (
            <button
              key={o.id}
              className={`option${cap.schedule === o.id ? ' selected' : ''}`}
              onClick={() => update('schedule', o.id)}
            >
              <span className="statement">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Q3 After hours */}
      <div>
        <p className="muted" style={{ marginBottom: 12 }}>
          Are you willing to take work calls or handle emergencies after hours and on weekends?
        </p>
        <div className="option-list">
          {afterHoursOptions.map((o) => (
            <button
              key={o.id}
              className={`option${cap.after_hours === o.id ? ' selected' : ''}`}
              onClick={() => update('after_hours', o.id)}
            >
              <span className="statement">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Q4 Field */}
      <div>
        <p className="muted" style={{ marginBottom: 12 }}>
          Are you willing to visit job sites, meet crews, or handle field issues when Curtis needs
          owner-level support?
        </p>
        <div className="option-list">
          {fieldOptions.map((o) => (
            <button
              key={o.id}
              className={`option${cap.field_presence === o.id ? ' selected' : ''}`}
              onClick={() => update('field_presence', o.id)}
            >
              <span className="statement">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {ready && <div className="insight fade-in">{capacityInsight}</div>}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn btn-primary" disabled={!ready} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}
