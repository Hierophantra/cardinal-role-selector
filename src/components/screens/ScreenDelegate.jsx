import { delegateOptions, delegateInsight } from '../../data/content.js';

export default function ScreenDelegate({ answers, updateAnswers, next, back }) {
  const del = answers.delegate_tomorrow;

  function toggle(id) {
    const sels = del.selections.includes(id)
      ? del.selections.filter((s) => s !== id)
      : [...del.selections, id];
    updateAnswers({ delegate_tomorrow: { ...del, selections: sels } });
  }

  const ready = del.selections.length > 0 || del.other.trim().length > 0;

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">What Would You Delegate Tomorrow?</div>
        <h2>
          If you could hand off one thing you currently do to someone else — a new hire, a service,
          anyone — what would it be?
        </h2>
      </div>

      <div className="option-list">
        {delegateOptions.map((o) => (
          <button
            key={o.id}
            className={`option${del.selections.includes(o.id) ? ' selected' : ''}`}
            onClick={() => toggle(o.id)}
          >
            <span className="statement">{o.label}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 4 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#aaa', marginBottom: 8 }}>
          Something else:
        </label>
        <input
          type="text"
          value={del.other}
          onChange={(e) => updateAnswers({ delegate_tomorrow: { ...del, other: e.target.value } })}
          placeholder="Describe here..."
        />
      </div>

      <div className="insight">{delegateInsight}</div>

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn btn-primary" disabled={!ready} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}
