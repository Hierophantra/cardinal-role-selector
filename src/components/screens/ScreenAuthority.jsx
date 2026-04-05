import {
  ownershipFunctions,
  authorityChoices,
  authorityInsight,
} from '../../data/content.js';

export default function ScreenAuthority({ answers, updateAnswers, next, back, claimedFunctions }) {
  const auth = answers.decision_authority;

  function update(funcId, val) {
    updateAnswers({ decision_authority: { ...auth, [funcId]: val } });
  }

  const visibleFunctions = ownershipFunctions.filter((f) => claimedFunctions.includes(f.id));
  const ready = visibleFunctions.length > 0 && visibleFunctions.every((f) => auth[f.id]);

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">Decision Authority</div>
        <h2>
          Owning a function is one thing. Having the final say is another. For each area you claimed,
          how much decision-making authority do you want?
        </h2>
      </div>

      {visibleFunctions.length === 0 ? (
        <p className="muted">
          You didn't claim ownership of any functions. Go back and claim at least one area.
        </p>
      ) : (
        visibleFunctions.map((func) => (
          <div className="function-card" key={func.id}>
            <h3>{func.title}</h3>
            <div className="choice-row" style={{ gridTemplateColumns: '1fr', gap: 8 }}>
              {authorityChoices.map((c) => (
                <button
                  key={c.id}
                  className={auth[func.id] === c.id ? 'active' : ''}
                  onClick={() => update(func.id, c.id)}
                  style={{ textAlign: 'left' }}
                >
                  <strong>{c.label}</strong>{' '}
                  <span style={{ color: '#aaa' }}>{c.description}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="insight">{authorityInsight}</div>

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn btn-primary" disabled={!ready} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}
