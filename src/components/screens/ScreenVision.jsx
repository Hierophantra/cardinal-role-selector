export default function ScreenVision({ answers, updateAnswers, next, back, submitting, submitError }) {
  const { vision_role, vision_week } = answers;

  const ready = vision_role.trim().length >= 50 && vision_week.trim().length >= 50;

  return (
    <div className="screen">
      <div className="screen-header">
        <div className="eyebrow">Your Vision, In Your Words</div>
        <h2>Two questions. Write freely. There are no wrong answers, only honest ones.</h2>
      </div>

      <div className="vision-block">
        <p className="q">
          Describe your role at Cardinal the way you'd want it to read. Not your title, but your
          function. What does Cardinal count on you for above all else?
        </p>
        <textarea
          value={vision_role}
          onChange={(e) => updateAnswers({ vision_role: e.target.value })}
          placeholder="Write freely..."
          rows={5}
        />
        <div className="char-count">
          {vision_role.trim().length} / 50 minimum characters
        </div>
      </div>

      <div className="vision-block">
        <p className="q">
          What does a great week at Cardinal look like for you? What did you do? What did you not
          have to do?
        </p>
        <textarea
          value={vision_week}
          onChange={(e) => updateAnswers({ vision_week: e.target.value })}
          placeholder="Write freely..."
          rows={5}
        />
        <div className="char-count">
          {vision_week.trim().length} / 50 minimum characters
        </div>
      </div>

      {submitError && <div className="cap-banner">{submitError}</div>}

      <div className="nav-row">
        <button className="btn btn-ghost" onClick={back}>Back</button>
        <button className="btn btn-primary" disabled={!ready || submitting} onClick={next}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
