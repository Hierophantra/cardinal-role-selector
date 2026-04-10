// --- Week Identity Helpers (Phase 3) ---
// CRITICAL: All helpers use local-time year/month/date arithmetic.
// NEVER use UTC ISO-string slicing (Date#to-ISO-String) — that produces a UTC string
// and breaks Sunday-night edits west of UTC. See 03-RESEARCH.md Week Identity Model.

/**
 * Returns the Monday-of-week for a given date as a 'YYYY-MM-DD' local-time string.
 * Monday = start of week (D-08). Sunday maps to the Monday 6 days prior.
 * @param {Date} [d=new Date()] Source date; defaults to now.
 * @returns {string} e.g. '2026-04-06'
 */
export function getMondayOf(d = new Date()) {
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Given a Monday-of-week 'YYYY-MM-DD' string, returns a Date at Sunday 23:59:59.999 local time.
 * @param {string} mondayStr e.g. '2026-04-06'
 * @returns {Date}
 */
export function getSundayEndOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  return new Date(y, m - 1, d + 6, 23, 59, 59, 999);
}

/**
 * Returns true iff today is strictly after the Sunday end of the given Monday's week.
 * Used to derive D-13 auto-close client-side — no cron, no scheduled job.
 * @param {string} mondayStr e.g. '2026-04-06'
 * @returns {boolean}
 */
export function isWeekClosed(mondayStr) {
  return new Date() > getSundayEndOf(mondayStr);
}

/**
 * Formats a Monday 'YYYY-MM-DD' string as a human-readable week range,
 * e.g. 'Mar 3 – Mar 9' (en dash with surrounding spaces). Matches UI-SPEC D-23.
 * @param {string} mondayStr e.g. '2026-04-06'
 * @returns {string}
 */
export function formatWeekRange(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(y, m - 1, d + 6);
  const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} \u2013 ${fmt(sun)}`; // en dash with surrounding spaces
}
