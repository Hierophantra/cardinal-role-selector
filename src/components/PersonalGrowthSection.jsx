// src/components/PersonalGrowthSection.jsx — Phase 15 Wave 2
//
// 2026-06-01: the mandatory row is now a WEEKLY day-picker (Theo: 2 days he
// leaves the office by 7:30 PM; Jerry: 3 days he's out of the house by 7 AM).
// Resets every Monday — the picker is keyed by week_of via the
// weekly_growth_commitments table. Self-chosen row keeps the prior behavior.

import React, { useState } from 'react';

const ALL_DAYS = [
  { value: 'Mon', label: 'Mon' },
  { value: 'Tue', label: 'Tue' },
  { value: 'Wed', label: 'Wed' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Fri', label: 'Fri' },
  { value: 'Sat', label: 'Sat' },
  { value: 'Sun', label: 'Sun' },
];

const REQUIRED_DAYS_BY_PARTNER = {
  theo: 2,
  jerry: 3,
  test: 2,
};

export default function PersonalGrowthSection({
  partner,
  growthPriorities,
  onSaveSelfChosen,
  weeklyCommitment,
  onConfirmWeeklyDays,
  isReadOnly = false,
}) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Day-picker local state
  const requiredDays = REQUIRED_DAYS_BY_PARTNER[partner] ?? 2;
  const [draftDays, setDraftDays] = useState(() => weeklyCommitment?.days ?? []);
  const [confirmStep, setConfirmStep] = useState(false);
  const [dayError, setDayError] = useState('');
  const [savingDays, setSavingDays] = useState(false);

  // Sync local draftDays whenever the upstream commitment loads/changes
  // (e.g. partner toggles between hubs, or week rolls over).
  React.useEffect(() => {
    setDraftDays(weeklyCommitment?.days ?? []);
    setConfirmStep(false);
    setDayError('');
  }, [weeklyCommitment?.week_of, weeklyCommitment?.days]);

  const mandatory = growthPriorities.find(
    (g) => g.type === 'personal' && g.subtype === 'mandatory_personal'
  );
  const selfChosen = growthPriorities.find(
    (g) => g.type === 'personal' && g.subtype === 'self_personal'
  );

  const isLocked = Boolean(weeklyCommitment?.confirmed_at);

  function toggleDay(day) {
    if (isLocked) return;
    setDayError('');
    setDraftDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      if (prev.length >= requiredDays) {
        setDayError(`Pick exactly ${requiredDays} ${requiredDays === 1 ? 'day' : 'days'}.`);
        return prev;
      }
      return [...prev, day];
    });
  }

  function handleStartConfirm() {
    if (draftDays.length !== requiredDays) {
      setDayError(`Pick exactly ${requiredDays} ${requiredDays === 1 ? 'day' : 'days'}.`);
      return;
    }
    setDayError('');
    setConfirmStep(true);
  }

  async function handleConfirmFinal() {
    if (!onConfirmWeeklyDays || savingDays) return;
    setSavingDays(true);
    try {
      // Persist days in canonical Mon→Sun order for display consistency.
      const ordered = ALL_DAYS.map((d) => d.value).filter((d) => draftDays.includes(d));
      await onConfirmWeeklyDays(ordered);
      setConfirmStep(false);
    } catch (err) {
      console.error(err);
      setDayError(err?.message || 'Could not lock in your days. Try again.');
    } finally {
      setSavingDays(false);
    }
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSaveSelfChosen(trimmed);
      setDraft('');
    } catch (err) {
      console.error(err);
      setError("Couldn't save your priority. Try again.");
    } finally {
      setSaving(false);
    }
  }

  // Render the day-picker chips (or the locked summary). Used in place of the
  // old static growth-row-text under the mandatory row.
  function renderDayPicker() {
    const ordered = ALL_DAYS.map((d) => d.value).filter((d) => (weeklyCommitment?.days ?? []).includes(d));
    if (isLocked) {
      return (
        <div className="growth-day-picker growth-day-picker--locked">
          <div className="growth-day-picker__locked-line">
            <strong>Locked for this week:</strong>{' '}
            {ordered.length > 0 ? ordered.join(' · ') : '—'}
          </div>
          <div className="growth-day-picker__locked-hint">
            Resets next Monday. To change before then, ask Trace.
          </div>
        </div>
      );
    }

    if (confirmStep) {
      const orderedDraft = ALL_DAYS.map((d) => d.value).filter((d) => draftDays.includes(d));
      // Natural-language join: "Mon and Fri" for 2, "Mon, Wed, and Fri" for 3+.
      const naturalJoin = (arr) => {
        if (arr.length <= 1) return arr[0] ?? '';
        if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
        return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
      };
      return (
        <div className="growth-day-picker growth-day-picker--confirm">
          <div className="growth-day-picker__confirm-line">
            Confirm <strong>{naturalJoin(orderedDraft)}</strong>?
          </div>
          <div className="growth-day-picker__confirm-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmStep(false)}
              disabled={savingDays}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmFinal}
              disabled={savingDays}
            >
              {savingDays ? 'Locking…' : 'Yes, lock these in'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="growth-day-picker">
        <div className="growth-day-picker__row" role="group" aria-label="Choose your days">
          {ALL_DAYS.map((d) => {
            const selected = draftDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                className={`growth-day-chip${selected ? ' selected' : ''}`}
                onClick={() => toggleDay(d.value)}
                disabled={isReadOnly}
                aria-pressed={selected}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <div className="growth-day-picker__meta">
          <span className="growth-day-picker__count">
            {draftDays.length} of {requiredDays} picked
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={handleStartConfirm}
            disabled={isReadOnly || draftDays.length !== requiredDays}
          >
            Lock in for this week
          </button>
        </div>
        {dayError && (
          <p className="growth-day-picker__error" role="alert">{dayError}</p>
        )}
      </div>
    );
  }

  return (
    <section className="personal-growth-section hub-section">
      <h3>Personal Growth</h3>

      <ul className="growth-list">
        {/* Mandatory row — now a weekly day-picker (2026-06-01).
            The description from growth_priorities states the rule; the
            picker below it captures which days the partner is committing to
            this week. */}
        {mandatory && (
          <li className="growth-row">
            <span className="growth-row-label">Role-mandatory growth (resets weekly)</span>
            <p className="growth-row-text">{mandatory.description}</p>
            {renderDayPicker()}
          </li>
        )}

        {/* Self-chosen row — unchanged from prior wave. */}
        <li className="growth-row">
          <span className="growth-row-label">Self-chosen growth</span>
          {selfChosen ? (
            <>
              <p className="growth-row-text">{selfChosen.description}</p>
              <span className="growth-status-badge active">Locked</span>
            </>
          ) : (
            <div className="growth-entry-form">
              <span className="growth-status-badge pending">Not set</span>
              <textarea
                className="growth-entry-textarea"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What personal growth are you committed to this season?"
                rows={3}
                disabled={saving || isReadOnly}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={!draft.trim() || saving || isReadOnly}
              >
                {saving ? 'Saving…' : 'Lock in my priority'}
              </button>
              {error && (
                <p className="growth-entry-error" role="alert">{error}</p>
              )}
            </div>
          )}
        </li>
      </ul>
    </section>
  );
}
