import { supabase } from '../supabase';

export type WorkoutLogInput = {
  athleteId: string;
  planId?: string;
  planDayId?: string;
  weekIndex?: number;
  dayIndex?: number;
  distance?: number;
  durationMinutes?: number;
  avgPace?: string;
  avgHr?: number;
  elevGain?: number;
  effortRating?: number;
  notes?: string;
};

export async function logWorkout(input: WorkoutLogInput) {
  const { data, error } = await supabase
    .from('workout_logs')
    .insert({
      athlete_id: input.athleteId,
      plan_id: input.planId ?? null,
      plan_day_id: input.planDayId ?? null,
      week_index: input.weekIndex ?? null,
      day_index: input.dayIndex ?? null,
      distance: input.distance ?? null,
      duration_minutes: input.durationMinutes ?? null,
      avg_pace: input.avgPace ?? null,
      avg_hr: input.avgHr ?? null,
      elev_gain: input.elevGain ?? null,
      effort_rating: input.effortRating ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchWorkoutLogs(athleteId: string, limit = 20) {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('logged_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchWeekLogs(athleteId: string, weekIndex: number) {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('week_index', weekIndex);
  if (error) throw error;
  return data ?? [];
}
