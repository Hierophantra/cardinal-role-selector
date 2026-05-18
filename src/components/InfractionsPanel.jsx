import { useState, useEffect } from 'react';
import {
  fetchInfractions,
  addInfraction,
  updateInfraction,
  deleteInfraction,
} from '../lib/supabase.js';

// Phase 19 follow-up: business-conduct KPI infractions panel.
// editable=true  -> admin partner-profile: add / edit / remove rows.
// editable=false -> partner Season Overview: read-only count + date + note.
// The note is partner-visible by design.
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function InfractionsPanel({ partner, editable = false }) {
  const [infractions, setInfractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newNote, setNewNote] = useState('');
  // Per-row edit drafts keyed by id.
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    let active = true;
    fetchInfractions(partner)
      .then((rows) => { if (active) setInfractions(rows); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [partner]);

  const sortDesc = (rows) =>
    [...rows].sort((a, b) => String(b.occurred_on).localeCompare(String(a.occurred_on)));

  async function handleAdd() {
    if (!newDate || busy) return;
    setBusy(true);
    try {
      const row = await addInfraction(partner, newDate, newNote.trim());
      setInfractions((prev) => sortDesc([row, ...prev]));
      setNewDate('');
      setNewNote('');
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(id) {
    const draft = drafts[id];
    if (!draft || !draft.occurred_on || busy) return;
    setBusy(true);
    try {
      const row = await updateInfraction(id, draft.occurred_on, (draft.note || '').trim());
      setInfractions((prev) => sortDesc(prev.map((i) => (i.id === id ? row : i))));
      setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (busy) return;
    if (typeof window !== 'undefined' && !window.confirm('Remove this infraction?')) return;
    setBusy(true);
    try {
      await deleteInfraction(id);
      setInfractions((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  const count = infractions.length;

  // ----- Read-only (partner Season Overview) -----
  if (!editable) {
    return (
      <div className={`infractions-panel${count > 0 ? ' infractions-panel--flagged' : ''}`}>
        <div className="infractions-panel-head">
          <span className="infractions-panel-title">Conduct infractions</span>
          <span className="infractions-panel-count">{count}</span>
        </div>
        {count === 0 ? (
          <p className="infractions-panel-empty">None on record. Keep it clean.</p>
        ) : (
          <ul className="infractions-list">
            {infractions.map((inf) => (
              <li key={inf.id} className="infractions-item">
                <span className="infractions-item-date">{formatDate(inf.occurred_on)}</span>
                {inf.note && <span className="infractions-item-note">{inf.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ----- Editable (admin partner profile) -----
  return (
    <div className="infractions-panel infractions-panel--admin">
      <div className="infractions-panel-head">
        <span className="infractions-panel-title">Conduct infractions ({count})</span>
      </div>
      <p className="infractions-admin-hint">
        Business-conduct infractions per the partnership contract. Separate from
        scorecard KPI results. The date and note are visible to the partner on
        their Season Overview.
      </p>

      {infractions.length > 0 && (
        <ul className="infractions-admin-list">
          {infractions.map((inf) => {
            const draft = drafts[inf.id] ?? { occurred_on: inf.occurred_on, note: inf.note ?? '' };
            const dirty =
              draft.occurred_on !== inf.occurred_on || (draft.note ?? '') !== (inf.note ?? '');
            return (
              <li key={inf.id} className="infractions-admin-row">
                <input
                  type="date"
                  className="infractions-input infractions-input--date"
                  value={draft.occurred_on ?? ''}
                  onChange={(e) =>
                    setDrafts((p) => ({ ...p, [inf.id]: { ...draft, occurred_on: e.target.value } }))
                  }
                />
                <input
                  type="text"
                  className="infractions-input infractions-input--note"
                  placeholder="Note (visible to partner)"
                  value={draft.note ?? ''}
                  onChange={(e) =>
                    setDrafts((p) => ({ ...p, [inf.id]: { ...draft, note: e.target.value } }))
                  }
                />
                {dirty && (
                  <button
                    type="button"
                    className="btn-ghost infractions-btn"
                    disabled={busy}
                    onClick={() => handleSave(inf.id)}
                  >
                    Save
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost infractions-btn infractions-btn--remove"
                  disabled={busy}
                  onClick={() => handleDelete(inf.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="infractions-admin-add">
        <input
          type="date"
          className="infractions-input infractions-input--date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
        />
        <input
          type="text"
          className="infractions-input infractions-input--note"
          placeholder="Note (visible to partner)"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <button
          type="button"
          className="btn-ghost infractions-btn"
          disabled={busy || !newDate}
          onClick={handleAdd}
        >
          + Add infraction
        </button>
      </div>
    </div>
  );
}
