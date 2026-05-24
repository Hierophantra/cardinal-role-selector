import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  fetchKpiTemplates,
  createKpiTemplate,
  updateKpiTemplate,
  deleteKpiTemplate,
  fetchGrowthPriorityTemplates,
  createGrowthPriorityTemplate,
  updateGrowthPriorityTemplate,
  deleteGrowthPriorityTemplate,
  fetchKpiSelections,
  fetchGrowthPriorities,
  adminSwapKpiTemplate,
  adminEditKpiLabel,
  unlockPartnerSelections,
  cascadeTemplateLabelSnapshot,
} from '../../lib/supabase.js';
import { ADMIN_KPI_COPY, PARTNER_DISPLAY, CATEGORY_LABELS } from '../../data/content.js';
import KeyFieldsEditor, { suggestBaselineAction, validateKeyFields } from './KeyFieldsEditor.jsx';

const KPI_CATEGORIES = ['sales', 'ops', 'client', 'team', 'finance'];
const GROWTH_TYPES = ['personal', 'business'];
const MANAGED = ['theo', 'jerry'];
const ARM_DISARM_MS = 3000;
const SCOPE_DISPLAY = { shared: 'Shared', theo: 'Theo', jerry: 'Jerry', both: 'Both' };
const PARTNER_SCOPE_OPTIONS = ['shared', 'both', 'theo', 'jerry'];

export default function AdminKpi() {
  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="brand">
          <img src="/logo.png" alt="Cardinal" />
          <span>Role Definition Tool</span>
        </div>
        <div className="partner-tag">Admin</div>
      </div>
      <div className="container">
        <div className="screen fade-in">
          <div style={{ marginBottom: 16 }}>
            <Link to="/admin/hub" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              {'\u2190'} Back to Admin Hub
            </Link>
          </div>

          <div className="screen-header">
            <div className="eyebrow">{ADMIN_KPI_COPY.eyebrow}</div>
            <h2>{ADMIN_KPI_COPY.heading}</h2>
          </div>

          <KpiTemplateLibrary />
          <GrowthTemplateLibrary />
          <PartnerSelectionsEditor />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * KpiTemplateLibrary — CRUD for kpi_templates
 * ============================================================ */
function KpiTemplateLibrary() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // null | uuid | 'new'
  const [editDraft, setEditDraft] = useState(makeBlankDraft());
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const disarmTimerRef = useRef(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchKpiTemplates();
      setTemplates(rows ?? []);
    } catch (err) {
      console.error(err);
      setError('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    return () => {
      if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    };
  }, [loadTemplates]);

  function beginEdit(t) {
    setEditingId(t.id);
    setEditDraft({
      label: t.label ?? '',
      category: t.category ?? KPI_CATEGORIES[0],
      description: t.description ?? '',
      measure: t.measure ?? '',
      baseline_action: t.baseline_action ?? '',
      partner_scope: t.partner_scope ?? 'shared',
      mandatory: t.mandatory ?? false,
      countable: t.countable ?? false,
      reflection_prompt: t.reflection_prompt ?? '',
      key_fields: t.key_fields ?? null,
    });
    setError('');
  }

  function beginAdd() {
    setEditingId('new');
    setEditDraft(makeBlankDraft());
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(makeBlankDraft());
    setError('');
  }

  function validate(draft) {
    if (!draft.label.trim()) return 'Label is required.';
    // baseline_action is NOT NULL in the DB (migration 009). Required here
    // so we don't slam null into the column and trigger the generic save fail.
    if (!draft.baseline_action || !draft.baseline_action.trim()) {
      return 'Baseline action is required — it\'s the line partners see at the top of the KPI card.';
    }
    if (!KPI_CATEGORIES.includes(draft.category)) return 'Invalid category.';
    if (!PARTNER_SCOPE_OPTIONS.includes(draft.partner_scope)) return 'Invalid partner scope.';
    if (draft.key_fields !== null) {
      const kfErrors = validateKeyFields(draft.key_fields);
      if (kfErrors.length > 0) return `Structured fields: ${kfErrors[0]}`;
    }
    return null;
  }

  async function handleSave() {
    const err = validate(editDraft);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        label: editDraft.label.trim(),
        category: editDraft.category,
        description: editDraft.description?.trim() || null,
        measure: editDraft.measure?.trim() || null,
        baseline_action: editDraft.baseline_action?.trim() || null,
        partner_scope: editDraft.partner_scope,
        mandatory: !!editDraft.mandatory,
        countable: !!editDraft.countable,
        reflection_prompt: editDraft.reflection_prompt?.trim() || null,
        key_fields: editDraft.key_fields,
      };
      if (editingId === 'new') {
        await createKpiTemplate(payload);
      } else {
        await updateKpiTemplate(editingId, payload);
        // Cascade label_snapshot to kpi_selections (D-05)
        try {
          await cascadeTemplateLabelSnapshot(editingId, payload.label);
        } catch (cascadeErr) {
          console.error(cascadeErr);
          setError(ADMIN_KPI_COPY.errors.cascadeFail);
          await loadTemplates();
          cancelEdit();
          setSaving(false);
          return; // Template saved but cascade failed — show specific error, don't show success flash
        }
      }
      await loadTemplates();
      cancelEdit();
      showFlash(ADMIN_KPI_COPY.savedFlash);
    } catch (err2) {
      console.error(err2);
      // Surface the actual Supabase / Postgres error inline so the admin
      // can act on it (e.g. "null value in column X violates not-null
      // constraint") instead of the generic "Couldn't save" catch-all.
      const detail = err2?.message || err2?.hint || err2?.details || '';
      setError(detail ? `${ADMIN_KPI_COPY.errors.saveFail} — ${detail}` : ADMIN_KPI_COPY.errors.saveFail);
    } finally {
      setSaving(false);
    }
  }

  function armDelete(id) {
    setPendingDeleteId(id);
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    disarmTimerRef.current = setTimeout(() => {
      setPendingDeleteId(null);
    }, ARM_DISARM_MS);
  }

  function disarmDelete() {
    setPendingDeleteId(null);
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
  }

  async function confirmDelete(id) {
    setSaving(true);
    setError('');
    try {
      await deleteKpiTemplate(id);
      await loadTemplates();
      disarmDelete();
      showFlash('Deleted');
    } catch (err) {
      console.error(err);
      setError(ADMIN_KPI_COPY.errors.deleteFail);
    } finally {
      setSaving(false);
    }
  }

  function showFlash(text) {
    setFlash(text);
    setTimeout(() => setFlash(''), 1500);
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {ADMIN_KPI_COPY.templateSectionHeading.toUpperCase()}
      </div>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>{ADMIN_KPI_COPY.templateSectionHeading}</h3>
      <p className="muted" style={{ marginBottom: 16 }}>
        {ADMIN_KPI_COPY.templateSectionSubtext}
      </p>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <div className="kpi-list">
          {templates.length === 0 && (
            <p className="muted">{ADMIN_KPI_COPY.emptyTemplates}</p>
          )}
          {templates.map((t) => {
            const isEditing = editingId === t.id;
            const isPendingDelete = pendingDeleteId === t.id;
            return (
              <div
                key={t.id}
                className={`kpi-card kpi-template-editor-card${isEditing ? ' editing' : ''}`}
              >
                {isEditing ? (
                  <EditForm
                    draft={editDraft}
                    setDraft={setEditDraft}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    saving={saving}
                    error={error}
                  />
                ) : (
                  <>
                    <h4 className="kpi-card-label" style={{ margin: 0 }}>
                      {t.label}
                    </h4>
                    <span className="kpi-category-tag">{CATEGORY_LABELS[t.category] ?? t.category}</span>
                    <div className="kpi-template-tag-row">
                      <span className="kpi-scope-tag">
                        {SCOPE_DISPLAY[t.partner_scope] ?? t.partner_scope}
                      </span>
                      <span className="kpi-mandatory-badge">
                        {t.mandatory ? 'Mandatory' : 'Choice'}
                      </span>
                    </div>
                    {t.description && (
                      <p className="kpi-card-description">{t.description}</p>
                    )}
                    <div className="kpi-template-editor-actions">
                      {isPendingDelete && !t.mandatory ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={disarmDelete}
                            disabled={saving}
                          >
                            {ADMIN_KPI_COPY.keepBtn}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              background: 'rgba(196,30,58,0.14)',
                              borderColor: 'var(--red)',
                              color: 'var(--text)',
                            }}
                            onClick={() => confirmDelete(t.id)}
                            disabled={saving}
                          >
                            {ADMIN_KPI_COPY.deleteConfirmBtn}
                          </button>
                        </>
                      ) : (
                        <div className="kpi-template-editor-actions">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => beginEdit(t)}
                            disabled={saving || editingId !== null}
                          >
                            {ADMIN_KPI_COPY.editBtn}
                          </button>
                          {!t.mandatory && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => armDelete(t.id)}
                              disabled={saving || editingId !== null}
                            >
                              {ADMIN_KPI_COPY.deleteBtn}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {t.mandatory && (
                      <p className="kpi-template-no-delete-note">
                        {ADMIN_KPI_COPY.mandatoryNoDeleteNote}
                      </p>
                    )}
                    {isPendingDelete && !t.mandatory && (
                      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                        {ADMIN_KPI_COPY.deleteWarning}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {editingId === 'new' ? (
            <div className="kpi-card kpi-template-editor-card editing">
              <EditForm
                draft={editDraft}
                setDraft={setEditDraft}
                onSave={handleSave}
                onCancel={cancelEdit}
                saving={saving}
                error={error}
              />
            </div>
          ) : (
            <button
              type="button"
              className="kpi-card kpi-template-add-card"
              onClick={beginAdd}
              disabled={editingId !== null}
            >
              {ADMIN_KPI_COPY.addTemplateCta}
            </button>
          )}
        </div>
      )}

      {error && editingId === null && (
        <p className="muted" style={{ color: 'var(--miss)', marginTop: 8 }}>
          {error}
        </p>
      )}
      {flash && (
        <p className="muted" style={{ color: 'var(--gold)', marginTop: 8 }}>
          {flash}
        </p>
      )}
    </section>
  );
}

function makeBlankDraft() {
  return {
    label: '',
    category: KPI_CATEGORIES[0],
    description: '',
    measure: '',
    baseline_action: '',
    partner_scope: 'shared',
    mandatory: false,
    countable: false,
    reflection_prompt: '',
    key_fields: null,
  };
}

function EditForm({ draft, setDraft, onSave, onCancel, saving, error }) {
  const baselineSuggestion = suggestBaselineAction(draft.key_fields);
  const canSuggest = !!baselineSuggestion && baselineSuggestion !== (draft.baseline_action || '').trim();

  return (
    <div className="kpi-edit-form">
      {/* --- BASICS --- */}
      <section className="kpi-edit-section">
        <h4 className="kpi-edit-section-heading">Basics</h4>
        <label className="kpi-edit-label">Template name (admin / internal)</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. New leads contacted or followed up"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />

        <label className="kpi-edit-label">Baseline action (what partners actually see at the top of the card)</label>
        <textarea
          className="input"
          placeholder="e.g. Minimum 10 outreach actions per week: calls, meetings, follow-ups with referral partners or prospects."
          value={draft.baseline_action}
          onChange={(e) => setDraft({ ...draft, baseline_action: e.target.value })}
          rows={3}
        />
        {canSuggest && (
          <div className="kpi-magic-suggest">
            <div className="kpi-magic-suggest__text">
              <strong>Suggested from structured fields:</strong> {baselineSuggestion}
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setDraft({ ...draft, baseline_action: baselineSuggestion })}
            >
              Apply suggestion
            </button>
          </div>
        )}

        <div className="kpi-edit-grid">
          <div>
            <label className="kpi-edit-label">Category</label>
            <select
              className="input"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {KPI_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="kpi-edit-label">Partner scope</label>
            <select
              className="input"
              value={draft.partner_scope}
              onChange={(e) => setDraft({ ...draft, partner_scope: e.target.value })}
            >
              {PARTNER_SCOPE_OPTIONS.map((s) => (
                <option key={s} value={s}>{SCOPE_DISPLAY[s] ?? s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="kpi-edit-flags">
          <label className="kpi-edit-checkbox">
            <input
              type="checkbox"
              checked={!!draft.mandatory}
              onChange={(e) => setDraft({ ...draft, mandatory: e.target.checked })}
            />
            Mandatory (auto-selected on every weekly scorecard)
          </label>
          <label className="kpi-edit-checkbox">
            <input
              type="checkbox"
              checked={!!draft.countable}
              onChange={(e) => setDraft({ ...draft, countable: e.target.checked })}
            />
            Countable (+1 counter on hub)
          </label>
        </div>
      </section>

      {/* --- STRUCTURED FIELDS --- */}
      <section className="kpi-edit-section">
        <h4 className="kpi-edit-section-heading">Structured fields</h4>
        <p className="kpi-edit-hint">
          What partners type in below the Yes/No/Pending picker. Use this for evidence
          partners must capture each week (job IDs, currency values, who they coached, etc.).
        </p>
        <KeyFieldsEditor
          value={draft.key_fields}
          onChange={(next) => setDraft({ ...draft, key_fields: next })}
        />
      </section>

      {/* --- ADVANCED / OPTIONAL --- */}
      <section className="kpi-edit-section">
        <h4 className="kpi-edit-section-heading">Advanced (optional)</h4>
        <label className="kpi-edit-label">Reflection prompt (helper text under "Questions, Thoughts, or Concerns")</label>
        <input
          type="text"
          className="input"
          placeholder="Leave blank to use the default reflection textarea"
          value={draft.reflection_prompt}
          onChange={(e) => setDraft({ ...draft, reflection_prompt: e.target.value })}
        />

        <label className="kpi-edit-label">Description (internal notes; not shown to partners)</label>
        <textarea
          className="input"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={2}
        />

        <label className="kpi-edit-label">Measure (legacy / internal — how the KPI was originally tracked)</label>
        <textarea
          className="input"
          value={draft.measure}
          onChange={(e) => setDraft({ ...draft, measure: e.target.value })}
          rows={2}
        />
      </section>

      {error && (
        <p className="muted kpi-edit-error">{error}</p>
      )}
      <div className="kpi-template-editor-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          {ADMIN_KPI_COPY.discardBtn}
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
          {ADMIN_KPI_COPY.saveBtn}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * GrowthTemplateLibrary — CRUD for growth_priority_templates
 * ============================================================ */
function GrowthTemplateLibrary() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ type: 'personal', description: '', sort_order: 0 });
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const disarmTimerRef = useRef(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchGrowthPriorityTemplates();
      setTemplates(rows ?? []);
    } catch (err) {
      console.error(err);
      setError('Failed to load growth templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    return () => {
      if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    };
  }, [loadTemplates]);

  function beginEdit(t) {
    setEditingId(t.id);
    setEditDraft({
      type: t.type ?? 'personal',
      description: t.description ?? '',
      sort_order: t.sort_order ?? 0,
    });
    setError('');
  }

  function beginAdd(type) {
    setEditingId('new');
    setEditDraft({ type, description: '', sort_order: 0 });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({ type: 'personal', description: '', sort_order: 0 });
    setError('');
  }

  function validate(draft) {
    if (!draft.description.trim()) return 'Description is required.';
    if (!GROWTH_TYPES.includes(draft.type)) return 'Invalid type.';
    return null;
  }

  async function handleSave() {
    const err = validate(editDraft);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        type: editDraft.type,
        description: editDraft.description.trim(),
        sort_order: Number(editDraft.sort_order) || 0,
      };
      if (editingId === 'new') {
        await createGrowthPriorityTemplate(payload);
      } else {
        await updateGrowthPriorityTemplate(editingId, payload);
      }
      await loadTemplates();
      cancelEdit();
      showFlash('Saved');
    } catch (err2) {
      console.error(err2);
      setError(ADMIN_KPI_COPY.errors.saveFail);
    } finally {
      setSaving(false);
    }
  }

  function armDelete(id) {
    setPendingDeleteId(id);
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
    disarmTimerRef.current = setTimeout(() => {
      setPendingDeleteId(null);
    }, ARM_DISARM_MS);
  }

  function disarmDelete() {
    setPendingDeleteId(null);
    if (disarmTimerRef.current) clearTimeout(disarmTimerRef.current);
  }

  async function confirmDelete(id) {
    setSaving(true);
    setError('');
    try {
      await deleteGrowthPriorityTemplate(id);
      await loadTemplates();
      disarmDelete();
      showFlash('Deleted');
    } catch (err) {
      console.error(err);
      setError(ADMIN_KPI_COPY.errors.deleteFail);
    } finally {
      setSaving(false);
    }
  }

  function showFlash(text) {
    setFlash(text);
    setTimeout(() => setFlash(''), 1500);
  }

  const grouped = {
    personal: templates.filter((t) => t.type === 'personal'),
    business: templates.filter((t) => t.type === 'business'),
  };

  return (
    <section style={{ marginBottom: 48 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        GROWTH PRIORITY TEMPLATES
      </div>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>Growth Priority Templates</h3>
      <p className="muted" style={{ marginBottom: 16 }}>
        Templates partners can pick for their 1 personal + 2 business growth priorities.
      </p>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        GROWTH_TYPES.map((type) => (
          <div key={type} style={{ marginBottom: 24 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {type === 'personal' ? 'PERSONAL' : 'BUSINESS'}
            </div>
            <div className="kpi-list">
              {grouped[type].length === 0 && (
                <p className="muted">No {type} templates yet.</p>
              )}
              {grouped[type].map((t) => {
                const isEditing = editingId === t.id;
                const isPendingDelete = pendingDeleteId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`kpi-card kpi-template-editor-card${isEditing ? ' editing' : ''}`}
                  >
                    {isEditing ? (
                      <GrowthEditForm
                        draft={editDraft}
                        setDraft={setEditDraft}
                        onSave={handleSave}
                        onCancel={cancelEdit}
                        saving={saving}
                        error={error}
                      />
                    ) : (
                      <>
                        <p className="kpi-card-label" style={{ margin: 0 }}>
                          {t.description}
                        </p>
                        <span className="kpi-category-tag">{t.type}</span>
                        <div className="kpi-template-editor-actions">
                          {isPendingDelete ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={disarmDelete}
                                disabled={saving}
                              >
                                {ADMIN_KPI_COPY.keepBtn}
                              </button>
                              <button
                                type="button"
                                className="btn"
                                style={{
                                  background: 'rgba(196,30,58,0.14)',
                                  borderColor: 'var(--red)',
                                  color: 'var(--text)',
                                }}
                                onClick={() => confirmDelete(t.id)}
                                disabled={saving}
                              >
                                {ADMIN_KPI_COPY.deleteConfirmBtn}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => beginEdit(t)}
                                disabled={saving || editingId !== null}
                              >
                                {ADMIN_KPI_COPY.editBtn}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => armDelete(t.id)}
                                disabled={saving || editingId !== null}
                              >
                                {ADMIN_KPI_COPY.deleteBtn}
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {editingId === 'new' && editDraft.type === type ? null : (
                <button
                  type="button"
                  className="kpi-card kpi-template-add-card"
                  onClick={() => beginAdd(type)}
                  disabled={editingId !== null}
                >
                  {ADMIN_KPI_COPY.addTemplateCta}
                </button>
              )}
            </div>
            {editingId === 'new' && editDraft.type === type && (
              <div
                className="kpi-card kpi-template-editor-card editing"
                style={{ marginTop: 12 }}
              >
                <GrowthEditForm
                  draft={editDraft}
                  setDraft={setEditDraft}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  saving={saving}
                  error={error}
                />
              </div>
            )}
          </div>
        ))
      )}

      {flash && (
        <p className="muted" style={{ color: 'var(--gold)', marginTop: 8 }}>
          {flash}
        </p>
      )}
    </section>
  );
}

function GrowthEditForm({ draft, setDraft, onSave, onCancel, saving, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <select
        className="input"
        value={draft.type}
        onChange={(e) => setDraft({ ...draft, type: e.target.value })}
      >
        {GROWTH_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <textarea
        className="input"
        placeholder="Growth priority description"
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        rows={3}
      />
      <input
        type="number"
        className="input"
        placeholder="Sort order"
        value={draft.sort_order}
        onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
      />
      {error && (
        <p className="muted" style={{ color: 'var(--miss)', margin: 0 }}>
          {error}
        </p>
      )}
      <div className="kpi-template-editor-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          {ADMIN_KPI_COPY.discardBtn}
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
          {ADMIN_KPI_COPY.saveBtn}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * PartnerSelectionsEditor — cross-partner 2-column editor
 * ============================================================ */
function PartnerSelectionsEditor() {
  const [searchParams] = useSearchParams();
  const focusedPartner = searchParams.get('partner');

  const [templates, setTemplates] = useState([]);
  const [partnerData, setPartnerData] = useState({
    theo: { kpis: [], growth: [] },
    jerry: { kpis: [], growth: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editingDraft, setEditingDraft] = useState({ mode: 'label', label: '', templateId: '' });
  const [unlockPending, setUnlockPending] = useState({ theo: false, jerry: false });
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState('');
  const unlockTimerRef = useRef(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tpls, theoKpis, jerryKpis, theoGrowth, jerryGrowth] = await Promise.all([
        fetchKpiTemplates(),
        fetchKpiSelections('theo'),
        fetchKpiSelections('jerry'),
        fetchGrowthPriorities('theo'),
        fetchGrowthPriorities('jerry'),
      ]);
      setTemplates(tpls ?? []);
      setPartnerData({
        theo: { kpis: theoKpis ?? [], growth: theoGrowth ?? [] },
        jerry: { kpis: jerryKpis ?? [], growth: jerryGrowth ?? [] },
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load partner selections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    };
  }, [loadState]);

  function beginEditSlot(sel) {
    setEditingSlotId(sel.id);
    setEditingDraft({
      mode: 'label',
      label: sel.label_snapshot ?? '',
      templateId: sel.template_id ?? '',
    });
  }

  function cancelSlot() {
    setEditingSlotId(null);
    setEditingDraft({ mode: 'label', label: '', templateId: '' });
  }

  async function saveSlot(sel) {
    setSaving(true);
    try {
      if (editingDraft.mode === 'label') {
        await adminEditKpiLabel(sel.id, editingDraft.label.trim());
      } else {
        const tpl = templates.find((t) => t.id === editingDraft.templateId);
        if (!tpl) {
          setError('Pick a template to swap to.');
          setSaving(false);
          return;
        }
        await adminSwapKpiTemplate(sel.id, tpl);
      }
      await loadState();
      cancelSlot();
      showFlash('Saved');
    } catch (err) {
      console.error(err);
      setError(ADMIN_KPI_COPY.errors.saveFail);
    } finally {
      setSaving(false);
    }
  }

  function armUnlock(partner) {
    setUnlockPending((prev) => ({ ...prev, [partner]: true }));
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      setUnlockPending({ theo: false, jerry: false });
    }, ARM_DISARM_MS);
  }

  async function confirmUnlock(partner) {
    setSaving(true);
    setError('');
    try {
      await unlockPartnerSelections(partner);
      await loadState();
      setUnlockPending((prev) => ({ ...prev, [partner]: false }));
      showFlash(`Unlocked ${PARTNER_DISPLAY[partner]}`);
    } catch (err) {
      console.error(err);
      setError(ADMIN_KPI_COPY.errors.unlockFail);
    } finally {
      setSaving(false);
    }
  }

  function showFlash(text) {
    setFlash(text);
    setTimeout(() => setFlash(''), 1500);
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {ADMIN_KPI_COPY.selectionsSectionHeading.toUpperCase()}
      </div>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>
        {ADMIN_KPI_COPY.selectionsSectionHeading}
      </h3>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 24,
          }}
          className="admin-selections-grid"
        >
          {MANAGED.map((p) => {
            const { kpis } = partnerData[p];
            const partnerName = PARTNER_DISPLAY[p];
            const firstLock = kpis[0]?.locked_until;
            const isLocked = firstLock && new Date(firstLock).getTime() > Date.now();
            const armed = unlockPending[p];
            const isFocused = focusedPartner === p;
            return (
              <div
                key={p}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isFocused ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 16,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <h4 style={{ margin: 0 }}>{partnerName}</h4>
                  <span
                    className="kpi-category-tag"
                    style={{
                      color: isLocked ? 'var(--gold)' : 'var(--muted)',
                      background: isLocked ? 'rgba(212,168,67,0.10)' : 'var(--surface-2)',
                    }}
                  >
                    {isLocked
                      ? `Locked until ${new Date(firstLock).toLocaleDateString()}`
                      : 'Not locked'}
                  </span>
                </div>

                {isLocked && (
                  <div>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={
                        armed
                          ? {
                              background: 'rgba(196,30,58,0.14)',
                              borderColor: 'var(--red)',
                              color: 'var(--text)',
                            }
                          : undefined
                      }
                      onClick={() => (armed ? confirmUnlock(p) : armUnlock(p))}
                      disabled={saving}
                    >
                      {armed ? ADMIN_KPI_COPY.unlockConfirmBtn : ADMIN_KPI_COPY.unlockBtn}
                    </button>
                    {armed && (
                      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                        {ADMIN_KPI_COPY.unlockWarning(partnerName)}
                      </p>
                    )}
                  </div>
                )}

                {kpis.length === 0 ? (
                  <p className="muted">{ADMIN_KPI_COPY.emptySelections(partnerName)}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {kpis.map((sel) => {
                      const isEditing = editingSlotId === sel.id;
                      return (
                        <div
                          key={sel.id}
                          className="kpi-card"
                          style={{ padding: 16 }}
                        >
                          {isEditing ? (
                            <SlotEditor
                              sel={sel}
                              draft={editingDraft}
                              setDraft={setEditingDraft}
                              templates={templates}
                              onSave={() => saveSlot(sel)}
                              onCancel={cancelSlot}
                              saving={saving}
                            />
                          ) : (
                            <>
                              <p className="kpi-card-label" style={{ margin: 0 }}>
                                {sel.label_snapshot}
                              </p>
                              {sel.category_snapshot && (
                                <span className="kpi-category-tag">
                                  {sel.category_snapshot}
                                </span>
                              )}
                              <div className="kpi-template-editor-actions">
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => beginEditSlot(sel)}
                                  disabled={saving || editingSlotId !== null}
                                >
                                  {ADMIN_KPI_COPY.editSlotBtn}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="muted" style={{ color: 'var(--miss)', marginTop: 12 }}>
          {error}
        </p>
      )}
      {flash && (
        <p className="muted" style={{ color: 'var(--gold)', marginTop: 12 }}>
          {flash}
        </p>
      )}
    </section>
  );
}

function SlotEditor({ draft, setDraft, templates, onSave, onCancel, saving }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`btn ${draft.mode === 'label' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setDraft({ ...draft, mode: 'label' })}
          disabled={saving}
        >
          Edit Label
        </button>
        <button
          type="button"
          className={`btn ${draft.mode === 'swap' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setDraft({ ...draft, mode: 'swap' })}
          disabled={saving}
        >
          Swap Template
        </button>
      </div>

      {draft.mode === 'label' ? (
        <input
          type="text"
          className="input"
          placeholder="Label snapshot"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
      ) : (
        <select
          className="input"
          value={draft.templateId}
          onChange={(e) => setDraft({ ...draft, templateId: e.target.value })}
        >
          <option value="">Select a template...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} ({t.category})
            </option>
          ))}
        </select>
      )}

      <div className="kpi-template-editor-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          {ADMIN_KPI_COPY.discardBtn}
        </button>
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
          {ADMIN_KPI_COPY.saveSlotBtn}
        </button>
      </div>
    </div>
  );
}
