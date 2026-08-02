-- Fix "Database error saving new user"
-- Each INSERT is wrapped in its own BEGIN/EXCEPTION block so no error can ever
-- propagate back to GoTrue and block the signup.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  _role text;
  _name text;
begin
  _role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'athlete');
  _name := coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1), 'User');

  -- 1. profiles row
  begin
    insert into public.profiles (id, name, role, initials, avatar_color)
    values (
      new.id,
      _name,
      _role,
      coalesce(nullif(new.raw_user_meta_data->>'initials', ''), upper(substr(_name, 1, 2))),
      coalesce(nullif(new.raw_user_meta_data->>'avatar_color', ''), '#818CF8')
    )
    on conflict (id) do update set
      name         = excluded.name,
      role         = excluded.role,
      initials     = excluded.initials,
      avatar_color = excluded.avatar_color;
  exception when others then
    raise warning '[handle_new_user] profiles insert failed: % %', sqlerrm, sqlstate;
  end;

  -- 2. role-specific row
  begin
    if _role = 'athlete' then
      insert into public.athletes (id) values (new.id)
      on conflict (id) do nothing;
    elsif _role = 'coach' then
      insert into public.coaches (id) values (new.id)
      on conflict (id) do nothing;
    end if;
  exception when others then
    raise warning '[handle_new_user] role row insert failed: % %', sqlerrm, sqlstate;
  end;

  return new;
end;
$$;

-- Re-attach the trigger (safe to run even if it already exists)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
