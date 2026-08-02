import { supabase } from '../supabase';
import type { Athlete, AthleteStatus, GoalType } from '@/constants/mock-data';

export async function fetchAllAthletes(): Promise<Athlete[]> {
  const { data: rows, error } = await supabase
    .from('athletes')
    .select(`
      *,
      profile:profiles!athletes_id_fkey (name, avatar_color, initials)
    `);

  if (error) {
    console.warn('[supabase] fetchAllAthletes:', error.message);
    return [];
  }
  if (!rows?.length) return [];

  // Fetch all workout logs in one query so we can compute live mileage per athlete
  const athleteIds = rows.map((r) => r.id);
  const { data: logs } = await supabase
    .from('workout_logs')
    .select('athlete_id, week_index, distance')
    .in('athlete_id', athleteIds);

  // Group total km by athlete → week
  const mileageMap = new Map<string, Map<number, number>>();
  for (const log of logs ?? []) {
    if (!mileageMap.has(log.athlete_id)) mileageMap.set(log.athlete_id, new Map());
    const wMap = mileageMap.get(log.athlete_id)!;
    wMap.set(log.week_index, (wMap.get(log.week_index) ?? 0) + (log.distance ?? 0));
  }

  return rows.map((row): Athlete => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    const weekIdx = row.current_plan_week_index ?? 0;
    const wMap = mileageMap.get(row.id);
    const currentWeekMileage = wMap
      ? Math.round((wMap.get(weekIdx) ?? 0) * 10) / 10
      : 0;

    return {
      id: row.id,
      name: profile?.name ?? 'Athlete',
      initials: profile?.initials ?? '??',
      avatarColor: profile?.avatar_color ?? '#818CF8',
      age: row.age ?? 0,
      goal: (row.goal ?? 'first_5k') as GoalType,
      targetRace: {
        name: row.target_race_name ?? '',
        date: row.target_race_date ?? '',
        location: row.target_race_location ?? '',
      },
      fitnessLevel: (row.fitness_level ?? 'beginner') as any,
      weeklyMileageTarget: row.weekly_mileage_target ?? 40,
      currentWeekMileage,
      status: (row.status ?? 'on_track') as AthleteStatus,
      lastActive: 'Today',
      streak: row.streak ?? 0,
      complianceRate: row.compliance_rate ?? 100,
      personalBests: [],
      coachNote: '',
      joinDate: row.join_date ?? new Date().toISOString().split('T')[0],
      alerts: [],
      assignedPlanId: row.assigned_plan_id ?? undefined,
      currentPlanWeekIndex: weekIdx,
      planStartDate: row.plan_start_date ?? undefined,
      weeklyMileageHistory: [],
      paceHistory: [],
    };
  });
}
