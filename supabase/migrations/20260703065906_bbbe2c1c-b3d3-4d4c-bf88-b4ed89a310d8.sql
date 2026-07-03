
-- activity_types
CREATE TABLE public.activity_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_types TO authenticated;
GRANT ALL ON public.activity_types TO service_role;
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activity types" ON public.activity_types
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX activity_types_user_pos_idx ON public.activity_types (user_id, position);
CREATE TRIGGER trg_activity_types_updated_at
  BEFORE UPDATE ON public.activity_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- student_activities
CREATE TABLE public.student_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  activity_type_id uuid REFERENCES public.activity_types(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'done',
  score numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_activities TO authenticated;
GRANT ALL ON public.student_activities TO service_role;
ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own student activities" ON public.student_activities
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX student_activities_student_date_idx ON public.student_activities (student_id, activity_date);
CREATE INDEX student_activities_user_date_idx ON public.student_activities (user_id, activity_date);
CREATE TRIGGER trg_student_activities_updated_at
  BEFORE UPDATE ON public.student_activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
