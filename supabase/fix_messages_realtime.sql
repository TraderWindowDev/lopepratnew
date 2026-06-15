-- 1. Enable realtime publication for messages table
--    (without this, postgres_changes subscriptions never fire)
alter publication supabase_realtime add table public.messages;

-- 2. RLS: athletes can read messages in their own thread
drop policy if exists "athletes_select_messages" on public.messages;
create policy "athletes_select_messages" on public.messages for select
  using (athlete_id = auth.uid());

-- 3. RLS: coaches can read all messages
drop policy if exists "coaches_select_messages" on public.messages;
create policy "coaches_select_messages" on public.messages for select
  using (
    exists (select 1 from public.coaches where id = auth.uid())
  );

-- 4. RLS: athletes can insert their own (non-coach) messages
drop policy if exists "athletes_insert_messages" on public.messages;
create policy "athletes_insert_messages" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and athlete_id = auth.uid()
    and is_coach = false
  );

-- 5. RLS: coaches can insert coach messages for any athlete
drop policy if exists "coaches_insert_messages" on public.messages;
create policy "coaches_insert_messages" on public.messages for insert
  with check (
    is_coach = true
    and sender_id = auth.uid()
    and exists (select 1 from public.coaches where id = auth.uid())
  );
