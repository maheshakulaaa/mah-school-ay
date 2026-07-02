ALTER TABLE public.student_columns ADD COLUMN IF NOT EXISTS academic_year text;
CREATE INDEX IF NOT EXISTS student_columns_user_year_idx ON public.student_columns(user_id, academic_year);