import { supabase } from '../supabase';
import type { Athlete, Milestone, TrainingPlan, PlanDay, WeekPlan, Workout, WorkoutType, GoalType, WorkoutStep } from '@/constants/mock-data';

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, avatar_color, initials')
    .eq('id', userId)
    .single();
  if (error) console.warn('[supabase] profiles fetch:', error.message);
  return data;
}

export async function fetchAthleteRow(userId: string) {
  const { data, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) console.warn('[supabase] athletes fetch:', error.message);
  return data;
}

export async function fetchPlan(planId: string) {
  const { data, error } = await supabase
    .from('training_plans')
    .select(`
      id, name, description, total_weeks, target_goal, created_at,
      plan_weeks (
        id, week_index, phase, focus, total_km,
        plan_days (
          id, day_index, day_label, workout_type, title, km, notes, target_pace, coach_note, scheduled_date
        )
      )
    `)
    .eq('id', planId)
    .single();
  if (error) console.warn('[supabase] plan fetch:', error.message);
  return data;
}

export async function fetchWorkoutLogsForWeek(athleteId: string, weekIndex: number) {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('day_index, distance, duration_minutes, avg_pace, avg_hr, elev_gain, effort_rating, notes')
    .eq('athlete_id', athleteId)
    .eq('week_index', weekIndex);
  if (error) console.warn('[supabase] logs fetch:', error.message);
  return data ?? [];
}

export async function fetchAllWorkoutLogs(athleteId: string) {
  // Try with plan_id first (requires migration); fall back without it if column missing
  const { data, error } = await supabase
    .from('workout_logs')
    .select('plan_id, week_index, day_index, distance, duration_minutes, avg_pace, avg_hr, elev_gain, effort_rating, notes')
    .eq('athlete_id', athleteId)
    .order('week_index', { ascending: true });
  if (!error) return data ?? [];

  // Column probably doesn't exist yet — retry without plan_id
  console.warn('[supabase] all logs (retrying without plan_id):', error.message);
  const { data: data2, error: error2 } = await supabase
    .from('workout_logs')
    .select('week_index, day_index, distance, duration_minutes, avg_pace, avg_hr, elev_gain, effort_rating, notes')
    .eq('athlete_id', athleteId)
    .order('week_index', { ascending: true });
  if (error2) console.warn('[supabase] all logs fallback:', error2.message);
  return data2 ?? [];
}

export function parsePaceToNum(paceStr: string): number {
  // Match the first MM:SS at the start of the string — handles "5:20", "5:20/km", "6:30–7:00/km", etc.
  const m = paceStr.match(/^(\d+):(\d{2})/);
  if (!m) return 0;
  const mins = parseInt(m[1]);
  const secs = parseInt(m[2]);
  if (isNaN(mins) || isNaN(secs) || secs >= 60) return 0;
  return mins + secs / 60;
}

export function computeAthleteStats(
  logs: { week_index: number; distance: number | null; duration_minutes?: number | null; avg_pace: string | null }[],
  currentWeekIndex: number
): { currentWeekMileage: number; weeklyMileageHistory: number[]; paceHistory: { date: string; pace: number }[] } {
  const empty = { currentWeekMileage: 0, weeklyMileageHistory: [], paceHistory: [] };
  if (logs.length === 0) return empty;

  const byWeek = new Map<number, { km: number; paces: number[] }>();
  for (const log of logs) {
    const km = log.distance ?? 0;
    if (km <= 0) continue;
    const entry = byWeek.get(log.week_index) ?? { km: 0, paces: [] };
    entry.km += km;

    let paceNum = 0;
    if (log.avg_pace && log.avg_pace !== '—') {
      paceNum = parsePaceToNum(log.avg_pace);
    }
    // Fall through to duration if pace is missing or unparseable (e.g. "5km/h", range strings)
    if (paceNum <= 0 && (log.duration_minutes ?? 0) > 0 && km > 0) {
      paceNum = (log.duration_minutes as number) / km;
    }
    if (paceNum > 0) entry.paces.push(paceNum);

    byWeek.set(log.week_index, entry);
  }

  const currentWeekMileage = Math.round((byWeek.get(currentWeekIndex)?.km ?? 0) * 10) / 10;
  if (byWeek.size === 0) return { currentWeekMileage, weeklyMileageHistory: [], paceHistory: [] };

  const allWeeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
  const minWeek = allWeeks[0];
  const maxWeek = allWeeks[allWeeks.length - 1];

  const weeklyMileageHistory: number[] = [];
  const paceHistory: { date: string; pace: number }[] = [];

  for (let w = minWeek; w <= maxWeek; w++) {
    const entry = byWeek.get(w);
    weeklyMileageHistory.push(entry ? Math.round(entry.km * 10) / 10 : 0);
    if (entry && entry.paces.length > 0) {
      const avg = entry.paces.reduce((a, b) => a + b, 0) / entry.paces.length;
      paceHistory.push({ date: `W${w + 1}`, pace: Math.round(avg * 100) / 100 });
    }
  }

  return { currentWeekMileage, weeklyMileageHistory, paceHistory };
}

export function buildAthleteFromParts(
  userId: string,
  profile: { name: string; avatar_color: string; initials: string } | null,
  row: Record<string, any> | null
): Athlete {
  return {
    id: userId,
    name: profile?.name ?? 'Athlete',
    initials: profile?.initials ?? '??',
    avatarColor: profile?.avatar_color ?? '#818CF8',
    age: row?.age ?? 0,
    goal: (row?.goal ?? 'first_5k') as GoalType,
    targetRace: {
      name: row?.target_race_name ?? '',
      date: row?.target_race_date ?? '',
      location: row?.target_race_location ?? '',
    },
    fitnessLevel: (row?.fitness_level ?? 'beginner') as any,
    weeklyMileageTarget: row?.weekly_mileage_target ?? 40,
    currentWeekMileage: row?.current_week_mileage ?? 0,
    status: 'on_track' as any,
    lastActive: 'Today',
    streak: row?.streak ?? 0,
    complianceRate: row?.compliance_rate ?? 100,
    personalBests: [],
    coachNote: '',
    joinDate: row?.join_date ?? new Date().toISOString().split('T')[0],
    alerts: [],
    assignedPlanId: row?.assigned_plan_id ?? undefined,
    currentPlanWeekIndex: row?.current_plan_week_index ?? 0,
    planStartDate: row?.plan_start_date ?? undefined,
    weeklyMileageHistory: [],
    paceHistory: [],
  };
}

// ── Structured workout helpers ────────────────────────────────────────────

function swParseTime(value: string): number {
  // "MM:SS" → fractional minutes
  const m = value?.match(/^(\d+):(\d+)$/);
  return m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0;
}

function swParseDistance(value: string): number | undefined {
  const m = value?.match(/^([\d.]+)\s*km$/i);
  return m ? parseFloat(m[1]) : undefined;
}

function swHrZone(kind: string, range: string): number | undefined {
  if (kind !== 'threshold_hr') return undefined;
  if (range?.includes('Recovery')) return 1;
  if (range?.includes('Zone 2')) return 2;
  if (range?.includes('Aerobic Power')) return 4;
  if (range?.includes('Aerobic')) return 3;
  if (range?.includes('Anaerobic')) return 4;
  if (range?.includes('VO2')) return 5;
  return undefined;
}

function swBaseStepLabel(stepType: string): string {
  const map: Record<string, string> = { warmup: 'Warm Up', training: 'Training', rest: 'Rest', cooldown: 'Cool Down' };
  return map[stepType] ?? stepType;
}

function swBaseStepToWorkoutStep(sub: any, idx: number): WorkoutStep {
  const type: WorkoutStep['type'] =
    sub.stepType === 'warmup' ? 'warmup' : sub.stepType === 'cooldown' ? 'cooldown' : 'main';
  const isTimeBased = sub.targetKind !== 'distance';
  const duration = isTimeBased ? swParseTime(sub.targetValue) || undefined : undefined;
  const distance = !isTimeBased ? swParseDistance(sub.targetValue) : undefined;
  let description = swBaseStepLabel(sub.stepType);
  if (sub.targetValue) description += ` · ${sub.targetValue}`;
  if (sub.intensityKind !== 'open' && sub.intensityRange && sub.intensityRange !== '—') {
    description += ` · ${sub.intensityRange}`;
  }
  return {
    id: sub.id ?? `sw-${idx}`,
    type,
    description,
    duration,
    distance,
    heartRateZone: swHrZone(sub.intensityKind, sub.intensityRange),
  };
}

function swToWorkoutSteps(sw: any): WorkoutStep[] {
  if (!sw?.steps?.length) return [];
  return (sw.steps as any[]).map((step, i) => {
    if (step.stepType === 'interval') {
      const subDesc = (step.subSteps ?? [])
        .map((sub: any) => {
          if (!sub.targetValue) return sub.stepType === 'rest' ? '(rest)' : null;
          return sub.stepType === 'rest' ? `(${sub.targetValue})` : sub.targetValue;
        })
        .filter(Boolean)
        .join(' + ');
      return {
        id: step.id ?? `sw-${i}`,
        type: 'repeat' as const,
        description: subDesc || `${step.subSteps?.length ?? 0} steps`,
        repeats: step.repeatCount ?? 1,
        steps: (step.subSteps ?? []).map((sub: any, j: number) => swBaseStepToWorkoutStep(sub, j)),
      };
    }
    return swBaseStepToWorkoutStep(step, i);
  });
}

export function swTotalMinutes(sw: any): number {
  let total = 0;
  for (const step of sw?.steps ?? []) {
    if (step.stepType === 'interval') {
      const subMin = (step.subSteps ?? []).reduce((s: number, sub: any) => s + swParseTime(sub.targetValue), 0);
      total += subMin * (step.repeatCount ?? 1);
    } else {
      total += swParseTime(step.targetValue);
    }
  }
  return Math.round(total);
}

// ─────────────────────────────────────────────────────────────────────────────

export function buildSubtitle(d: PlanDay): string {
  if (d.structuredWorkout) {
    const totalMin = swTotalMinutes(d.structuredWorkout);
    const count = (d.structuredWorkout.steps as any[])?.length ?? 0;
    return `${count} step${count !== 1 ? 's' : ''}${totalMin > 0 ? ` · ~${totalMin} min` : ''}`;
  }
  if (d.type === 'interval' && d.notes) return d.notes;
  if (d.km && d.notes) return `${d.km} km — ${d.notes}`;
  if (d.km) return `${d.km} km`;
  return d.notes ?? '';
}

export function generateWorkoutSteps(d: PlanDay): WorkoutStep[] {
  if (d.structuredWorkout) return swToWorkoutSteps(d.structuredWorkout);
  const { type, km, notes, targetPace } = d;
  if (type === 'rest' || type === 'strength') return [];

  if (type === 'interval' && notes) {
    const m = notes.match(/^(\d+)\s*[×x]\s*([\d.]+\s*(?:km|m))\s*@?\s*([^·]*?)(?:\s*·\s*(.+))?$/i);
    if (m) {
      const reps = parseInt(m[1]);
      const distStr = m[2].trim();
      const pace = m[3]?.trim() || targetPace || '';
      const rec = m[4]?.trim();
      const distNum = parseFloat(distStr);
      const warmupKm = 3;
      return [
        { id: 's1', type: 'warmup', description: `${warmupKm} km warmup + strides`, distance: warmupKm, pace: '6:30/km' },
        {
          id: 's2', type: 'repeat', description: `${distStr}${pace ? ` @ ${pace}` : ''}`, repeats: reps,
          steps: [
            { id: 'r1', type: 'main', description: `${distStr} hard`, distance: distNum, pace: pace || undefined, heartRateZone: 5 },
            ...(rec ? [{ id: 'r2', type: 'main' as const, description: rec, duration: 1.5, pace: '7:00/km' }] : []),
          ],
        },
        { id: 's3', type: 'cooldown', description: `${warmupKm} km cooldown`, distance: warmupKm, pace: '6:30/km' },
      ];
    }
  }

  if (type === 'tempo' && notes) {
    const parts = notes.split(/\s*\+\s*/);
    if (parts.length >= 2) {
      return parts.map((part, i): WorkoutStep => {
        const distM = part.match(/(\d+(?:\.\d+)?)\s*km/i);
        const paceM = part.match(/@\s*([\d:]+\/km|MP|marathon\s*pace)/i);
        const isFirst = i === 0;
        const isLast = i === parts.length - 1;
        return {
          id: `s${i}`,
          type: isFirst ? 'warmup' : isLast ? 'cooldown' : 'main',
          description: part.trim(),
          distance: distM ? parseFloat(distM[1]) : undefined,
          pace: paceM ? paceM[1] : isFirst || isLast ? '6:30/km' : targetPace,
          heartRateZone: isFirst || isLast ? 2 : 4,
        };
      });
    }
  }

  return [{
    id: 's1',
    type: 'main',
    description: km
      ? `${km} km ${type === 'easy' ? 'easy run' : type === 'long' ? 'long run' : type}`
      : 'Workout',
    distance: km,
    pace: targetPace,
    heartRateZone: type === 'long' ? 2 : type === 'easy' ? 2 : 3,
  }];
}

export function buildPlanFromRow(planRow: any): TrainingPlan | null {
  if (!planRow) return null;
  return {
    id: planRow.id,
    name: planRow.name,
    description: planRow.description ?? '',
    totalWeeks: planRow.total_weeks,
    targetGoal: (planRow.target_goal ?? null) as GoalType | null,
    createdBy: 'Coach',
    createdAt: planRow.created_at,
    isTemplate: planRow.is_template ?? true,
    templateId: planRow.template_id ?? undefined,
    weeks: (planRow.plan_weeks ?? [])
      .sort((a: any, b: any) => a.week_index - b.week_index)
      .map((w: any) => ({
        weekIndex: w.week_index,
        phase: w.phase,
        focus: w.focus ?? '',
        totalKm: w.total_km,
        days: (w.plan_days ?? [])
          .sort((a: any, b: any) => a.day_index - b.day_index)
          .map((d: any): PlanDay => {
            const rawNotes: string | undefined = d.notes ?? undefined;
            const hasStructured = rawNotes?.startsWith('__sw__');
            let structuredWorkout: any = undefined;
            let notes: string | undefined = rawNotes;
            if (hasStructured) {
              try { structuredWorkout = JSON.parse(rawNotes!.slice(6)); } catch {}
              notes = undefined;
            }
            return {
              day: d.day_label,
              type: d.workout_type as WorkoutType,
              title: d.title,
              km: d.km ?? undefined,
              notes,
              targetPace: d.target_pace ?? undefined,
              coachNote: d.coach_note ?? undefined,
              scheduledDate: d.scheduled_date ?? undefined,
              structuredWorkout,
            };
          }),
      })),
  };
}

export function buildWeekPlanFromPlan(
  plan: TrainingPlan,
  weekIndex: number,
  logs: { day_index: number; distance: number | null; duration_minutes: number | null; avg_pace: string | null; avg_hr: number | null; elev_gain: number | null; effort_rating: number | null; notes: string | null }[]
): WeekPlan {
  const week = plan.weeks[weekIndex];
  if (!week) return emptyWeekPlan;
  const logsByDay = new Map(logs.map((l) => [l.day_index, l]));
  return {
    weekNumber: weekIndex + 1,
    phase: week.phase,
    totalKm: week.totalKm,
    workouts: week.days.map((d, i): Workout => {
      const log = logsByDay.get(i);
      return {
        id: `plan-w${weekIndex}-d${i}`,
        date: d.scheduledDate ?? new Date().toISOString().split('T')[0],
        type: d.type,
        title: d.title,
        subtitle: buildSubtitle(d),
        targetDistance: d.km,
        targetDuration: d.structuredWorkout ? swTotalMinutes(d.structuredWorkout) || undefined : undefined,
        targetPace: d.targetPace,
        steps: generateWorkoutSteps(d),
        completed: !!log,
        coachNote: d.coachNote,
        actual: log?.distance
          ? {
              distance: log.distance!,
              duration: log.duration_minutes ?? 0,
              avgPace: log.avg_pace ?? '—',
              avgHR: log.avg_hr ?? 0,
              elevGain: log.elev_gain ?? 0,
              effortRating: log.effort_rating ?? 0,
              notes: log.notes ?? '',
            }
          : undefined,
      };
    }),
  };
}

export async function fetchMilestones(userId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('id, title, description, icon, achieved, achieved_date')
    .eq('athlete_id', userId)
    .order('achieved', { ascending: true });
  if (error) console.warn('[supabase] milestones:', error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    icon: row.icon ?? 'checkmark-circle-outline',
    achieved: row.achieved ?? false,
    achievedDate: row.achieved_date ?? undefined,
  }));
}

export async function fetchPersonalBests(userId: string): Promise<Athlete['personalBests']> {
  const { data, error } = await supabase
    .from('personal_bests')
    .select('distance, time, achieved_date')
    .eq('athlete_id', userId)
    .order('achieved_date', { ascending: false });
  if (error) console.warn('[supabase] personal_bests:', error.message);
  return (data ?? []).map((row) => ({
    distance: row.distance,
    time: row.time,
    date: row.achieved_date ?? '',
  }));
}

const DEFAULT_MILESTONES = [
  { title: 'First Week Complete', description: 'Finish all sessions in your first training week', icon: 'calendar-outline' },
  { title: 'First Long Run', description: 'Complete a run over 15km', icon: 'flag-outline' },
  { title: '50km Total', description: 'Log 50km of total training distance', icon: 'map-outline' },
  { title: '7-Day Streak', description: 'Train for 7 consecutive days', icon: 'flame-outline' },
  { title: 'Race Day Ready', description: 'Complete a full race-preparation week', icon: 'trophy-outline' },
];

export async function seedDefaultMilestones(userId: string) {
  const rows = DEFAULT_MILESTONES.map((m) => ({ ...m, athlete_id: userId, achieved: false }));
  const { error } = await supabase.from('milestones').insert(rows);
  if (error) console.warn('[supabase] seed milestones:', error.message);
}

export const emptyWeekPlan: WeekPlan = {
  weekNumber: 1,
  phase: 'Getting Started',
  totalKm: 0,
  workouts: [],
};
