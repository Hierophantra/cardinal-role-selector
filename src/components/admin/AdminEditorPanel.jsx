// AdminEditorPanel — Phase 2.
//
// Side drawer that opens when an editable element is selected. Renders
// one control per spec.controls entry. Supports five control types:
//   - toggle  (boolean)
//   - select  (one-of from options)
//   - text    (textarea — content override)
//   - color   (design-token dropdown + optional hex)
//   - range   (numeric slider w/ min/max/step)
//
// Phase 2 additions:
//   - Per-partner save scope. When the admin is on /hub/theo, default scope
//     is "Theo only" with radio to switch to "global / both partners".
//   - Undo / redo buttons in the panel header (Ctrl+Z still works globally).
//   - Saving records a pre-save snapshot via recordPreSave for undo.
//
// Reference: Cardinal nervous-system doctrine.

import { useEffect, useState } from 'react';
import { X as XIcon, RotateCcw, Undo2, Redo2, LogOut } from 'lucide-react';
import { useAdminEditor } from './AdminEditorContext.jsx';
import {
  getElementSpec,
  mergeWithDefaults,
  applyConfigUpdate,
  resetElementToDefaults,
  subscribeElementConfigs,
  fetchAllElementConfigs,
  getColorTokenOptions,
} from '../../lib/elementConfig.js';
import Callout from '../Callout.jsx';

export default function AdminEditorPanel() {
  const {
    mode, selectedId, deselect, exitMode,
    viewingPartner, saveScope, setSaveScope,
    recordPreSave, undo, redo, canUndo, canRedo,
  } = useAdminEditor();

  const [allConfigs, setAllConfigs] = useState({});
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to global cache.
  useEffect(() => {
    let cancelled = false;
    fetchAllElementConfigs().then((c) => { if (!cancelled) setAllConfigs(c); });
    const unsub = subscribeElementConfigs((c) => { if (!cancelled) setAllConfigs(c); });
    return () => { cancelled = true; unsub(); };
  }, []);

  // Rehydrate draft when selection or scope changes. The merged value
  // depends on saveScope — when admin is editing Theo only, we want the
  // textarea pre-populated with what Theo currently sees (partner override
  // merged on top of global).
  useEffect(() => {
    if (!selectedId) { setDraft({}); setError(null); return; }
    const partnerCtx = (saveScope === 'global') ? null : saveScope;
    const merged = mergeWithDefaults(selectedId, allConfigs, partnerCtx);
    setDraft(merged);
    setError(null);
  }, [selectedId, allConfigs, saveScope]);

  if (mode !== 'on' || !selectedId) return null;

  const spec = getElementSpec(selectedId);
  if (!spec) {
    return (
      <aside className="admin-editor-panel" role="complementary" data-no-edit>
        <PanelHeader
          title="Unknown element"
          onClose={deselect}
          onUndo={undo} onRedo={redo}
          canUndo={canUndo} canRedo={canRedo}
        />
        <div className="admin-editor-panel__body">
          <Callout color="red">
            No registry entry for <code>{selectedId}</code>. Add it to
            src/lib/elementConfig.js to make it editable.
          </Callout>
        </div>
      </aside>
    );
  }

  const canPartnerScope = spec.scope === 'partner-aware';

  function patchDraft(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const patch = {};
      for (const ctl of spec.controls) {
        patch[ctl.key] = draft[ctl.key];
      }
      // Record snapshot BEFORE the update lands so undo restores cleanly.
      recordPreSave();
      const scope = (canPartnerScope && saveScope !== 'global') ? saveScope : 'global';
      await applyConfigUpdate(selectedId, patch, { scope });
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
      recordPreSave();
      const scope = (canPartnerScope && saveScope !== 'global') ? saveScope : 'global';
      await resetElementToDefaults(selectedId, { scope });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Reset failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="admin-editor-panel" role="complementary" aria-label="Element editor" data-no-edit>
      <PanelHeader
        title={spec.label}
        onClose={deselect}
        onUndo={undo} onRedo={redo}
        canUndo={canUndo} canRedo={canRedo}
      />
      <div className="admin-editor-panel__body">
        {spec.description && (
          <p className="admin-editor-panel__desc muted">{spec.description}</p>
        )}

        {/* Per-partner scope selector — only for partner-aware elements. */}
        {canPartnerScope && (
          <div className="admin-editor-scope">
            <div className="admin-editor-scope__label">Apply this change to:</div>
            <div className="admin-editor-scope__options">
              {viewingPartner && (
                <label className="admin-editor-scope__option">
                  <input
                    type="radio"
                    name="save-scope"
                    value={viewingPartner}
                    checked={saveScope === viewingPartner}
                    onChange={() => setSaveScope(viewingPartner)}
                  />
                  <span>{partnerLabel(viewingPartner)} only</span>
                </label>
              )}
              <label className="admin-editor-scope__option">
                <input
                  type="radio"
                  name="save-scope"
                  value="global"
                  checked={saveScope === 'global'}
                  onChange={() => setSaveScope('global')}
                />
                <span>Both partners (global)</span>
              </label>
            </div>
          </div>
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
          className="btn btn-ghost admin-editor-panel__exit"
          onClick={exitMode}
          disabled={saving}
          title="Close the editor and return to normal navigation."
        >
          <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
          <span style={{ marginLeft: 'var(--space-2)' }}>Exit edit mode</span>
        </button>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={saving}
            title="Drop overrides for this scope and revert to default."
          >
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
            <span style={{ marginLeft: 'var(--space-2)' }}>Reset</span>
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
      </div>
    </aside>
  );
}

function partnerLabel(slug) {
  if (slug === 'theo')  return 'Theo';
  if (slug === 'jerry') return 'Jerry';
  if (slug === 'test')  return 'Test profile';
  return slug;
}

function PanelHeader({ title, onClose, onUndo, onRedo, canUndo, canRedo }) {
  return (
    <div className="admin-editor-panel__header">
      <div>
        <span className="admin-editor-panel__eyebrow">Editing element</span>
        <h3 className="admin-editor-panel__title">{title}</h3>
      </div>
      <div className="admin-editor-panel__header-actions">
        <button
          type="button"
          className="admin-editor-panel__icon-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="admin-editor-panel__icon-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Redo2 size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="admin-editor-panel__close"
          onClick={onClose}
          aria-label="Close editor"
        >
          <XIcon size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ControlRow({ ctl, value, onChange, disabled }) {
  if (ctl.type === 'toggle') {
    return (
      <label className="admin-editor-control admin-editor-control--row">
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
  if (ctl.type === 'text') {
    return (
      <label className="admin-editor-control">
        <span className="admin-editor-control__label">{ctl.label}</span>
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ctl.placeholder || ''}
          rows={3}
          disabled={disabled}
        />
      </label>
    );
  }
  if (ctl.type === 'color') {
    return <ColorControl ctl={ctl} value={value} onChange={onChange} disabled={disabled} />;
  }
  if (ctl.type === 'range') {
    return (
      <label className="admin-editor-control">
        <span className="admin-editor-control__label">
          {ctl.label}: <strong>{value ?? ctl.min}</strong>{ctl.unit ?? 'px'}
        </span>
        <input
          type="range"
          min={ctl.min ?? 0}
          max={ctl.max ?? 100}
          step={ctl.step ?? 1}
          value={Number(value ?? ctl.min ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
        />
      </label>
    );
  }
  return null;
}

// Color control — token dropdown + advanced toggle to a hex input.
// Default mode uses the design-token palette (--red, --blue, etc.) so admin
// stays inside the coherent system. Advanced toggle reveals a free-form hex
// input for cases where a specific brand color is genuinely needed.
function ColorControl({ ctl, value, onChange, disabled }) {
  const options = getColorTokenOptions();
  const isToken = typeof value === 'string' && value.startsWith('var(--');
  const [advanced, setAdvanced] = useState(!isToken && !!value);

  return (
    <div className="admin-editor-control">
      <span className="admin-editor-control__label">{ctl.label}</span>
      {!advanced ? (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <div className="admin-editor-color-hex">
          <input
            type="color"
            value={isHex(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#C41E3A or var(--red)"
            disabled={disabled}
          />
        </div>
      )}
      <button
        type="button"
        className="admin-editor-control__advanced-toggle"
        onClick={() => setAdvanced((a) => !a)}
        disabled={disabled}
      >
        {advanced ? 'Use design tokens' : 'Advanced: pick custom color'}
      </button>
    </div>
  );
}

function isHex(v) {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.trim());
}
