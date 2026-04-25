import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchMeeting,
  fetchMeetingNotes,
  upsertMeetingNote,
  endMeeting,
  adminOverrideScorecardEntry,
  fetchGrowthPriorities,
  fetchScorecard,
  fetchBusinessPriorities,
} from '../../lib/supabase.js';
import { formatWeekRange, effectiveResult } from '../../lib/week.js';
import { composePartnerKpis } from '../../lib/partnerKpis.js';
import {
  MEETING_COPY,
  MONDAY_PREP_COPY,
  FRIDAY_STOPS,
  MONDAY_STOPS,
  KPI_STOP_COUNT,
  GROWTH_STATUS_COPY,
  PARTNER_DISPLAY,
  SCORECARD_COPY,
  BUSINESS_GROWTH_STOP_MAPPING,
} from '../../data/content.js';

// Stop arrays are now imported from content.js (FRIDAY_STOPS, MONDAY_STOPS).
// The active stop array is derived from meeting.meeting_type inside the component.

// KPI_START_INDEX: position of kpi_1 in FRIDAY_STOPS.
// Derived from FRIDAY_STOPS so this stays correct even when the array is reordered
// (Phase 17 inserts 'kpi_review_optional' at index 1, shifting kpi_1 to index 3).
const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1');

const PARTNERS = ['theo', 'jerry'];
const DEBOUNCE_MS = 400;
const END_DISARM_MS = 3000;

// Pattern 6: render-time label fallback for kpi_results (D-06).
// The JSONB kpi_results entry may be missing a snapshotted label (older Phase 3 rows).
// Falls back to the locked KPI row's label_snapshot, then to a placeholder.
function getLabelForEntry(kpiId, entry, lockedKpis) {
  if (entry && entry.label) return entry.label;
  const match = lockedKpis.find((k) => k.id === kpiId);
  return match?.label_snapshot ?? '(unknown KPI)';
}

// Phase 17 Wave 3: derive the previous week's Monday from a current Monday string,
// using local-time arithmetic (no UTC ISO slicing) to honor the week-identity convention
// established in src/lib/week.js. Used by the Monday-prep meeting load to fetch last
// week's scorecards for SaturdayRecapStop.
function previousMondayOf(currentMondayStr) {
  const [y, m, d] = currentMondayStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 7);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Slide transition for stop swaps — directional based on Prev/Next.
// Matches existing Framer Motion convention; slightly faster (0.22s) for meeting pace.
function motionProps(dir) {
  return {
    initial: { opacity: 0, x: dir * 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir * -24 },
    transition: { duration: 0.22, ease: 'easeOut' },
  };
}

export default function AdminMeetingSession() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --- State ---
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stopIndex, setStopIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [notes, setNotes] = useState({}); // { [stopKey]: body }
  const [savedFlash, setSavedFlash] = useState(null); // stopKey currently flashing "Saved"
  const [data, setData] = useState({
    theo: { kpis: [], growth: [], scorecard: null },
    jerry: { kpis: [], growth: [], scorecard: null },
    lastWeekScorecards: [],
    businessPriorities: [],
  });
  const [endPending, setEndPending] = useState(false);
  const [ending, setEnding] = useState(false);
  // UAT B5/B6: confirm dialog state for the last-stop "Complete Meeting" CTA.
  // Distinct from endPending (header End Meeting two-click arm) so the two paths
  // do not interfere; the bottom-right Complete Meeting button opens a modal-style
  // confirm card and only fires endMeeting on the explicit Confirm click.
  const [completePending, setCompletePending] = useState(false);
  const [completing, setCompleting] = useState(false);

  // --- Refs ---
  const debounceRef = useRef(null); // note-save debounce timer
  const reflectionDebounceRef = useRef({}); // per-cell reflection debounce timers, keyed by `${partner}:${kpiId}`
  const endDisarmRef = useRef(null); // auto-disarm timer for two-click End Meeting
  const savedFlashTimerRef = useRef(null);

  // --- Load flow ---
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const m = await fetchMeeting(id);
        if (!alive) return;
        if (!m) {
          setError(MEETING_COPY.errors.loadFail);
          setLoading(false);
          return;
        }
        setMeeting(m);

        const prevMonday = previousMondayOf(m.week_of);
        const [
          theoKpis,
          jerryKpis,
          theoGrowth,
          jerryGrowth,
          theoScorecard,
          jerryScorecard,
          theoPrevScorecard,
          jerryPrevScorecard,
          noteRows,
          bizPriorities,
        ] = await Promise.all([
          // UAT A3/A7/A8: compose template-id-keyed 7-row KPI list (Scorecard.jsx parity).
          composePartnerKpis('theo', m.week_of),
          composePartnerKpis('jerry', m.week_of),
          fetchGrowthPriorities('theo'),
          fetchGrowthPriorities('jerry'),
          fetchScorecard('theo', m.week_of),
          fetchScorecard('jerry', m.week_of),
          // Phase 17 Wave 3: load last-week scorecards so SaturdayRecapStop can render
          // per-row conversion cards on Monday-prep meetings. Flat array on data; the
          // SaturdayRecapStop renderer iterates and reads { partner, week_of, kpi_results }.
          fetchScorecard('theo', prevMonday),
          fetchScorecard('jerry', prevMonday),
          fetchMeetingNotes(id),
          fetchBusinessPriorities(),
        ]);
        if (!alive) return;

        const lastWeekScorecards = [theoPrevScorecard, jerryPrevScorecard].filter(Boolean);

        setData({
          theo: {
            kpis: theoKpis ?? [],
            growth: theoGrowth ?? [],
            scorecard: theoScorecard ?? null,
          },
          jerry: {
            kpis: jerryKpis ?? [],
            growth: jerryGrowth ?? [],
            scorecard: jerryScorecard ?? null,
          },
          lastWeekScorecards,
          businessPriorities: bizPriorities ?? [],
        });

        // Seed note drafts from any existing meeting_notes rows
        const seeded = {};
        for (const row of noteRows ?? []) {
          seeded[row.agenda_stop_key] = row.body ?? '';
        }
        setNotes(seeded);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setError(MEETING_COPY.errors.loadFail);
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  // Clean up pending timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (endDisarmRef.current) clearTimeout(endDisarmRef.current);
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
      const refMap = reflectionDebounceRef.current;
      for (const key of Object.keys(refMap)) {
        if (refMap[key]) clearTimeout(refMap[key]);
      }
    };
  }, []);

  // --- Derived meeting state ---
  // Select stop array and copy object based on meeting type.
  const stops = useMemo(
    () => (meeting?.meeting_type === 'monday_prep' ? MONDAY_STOPS : FRIDAY_STOPS),
    [meeting]
  );
  const copy = useMemo(
    () => (meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY),
    [meeting]
  );

  // --- Navigation ---
  const goNext = useCallback(() => {
    setDirection(1);
    setStopIndex((i) => {
      const currentKey = stops[i];
      // Phase 17 D-10: when leaving the kpi_review_optional gate stop with the 'skip'
      // choice persisted, jump past every kpi_* stop to 'growth_personal'. handleNoteChange
      // calls setNotes synchronously before the debounced upsert, so notes['kpi_review_optional']
      // already reflects the user's choice by the time goNext fires.
      if (currentKey === 'kpi_review_optional' && notes['kpi_review_optional'] === 'skip') {
        const target = stops.indexOf('growth_personal');
        if (target >= 0) return target;
      }
      return Math.min(i + 1, stops.length - 1);
    });
  }, [stops, notes]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setStopIndex((i) => Math.max(i - 1, 0));
  }, []);

  // --- Note auto-save (Pattern 2: debounced upsert) ---
  const handleNoteChange = useCallback(
    (stopKey, text) => {
      setNotes((n) => ({ ...n, [stopKey]: text }));
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await upsertMeetingNote({
            meeting_id: id,
            agenda_stop_key: stopKey,
            body: text,
          });
          setSavedFlash(stopKey);
          if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
          savedFlashTimerRef.current = setTimeout(() => setSavedFlash(null), 1500);
        } catch (err) {
          console.error(err);
          setError((meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY).errors.noteSaveFail);
        }
      }, DEBOUNCE_MS);
    },
    [id, meeting]
  );

  // --- Scorecard override helpers (D-15) ---
  // Refetch-and-merge keeps local scorecard in sync after admin override so the UI
  // immediately reflects the new yes/no + admin_override_at stamp without a full page reload.
  const refreshPartnerScorecard = useCallback(
    async (partner) => {
      if (!meeting) return;
      try {
        const fresh = await fetchScorecard(partner, meeting.week_of);
        setData((prev) => ({
          ...prev,
          [partner]: { ...prev[partner], scorecard: fresh ?? null },
        }));
      } catch (err) {
        console.error(err);
      }
    },
    [meeting]
  );

  const handleOverrideResult = useCallback(
    async (partner, kpiId, newResult) => {
      if (!meeting) return;
      const locked = data[partner].kpis.find((k) => k.id === kpiId);
      const labelSnapshot = locked?.label_snapshot ?? '';
      const currentEntry = data[partner].scorecard?.kpi_results?.[kpiId] ?? {};
      const reflection = currentEntry.reflection ?? '';
      try {
        await adminOverrideScorecardEntry(
          partner,
          meeting.week_of,
          kpiId,
          { result: newResult, reflection },
          labelSnapshot
        );
        await refreshPartnerScorecard(partner);
      } catch (err) {
        console.error(err);
        setError((meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY).errors.noteSaveFail);
      }
    },
    [meeting, data, refreshPartnerScorecard]
  );

  const handleReflectionChange = useCallback(
    (partner, kpiId, text) => {
      // Optimistically update local scorecard so textarea stays controlled
      setData((prev) => {
        const sc = prev[partner].scorecard ?? { kpi_results: {} };
        const prior = sc.kpi_results?.[kpiId] ?? { result: null, reflection: '' };
        const merged = {
          ...sc,
          kpi_results: {
            ...(sc.kpi_results ?? {}),
            [kpiId]: { ...prior, reflection: text },
          },
        };
        return {
          ...prev,
          [partner]: { ...prev[partner], scorecard: merged },
        };
      });

      const key = `${partner}:${kpiId}`;
      if (reflectionDebounceRef.current[key]) {
        clearTimeout(reflectionDebounceRef.current[key]);
      }
      reflectionDebounceRef.current[key] = setTimeout(async () => {
        if (!meeting) return;
        const locked = data[partner].kpis.find((k) => k.id === kpiId);
        const labelSnapshot = locked?.label_snapshot ?? '';
        const existing =
          data[partner].scorecard?.kpi_results?.[kpiId] ?? { result: null };
        try {
          await adminOverrideScorecardEntry(
            partner,
            meeting.week_of,
            kpiId,
            { result: existing.result ?? null, reflection: text },
            labelSnapshot
          );
          await refreshPartnerScorecard(partner);
        } catch (err) {
          console.error(err);
          setError((meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY).errors.noteSaveFail);
        }
      }, DEBOUNCE_MS);
    },
    [meeting, data, refreshPartnerScorecard]
  );

  // --- Complete Meeting (UAT B5/B6) ---
  // Last-stop "Complete Meeting" flow: opens a confirm panel; the Confirm button
  // calls endMeeting (stamps ended_at) then navigates to the partner-facing
  // MeetingSummary. Notes are already auto-saved per stop, so the only side
  // effect of confirm is the ended_at stamp + redirect.
  const handleCompleteClick = useCallback(() => {
    if (completing || ending) return;
    setCompletePending(true);
  }, [completing, ending]);

  const handleCompleteCancel = useCallback(() => {
    setCompletePending(false);
  }, []);

  const handleCompleteConfirm = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await endMeeting(id);
      // Navigate to MeetingSummary. The route is partner-scoped; admin views
      // the same summary surface as the partner does. 'theo' is a stable
      // anchor here -- both partners' KPI/growth blocks are rendered inside
      // the same summary regardless of :partner once Batch B3/B4 land.
      navigate(`/meeting-summary/theo/${id}`);
    } catch (err) {
      console.error(err);
      setError((meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY).errors.loadFail);
      setCompleting(false);
      setCompletePending(false);
    }
  }, [completing, id, navigate, meeting]);

  // --- End Meeting (two-click arm/confirm) ---
  const handleEndClick = useCallback(async () => {
    if (ending) return;
    if (!endPending) {
      setEndPending(true);
      if (endDisarmRef.current) clearTimeout(endDisarmRef.current);
      endDisarmRef.current = setTimeout(() => setEndPending(false), END_DISARM_MS);
      return;
    }
    // Confirm
    if (endDisarmRef.current) clearTimeout(endDisarmRef.current);
    setEnding(true);
    try {
      await endMeeting(id);
      navigate('/admin/meeting');
    } catch (err) {
      console.error(err);
      setError((meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY).errors.loadFail);
      setEnding(false);
      setEndPending(false);
    }
  }, [ending, endPending, id, navigate, meeting]);

  // --- Early returns for loading / error ---
  if (loading) {
    return (
      <div className="meeting-shell">
        <div className="meeting-stop">
          <p className="muted">Loading meeting{'\u2026'}</p>
        </div>
      </div>
    );
  }

  if (!meeting || error) {
    return (
      <div className="meeting-shell">
        <div className="meeting-stop">
          <p className="muted" style={{ color: 'var(--red)' }}>
            {error || MEETING_COPY.errors.loadFail}
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate('/admin/meeting')}
            style={{ marginTop: 16 }}
          >
            {MEETING_COPY.endedNav}
          </button>
        </div>
      </div>
    );
  }

  const isEnded = Boolean(meeting.ended_at);
  const currentStopKey = stops[stopIndex];
  const weekLabel = formatWeekRange(meeting.week_of);

  return (
    <div className={`meeting-shell${meeting.meeting_type === 'monday_prep' ? ' meeting-shell--monday' : ''}`}>
      {/* === Header === */}
      <div className="meeting-shell-header">
        <div className="meeting-progress-pill">
          {copy.progressPill(stopIndex + 1, stops.length)}
        </div>
        <div
          className="muted"
          style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}
        >
          {weekLabel}
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleEndClick}
          disabled={ending}
          style={
            endPending
              ? {
                  background: 'rgba(196,30,58,0.14)',
                  borderColor: 'var(--red)',
                  color: 'var(--text)',
                }
              : undefined
          }
        >
          {ending
            ? `Ending${'\u2026'}`
            : endPending
              ? copy.endConfirmBtn
              : copy.endBtn}
        </button>
      </div>

      {isEnded && (
        <div style={{ textAlign: 'center', padding: '8px 40px', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
          Ended {new Date(meeting.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {/* === Stop body === */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStopKey}
          className="meeting-stop"
          {...motionProps(direction)}
        >
          <StopRenderer
            stopKey={currentStopKey}
            stopIndex={stopIndex}
            meeting={meeting}
            data={data}
            notes={notes}
            savedFlash={savedFlash}
            onNoteChange={handleNoteChange}
            onOverrideResult={handleOverrideResult}
            onReflectionChange={handleReflectionChange}
            copy={copy}
            isEnded={isEnded}
          />
        </motion.div>
      </AnimatePresence>

      {/* === Nav bar === */}
      <div className="meeting-nav">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={goPrev}
          disabled={stopIndex === 0}
        >
          {'\u2190'} Prev
        </button>
        <div
          className="muted"
          style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          {currentStopKey.replace(/_/g, ' ')}
        </div>
        {stopIndex === stops.length - 1 ? (
          // UAT B5/B6: last-stop CTA flips to "Complete Meeting" (both meeting
          // types). Confirm dialog renders below the nav bar; until confirmed,
          // ended_at is not stamped and the meeting can still be edited.
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCompleteClick}
            disabled={isEnded || completing || ending}
          >
            {copy.completeMeetingCta}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={goNext}
          >
            Next {'\u2192'}
          </button>
        )}
      </div>

      {completePending && (
        <div
          className="meeting-complete-confirm"
          style={{
            margin: '16px auto 0',
            maxWidth: 560,
            padding: 20,
            border: '1px solid var(--border, #2a2a2a)',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {copy.completeConfirmEyebrow}
          </div>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            {copy.completeConfirmBody}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCompleteCancel}
              disabled={completing}
            >
              {copy.completeConfirmCancelCta}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCompleteConfirm}
              disabled={completing}
            >
              {completing ? copy.completeConfirmEndingCta : copy.completeConfirmCta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Stop renderer — dispatches on stopKey
// --------------------------------------------------------------------------

function StopRenderer({
  stopKey,
  stopIndex,
  meeting,
  data,
  notes,
  savedFlash,
  onNoteChange,
  onOverrideResult,
  onReflectionChange,
  copy,
  isEnded,
}) {
  if (stopKey === 'clear_the_air') {
    return (
      <ClearTheAirStop
        meeting={meeting}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'kpi_review_optional') {
    return (
      <KpiReviewOptionalStop
        meeting={meeting}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'saturday_recap') {
    return (
      <SaturdayRecapStop
        meeting={meeting}
        lastWeekScorecards={data?.lastWeekScorecards ?? []}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'week_preview') {
    return (
      <WeekPreviewStop
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'priorities_focus') {
    return (
      <PrioritiesFocusStop
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'risks_blockers') {
    return (
      <RisksBlockersStop
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'growth_checkin') {
    return (
      <GrowthCheckinStop
        data={data}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'commitments') {
    return (
      <CommitmentsStop
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'intro') {
    return (
      <IntroStop
        meeting={meeting}
        data={data}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (/^kpi_\d+$/.test(stopKey)) {
    // KPI_START_INDEX derives via FRIDAY_STOPS.indexOf('kpi_1') — currently 3 (clear_the_air=0, kpi_review_optional=1, intro=2, kpi_1=3)
    // Note: regex restricts this branch to numbered kpi_* stops; 'kpi_review_optional' (Wave 3 renderer pending) does NOT match.
    const kpiIndex = stopIndex - KPI_START_INDEX;
    return (
      <KpiStop
        kpiIndex={kpiIndex}
        stopKey={stopKey}
        data={data}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        onOverrideResult={onOverrideResult}
        onReflectionChange={onReflectionChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'growth_personal') {
    return (
      <GrowthStop
        stopKey={stopKey}
        kind="personal"
        ordinal={1}
        data={data}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'growth_business_1') {
    return (
      <GrowthStop
        stopKey={stopKey}
        kind="business"
        ordinal={1}
        data={data}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'growth_business_2') {
    return (
      <GrowthStop
        stopKey={stopKey}
        kind="business"
        ordinal={2}
        data={data}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'wrap') {
    return (
      <WrapStop
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  return null;
}

// --------------------------------------------------------------------------
// Clear the Air stop — shared by Friday Review and Monday Prep (stop 1 in both)
// --------------------------------------------------------------------------

function ClearTheAirStop({ meeting, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const isMon = meeting.meeting_type === 'monday_prep';
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">CLEAR THE AIR</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Clear the Air
      </h2>
      <p className="meeting-stop-subtext">
        {isMon
          ? 'Anything partners need to get off their chest before the week begins.'
          : 'Anything partners need to say before diving into the numbers.'}
      </p>
      <StopNotesArea
        stopKey="clear_the_air"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// KPI Review gate stop — Friday Review only (Phase 17 D-09, D-10, D-12, D-17)
// Persists 'review' | 'skip' via meeting_notes (agenda_stop_key='kpi_review_optional');
// goNext consumes the 'skip' choice to bypass kpi_* stops (see goNext above).
// On resume, renders the read-only summary line below the buttons rather than
// re-prompting (D-17). Trace can navigate back via Prev to flip the choice.
// --------------------------------------------------------------------------

function KpiReviewOptionalStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  const choice = notes['kpi_review_optional'] ?? null; // 'review' | 'skip' | null
  const isFirstVisit = choice === null;

  function chooseReview() {
    onNoteChange('kpi_review_optional', 'review');
  }
  function chooseSkip() {
    onNoteChange('kpi_review_optional', 'skip');
  }

  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">{copy.stops.kpiReviewOptionalEyebrow}</div>
      <h3 className="meeting-stop-heading">{copy.stops.kpiReviewOptionalHeading}</h3>
      <p className="meeting-stop-subtext">{copy.stops.kpiReviewOptionalSubtext}</p>

      <div className="scorecard-yn-row">
        <button
          type="button"
          className={`scorecard-yn-btn yes${choice === 'review' ? ' active' : ''}`}
          onClick={chooseReview}
          disabled={isEnded}
        >
          {copy.stops.kpiReviewOptionalYesCta}
        </button>
        <button
          type="button"
          className={`scorecard-yn-btn skip${choice === 'skip' ? ' active' : ''}`}
          onClick={chooseSkip}
          disabled={isEnded}
        >
          {copy.stops.kpiReviewOptionalSkipCta}
        </button>
      </div>

      {!isFirstVisit && (
        <p className="meeting-stop-summary muted" style={{ marginTop: 12 }}>
          {choice === 'skip'
            ? copy.stops.kpiReviewOptionalSkipSummary
            : copy.stops.kpiReviewOptionalReviewSummary}
        </p>
      )}

      <StopNotesArea
        stopKey="kpi_review_optional"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Saturday Recap stop — Monday Prep only (Phase 17 D-11, D-15, D-16)
// Reads last week's scorecards (loaded into data.lastWeekScorecards) and surfaces
// every row whose pending_text was preserved on Friday close. Conversion state
// derives from effectiveResult — 'yes' = met by Saturday, anything else = did not
// convert. When zero qualifying rows exist, renders the placeholder card per D-15.
// --------------------------------------------------------------------------

function SaturdayRecapStop({ lastWeekScorecards, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const recapRows = [];
  for (const sc of lastWeekScorecards ?? []) {
    const results = sc?.kpi_results ?? {};
    for (const [tplId, entry] of Object.entries(results)) {
      const pendingText = (entry?.pending_text ?? '').trim();
      if (!pendingText) continue;
      // entry has follow-through commitment text — was Pending at some point last week.
      const eff = effectiveResult(entry?.result, sc.week_of);
      const converted = eff === 'yes';
      recapRows.push({
        partner: sc.partner,
        tplId,
        label: entry?.label ?? '(KPI)',
        pending_text: entry.pending_text,
        converted,
      });
    }
  }

  const empty = recapRows.length === 0;

  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">{copy.stops.saturdayRecapEyebrow}</div>
      <h3 className="meeting-stop-heading">{copy.stops.saturdayRecapHeading}</h3>

      {empty ? (
        <div className="saturday-recap-empty">{copy.stops.saturdayRecapEmpty}</div>
      ) : (
        <div className="saturday-recap-list">
          {recapRows.map((row, i) => (
            <div key={`${row.partner}-${row.tplId}-${i}`} className="saturday-recap-row">
              <div
                className="saturday-recap-label"
                style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}
              >
                {PARTNER_DISPLAY[row.partner] ?? row.partner}: {row.label}
              </div>
              <div className="saturday-recap-commitment">
                {copy.stops.saturdayRecapCommitmentPrefix}{row.pending_text}
              </div>
              <div className={`saturday-recap-conversion ${row.converted ? 'met' : 'not-converted'}`}>
                {row.converted ? copy.stops.saturdayRecapMet : copy.stops.saturdayRecapNotConverted}
              </div>
            </div>
          ))}
        </div>
      )}

      <StopNotesArea
        stopKey="saturday_recap"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Monday Prep stop components
// --------------------------------------------------------------------------

function WeekPreviewStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">WEEK PREVIEW</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        What&apos;s Coming This Week
      </h2>
      <p className="meeting-stop-subtext">
        Upcoming travel, deadlines, and anything unusual on the calendar.
      </p>
      <StopNotesArea
        stopKey="week_preview"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

function PrioritiesFocusStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">PRIORITIES &amp; FOCUS</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Top 2-3 Priorities
      </h2>
      <p className="meeting-stop-subtext">
        The 2-3 most important things each partner will accomplish this week.
      </p>
      <StopNotesArea
        stopKey="priorities_focus"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

function RisksBlockersStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">RISKS &amp; BLOCKERS</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Risks &amp; Blockers
      </h2>
      <p className="meeting-stop-subtext">
        What could get in the way and where do you need help?
      </p>
      <StopNotesArea
        stopKey="risks_blockers"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

function GrowthCheckinStop({ data, notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">GROWTH CHECK-IN</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Growth Priority Pulse
      </h2>
      <p className="meeting-stop-subtext">
        Quick status on each partner&apos;s growth priorities.
      </p>
      <div className="meeting-growth-grid">
        {['theo', 'jerry'].map((p) => {
          const priorities = data[p].growth;
          return (
            <div key={p} className="meeting-growth-cell">
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
              {priorities.length === 0 ? (
                <div className="muted" style={{ fontSize: 14 }}>No growth priorities set.</div>
              ) : (
                priorities.map((g) => (
                  <div key={g.id} style={{ fontSize: 14, lineHeight: 1.55 }}>
                    <span className={`growth-status-badge ${g.status ?? 'active'}`}>
                      {GROWTH_STATUS_COPY[g.status ?? 'active']}
                    </span>
                    {' '}{g.description || g.custom_text || '\u2014'}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
      <StopNotesArea
        stopKey="growth_checkin"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

function CommitmentsStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">COMMITMENTS</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Walk-Away Commitments
      </h2>
      <p className="meeting-stop-subtext">
        What each partner commits to by end of week.
      </p>
      <StopNotesArea
        stopKey="commitments"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Intro stop
// --------------------------------------------------------------------------

function IntroStop({ meeting, data, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const weekLabel = formatWeekRange(meeting.week_of);
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">
        {copy.stops.introEyebrow}
      </div>
      <h2
        className="meeting-stop-heading"
        style={{ fontSize: 28, lineHeight: 1.2 }}
      >
        {copy.stops.introHeading(weekLabel)}
      </h2>
      <p className="meeting-stop-subtext">
        Walk through each KPI and growth priority together. Notes auto-save per stop.
      </p>

      <div
        className="meeting-kpi-grid"
        style={{ marginTop: 24 }}
      >
        {PARTNERS.map((p) => {
          const results = data[p].scorecard?.kpi_results ?? {};
          // Phase 17 D-02: aggregate via effectiveResult so post-Saturday-close pending
          // entries are not double-counted as hits. Live pending stays out of hits;
          // closed-week pending coerces to 'no' (still excluded from hit count).
          const cardWeekOf = data[p].scorecard?.week_of;
          const hit = Object.values(results).filter(
            (e) => effectiveResult(e?.result, cardWeekOf) === 'yes'
          ).length;
          const total = data[p].kpis.length;
          return (
            <div key={p} className="meeting-kpi-cell">
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {hit}/{total} hit
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                {data[p].scorecard
                  ? `Scorecard committed ${new Date(
                      data[p].scorecard.committed_at ?? data[p].scorecard.submitted_at
                    ).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`
                  : 'No scorecard for this week yet.'}
              </div>
            </div>
          );
        })}
      </div>

      <StopNotesArea
        stopKey="intro"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// KPI stop
// --------------------------------------------------------------------------

function KpiStop({
  kpiIndex,
  stopKey,
  data,
  notes,
  savedFlash,
  onNoteChange,
  onOverrideResult,
  onReflectionChange,
  copy,
  isEnded,
}) {
  // UAT B1: per-partner override toggle. Default mode is read-only — partner's
  // submitted result + reflection + pending_text render verbatim. Clicking
  // "Override" on a partner cell flips that cell into the existing 3-button
  // editor (Yes / No / Pending) so Trace can correct the call when needed.
  // Hook lives BEFORE any conditional return per Phase 15 P-U2.
  const [overriding, setOverriding] = useState({}); // { theo: bool, jerry: bool }
  const n = kpiIndex + 1;
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">
        {copy.stops.kpiEyebrow(n, KPI_STOP_COUNT)}
      </div>
      <h3 className="meeting-stop-heading">KPI Review</h3>
      <p className="meeting-stop-subtext">
        Partner's submitted result is shown read-only. Use Override to correct the call —
        admin_override_at stamps when used.
      </p>

      <div className="meeting-kpi-grid">
        {PARTNERS.map((p) => {
          // Stable ordering — kpi_selections are fetched ascending by selected_at,
          // so data[p].kpis[kpiIndex] is the Nth locked KPI for this partner.
          const locked = data[p].kpis[kpiIndex];
          if (!locked) {
            return (
              <div key={p} className="meeting-kpi-cell null">
                <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  Not locked
                </div>
              </div>
            );
          }

          const kpiId = locked.id;
          const entry = data[p].scorecard?.kpi_results?.[kpiId] ?? {};
          const label = getLabelForEntry(kpiId, entry, data[p].kpis);
          const result = entry.result ?? null;
          const reflection = entry.reflection ?? '';
          const pendingText = (entry.pending_text ?? '').trim();
          // Phase 17 D-08: extend cell state with 'pending' so the amber border CSS lights up.
          const cellStateClass =
            result === 'yes' ? 'yes' :
            result === 'no' ? 'no' :
            result === 'pending' ? 'pending' :
            'null';
          const override = data[p].scorecard?.admin_override_at;

          // UAT B1: read-only by default; per-partner override toggle.
          const isOverriding = Boolean(overriding[p]);
          const resultLabel =
            result === 'yes' ? 'Met'
            : result === 'no' ? 'Not Met'
            : result === 'pending' ? 'Pending'
            : 'Not yet rated';
          const resultBadgeClass =
            result === 'yes' ? 'meeting-result-badge yes'
            : result === 'no' ? 'meeting-result-badge no'
            : result === 'pending' ? 'meeting-result-badge pending'
            : 'meeting-result-badge null';

          return (
            <div key={p} className={`meeting-kpi-cell ${cellStateClass}`}>
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
                {label}
                {locked.kpi_templates?.mandatory && <span className="kpi-core-badge">Core</span>}
                {result === 'pending' && (
                  <span className="pending-badge" style={{ marginLeft: 8 }}>
                    {SCORECARD_COPY.pendingBadge}
                  </span>
                )}
              </div>

              {/* Phase 17 D-08: Friday-meeting per-row commitment block, surfaces the
                  partner's "By Saturday: ..." text so Trace can read it during review. */}
              {result === 'pending' && pendingText !== '' && (
                <div className="kpi-mtg-pending-block">
                  {SCORECARD_COPY.bySaturdayPrefix}{entry.pending_text}
                </div>
              )}

              {!isOverriding ? (
                // ----- READ-ONLY MODE (UAT B1 default) -----
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <span
                      className={resultBadgeClass}
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        padding: '4px 10px',
                        borderRadius: 6,
                        ...(result === 'yes'
                          ? { background: 'rgba(45,143,94,0.18)', color: 'var(--success, #2d8f5e)' }
                          : result === 'no'
                            ? { background: 'rgba(196,30,58,0.18)', color: 'var(--red, #c41e3a)' }
                            : result === 'pending'
                              ? { background: 'rgba(214,158,46,0.18)', color: 'var(--gold, #d69e2e)' }
                              : { background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }),
                      }}
                    >
                      {resultLabel}
                    </span>
                    {!isEnded && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => setOverriding((s) => ({ ...s, [p]: true }))}
                      >
                        Override
                      </button>
                    )}
                  </div>

                  {reflection && (
                    <div
                      className="muted"
                      style={{ fontSize: 14, fontStyle: 'italic', marginTop: 8, lineHeight: 1.55 }}
                    >
                      {reflection}
                    </div>
                  )}
                </>
              ) : (
                // ----- OVERRIDE / EDIT MODE -----
                <>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="meeting-yn-override scorecard-yn-btn"
                      aria-pressed={result === 'yes'}
                      disabled={isEnded}
                      style={{
                        ...(result === 'yes'
                          ? {
                              background: 'rgba(45,143,94,0.18)',
                              borderColor: 'var(--success)',
                              color: 'var(--text)',
                            }
                          : {}),
                        ...(isEnded ? { opacity: 0.35 } : {}),
                      }}
                      onClick={() => onOverrideResult(p, kpiId, 'yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className="meeting-yn-override scorecard-yn-btn"
                      aria-pressed={result === 'no'}
                      disabled={isEnded}
                      style={{
                        ...(result === 'no'
                          ? {
                              background: 'rgba(196,30,58,0.18)',
                              borderColor: 'var(--red)',
                              color: 'var(--text)',
                            }
                          : {}),
                        ...(isEnded ? { opacity: 0.35 } : {}),
                      }}
                      onClick={() => onOverrideResult(p, kpiId, 'no')}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setOverriding((s) => ({ ...s, [p]: false }))}
                    >
                      Done
                    </button>
                  </div>

                  <textarea
                    className="textarea"
                    placeholder="Reflection..."
                    value={reflection}
                    onChange={(e) => onReflectionChange(p, kpiId, e.target.value)}
                    readOnly={isEnded}
                    style={{ minHeight: 72, ...(isEnded ? { cursor: 'default', resize: 'none' } : {}) }}
                  />
                </>
              )}

              {override && (
                <div className="meeting-admin-override-marker">
                  Edited by Trace {new Date(override).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <StopNotesArea
        stopKey={stopKey}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Growth stop (read-only per D-15)
// --------------------------------------------------------------------------

function GrowthStop({
  stopKey,
  kind,
  ordinal,
  data,
  notes,
  savedFlash,
  onNoteChange,
  copy,
  isEnded,
}) {
  // Hooks-before-early-return (P-U2): collapsible state for the business branch's per-card
  // deliverables toggle. Keyed by priority.id so each card opens/closes independently.
  // Personal branch ignores this state.
  const [expanded, setExpanded] = useState({});

  const eyebrow =
    kind === 'personal'
      ? copy.stops.growthPersonalEyebrow
      : copy.stops.growthBusinessEyebrow(ordinal);

  // -----------------------------------------------------------------------
  // BUSINESS BRANCH (Phase 18 BIZ-03 / D-15):
  //   - Render single shared-priority card (title + description + collapsible deliverables)
  //   - Divider
  //   - Single shared StopNotesArea (Option A \u2014 A2 deviation; meeting_notes is keyed by
  //     (meeting_id, agenda_stop_key) only \u2014 no per-partner column. Trace types both
  //     partners' commitments into one textarea per CONTEXT D-17 no-schema-changes rule.)
  // -----------------------------------------------------------------------
  if (kind === 'business') {
    const priorityId = BUSINESS_GROWTH_STOP_MAPPING[stopKey];
    const priority = (data.businessPriorities ?? []).find((p) => p.id === priorityId);
    const isOpen = priority ? Boolean(expanded[priority.id]) : false;

    return (
      <>
        <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
        <h3 className="meeting-stop-heading">Growth Priority</h3>
        <p className="meeting-stop-subtext">
          {copy.stops.growthBusinessSubtext}
        </p>

        {priority ? (
          <div className="business-priority-card business-priority-card--meeting">
            <div className="eyebrow meeting-stop-eyebrow">
              {copy.stops.businessPriorityCardEyebrow(ordinal)}
            </div>
            <h4>{priority.title}</h4>
            <p className="business-priority-description">{priority.description}</p>

            <button
              type="button"
              className="business-priority-toggle"
              onClick={() => setExpanded((s) => ({ ...s, [priority.id]: !s[priority.id] }))}
              aria-expanded={isOpen}
            >
              <span className="business-priority-toggle-chevron" aria-hidden="true">
                {isOpen ? '\u25be' : '\u25b8'}
              </span>
              {isOpen
                ? copy.stops.businessPriorityToggleHide
                : copy.stops.businessPriorityToggleShow}
            </button>

            <div
              className={`business-priority-deliverables ${isOpen ? 'expanded' : ''}`}
            >
              <ul className="business-priority-deliverables-list day-in-life-list">
                {(priority.deliverables ?? []).map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 14, fontStyle: 'italic' }}>
            {data.businessPriorities === undefined || data.businessPriorities.length === 0
              ? 'Loading business priority\u2026'
              : 'Business priority not found for this stop.'}
          </div>
        )}

        <hr className="meeting-shared-priority-divider" />

        <StopNotesArea
          stopKey={stopKey}
          notes={notes}
          savedFlash={savedFlash}
          onNoteChange={onNoteChange}
          copy={copy}
          isEnded={isEnded}
        />
      </>
    );
  }

  // -----------------------------------------------------------------------
  // PERSONAL BRANCH (UNCHANGED \u2014 preserves existing per-partner growth-cell render)
  // -----------------------------------------------------------------------
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
      <h3 className="meeting-stop-heading">Growth Priority</h3>
      <p className="meeting-stop-subtext">
        Growth priorities are read-only inside Meeting Mode. Edit on Partner Management.
      </p>

      <div className="meeting-growth-grid">
        {PARTNERS.map((p) => {
          const list = data[p].growth.filter((g) => g.type === kind);
          // ordinal is 1-indexed
          const priority = list[ordinal - 1];

          if (!priority) {
            return (
              <div key={p} className="meeting-growth-cell">
                <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  No {kind} growth priority locked.
                </div>
              </div>
            );
          }

          const status = priority.status ?? 'active';
          const statusLabel = GROWTH_STATUS_COPY[status] ?? GROWTH_STATUS_COPY.active;

          return (
            <div key={p} className="meeting-growth-cell">
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
              <div style={{ fontSize: 15, lineHeight: 1.55 }}>
                {priority.description || priority.custom_text || '\u2014'}
              </div>
              <div>
                <span className={`growth-status-badge ${status}`}>{statusLabel}</span>
              </div>
              {priority.admin_note && (
                <div className="growth-admin-note">{priority.admin_note}</div>
              )}
            </div>
          );
        })}
      </div>

      <StopNotesArea
        stopKey={stopKey}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Wrap stop
// --------------------------------------------------------------------------

function WrapStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">CLOSING</div>
      <h2
        className="meeting-stop-heading"
        style={{ fontSize: 28, lineHeight: 1.2 }}
      >
        {copy.stops.wrapHeading}
      </h2>
      <p className="meeting-stop-subtext">{copy.stops.wrapSubtext}</p>

      <StopNotesArea
        stopKey="wrap"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Shared notes textarea
// --------------------------------------------------------------------------

function StopNotesArea({ stopKey, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const value = notes[stopKey] ?? '';
  const flashing = savedFlash === stopKey;
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <label
          htmlFor={`meeting-notes-${stopKey}`}
          className="eyebrow"
          style={{ fontSize: 11 }}
        >
          NOTES
        </label>
        {flashing && (
          <span style={{ color: 'var(--gold)', fontSize: 12 }}>
            {copy.savedFlash}
          </span>
        )}
      </div>
      <textarea
        id={`meeting-notes-${stopKey}`}
        className="meeting-notes-area textarea"
        value={value}
        onChange={(e) => onNoteChange(stopKey, e.target.value)}
        placeholder={copy.notesPlaceholder}
        readOnly={isEnded}
        style={isEnded ? { cursor: 'default', resize: 'none', opacity: 0.75 } : undefined}
      />
    </div>
  );
}
