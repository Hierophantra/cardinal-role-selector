import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchMeeting,
  fetchMeetingNotes,
  upsertMeetingNote,
  upsertMeetingNotePerPartner,
  endMeeting,
  touchMeetingUpdatedAt,
  adminOverrideScorecardEntry,
  fetchGrowthPriorities,
  fetchScorecard,
  fetchBusinessPriorities,
} from '../../lib/supabase.js';
import { formatWeekRange, effectiveResult, isWeekClosed } from '../../lib/week.js';
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
  GROWTH_FOLLOWUP_FIELDS,
} from '../../data/content.js';

// Stop arrays are now imported from content.js (FRIDAY_STOPS, MONDAY_STOPS).
// The active stop array is derived from meeting.meeting_type inside the component.

// KPI_START_INDEX: position of kpi_1 in FRIDAY_STOPS.
// Derived from FRIDAY_STOPS so this stays correct even when the array is reordered
// (Phase 17 inserts 'kpi_review_optional' at index 1, shifting kpi_1 to index 3).
const KPI_START_INDEX = FRIDAY_STOPS.indexOf('kpi_1');

const PARTNERS = ['theo', 'jerry'];
// Autosave debounce — 25s feels right for live meeting cadence: long enough that
// a thinking pause doesn't trigger a save, short enough that an interruption
// (window switch, end of meeting) still persists recent edits within ~30s.
// Earlier 400ms cadence felt too eager during the first live meeting.
const DEBOUNCE_MS = 25000;
const END_DISARM_MS = 3000;

// UAT C2/C3/C4: Monday Prep stops that capture separate Theo + Jerry notes.
// Renderer dispatches on stop key — these three use upsertMeetingNotePerPartner
// (notes_theo + notes_jerry columns); every other stop continues to write the
// shared body column via upsertMeetingNote.
const PER_PARTNER_NOTE_STOPS = new Set([
  'priorities_focus',
  'risks_blockers',
  'commitments',
]);

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
  // UAT C2/C3/C4: parallel map for per-partner stops. Keyed by stopKey -> { theo, jerry }.
  // Renderer chooses which map to read based on PER_PARTNER_NOTE_STOPS membership.
  const [perPartnerNotes, setPerPartnerNotes] = useState({});
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
  // UAT C2/C3/C4: per-partner note debounce timers, keyed by `${stopKey}:${partner}`.
  // Each partner+stop combo debounces independently so a fast typist on one cell
  // does not delay the save on the other cell.
  const perPartnerDebounceRef = useRef({});
  // WR-01 (UAT 2026-04-25): mirror perPartnerNotes state into a ref so the debounced
  // flush below can read the latest both-partner draft via ref instead of abusing
  // setState((prev) => prev) as a state-getter. The setState-as-getter pattern
  // works today but is fragile under React 18 strict-mode double-invocation;
  // ref-based access matches currentMondayRef pattern used elsewhere.
  const perPartnerNotesRef = useRef({});
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

        // Seed note drafts from any existing meeting_notes rows.
        // UAT C2/C3/C4: dispatch on stop key — per-partner stops hydrate
        // notes_theo / notes_jerry into perPartnerNotes; every other stop
        // hydrates body into notes (the existing path).
        const seeded = {};
        const seededPerPartner = {};
        for (const row of noteRows ?? []) {
          const key = row.agenda_stop_key;
          if (PER_PARTNER_NOTE_STOPS.has(key)) {
            seededPerPartner[key] = {
              theo: row.notes_theo ?? '',
              jerry: row.notes_jerry ?? '',
            };
          } else {
            seeded[key] = row.body ?? '';
          }
        }
        setNotes(seeded);
        setPerPartnerNotes(seededPerPartner);
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
      const ppMap = perPartnerDebounceRef.current;
      for (const key of Object.keys(ppMap)) {
        if (ppMap[key]) clearTimeout(ppMap[key]);
      }
    };
  }, []);

  // WR-01: mirror perPartnerNotes state into a ref on every change so the
  // debounced flush in handlePerPartnerNoteChange can read the latest draft
  // via ref instead of abusing setState((prev) => prev) as a state-getter.
  useEffect(() => {
    perPartnerNotesRef.current = perPartnerNotes;
  }, [perPartnerNotes]);

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

  // Migration 014 / post-Phase-17 UAT: hard cutoff. Once Saturday 23:59 of
  // the meeting's week passes, ALL textareas + pickers go read-only and the
  // bottom-right CTA reads "Back to Hub". This is the explicit Saturday-close
  // freeze — distinct from the soft `isEnded` (just stamped ended_at) state,
  // which still lets admin capture additional notes.
  const meetingLocked = useMemo(() => {
    if (!meeting?.week_of) return false;
    return isWeekClosed(meeting.week_of);
  }, [meeting]);

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
          // Migration 014 / post-Phase-17 UAT: post-end edits stamp
          // notes_updated_at so MeetingSummary's "Updated:" line surfaces
          // staleness vs. ended_at. Pre-end edits do NOT touch the column.
          if (meeting?.ended_at) {
            try {
              await touchMeetingUpdatedAt(id);
              setMeeting((prev) =>
                prev ? { ...prev, notes_updated_at: new Date().toISOString() } : prev
              );
            } catch (touchErr) {
              console.error(touchErr); // don't block the flash on a touch failure
            }
          }
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

  // UAT C2/C3/C4: per-partner note auto-save. Optimistic update of
  // perPartnerNotes[stopKey][partner], then debounced upsert that writes BOTH
  // partner columns each time so the row stays consistent (one column never
  // overwrites the other since the upsert payload includes both, sourced from
  // the latest local state at flush time).
  const handlePerPartnerNoteChange = useCallback(
    (stopKey, partner, text) => {
      setPerPartnerNotes((m) => {
        const cur = m[stopKey] ?? { theo: '', jerry: '' };
        return { ...m, [stopKey]: { ...cur, [partner]: text } };
      });
      const timerKey = `${stopKey}:${partner}`;
      if (perPartnerDebounceRef.current[timerKey]) {
        clearTimeout(perPartnerDebounceRef.current[timerKey]);
      }
      perPartnerDebounceRef.current[timerKey] = setTimeout(async () => {
        try {
          // WR-01: Read latest both-partner draft via ref (synced on every
          // perPartnerNotes change in the useEffect above). Replaces the
          // earlier setState((prev) => prev) state-getter abuse, which works
          // today but is fragile under React 18 strict-mode double-invocation.
          const latest = perPartnerNotesRef.current[stopKey] ?? { theo: '', jerry: '' };
          await upsertMeetingNotePerPartner({
            meeting_id: id,
            agenda_stop_key: stopKey,
            notes: latest,
          });
          // Migration 014: post-end edits stamp notes_updated_at; pre-end edits
          // are silent. Same guard as handleNoteChange above.
          if (meeting?.ended_at) {
            try {
              await touchMeetingUpdatedAt(id);
              setMeeting((prev) =>
                prev ? { ...prev, notes_updated_at: new Date().toISOString() } : prev
              );
            } catch (touchErr) {
              console.error(touchErr);
            }
          }
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

  // Post-Phase-17 UAT 2026-04-25: Complete Meeting now stamps ended_at and
  // STAYS on the page so admin can keep capturing context in additional_notes
  // (and any other stop) before leaving. End Prep is a separate nav-only CTA
  // that takes the admin back to /admin/meeting without touching ended_at.
  // endMeeting is idempotent; a re-click cannot rewrite the original stamp.
  const handleCompleteConfirm = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const updated = await endMeeting(id);
      // Reflect the new ended_at in local state so the UI flips into the
      // "ended" CTA shape (End Prep / Back to Hub) without a remount.
      setMeeting((prev) => (prev ? { ...prev, ...updated } : updated));
      setCompletePending(false);
      setCompleting(false);
    } catch (err) {
      console.error(err);
      setError((meeting?.meeting_type === 'monday_prep' ? MONDAY_PREP_COPY : MEETING_COPY).errors.loadFail);
      setCompleting(false);
      setCompletePending(false);
    }
  }, [completing, id, meeting]);

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
  // Post-Phase-17 UAT 2026-04-25 / Migration 014: readOnly is gated on the
  // HARD Saturday-close cutoff, NOT on ended_at. Rationale:
  //   - After Complete Meeting (ended_at set, week not yet closed), admin
  //     should still be able to capture context — especially in the
  //     additional_notes stop. Note edits stamp notes_updated_at so the
  //     summary "Updated:" line surfaces the staleness.
  //   - Once Saturday 23:59 of the meeting's week passes (meetingLocked),
  //     ALL textareas + pickers freeze. This is the permanent cutoff.
  // The KpiStop "Override" toggle is gated on isEnded (existing UAT B1
  // contract) — keep that intact: post-end overrides are NOT allowed via
  // this flow even pre-lock; admin uses the dedicated AdminScorecards
  // surface for that. We pass `isEnded` through unchanged below.
  const readOnly = meetingLocked;
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
          Meeting ended {new Date(meeting.ended_at).toLocaleString()}
          {meeting.notes_updated_at &&
            new Date(meeting.notes_updated_at).getTime() > new Date(meeting.ended_at).getTime() && (
              <>
                {' · Updated '}
                {new Date(meeting.notes_updated_at).toLocaleString()}
              </>
            )}
          {meetingLocked && ' · Week closed (read-only)'}
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
            perPartnerNotes={perPartnerNotes}
            savedFlash={savedFlash}
            onNoteChange={handleNoteChange}
            onPerPartnerNoteChange={handlePerPartnerNoteChange}
            onOverrideResult={handleOverrideResult}
            onReflectionChange={handleReflectionChange}
            copy={copy}
            isEnded={readOnly}
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
          // Last-stop CTA, three-state machine (post-Phase-17 UAT 2026-04-25):
          //   pre-end:                   "Complete Meeting" \u2014 opens confirm
          //   ended, week not closed:    "End Prep" \u2014 nav back, no DB write
          //   week closed (locked):      "Back to Hub" \u2014 nav back, read-only
          //
          // End Prep does NOT touch ended_at. endMeeting is idempotent now,
          // but the spec is explicit: post-end button is a pure nav.
          isEnded ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/admin/meeting')}
            >
              {meetingLocked ? 'Back to Hub' : copy.endBtn}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCompleteClick}
              disabled={completing || ending || meetingLocked}
            >
              {copy.completeMeetingCta}
            </button>
          )
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
  perPartnerNotes,
  savedFlash,
  onNoteChange,
  onPerPartnerNoteChange,
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
    // Phase 17 D-15 + extension: surface BOTH last-week pending rows (with
    // conversion state) AND current-week pending rows (live, awaiting Saturday
    // close). Current-week scorecards are derived from data.theo.scorecard /
    // data.jerry.scorecard — already loaded for Friday-style stops, so no extra
    // fetches are needed.
    const currentWeekScorecards = [data?.theo?.scorecard, data?.jerry?.scorecard].filter(Boolean);
    return (
      <SaturdayRecapStop
        meeting={meeting}
        lastWeekScorecards={data?.lastWeekScorecards ?? []}
        currentWeekScorecards={currentWeekScorecards}
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
        perPartnerNotes={perPartnerNotes}
        savedFlash={savedFlash}
        onPerPartnerNoteChange={onPerPartnerNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    );
  }

  if (stopKey === 'risks_blockers') {
    return (
      <RisksBlockersStop
        perPartnerNotes={perPartnerNotes}
        savedFlash={savedFlash}
        onPerPartnerNoteChange={onPerPartnerNoteChange}
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
        perPartnerNotes={perPartnerNotes}
        savedFlash={savedFlash}
        onPerPartnerNoteChange={onPerPartnerNoteChange}
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

  if (stopKey === 'additional_notes') {
    return (
      <AdditionalNotesStop
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
//
// Extension (post-Phase-17 UAT 2026-04-25): also surfaces CURRENT-week pending
// rows ("Live — awaiting Saturday close") so a freshly-submitted Friday scorecard
// can be reviewed in the same week's Monday Prep meeting. Both sections share the
// same pending_text qualifying filter; only the last-week section shows conversion
// state, since current-week rows have not yet hit the Saturday cutoff.
// --------------------------------------------------------------------------

function collectRecapRows(scorecards) {
  const rows = [];
  for (const sc of scorecards ?? []) {
    const results = sc?.kpi_results ?? {};
    for (const [tplId, entry] of Object.entries(results)) {
      const pendingText = (entry?.pending_text ?? '').trim();
      if (!pendingText) continue;
      const eff = effectiveResult(entry?.result, sc.week_of);
      rows.push({
        partner: sc.partner,
        weekOf: sc.week_of,
        tplId,
        label: entry?.label ?? '(KPI)',
        pending_text: entry.pending_text,
        // 2026-04-29: surface partner reflection on Saturday recap rows so
        // the meeting view shows commitment + reflection together when both
        // exist. Previously only label + pending_text + conversion badge
        // rendered, hiding the partner's own context for the commitment.
        reflection: entry?.reflection ?? '',
        converted: eff === 'yes',
      });
    }
  }
  return rows;
}

function SaturdayRecapStop({ lastWeekScorecards, currentWeekScorecards, notes, savedFlash, onNoteChange, copy, isEnded }) {
  const lastWeekRows = collectRecapRows(lastWeekScorecards);
  const currentWeekRows = collectRecapRows(currentWeekScorecards);

  const lastWeekEmpty = lastWeekRows.length === 0;
  const currentWeekEmpty = currentWeekRows.length === 0;
  const bothEmpty = lastWeekEmpty && currentWeekEmpty;

  return (
    <>
      {bothEmpty ? (
        <>
          <div className="eyebrow meeting-stop-eyebrow">{copy.stops.saturdayRecapEyebrow}</div>
          <h3 className="meeting-stop-heading">{copy.stops.saturdayRecapHeading}</h3>
          <div className="saturday-recap-empty">{copy.stops.saturdayRecapEmpty}</div>
        </>
      ) : (
        <>
          {!lastWeekEmpty && (
            <>
              <div className="eyebrow meeting-stop-eyebrow">{copy.stops.saturdayRecapEyebrow}</div>
              <h3 className="meeting-stop-heading">{copy.stops.saturdayRecapHeading}</h3>
              <div className="saturday-recap-list">
                {lastWeekRows.map((row, i) => (
                  <div key={`lw-${row.partner}-${row.tplId}-${i}`} className="saturday-recap-row">
                    <div
                      className="saturday-recap-label"
                      style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}
                    >
                      {PARTNER_DISPLAY[row.partner] ?? row.partner}: {row.label}
                    </div>
                    <div className="saturday-recap-commitment">
                      {copy.stops.saturdayRecapCommitmentPrefix}{row.pending_text}
                    </div>
                    {row.reflection && (
                      <div className="saturday-recap-reflection">
                        {row.reflection}
                      </div>
                    )}
                    <div className={`saturday-recap-conversion ${row.converted ? 'met' : 'not-converted'}`}>
                      {row.converted ? copy.stops.saturdayRecapMet : copy.stops.saturdayRecapNotConverted}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!lastWeekEmpty && !currentWeekEmpty && (
            <hr className="meeting-shared-priority-divider" />
          )}

          {!currentWeekEmpty && (
            <>
              <div className="eyebrow meeting-stop-eyebrow">{copy.stops.saturdayRecapCurrentWeekEyebrow}</div>
              <h3 className="meeting-stop-heading">{copy.stops.saturdayRecapCurrentWeekHeading}</h3>
              <div className="saturday-recap-list">
                {currentWeekRows.map((row, i) => (
                  <div key={`cw-${row.partner}-${row.tplId}-${i}`} className="saturday-recap-row">
                    <div
                      className="saturday-recap-label"
                      style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}
                    >
                      {PARTNER_DISPLAY[row.partner] ?? row.partner}: {row.label}
                    </div>
                    <div className="saturday-recap-commitment">
                      {copy.stops.saturdayRecapCommitmentPrefix}{row.pending_text}
                    </div>
                    {row.reflection && (
                      <div className="saturday-recap-reflection">
                        {row.reflection}
                      </div>
                    )}
                    <div className="saturday-recap-conversion saturday-recap-conversion--live">
                      {copy.stops.saturdayRecapLiveBadge}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
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
      <div className="eyebrow meeting-stop-eyebrow">{copy.stops.weekPreviewEyebrow}</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        {copy.stops.weekPreviewHeading}
      </h2>
      <p className="meeting-stop-subtext">
        {copy.stops.weekPreviewSubtext}
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

function PrioritiesFocusStop({ perPartnerNotes, savedFlash, onPerPartnerNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">PRIORITIES &amp; FOCUS</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Top 2-3 Priorities
      </h2>
      <p className="meeting-stop-subtext">
        {copy.stops.prioritiesFocusSubtext}
      </p>
      <PerPartnerNotesArea
        stopKey="priorities_focus"
        perPartnerNotes={perPartnerNotes}
        savedFlash={savedFlash}
        onPerPartnerNoteChange={onPerPartnerNoteChange}
        copy={copy}
        isEnded={isEnded}
      />
    </>
  );
}

function RisksBlockersStop({ perPartnerNotes, savedFlash, onPerPartnerNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">RISKS &amp; BLOCKERS</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Risks &amp; Blockers
      </h2>
      <p className="meeting-stop-subtext">
        {copy.stops.risksBlockersSubtext}
      </p>
      <PerPartnerNotesArea
        stopKey="risks_blockers"
        perPartnerNotes={perPartnerNotes}
        savedFlash={savedFlash}
        onPerPartnerNoteChange={onPerPartnerNoteChange}
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

function CommitmentsStop({ perPartnerNotes, savedFlash, onPerPartnerNoteChange, copy, isEnded }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">COMMITMENTS</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        Walk-Away Commitments
      </h2>
      <p className="meeting-stop-subtext">
        {copy.stops.commitmentsSubtext}
      </p>
      <PerPartnerNotesArea
        stopKey="commitments"
        perPartnerNotes={perPartnerNotes}
        savedFlash={savedFlash}
        onPerPartnerNoteChange={onPerPartnerNoteChange}
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
        Trace edits are stamped automatically.
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
  // PERSONAL BRANCH (UAT C1: surfaces the partner's mandatory growth_followup
  // entries from scorecards.growth_followup as read-only context above the
  // existing growth-cell render. Self-chosen growth is rendered alongside
  // the mandatory but with no follow-up data \u2014 the field is reminder-only.)
  // -----------------------------------------------------------------------
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">{eyebrow}</div>
      <h3 className="meeting-stop-heading">Growth Priority</h3>
      <p className="meeting-stop-subtext">
        Growth priorities are read-only inside Meeting Mode. Mandatory follow-up reflects
        what the partner submitted on their scorecard this week.
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
          // UAT C1: render the partner's submitted follow-up answers (only for
          // mandatory; self-chosen has no follow-up). Treat any non-self-chosen
          // personal priority as the mandatory slot.
          const isMandatory = priority.subtype !== 'self_personal';
          const followup = data[p].scorecard?.growth_followup ?? {};
          const followupFields = isMandatory ? (GROWTH_FOLLOWUP_FIELDS[p] ?? []) : [];
          const hasAnyFollowup = followupFields.some((f) => (followup[f.key] ?? '').toString().trim() !== '');

          return (
            <div key={p} className="meeting-growth-cell">
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
              <div style={{ fontSize: 15, lineHeight: 1.55, fontWeight: 600 }}>
                {priority.description || priority.custom_text || '\u2014'}
              </div>
              <div>
                <span className={`growth-status-badge ${status}`}>{statusLabel}</span>
              </div>
              {priority.admin_note && (
                <div className="growth-admin-note">{priority.admin_note}</div>
              )}

              {isMandatory && followupFields.length > 0 && (
                <div
                  className="growth-followup-readout"
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                  }}
                >
                  <div
                    className="eyebrow"
                    style={{ fontSize: 10, marginBottom: 6, color: 'var(--muted)' }}
                  >
                    THIS WEEK&apos;S FOLLOW-THROUGH
                  </div>
                  {hasAnyFollowup ? (
                    followupFields.map((f) => {
                      const v = (followup[f.key] ?? '').toString().trim();
                      if (!v) return null;
                      return (
                        <div key={f.key} style={{ fontSize: 13, lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--muted)' }}>{f.label} </span>
                          <span>{v}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="muted" style={{ fontSize: 12, fontStyle: 'italic' }}>
                      Not yet submitted on the scorecard.
                    </div>
                  )}
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
// Additional Notes stop (Migration 014) — true last stop in both meeting types.
// Captures context surfaced outside the structured agenda (before/after/during).
// Mirrors ClearTheAirStop shape: eyebrow + heading + subtext + single shared
// StopNotesArea. Persisted via meeting_notes (agenda_stop_key='additional_notes').
// --------------------------------------------------------------------------

function AdditionalNotesStop({ notes, savedFlash, onNoteChange, copy, isEnded }) {
  // Use the stop-specific placeholder if present; fall back to the generic one
  // so this stays compatible with any future copy that omits the override.
  const placeholder = copy.stops.additionalNotesPlaceholder ?? copy.notesPlaceholder;
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">{copy.stops.additionalNotesEyebrow}</div>
      <h2 className="meeting-stop-heading" style={{ fontSize: 28, lineHeight: 1.2 }}>
        {copy.stops.additionalNotesHeading}
      </h2>
      <p className="meeting-stop-subtext">{copy.stops.additionalNotesSubtext}</p>
      <StopNotesArea
        stopKey="additional_notes"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
        copy={{ ...copy, notesPlaceholder: placeholder }}
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

// --------------------------------------------------------------------------
// Per-partner notes textareas (UAT C2/C3/C4)
// Side-by-side Theo / Jerry textareas, persisted via upsertMeetingNotePerPartner
// (notes_theo + notes_jerry columns from migration 013). Used on the three
// Monday Prep stops in PER_PARTNER_NOTE_STOPS.
// --------------------------------------------------------------------------

function PerPartnerNotesArea({
  stopKey,
  perPartnerNotes,
  savedFlash,
  onPerPartnerNoteChange,
  copy,
  isEnded,
}) {
  const cur = perPartnerNotes[stopKey] ?? { theo: '', jerry: '' };
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
        <span className="eyebrow" style={{ fontSize: 11 }}>
          NOTES
        </span>
        {flashing && (
          <span style={{ color: 'var(--gold)', fontSize: 12 }}>
            {copy.savedFlash}
          </span>
        )}
      </div>
      <div className="meeting-per-partner-notes-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {PARTNERS.map((p) => (
          <div key={p}>
            <label
              htmlFor={`meeting-notes-${stopKey}-${p}`}
              className="meeting-partner-name"
              style={{ display: 'block', marginBottom: 6 }}
            >
              {PARTNER_DISPLAY[p]}
            </label>
            <textarea
              id={`meeting-notes-${stopKey}-${p}`}
              className="meeting-notes-area textarea"
              value={cur[p] ?? ''}
              onChange={(e) => onPerPartnerNoteChange(stopKey, p, e.target.value)}
              placeholder={copy.notesPlaceholder}
              readOnly={isEnded}
              style={isEnded ? { cursor: 'default', resize: 'none', opacity: 0.75 } : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
