// Shared composition for the per-partner 7-row KPI list used by both meeting-time
// renderers (AdminMeetingSession KpiStop) and post-meeting summary views
// (MeetingSummary B4). Mirrors Scorecard.jsx Pattern 5 composition exactly so
// kpi_results JSONB keys (template_id-keyed per the v2.0 Scorecard write contract)
// line up across all surfaces.
//
// Why a shared helper: pre-Batch-B the meeting summary fetched only one partner's
// kpi_selections (not the weekly-choice template) and rendered one cell per KPI
// row -- so admin-overrides written under template_id never matched, and the
// 7th row (the partner's weekly choice) silently vanished. Centralising the
// composition keeps these surfaces in sync.
//
// Output row shape (parallel to the meeting renderers):
//   { id, label_snapshot, kpi_templates: { mandatory, countable } }
// where `id` is the kpi_templates.id (NOT kpi_selections.id) -- same key the
// scorecard write contract uses for kpi_results.

import {
  fetchKpiTemplates,
  fetchWeeklyKpiSelection,
  fetchAdminSetting,
} from './supabase.js';
import { effectivePartnerScope } from '../data/content.js';

export async function composePartnerKpis(partner, weekOf) {
  const [templates, sel, jerryActive] = await Promise.all([
    fetchKpiTemplates(),
    fetchWeeklyKpiSelection(partner, weekOf),
    partner === 'jerry'
      ? fetchAdminSetting('jerry_sales_kpi_active').then((r) => r?.value === true).catch(() => false)
      : Promise.resolve(false),
  ]);
  const scope = effectivePartnerScope(partner);
  const matchesScope = (t) =>
    t.partner_scope === scope || t.partner_scope === 'both' || t.partner_scope === 'shared';
  const mandatoryAll = templates.filter(
    (t) => t.mandatory === true && matchesScope(t) && t.conditional === false
  );
  // Sort: shared first, then partner-specific, both groups by id ascending.
  const ranked = mandatoryAll.slice().sort((a, b) => {
    const aShared = a.partner_scope === 'both' || a.partner_scope === 'shared';
    const bShared = b.partner_scope === 'both' || b.partner_scope === 'shared';
    if (aShared !== bShared) return aShared ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
  const conditional =
    partner === 'jerry' && jerryActive
      ? templates.find((t) => t.conditional === true && t.partner_scope === 'jerry')
      : null;
  const weeklyTpl =
    sel?.kpi_template_id ? templates.find((t) => t.id === sel.kpi_template_id) : null;
  const composed = [
    ...ranked,
    ...(conditional ? [conditional] : []),
    ...(weeklyTpl ? [weeklyTpl] : []),
  ];
  return composed.map((t) => ({
    id: t.id,
    label_snapshot: t.label,
    kpi_templates: { mandatory: t.mandatory, countable: t.countable },
  }));
}
