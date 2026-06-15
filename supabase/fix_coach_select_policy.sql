-- Allow coaches to read all athlete rows (fixes empty coach dashboard)
create policy "athletes_coach_select" on public.athletes for select
  using (
    exists (select 1 from public.coaches where id = auth.uid())
    or id = auth.uid()
  );

-- Allow coaches to read all profiles (needed for athlete name/initials/avatar)
create policy "profiles_coach_select" on public.profiles for select
  using (
    exists (select 1 from public.coaches where id = auth.uid())
    or id = auth.uid()
  );

-- Allow athletes to read their coach's profile (for messages)
create policy "profiles_athlete_select" on public.profiles for select
  using (id = auth.uid());
