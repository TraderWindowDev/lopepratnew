import { supabase } from '../supabase';

export type DayInput = {
  dayIndex: number;
  dayLabel: string;
  workoutType: string;
  title: string;
  km?: number;
  notes?: string;
  targetPace?: string;
  coachNote?: string;
};

export type WeekInput = {
  weekIndex: number;
  phase: string;
  focus: string;
  totalKm: number;
  days: DayInput[];
};

export type PlanInput = {
  name: string;
  description: string;
  totalWeeks: number;
  targetGoal: string | null;
  weeks: WeekInput[];
};

export async function fetchAllPlans() {
  const { data, error } = await supabase
    .from('training_plans')
    .select(`
      *,
      plan_weeks (
        *,
        plan_days (*)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAthletePlan(athleteId: string) {
  const { data, error } = await supabase
    .from('athletes')
    .select(`
      assigned_plan_id,
      current_plan_week_index,
      training_plans:assigned_plan_id (
        id, name, description, total_weeks, target_goal, created_at,
        plan_weeks (
          id, week_index, phase, focus, total_km,
          plan_days (
            id, day_index, day_label, workout_type, title, km, notes
          )
        )
      )
    `)
    .eq('id', athleteId)
    .single();
  if (error) throw error;
  return data;
}

export async function createPlan(plan: PlanInput): Promise<string> {
  const { data: planRow, error: planErr } = await supabase
    .from('training_plans')
    .insert({
      name: plan.name,
      description: plan.description,
      total_weeks: plan.totalWeeks,
      target_goal: plan.targetGoal,
    })
    .select('id')
    .single();
  if (planErr) throw planErr;

  for (const week of plan.weeks) {
    const { data: weekRow, error: weekErr } = await supabase
      .from('plan_weeks')
      .insert({
        plan_id: planRow.id,
        week_index: week.weekIndex,
        phase: week.phase,
        focus: week.focus,
        total_km: week.totalKm,
      })
      .select('id')
      .single();
    if (weekErr) throw weekErr;

    const { error: daysErr } = await supabase.from('plan_days').insert(
      week.days.map((d) => ({
        week_id: weekRow.id,
        day_index: d.dayIndex,
        day_label: d.dayLabel,
        workout_type: d.workoutType,
        title: d.title,
        km: d.km ?? null,
        notes: d.notes ?? null,
        target_pace: d.targetPace ?? null,
        coach_note: d.coachNote ?? null,
      }))
    );
    if (daysErr) throw daysErr;
  }

  return planRow.id;
}

export async function assignPlan(athleteId: string, planId: string) {
  const { error } = await supabase
    .from('athletes')
    .update({ assigned_plan_id: planId, current_plan_week_index: 0 })
    .eq('id', athleteId);
  if (error) throw error;
}

// Deep-copies a template plan then assigns the copy to the athlete,
// so editing one athlete's plan never affects another athlete.
export async function copyAndAssignPlan(athleteId: string, planId: string): Promise<void> {
  const { data, error } = await supabase
    .from('training_plans')
    .select(`
      name, description, total_weeks, target_goal,
      plan_weeks (
        week_index, phase, focus, total_km,
        plan_days (
          day_index, day_label, workout_type, title, km, notes, target_pace, coach_note
        )
      )
    `)
    .eq('id', planId)
    .single();
  if (error) throw error;

  const planInput: PlanInput = {
    name: data.name,
    description: data.description ?? '',
    totalWeeks: data.total_weeks,
    targetGoal: data.target_goal ?? null,
    weeks: (data.plan_weeks as any[])
      .sort((a: any, b: any) => a.week_index - b.week_index)
      .map((w: any) => ({
        weekIndex: w.week_index,
        phase: w.phase,
        focus: w.focus ?? '',
        totalKm: w.total_km,
        days: (w.plan_days as any[])
          .sort((a: any, b: any) => a.day_index - b.day_index)
          .map((d: any) => ({
            dayIndex: d.day_index,
            dayLabel: d.day_label,
            workoutType: d.workout_type,
            title: d.title,
            km: d.km ?? undefined,
            notes: d.notes ?? undefined,
            targetPace: d.target_pace ?? undefined,
            coachNote: d.coach_note ?? undefined,
          })),
      })),
  };

  const newPlanId = await createPlan(planInput);
  await assignPlan(athleteId, newPlanId);
}

export async function unassignPlan(athleteId: string) {
  const { error } = await supabase
    .from('athletes')
    .update({ assigned_plan_id: null, current_plan_week_index: 0 })
    .eq('id', athleteId);
  if (error) throw error;
}

export async function advancePlanWeek(athleteId: string, weekIndex: number) {
  const { error } = await supabase
    .from('athletes')
    .update({ current_plan_week_index: weekIndex })
    .eq('id', athleteId);
  if (error) throw error;
}

export async function updatePlan(planId: string, plan: PlanInput): Promise<void> {
  const { error: planErr } = await supabase
    .from('training_plans')
    .update({
      name: plan.name,
      description: plan.description,
      total_weeks: plan.totalWeeks,
      target_goal: plan.targetGoal,
    })
    .eq('id', planId);
  if (planErr) throw planErr;

  // Delete existing weeks (cascades to plan_days)
  const { error: delErr } = await supabase
    .from('plan_weeks')
    .delete()
    .eq('plan_id', planId);
  if (delErr) throw delErr;

  // Re-insert weeks and days
  for (const week of plan.weeks) {
    const { data: weekRow, error: weekErr } = await supabase
      .from('plan_weeks')
      .insert({
        plan_id: planId,
        week_index: week.weekIndex,
        phase: week.phase,
        focus: week.focus,
        total_km: week.totalKm,
      })
      .select('id')
      .single();
    if (weekErr) throw weekErr;

    const { error: daysErr } = await supabase.from('plan_days').insert(
      week.days.map((d) => ({
        week_id: weekRow.id,
        day_index: d.dayIndex,
        day_label: d.dayLabel,
        workout_type: d.workoutType,
        title: d.title,
        km: d.km ?? null,
        notes: d.notes ?? null,
        target_pace: d.targetPace ?? null,
        coach_note: d.coachNote ?? null,
      }))
    );
    if (daysErr) throw daysErr;
  }
}
