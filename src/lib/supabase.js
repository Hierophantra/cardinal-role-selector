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
