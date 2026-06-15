-- Recreate the signup trigger to be fully resilient:
-- • ON CONFLICT handles duplicate-key edge cases (retried signups, dashboard-created users)
-- • EXCEPTION block ensures a trigger failure never blocks user creation

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
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    user_role,
    coalesce(nullif(new.raw_user_meta_data->>'initials', ''), upper(substr(split_part(new.email, '@', 1), 1, 2))),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_color', ''), '#818CF8')
  )
  on conflict (id) do update set
    name         = excluded.name,
    role         = excluded.role,
    initials     = excluded.initials,
    avatar_color = excluded.avatar_color;

  if user_role = 'athlete' then
    insert into public.athletes (id) values (new.id)
    on conflict (id) do nothing;
  elsif user_role = 'coach' then
    insert into public.coaches (id) values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
exception when others then
  -- Log the error but don't block user creation
  raise warning 'handle_new_user failed for %: % %', new.id, sqlerrm, sqlstate;
  return new;
end;
$$;

-- Drop and re-create the trigger so it points to the updated function
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
