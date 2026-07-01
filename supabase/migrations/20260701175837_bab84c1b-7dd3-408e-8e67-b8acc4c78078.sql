
-- 1. New table for per-user dynamic column definitions
CREATE TABLE public.student_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_columns TO authenticated;
GRANT ALL ON public.student_columns TO service_role;

ALTER TABLE public.student_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own columns"
ON public.student_columns FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_student_columns_updated
BEFORE UPDATE ON public.student_columns
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Add JSONB data bag to students and migrate existing fixed fields
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.students SET data = jsonb_strip_nulls(jsonb_build_object(
  'name', NULLIF(name, ''),
  'father_name', NULLIF(father_name, ''),
  'gender', NULLIF(gender, ''),
  'aadhaar', NULLIF(aadhaar, ''),
  'dob', NULLIF(dob, ''),
  'class_name', NULLIF(class_name, ''),
  'school_name', NULLIF(school_name, ''),
  'parent_mobile', NULLIF(parent_mobile, '')
))
WHERE data = '{}'::jsonb;

ALTER TABLE public.students
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS father_name,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS aadhaar,
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS class_name,
  DROP COLUMN IF EXISTS school_name,
  DROP COLUMN IF EXISTS parent_mobile;

-- 3. Seed default columns for existing users
INSERT INTO public.student_columns (user_id, key, label, position, type, options)
SELECT p.id, c.key, c.label, c.position, c.type, c.options::jsonb
FROM public.profiles p
CROSS JOIN (VALUES
  ('name','Name',1,'text','[]'),
  ('father_name','Father Name',2,'text','[]'),
  ('gender','Gender',3,'select','["Male","Female","Other"]'),
  ('aadhaar','Aadhaar',4,'text','[]'),
  ('dob','DOB',5,'date','[]'),
  ('age','Age',6,'number','[]'),
  ('caste','Caste',7,'text','[]'),
  ('parent_mobile','Parent Mobile',8,'text','[]'),
  ('class_name','Class',9,'text','[]'),
  ('school_name','School Name',10,'text','[]'),
  ('mandal','Mandal',11,'text','[]'),
  ('habitation','Habitation',12,'text','[]'),
  ('school_mandal','School Located Mandal',13,'text','[]'),
  ('management','Management',14,'select','["Govt","PVT","AHS","Society School","ICDS"]'),
  ('regular_status','Regular / Dropout',15,'select','["Regular","Dropout"]'),
  ('dropout_reason','Reasons for Dropout',16,'text','[]'),
  ('teacher_name','Habitation Incharge Teacher',17,'text','[]'),
  ('teacher_mobile','Teacher Mobile',18,'text','[]'),
  ('record_status','Status',19,'select','["NEW","UPDATED","DELETED"]'),
  ('remarks','Remarks',20,'text','[]')
) AS c(key,label,position,type,options)
ON CONFLICT (user_id, key) DO NOTHING;
