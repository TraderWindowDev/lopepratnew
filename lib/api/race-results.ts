import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface RaceResult {
  id: string;
  athleteId: string;
  raceName: string;
  raceDate: string;
  distance?: string;
  finishTime?: string;
  categoryPlace?: string;
  overallPlace?: string;
  notes?: string;
}

export async function upsertRaceResult(
  athleteId: string,
  result: Omit<RaceResult, 'id' | 'athleteId'>
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('race_results')
    .upsert({
      athlete_id: athleteId,
      race_name: result.raceName,
      race_date: result.raceDate,
      distance: result.distance ?? null,
      finish_time: result.finishTime ?? null,
      category_place: result.categoryPlace ?? null,
      overall_place: result.overallPlace ?? null,
      notes: result.notes ?? null,
    }, { onConflict: 'athlete_id,race_date,race_name' })
    .select('id')
    .single();
  if (error) { console.warn('[race_results] upsert:', error.message); return null; }
  return data?.id ?? null;
}

export async function fetchRaceResults(athleteId: string): Promise<RaceResult[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('race_results')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('race_date', { ascending: false });
  if (error) { console.warn('[race_results] fetch:', error.message); return []; }
  return (data ?? []).map((r) => ({
    id: r.id,
    athleteId: r.athlete_id,
    raceName: r.race_name,
    raceDate: r.race_date,
    distance: r.distance ?? undefined,
    finishTime: r.finish_time ?? undefined,
    categoryPlace: r.category_place ?? undefined,
    overallPlace: r.overall_place ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

export async function deleteRaceResult(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('race_results').delete().eq('id', id);
}
