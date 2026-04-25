import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts';
import { fetchKpiSelections, fetchScorecards, fetchGrowthPriorities, fetchBusinessPriorities } from '../lib/supabase.js';
import { computeSeasonStats, computeStreaks, computeWeekNumber, getPerformanceColor } from '../lib/seasonStats.js';
import { VALID_PARTNERS, PARTNER_DISPLAY, PROGRESS_COPY, GROWTH_STATUS_COPY } from '../data/content.js';
import BusinessPrioritiesSection from './BusinessPrioritiesSection.jsx';

const motionProps = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: 'easeOut' },
};

export default function PartnerProgress() {
  const { partner } = useParams();
  const navigate = useNavigate();
  const [kpiSelections, setKpiSelections] = useState([]);
  const [scorecards, setScorecards] = useState([]);
  const [growthPriorities, setGrowthPriorities] = useState([]);
  // UAT (post-D2): mirror PartnerHub's business-priorities surface here so the
  // Season Overview page shows the same shared focus areas alongside personal
  // growth status. null = still loading; [] = loaded but empty (rare per
  // migration 011 seeding).
  const [businessPriorities, setBusinessPriorities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!VALID_PARTNERS.includes(partner)) {
      navigate('/', { replace: true });
      return;
    }
    Promise.all([
      fetchKpiSelections(partner),
      fetchScorecards(partner),
      fetchGrowthPriorities(partner),
      fetchBusinessPriorities(),
    ])
      .then(([sels, cards, growth, biz]) => {
        setKpiSelections(sels);
        setScorecards(cards);
        setGrowthPriorities(growth);
        setBusinessPriorities(biz);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [partner]);

  // Derived stats
  const seasonStats = useMemo(
    () => computeSeasonStats(kpiSelections, scorecards),
    [kpiSelections, scorecards]
  );
  const streaks = useMemo(
    () => computeStreaks(kpiSelections, scorecards),
    [kpiSelections, scorecards]
  );
  const weekNumber = useMemo(() => computeWeekNumber(), []);
  const committedCount = scorecards.filter((s) => s.committed_at).length;
  const copy = PROGRESS_COPY.progressPage;

  if (loading) return null;

  // Back nav
  const backNav = (
    <div className="nav-row" style={{ marginBottom: 12 }}>
      <Link to={`/hub/${partner}`} className="btn-ghost">{copy.backNav}</Link>
    </div>
  );

  // Error state
  if (loadError) {
    return (
      <div className="app-shell">
        <div className="container">
          <div className="screen fade-in">
            {backNav}
            <p style={{ color: 'var(--miss)' }}>{copy.loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state — KPIs locked but no committed scorecards
  if (committedCount === 0) {
    return (
      <div className="app-shell">
        <div className="container">
          <motion.div className="screen" {...motionProps}>
            {backNav}
            <div className="progress-empty">
              <span className="eyebrow" style={{ color: 'var(--gold)' }}>NO DATA YET</span>
              <h3>{copy.emptyHeading}</h3>
              <p style={{ color: 'var(--muted)' }}>{copy.emptyBody}</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Chart data — per D-06 horizontal bars, D-07 performance colors, D-10 streak badges
  const chartData = seasonStats.perKpiStats.map((k) => {
    const streakObj = streaks.find((s) => s.id === k.id);
    return {
      label: k.label.length > 28 ? k.label.slice(0, 27) + '\u2026' : k.label,
      fullLabel: k.label,
      hitRate: k.hitRate ?? 0,
      color: getPerformanceColor(k.hitRate),
      streak: streakObj?.streak ?? 0,
    };
  });

  // Full render
  return (
    <div className="app-shell">
      <div className="container">
        <motion.div className="screen" {...motionProps}>
          {backNav}

          {/* Section 1: Season Overview (D-14 order: Overview > Chart > Growth)
              UAT (post-D2): when seasonHitRate is null, getPerformanceColor returns
              var(--border) (#2e2e2e) which is invisible against the dark surface.
              Fall back to var(--text) so the em-dash placeholder reads cleanly. */}
          <div className="progress-overview">
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>{copy.eyebrow}</span>
            <div className="progress-stat-display">
              <span
                className="progress-stat-value"
                style={{
                  color:
                    seasonStats.seasonHitRate !== null
                      ? getPerformanceColor(seasonStats.seasonHitRate)
                      : 'var(--text)',
                }}
              >
                {seasonStats.seasonHitRate !== null ? `${seasonStats.seasonHitRate}%` : '\u2014'}
              </span>
              <span className="progress-stat-label">{copy.statLabel}</span>
            </div>
            <div className="progress-week-indicator">
              {PROGRESS_COPY.hubCard.weekFmt(weekNumber)}
            </div>
          </div>

          {/* Section 2: Per-KPI Bar Chart (D-06, D-07, D-08, D-10) */}
          <div className="progress-chart">
            <h3 className="progress-section-heading">{copy.chartHeading}</h3>
            <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 48)}>
              <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={180}
                  /* UAT D2 follow-up: recharts passes `fill` to SVG <text> as an
                     attribute, not CSS — so `var(--text)` does NOT resolve and
                     the browser falls back to default (black on dark grey).
                     Use the literal hex value of --text (#FAFAFA) for both axis
                     ticks and LabelList. Tooltip contentStyle is HTML CSS and
                     can keep the variable. */
                  tick={{ fontSize: 13, fill: '#FAFAFA' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    color: 'var(--text)',
                    maxWidth: 320,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.4,
                  }}
                  wrapperStyle={{ maxWidth: 320, whiteSpace: 'normal' }}
                  labelStyle={{ color: 'var(--gold)', fontWeight: 700, marginBottom: 4 }}
                  itemStyle={{ color: 'var(--text)', whiteSpace: 'normal' }}
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
                  <LabelList
                    dataKey="hitRate"
                    position="right"
                    formatter={(v) => `${v}%`}
                    /* UAT D2: 13px (was 12px) for hit-rate values next to bars.
                       Use literal hex (--text resolved) — SVG attribute fill does
                       not understand CSS variables. */
                    style={{ fontSize: 13, fontWeight: 700, fill: '#FAFAFA' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Inline streak badges below chart (D-10).
                UAT D2: bump from 12px muted to 13px text-colored so streak
                callouts read cleanly under the chart. Streak label stays
                gold (kept inline elsewhere for emphasis). */}
            {chartData.some((d) => d.streak >= 2) && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {chartData.filter((d) => d.streak >= 2).map((d) => (
                  <span key={d.fullLabel} style={{ fontSize: 13, color: 'var(--text)' }}>
                    {d.fullLabel}: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{copy.streakBadge(d.streak)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Growth Priority Status Cards (D-14, D-15) */}
          {growthPriorities.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 className="progress-section-heading">{copy.growthHeading}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {growthPriorities.map((gp, i) => {
                  const groupLabel = gp.type === 'personal'
                    ? 'PERSONAL GROWTH'
                    : `BUSINESS GROWTH ${growthPriorities.filter((g, j) => g.type === 'business' && j <= i).length} of ${growthPriorities.filter((g) => g.type === 'business').length}`;
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
          )}

          {/* Section 4: Business Priorities (UAT post-D2 — mirror PartnerHub).
              Same shared component as PartnerHub + AdminProfile (Phase 18 BIZ-02);
              renders nothing while still loading (priorities === null). */}
          <BusinessPrioritiesSection priorities={businessPriorities} />
        </motion.div>
      </div>
    </div>
  );
}
