// AdminLayout — admin-only page listing every element override + reset controls.
//
// Helps admin:
//   - See at a glance which elements have been customized (global + per-partner)
//   - Reset individual overrides
//   - Reset ALL overrides in one shot ("revert to factory defaults")
//   - Understand the full editable surface area
//
// Lives at /admin/layout. Sidebar nav entry visible only to admin.

import { useEffect, useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import PageHeader from '../PageHeader.jsx';
import Callout from '../Callout.jsx';
import {
  fetchAllElementConfigs,
  saveAllElementConfigs,
  resetElementToDefaults,
  subscribeElementConfigs,
  listElements,
  refreshElementConfigs,
} from '../../lib/elementConfig.js';

function getSessionRole() {
  try { return sessionStorage.getItem('cardinal-role'); } catch { return null; }
}

export default function AdminLayout() {
  const isAdmin = getSessionRole() === 'admin';
  const [allConfigs, setAllConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const elements = listElements();

  useEffect(() => {
    let cancelled = false;
    fetchAllElementConfigs()
      .then((c) => { if (!cancelled) setAllConfigs(c); })
      .catch((err) => { if (!cancelled) { console.error(err); setError('Failed to load overrides.'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    const unsub = subscribeElementConfigs((c) => { if (!cancelled) setAllConfigs(c); });
    return () => { cancelled = true; unsub(); };
  }, []);

  if (!isAdmin) {
    return (
      <div className="app-shell">
        <div className="container">
          <Callout color="red">This page is admin-only.</Callout>
        </div>
      </div>
    );
  }

  async function handleResetOne(id, scope) {
    setBusyId(`${id}:${scope}`);
    setError(null);
    try {
      await resetElementToDefaults(id, { scope });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Reset failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetAll() {
    setBusyId('__all__');
    setError(null);
    try {
      await saveAllElementConfigs({});
      await refreshElementConfigs();
      setConfirmResetAll(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Reset all failed.');
    } finally {
      setBusyId(null);
    }
  }

  // Compose a flat list: per element, list its override scopes (global + per partner).
  const rows = [];
  for (const el of elements) {
    const entry = allConfigs[el.id];
    if (!entry) continue;
    const { _partners, ...globalOverride } = entry;
    if (Object.keys(globalOverride).length > 0) {
      rows.push({ id: el.id, spec: el, scope: 'global', overrides: globalOverride });
    }
    if (_partners) {
      for (const [partner, partnerOverride] of Object.entries(_partners)) {
        if (Object.keys(partnerOverride).length > 0) {
          rows.push({ id: el.id, spec: el, scope: partner, overrides: partnerOverride });
        }
      }
    }
  }

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <PageHeader eyebrow="Admin / Layout" />
          <div className="screen-header" style={{ marginBottom: 'var(--space-4)' }}>
            <h2>Layout overrides</h2>
            <p className="muted" style={{ marginTop: 'var(--space-2)' }}>
              Every element you customized via the in-page editor lands here. Reset individual
              overrides per scope, or nuke everything back to factory defaults below.
            </p>
          </div>

          {error && <Callout color="red">{error}</Callout>}

          {loading ? (
            <p className="muted">Loading…</p>
          ) : rows.length === 0 ? (
            <Callout color="blue" title="Nothing customized yet.">
              When you save an element override in the in-page editor, it'll appear here.
            </Callout>
          ) : (
            <div className="layout-overrides-list">
              {rows.map((row) => (
                <div key={`${row.id}:${row.scope}`} className="layout-overrides-row">
                  <div className="layout-overrides-row__head">
                    <div>
                      <div className="layout-overrides-row__title">{row.spec.label}</div>
                      <div className="layout-overrides-row__id muted">{row.id} · {scopeLabel(row.scope)}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleResetOne(row.id, row.scope)}
                      disabled={busyId === `${row.id}:${row.scope}`}
                    >
                      <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
                      <span style={{ marginLeft: 'var(--space-2)' }}>
                        {busyId === `${row.id}:${row.scope}` ? 'Resetting…' : 'Reset'}
                      </span>
                    </button>
                  </div>
                  <div className="layout-overrides-row__props">
                    {Object.entries(row.overrides).map(([k, v]) => (
                      <span key={k} className="layout-overrides-prop">
                        <strong>{k}</strong>: <code>{String(v)}</code>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 'var(--space-8)' }}>
            <h3 style={{ marginTop: 0 }}>Danger zone</h3>
            <Callout color="red">
              <p style={{ margin: 0 }}>
                <strong>Reset every override.</strong> Drops all customizations across all
                elements + partner scopes and reverts the app to its built-in defaults.
                This cannot be undone via Ctrl+Z (the editor's undo stack is session-scoped).
              </p>
              {!confirmResetAll ? (
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 'var(--space-3)', background: 'rgba(196,30,58,0.16)', borderColor: 'var(--red)', color: 'var(--text)' }}
                  onClick={() => setConfirmResetAll(true)}
                  disabled={busyId === '__all__'}
                >
                  <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span style={{ marginLeft: 'var(--space-2)' }}>Reset all overrides</span>
                </button>
              ) : (
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setConfirmResetAll(false)}
                    disabled={busyId === '__all__'}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleResetAll}
                    disabled={busyId === '__all__'}
                    style={{ background: 'var(--miss)' }}
                  >
                    {busyId === '__all__' ? 'Resetting…' : 'Yes, reset everything'}
                  </button>
                </div>
              )}
            </Callout>
          </div>
        </div>
      </div>
    </div>
  );
}

function scopeLabel(scope) {
  if (scope === 'global') return 'Global (both partners)';
  if (scope === 'theo')   return 'Theo only';
  if (scope === 'jerry')  return 'Jerry only';
  if (scope === 'test')   return 'Test profile only';
  return scope;
}
