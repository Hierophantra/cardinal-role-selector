import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiTemplates,
  fetchPreviousWeeklyKpiSelection,
  fetchWeeklyKpiSelection,
  upsertWeeklyKpiSelection,
  BackToBackKpiError,
} from '../lib/supabase.js';
import { getMondayOf } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, WEEKLY_KPI_COPY, CATEGORY_LABELS } from '../data/content.js';

// Motion props shared by all three views — matches questionnaire + KpiSelection pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

export default function WeeklyKpiSelectionFlow() {
  const { partner } = useParams();
  const navigate = useNavigate();

  // All hooks declared before any early return (Phase 15 P-U2)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [previousSel, setPreviousSel] = useState(null);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [view, setView] = useState('selection'); // 'selection' | 'confirmation' | 'success'
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState(null);

  // Week anchor — LOCAL time via getMondayOf (Pitfall 3)
  const currentMonday = getMondayOf();

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }

    Promise.all([
      fetchKpiTemplates(),
      fetchPreviousWeeklyKpiSelection(partner, currentMonday),
      fetchWeeklyKpiSelection(partner, currentMonday),
    ])
      .then(([tpls, prev, cur]) => {
        if (cur && cur.kpi_template_id) {
          navigate(`/hub/${partner}`, { replace: true });
          return;
        }
        setTemplates(tpls);
        setPreviousSel(prev);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [partner]);

  // Derived values (inline — no hook dependency on these)
  const optionalPool = templates.filter(
    (t) =>
      (t.partner_scope === partner ||
        t.partner_scope === 'both' ||
        t.partner_scope === 'shared') &&
      t.mandatory === false &&
      t.conditional === false
  );
  const previousTemplateId = previousSel?.kpi_template_id ?? null;

  async function handleConfirm() {
    if (!selectedTpl || saving) return;
    setSaving(true);
    setInlineError(null);
    try {
      await upsertWeeklyKpiSelection(
        partner,
        currentMonday,
        selectedTpl.id,
        selectedTpl.baseline_action
      );
      setView('success');
    } catch (err) {
      if (err instanceof BackToBackKpiError) {
        setInlineError(WEEKLY_KPI_COPY.errorBackToBack);
        setView('selection');
        return;
      }
      console.error(err);
      setInlineError(WEEKLY_KPI_COPY.errorGeneric);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  if (loadError) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="screen fade-in">
            <div className="eyebrow">{WEEKLY_KPI_COPY.selection.eyebrow}</div>
            <div className="screen-header">
              <h2>{WEEKLY_KPI_COPY.selection.heading}</h2>
            </div>
            <p className="error">{WEEKLY_KPI_COPY.errorGeneric}</p>
            <div className="nav-row">
              <Link to={`/hub/${partner}`} className="btn-ghost">
                {'\u2190'} Back to Hub
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;

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
              <div className="eyebrow">{WEEKLY_KPI_COPY.selection.eyebrow}</div>
              <div className="screen-header">
                <h2>{WEEKLY_KPI_COPY.selection.heading}</h2>
              </div>
              <p className="weekly-selection-subtext">
                {WEEKLY_KPI_COPY.selection.subtext}
              </p>

              {optionalPool.length === 0 ? (
                <p className="muted">{WEEKLY_KPI_COPY.selection.emptyPool}</p>
              ) : (
                <div className="kpi-list">
                  {optionalPool.map((tpl) => {
                    const isPrev = previousTemplateId === tpl.id;
                    const isSelected = selectedTpl?.id === tpl.id;
                    const cardClass =
                      'kpi-card' +
                      (isSelected ? ' selected' : '') +
                      (isPrev ? ' capped' : '');
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        className={cardClass}
                        disabled={isPrev}
                        onClick={() => !isPrev && setSelectedTpl(tpl)}
                      >
                        <span className="kpi-category-tag">
                          {CATEGORY_LABELS[tpl.category] || tpl.category}
                        </span>
                        <span className="kpi-card-label">{tpl.baseline_action}</span>
                        {isPrev && (
                          <span className="weekly-kpi-disabled-label">
                            {WEEKLY_KPI_COPY.selection.disabledLabel}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {inlineError && (
                <p className="weekly-selection-error">{inlineError}</p>
              )}

              <div className="nav-row">
                <Link to={`/hub/${partner}`} className="btn-ghost">
                  {'\u2190'} Back to Hub
                </Link>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!selectedTpl}
                  onClick={() => {
                    setInlineError(null);
                    setView('confirmation');
                  }}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {view === 'confirmation' && selectedTpl && (
            <motion.div key="confirmation" className="screen" {...motionProps}>
              <div className="scorecard-commit-gate">
                <h3>
                  {WEEKLY_KPI_COPY.confirmation.headingTemplate(
                    selectedTpl.baseline_action
                  )}
                </h3>
                <p className="muted">{WEEKLY_KPI_COPY.confirmation.body}</p>
                <div className="nav-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setView('selection')}
                    disabled={saving}
                  >
                    {WEEKLY_KPI_COPY.confirmation.backCta}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleConfirm}
                    disabled={saving}
                  >
                    {WEEKLY_KPI_COPY.confirmation.confirmCta}
                  </button>
                </div>
                {inlineError && (
                  <p className="weekly-selection-error">{inlineError}</p>
                )}
              </div>
            </motion.div>
          )}

          {view === 'success' && selectedTpl && (
            <motion.div key="success" className="screen" {...motionProps}>
              <div className="screen-header">
                <h2>{WEEKLY_KPI_COPY.success.heading}</h2>
              </div>
              <p className="weekly-selection-subtext">
                {WEEKLY_KPI_COPY.success.subtextTemplate(selectedTpl.baseline_action)}
              </p>
              <div className="nav-row">
                <Link to={`/hub/${partner}`} className="btn-ghost">
                  {WEEKLY_KPI_COPY.success.cta}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
