import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { VALID_PARTNERS, PARTNER_DISPLAY, KPI_COPY } from '../data/content.js';

// Motion props shared by all three views — matches questionnaire pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

// Initial per-slot growth priority state shape
const emptySlot = { kind: null, templateId: null, customText: '' };

export default function KpiSelection() {
  const { partner } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [priorityTemplates, setPriorityTemplates] = useState([]);
  const [existingSelections, setExistingSelections] = useState([]);
  const [existingPriorities, setExistingPriorities] = useState([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [personal, setPersonal] = useState(emptySlot);
  const [business1, setBusiness1] = useState(emptySlot);
  const [business2, setBusiness2] = useState(emptySlot);
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
    // Guard 2: test partner cannot write accountability data (DB CHECK, Pitfall 3)
    if (partner === 'test') {
      navigate(`/hub/${partner}`, { replace: true });
      return;
    }

    Promise.all([
      fetchKpiTemplates(),
      fetchKpiSelections(partner),
      fetchGrowthPriorities(partner),
      fetchGrowthPriorityTemplates(),
    ])
      .then(([tpls, sels, prios, priorityTpls]) => {
        // Guard 3: already locked -> redirect to read-only view (KPI-06)
        if (sels.length > 0 && sels[0].locked_until) {
          navigate(`/kpi-view/${partner}`, { replace: true });
          return;
        }
        setTemplates(tpls);
        setPriorityTemplates(priorityTpls);
        setExistingSelections(sels);
        setExistingPriorities(prios);
        setSelectedTemplateIds(sels.map((s) => s.template_id).filter(Boolean));

        // Map existing growth priorities back to per-slot state (D-08)
        const personalRow = prios.find((p) => p.type === 'personal');
        const businessRows = prios.filter((p) => p.type === 'business');
        if (personalRow) {
          const matchTpl = priorityTpls.find((t) => t.description === personalRow.description);
          setPersonal(
            matchTpl
              ? { kind: 'template', templateId: matchTpl.id, customText: '' }
              : { kind: 'custom', templateId: null, customText: personalRow.description }
          );
        }
        if (businessRows[0]) {
          const matchTpl = priorityTpls.find((t) => t.description === businessRows[0].description);
          setBusiness1(
            matchTpl
              ? { kind: 'template', templateId: matchTpl.id, customText: '' }
              : { kind: 'custom', templateId: null, customText: businessRows[0].description }
          );
        }
        if (businessRows[1]) {
          const matchTpl = priorityTpls.find((t) => t.description === businessRows[1].description);
          setBusiness2(
            matchTpl
              ? { kind: 'template', templateId: matchTpl.id, customText: '' }
              : { kind: 'custom', templateId: null, customText: businessRows[1].description }
          );
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [partner]);

  // D-03: soft cap at 5. Tapping a capped card is a no-op.
  function toggleKpi(templateId) {
    setSelectedTemplateIds((prev) => {
      if (prev.includes(templateId)) return prev.filter((id) => id !== templateId);
      if (prev.length >= 5) return prev; // soft cap
      return [...prev, templateId];
    });
  }

  // Slot setters — map slot key to its state setter
  function slotSetter(slot) {
    if (slot === 'personal') return setPersonal;
    if (slot === 'business1') return setBusiness1;
    if (slot === 'business2') return setBusiness2;
    return () => {};
  }

  // D-10: mutually exclusive. Selecting a template clears custom.
  function selectPriorityTemplate(slot, templateId) {
    const setter = slotSetter(slot);
    setter({ kind: 'template', templateId, customText: '' });
  }

  // D-10: enabling custom clears any template selection.
  function enableCustom(slot) {
    const setter = slotSetter(slot);
    setter({ kind: 'custom', templateId: null, customText: '' });
  }

  function updateCustomText(slot, text) {
    const setter = slotSetter(slot);
    setter((prev) => ({ ...prev, kind: 'custom', templateId: null, customText: text }));
  }

  // Resolve a slot's final description text (either chosen template's text or typed custom)
  function resolveSlotDescription(slot) {
    if (slot.kind === 'template' && slot.templateId) {
      const tpl = priorityTemplates.find((t) => t.id === slot.templateId);
      return tpl ? tpl.description : '';
    }
    if (slot.kind === 'custom') return slot.customText.trim();
    return '';
  }

  const personalValid = useMemo(
    () =>
      (personal.kind === 'template' && !!personal.templateId) ||
      (personal.kind === 'custom' && personal.customText.trim().length > 0),
    [personal]
  );
  const biz1Valid = useMemo(
    () =>
      (business1.kind === 'template' && !!business1.templateId) ||
      (business1.kind === 'custom' && business1.customText.trim().length > 0),
    [business1]
  );
  const biz2Valid = useMemo(
    () =>
      (business2.kind === 'template' && !!business2.templateId) ||
      (business2.kind === 'custom' && business2.customText.trim().length > 0),
    [business2]
  );
  const allPrioritiesValid = personalValid && biz1Valid && biz2Valid;
  const atCap = selectedTemplateIds.length >= 5;
  const canContinue = selectedTemplateIds.length === 5 && allPrioritiesValid && !saving;

  // Continue: replace-all persistence (Pattern 1 / Pitfall 2)
  async function continueToConfirmation() {
    if (selectedTemplateIds.length !== 5) return;
    if (!allPrioritiesValid) return;

    setSaving(true);
    setSubmitError(null);
    try {
      // Replace-all kpi_selections: delete any existing non-locked rows first
      for (const row of existingSelections) {
        if (!row.locked_until) {
          // eslint-disable-next-line no-await-in-loop
          await deleteKpiSelection(row.id);
        }
      }
      // Write the 5 new kpi_selections (KPI-05: snapshot label + category)
      for (const tid of selectedTemplateIds) {
        const tpl = templates.find((t) => t.id === tid);
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
      // Replace-all growth_priorities: delete existing non-locked rows
      for (const row of existingPriorities) {
        if (!row.locked_until) {
          // eslint-disable-next-line no-await-in-loop
          await supabase.from('growth_priorities').delete().eq('id', row.id);
        }
      }
      // Insert the 3 new growth_priorities (1 personal + 2 business)
      const pDesc = resolveSlotDescription(personal);
      const b1Desc = resolveSlotDescription(business1);
      const b2Desc = resolveSlotDescription(business2);

      await upsertGrowthPriority({
        partner,
        type: 'personal',
        description: pDesc,
        status: 'active',
        locked_until: null,
      });
      await upsertGrowthPriority({
        partner,
        type: 'business',
        description: b1Desc,
        status: 'active',
        locked_until: null,
      });
      await upsertGrowthPriority({
        partner,
        type: 'business',
        description: b2Desc,
        status: 'active',
        locked_until: null,
      });

      // Refresh rows so Back -> Continue works cleanly (no duplicate inserts)
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

  // D-07: lock in, show success, auto-redirect
  async function lockIn() {
    setSaving(true);
    setSubmitError(null);
    try {
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

  // D-06: Back preserves state (it lives in component state, unchanged)
  function backToSelection() {
    setView('selection');
  }

  if (loading) return null;

  // Load-error / empty-template state
  if (loadError || templates.length === 0) {
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
    : KPI_COPY.selection.counterLabel(selectedTemplateIds.length);

  const personalTemplates = priorityTemplates.filter((t) => t.type === 'personal');
  const businessTemplates = priorityTemplates.filter((t) => t.type === 'business');

  // Helper to render a single growth priority slot (D-08 / D-10)
  function renderSlot(slot, slotKey, label, templatesList, placeholder) {
    return (
      <div className="growth-priority-group">
        <span className="growth-priority-group-label">{label}</span>
        {templatesList.map((tpl) => {
          const isSel = slot.kind === 'template' && slot.templateId === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              className={`growth-priority-option${isSel ? ' selected' : ''}`}
              onClick={() => selectPriorityTemplate(slotKey, tpl.id)}
            >
              {tpl.description}
            </button>
          );
        })}
        <button
          type="button"
          className={`growth-priority-option${slot.kind === 'custom' ? ' selected' : ''}`}
          onClick={() => enableCustom(slotKey)}
        >
          {KPI_COPY.selection.growth.customToggle}
        </button>
        {slot.kind === 'custom' && (
          <textarea
            value={slot.customText}
            placeholder={placeholder}
            onChange={(e) => updateCustomText(slotKey, e.target.value)}
            rows={3}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="container">
        <AnimatePresence mode="wait">
          {view === 'selection' && (
            <motion.div key="selection" className="screen" {...motionProps}>
              <div className="eyebrow">{KPI_COPY.selection.eyebrow}</div>
              <div className="screen-header">
                <h2>{KPI_COPY.selection.heading}</h2>
              </div>
              <p>{KPI_COPY.selection.subtext}</p>

              <div className={counterClass}>
                <span>{counterText}</span>
              </div>

              <div className="kpi-list">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplateIds.includes(tpl.id);
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
                      <span className="kpi-category-tag">{tpl.category}</span>
                      <span className="kpi-card-label">{tpl.label}</span>
                      {tpl.description && (
                        <span className="kpi-card-description">{tpl.description}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="growth-priority-section">
                <div className="eyebrow">{KPI_COPY.selection.growth.eyebrow}</div>
                <div className="screen-header">
                  <h2>{KPI_COPY.selection.growth.heading}</h2>
                </div>
                <p>{KPI_COPY.selection.growth.subtext}</p>

                {renderSlot(
                  personal,
                  'personal',
                  KPI_COPY.selection.growth.personalLabel,
                  personalTemplates,
                  KPI_COPY.selection.growth.customPlaceholderPersonal
                )}
                {renderSlot(
                  business1,
                  'business1',
                  KPI_COPY.selection.growth.businessLabel1,
                  businessTemplates,
                  KPI_COPY.selection.growth.customPlaceholderBusiness
                )}
                {renderSlot(
                  business2,
                  'business2',
                  KPI_COPY.selection.growth.businessLabel2,
                  businessTemplates,
                  KPI_COPY.selection.growth.customPlaceholderBusiness
                )}
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

              <div className="summary-section">
                <h4>{KPI_COPY.confirmation.kpiSectionLabel}</h4>
                <div className="kpi-list">
                  {selectedTemplateIds.map((tid) => {
                    const tpl = templates.find((t) => t.id === tid);
                    if (!tpl) return null;
                    return (
                      <div key={tpl.id} className="kpi-card">
                        <span className="kpi-category-tag">{tpl.category}</span>
                        <span className="kpi-card-label">{tpl.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="summary-section">
                <h4>{KPI_COPY.confirmation.growthSectionLabel}</h4>
                <div className="growth-priority-group">
                  <span className="growth-priority-group-label">
                    {KPI_COPY.selection.growth.personalLabel}
                  </span>
                  <p>{resolveSlotDescription(personal)}</p>
                </div>
                <div className="growth-priority-group">
                  <span className="growth-priority-group-label">
                    {KPI_COPY.selection.growth.businessLabel1}
                  </span>
                  <p>{resolveSlotDescription(business1)}</p>
                </div>
                <div className="growth-priority-group">
                  <span className="growth-priority-group-label">
                    {KPI_COPY.selection.growth.businessLabel2}
                  </span>
                  <p>{resolveSlotDescription(business2)}</p>
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
