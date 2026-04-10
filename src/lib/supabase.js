import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);

export async function upsertSubmission(record) {
  const { data, error } = await supabase
    .from('submissions')
    .upsert(record, { onConflict: 'partner' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchSubmissions() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSubmission(partner) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('partner', partner)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --- Accountability tables (Phase 1+) ---

export async function fetchKpiTemplates() {
  const { data, error } = await supabase
    .from('kpi_templates')
    .select('*')
    .order('category', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchKpiSelections(partner) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .select('*')
    .eq('partner', partner)
    .order('selected_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertKpiSelection(record) {
  const { data, error } = await supabase
    .from('kpi_selections')
    .upsert(record, { onConflict: 'partner,template_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteKpiSelection(id) {
  const { error } = await supabase
    .from('kpi_selections')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchGrowthPriorities(partner) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .select('*')
    .eq('partner', partner)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertGrowthPriority(record) {
  const { data, error } = await supabase
    .from('growth_priorities')
    .upsert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchScorecard(partner, weekOf) {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('partner', partner)
    .eq('week_of', weekOf)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertScorecard(record) {
  const { data, error } = await supabase
    .from('scorecards')
    .upsert(record, { onConflict: 'partner,week_of' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- KPI Selection (Phase 2) ---

export async function fetchGrowthPriorityTemplates() {
  const { data, error } = await supabase
    .from('growth_priority_templates')
    .select('*')
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function lockKpiSelections(partner) {
  const lockedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const { error: e1 } = await supabase
    .from('kpi_selections')
    .update({ locked_until: lockedUntil })
    .eq('partner', partner);
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('growth_priorities')
    .update({ locked_until: lockedUntil })
    .eq('partner', partner);
  if (e2) throw e2;
  return lockedUntil;
}
