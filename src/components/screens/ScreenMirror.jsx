import { mirrorQuestions, mirrorChoices } from '../../data/content.js';

export default function ScreenMirror({ answers, updateAnswers, next, back }) {
  const mirror = answers.honest_mirror;

  function update(qId, val) {
    updateAnswers({ honest_mirror: { ...mirror, [qId]: val } });
  }

  const ready = mirrorQuestions.every((q) => mirror[q.id]);

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">The Honest Mirror</div>
        <h2>
          These aren't about what should happen. They're about what actually happens today. Answer
          based on reality, not aspiration.
        </h2>
      </div>

      {mirrorQuestions.map((q) => (
        <div className="function-card" key={q.id}>
          <h3 style={{ fontSize: 15, fontWeight: 500 }}>{q.prompt}</h3>
          <div className="choice-row mt-8">
            {mirrorChoices.map((c) => (
              <button
                key={c.id}
                className={mirror[q.id] === c.id ? 'active' : ''}
                onClick={() => update(q.id, c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn btn-primary" disabled={!ready} onClick={next}>
          Continue
        </button>
      </div>
    </div>
  );
}
