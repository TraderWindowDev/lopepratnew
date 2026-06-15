-- Race results logged by athletes after completing a race
CREATE TABLE IF NOT EXISTS race_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL,
  race_name text NOT NULL,
  race_date date NOT NULL,
  distance text,
  finish_time text,
  category_place text,
  overall_place text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (athlete_id, race_date, race_name)
);

ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

-- Athletes manage their own results
CREATE POLICY "athlete_own_race_results" ON race_results
  FOR ALL USING (auth.uid() = athlete_id);

-- Any coach can read all race results (matches existing pattern in schema)
CREATE POLICY "coach_read_race_results" ON race_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.coaches WHERE id = auth.uid())
  );
