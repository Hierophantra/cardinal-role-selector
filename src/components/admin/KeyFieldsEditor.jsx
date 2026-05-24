// src/components/admin/KeyFieldsEditor.jsx — Tier 3A
//
// Pattern-Driven Form Builder for kpi_templates.key_fields JSONB. Per the
// Gemini synthesis, the admin picks a structural pattern (count_noteworthy /
// row_per_item / named_fields), then builds a vertical stack of typed
// fields. Each field has a property panel (type, required, min_length,
// required_when, helperText, placeholder, etc.). An "Advanced: JSON view"
// toggle lets a power user edit the raw JSONB when the visual builder
// doesn't cover an edge case.
//
// Field types supported: text, textarea, number, currency, yes_no,
// multi_choice (single or multi). Schema-level flags: hide_count,
// min_rows + shortfall_text, helperText. Per-field flags: required,
// required_when, min_length, placeholder, helperText (gross-margin
// equation-style).
//
// Validation: confirms the resulting JSON is one of the three known
// patterns and that each field has a key + type. Surfaces specific errors
// inline. Save flows go through the parent component's onChange.

import { useMemo, useState } from 'react';

const PATTERNS = [
  { value: '', label: 'None (no structured fields)' },
  { value: 'named_fields', label: 'Named fields (heterogeneous typed inputs)' },
  { value: 'row_per_item', label: 'Row per item (one row per real-world thing)' },
  { value: 'count_noteworthy', label: 'Count + noteworthy list' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text (textarea)' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'multi_choice', label: 'Multi-choice (options list)' },
];

// Default field shape for a freshly-added field.
function blankField(type = 'text') {
  const base = { key: '', label: '', type, required: false };
  if (type === 'multi_choice') return { ...base, options: [], single_select: true };
  return base;
}

function slugify(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Magic String suggester — derives a plausible baseline_action sentence
// from the current schema so the human-readable instruction stays in sync.
export function suggestBaselineAction(schema) {
  if (!schema || !schema.pattern) return '';
  if (schema.pattern === 'count_noteworthy') {
    const min = Number.isInteger(schema.min_rows) ? schema.min_rows : null;
    const label = schema.noteworthyLabel?.trim() || 'noteworthy entries';
    if (min) return `Log at least ${min} ${label.toLowerCase()} for the week.`;
    return `Log ${label.toLowerCase()} for the week.`;
  }
  if (schema.pattern === 'row_per_item') {
    const min = Number.isInteger(schema.min_rows) ? schema.min_rows : null;
    const rowLabel = schema.rowLabel?.trim() || 'item';
    const fields = (schema.rowFields || []).map((f) => (f.label || f.key)).filter(Boolean);
    const fieldsTxt = fields.length ? ` Capture ${fields.join(', ')} per row.` : '';
    if (min) return `Track at least ${min} ${rowLabel.toLowerCase()} entries this week.${fieldsTxt}`;
    return `Track ${rowLabel.toLowerCase()} entries this week.${fieldsTxt}`;
  }
  if (schema.pattern === 'named_fields') {
    const required = (schema.fields || []).filter((f) => f.required && f.label).map((f) => f.label);
    if (required.length === 0) return 'Fill in the weekly check-in.';
    if (required.length === 1) return `Report: ${required[0]}.`;
    if (required.length === 2) return `Report: ${required[0]} and ${required[1]}.`;
    return `Report: ${required.slice(0, -1).join(', ')}, and ${required[required.length - 1]}.`;
  }
  return '';
}

// Walk a key_fields object and return an array of validation errors. Empty
// array means "good to save."
export function validateKeyFields(schema) {
  if (schema === null) return [];                  // explicit no-structured-fields
  if (typeof schema !== 'object') return ['Schema must be an object or null'];
  if (!schema.pattern) return ['Missing pattern'];
  const okPatterns = ['count_noteworthy', 'row_per_item', 'named_fields'];
  if (!okPatterns.includes(schema.pattern)) {
    return [`Unknown pattern "${schema.pattern}". Expected one of: ${okPatterns.join(', ')}`];
  }
  const errors = [];
  const fields = schema.pattern === 'named_fields' ? (schema.fields || []) : (schema.rowFields || []);
  if (!Array.isArray(fields)) errors.push('Fields must be an array');
  fields.forEach((f, i) => {
    if (!f.key) errors.push(`Field ${i + 1}: missing key`);
    if (!f.type) errors.push(`Field ${i + 1}: missing type`);
    if (f.required_when && (!f.required_when.field || f.required_when.equals === undefined)) {
      errors.push(`Field ${f.key || i + 1}: required_when needs both "field" and "equals"`);
    }
    if (f.type === 'multi_choice') {
      if (!Array.isArray(f.options) || f.options.length === 0) {
        errors.push(`Field ${f.key || i + 1}: multi_choice needs at least one option`);
      }
    }
  });
  return errors;
}

export default function KeyFieldsEditor({ value, onChange }) {
  // Normalize null/undefined to a sentinel so the pattern picker shows "None".
  const schema = value && typeof value === 'object' ? value : null;
  const pattern = schema?.pattern ?? '';
  const [advanced, setAdvanced] = useState(false);
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(schema, null, 2));
  const [jsonError, setJsonError] = useState('');

  const errors = useMemo(() => validateKeyFields(schema), [schema]);
  const fields = (pattern === 'named_fields' ? schema?.fields : schema?.rowFields) ?? [];

  // ----- Pattern switching -----
  function setPattern(next) {
    if (!next) { onChange(null); return; }
    if (next === schema?.pattern) return;
    if (next === 'named_fields') {
      onChange({ pattern: 'named_fields', fields: [] });
    } else if (next === 'row_per_item') {
      onChange({ pattern: 'row_per_item', rowLabel: '', rowFields: [], hide_count: true });
    } else {
      onChange({ pattern: 'count_noteworthy', noteworthyLabel: '', rowFields: [], hide_count: true });
    }
  }

  // ----- Schema-level setters -----
  function patchSchema(patch) {
    onChange({ ...(schema ?? {}), ...patch });
  }

  // ----- Field array manipulation -----
  function setFieldsArr(nextFields) {
    if (pattern === 'named_fields') patchSchema({ fields: nextFields });
    else patchSchema({ rowFields: nextFields });
  }

  function addField() {
    setFieldsArr([...fields, blankField('text')]);
  }

  function removeField(i) {
    setFieldsArr(fields.filter((_, idx) => idx !== i));
  }

  function moveField(i, dir) {
    const next = [...fields];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setFieldsArr(next);
  }

  function patchField(i, patch) {
    setFieldsArr(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  // ----- Advanced JSON mode -----
  function commitJson() {
    try {
      const parsed = jsonDraft.trim() === '' || jsonDraft.trim() === 'null'
        ? null
        : JSON.parse(jsonDraft);
      const errs = validateKeyFields(parsed);
      if (errs.length > 0) {
        setJsonError(errs[0]);
        return;
      }
      setJsonError('');
      onChange(parsed);
    } catch (e) {
      setJsonError(`JSON parse error: ${e.message}`);
    }
  }

  function reSyncJsonDraft() {
    setJsonDraft(JSON.stringify(schema, null, 2));
    setJsonError('');
  }

  return (
    <div className="kf-editor">
      <div className="kf-editor-head">
        <div>
          <label className="kf-label">Structured fields pattern</label>
          <select
            className="input kf-pattern-select"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            {PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-ghost kf-advanced-toggle"
          onClick={() => {
            const next = !advanced;
            setAdvanced(next);
            if (next) reSyncJsonDraft();
          }}
        >
          {advanced ? 'Exit JSON view' : 'Advanced: JSON view'}
        </button>
      </div>

      {advanced ? (
        <div className="kf-json-panel">
          <textarea
            className="input kf-json-textarea"
            rows={20}
            spellCheck={false}
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
          />
          {jsonError && <p className="kf-error">{jsonError}</p>}
          <div className="kf-json-actions">
            <button type="button" className="btn btn-ghost" onClick={reSyncJsonDraft}>Reset to current</button>
            <button type="button" className="btn btn-primary" onClick={commitJson}>Apply JSON</button>
          </div>
        </div>
      ) : pattern === '' ? (
        <p className="muted kf-empty">No structured fields. Partners only see the Y/N/Pending picker and reflection textarea for this KPI.</p>
      ) : (
        <>
          {/* Schema-level controls (pattern-specific) */}
          <div className="kf-section">
            {(pattern === 'count_noteworthy' || pattern === 'row_per_item') && (
              <>
                {pattern === 'row_per_item' && (
                  <div className="kf-row">
                    <label className="kf-label">Row label (e.g. "Per job", "Per follow-up")</label>
                    <input
                      type="text"
                      className="input"
                      value={schema?.rowLabel ?? ''}
                      onChange={(e) => patchSchema({ rowLabel: e.target.value })}
                    />
                  </div>
                )}
                {pattern === 'count_noteworthy' && (
                  <div className="kf-row">
                    <label className="kf-label">Noteworthy list label</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Outreach actions for the week"
                      value={schema?.noteworthyLabel ?? ''}
                      onChange={(e) => patchSchema({ noteworthyLabel: e.target.value })}
                    />
                  </div>
                )}
                <div className="kf-row kf-row--inline">
                  <label className="kf-label">Minimum rows</label>
                  <input
                    type="number"
                    min={0}
                    className="input kf-input--narrow"
                    value={Number.isInteger(schema?.min_rows) ? schema.min_rows : ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10));
                      patchSchema({ min_rows: Number.isNaN(v) ? undefined : v });
                    }}
                  />
                  <span className="kf-hint">Blank = no minimum</span>
                </div>
                {Number.isInteger(schema?.min_rows) && schema.min_rows > 0 && (
                  <div className="kf-row">
                    <label className="kf-label">Shortfall text label (shown when fewer rows than min)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder='e.g. "If fewer than 3 — explain why"'
                      value={schema?.shortfall_text?.label ?? ''}
                      onChange={(e) => patchSchema({
                        shortfall_text: {
                          key: schema?.shortfall_text?.key || 'shortfall_text',
                          label: e.target.value,
                          required_when_short: true,
                        },
                      })}
                    />
                  </div>
                )}
                <div className="kf-row kf-row--inline">
                  <label className="kf-checkbox">
                    <input
                      type="checkbox"
                      checked={!!schema?.hide_count}
                      onChange={(e) => patchSchema({ hide_count: e.target.checked })}
                    />
                    Hide the count input (derive from row count)
                  </label>
                </div>
              </>
            )}
            <div className="kf-row">
              <label className="kf-label">Helper text (rendered above the input area, optional)</label>
              <input
                type="text"
                className="input"
                placeholder='e.g. "Gross Margin = (Revenue − Cost of Goods Sold) / Revenue"'
                value={schema?.helperText ?? ''}
                onChange={(e) => patchSchema({ helperText: e.target.value || undefined })}
              />
            </div>
          </div>

          {/* Field stack */}
          <div className="kf-fields-stack">
            <div className="kf-fields-head">
              <h4>{pattern === 'named_fields' ? 'Fields' : 'Row fields (one per row)'}</h4>
              <button type="button" className="btn-ghost kf-add-field" onClick={addField}>+ Add field</button>
            </div>
            {fields.length === 0 ? (
              <p className="muted kf-empty">No fields yet. Click "+ Add field" to start.</p>
            ) : fields.map((f, i) => (
              <FieldEditor
                key={i}
                index={i}
                count={fields.length}
                field={f}
                otherKeys={fields.filter((_, idx) => idx !== i).map((x) => x.key).filter(Boolean)}
                onChange={(patch) => patchField(i, patch)}
                onRemove={() => removeField(i)}
                onMoveUp={() => moveField(i, -1)}
                onMoveDown={() => moveField(i, 1)}
              />
            ))}
          </div>
        </>
      )}

      {errors.length > 0 && (
        <div className="kf-errors">
          <strong>Schema needs:</strong>
          <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function FieldEditor({ index, count, field, otherKeys, onChange, onRemove, onMoveUp, onMoveDown }) {
  const isMC = field.type === 'multi_choice';
  return (
    <div className="kf-field">
      <div className="kf-field-head">
        <span className="kf-field-index">#{index + 1}</span>
        <input
          type="text"
          className="input kf-field-label-input"
          placeholder="Field label (what the partner sees)"
          value={field.label ?? ''}
          onChange={(e) => {
            const label = e.target.value;
            // Auto-suggest key from label if key is empty.
            if (!field.key) onChange({ label, key: slugify(label) });
            else onChange({ label });
          }}
        />
        <div className="kf-field-head-actions">
          <button type="button" className="btn-ghost kf-icon-btn" disabled={index === 0} onClick={onMoveUp} title="Move up">↑</button>
          <button type="button" className="btn-ghost kf-icon-btn" disabled={index === count - 1} onClick={onMoveDown} title="Move down">↓</button>
          <button type="button" className="btn-ghost kf-icon-btn kf-icon-btn--danger" onClick={onRemove} title="Remove">×</button>
        </div>
      </div>

      <div className="kf-field-grid">
        <div>
          <label className="kf-label">Key (machine name)</label>
          <input
            type="text"
            className="input"
            value={field.key ?? ''}
            placeholder="e.g. job_id"
            onChange={(e) => onChange({ key: slugify(e.target.value) })}
          />
        </div>
        <div>
          <label className="kf-label">Type</label>
          <select
            className="input"
            value={field.type ?? 'text'}
            onChange={(e) => onChange({ type: e.target.value, ...(e.target.value === 'multi_choice' ? { options: field.options ?? [], single_select: field.single_select ?? true } : {}) })}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="kf-field-grid kf-field-grid--flags">
        <label className="kf-checkbox">
          <input
            type="checkbox"
            checked={!!field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          Required
        </label>
        {(field.type === 'text' || field.type === 'textarea') && (
          <div>
            <label className="kf-label">Min characters (for non-blank entries)</label>
            <input
              type="number"
              min={0}
              className="input kf-input--narrow"
              value={Number.isInteger(field.min_length) ? field.min_length : ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10));
                onChange({ min_length: Number.isNaN(v) ? undefined : v });
              }}
            />
          </div>
        )}
        <div className="kf-required-when">
          <label className="kf-label">Required only when sibling equals…</label>
          <div className="kf-required-when-inputs">
            <select
              className="input kf-input--narrow"
              value={field.required_when?.field ?? ''}
              onChange={(e) => {
                const f = e.target.value;
                if (!f) onChange({ required_when: undefined });
                else onChange({ required_when: { field: f, equals: field.required_when?.equals ?? '' } });
              }}
            >
              <option value="">(no condition)</option>
              {otherKeys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            {field.required_when && (
              <input
                type="text"
                className="input kf-input--narrow"
                placeholder='equals (e.g. "yes")'
                value={field.required_when.equals ?? ''}
                onChange={(e) => onChange({ required_when: { ...field.required_when, equals: e.target.value } })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="kf-field-grid">
        <div>
          <label className="kf-label">Placeholder (ghost text in the input)</label>
          <input
            type="text"
            className="input"
            value={field.placeholder ?? ''}
            onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="kf-label">Helper text (small note below the label)</label>
          <input
            type="text"
            className="input"
            value={field.helperText ?? ''}
            onChange={(e) => onChange({ helperText: e.target.value || undefined })}
          />
        </div>
      </div>

      {isMC && (
        <div className="kf-mc-options">
          <div className="kf-row kf-row--inline">
            <label className="kf-checkbox">
              <input
                type="checkbox"
                checked={!!field.single_select}
                onChange={(e) => onChange({ single_select: e.target.checked })}
              />
              Single-select (radio); unchecked = multi-select (checkboxes)
            </label>
          </div>
          <div className="kf-label">Options</div>
          {(field.options || []).map((opt, oi) => (
            <div key={oi} className="kf-mc-option">
              <input
                type="text"
                className="input kf-input--narrow"
                placeholder="value (e.g. competitor)"
                value={opt.value ?? ''}
                onChange={(e) => {
                  const next = [...(field.options || [])];
                  next[oi] = { ...next[oi], value: slugify(e.target.value) };
                  onChange({ options: next });
                }}
              />
              <input
                type="text"
                className="input"
                placeholder="label (e.g. Competitor)"
                value={opt.label ?? ''}
                onChange={(e) => {
                  const next = [...(field.options || [])];
                  next[oi] = { ...next[oi], label: e.target.value };
                  onChange({ options: next });
                }}
              />
              <button
                type="button"
                className="btn-ghost kf-icon-btn kf-icon-btn--danger"
                onClick={() => onChange({ options: (field.options || []).filter((_, idx) => idx !== oi) })}
                title="Remove option"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost kf-add-option"
            onClick={() => onChange({ options: [...(field.options || []), { value: '', label: '' }] })}
          >+ Add option</button>
        </div>
      )}
    </div>
  );
}
