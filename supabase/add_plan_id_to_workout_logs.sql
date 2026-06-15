-- Tag each workout log with the plan it was completed under.
-- Existing logs get NULL (won't match any new plan's completion query).
alter table public.workout_logs
  add column if not exists plan_id uuid references public.training_plans(id) on delete set null;

create index if not exists workout_logs_plan_id_idx on public.workout_logs(plan_id);
