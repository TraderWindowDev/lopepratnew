-- Allow coaches to update athlete rows (required for plan assignment).
-- Run this in: Supabase Dashboard → SQL Editor → New query

create policy "athletes_coach_update" on public.athletes for update
  using (exists (select 1 from public.coaches where id = auth.uid()));
