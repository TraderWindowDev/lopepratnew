-- Add target pace and coach note to plan days
-- target_pace: shown in the metrics bar (e.g. "5:20/km", "6:30-7:00/km")
-- coach_note: shown in the Coach's Note card on the workout detail screen
alter table public.plan_days add column if not exists target_pace text;
alter table public.plan_days add column if not exists coach_note text;
