// Wave 2 (UAT 2026-05-09): shared read-only renderer for the per-KPI
// structured_data block written by Scorecard's StructuredFieldsBlock (Wave 1,
// migration 020). Used by:
//   - Scorecard.jsx (history detail rows + post-submit read-only mirror)
//   - AdminMeetingSession.jsx (KpiStop read-only cell)
//   - MeetingSummary.jsx (KPI stop summary cell)
// so structured evidence stays visible everywhere the existing reflection /
// pending_text / result fields are surfaced.
//
// Compact density on purpose — small font, italic muted labels, tight rows.
// Schema dispatch matches StructuredFieldsBlock's three patterns:
//   - count_noteworthy: "Total: 12. Noteworthy: [name + outcome rows]"
//   - row_per_item:     "Total: 4 jobs. [rows with all sub-fields]"
//   - named_fields:     labeled values stacked (incl. autoPeriod header)

// Format the auto-period range for named_fields with autoPeriod=true.
// Returns "Apr 27 – May 4" — prior Mon to current week_of Mon. Mirrors the
// helper inside Scorecard.jsx so the read-only render computes the same string.
function formatAutoPeriod(weekOf) {
  if (!weekOf) return '';
  const [y, m, d] = weekOf.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  const start = new Date(y, m - 1, d - 7);
  const fmt = (dt) => dt.toLocaleString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatPrimitive(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (field?.type === 'yes_no') {
    return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : String(value);
  }
  if (field?.type === 'currency') {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return String(value);
}

// True when the structured_data has no useful content to display. Used by
// callers (Scorecard history, AdminMeetingSession KpiStop) to avoid rendering
// an empty card when the partner submitted before structured fields existed.
export function structuredDataIsEmpty(data) {
  if (!data || typeof data !== 'object') return true;
  return Object.keys(data).length === 0;
}

export default function StructuredFieldsReadOnly({ schema, data, weekOf }) {
  if (!schema || typeof schema !== 'object') return null;
  if (structuredDataIsEmpty(data)) return null;
  const pattern = schema.pattern;
  if (pattern === 'count_noteworthy') {
    return <CountNoteworthyDisplay schema={schema} data={data} />;
  }
  if (pattern === 'row_per_item') {
    return <RowPerItemDisplay schema={schema} data={data} />;
  }
  if (pattern === 'named_fields') {
    return <NamedFieldsDisplay schema={schema} data={data} weekOf={weekOf} />;
  }
  return null;
}

function CountNoteworthyDisplay({ schema, data }) {
  const count = Number.isFinite(Number(data?.count)) ? Number(data.count) : 0;
  const noteworthy = Array.isArray(data?.noteworthy) ? data.noteworthy : [];
  const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];
  const totalLabel = schema.countLabel ?? 'Total';
  const noteworthyLabel = schema.noteworthyLabel ?? 'Noteworthy';
  return (
    <div className="structured-fields-display">
      <div className="structured-fields-display__total">
        <span className="structured-fields-display__total-label">{totalLabel}:</span>
        <span className="structured-fields-display__total-value">{count}</span>
      </div>
      {noteworthy.length > 0 && (
        <div className="structured-fields-display__rows">
          <div className="structured-fields-display__rows-label">{noteworthyLabel}</div>
          {noteworthy.map((row, idx) => (
            <div key={idx} className="structured-fields-display__row">
              {rowFields.map((f) => (
                <div key={f.key} className="structured-fields-display__cell">
                  <span className="structured-fields-display__cell-label">{f.label}:</span>
                  <span className="structured-fields-display__cell-value">{formatPrimitive(f, row?.[f.key])}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RowPerItemDisplay({ schema, data }) {
  const count = Number.isFinite(Number(data?.count)) ? Number(data.count) : 0;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];
  const totalLabel = schema.countLabel ?? 'Total';
  const rowLabel = schema.rowLabel;
  return (
    <div className="structured-fields-display">
      <div className="structured-fields-display__total">
        <span className="structured-fields-display__total-label">{totalLabel}:</span>
        <span className="structured-fields-display__total-value">{count}</span>
      </div>
      {rows.length > 0 && (
        <div className="structured-fields-display__rows">
          {rowLabel && (
            <div className="structured-fields-display__rows-label">{rowLabel}</div>
          )}
          {rows.map((row, idx) => (
            <div key={idx} className="structured-fields-display__row">
              {rowFields.map((f) => (
                <div key={f.key} className="structured-fields-display__cell">
                  <span className="structured-fields-display__cell-label">{f.label}:</span>
                  <span className="structured-fields-display__cell-value">{formatPrimitive(f, row?.[f.key])}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NamedFieldsDisplay({ schema, data, weekOf }) {
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  return (
    <div className="structured-fields-display">
      {schema.autoPeriod && (
        <div className="structured-fields-display__period">
          {schema.periodLabel ? `${schema.periodLabel}: ` : 'Reporting period: '}
          {formatAutoPeriod(weekOf)}
        </div>
      )}
      <div className="structured-fields-display__named">
        {fields.map((f) => {
          if (f.type === 'row_list') {
            const subRows = Array.isArray(data?.[f.key]) ? data[f.key] : [];
            const subFields = Array.isArray(f.rowFields) ? f.rowFields : [];
            if (subRows.length === 0) {
              return (
                <div key={f.key} className="structured-fields-display__cell">
                  <span className="structured-fields-display__cell-label">{f.label}:</span>
                  <span className="structured-fields-display__cell-value">{'—'}</span>
                </div>
              );
            }
            return (
              <div key={f.key} className="structured-fields-display__sublist">
                <div className="structured-fields-display__sublist-label">{f.label}</div>
                {subRows.map((sr, idx) => (
                  <div key={idx} className="structured-fields-display__row">
                    {subFields.map((sf) => (
                      <div key={sf.key} className="structured-fields-display__cell">
                        <span className="structured-fields-display__cell-label">{sf.label}:</span>
                        <span className="structured-fields-display__cell-value">{formatPrimitive(sf, sr?.[sf.key])}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div key={f.key} className="structured-fields-display__cell">
              <span className="structured-fields-display__cell-label">{f.label}:</span>
              <span className="structured-fields-display__cell-value">{formatPrimitive(f, data?.[f.key])}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
