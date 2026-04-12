import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  supabase,
  fetchKpiTemplates,
  fetchKpiSelections,
  upsertKpiSelection,
  deleteKpiSelection,
  fetchGrowthPriorities,
  upsertGrowthPriority,
  fetchGrowthPriorityTemplates,
  lockKpiSelections,
} from '../lib/supabase.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, KPI_COPY, CATEGORY_LABELS } from '../data/content.js';

// Motion props shared by all three views — matches questionnaire pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

export default function KpiSelection() {
  const { partner } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [priorityTemplates, setPriorityTemplates] = useState([]);
  const [existingSelections, setExistingSelections] = useState([]);
  const [existingPriorities, setExistingPriorities] = useState([]);

  // Mandatory+choice model state
  const [mandatoryTemplates, setMandatoryTemplates] = useState([]);
  const [choiceTemplates, setChoiceTemplates] = useState([]);
  const [mandatorySelections, setMandatorySelections] = useState([]);
  const [selectedChoiceIds, setSelectedChoiceIds] = useState([]);
  const [selfChosenTitle, setSelfChosenTitle] = useState('');
  const [selfChosenMeasure, setSelfChosenMeasure] = useState('');
  const [mandatoryPersonalTemplate, setMandatoryPersonalTemplate] = useState(null);
  const [businessPriorities, setBusinessPriorities] = useState([]);

  const [view, setView] = useState('selection'); // 'selection' | 'confirmation' | 'success'
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);

  // On mount: guard partner, load all data, pre-populate from any in-progress state
  useEffect(() => {
    // Guard 1: invalid partner slug
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }

    Promise.all([
      fetchKpiTemplates(),
      fetchKpiSelections(partner),
      fetchGrowthPriorities(partner),
      fetchGrowthPriorityTemplates(),
    ])
      .then(([tpls, sels, prios, priorityTpls]) => {
        // Guard: already locked -> redirect to read-only view
        if (sels.length > 0 && sels[0].locked_until) {
          navigate(`/kpi-view/${partner}`, { replace: true });
          return;
        }

        setTemplates(tpls);
        setPriorityTemplates(priorityTpls);
        setExistingSelections(sels);
        setExistingPriorities(prios);

        // Split templates by partner scope then mandatory flag
        const partnerTpls = tpls.filter(
          (t) => t.partner_scope === 'shared' || t.partner_scope === partner
        );
        const mandatory = partnerTpls.filter((t) => t.mandatory);
        const choices = partnerTpls.filter((t) => !t.mandatory);
        setMandatoryTemplates(mandatory);
        setChoiceTemplates(choices);

        // Separate existing selections into mandatory vs choice
        const mandatoryTplIds = new Set(mandatory.map((t) => t.id));
        setMandatorySelections(sels.filter((s) => mandatoryTplIds.has(s.template_id)));
        const existingChoiceIds = sels
          .filter((s) => !mandatoryTplIds.has(s.template_id))
          .map((s) => s.template_id);
        setSelectedChoiceIds(existingChoiceIds);

        // Find the mandatory personal growth priority template
        const mandatoryPersonal = priorityTpls.find(
          (t) =>
            t.type === 'personal' &&
            t.mandatory &&
            (t.partner_scope === 'shared' || t.partner_scope === partner)
        );
        setMandatoryPersonalTemplate(mandatoryPersonal || null);

        // Hydrate self-chosen personal from existing priorities
        const personalRows = prios.filter((p) => p.type === 'personal');
        const selfChosen = mandatoryPersonal
          ? personalRows.find((p) => p.description !== mandatoryPersonal.description)
          : personalRows[0];
        if (selfChosen && selfChosen.description) {
          // Description stored as "Title — Measure" format
          const parts = selfChosen.description.split(' \u2014 ');
          setSelfChosenTitle(parts[0] || '');
          setSelfChosenMeasure(parts[1] || '');
        }

        // Load business priorities (read-only)
        setBusinessPriorities(prios.filter((p) => p.type === 'business'));
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [partner]);

  // Cap at 2 choice KPIs
  function toggleKpi(templateId) {
    setSelectedChoiceIds((prev) => {
      if (prev.includes(templateId)) return prev.filter((id) => id !== templateId);
      if (prev.length >= 2) return prev; // cap at 2
      return [...prev, templateId];
    });
  }

  const atCap = selectedChoiceIds.length >= 2;
  const selfChosenValid =
    selfChosenTitle.trim().length > 0 && selfChosenMeasure.trim().length > 0;
  const canContinue = selectedChoiceIds.length === 2 && selfChosenValid && !saving;

  // Continue: persist choice KPIs + self-chosen personal growth
  async function continueToConfirmation() {
    if (selectedChoiceIds.length !== 2) return;
    if (!selfChosenValid) return;

    setSaving(true);
    setSubmitError(null);
    try {
      // Only delete non-mandatory, non-locked rows
      const mandatoryTplIds = new Set(mandatoryTemplates.map((t) => t.id));
      for (const row of existingSelections) {
        if (!row.locked_until && !mandatoryTplIds.has(row.template_id)) {
          // eslint-disable-next-line no-await-in-loop
          await deleteKpiSelection(row.id);
        }
      }

      // Insert the 2 choice kpi_selections with label/category snapshot
      for (const tid of selectedChoiceIds) {
        const tpl = choiceTemplates.find((t) => t.id === tid);
        if (!tpl) continue;
        // eslint-disable-next-line no-await-in-loop
        await upsertKpiSelection({
          partner,
          template_id: tpl.id,
          label_snapshot: tpl.label,
          category_snapshot: tpl.category,
          locked_until: null,
        });
      }

      // Delete existing non-locked personal rows that are not the mandatory personal
      for (const row of existingPriorities) {
        if (!row.locked_until && row.type === 'personal') {
          if (
            mandatoryPersonalTemplate &&
            row.description === mandatoryPersonalTemplate.description
          ) {
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          await supabase.from('growth_priorities').delete().eq('id', row.id);
        }
      }

      // Insert self-chosen personal growth priority
      const selfDesc = `${selfChosenTitle.trim()} \u2014 ${selfChosenMeasure.trim()}`;
      await upsertGrowthPriority({
        partner,
        type: 'personal',
        description: selfDesc,
        status: 'active',
        locked_until: null,
      });

      // Refresh rows so Back -> Continue works cleanly
      const [freshSels, freshPrios] = await Promise.all([
        fetchKpiSelections(partner),
        fetchGrowthPriorities(partner),
      ]);
      setExistingSelections(freshSels);
      setExistingPriorities(freshPrios);

      setView('confirmation');
    } catch (err) {
      console.error(err);
      setSubmitError(KPI_COPY.selection.errorContinue);
    } finally {
      setSaving(false);
    }
  }

  // Lock in: insert mandatory personal growth if not present, then lock
  async function lockIn() {
    setSaving(true);
    setSubmitError(null);
    try {
      if (mandatoryPersonalTemplate) {
        const existingMandatoryPersonal = existingPriorities.find(
          (p) =>
            p.type === 'personal' &&
            p.description === mandatoryPersonalTemplate.description
        );
        if (!existingMandatoryPersonal) {
          await upsertGrowthPriority({
            partner,
            type: 'personal',
            description: mandatoryPersonalTemplate.description,
            status: 'active',
            locked_until: null,
          });
        }
      }
      const iso = await lockKpiSelections(partner);
      setLockedUntil(iso);
      setView('success');
      setTimeout(() => navigate(`/hub/${partner}`, { replace: true }), 1800);
    } catch (err) {
      console.error(err);
      setSubmitError(KPI_COPY.confirmation.errorLock);
    } finally {
      setSaving(false);
    }
  }

  // Back preserves state (lives in component state, unchanged)
  function backToSelection() {
    setView('selection');
  }

  if (loading) return null;

  // Load-error / empty-template state
  if (loadError || (templates.length === 0 && !loading)) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="screen fade-in">
            <div className="eyebrow">{KPI_COPY.selection.eyebrow}</div>
            <div className="screen-header">
              <h2>{KPI_COPY.selection.heading}</h2>
            </div>
            <p className="error">
              {loadError ? KPI_COPY.selection.errorLoad : KPI_COPY.selection.emptyTemplates}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;
  const counterClass = `kpi-counter${atCap ? ' at-cap' : ''}`;
  const counterText = atCap
    ? KPI_COPY.selection.counterAtCap
    : KPI_COPY.selection.counterLabel(selectedChoiceIds.length);

  return (
    <div className="app-shell">
      <div className="container">
        <AnimatePresence mode="wait">
          {view === 'selection' && (
            <motion.div key="selection" className="screen" {...motionProps}>
              <div className="nav-row" style={{ marginBottom: 12 }}>
                <Link to={`/hub/${partner}`} className="btn-ghost">
                  {'\u2190'} Back to Hub
                </Link>
              </div>
              <div className="eyebrow">{KPI_COPY.selection.eyebrow}</div>
              <div className="screen-header">
                <h2>{KPI_COPY.selection.heading}</h2>
              </div>
              <p>{KPI_COPY.selection.subtext}</p>

              {/* Mandatory KPIs — non-interactive */}
              <div className="eyebrow" style={{ marginTop: 24 }}>{KPI_COPY.selection.mandatoryEyebrow}</div>
              <p className="muted" style={{ marginBottom: 16 }}>{KPI_COPY.selection.mandatorySublabel}</p>
              <div className="kpi-mandatory-section">
                {mandatoryTemplates.map((tpl) => (
                  <div key={tpl.id} className="kpi-mandatory-item">
                    <div className="kpi-mandatory-item-label">
                      {tpl.label}
                      <span className="kpi-core-badge">Core</span>
                    </div>
                    {tpl.measure && (
                      <div className="kpi-mandatory-item-measure">{tpl.measure}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Choice KPIs — interactive, cap 2 */}
              <div className="eyebrow" style={{ marginTop: 32 }}>{KPI_COPY.selection.choiceEyebrow}</div>
              <div className={counterClass}>
                <span>{counterText}</span>
              </div>
              <div className="kpi-list">
                {choiceTemplates.map((tpl) => {
                  const isSelected = selectedChoiceIds.includes(tpl.id);
                  const isCapped = atCap && !isSelected;
                  const cardClass =
                    'kpi-card' +
                    (isSelected ? ' selected' : '') +
                    (isCapped ? ' capped' : '');
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      className={cardClass}
                      onClick={() => toggleKpi(tpl.id)}
                    >
                      <span className="kpi-category-tag">
                        {CATEGORY_LABELS[tpl.category] || tpl.category}
                      </span>
                      <span className="kpi-card-label">{tpl.label}</span>
                      {tpl.measure && (
                        <span className="kpi-card-description">{tpl.measure}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Growth Priorities */}
              <div className="growth-priority-section">
                <div className="eyebrow">{KPI_COPY.selection.growth.eyebrow}</div>
                <div className="screen-header">
                  <h2>{KPI_COPY.selection.growth.heading}</h2>
                </div>

                {/* Mandatory personal — read-only */}
                {mandatoryPersonalTemplate && (
                  <div className="growth-priority-group">
                    <span className="growth-priority-group-label">
                      {KPI_COPY.selection.growth.mandatoryPersonalLabel}
                    </span>
                    <div className="kpi-mandatory-item">
                      <div className="kpi-mandatory-item-label">
                        {mandatoryPersonalTemplate.description}
                        <span className="kpi-core-badge">Core</span>
                      </div>
                      {mandatoryPersonalTemplate.measure && (
                        <div className="kpi-mandatory-item-measure">
                          {mandatoryPersonalTemplate.measure}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Self-chosen personal — two text inputs */}
                <div className="growth-priority-group">
                  <span className="growth-priority-group-label">
                    {KPI_COPY.selection.growth.selfChosenHeading}
                  </span>
                  <div className="growth-self-chosen-group">
                    <label className="scorecard-reflection-label">Title</label>
                    <input
                      type="text"
                      className="textarea"
                      value={selfChosenTitle}
                      onChange={(e) => setSelfChosenTitle(e.target.value)}
                      placeholder={KPI_COPY.selection.growth.selfChosenTitlePlaceholder}
                    />
                    <label className="scorecard-reflection-label">Measure</label>
                    <input
                      type="text"
                      className="textarea"
                      value={selfChosenMeasure}
                      onChange={(e) => setSelfChosenMeasure(e.target.value)}
                      placeholder={KPI_COPY.selection.growth.selfChosenMeasurePlaceholder}
                    />
                  </div>
                </div>

                {/* Business growth — read-only display */}
                <div className="growth-priority-group">
                  <span className="growth-priority-group-label">
                    {KPI_COPY.selection.growth.businessLabel1}
                  </span>
                  {businessPriorities.length === 0 ? (
                    <p className="muted">{KPI_COPY.selection.growth.businessEmptyState}</p>
                  ) : (
                    businessPriorities.map((p) => (
                      <div
                        key={p.id}
                        className="kpi-mandatory-item"
                        style={{ borderLeftColor: 'var(--border)' }}
                      >
                        <div className="kpi-mandatory-item-label">{p.description}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="nav-row">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canContinue}
                  onClick={continueToConfirmation}
                >
                  {KPI_COPY.selection.primaryCta}
                </button>
              </div>
              {submitError && <p className="error">{submitError}</p>}
            </motion.div>
          )}

          {view === 'confirmation' && (
            <motion.div
              key="confirmation"
              className="screen kpi-confirmation-screen"
              {...motionProps}
            >
              <div className="eyebrow">{KPI_COPY.confirmation.eyebrow}</div>
              <div className="screen-header">
                <h2>{KPI_COPY.confirmation.heading}</h2>
              </div>

              <div className="kpi-locked-notice">
                {KPI_COPY.confirmation.commitmentStatement}
              </div>

              {/* All 7 KPIs: mandatory first, then choices */}
              <div className="summary-section">
                <h4>{KPI_COPY.confirmation.kpiSectionLabel}</h4>
                <div className="kpi-list">
                  {mandatoryTemplates.map((tpl) => (
                    <div key={tpl.id} className="kpi-card">
                      <span className="kpi-category-tag">
                        {CATEGORY_LABELS[tpl.category] || tpl.category}
                      </span>
                      <span className="kpi-card-label">
                        {tpl.label}
                        <span className="kpi-core-badge">Core</span>
                      </span>
                    </div>
                  ))}
                  {selectedChoiceIds.map((tid) => {
                    const tpl = choiceTemplates.find((t) => t.id === tid);
                    if (!tpl) return null;
                    return (
                      <div key={tpl.id} className="kpi-card">
                        <span className="kpi-category-tag">
                          {CATEGORY_LABELS[tpl.category] || tpl.category}
                        </span>
                        <span className="kpi-card-label">{tpl.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Growth priorities summary */}
              <div className="summary-section">
                <h4>{KPI_COPY.confirmation.growthSectionLabel}</h4>
                {mandatoryPersonalTemplate && (
                  <div className="growth-priority-group">
                    <span className="growth-priority-group-label">
                      {KPI_COPY.selection.growth.mandatoryPersonalLabel}
                    </span>
                    <p>{mandatoryPersonalTemplate.description}</p>
                  </div>
                )}
                <div className="growth-priority-group">
                  <span className="growth-priority-group-label">
                    {KPI_COPY.selection.growth.selfChosenHeading}
                  </span>
                  <p>
                    {selfChosenTitle.trim()} {'\u2014'} {selfChosenMeasure.trim()}
                  </p>
                </div>
                <div className="growth-priority-group">
                  <span className="growth-priority-group-label">
                    {KPI_COPY.selection.growth.businessLabel1}
                  </span>
                  {businessPriorities.length === 0 ? (
                    <p className="muted">{KPI_COPY.selection.growth.businessEmptyState}</p>
                  ) : (
                    businessPriorities.map((p) => (
                      <p key={p.id}>{p.description}</p>
                    ))
                  )}
                </div>
              </div>

              <div className="nav-row">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={backToSelection}
                  disabled={saving}
                >
                  {KPI_COPY.confirmation.backCta}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={lockIn}
                  disabled={saving}
                >
                  {KPI_COPY.confirmation.lockCta}
                </button>
              </div>
              {submitError && <p className="error">{submitError}</p>}
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div
              key="success"
              className="screen kpi-lock-success"
              {...motionProps}
            >
              <div className="kpi-lock-success-heading">
                {KPI_COPY.lockSuccess.heading}
              </div>
              <div className="kpi-lock-success-subtext">
                {KPI_COPY.lockSuccess.subtext}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
