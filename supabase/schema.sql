-- Lopeprat Coaching — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ─── Tables ───────────────────────────────────────────────────────

create table public.profiles (
  id uuid references auth.users primary key,
  name text not null,
  role text not null check (role in ('athlete', 'coach')),
  avatar_color text not null default '#818CF8',
  initials text not null,
  created_at timestamptz not null default now()
);

create table public.coaches (
  id uuid references public.profiles primary key,
  bio text
);

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  total_weeks integer not null,
  target_goal text,
  created_by uuid references public.coaches,
  created_at timestamptz default now()
);

create table public.athletes (
  id uuid references public.profiles primary key,
  age integer,
  goal text check (goal in ('first_5k','first_10k','first_half','first_marathon','pb_half','pb_marathon')),
  fitness_level text check (fitness_level in ('beginner','intermediate','advanced')),
  target_race_name text,
  target_race_date date,
  target_race_location text,
  weekly_mileage_target integer default 40,
  current_week_mileage numeric default 0,
  streak integer default 0,
  compliance_rate integer default 100,
  assigned_plan_id uuid references public.training_plans,
  current_plan_week_index integer default 0,
  is_onboarded boolean default false,
  join_date date default current_date
);

create table public.plan_weeks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.training_plans on delete cascade,
  week_index integer not null,
  phase text not null,
  focus text,
  total_km numeric not null,
  unique (plan_id, week_index)
);

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references public.plan_weeks on delete cascade,
  day_index integer not null check (day_index between 0 and 6),
  day_label text not null,
  workout_type text not null,
  title text not null,
  km numeric,
  notes text
);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athletes,
  plan_day_id uuid references public.plan_days,
  week_index integer,
  day_index integer,
  logged_at timestamptz default now(),
  distance numeric,
  duration_minutes integer,
  avg_pace text,
  avg_hr integer,
  elev_gain integer,
  effort_rating integer check (effort_rating between 1 and 10),
  notes text
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles,
  athlete_id uuid references public.athletes,
  text text not null,
  is_coach boolean not null,
  created_at timestamptz default now()
);

create table public.coaching_notes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.coaches,
  athlete_id uuid references public.athletes,
  content text not null,
  created_at timestamptz default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athletes,
  title text not null,
  description text,
  icon text,
  achieved boolean default false,
  achieved_date date
);

create table public.personal_bests (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athletes,
  distance text not null,
  time text not null,
  achieved_date date
);

-- ─── Row Level Security ───────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.athletes enable row level security;
alter table public.coaches enable row level security;
alter table public.training_plans enable row level security;
alter table public.plan_weeks enable row level security;
alter table public.plan_days enable row level security;
alter table public.workout_logs enable row level security;
alter table public.messages enable row level security;
alter table public.coaching_notes enable row level security;
alter table public.milestones enable row level security;
alter table public.personal_bests enable row level security;

-- Profiles: anyone authenticated can read; own row to insert/update
create policy "profiles_read_all"      on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own"    on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"    on public.profiles for update using (auth.uid() = id);

-- Coaches: public read; own row for mutations
create policy "coaches_read_all"       on public.coaches for select using (auth.role() = 'authenticated');
create policy "coaches_insert_own"     on public.coaches for insert with check (auth.uid() = id);

-- Training plans: coaches full access; athletes read their assigned plan
create policy "plans_coach_all"        on public.training_plans for all
  using (exists (select 1 from public.coaches where id = auth.uid()));
create policy "plans_athlete_read"     on public.training_plans for select
  using (exists (select 1 from public.athletes where id = auth.uid() and assigned_plan_id = training_plans.id));

-- Plan weeks/days: follow the plan's policy
create policy "weeks_coach_all"        on public.plan_weeks for all
  using (exists (select 1 from public.coaches where id = auth.uid()));
create policy "weeks_athlete_read"     on public.plan_weeks for select
  using (exists (
    select 1 from public.athletes a join public.training_plans p on a.assigned_plan_id = p.id
    where a.id = auth.uid() and p.id = plan_weeks.plan_id
  ));

create policy "days_coach_all"         on public.plan_days for all
  using (exists (select 1 from public.coaches where id = auth.uid()));
create policy "days_athlete_read"      on public.plan_days for select
  using (exists (
    select 1 from public.athletes a
    join public.training_plans p on a.assigned_plan_id = p.id
    join public.plan_weeks w on w.plan_id = p.id
    where a.id = auth.uid() and w.id = plan_days.week_id
  ));

-- Athletes: coaches read all + update (for plan assignment); athletes read/update own row
create policy "athletes_coach_read"    on public.athletes for select
  using (exists (select 1 from public.coaches where id = auth.uid()) or auth.uid() = id);
create policy "athletes_coach_update"  on public.athletes for update
  using (exists (select 1 from public.coaches where id = auth.uid()));
create policy "athletes_insert_own"    on public.athletes for insert with check (auth.uid() = id);
create policy "athletes_update_own"    on public.athletes for update using (auth.uid() = id);

-- Workout logs
create policy "logs_athlete_own"       on public.workout_logs for all using (auth.uid() = athlete_id);
create policy "logs_coach_read"        on public.workout_logs for select
  using (exists (select 1 from public.coaches where id = auth.uid()));

-- Messages: sender, the athlete, or any coach
create policy "messages_access"        on public.messages for all
  using (auth.uid() = sender_id or auth.uid() = athlete_id
    or exists (select 1 from public.coaches where id = auth.uid()));

-- Coaching notes: coaches own; athlete read-only
create policy "notes_coach_own"        on public.coaching_notes for all using (auth.uid() = coach_id);
create policy "notes_athlete_read"     on public.coaching_notes for select using (auth.uid() = athlete_id);

-- Milestones & PBs
create policy "milestones_athlete"     on public.milestones for all using (auth.uid() = athlete_id);
create policy "milestones_coach_read"  on public.milestones for select
  using (exists (select 1 from public.coaches where id = auth.uid()));
create policy "pbs_athlete"            on public.personal_bests for all using (auth.uid() = athlete_id);
create policy "pbs_coach_read"         on public.personal_bests for select
  using (exists (select 1 from public.coaches where id = auth.uid()));

-- ─── Auth trigger — auto-create profile + role row on signup ──────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'athlete');

  insert into public.profiles (id, name, role, initials, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    user_role,
    coalesce(new.raw_user_meta_data->>'initials', upper(substr(split_part(new.email, '@', 1), 1, 2))),
    coalesce(new.raw_user_meta_data->>'avatar_color', '#818CF8')
  );

  if user_role = 'athlete' then
    insert into public.athletes (id) values (new.id);
  elsif user_role = 'coach' then
    insert into public.coaches (id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
