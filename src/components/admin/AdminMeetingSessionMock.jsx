import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatWeekRange } from '../../lib/week.js';
import {
  MEETING_COPY,
  GROWTH_STATUS_COPY,
  PARTNER_DISPLAY,
} from '../../data/content.js';

// --- Fixed 10-stop agenda (mirrors AdminMeetingSession.jsx) ---
// Canonical order: intro → kpi_1..5 → personal growth → business growth 1..2 → wrap.
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

// --- Hardcoded mock data (no Supabase) ---

const MOCK_MEETING = { id: 'mock', week_of: '2026-04-06', held_at: null };

const MOCK_KPIS = {
  theo: [
    { id: 'theo-kpi-1', label_snapshot: 'Close 3 new enterprise deals' },
    { id: 'theo-kpi-2', label_snapshot: 'Ship weekly product update' },
    { id: 'theo-kpi-3', label_snapshot: 'Hold 5 client check-ins' },
    { id: 'theo-kpi-4', label_snapshot: 'Publish 2 thought-leadership posts' },
    { id: 'theo-kpi-5', label_snapshot: 'Personal revenue goal hit' },
  ],
  jerry: [
    { id: 'jerry-kpi-1', label_snapshot: 'Onboard 2 new hires' },
    { id: 'jerry-kpi-2', label_snapshot: 'Send weekly ops report' },
    { id: 'jerry-kpi-3', label_snapshot: 'Review AR aging under 30 days' },
    { id: 'jerry-kpi-4', label_snapshot: 'Run Friday team retro' },
    { id: 'jerry-kpi-5', label_snapshot: 'Inbox zero by Friday' },
  ],
};

const MOCK_GROWTH = {
  theo: [
    {
      id: 'theo-growth-personal',
      type: 'personal',
      description: 'Run a half marathon by end of Q2',
      status: 'active',
      admin_note: null,
    },
    {
      id: 'theo-growth-business-1',
      type: 'business',
      description: 'Establish repeatable enterprise sales playbook',
      status: 'stalled',
      admin_note: 'Paused — waiting on new marketing collateral before restarting outreach.',
    },
    {
      id: 'theo-growth-business-2',
      type: 'business',
      description: 'Launch customer advisory board',
      status: 'complete',
      admin_note: null,
    },
  ],
  jerry: [
    {
      id: 'jerry-growth-personal',
      type: 'personal',
      description: 'Read one leadership book per month',
      status: 'complete',
      admin_note: null,
    },
    {
      id: 'jerry-growth-business-1',
      type: 'business',
      description: 'Rebuild onboarding docs for new hires',
      status: 'active',
      admin_note: 'On track — v2 draft landed last Friday, final review this week.',
    },
    {
      id: 'jerry-growth-business-2',
      type: 'business',
      description: 'Automate AR aging report generation',
      status: 'active',
      admin_note: null,
    },
  ],
};

const MOCK_SCORECARDS = {
  theo: {
    week_of: '2026-04-06',
    committed_at: '2026-04-06T14:22:00.000Z',
    submitted_at: '2026-04-10T18:05:00.000Z',
    admin_override_at: null,
    kpi_results: {
      'theo-kpi-1': {
        label: 'Close 3 new enterprise deals',
        result: 'yes',
        reflection: 'Signed Acme and Bolt mid-week, third deal slipped to next Monday.',
      },
      'theo-kpi-2': {
        label: 'Ship weekly product update',
        result: 'yes',
        reflection: '',
      },
      'theo-kpi-3': {
        label: 'Hold 5 client check-ins',
        result: 'yes',
        reflection: 'Good momentum — three clients booked recurring quarterly calls.',
      },
      'theo-kpi-4': {
        label: 'Publish 2 thought-leadership posts',
        result: 'no',
        reflection: '',
      },
      'theo-kpi-5': {
        label: 'Personal revenue goal hit',
        result: null,
        reflection: '',
      },
    },
  },
  jerry: {
    week_of: '2026-04-06',
    committed_at: '2026-04-06T15:10:00.000Z',
    submitted_at: '2026-04-10T17:42:00.000Z',
    admin_override_at: null,
    kpi_results: {
      'jerry-kpi-1': {
        label: 'Onboard 2 new hires',
        result: 'yes',
        reflection: 'Both onboardings ran clean — new template paid off.',
      },
      'jerry-kpi-2': {
        label: 'Send weekly ops report',
        result: 'yes',
        reflection: '',
      },
      'jerry-kpi-3': {
        label: 'Review AR aging under 30 days',
        result: 'no',
        reflection: '',
      },
      'jerry-kpi-4': {
        label: 'Run Friday team retro',
        result: 'no',
        reflection: '',
      },
      'jerry-kpi-5': {
        label: 'Inbox zero by Friday',
        result: null,
        reflection: '',
      },
    },
  },
};

function buildInitialData() {
  return {
    theo: {
      kpis: MOCK_KPIS.theo,
      growth: MOCK_GROWTH.theo,
      scorecard: MOCK_SCORECARDS.theo,
    },
    jerry: {
      kpis: MOCK_KPIS.jerry,
      growth: MOCK_GROWTH.jerry,
      scorecard: MOCK_SCORECARDS.jerry,
    },
  };
}

// Render-time label fallback — mirrors production getLabelForEntry.
function getLabelForEntry(kpiId, entry, lockedKpis) {
  if (entry && entry.label) return entry.label;
  const match = lockedKpis.find((k) => k.id === kpiId);
  return match?.label_snapshot ?? '(unknown KPI)';
}

// Slide transition for stop swaps — directional based on Prev/Next.
function motionProps(dir) {
  return {
    initial: { opacity: 0, x: dir * 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: dir * -24 },
    transition: { duration: 0.22, ease: 'easeOut' },
  };
}

export default function AdminMeetingSessionMock() {
  const navigate = useNavigate();

  // --- State ---
  const [stopIndex, setStopIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [notes, setNotes] = useState({}); // { [stopKey]: body }
  const [savedFlash, setSavedFlash] = useState(null);
  const [data, setData] = useState(() => buildInitialData());
  const [endPending, setEndPending] = useState(false);

  // --- Refs (preserve production UX for the Saved flash + two-click End) ---
  const debounceRef = useRef(null);
  const savedFlashTimerRef = useRef(null);
  const endDisarmRef = useRef(null);

  const meeting = MOCK_MEETING;

  // Clean up pending timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
      if (endDisarmRef.current) clearTimeout(endDisarmRef.current);
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

  // --- Mock note save — local state only, fake debounce to preserve Saved flash UX ---
  const handleNoteChange = useCallback((stopKey, text) => {
    setNotes((n) => ({ ...n, [stopKey]: text }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSavedFlash(stopKey);
      if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
      savedFlashTimerRef.current = setTimeout(() => setSavedFlash(null), 1500);
    }, DEBOUNCE_MS);
  }, []);

  // --- Mock override result — pure local state update ---
  const handleOverrideResult = useCallback((partner, kpiId, newResult) => {
    setData((prev) => {
      const sc = prev[partner].scorecard;
      const prior = sc.kpi_results[kpiId] ?? { label: '', result: null, reflection: '' };
      return {
        ...prev,
        [partner]: {
          ...prev[partner],
          scorecard: {
            ...sc,
            admin_override_at: new Date().toISOString(),
            kpi_results: {
              ...sc.kpi_results,
              [kpiId]: { ...prior, result: newResult },
            },
          },
        },
      };
    });
  }, []);

  // --- Mock reflection change — pure local state update ---
  const handleReflectionChange = useCallback((partner, kpiId, text) => {
    setData((prev) => {
      const sc = prev[partner].scorecard;
      const prior = sc.kpi_results[kpiId] ?? { label: '', result: null, reflection: '' };
      return {
        ...prev,
        [partner]: {
          ...prev[partner],
          scorecard: {
            ...sc,
            kpi_results: {
              ...sc.kpi_results,
              [kpiId]: { ...prior, reflection: text },
            },
          },
        },
      };
    });
  }, []);

  // --- End Meeting (two-click arm/confirm) — on confirm navigate back to /admin/test ---
  const handleEndClick = useCallback(() => {
    if (!endPending) {
      setEndPending(true);
      if (endDisarmRef.current) clearTimeout(endDisarmRef.current);
      endDisarmRef.current = setTimeout(() => setEndPending(false), END_DISARM_MS);
      return;
    }
    if (endDisarmRef.current) clearTimeout(endDisarmRef.current);
    navigate('/admin/test');
  }, [endPending, navigate]);

  const currentStopKey = STOPS[stopIndex];
  const weekLabel = formatWeekRange(meeting.week_of);

  return (
    <div className="meeting-shell">
      {/* === Header === */}
      <div className="meeting-shell-header">
        <div className="meeting-progress-pill">
          {MEETING_COPY.progressPill(stopIndex + 1, STOPS.length)}
        </div>
        <span className="eyebrow" style={{ color: 'var(--gold)', fontSize: 11 }}>
          MOCK
        </span>
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
          {endPending ? MEETING_COPY.endConfirmBtn : MEETING_COPY.endBtn}
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
                  Edited by admin {new Date(override).toLocaleString()}
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
