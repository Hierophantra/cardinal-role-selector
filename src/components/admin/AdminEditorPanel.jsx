// AdminEditorPanel — side drawer that opens when admin selects an element.
//
// Reads the registry entry for the selected id, renders one control per
// declared { key, type } pair, holds an in-memory draft, and applies
// changes via applyConfigUpdate. Live preview — the cache notifies all
// consumers immediately so the change is visible without a refresh.
//
// Controls supported in Phase 1:
//   - toggle  (boolean)
//   - select  (one-of from spec.options)
//
// Adding a new control type:
//   1. Add a 'type' branch in renderControl() below
//   2. Add the type to elementConfig.js doc-block
//
// Buttons:
//   - Save     applies the draft via applyConfigUpdate (live immediately)
//   - Reset    drops to defaults (deletes the override entry)
//   - Close    deselects without saving

import { useEffect, useState } from 'react';
import { X as XIcon, RotateCcw } from 'lucide-react';
import { useAdminEditor } from './AdminEditorContext.jsx';
import {
  getElementSpec,
  mergeWithDefaults,
  applyConfigUpdate,
  resetElementToDefaults,
  subscribeElementConfigs,
  fetchAllElementConfigs,
} from '../../lib/elementConfig.js';
import Callout from '../Callout.jsx';

export default function AdminEditorPanel() {
  const { mode, selectedId, deselect } = useAdminEditor();
  const [allConfigs, setAllConfigs] = useState({});
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to global cache. Re-syncs the panel whenever someone saves.
  useEffect(() => {
    let cancelled = false;
    fetchAllElementConfigs().then((c) => { if (!cancelled) setAllConfigs(c); });
    const unsub = subscribeElementConfigs((c) => { if (!cancelled) setAllConfigs(c); });
    return () => { cancelled = true; unsub(); };
  }, []);

  // Whenever the selected element changes, hydrate the draft from its
  // current merged state.
  useEffect(() => {
    if (!selectedId) {
      setDraft({});
      setError(null);
      return;
    }
    const merged = mergeWithDefaults(selectedId, allConfigs[selectedId]);
    setDraft(merged);
    setError(null);
  }, [selectedId, allConfigs]);

  if (mode !== 'on' || !selectedId) return null;

  const spec = getElementSpec(selectedId);
  if (!spec) {
    return (
      <aside className="admin-editor-panel" role="complementary">
        <PanelHeader title="Unknown element" onClose={deselect} />
        <div className="admin-editor-panel__body">
          <Callout color="red">
            No registry entry for <code>{selectedId}</code>. Add it to
            src/lib/elementConfig.js to make it editable.
          </Callout>
        </div>
      </aside>
    );
  }

  function patchDraft(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Compute only the keys that differ from spec.defaults — minimal blob.
      const patch = {};
      for (const ctl of spec.controls) {
        patch[ctl.key] = draft[ctl.key];
      }
      await applyConfigUpdate(selectedId, patch);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setError(null);
    try {
      await resetElementToDefaults(selectedId);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Reset failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="admin-editor-panel" role="complementary" aria-label="Element editor">
      <PanelHeader title={spec.label} onClose={deselect} />
      <div className="admin-editor-panel__body">
        {spec.description && (
          <p className="admin-editor-panel__desc muted">{spec.description}</p>
        )}
        <div className="admin-editor-panel__controls">
          {spec.controls.map((ctl) => (
            <ControlRow
              key={ctl.key}
              ctl={ctl}
              value={draft[ctl.key]}
              onChange={(v) => patchDraft(ctl.key, v)}
              disabled={saving}
            />
          ))}
        </div>
        {error && <Callout color="red">{error}</Callout>}
      </div>
      <div className="admin-editor-panel__footer">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleReset}
          disabled={saving}
          title="Drop overrides and revert to default values."
        >
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
          <span style={{ marginLeft: 'var(--space-2)' }}>Reset to default</span>
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </aside>
  );
}

function PanelHeader({ title, onClose }) {
  return (
    <div className="admin-editor-panel__header">
      <div>
        <span className="admin-editor-panel__eyebrow">Editing element</span>
        <h3 className="admin-editor-panel__title">{title}</h3>
      </div>
      <button
        type="button"
        className="admin-editor-panel__close"
        onClick={onClose}
        aria-label="Close editor"
      >
        <XIcon size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

function ControlRow({ ctl, value, onChange, disabled }) {
  if (ctl.type === 'toggle') {
    return (
      <label className="admin-editor-control">
        <span className="admin-editor-control__label">{ctl.label}</span>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
      </label>
    );
  }
  if (ctl.type === 'select') {
    return (
      <label className="admin-editor-control">
        <span className="admin-editor-control__label">{ctl.label}</span>
        <select
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            // Coerce back to number if the underlying option used numbers
            // (e.g. expandedWidth: 260 vs '260'). Looks ugly but JSON round-
            // trips treat numeric option values as strings in <select>.
            const found = ctl.options?.find((o) => String(o.value) === raw);
            onChange(found ? found.value : raw);
          }}
          disabled={disabled}
        >
          {ctl.options?.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      </label>
    );
  }
  return null;
}
