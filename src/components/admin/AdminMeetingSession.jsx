import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchMeeting,
  fetchMeetingNotes,
  upsertMeetingNote,
  endMeeting,
  adminOverrideScorecardEntry,
  fetchKpiSelections,
  fetchGrowthPriorities,
  fetchScorecard,
} from '../../lib/supabase.js';
import { formatWeekRange } from '../../lib/week.js';
import {
  MEETING_COPY,
  GROWTH_STATUS_COPY,
  PARTNER_DISPLAY,
} from '../../data/content.js';

// --- Fixed 10-stop agenda (D-14) ---
// Enforced at DB layer via meeting_notes.agenda_stop_key CHECK constraint (migration 005).
// Order is canonical: intro → kpi_1..5 → personal growth → business growth 1..2 → wrap.
const STOPS = [
  'intro',
  'kpi_1',
  'kpi_2',
  'kpi_3',
  'kpi_4',
  'kpi_5',
  'growth_personal',
  'growth_business_1',
  'growth_business_2',
  'wrap',
];

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
  });
  const [endPending, setEndPending] = useState(false);
  const [ending, setEnding] = useState(false);

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

        const [
          theoKpis,
          jerryKpis,
          theoGrowth,
          jerryGrowth,
          theoScorecard,
          jerryScorecard,
          noteRows,
        ] = await Promise.all([
          fetchKpiSelections('theo'),
          fetchKpiSelections('jerry'),
          fetchGrowthPriorities('theo'),
          fetchGrowthPriorities('jerry'),
          fetchScorecard('theo', m.week_of),
          fetchScorecard('jerry', m.week_of),
          fetchMeetingNotes(id),
        ]);
        if (!alive) return;

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

  // --- Navigation ---
  const goNext = useCallback(() => {
    setDirection(1);
    setStopIndex((i) => Math.min(i + 1, STOPS.length - 1));
  }, []);

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
          setError(MEETING_COPY.errors.noteSaveFail);
        }
      }, DEBOUNCE_MS);
    },
    [id]
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
        setError(MEETING_COPY.errors.noteSaveFail);
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
          setError(MEETING_COPY.errors.noteSaveFail);
        }
      }, DEBOUNCE_MS);
    },
    [meeting, data, refreshPartnerScorecard]
  );

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
      setError(MEETING_COPY.errors.loadFail);
      setEnding(false);
      setEndPending(false);
    }
  }, [ending, endPending, id, navigate]);

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

  const currentStopKey = STOPS[stopIndex];
  const weekLabel = formatWeekRange(meeting.week_of);

  return (
    <div className="meeting-shell">
      {/* === Header === */}
      <div className="meeting-shell-header">
        <div className="meeting-progress-pill">
          {MEETING_COPY.progressPill(stopIndex + 1, STOPS.length)}
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
              ? MEETING_COPY.endConfirmBtn
              : MEETING_COPY.endBtn}
        </button>
      </div>

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
        <button
          type="button"
          className="btn btn-primary"
          onClick={goNext}
          disabled={stopIndex === STOPS.length - 1}
        >
          Next {'\u2192'}
        </button>
      </div>
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
}) {
  if (stopKey === 'intro') {
    return (
      <IntroStop
        meeting={meeting}
        data={data}
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
      />
    );
  }

  if (stopKey.startsWith('kpi_')) {
    // stopIndex 1..5 maps to KPI index 0..4
    const kpiIndex = stopIndex - 1;
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
      />
    );
  }

  if (stopKey === 'wrap') {
    return (
      <WrapStop
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
      />
    );
  }

  return null;
}

// --------------------------------------------------------------------------
// Intro stop
// --------------------------------------------------------------------------

function IntroStop({ meeting, data, notes, savedFlash, onNoteChange }) {
  const weekLabel = formatWeekRange(meeting.week_of);
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">
        {MEETING_COPY.stops.introEyebrow}
      </div>
      <h2
        className="meeting-stop-heading"
        style={{ fontSize: 28, lineHeight: 1.2 }}
      >
        {MEETING_COPY.stops.introHeading(weekLabel)}
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
          const hit = Object.values(results).filter((e) => e?.result === 'yes').length;
          const total = 5;
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
                    ).toLocaleDateString()}`
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
}) {
  const n = kpiIndex + 1;
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">
        {MEETING_COPY.stops.kpiEyebrow(n)}
      </div>
      <h3 className="meeting-stop-heading">KPI Review</h3>
      <p className="meeting-stop-subtext">
        Flip yes/no as you discuss. Override stamps admin_override_at.
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
          const cellStateClass =
            result === 'yes' ? 'yes' : result === 'no' ? 'no' : 'null';
          const override = data[p].scorecard?.admin_override_at;

          return (
            <div key={p} className={`meeting-kpi-cell ${cellStateClass}`}>
              <div className="meeting-partner-name">{PARTNER_DISPLAY[p]}</div>
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>
                {label}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="meeting-yn-override scorecard-yn-btn"
                  aria-pressed={result === 'yes'}
                  style={
                    result === 'yes'
                      ? {
                          background: 'rgba(45,143,94,0.18)',
                          borderColor: 'var(--success)',
                          color: 'var(--text)',
                        }
                      : undefined
                  }
                  onClick={() => onOverrideResult(p, kpiId, 'yes')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="meeting-yn-override scorecard-yn-btn"
                  aria-pressed={result === 'no'}
                  style={
                    result === 'no'
                      ? {
                          background: 'rgba(196,30,58,0.18)',
                          borderColor: 'var(--red)',
                          color: 'var(--text)',
                        }
                      : undefined
                  }
                  onClick={() => onOverrideResult(p, kpiId, 'no')}
                >
                  No
                </button>
              </div>

              <textarea
                className="textarea"
                placeholder="Reflection..."
                value={reflection}
                onChange={(e) => onReflectionChange(p, kpiId, e.target.value)}
                style={{ minHeight: 72 }}
              />

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
}) {
  const eyebrow =
    kind === 'personal'
      ? MEETING_COPY.stops.growthPersonalEyebrow
      : MEETING_COPY.stops.growthBusinessEyebrow(ordinal);

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
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Wrap stop
// --------------------------------------------------------------------------

function WrapStop({ notes, savedFlash, onNoteChange }) {
  return (
    <>
      <div className="eyebrow meeting-stop-eyebrow">CLOSING</div>
      <h2
        className="meeting-stop-heading"
        style={{ fontSize: 28, lineHeight: 1.2 }}
      >
        {MEETING_COPY.stops.wrapHeading}
      </h2>
      <p className="meeting-stop-subtext">{MEETING_COPY.stops.wrapSubtext}</p>

      <StopNotesArea
        stopKey="wrap"
        notes={notes}
        savedFlash={savedFlash}
        onNoteChange={onNoteChange}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Shared notes textarea
// --------------------------------------------------------------------------

function StopNotesArea({ stopKey, notes, savedFlash, onNoteChange }) {
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
            {MEETING_COPY.savedFlash}
          </span>
        )}
      </div>
      <textarea
        id={`meeting-notes-${stopKey}`}
        className="meeting-notes-area textarea"
        value={value}
        onChange={(e) => onNoteChange(stopKey, e.target.value)}
        placeholder={MEETING_COPY.notesPlaceholder}
      />
    </div>
  );
}
