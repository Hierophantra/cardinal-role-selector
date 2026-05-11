import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiTemplates,
  fetchWeeklyKpiSelection,
  fetchAdminSetting,
  fetchScorecards,
  fetchGrowthPriorities,
  upsertScorecard,
} from '../lib/supabase.js';
import { getMondayOf, isWeekClosed, formatWeekRange, effectiveResult } from '../lib/week.js';
import {
  VALID_PARTNERS,
  PARTNER_DISPLAY,
  SCORECARD_COPY,
  GROWTH_FOLLOWUP_FIELDS,
  GROWTH_FOLLOWUP_COPY,
  effectivePartnerScope,
} from '../data/content.js';
import StructuredFieldsReadOnly from './StructuredFieldsReadOnly.jsx';
import LastWeekCommitments from './LastWeekCommitments.jsx';

// Motion props shared by all views — matches KpiSelection.jsx pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

// Phase 19 D-05 — passes-key-fields predicate. A Yes-rated row whose required
// key_fields fail validation is treated as "not yet rated". This helper
// inspects ONLY the Yes-side validation question; Pending and No are not
// covered by D-05 and pass through unchanged.
function passesKeyFields(tpl, entry) {
  if (!tpl || !entry) return false;
  if (entry.result !== 'yes') return true; // only Yes is gated by key_fields per D-05
  if (!tpl.key_fields) return true;
  const sd = entry.structured_data ?? {};
  const reflection = entry.reflection ?? '';
  // validateStructuredFields returns TRUE on failure; invert so the helper name reads naturally.
  return !validateStructuredFields(tpl.key_fields, sd, reflection);
}

// Phase 19 D-05 — answered-count predicate (DRIVES THE COUNTER PILL ONLY).
// Preserves pre-Phase-19 semantics: a row counts toward "answered" iff result
// is Yes (with valid key_fields) OR No. Pending NEVER counts toward the
// answered tally — even with follow-through text — because Pending is by
// definition "not yet rated until Saturday close" (Phase 17 contract). D-05
// only narrows the Yes-side definition; it does NOT promote Pending. The
// submit-gate uses a broader predicate below.
function isRowAnswered(tpl, entry) {
  if (!tpl || !entry) return false;
  const r = entry.result;
  if (r === 'no') return true;
  if (r === 'yes') return passesKeyFields(tpl, entry);
  return false;
}

// Phase 19 D-04 / D-06 — submit-gate predicate (used by getValidationGaps).
// Broader than isRowAnswered: also accepts Pending rows whose follow-through
// text is populated, because the submit-gate's purpose is to require a
// *commitment* on every row (Phase 17 KPI-02 contract), not to declare the
// row "answered". Reflection required on every rated row (Phase 17
// reflectionRequired gate preserved). Yes-side requires passesKeyFields.
function isRowSubmittable(tpl, entry) {
  if (!tpl || !entry) return false;
  const r = entry.result;
  if (r !== 'yes' && r !== 'no' && r !== 'pending') return false;
  if (r === 'pending') {
    const pt = entry.pending_text;
    if (typeof pt !== 'string' || pt.trim().length === 0) return false;
  }
  const reflection = entry.reflection;
  if (typeof reflection !== 'string' || reflection.trim().length === 0) return false;
  if (r === 'yes' && !passesKeyFields(tpl, entry)) return false;
  return true;
}

// Phase 19 D-04: derives the ordered list of missing-field gaps for the
// inline checklist rendered above the sticky bar. Each gap has a stable
// anchor matching a deterministic input ID rendered by StructuredFieldInput
// so document.getElementById(anchor)?.scrollIntoView resolves cleanly.
// Returns [] when nothing is missing — Submit is enabled iff [].
//
// Gap detection order (matches checklist render order):
//   1. Week rating (REFINE-15)
//   2. Per-row: result missing (existing incomplete gate)
//   3. Per-row: Pending without follow-through text (existing KPI-02 gate)
//   4. Per-row: result='yes' with invalid structured fields (D-05) — points
//      at first missing field
//   5. Per-row: reflection text missing (existing reflectionRequired gate)
//   6. Growth followup missing (existing growthRequired gate)
function getValidationGaps(rows, kpiResults, weekRating, growthFollowup, partner) {
  const gaps = [];
  if (weekRating === null || weekRating === undefined) {
    gaps.push({ anchor: 'week-rating-input', label: 'Overall week rating (1-5)' });
  }
  for (const tpl of rows) {
    const entry = kpiResults[tpl.id] ?? {};
    const result = entry.result;
    // 2. result missing
    if (!result) {
      gaps.push({
        anchor: `kpi-${tpl.id}-result`,
        label: `${tpl.label_snapshot ?? tpl.label ?? tpl.baseline_action ?? 'KPI'}: Mark Yes / No / Pending`,
      });
      continue;
    }
    // 3. Pending without follow-through text
    if (result === 'pending') {
      const pendingText = entry.pending_text;
      if (typeof pendingText !== 'string' || pendingText.trim().length === 0) {
        gaps.push({
          anchor: `kpi-${tpl.id}-pending-text`,
          label: `${tpl.label_snapshot ?? tpl.label ?? tpl.baseline_action ?? 'KPI'}: Add a what + by when commitment`,
        });
      }
    }
    // 4. Yes with invalid structured fields — point at the FIRST missing required field on the row
    if (result === 'yes' && tpl.key_fields) {
      const sd = entry.structured_data ?? {};
      const reflection = entry.reflection ?? '';
      if (validateStructuredFields(tpl.key_fields, sd, reflection)) {
        const firstAnchor = findFirstMissingFieldAnchor(tpl, sd);
        gaps.push({
          anchor: firstAnchor ?? `kpi-${tpl.id}`,
          label: `${tpl.label_snapshot ?? tpl.label ?? tpl.baseline_action ?? 'KPI'}: Fill in required structured fields`,
        });
      }
    }
    // 5. reflection text missing
    const reflection = entry.reflection;
    if (typeof reflection !== 'string' || reflection.trim().length === 0) {
      gaps.push({
        anchor: `kpi-${tpl.id}-reflection`,
        label: `${tpl.label_snapshot ?? tpl.label ?? tpl.baseline_action ?? 'KPI'}: Add your reflection`,
      });
    }
  }
  // 6. Growth followup — partner-driven GROWTH_FOLLOWUP_FIELDS check.
  // GROWTH_FOLLOWUP_FIELDS is already imported at the top of this file
  // (line ~17) — direct ESM reference (project is ESM per "type": "module"
  // in package.json; require() is not available at runtime).
  const partnerFields = (GROWTH_FOLLOWUP_FIELDS && GROWTH_FOLLOWUP_FIELDS[partner]) || [];
  for (const f of partnerFields) {
    const val = growthFollowup?.[f.key];
    if (typeof val !== 'string' || val.trim().length === 0) {
      gaps.push({ anchor: `growth-followup-${f.key}`, label: `Growth: ${f.label}` });
    }
  }
  return gaps;
}

// Phase 19 D-04: helper used by getValidationGaps to point the checklist
// scroll-target at the first actually-missing required field on a Yes-rated
// row whose structured data fails validation. Falls back to the KPI's anchor
// when no specific field can be resolved.
function findFirstMissingFieldAnchor(tpl, data) {
  const schema = tpl.key_fields;
  if (!schema) return null;
  const checkPrimitive = (field, value, row) => {
    if (!field?.required && !field?.required_when) return false;
    if (field.required_when) {
      const sibling = row?.[field.required_when.field];
      if (sibling !== field.required_when.equals) return false;
    }
    if (field.type === 'yes_no') return value !== 'yes' && value !== 'no';
    if (field.type === 'number' || field.type === 'currency') {
      return value === '' || value === null || value === undefined || !Number.isFinite(Number(value));
    }
    if (field.type === 'multi_choice') {
      if (field.single_select) return typeof value !== 'string' || value.trim().length === 0;
      return !Array.isArray(value) || value.length === 0;
    }
    return typeof value !== 'string' || value.trim().length === 0;
  };
  if (schema.pattern === 'named_fields') {
    for (const f of (schema.fields || [])) {
      if (f.type === 'row_list') {
        const subRows = Array.isArray(data?.[f.key]) ? data[f.key] : [];
        for (let i = 0; i < subRows.length; i++) {
          for (const sf of (f.rowFields || [])) {
            if (checkPrimitive(sf, subRows[i]?.[sf.key], subRows[i])) {
              return `field-${tpl.id}-${f.key}-${i}-${sf.key}`;
            }
          }
        }
        if ((f.required || (f.required_when && data?.[f.required_when.field] === f.required_when.equals)) && subRows.length === 0) {
          return `field-${tpl.id}-${f.key}`;
        }
      } else if (f.type === 'multi_choice') {
        // Phase 19 D-03 canonical anchor scheme:
        //   single-select per_selection_field:  field-${tplId}-${fieldKey}__${value}-${perFieldKey}
        //   multi-select  per_selection_field:  field-${tplId}-${fieldKey}-${selectionValue}-${perFieldKey}
        // Selection-presence missing:            field-${tplId}-${fieldKey}
        const isSingle = !!f.single_select;
        const v = data?.[f.key];
        const presenceMissing = isSingle
          ? (typeof v !== 'string' || v.trim().length === 0)
          : (!Array.isArray(v) || v.length === 0);
        if ((f.required || (f.required_when && data?.[f.required_when.field] === f.required_when.equals)) && presenceMissing) {
          return `field-${tpl.id}-${f.key}`;
        }
        const perFields = Array.isArray(f.per_selection_fields) ? f.per_selection_fields : [];
        if (isSingle) {
          const sv = typeof v === 'string' ? v : null;
          if (sv) {
            const sub = data?.[`${f.key}__${sv}`] ?? {};
            for (const pf of perFields) {
              if (checkPrimitive(pf, sub?.[pf.key], sub)) {
                return `field-${tpl.id}-${f.key}__${sv}-${pf.key}`;
              }
            }
          }
        } else if (Array.isArray(v)) {
          for (const sel of v) {
            for (const pf of perFields) {
              if (checkPrimitive(pf, sel?.[pf.key], sel)) {
                return `field-${tpl.id}-${f.key}-${sel.value}-${pf.key}`;
              }
            }
          }
        }
      } else if (checkPrimitive(f, data?.[f.key], data)) {
        return `field-${tpl.id}-${f.key}`;
      }
    }
  }
  if (schema.pattern === 'row_per_item') {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    for (let i = 0; i < rows.length; i++) {
      for (const rf of (schema.rowFields || [])) {
        if (checkPrimitive(rf, rows[i]?.[rf.key], rows[i])) {
          return `field-${tpl.id}-${rf.key}-${i}`;
        }
      }
    }
    if (Number.isInteger(schema.min_rows) && rows.length < schema.min_rows) {
      return `field-${tpl.id}-${schema.shortfall_text?.key ?? 'shortfall'}`;
    }
  }
  if (schema.pattern === 'count_noteworthy') {
    const noteworthy = Array.isArray(data?.noteworthy) ? data.noteworthy : [];
    for (let i = 0; i < noteworthy.length; i++) {
      for (const rf of (schema.rowFields || [])) {
        if (checkPrimitive(rf, noteworthy[i]?.[rf.key], noteworthy[i])) {
          return `field-${tpl.id}-${rf.key}-${i}`;
        }
      }
    }
    if (Number.isInteger(schema.min_rows) && noteworthy.length < schema.min_rows) {
      return `field-${tpl.id}-${schema.shortfall_text?.key ?? 'shortfall'}`;
    }
  }
  return null;
}

// Phase 19: extended validation surface.
// New schema features honored:
//   - schema.hide_count (count_noteworthy / row_per_item) — count derived from list length
//   - schema.min_rows + schema.shortfall_text (count_noteworthy / row_per_item) — REFINE-12 D-06
//   - field.required_when ({field, equals}) — REFINE-07 D-15 (conditional-required)
//   - schema.helperText — rendered, not validated (here for completeness)
// Returns `true` when the structured data fails validation (block submit).
function validateStructuredFields(schema, data, reflectionText) {
  if (!schema || typeof schema !== 'object') return false;

  const isRequiredEffective = (field, siblingData) => {
    if (field?.required) return true;
    if (field?.required_when && siblingData) {
      const sibling = siblingData[field.required_when.field];
      return sibling === field.required_when.equals;
    }
    return false;
  };

  const isMissingPrimitive = (field, value, siblingData) => {
    if (!isRequiredEffective(field, siblingData)) return false;
    if (field.type === 'yes_no') return value !== 'yes' && value !== 'no';
    if (field.type === 'number' || field.type === 'currency') {
      return value === '' || value === null || value === undefined || !Number.isFinite(Number(value));
    }
    if (field.type === 'multi_choice') {
      if (field.single_select) return typeof value !== 'string' || value.trim().length === 0;
      return !Array.isArray(value) || value.length === 0;
    }
    // text / textarea / fallback
    return typeof value !== 'string' || value.trim().length === 0;
  };

  const reflectionMissing = !(typeof reflectionText === 'string' && reflectionText.trim().length > 0);

  if (schema.pattern === 'count_noteworthy') {
    const noteworthy = Array.isArray(data?.noteworthy) ? data.noteworthy : [];
    const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];
    const derivedCount = noteworthy.length;
    const count = schema.hide_count ? derivedCount : Number(data?.count);
    if (!schema.hide_count) {
      if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) return true;
    }
    // min_rows + shortfall_text: when noteworthy.length < min_rows, require non-empty shortfall_text
    if (Number.isInteger(schema.min_rows) && noteworthy.length < schema.min_rows) {
      const shortfallKey = schema.shortfall_text?.key;
      const shortfallVal = shortfallKey ? data?.[shortfallKey] : undefined;
      if (typeof shortfallVal !== 'string' || shortfallVal.trim().length === 0) return true;
    }
    if (count === 0 && !Number.isInteger(schema.min_rows)) return reflectionMissing;
    if (noteworthy.length === 0) return false;
    return noteworthy.some((row) => rowFields.some((f) => isMissingPrimitive(f, row?.[f.key], row)));
  }

  if (schema.pattern === 'row_per_item') {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];
    const derivedCount = rows.length;
    const count = schema.hide_count ? derivedCount : Number(data?.count);
    if (!schema.hide_count) {
      if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) return true;
      if (count === 0) return reflectionMissing;
      if (rows.length !== count) return true;
    } else {
      if (count === 0 && !Number.isInteger(schema.min_rows)) return reflectionMissing;
    }
    if (Number.isInteger(schema.min_rows) && rows.length < schema.min_rows) {
      const shortfallKey = schema.shortfall_text?.key;
      const shortfallVal = shortfallKey ? data?.[shortfallKey] : undefined;
      if (typeof shortfallVal !== 'string' || shortfallVal.trim().length === 0) return true;
    }
    return rows.some((row) => rowFields.some((f) => isMissingPrimitive(f, row?.[f.key], row)));
  }

  if (schema.pattern === 'named_fields') {
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    return fields.some((f) => {
      if (f.type === 'row_list') {
        if (!isRequiredEffective(f, data)) return false;
        const subRows = Array.isArray(data?.[f.key]) ? data[f.key] : [];
        if (subRows.length === 0) return true;
        const subFields = Array.isArray(f.rowFields) ? f.rowFields : [];
        return subRows.some((row) => subFields.some((sf) => isMissingPrimitive(sf, row?.[sf.key], row)));
      }
      if (f.type === 'multi_choice') {
        if (!isRequiredEffective(f, data)) return false;
        const value = data?.[f.key];
        if (f.single_select) {
          if (typeof value !== 'string' || value.trim().length === 0) return true;
          // per_selection_fields are checked once for the single selected value;
          // single_select stores the per-selection sub-data under data[`${f.key}__${value}`].
          const perFields = Array.isArray(f.per_selection_fields) ? f.per_selection_fields : [];
          const sub = data?.[`${f.key}__${value}`] ?? {};
          return perFields.some((pf) => isMissingPrimitive(pf, sub?.[pf.key], sub));
        }
        // multi-select: value is array of {value, ...per_selection_field_values}
        if (!Array.isArray(value) || value.length === 0) return true;
        const perFields = Array.isArray(f.per_selection_fields) ? f.per_selection_fields : [];
        return value.some((sel) => perFields.some((pf) => isMissingPrimitive(pf, sel?.[pf.key], sel)));
      }
      return isMissingPrimitive(f, data?.[f.key], data);
    });
  }

  return false;
}

export default function Scorecard() {
  const { partner } = useParams();
  const navigate = useNavigate();

  // ---- Hooks declared BEFORE any early return (Phase 15 P-U2) ----

  // Data/loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [noSelection, setNoSelection] = useState(false);

  // v2.0 row shape: array of kpi_templates composing this week's scorecard
  const [rows, setRows] = useState([]);
  const [weeklySel, setWeeklySel] = useState(null);
  const [allScorecards, setAllScorecards] = useState([]);

  // View state — 'editing' (input form + sticky bar) | 'submitted' (read-only)
  const [view, setView] = useState('editing');

  // Editing/current-week working state — keyed by kpi_template_id
  // { [template_id]: { result: 'yes'|'no'|null, reflection: string, count: number } }
  const [kpiResults, setKpiResults] = useState({});
  const [committedAt, setCommittedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedVisible, setSavedVisible] = useState(false);

  // Weekly Reflection state
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [tasksCarriedOver, setTasksCarriedOver] = useState('');
  const [weeklyWin, setWeeklyWin] = useState('');
  const [weeklyLearning, setWeeklyLearning] = useState('');
  const [weekRating, setWeekRating] = useState(null); // 1-5 or null

  // UAT C1: growth_followup JSONB form state. Schema is partner-driven via
  // GROWTH_FOLLOWUP_FIELDS and persists in scorecards.growth_followup
  // (migration 012). Self-chosen growth is rendered read-only above the form.
  const [growthFollowup, setGrowthFollowup] = useState({});
  const [growthPriorities, setGrowthPriorities] = useState([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  // UAT C5: confirmation modal before persistDraft+submit fires.
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  // UAT C6: completion message picked once on submit success and held in
  // state so the post-submit view shows a stable string until the partner
  // navigates away (re-pick on next mount only).
  const [completionMessage, setCompletionMessage] = useState(null);

  // History UI state
  const [expandedHistoryWeek, setExpandedHistoryWeek] = useState(null);

  // Stable week anchor — computed once per mount
  const currentWeekOfRef = useRef(getMondayOf());
  const currentWeekOf = currentWeekOfRef.current;

  // Debounce timer refs for saved indicator
  const savedTimerRef = useRef(null);
  const savedFadeRef = useRef(null);

  // Ref to skip weekRating auto-save on initial mount
  const weekRatingInitialized = useRef(false);

  // BUG-2026-04-25 hydration gate: persistDraft writes the ENTIRE row from
  // React state via Supabase upsert (which only updates supplied columns).
  // If any persist trigger fires BEFORE the mount fetch hydrates state,
  // every supplied column (kpi_results, weekly_win, weekly_learning,
  // week_rating, growth_followup, etc.) is written from initial useState
  // defaults — empty/null — overwriting the partner's submitted data.
  // We flip this ref to true only after the Promise.all hydration completes,
  // and gate every persist path on it.
  const hydratedRef = useRef(false);

  // ---- Derived values (before early returns) ----

  const weekClosed = useMemo(() => isWeekClosed(currentWeekOf), [currentWeekOf]);

  const historyRows = useMemo(
    () => allScorecards.filter((s) => s.week_of !== currentWeekOf),
    [allScorecards, currentWeekOf]
  );

  // Wave 3 Tier 3: last week's submitted scorecard, used by LastWeekCommitments
  // to surface Pending commitments carried forward. Computed in local time to
  // match getMondayOf conventions (never UTC arithmetic — see week.js notes).
  // Falls back to null when there's no submission for last week.
  const priorScorecard = useMemo(() => {
    const [y, m, d] = currentWeekOf.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 7);
    const yy = prev.getFullYear();
    const mm = String(prev.getMonth() + 1).padStart(2, '0');
    const dd = String(prev.getDate()).padStart(2, '0');
    const prevMonday = `${yy}-${mm}-${dd}`;
    return allScorecards.find((s) => s.week_of === prevMonday && s.submitted_at) ?? null;
  }, [allScorecards, currentWeekOf]);

  // ---- Mount guards + data fetch (Pattern 5 — composite fetch) ----
  useEffect(() => {
    // WR-07: Register cleanup BEFORE the early-return so any future side effect
    // added to the redirect path still cleans up its timers.
    const cleanup = () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };

    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return cleanup;
    }

    Promise.all([
      fetchKpiTemplates(),
      fetchWeeklyKpiSelection(partner, currentWeekOf),
      partner === 'jerry'
        ? fetchAdminSetting('jerry_sales_kpi_active').then((r) => r?.value === true)
        : Promise.resolve(false),
      fetchScorecards(partner),
      // UAT C1: growth priorities drive the mandatory + self-chosen reminders
      // alongside the KPI grid. Fetched on mount, refreshed only on partner
      // change (matches the existing kpi_templates fetch lifecycle).
      fetchGrowthPriorities(partner).catch(() => []),
    ])
      .then(([templates, sel, jerryActive, scorecards, growth]) => {
        setAllScorecards(scorecards);
        setGrowthPriorities(growth ?? []);

        // Empty guard: no weekly KPI selected for current week
        if (!sel || !sel.kpi_template_id) {
          setRows([]);
          setNoSelection(true);
          return;
        }

        // Compose rows (Pattern 5): mandatory (non-conditional) + conditional (if jerry+active) + weekly choice
        const scope = effectivePartnerScope(partner);
        const mandatory = templates.filter(
          (t) =>
            t.mandatory === true &&
            (t.partner_scope === scope || t.partner_scope === 'both' || t.partner_scope === 'shared') &&
            t.conditional === false
        );
        const conditional =
          partner === 'jerry' && jerryActive
            ? templates.find((t) => t.conditional === true && t.partner_scope === 'jerry')
            : null;
        const weeklyTpl = templates.find((t) => t.id === sel.kpi_template_id);

        // UAT 2026-05-09: test partner shows EVERY non-conditional template
        // (theo + jerry + shared) so Trace can review every KPI's structured
        // form rendering in one place. Real partners see the normal mandatory
        // + conditional + weekly-choice composition.
        const composed = partner === 'test'
          ? templates
              .filter((t) => t.conditional === false)
              .sort((a, b) => {
                // Group: shared mandatory first, then theo mandatory, then jerry mandatory,
                // then theo optional, then jerry optional. Stable order for review.
                const score = (t) => {
                  if (t.partner_scope === 'both' || t.partner_scope === 'shared') return t.mandatory ? 0 : 4;
                  if (t.partner_scope === 'theo') return t.mandatory ? 1 : 3;
                  if (t.partner_scope === 'jerry') return t.mandatory ? 2 : 5;
                  return 9;
                };
                return score(a) - score(b);
              })
          : [
              ...mandatory,
              ...(conditional ? [conditional] : []),
              ...(weeklyTpl ? [weeklyTpl] : []),
            ];

        setRows(composed);
        setWeeklySel(sel);

        // Hydrate / seed row results. If already submitted this week → hydrate from scorecards row.
        // Otherwise → seed count from sel.counter_value (COUNT-04).
        const thisWeekRow = scorecards.find((s) => s.week_of === currentWeekOf);
        const seededResults = {};
        composed.forEach((tpl) => {
          const existing = thisWeekRow?.kpi_results?.[tpl.id];
          seededResults[tpl.id] = {
            result: existing?.result ?? null,
            reflection: existing?.reflection ?? '',
            count: existing?.count ?? sel.counter_value?.[tpl.id] ?? 0,
            pending_text: existing?.pending_text ?? '',
            // Wave 1 (migration 020): hydrate per-KPI structured_data alongside
            // existing fields. Defaults to {} so the renderer always receives a
            // controlled object. Templates with key_fields=NULL ignore this.
            structured_data: existing?.structured_data ?? {},
          };
        });
        setKpiResults(seededResults);

        if (thisWeekRow?.submitted_at) {
          setView('submitted');
          setCommittedAt(thisWeekRow.committed_at ?? thisWeekRow.submitted_at);
          setTasksCompleted(thisWeekRow.tasks_completed ?? '');
          setTasksCarriedOver(thisWeekRow.tasks_carried_over ?? '');
          setWeeklyWin(thisWeekRow.weekly_win ?? '');
          setWeeklyLearning(thisWeekRow.weekly_learning ?? '');
          setWeekRating(thisWeekRow.week_rating ?? null);
          setGrowthFollowup(thisWeekRow.growth_followup ?? {});
        } else if (thisWeekRow) {
          // Partial draft row exists. Hydrate reflection fields if present.
          setCommittedAt(thisWeekRow.committed_at ?? null);
          setTasksCompleted(thisWeekRow.tasks_completed ?? '');
          setTasksCarriedOver(thisWeekRow.tasks_carried_over ?? '');
          setWeeklyWin(thisWeekRow.weekly_win ?? '');
          setWeeklyLearning(thisWeekRow.weekly_learning ?? '');
          setWeekRating(thisWeekRow.week_rating ?? null);
          setGrowthFollowup(thisWeekRow.growth_followup ?? {});
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => {
        // BUG-2026-04-25: flip hydration gate AFTER the Promise.all chain
        // resolves (success or failure). Set BEFORE setLoading(false) so
        // any blur/keystroke that fires immediately on the first painted
        // frame already sees hydratedRef=true. The .catch path also flips
        // it because setLoadError renders a different UI (no inputs), so
        // a stale persist can't be triggered there anyway — but keeping
        // the flip in .finally ensures the gate doesn't permanently block.
        hydratedRef.current = true;
        setLoading(false);
      });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  // Auto-save when weekRating changes (after initial mount)
  useEffect(() => {
    if (!weekRatingInitialized.current) {
      weekRatingInitialized.current = true;
      return;
    }
    if (weekClosed) return;
    // WR-04: call without arg so persistDraft reads the current kpiResults state
    // rather than a potentially stale closure snapshot.
    // UAT 2026-04-27: removed view==='submitted' gate — week rating stays
    // editable until Saturday close per the extended D-16 reopen window.
    persistDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRating]);

  // ---- Handlers ----

  // Build kpi_results JSONB for a scorecards upsert (Pitfall 1 — key by kpi_template_id,
  // include label: tpl.baseline_action so seasonStats.js continues to work label-keyed).
  function buildKpiResultsPayload(draft) {
    return Object.fromEntries(
      rows.map((tpl) => {
        const entry = draft[tpl.id] ?? { result: null, reflection: '', count: 0, pending_text: '', structured_data: {} };
        const payload = {
          result: entry.result ?? null,
          reflection: entry.reflection ?? '',
          label: tpl.baseline_action,
        };
        if (tpl.countable) {
          payload.count = Number(entry.count ?? 0);
        }
        // Phase 17 D-01 + Pitfall 4 (Q1 strategy a): persist pending_text whenever the entry has it.
        // - When result === 'pending', pending_text holds the active commitment.
        // - When result === 'yes' (yes-conversion), preserve prior pending_text so SaturdayRecapStop
        //   can attribute the conversion at next Monday's recap.
        if (entry.result === 'pending') {
          payload.pending_text = entry.pending_text ?? '';
        } else if ((entry.pending_text ?? '') !== '') {
          payload.pending_text = entry.pending_text;
        }
        // Wave 1 (migration 020): persist structured_data sub-key when the entry
        // carries any value. Empty-object case omits the key so older scorecards
        // without structured fields keep their existing payload shape.
        if (entry.structured_data && typeof entry.structured_data === 'object' && Object.keys(entry.structured_data).length > 0) {
          payload.structured_data = entry.structured_data;
        }
        return [tpl.id, payload];
      })
    );
  }

  // Draft persist — same shape as submit but without final submitted_at semantics.
  // Callers may pass an explicit `nextKpiResults` when they have already computed
  // the next value (e.g. `setResult` — React state hasn't flushed yet). When no
  // argument is supplied, we fall back to the closed-over `kpiResults` state.
  // WR-04: this keeps the single source of truth consistent — the weekRating
  // effect calls `persistDraft()` with no arg so it reads the latest state.
  async function persistDraft(nextKpiResults) {
    if (weekClosed) return;
    // BUG-2026-04-25 hydration gate: never write before mount fetch hydrates
    // state from DB. Without this, any path that calls persistDraft pre-
    // hydration writes the initial useState defaults (kpi_results={}, win='',
    // learning='', week_rating=null, growth_followup={}) over the partner's
    // submitted row. The upsert preserves submitted_at because it isn't in
    // the payload, leaving a row with submitted_at + everything else wiped.
    if (!hydratedRef.current) return;
    // BUG-2026-04-25 rows guard: buildKpiResultsPayload returns {} when
    // rows=[]; calling upsertScorecard with kpi_results={} unconditionally
    // overwrites a previously-good submission. There is no legitimate
    // reason to persist a draft when the row composition has not loaded —
    // the partner cannot have edited anything yet — so bail.
    if (rows.length === 0) return;
    // UAT 2026-04-27: extended D-16 — all scorecard fields stay editable until
    // Saturday close, not just Pending re-open. The previous submitted-mode
    // pending-only guard (and its CR-01 yes-conversion patch) are no longer
    // needed: weekClosed is now the single policy gate. The hydratedRef +
    // rows.length defenses above (BUG-2026-04-25) are correctness guards and
    // remain in place.
    const draft = nextKpiResults ?? kpiResults;
    setSaving(true);
    setSaveError(null);
    try {
      const nowIso = new Date().toISOString();
      const row = await upsertScorecard({
        partner,
        week_of: currentWeekOf,
        kpi_results: buildKpiResultsPayload(draft),
        committed_at: committedAt ?? nowIso,
        tasks_completed: tasksCompleted,
        tasks_carried_over: tasksCarriedOver,
        weekly_win: weeklyWin,
        weekly_learning: weeklyLearning,
        week_rating: weekRating,
        // UAT C1: persist mandatory growth follow-up alongside the rest of the
        // scorecard. Empty object is the default — pre-Phase-C1 rows hydrate
        // unchanged because the column ships with default '{}'.
        growth_followup: growthFollowup ?? {},
      });
      if (!committedAt) setCommittedAt(row.committed_at ?? nowIso);
      setAllScorecards((prev) => {
        const without = prev.filter((s) => s.week_of !== row.week_of);
        return [row, ...without].sort((a, b) => b.week_of.localeCompare(a.week_of));
      });
      // Saved-indicator debounce: wait 800ms after the last persist before showing
      // "Saved" so rapid typing doesn't flash the indicator on every keystroke.
      // Then auto-hide 2000ms later for a brief confirmation pulse.
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
      savedTimerRef.current = setTimeout(() => {
        setSavedVisible(true);
        savedFadeRef.current = setTimeout(() => setSavedVisible(false), 2000);
      }, 800);
    } catch (err) {
      console.error(err);
      setSaveError(SCORECARD_COPY.submitErrorDb);
    } finally {
      setSaving(false);
    }
  }

  function setResult(templateId, result) {
    // UAT 2026-04-27 (extended D-16): partners can edit ANY result until
    // Saturday close, not just Pending re-open. Submit state is informational
    // only; weekClosed is the single editability gate. pending_text is
    // PRESERVED on toggle (Q1 strategy a) so SaturdayRecap can detect
    // yes-conversion on the resulting persisted row.
    if (weekClosed) return;
    const current = kpiResults[templateId] ?? { result: null, reflection: '', count: 0, pending_text: '', structured_data: {} };
    const next = {
      ...kpiResults,
      [templateId]: {
        result,
        reflection: current.reflection ?? '',
        count: current.count ?? 0,
        pending_text: current.pending_text ?? '',
        structured_data: current.structured_data ?? {},
      },
    };
    setKpiResults(next);
    persistDraft(next);
  }

  function setReflectionLocal(templateId, text) {
    setKpiResults((prev) => ({
      ...prev,
      [templateId]: {
        result: prev[templateId]?.result ?? null,
        reflection: text,
        count: prev[templateId]?.count ?? 0,
        pending_text: prev[templateId]?.pending_text ?? '',
        structured_data: prev[templateId]?.structured_data ?? {},
      },
    }));
  }

  function setPendingTextLocal(templateId, text) {
    setKpiResults((prev) => ({
      ...prev,
      [templateId]: {
        result: prev[templateId]?.result ?? null,
        reflection: prev[templateId]?.reflection ?? '',
        count: prev[templateId]?.count ?? 0,
        pending_text: text,
        structured_data: prev[templateId]?.structured_data ?? {},
      },
    }));
  }

  function setCountLocal(templateId, value) {
    const numeric = value === '' ? 0 : Math.max(0, Number(value));
    setKpiResults((prev) => ({
      ...prev,
      [templateId]: {
        result: prev[templateId]?.result ?? null,
        reflection: prev[templateId]?.reflection ?? '',
        count: Number.isFinite(numeric) ? numeric : 0,
        pending_text: prev[templateId]?.pending_text ?? '',
        structured_data: prev[templateId]?.structured_data ?? {},
      },
    }));
  }

  // Wave 1 (migration 020): mutator for the per-KPI structured_data block.
  // The renderer (StructuredFieldsBlock) calls this with the full next-shape
  // structured_data object — same pattern as setReflectionLocal. Persistence
  // is via persistField onBlur (no debounce; matches reflection / count).
  function setStructuredDataLocal(templateId, structuredData) {
    setKpiResults((prev) => ({
      ...prev,
      [templateId]: {
        result: prev[templateId]?.result ?? null,
        reflection: prev[templateId]?.reflection ?? '',
        count: prev[templateId]?.count ?? 0,
        pending_text: prev[templateId]?.pending_text ?? '',
        structured_data: structuredData ?? {},
      },
    }));
  }

  function persistField() {
    // UAT 2026-04-27: extended D-16 — all fields editable until Saturday close.
    // weekClosed is the only persistence gate.
    if (weekClosed) return;
    persistDraft(kpiResults);
  }

  // UAT C5: validate + open confirmation modal. The actual persist happens in
  // performSubmit (called from the confirm modal's primary CTA). This split
  // keeps validation errors visible without blocking the modal flow on success.
  function handleSubmit() {
    if (submitting) return;
    // WR-02: Force-blur the active element so any pending textarea onBlur
    // (which calls persistField → persistDraft) commits before we read
    // weeklyWin / weeklyLearning / tasks_* from React closure for the
    // submit payload. On mobile, tapping the Submit button does NOT fire
    // a blur on the previously-focused field, so without this we would
    // submit stale free-text values.
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    // WR-04: Clear stale draft-save errors at the start of submit so an
    // earlier persistDraft failure that the user has since recovered from
    // doesn't reappear when admin reopens the week.
    setSubmitError(null);
    setSaveError(null);
    // Phase 19 REFINE-15: hard week-rating gate. Draft persists per existing
    // persistDraft; only the submit action blocks. Mirrors the existing
    // single-line error pattern but the inline checklist (Task 2c) also
    // surfaces this gap with an anchor link to the rating input.
    if (weekRating === null || weekRating === undefined) {
      setSubmitError(SCORECARD_COPY.submitErrorWeekRatingRequired);
      return;
    }
    // Defensive: rows must exist before submit. Array.some() on [] returns
    // false, so without this guard an empty-rows state would pass the
    // incomplete check and write a submitted row with kpi_results={}.
    if (rows.length === 0) {
      setSubmitError(SCORECARD_COPY.submitErrorIncomplete);
      return;
    }
    const incomplete = rows.some((tpl) => {
      const r = kpiResults[tpl.id]?.result;
      return r !== 'yes' && r !== 'no' && r !== 'pending';
    });
    if (incomplete) {
      setSubmitError(SCORECARD_COPY.submitErrorIncomplete);
      return;
    }
    // Phase 17 D-06 / KPI-02: every Pending row needs a non-empty 'what + by when' commitment.
    const pendingMissingText = rows.some((tpl) => {
      const entry = kpiResults[tpl.id];
      if (entry?.result !== 'pending') return false;
      return (entry.pending_text ?? '').trim().length === 0;
    });
    if (pendingMissingText) {
      setSubmitError(SCORECARD_COPY.submitErrorPendingTextRequired);
      return;
    }
    // Mandatory reflection on every row (UAT 2026-05-04). Per-KPI prompts demand
    // evidence; submit blocks if any row's reflection is empty/whitespace-only.
    // Fires only at handleSubmit time — persistDraft / persistField auto-save
    // paths remain unguarded so partial drafts (and post-submit Saturday-close
    // edits) continue to save without re-validation.
    const reflectionMissing = rows.some((tpl) => {
      const entry = kpiResults[tpl.id];
      return !(entry?.reflection ?? '').trim();
    });
    if (reflectionMissing) {
      setSubmitError(SCORECARD_COPY.submitErrorReflectionRequired);
      return;
    }
    // UAT 2026-05-04 (later same day): growth consideration is REQUIRED.
    // If the partner has no GROWTH_FOLLOWUP_FIELDS defined for them (e.g.,
    // 'test'), skip this check. Otherwise every defined field needs non-empty
    // trim text — partners with nothing yet write that explicitly.
    // Auto-save / persistField paths remain unguarded (matches reflection).
    const fields = GROWTH_FOLLOWUP_FIELDS[partner] ?? [];
    if (fields.length > 0) {
      const growthMissing = fields.some((f) => !(growthFollowup?.[f.key] ?? '').trim());
      if (growthMissing) {
        setSubmitError(SCORECARD_COPY.submitErrorGrowthRequired);
        return;
      }
    }
    // Wave 1 (migration 020): structured fields submit gate. Each KPI with
    // key_fields !== null must have its structured fields populated per the
    // schema's required rules. If count is 0, the partner must still populate
    // the existing reflection textarea (variance text mandatory when count=0
    // even though normally optional). Templates with key_fields=NULL skip
    // this entirely — they keep the existing reflection-only path.
    const structuredFieldsMissing = rows.some((tpl) => {
      if (!tpl.key_fields) return false;
      const sd = kpiResults[tpl.id]?.structured_data ?? {};
      const reflection = kpiResults[tpl.id]?.reflection ?? '';
      return validateStructuredFields(tpl.key_fields, sd, reflection);
    });
    if (structuredFieldsMissing) {
      setSubmitError(SCORECARD_COPY.submitErrorStructuredRequired);
      return;
    }
    // Validation passed -- open the confirmation modal. The user must click
    // Confirm to actually persist (UAT C5).
    setConfirmingSubmit(true);
  }

  function cancelSubmitConfirm() {
    setConfirmingSubmit(false);
  }

  async function performSubmit() {
    if (submitting) return;
    setConfirmingSubmit(false);
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      await upsertScorecard({
        partner,
        week_of: currentWeekOf,
        kpi_results: buildKpiResultsPayload(kpiResults),
        committed_at: committedAt ?? nowIso,
        submitted_at: nowIso,
        tasks_completed: tasksCompleted,
        tasks_carried_over: tasksCarriedOver,
        weekly_win: weeklyWin,
        weekly_learning: weeklyLearning,
        week_rating: weekRating,
        // UAT C1: include growth_followup on submit (same persist path as draft).
        growth_followup: growthFollowup ?? {},
      });
      setView('submitted');
      // UAT C6: pick a completion message at random for the post-submit state.
      // Stable for this view -- the partner only sees one variant per submission.
      const messages = SCORECARD_COPY.completionMessages ?? [];
      if (messages.length > 0) {
        const pick = messages[Math.floor(Math.random() * messages.length)];
        setCompletionMessage(pick);
      }
      const refreshed = await fetchScorecards(partner);
      setAllScorecards(refreshed);
    } catch (err) {
      console.error(err);
      setSubmitError(SCORECARD_COPY.submitErrorDb);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleHistoryRow(weekOf) {
    setExpandedHistoryWeek((prev) => (prev === weekOf ? null : weekOf));
  }

  // Render the history section — dynamic row count (no hardcoded 7/5)
  function renderHistory() {
    const currentLabelMap = Object.fromEntries(
      rows.map((tpl) => [tpl.id, tpl.baseline_action])
    );
    // Wave 2 (UAT 2026-05-09): per-KPI key_fields lookup so historic rows can
    // surface their structured_data inline. Falls back to undefined when the
    // template is no longer in this week's composition (rare — historic
    // selections may include retired templates).
    const currentKeyFieldsMap = Object.fromEntries(
      rows.map((tpl) => [tpl.id, tpl.key_fields ?? null])
    );

    return (
      <>
        <hr className="scorecard-divider" />
        <div className="eyebrow" style={{ marginBottom: 16 }}>{SCORECARD_COPY.historyEyebrow}</div>
        {historyRows.length === 0 ? (
          <p className="scorecard-history-empty">{SCORECARD_COPY.historyEmpty}</p>
        ) : (
          <div className="scorecard-history-list">
            {historyRows.map((row) => {
              const expanded = expandedHistoryWeek === row.week_of;
              const rowResults = row.kpi_results || {};
              const allResultIds = Object.keys(rowResults);
              // WR-08: Hit rate denominator only counts answered KPIs (yes|no).
              // Admin overrides can leave a row with result=null; counting those
              // would render misleading fractions like "3/7" when one of the 7
              // was never rated.
              // Phase 17 D-02: aggregate via effectiveResult — historical rows are
              // by definition closed weeks, so any raw 'pending' coerces to 'no'.
              const answeredIds = allResultIds.filter((id) => {
                const eff = effectiveResult(rowResults[id]?.result, row.week_of);
                return eff === 'yes' || eff === 'no';
              });
              const totalKpis = answeredIds.length;
              const hitCount = answeredIds.reduce(
                (n, id) => (effectiveResult(rowResults[id]?.result, row.week_of) === 'yes' ? n + 1 : n),
                0
              );
              return (
                <div
                  key={row.week_of}
                  className={`scorecard-history-row${expanded ? ' expanded' : ''}`}
                  onClick={() => toggleHistoryRow(row.week_of)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleHistoryRow(row.week_of);
                    }
                  }}
                >
                  <div className="scorecard-history-summary">
                    <span className="scorecard-history-week">{formatWeekRange(row.week_of)}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="scorecard-dots">
                        {allResultIds.map((id) => {
                          const eff = effectiveResult(rowResults[id]?.result, row.week_of);
                          const cls = eff === 'yes' ? 'yes' : eff === 'no' ? 'no' : 'null';
                          return <span key={id} className={`scorecard-dot ${cls}`} />;
                        })}
                      </div>
                      <span className="scorecard-hit-rate">{hitCount}/{totalKpis}</span>
                    </div>
                  </div>
                  {expanded && (
                    <div className="scorecard-history-detail">
                      {allResultIds.map((id) => {
                        const r = rowResults[id];
                        const rawResult = r?.result;
                        // Phase 17 D-02: read-time coercion. Historical rows are closed weeks,
                        // so any raw 'pending' renders as Not Met with a muted "Pending \u2192 No" badge.
                        const effective = effectiveResult(rawResult, row.week_of);
                        const label = r?.label || currentLabelMap[id] || '(Previous KPI)';
                        const resultLabel = effective === 'yes' ? 'Met' : effective === 'no' ? 'Not Met' : '\u2014';
                        const resultClass = effective === 'yes' ? 'yes' : effective === 'no' ? 'no' : 'null';
                        const isLivePending = rawResult === 'pending' && effective === 'pending';
                        const isClosedPending = rawResult === 'pending' && effective === 'no';
                        return (
                          <div key={id} className="scorecard-history-kpi-detail">
                            <div className="scorecard-history-kpi-label">
                              {label}
                              {isLivePending && (
                                <span className="pending-badge">{SCORECARD_COPY.pendingBadge}</span>
                              )}
                              {isClosedPending && (
                                <span className="pending-badge muted">{SCORECARD_COPY.pendingBadgeMuted}</span>
                              )}
                            </div>
                            <div className={`scorecard-history-kpi-result ${resultClass}`}>{resultLabel}</div>
                            {rawResult === 'pending' && (r?.pending_text ?? '').trim() !== '' && (
                              <div className="scorecard-history-kpi-reflection" style={{ fontStyle: 'italic' }}>
                                {SCORECARD_COPY.bySaturdayPrefix}{r.pending_text}
                              </div>
                            )}
                            {r?.reflection && (
                              <div className="scorecard-history-kpi-reflection">{r.reflection}</div>
                            )}
                            {/* Wave 2: per-KPI structured_data summary inline.
                                Only renders when the historic entry carried a
                                non-empty structured_data block AND the current
                                template still has a key_fields schema. */}
                            {currentKeyFieldsMap[id] && r?.structured_data && (
                              <StructuredFieldsReadOnly
                                schema={currentKeyFieldsMap[id]}
                                data={r.structured_data}
                                weekOf={row.week_of}
                              />
                            )}
                          </div>
                        );
                      })}
                      {row.weekly_win && (
                        <div className="scorecard-history-kpi-detail">
                          <div className="scorecard-reflection-label">{SCORECARD_COPY.weeklyWinLabel}</div>
                          <div className="scorecard-history-kpi-reflection">{row.weekly_win}</div>
                        </div>
                      )}
                      {row.weekly_learning && (
                        <div className="scorecard-history-kpi-detail">
                          <div className="scorecard-reflection-label">{SCORECARD_COPY.weeklyLearningLabel}</div>
                          <div className="scorecard-history-kpi-reflection">{row.weekly_learning}</div>
                        </div>
                      )}
                      {row.week_rating && (
                        <div className="scorecard-history-kpi-detail">
                          <div className="scorecard-reflection-label">{SCORECARD_COPY.weekRatingLabel}</div>
                          <div className="scorecard-history-kpi-reflection">{row.week_rating} / 5</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ---- Early returns (AFTER all hooks) ----

  if (loading) return null;

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="screen fade-in">
            <p className="muted" style={{ textAlign: 'center' }}>{SCORECARD_COPY.errorLoad}</p>
          </div>
        </div>
      </div>
    );
  }

  if (noSelection) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="scorecard-commit-gate">
            <h3>{SCORECARD_COPY.emptyGuardHeading}</h3>
            <p className="muted">{SCORECARD_COPY.emptyGuardBody}</p>
            <div className="nav-row" style={{ marginTop: 16 }}>
              <Link to={`/hub/${partner}`} className="btn-ghost">
                {SCORECARD_COPY.emptyGuardCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  // Phase 19 D-05: a Yes-rated row whose required key_fields fail validation
  // is treated as "not yet rated" — it does NOT count toward the answered
  // tally until those fields pass. No keeps prior semantics (counts
  // immediately). Pending does NOT count toward the answered tally — D-05
  // only narrows the Yes-side definition; it does NOT promote Pending
  // (preserves Phase 16/17 counter-pill semantics).
  const answeredCount = rows.reduce((acc, tpl) => {
    const entry = kpiResults[tpl.id];
    return acc + (isRowAnswered(tpl, entry) ? 1 : 0);
  }, 0);
  const isSubmitted = view === 'submitted';

  // ---- Render ----
  return (
    <div className="app-shell">
      <div className="container" style={{ paddingBottom: !weekClosed && !isSubmitted ? 96 : undefined }}>
        <AnimatePresence mode="wait">
          <motion.div key={view} className="screen" {...motionProps}>
            <div className="nav-row" style={{ marginBottom: 12 }}>
              <Link to={`/hub/${partner}`} className="btn-ghost">
                {'\u2190'} Back to Hub
              </Link>
            </div>
            <div className="eyebrow">{SCORECARD_COPY.eyebrow}</div>
            <div className="screen-header">
              <h2>{partnerName}</h2>
            </div>

            {/* UAT 2026-04-27: post-submit banner. The completion message bubble
                appears once-per-submission (state-pinned). Below it, a small
                status line states the editability window — "Editable until
                Saturday at 11:59 PM" while the week is open, swapping to the
                weekClosed banner once Saturday close fires. */}
            {isSubmitted && (
              <div className="scorecard-commit-gate" style={{ marginBottom: 16 }}>
                <p className="muted" style={{ margin: 0 }}>
                  {/* UAT C6: rotated completion message picked once on submit;
                      falls back to the canonical submittedNotice on remount. */}
                  {completionMessage ?? SCORECARD_COPY.submittedNotice}
                  {committedAt && (
                    <>
                      {' '}
                      <span style={{ opacity: 0.85 }}>
                        {SCORECARD_COPY.submittedOnPrefix}
                        {new Date(committedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </p>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12, fontStyle: 'italic' }}>
                  {weekClosed
                    ? SCORECARD_COPY.weekClosedBanner(formatWeekRange(currentWeekOf))
                    : SCORECARD_COPY.editableUntilSaturday}
                </p>
              </div>
            )}

            <div className="scorecard-meta-row">
              <span className={`scorecard-counter${answeredCount === rows.length ? ' complete' : ''}`}>
                {answeredCount === rows.length
                  ? SCORECARD_COPY.counterComplete(rows.length)
                  : SCORECARD_COPY.counter(answeredCount, rows.length)}
              </span>
              <span className={`scorecard-saved${savedVisible ? ' visible' : ''}`}>
                {SCORECARD_COPY.savedIndicator}
              </span>
            </div>

            {weekClosed && !isSubmitted && (
              <p className="muted" style={{ marginBottom: 16 }}>
                {SCORECARD_COPY.weekClosedBanner(formatWeekRange(currentWeekOf))}
              </p>
            )}

            {/* Wave 3 Tier 3: last-week commitment carry-forward.
                Read-only context card surfacing last week's Pending rows
                with their resolution state. Renders nothing when there's
                no prior submission or no Pending commitments. */}
            <LastWeekCommitments priorScorecard={priorScorecard} />

            {/* UAT C1: self-chosen growth reminder — read-only, top of scorecard */}
            <SelfChosenGrowthReminder growthPriorities={growthPriorities} />


            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rows.map((tpl) => {
                const entry = kpiResults[tpl.id] || { result: null, reflection: '', count: 0, pending_text: '' };
                // Phase 17 D-02 / D-07: derive effective result + closed-pending modifier.
                const effective = effectiveResult(entry.result, currentWeekOf);
                const isLivePending = entry.result === 'pending' && effective === 'pending';
                const isClosedPending = entry.result === 'pending' && effective === 'no';
                // UAT 2026-04-27: extended D-16 — every field stays editable until
                // Saturday close. weekClosed is the single editability gate.
                // isPendingReopen now flags only "this is a post-submit edit of a
                // Pending row" for the inline hint copy, not for input gating.
                const isPendingReopen = isSubmitted && !weekClosed && entry.result === 'pending';
                const rowClass = [
                  'scorecard-kpi-row',
                  entry.result === 'yes' ? 'yes' : '',
                  entry.result === 'no' ? 'no' : '',
                  entry.result === 'pending' ? 'pending' : '',
                  isClosedPending ? 'muted' : '',
                ].filter(Boolean).join(' ');
                const pickerDisabled = weekClosed;
                const bodyDisabled = weekClosed;
                const showEditablePicker = !weekClosed;
                return (
                  <div key={tpl.id} className={rowClass} id={`kpi-${tpl.id}`}>
                    <div className="scorecard-baseline-label">
                      {tpl.baseline_action}
                      {isLivePending && (
                        <span className="pending-badge">{SCORECARD_COPY.pendingBadge}</span>
                      )}
                      {isClosedPending && (
                        <span className="pending-badge muted">{SCORECARD_COPY.pendingBadgeMuted}</span>
                      )}
                    </div>
                    <div className="scorecard-growth-clause">
                      {SCORECARD_COPY.growthPrefix} {tpl.growth_clause}
                    </div>

                    {isPendingReopen && (
                      <div className="scorecard-pending-update-note">{SCORECARD_COPY.pendingUpdateNote}</div>
                    )}

                    {showEditablePicker ? (
                      <div className="scorecard-yn-row" id={`kpi-${tpl.id}-result`}>
                        <button
                          type="button"
                          className={`scorecard-yn-btn yes${entry.result === 'yes' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'yes')}
                          disabled={pickerDisabled}
                        >
                          Met
                        </button>
                        <button
                          type="button"
                          className={`scorecard-yn-btn no${entry.result === 'no' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'no')}
                          disabled={pickerDisabled}
                        >
                          Not Met
                        </button>
                        <button
                          type="button"
                          className={`scorecard-yn-btn pending${entry.result === 'pending' ? ' active' : ''}`}
                          onClick={() => setResult(tpl.id, 'pending')}
                          disabled={pickerDisabled}
                        >
                          {SCORECARD_COPY.pendingBtn}
                        </button>
                      </div>
                    ) : (
                      <div className="scorecard-yn-row" id={`kpi-${tpl.id}-result`}>
                        <span
                          className={`scorecard-yn-btn ${effective === 'yes' ? 'yes active' : effective === 'no' ? 'no active' : ''}`}
                          style={{ cursor: 'default' }}
                        >
                          {effective === 'yes' ? 'Met' : effective === 'no' ? 'Not Met' : '\u2014'}
                        </span>
                      </div>
                    )}

                    {/* Pending follow-through textarea reveal \u2014 D-06.
                        Mounted only when result === 'pending'; the .expanded modifier drives
                        the CSS max-height transition. Read-only when not editable. */}
                    <div className={`scorecard-pending-reveal${entry.result === 'pending' ? ' expanded' : ''}`}>
                      {entry.result === 'pending' && (
                        showEditablePicker ? (
                          <>
                            <label className="scorecard-reflection-label" htmlFor={`kpi-${tpl.id}-pending-text`}>
                              {SCORECARD_COPY.pendingFollowThroughLabel}
                            </label>
                            <textarea
                              id={`kpi-${tpl.id}-pending-text`}
                              rows={2}
                              value={entry.pending_text ?? ''}
                              onChange={(e) => setPendingTextLocal(tpl.id, e.target.value)}
                              onBlur={persistField}
                              placeholder={SCORECARD_COPY.pendingFollowThroughPlaceholder}
                              disabled={pickerDisabled}
                            />
                          </>
                        ) : (
                          (entry.pending_text ?? '').trim() !== '' && (
                            <div style={{ fontStyle: 'italic', color: 'var(--muted)', marginTop: 8 }}>
                              {SCORECARD_COPY.bySaturdayPrefix}{entry.pending_text}
                            </div>
                          )
                        )
                      )}
                    </div>

                    {tpl.countable && (
                      <div className="scorecard-count-field" style={{ marginTop: 12 }}>
                        <label className="scorecard-reflection-label">{SCORECARD_COPY.countLabel}</label>
                        {bodyDisabled ? (
                          <span>{entry.count ?? 0}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            className="scorecard-count-input"
                            value={entry.count ?? 0}
                            onChange={(e) => setCountLocal(tpl.id, e.target.value)}
                            onBlur={persistField}
                            disabled={bodyDisabled}
                          />
                        )}
                      </div>
                    )}

                    {/* Wave 1 (migration 020): per-KPI structured input block. Mounted
                        only when tpl.key_fields !== null. Sits ABOVE the reflection
                        textarea so structured evidence is captured first; the textarea
                        below remains for variance / freeform commentary.
                        Wave 2 (UAT 2026-05-09): when the row body is disabled
                        (week closed), render the compact StructuredFieldsReadOnly
                        summary instead of the disabled-input chrome — same data,
                        denser layout that fits read-only history density. */}
                    {tpl.key_fields && (
                      bodyDisabled ? (
                        <StructuredFieldsReadOnly
                          schema={tpl.key_fields}
                          data={entry.structured_data ?? {}}
                          weekOf={currentWeekOf}
                        />
                      ) : (
                        <StructuredFieldsBlock
                          schema={tpl.key_fields}
                          data={entry.structured_data ?? {}}
                          weekOf={currentWeekOf}
                          disabled={bodyDisabled}
                          templateId={tpl.id}
                          onChange={(next) => setStructuredDataLocal(tpl.id, next)}
                          onBlur={persistField}
                        />
                      )
                    )}

                    <div className="scorecard-reflection" style={{ marginTop: 12 }}>
                      <label className="scorecard-reflection-label">{SCORECARD_COPY.reflectionLabel}</label>
                      {/* UAT 2026-05-04: per-KPI reflection prompt from migration 015.
                          Renders as italic muted helper text between label and textarea.
                          Falls back to no helper for templates without a prompt \u2014 submit
                          gate still requires non-empty reflection regardless. */}
                      {tpl.reflection_prompt && (
                        <p className="scorecard-reflection-prompt">{tpl.reflection_prompt}</p>
                      )}
                      {bodyDisabled ? (
                        <p className="muted" style={{ margin: 0 }} id={`kpi-${tpl.id}-reflection`}>{entry.reflection || '\u2014'}</p>
                      ) : (
                        <textarea
                          id={`kpi-${tpl.id}-reflection`}
                          value={entry.reflection}
                          onChange={(e) => setReflectionLocal(tpl.id, e.target.value)}
                          onBlur={persistField}
                          disabled={bodyDisabled}
                          rows={3}
                          placeholder={SCORECARD_COPY.reflectionPlaceholder}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UAT C1: mandatory growth weekly follow-up form — between KPI rows and Weekly Reflection */}
            <MandatoryGrowthFollowupForm
              partner={partner}
              growthPriorities={growthPriorities}
              growthFollowup={growthFollowup}
              setGrowthFollowup={setGrowthFollowup}
              onPersist={persistField}
              disabled={weekClosed}
            />

            {/* Weekly Reflection section */}
            <div className="scorecard-reflection-section">
              <div className="eyebrow">{SCORECARD_COPY.weeklyReflectionHeading}</div>

              {/* UAT 2026-04-27: extended D-16 \u2014 Weekly Reflection block stays
                  fully editable through Saturday close regardless of submit state. */}
              <div className="scorecard-tasks-row">
                <div>
                  <label className="scorecard-reflection-label">{SCORECARD_COPY.tasksCompletedLabel}</label>
                  <textarea
                    className="textarea"
                    value={tasksCompleted}
                    onChange={(e) => setTasksCompleted(e.target.value)}
                    onBlur={persistField}
                    placeholder={SCORECARD_COPY.tasksCompletedPlaceholder}
                    disabled={weekClosed}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="scorecard-reflection-label">{SCORECARD_COPY.tasksCarriedOverLabel}</label>
                  <textarea
                    className="textarea"
                    value={tasksCarriedOver}
                    onChange={(e) => setTasksCarriedOver(e.target.value)}
                    onBlur={persistField}
                    placeholder={SCORECARD_COPY.tasksCarriedOverPlaceholder}
                    disabled={weekClosed}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.biggestWinLabel}</label>
                <textarea
                  className="textarea"
                  value={weeklyWin}
                  onChange={(e) => setWeeklyWin(e.target.value)}
                  onBlur={persistField}
                  placeholder={SCORECARD_COPY.biggestWinPlaceholder}
                  disabled={weekClosed}
                  rows={3}
                />
              </div>

              <div>
                <label className="scorecard-reflection-label">{SCORECARD_COPY.learningLabel}</label>
                <textarea
                  className="textarea"
                  value={weeklyLearning}
                  onChange={(e) => setWeeklyLearning(e.target.value)}
                  onBlur={persistField}
                  placeholder={SCORECARD_COPY.learningPlaceholder}
                  disabled={weekClosed}
                  rows={3}
                />
              </div>

              <div id="week-rating-input">
                <label className="scorecard-reflection-label">{SCORECARD_COPY.weekRatingLabel}</label>
                <div className="scorecard-rating-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`scorecard-rating-btn${weekRating === n ? ' active' : ''}`}
                      onClick={() => setWeekRating(n)}
                      disabled={weekClosed}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="scorecard-rating-labels">
                  <span>{SCORECARD_COPY.weekRatingLeft}</span>
                  <span>{SCORECARD_COPY.weekRatingRight}</span>
                </div>
              </div>
            </div>

            {saveError && (
              <p className="muted" style={{ color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>{saveError}</p>
            )}
            {/* Phase 19 D-04: inline submit checklist. Replaces the prior
                single-line submitError paragraph when validation gaps exist.
                Falls back to the legacy submitError <p> only when no gaps
                are detected (e.g., generic submitErrorDb after a network
                failure inside performSubmit). */}
            {!weekClosed && !isSubmitted ? (() => {
              const gaps = getValidationGaps(rows, kpiResults, weekRating, growthFollowup, partner);
              if (gaps.length === 0) {
                return submitError ? (
                  <p className="muted" style={{ color: 'var(--miss)', textAlign: 'center', marginTop: 8 }}>
                    {submitError}
                  </p>
                ) : null;
              }
              return (
                <div className="scorecard-submit-checklist" aria-live="polite">
                  <p className="scorecard-submit-checklist-eyebrow">
                    {SCORECARD_COPY.submitChecklistEyebrow}
                  </p>
                  <ul>
                    {gaps.map((gap) => (
                      <li key={gap.anchor}>
                        <button
                          type="button"
                          className="scorecard-submit-checklist-item"
                          onClick={() => {
                            const el = document.getElementById(gap.anchor);
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                        >
                          {gap.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })() : (
              submitError && (
                <p className="muted" style={{ color: 'var(--miss)', textAlign: 'center', marginTop: 8 }}>
                  {submitError}
                </p>
              )
            )}

            {renderHistory()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* UAT 2026-04-27 (extended D-16): sticky submit bar shows ONLY in pre-submit
          editing mode while the week is open. Once submitted, all fields stay editable
          but auto-save handles every change silently — no "Resubmit" CTA so the partner
          isn't tempted into thinking the auto-saved edits aren't already persisted.
          After Saturday close the bar disappears regardless of submit state. */}
      {!weekClosed && !isSubmitted && (() => {
        // Phase 19 D-04: derive gaps once for the sticky-bar disabled binding.
        // Note: computed here AND in the inline checklist render above (single-
        // page form; render cost is negligible). If hot-path optimization is
        // needed later, lift gaps to a useMemo keyed on
        // (rows, kpiResults, weekRating, growthFollowup, partner).
        const gaps = getValidationGaps(rows, kpiResults, weekRating, growthFollowup, partner);
        return (
          <div className="scorecard-sticky-bar">
            <span className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
              {SCORECARD_COPY.stickyNote}
            </span>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={submitting || gaps.length > 0}
              title={gaps.length > 0 ? SCORECARD_COPY.submitChecklistEyebrow : undefined}
            >
              {SCORECARD_COPY.submitCta}
            </button>
          </div>
        );
      })()}

      {/* UAT C5: submit confirmation overlay — rendered above the sticky bar. */}
      {confirmingSubmit && (
        <div
          className="scorecard-submit-confirm-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
          }}
          onClick={cancelSubmitConfirm}
        >
          <div
            className="scorecard-submit-confirm-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
              width: '100%',
              padding: '24px 24px 20px',
              borderRadius: 14,
              background: 'var(--card, #1a1a1a)',
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
            }}
          >
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {SCORECARD_COPY.submitConfirmEyebrow}
            </div>
            <h3 style={{ margin: '0 0 12px', fontSize: 20, lineHeight: 1.3 }}>
              {SCORECARD_COPY.submitConfirmHeading}
            </h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
              {SCORECARD_COPY.submitConfirmBody}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelSubmitConfirm}
                disabled={submitting}
              >
                {SCORECARD_COPY.submitConfirmCancelCta}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={performSubmit}
                disabled={submitting}
              >
                {submitting ? SCORECARD_COPY.submitConfirmSubmittingCta : SCORECARD_COPY.submitConfirmCta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// UAT C1: SelfChosenGrowthReminder — top-of-scorecard read-only reminder card
// surfacing the partner's self-chosen personal growth priority. No inputs
// (the self-chosen priority is intentionally NOT tracked weekly per spec).
// --------------------------------------------------------------------------

function SelfChosenGrowthReminder({ growthPriorities }) {
  const selfChosen = (growthPriorities ?? []).find(
    (g) => g.type === 'personal' && g.subtype === 'self_personal'
  );
  if (!selfChosen) return null;
  const description = selfChosen.description || selfChosen.custom_text || '';
  if (!description) return null;
  return (
    <div className="scorecard-growth-callout scorecard-growth-callout--reminder">
      <div className="scorecard-growth-callout__eyebrow">
        {GROWTH_FOLLOWUP_COPY.selfChosenEyebrow}
      </div>
      <div className="scorecard-growth-callout__title">{description}</div>
      <div className="scorecard-growth-callout__hint">
        {GROWTH_FOLLOWUP_COPY.selfChosenSubtext}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// MandatoryGrowthFollowupForm — partner-specific GROWTH CONSIDERATION callout.
// 2026-04-29 reframe: this block is intentionally NOT styled as a required
// form. The mandatory growth priority is a reflection lens for the week, not
// a data-collection mechanism. The structured fields (Theo days/time, Jerry
// who/why_difficult) remain as optional capture inputs — partners may fill
// them in if helpful, but submit gating ignores growth_followup entirely
// (handleSubmit checks kpi reflections only). Field schema is still content-
// driven via GROWTH_FOLLOWUP_FIELDS and persists in scorecards.growth_followup
// JSONB (migration 012, no schema change).
// --------------------------------------------------------------------------

function MandatoryGrowthFollowupForm({
  partner,
  growthPriorities,
  growthFollowup,
  setGrowthFollowup,
  onPersist,
  disabled,
}) {
  const fields = GROWTH_FOLLOWUP_FIELDS[partner];
  if (!fields || fields.length === 0) return null; // 'test' partner or unknown

  const mandatory = (growthPriorities ?? []).find(
    (g) =>
      g.type === 'personal' &&
      // Mandatory subtype labels vary across seeds; treat any non-self-chosen personal as mandatory.
      g.subtype !== 'self_personal'
  );
  const mandatoryDescription = mandatory?.description || mandatory?.custom_text || '';

  function setField(key, value) {
    setGrowthFollowup((prev) => ({ ...(prev ?? {}), [key]: value }));
  }

  return (
    <div className="scorecard-growth-callout scorecard-growth-callout--consideration">
      <div className="scorecard-growth-callout__eyebrow">
        {GROWTH_FOLLOWUP_COPY.considerationEyebrow}
      </div>
      {mandatoryDescription ? (
        <div className="scorecard-growth-callout__title">{mandatoryDescription}</div>
      ) : (
        <div className="scorecard-growth-callout__title scorecard-growth-callout__title--empty">
          {GROWTH_FOLLOWUP_COPY.emptyMandatory}
        </div>
      )}
      <div className="scorecard-growth-callout__hint">
        {GROWTH_FOLLOWUP_COPY.considerationHint}
      </div>

      {mandatoryDescription && (
        <div className="scorecard-growth-callout__fields">
          {fields.map((f) => {
            const value = (growthFollowup ?? {})[f.key] ?? '';
            // UAT 2026-05-04 (later same day): growth consideration is now
            // required. Field labels stand on their own — '(optional)' suffix
            // removed; submit gate enforces non-empty trim per field below.
            const labelText = f.label;
            return (
              <div key={f.key} className="scorecard-growth-callout__field">
                <label
                  className="scorecard-growth-callout__field-label"
                  htmlFor={`growth-followup-${f.key}`}
                >
                  {labelText}
                </label>
                {disabled ? (
                  <p className="scorecard-growth-callout__readonly">{value || '—'}</p>
                ) : f.kind === 'textarea' ? (
                  <textarea
                    id={`growth-followup-${f.key}`}
                    className="scorecard-growth-callout__input"
                    rows={2}
                    value={value}
                    placeholder={f.placeholder}
                    onChange={(e) => setField(f.key, e.target.value)}
                    onBlur={onPersist}
                  />
                ) : (
                  <input
                    id={`growth-followup-${f.key}`}
                    type="text"
                    className="scorecard-growth-callout__input"
                    value={value}
                    placeholder={f.placeholder}
                    onChange={(e) => setField(f.key, e.target.value)}
                    onBlur={onPersist}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Wave 1 (migration 020): StructuredFieldsBlock — per-KPI structured inputs.
//
// Schema-driven renderer that dispatches on schema.pattern:
//   - 'count_noteworthy' → integer count + optional curated noteworthy[] rows
//   - 'row_per_item'     → integer count + exactly N row entries (one per item)
//   - 'named_fields'     → flat form of named fields (with optional autoPeriod)
//
// Field types: number | currency | text | textarea | yes_no | row_list.
// row_list is only used INSIDE named_fields (e.g. major_expenses on the
// Friday financial report). Nested row_list inside row_per_item / count_noteworthy
// is not supported in v1.
//
// All structured data flows up via the onChange(next) callback with the full
// next-shape object; onBlur fires the parent persistField. Empty data is
// the default; the parent omits structured_data from the kpi_results payload
// when no fields have been touched.
// --------------------------------------------------------------------------

function StructuredFieldsBlock({ schema, data, weekOf, disabled, templateId, onChange, onBlur }) {
  if (!schema || typeof schema !== 'object') return null;
  const pattern = schema.pattern;
  if (pattern === 'count_noteworthy') {
    return (
      <CountNoteworthyBlock
        schema={schema}
        data={data}
        disabled={disabled}
        templateId={templateId}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  }
  if (pattern === 'row_per_item') {
    return (
      <RowPerItemBlock
        schema={schema}
        data={data}
        disabled={disabled}
        templateId={templateId}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  }
  if (pattern === 'named_fields') {
    return (
      <NamedFieldsBlock
        schema={schema}
        data={data}
        weekOf={weekOf}
        disabled={disabled}
        templateId={templateId}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  }
  return null;
}

// Format the auto-period range for named_fields with autoPeriod=true.
// Returns "Apr 27 – May 4" — prior Mon to current week_of Mon.
function formatAutoPeriod(weekOf) {
  if (!weekOf) return '';
  const [y, m, d] = weekOf.split('-').map(Number);
  const end = new Date(y, m - 1, d);
  const start = new Date(y, m - 1, d - 7);
  const fmt = (dt) => dt.toLocaleString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function CountNoteworthyBlock({ schema, data, disabled, templateId, onChange, onBlur }) {
  const count = Number.isFinite(Number(data?.count)) ? Number(data.count) : 0;
  const noteworthy = Array.isArray(data?.noteworthy) ? data.noteworthy : [];
  const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];

  function setCount(value) {
    const numeric = value === '' ? 0 : Math.max(0, Math.floor(Number(value)));
    onChange({ ...(data ?? {}), count: Number.isFinite(numeric) ? numeric : 0, noteworthy });
  }

  function setRow(idx, key, value) {
    const next = noteworthy.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
    onChange({ ...(data ?? {}), count, noteworthy: next });
  }

  function addRow() {
    const blank = Object.fromEntries(rowFields.map((f) => [f.key, '']));
    onChange({ ...(data ?? {}), count, noteworthy: [...noteworthy, blank] });
  }

  function removeRow(idx) {
    const next = noteworthy.filter((_, i) => i !== idx);
    onChange({ ...(data ?? {}), count, noteworthy: next });
  }

  return (
    <div className="scorecard-structured-fields">
      {/* Phase 19 hide_count: skip the count input entirely when schema.hide_count
          is truthy — the noteworthy list length is the authoritative count. */}
      {!schema.hide_count && (
        <div className="scorecard-structured-field">
          <label className="scorecard-reflection-label">{schema.countLabel}</label>
          {disabled ? (
            <span>{count}</span>
          ) : (
            <input
              type="number"
              min="0"
              className="scorecard-count-input"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onBlur={onBlur}
            />
          )}
        </div>
      )}
      <div className="scorecard-structured-noteworthy">
        <div className="scorecard-structured-noteworthy__label">{schema.noteworthyLabel}</div>
        {noteworthy.map((row, idx) => (
          <div key={idx} className="scorecard-structured-row">
            <div className="scorecard-structured-row__fields">
              {rowFields.map((f) => (
                <StructuredFieldInput
                  key={f.key}
                  field={f}
                  value={row[f.key] ?? ''}
                  disabled={disabled}
                  templateId={templateId}
                  fieldKey={f.key}
                  rowIndex={idx}
                  onChange={(v) => setRow(idx, f.key, v)}
                  onBlur={onBlur}
                />
              ))}
            </div>
            {!disabled && (
              <button
                type="button"
                className="btn-ghost scorecard-structured-row__remove"
                onClick={() => removeRow(idx)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            className="btn-ghost scorecard-structured-add"
            onClick={addRow}
          >
            + Add noteworthy
          </button>
        )}
      </div>
    </div>
  );
}

function RowPerItemBlock({ schema, data, disabled, templateId, onChange, onBlur }) {
  const count = Number.isFinite(Number(data?.count)) ? Number(data.count) : 0;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const rowFields = Array.isArray(schema.rowFields) ? schema.rowFields : [];

  function setCount(rawValue) {
    const numeric = rawValue === '' ? 0 : Math.max(0, Math.floor(Number(rawValue)));
    const next = Number.isFinite(numeric) ? numeric : 0;
    if (next === rows.length) {
      onChange({ ...(data ?? {}), count: next, rows });
      return;
    }
    if (next > rows.length) {
      // Grow rows[] with blank entries.
      const blank = Object.fromEntries(rowFields.map((f) => [f.key, '']));
      const grown = [...rows, ...Array.from({ length: next - rows.length }, () => ({ ...blank }))];
      onChange({ ...(data ?? {}), count: next, rows: grown });
      return;
    }
    // Shrinking: drop from the end. Confirm if any of the dropped rows have data;
    // otherwise drop silently.
    const dropping = rows.slice(next);
    const droppingHasData = dropping.some((r) =>
      Object.values(r ?? {}).some((v) => (typeof v === 'string' ? v.trim() : v) !== '' && v !== null && v !== undefined)
    );
    if (droppingHasData && typeof window !== 'undefined') {
      const ok = window.confirm(
        `Dropping ${dropping.length} row(s) with data. Continue?`
      );
      if (!ok) return;
    }
    onChange({ ...(data ?? {}), count: next, rows: rows.slice(0, next) });
  }

  function setRow(idx, key, value) {
    const next = rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
    onChange({ ...(data ?? {}), count, rows: next });
  }

  return (
    <div className="scorecard-structured-fields">
      {/* Phase 19 hide_count: skip the count input when schema.hide_count.
          The rows list length is the authoritative count in that mode. */}
      {!schema.hide_count && (
        <div className="scorecard-structured-field">
          <label className="scorecard-reflection-label">{schema.countLabel}</label>
          {disabled ? (
            <span>{count}</span>
          ) : (
            <input
              type="number"
              min="0"
              className="scorecard-count-input"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onBlur={onBlur}
            />
          )}
        </div>
      )}
      {rows.length > 0 && (
        <div className="scorecard-structured-noteworthy">
          {schema.rowLabel && (
            <div className="scorecard-structured-noteworthy__label">{schema.rowLabel}</div>
          )}
          {rows.map((row, idx) => (
            <div key={idx} className="scorecard-structured-row">
              <div className="scorecard-structured-row__fields">
                {rowFields.map((f) => (
                  <StructuredFieldInput
                    key={f.key}
                    field={f}
                    value={row[f.key] ?? ''}
                    disabled={disabled}
                    templateId={templateId}
                    fieldKey={f.key}
                    rowIndex={idx}
                    onChange={(v) => setRow(idx, f.key, v)}
                    onBlur={onBlur}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NamedFieldsBlock({ schema, data, weekOf, disabled, templateId, onChange, onBlur }) {
  const fields = Array.isArray(schema.fields) ? schema.fields : [];

  function setField(key, value) {
    onChange({ ...(data ?? {}), [key]: value });
  }

  return (
    <div className="scorecard-structured-fields">
      {schema.autoPeriod && (
        <div className="scorecard-structured-period">
          {schema.periodLabel ? `${schema.periodLabel}: ` : 'Reporting period: '}
          {formatAutoPeriod(weekOf)}
        </div>
      )}
      {fields.map((f) => (
        <NamedFieldInput
          key={f.key}
          field={f}
          value={data?.[f.key]}
          disabled={disabled}
          templateId={templateId}
          onChange={(v) => setField(f.key, v)}
          onBlur={onBlur}
        />
      ))}
    </div>
  );
}

function NamedFieldInput({ field, value, disabled, templateId, onChange, onBlur }) {
  // row_list is the nested-rows variant — used inside named_fields (e.g.
  // major_expenses on the Friday financial report). Each child has its own
  // rowFields; the renderer mirrors the count_noteworthy add/remove pattern
  // but without a count input (just an Add button + per-row Remove).
  if (field.type === 'row_list') {
    const rows = Array.isArray(value) ? value : [];
    const rowFields = Array.isArray(field.rowFields) ? field.rowFields : [];

    function setRow(idx, key, v) {
      const next = rows.map((r, i) => (i === idx ? { ...r, [key]: v } : r));
      onChange(next);
    }
    function addRow() {
      const blank = Object.fromEntries(rowFields.map((f) => [f.key, '']));
      onChange([...rows, blank]);
    }
    function removeRow(idx) {
      onChange(rows.filter((_, i) => i !== idx));
    }

    return (
      <div
        className="scorecard-structured-field scorecard-structured-field--row-list"
        id={templateId ? `field-${templateId}-${field.key}` : undefined}
      >
        <label className="scorecard-reflection-label">{field.label}</label>
        {rows.map((row, idx) => (
          <div key={idx} className="scorecard-structured-row">
            <div className="scorecard-structured-row__fields">
              {rowFields.map((rf) => (
                <StructuredFieldInput
                  key={rf.key}
                  field={rf}
                  value={row[rf.key] ?? ''}
                  disabled={disabled}
                  templateId={templateId}
                  fieldKey={rf.key}
                  rowIndex={idx}
                  parentFieldKey={field.key}
                  onChange={(v) => setRow(idx, rf.key, v)}
                  onBlur={onBlur}
                />
              ))}
            </div>
            {!disabled && (
              <button
                type="button"
                className="btn-ghost scorecard-structured-row__remove"
                onClick={() => removeRow(idx)}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            className="btn-ghost scorecard-structured-add"
            onClick={addRow}
          >
            + Add row
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="scorecard-structured-field">
      <label className="scorecard-reflection-label">{field.label}</label>
      <StructuredFieldInput
        field={field}
        value={value ?? ''}
        disabled={disabled}
        templateId={templateId}
        fieldKey={field.key}
        onChange={onChange}
        onBlur={onBlur}
      />
    </div>
  );
}

// Single-input renderer for primitive field types. Used by all three patterns
// inside their per-row or per-field loops. row_list is handled at the parent
// (NamedFieldInput) since it requires its own rowFields scope.
//
// Phase 19 D-04: deterministic input IDs. The new prop trio (templateId,
// fieldKey, rowIndex, parentFieldKey) is REQUIRED for any new call site so
// the inline submit-checklist's document.getElementById(anchor) resolves.
// Anchor scheme (must match findFirstMissingFieldAnchor):
//   named_fields top-level field:                 field-${tplId}-${fieldKey}
//   named_fields row_list nested field:           field-${tplId}-${parentFieldKey}-${rowIndex}-${fieldKey}
//   row_per_item rowField:                        field-${tplId}-${fieldKey}-${rowIndex}
//   count_noteworthy noteworthy rowField:         field-${tplId}-${fieldKey}-${rowIndex}
//   multi_choice single-select per_selection_field:
//     parentFieldKey = `${fieldKey}__${selectionValue}`
//     id = field-${tplId}-${parentFieldKey}-${perFieldKey}
//   multi_choice multi-select per_selection_field:
//     parentFieldKey = `${fieldKey}-${selectionValue}`
//     id = field-${tplId}-${parentFieldKey}-${perFieldKey}
// (Wave 1 plan 19-02 will pass the multi_choice-scoped parentFieldKey when
// it wires the field-type render. Wave 0 ships the matching emit scheme in
// findFirstMissingFieldAnchor so anchors resolve once Wave 1 lands.)
//
// If templateId or fieldKey are not supplied (legacy / defensive), inputId
// falls back to a stable string built from field.key — anchors won't resolve
// but the input still renders.
function StructuredFieldInput({
  field,
  value,
  disabled,
  templateId,
  fieldKey,
  rowIndex,
  parentFieldKey,
  onChange,
  onBlur,
}) {
  const resolvedFieldKey = fieldKey ?? field?.key ?? 'field';
  let inputId;
  if (templateId == null) {
    inputId = `structured-${resolvedFieldKey}`;
  } else if (parentFieldKey != null && Number.isInteger(rowIndex)) {
    // row_list sub-row: parent + rowIndex + leaf
    inputId = `field-${templateId}-${parentFieldKey}-${rowIndex}-${resolvedFieldKey}`;
  } else if (parentFieldKey != null) {
    // multi_choice per-selection (no rowIndex — parentFieldKey carries the selection value)
    inputId = `field-${templateId}-${parentFieldKey}-${resolvedFieldKey}`;
  } else if (Number.isInteger(rowIndex)) {
    // row_per_item / count_noteworthy row leaf
    inputId = `field-${templateId}-${resolvedFieldKey}-${rowIndex}`;
  } else {
    // named_fields top-level leaf
    inputId = `field-${templateId}-${resolvedFieldKey}`;
  }

  if (disabled) {
    if (field.type === 'yes_no') {
      const label = value === 'yes' ? 'Yes' : value === 'no' ? 'No' : '—';
      return (
        <div className="scorecard-structured-fieldlet">
          <span className="scorecard-structured-fieldlet__label">{field.label}</span>
          <span className="scorecard-structured-fieldlet__readonly">{label}</span>
        </div>
      );
    }
    const display = value === '' || value === null || value === undefined ? '—' : String(value);
    const prefix = field.type === 'currency' && display !== '—' ? '$' : '';
    return (
      <div className="scorecard-structured-fieldlet">
        <span className="scorecard-structured-fieldlet__label">{field.label}</span>
        <span className="scorecard-structured-fieldlet__readonly">{prefix}{display}</span>
      </div>
    );
  }

  if (field.type === 'yes_no') {
    return (
      <div className="scorecard-structured-fieldlet">
        <span className="scorecard-structured-fieldlet__label">{field.label}</span>
        <div className="scorecard-yn-row scorecard-structured-yn-row">
          <button
            type="button"
            className={`scorecard-yn-btn yes${value === 'yes' ? ' active' : ''}`}
            onClick={() => {
              onChange('yes');
              if (onBlur) onBlur();
            }}
          >
            Yes
          </button>
          <button
            type="button"
            className={`scorecard-yn-btn no${value === 'no' ? ' active' : ''}`}
            onClick={() => {
              onChange('no');
              if (onBlur) onBlur();
            }}
          >
            No
          </button>
        </div>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="scorecard-structured-fieldlet">
        <span className="scorecard-structured-fieldlet__label">{field.label}</span>
        <textarea
          id={inputId}
          className="scorecard-structured-fieldlet__input"
          rows={3}
          value={value ?? ''}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (field.type === 'number' || field.type === 'currency') {
    const isCurrency = field.type === 'currency';
    return (
      <div className="scorecard-structured-fieldlet">
        <span className="scorecard-structured-fieldlet__label">{field.label}</span>
        <div className="scorecard-structured-fieldlet__numeric">
          {isCurrency && <span className="scorecard-structured-fieldlet__prefix">$</span>}
          <input
            id={inputId}
            type="number"
            step={isCurrency ? '0.01' : '1'}
            min="0"
            className="scorecard-structured-fieldlet__input"
            value={value ?? ''}
            placeholder={field.placeholder ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={onBlur}
          />
        </div>
      </div>
    );
  }

  // Default: text
  return (
    <div className="scorecard-structured-fieldlet">
      <span className="scorecard-structured-fieldlet__label">{field.label}</span>
      <input
        id={inputId}
        type="text"
        className="scorecard-structured-fieldlet__input"
        value={value ?? ''}
        placeholder={field.placeholder ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
