-- Set up a coach profile for a user already created via the Supabase dashboard.
--
-- Step 1: Dashboard → Authentication → Users → "Add user"
--         Enter their email + a temporary password.
--         Copy the UUID shown in the user list.
--
-- Step 2: Paste that UUID below and run this in SQL Editor.

DO $$
DECLARE
  coach_id       uuid := '30a44e3d-6219-4490-bfba-e392c8d97922';  -- ← from the user list
  coach_name     text := 'Coach Lopeprat';
  coach_initials text := 'CL';
  coach_color    text := '#E84B1A';
BEGIN
  INSERT INTO public.profiles (id, name, role, initials, avatar_color)
  VALUES (coach_id, coach_name, 'coach', coach_initials, coach_color)
  ON CONFLICT (id) DO UPDATE SET role = 'coach', name = EXCLUDED.name;

  INSERT INTO public.coaches (id)
  VALUES (coach_id)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Done — % is now a coach.', coach_name;
END $$;
