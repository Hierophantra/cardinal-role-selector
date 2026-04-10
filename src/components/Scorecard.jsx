import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchKpiSelections,
  fetchScorecards,
  upsertScorecard,
  commitScorecardWeek,
} from '../lib/supabase.js';
import { getMondayOf, getSundayEndOf, isWeekClosed, formatWeekRange } from '../lib/week.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, SCORECARD_COPY } from '../data/content.js';

// Motion props shared by all three views — matches KpiSelection.jsx pattern
const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

export default function Scorecard() {
  const { partner } = useParams();
  const navigate = useNavigate();

  // Data/loading state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lockedKpis, setLockedKpis] = useState([]);         // 5 kpi_selections rows (with label_snapshot)
  const [allScorecards, setAllScorecards] = useState([]);   // from fetchScorecards, newest first

  // View state
  const [view, setView] = useState('precommit');            // 'precommit' | 'editing' | 'success'

  // Precommit/commit action state
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);

  // Editing / current week working state
  const [kpiResults, setKpiResults] = useState({});         // { [kpi_selection_id]: { result, reflection } }
  const [committedAt, setCommittedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedVisible, setSavedVisible] = useState(false);  // controls .scorecard-saved.visible class

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // History UI state
  const [expandedHistoryWeek, setExpandedHistoryWeek] = useState(null);

  // Stable week anchor — computed once per mount (edge case 3 in RESEARCH.md)
  const currentWeekOfRef = useRef(getMondayOf());
  const currentWeekOf = currentWeekOfRef.current;

  // Debounce timer refs for saved indicator
  const savedTimerRef = useRef(null);
  const savedFadeRef = useRef(null);

  // ---- Mount guards + data fetch ----
  useEffect(() => {
    // Guard 1: invalid partner slug
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    // Guard 2: 'test' partner cannot write accountability data (DB CHECK constraint)
    if (partner === 'test') {
      navigate(`/hub/${partner}`, { replace: true });
      return;
    }

    Promise.all([fetchKpiSelections(partner), fetchScorecards(partner)])
      .then(([sels, scorecards]) => {
        // Guard 3: KPIs not locked yet → hub (D-18)
        if (sels.length === 0 || !sels[0]?.locked_until) {
          navigate(`/hub/${partner}`, { replace: true });
          return;
        }
        setLockedKpis(sels);
        setAllScorecards(scorecards);

        // Hydrate current-week state if a row exists and was committed
        const thisWeekRow = scorecards.find((s) => s.week_of === currentWeekOf);
        if (thisWeekRow?.committed_at) {
          setView('editing');
          setKpiResults(thisWeekRow.kpi_results || {});
          setCommittedAt(thisWeekRow.committed_at);
        } else {
          setView('precommit');
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));

    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
    };
  }, [partner]);

  // ---- Derived values ----
  const weekClosed = useMemo(() => isWeekClosed(currentWeekOf), [currentWeekOf]);

  const answeredCount = useMemo(
    () =>
      lockedKpis.reduce((n, k) => {
        const r = kpiResults[k.id]?.result;
        return r === 'yes' || r === 'no' ? n + 1 : n;
      }, 0),
    [lockedKpis, kpiResults]
  );

  const allAnsweredWithReflection = useMemo(
    () =>
      lockedKpis.length > 0 &&
      lockedKpis.every((k) => {
        const r = kpiResults[k.id];
        return r && (r.result === 'yes' || r.result === 'no') && r.reflection?.trim().length > 0;
      }),
    [lockedKpis, kpiResults]
  );

  const historyRows = useMemo(
    () => allScorecards.filter((s) => s.week_of !== currentWeekOf),
    [allScorecards, currentWeekOf]
  );

  // ---- Handlers ----

  async function handleCommit() {
    if (committing) return;
    setCommitting(true);
    setCommitError(null);
    try {
      const row = await commitScorecardWeek(
        partner,
        currentWeekOf,
        lockedKpis.map((k) => k.id)
      );
      setKpiResults(row.kpi_results || {});
      setCommittedAt(row.committed_at);
      // Refresh allScorecards so the current row is reflected
      setAllScorecards((prev) => {
        const without = prev.filter((s) => s.week_of !== row.week_of);
        return [row, ...without].sort((a, b) => b.week_of.localeCompare(a.week_of));
      });
      setView('editing');
    } catch (err) {
      console.error(err);
      setCommitError(SCORECARD_COPY.errorCommit);
    } finally {
      setCommitting(false);
    }
  }

  // (Auto-save + submit handlers added in Task 2)
  // (History row toggle added in Task 3)

  // ---- Early returns ----
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

  const partnerName = PARTNER_DISPLAY[partner] ?? partner;

  // ---- Render ----
  return (
    <div className="app-shell">
      <div className="container">
        <AnimatePresence mode="wait">
          {view === 'precommit' && (
            <motion.div key="precommit" className="screen" {...motionProps}>
              <div className="eyebrow">{SCORECARD_COPY.eyebrow}</div>
              <div className="screen-header">
                <h2>{SCORECARD_COPY.headingPreCommit}</h2>
                <p className="subtext">{SCORECARD_COPY.subtextPreCommit}</p>
              </div>

              <div className="scorecard-commit-gate">
                <ol
                  className="scorecard-kpi-preview-list"
                  style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  {lockedKpis.map((k) => (
                    <li key={k.id} className="scorecard-kpi-preview">{k.label_snapshot}</li>
                  ))}
                </ol>
                <div className="nav-row">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleCommit}
                    disabled={committing}
                  >
                    {committing ? SCORECARD_COPY.committingCta : SCORECARD_COPY.commitCta}
                  </button>
                </div>
                {commitError && (
                  <p className="muted" style={{ color: 'var(--red)', marginTop: 8 }}>{commitError}</p>
                )}
              </div>

              {/* History section rendered by Task 3 (below divider, inside this motion.div) */}
              {/* __HISTORY_SECTION__ */}
            </motion.div>
          )}

          {view === 'editing' && (
            <motion.div key="editing" className="screen" {...motionProps}>
              {/* Task 2 fills in: meta row, 5 KPI rows, closed banner, submit row */}
              {/* __EDITING_BODY__ */}
              {/* __HISTORY_SECTION__ */}
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div key="success" className="screen kpi-lock-success" {...motionProps}>
              {/* Task 2 fills in: success heading + auto-redirect */}
              {/* __SUCCESS_BODY__ */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
