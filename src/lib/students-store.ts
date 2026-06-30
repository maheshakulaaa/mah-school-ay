import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Gender = "Male" | "Female" | "Other";

export interface Student {
  id: string;
  academicYear: string;
  name: string;
  fatherName: string;
  gender: Gender | "";
  aadhaar: string;
  dob: string;
  age: number | "";
  className: string;
  schoolName: string;
  parentMobile: string;
}

export const DEFAULT_YEARS = ["2024-25", "2025-26", "2026-27"];

export function calculateAge(dob: string): number | "" {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 0 ? "" : age;
}

interface DbStudent {
  id: string;
  user_id: string;
  academic_year: string;
  name: string;
  father_name: string;
  gender: string;
  aadhaar: string;
  dob: string;
  class_name: string;
  school_name: string;
  parent_mobile: string;
}

function fromDb(r: DbStudent): Student {
  return {
    id: r.id,
    academicYear: r.academic_year,
    name: r.name,
    fatherName: r.father_name,
    gender: (r.gender || "") as Student["gender"],
    aadhaar: r.aadhaar,
    dob: r.dob,
    age: calculateAge(r.dob),
    className: r.class_name,
    schoolName: r.school_name,
    parentMobile: r.parent_mobile,
  };
}

function toDb(s: Omit<Student, "id" | "age">, userId: string) {
  return {
    user_id: userId,
    academic_year: s.academicYear,
    name: s.name,
    father_name: s.fatherName,
    gender: s.gender,
    aadhaar: s.aadhaar,
    dob: s.dob,
    class_name: s.className,
    school_name: s.schoolName,
    parent_mobile: s.parentMobile,
  };
}

function patchToDb(p: Partial<Student>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.academicYear !== undefined) out.academic_year = p.academicYear;
  if (p.name !== undefined) out.name = p.name;
  if (p.fatherName !== undefined) out.father_name = p.fatherName;
  if (p.gender !== undefined) out.gender = p.gender;
  if (p.aadhaar !== undefined) out.aadhaar = p.aadhaar;
  if (p.dob !== undefined) out.dob = p.dob;
  if (p.className !== undefined) out.class_name = p.className;
  if (p.schoolName !== undefined) out.school_name = p.schoolName;
  if (p.parentMobile !== undefined) out.parent_mobile = p.parentMobile;
  return out;
}

export function useStudentsStore() {
  const [userId, setUserId] = useState<string | null>(null);
  const [years, setYears] = useState<string[]>(DEFAULT_YEARS);
  const [activeYear, setActiveYearState] = useState<string>("2025-26");
  const [students, setStudents] = useState<Student[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (!uid) {
        setHydrated(true);
        return;
      }

      // Load years
      const { data: yearRows } = await supabase
        .from("academic_years")
        .select("year")
        .order("year");
      let ylist = (yearRows ?? []).map((r: { year: string }) => r.year);
      if (ylist.length === 0) {
        // seed defaults for this user
        await supabase
          .from("academic_years")
          .insert(DEFAULT_YEARS.map((year) => ({ user_id: uid, year })));
        ylist = [...DEFAULT_YEARS];
      }

      const { data: studentRows } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: true });

      if (!mounted) return;
      setYears(ylist);
      setActiveYearState(ylist.includes("2025-26") ? "2025-26" : ylist[0]);
      setStudents((studentRows ?? []).map((r) => fromDb(r as DbStudent)));
      setHydrated(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setActiveYear = useCallback((y: string) => setActiveYearState(y), []);

  const addYear = useCallback(
    async (y: string) => {
      if (!userId) return;
      if (years.includes(y)) return;
      const { error } = await supabase.from("academic_years").insert({ user_id: userId, year: y });
      if (error) return toast.error(error.message);
      setYears((prev) => [...prev, y].sort());
    },
    [userId, years],
  );

  const addStudent = useCallback(
    async (s: Omit<Student, "id">) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("students")
        .insert(toDb(s, userId))
        .select()
        .single();
      if (error) return toast.error(error.message);
      setStudents((prev) => [...prev, fromDb(data as DbStudent)]);
    },
    [userId],
  );

  const addStudents = useCallback(
    async (arr: Omit<Student, "id">[]) => {
      if (!userId || !arr.length) return;
      const { data, error } = await supabase
        .from("students")
        .insert(arr.map((s) => toDb(s, userId)))
        .select();
      if (error) return toast.error(error.message);
      setStudents((prev) => [...prev, ...((data ?? []) as DbStudent[]).map(fromDb)]);
    },
    [userId],
  );

  const updateStudent = useCallback(
    async (id: string, patch: Partial<Student>) => {
      const dbPatch = patchToDb(patch);
      const prevSnap = students;
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const next = { ...s, ...patch };
          if (patch.dob !== undefined) next.age = calculateAge(next.dob);
          return next;
        }),
      );
      const { error } = await supabase
        .from("students")
        .update(dbPatch as never)
        .eq("id", id);
      if (error) {
        toast.error(error.message);
        setStudents(prevSnap);
      }
    },
    [students],
  );

  const deleteStudent = useCallback(async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const filtered = students.filter((s) => s.academicYear === activeYear);

  return {
    hydrated,
    years,
    activeYear,
    setActiveYear,
    addYear,
    students,
    filtered,
    addStudent,
    addStudents,
    updateStudent,
    deleteStudent,
  };
}
