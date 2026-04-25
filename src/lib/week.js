// --- Week Identity Helpers (Phase 3, updated Phase 17) ---
// CRITICAL: All helpers use local-time year/month/date arithmetic.
// NEVER use UTC ISO-string slicing (Date#to-ISO-String) — that produces a UTC string
// and breaks late-night edits west of UTC. See 03-RESEARCH.md Week Identity Model.
// Phase 17: week boundary is Saturday 23:59 local; Sunday belongs to the NEXT week's cycle.

/**
 * Returns the Monday of the week containing `d` as a 'YYYY-MM-DD' string in local time.
 * Phase 17 D-04: Sunday (day=0) maps to NEXT Monday (today + 1), not last Monday.
 * Mon→Mon (this week), Tue→Mon (this week), …, Sat→Mon (this week), Sun→Mon (NEXT week).
 * @param {Date} [d=new Date()]
 * @returns {string} 'YYYY-MM-DD'
 */
export function getMondayOf(d = new Date()) {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const mon = new Date(d);
  if (day === 0) {
    // Sunday belongs to NEXT week's cycle (Phase 17 D-04)
    mon.setDate(d.getDate() + 1);
  } else {
    mon.setDate(d.getDate() - (day - 1));
  }
  mon.setHours(0, 0, 0, 0);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Returns the local-time Saturday 23:59:59.999 that ends the week starting at mondayStr.
 * Phase 17 D-04: cutoff shifted from Sunday end (d+6) to Saturday end (d+5).
 * @param {string} mondayStr e.g. '2026-04-06'
 * @returns {Date}
 */
export function getSaturdayEndOf(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  return new Date(y, m - 1, d + 5, 23, 59, 59, 999);
}

/**
 * Returns true iff `now` is strictly after the Saturday 23:59:59.999 end of the given Monday's week.
 * Phase 17: cutoff is Saturday end (was Sunday end pre-Phase-17). Used to derive the auto-close
 * client-side — no cron, no scheduled job.
 * @param {string} mondayStr e.g. '2026-04-06'
 * @param {Date} [now=new Date()] optional now for test ergonomics
 * @returns {boolean}
 */
export function isWeekClosed(mondayStr, now = new Date()) {
  return now > getSaturdayEndOf(mondayStr);
}

/**
 * Phase 17 D-02: returns the effective KPI result accounting for Saturday close.
 * - 'pending' + week closed → 'no' (display-only coercion; no DB write)
 * - any other raw value → pass through unchanged
 *
 * Per researcher Q2 recommendation: NO defensive validation for unknown raw values.
 * The helper has one job (Pending coercion); future enums pass through cleanly.
 *
 * @param {string|null|undefined} rawResult e.g. 'yes' | 'no' | 'pending' | null
 * @param {string} weekOf 'YYYY-MM-DD' Monday string
 * @param {Date} [now=new Date()]
 * @returns {string|null|undefined}
 */
export function effectiveResult(rawResult, weekOf, now = new Date()) {
  if (rawResult === 'pending' && isWeekClosed(weekOf, now)) {
    return 'no';
  }
  return rawResult;
}

/**
 * Formats a week range as 'Mon X – Sat Y' (6 days). Phase 17 D-03: shrunk from Mon–Sun.
 * @param {string} mondayStr e.g. '2026-04-06'
 * @returns {string} e.g. 'Apr 6 – Apr 11'
 */
export function formatWeekRange(mondayStr) {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  const sat = new Date(y, m - 1, d + 5);
  const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sat)}`; // en dash with surrounding spaces
}
