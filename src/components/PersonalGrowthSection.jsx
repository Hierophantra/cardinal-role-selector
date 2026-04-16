// src/components/PersonalGrowthSection.jsx — Phase 15 Wave 2
// Renders the mandatory + self-chosen personal growth rows. No-approval self-chosen per D-15.
// Reuses existing .growth-status-badge classes (active / pending) — no new pill CSS (checker N7).
// No `partner` prop — hub closes over partner in onSaveSelfChosen (checker M5).

import React, { useState } from 'react';

export default function PersonalGrowthSection({ growthPriorities, onSaveSelfChosen }) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Split the single list by subtype. Per D-19, both render identically except for the badge.
  // Mandatory is seeded in Phase 14 migration (GROWTH-01); self-chosen is the user-entered row.
  const mandatory = growthPriorities.find(
    (g) => g.type === 'personal' && g.subtype === 'mandatory_personal'
  );
  const selfChosen = growthPriorities.find(
    (g) => g.type === 'personal' && g.subtype === 'self_personal'
  );

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSaveSelfChosen(trimmed);
      // Parent refetches growthPriorities and passes the updated array; the
      // `selfChosen ? LockedView : EntryForm` ternary flips automatically.
      setDraft('');
    } catch (err) {
      console.error(err);
      setError("Couldn't save your priority. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="personal-growth-section hub-section">
      <h3>Personal Growth</h3>

      <ul className="growth-list">
        {/* Mandatory row (GROWTH-01) — always present from Phase 14 seed */}
        {mandatory && (
          <li className="growth-row">
            <span className="growth-row-label">Role-mandatory growth</span>
            <p className="growth-row-text">{mandatory.description}</p>
          </li>
        )}

        {/* Self-chosen row (GROWTH-02, HUB-06, HUB-07, D-15..D-19) */}
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
                disabled={saving}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={!draft.trim() || saving}
              >
                {saving ? 'Saving\u2026' : 'Lock in my priority'}
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
