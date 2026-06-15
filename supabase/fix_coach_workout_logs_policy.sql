-- Allow coaches to read workout logs for all their athletes
-- (needed to compute currentWeekMileage in the coach dashboard)
drop policy if exists "logs_coach_read" on public.workout_logs;
create policy "logs_coach_read" on public.workout_logs for select
  using (exists (select 1 from public.coaches where id = auth.uid()));
