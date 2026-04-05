import { balanceQ1, balanceQ2, balanceQ3 } from '../../data/content.js';

export default function ScreenLifeBalance({ answers, updateAnswers, next, back }) {
  const bal = answers.life_balance;

  function update(key, val) {
    updateAnswers({ life_balance: { ...bal, [key]: val } });
  }

  const ready = bal.q1 && bal.q2 && bal.q3;

  const questions = [
    {
      key: 'q1',
      prompt:
        'Right now, how would you describe the balance between Cardinal and your personal life?',
      options: balanceQ1,
    },
    {
      key: 'q2',
      prompt:
        'Are you actively willing to make changes to create a healthier balance between work and home, even if it means adjusting how you operate at Cardinal?',
      options: balanceQ2,
    },
    {
      key: 'q3',
      prompt:
        "Is there anything in your personal life in the next 6 to 12 months that could significantly affect your availability or focus at Cardinal? This could be health, family, finances, a major life change, anything. You don't have to share details, just flag it.",
      options: balanceQ3,
    },
  ];

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">Life Outside Cardinal</div>
        <h2>
          Cardinal doesn't exist in a vacuum. Your life outside this company affects what you bring
          to it. These questions aren't about judgment. They're about building a plan that accounts
          for the whole picture.
        </h2>
      </div>

      {questions.map((q) => (
        <div key={q.key}>
          <p className="muted" style={{ marginBottom: 12 }}>{q.prompt}</p>
          <div className="option-list">
            {q.options.map((o) => (
              <button
                key={o.id}
                className={`option${bal[q.key] === o.id ? ' selected' : ''}`}
                onClick={() => update(q.key, o.id)}
              >
                <span className="statement">{o.label}</span>
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
