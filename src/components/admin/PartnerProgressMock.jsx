import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';
import { getPerformanceColor } from '../../lib/seasonStats.js';
import { PROGRESS_COPY, GROWTH_STATUS_COPY } from '../../data/content.js';

const MOCK_KPI_STATS = [
  { id: 'mock-kpi-1', label: 'Close 3 new enterprise deals', hitRate: 83, hits: 5, possible: 6 },
  { id: 'mock-kpi-2', label: 'Ship weekly product update', hitRate: 50, hits: 3, possible: 6 },
  { id: 'mock-kpi-3', label: 'Hold 5 client check-ins', hitRate: 33, hits: 2, possible: 6 },
];

const MOCK_SEASON_HIT_RATE = 56; // overall across all 3 KPIs

const MOCK_STREAKS = [
  { id: 'mock-kpi-1', label: 'Close 3 new enterprise deals', streak: 0 },
  { id: 'mock-kpi-2', label: 'Ship weekly product update', streak: 0 },
  { id: 'mock-kpi-3', label: 'Hold 5 client check-ins', streak: 3 },
];

const MOCK_WEEK_NUMBER = 8;

const MOCK_GROWTH = [
  {
    id: 'mock-gp-1',
    type: 'personal',
    description: 'Run a half marathon by end of Q2',
    status: 'active',
    admin_note: null,
  },
  {
    id: 'mock-gp-2',
    type: 'business',
    description: 'Establish repeatable enterprise sales playbook',
    status: 'achieved',
    admin_note: 'Great progress — the playbook doc is solid. Share it with the team next Monday.',
  },
  {
    id: 'mock-gp-3',
    type: 'business',
    description: 'Launch customer advisory board',
    status: 'active',
    admin_note: 'Three customers confirmed. Need two more before the first session.',
  },
];

const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

export default function PartnerProgressMock() {
  const copy = PROGRESS_COPY.progressPage;

  const chartData = MOCK_KPI_STATS.map((k) => ({
    label: k.label.length > 28 ? k.label.slice(0, 27) + '\u2026' : k.label,
    fullLabel: k.label,
    hitRate: k.hitRate,
    color: getPerformanceColor(k.hitRate),
    streak: MOCK_STREAKS.find((s) => s.id === k.id)?.streak ?? 0,
  }));

  return (
    <div className="app-shell">
      <div className="container">
        <motion.div className="screen" {...motionProps}>
          <div className="nav-row" style={{ marginBottom: 12 }}>
            <Link to="/admin/test" className="btn-ghost">{copy.backNav}</Link>
          </div>

          {/* Overview section */}
          <div className="progress-overview">
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>
              {copy.mockEyebrow} {'\u00B7'} {copy.eyebrow}
            </span>
            <div className="progress-stat-display">
              <span className="progress-stat-value" style={{ color: getPerformanceColor(MOCK_SEASON_HIT_RATE) }}>
                {MOCK_SEASON_HIT_RATE}%
              </span>
              <span className="progress-stat-label">{copy.statLabel}</span>
            </div>
            <div className="progress-week-indicator">
              {PROGRESS_COPY.hubCard.weekFmt(MOCK_WEEK_NUMBER)}
            </div>
          </div>

          {/* Chart section */}
          <div className="progress-chart">
            <h3 className="progress-section-heading">{copy.chartHeading}</h3>
            <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 48)}>
              <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 12, fill: 'var(--muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}
                  formatter={(value) => [`${value}%`, 'Hit Rate']}
                  labelFormatter={(label) => {
                    const match = chartData.find((d) => d.label === label);
                    return match?.fullLabel ?? label;
                  }}
                />
                <Bar dataKey="hitRate" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                  <LabelList dataKey="hitRate" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 12, fontWeight: 700, fill: 'var(--text)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {chartData.some((d) => d.streak >= 2) && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {chartData.filter((d) => d.streak >= 2).map((d) => (
                  <span key={d.fullLabel} style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {d.fullLabel}: {copy.streakBadge(d.streak)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Growth priorities */}
          <div style={{ marginBottom: 24 }}>
            <h3 className="progress-section-heading">{copy.growthHeading}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MOCK_GROWTH.map((gp, i) => {
                const groupLabel = gp.type === 'personal'
                  ? 'PERSONAL GROWTH'
                  : `BUSINESS GROWTH ${MOCK_GROWTH.filter((g, j) => g.type === 'business' && j <= i).length} of ${MOCK_GROWTH.filter((g) => g.type === 'business').length}`;
                const statusKey = gp.status || 'active';
                return (
                  <div key={gp.id} className="progress-growth-card">
                    <span className="eyebrow" style={{ color: 'var(--gold)' }}>{groupLabel}</span>
                    <p style={{ margin: '4px 0 8px', color: 'var(--text)' }}>{gp.description}</p>
                    <span className={`progress-growth-status-badge progress-growth-status--${statusKey}`}>
                      {GROWTH_STATUS_COPY[statusKey] || statusKey}
                    </span>
                    {gp.admin_note && (
                      <div className="progress-growth-note">
                        <span className="progress-growth-note-label">{copy.traceNoteLabel}</span>
                        <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--muted)', lineHeight: 1.6 }}>
                          {gp.admin_note}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
