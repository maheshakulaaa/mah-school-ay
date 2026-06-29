import { useEffect, useState, useCallback } from "react";

export type Gender = "Male" | "Female" | "Other";

export interface Student {
  id: string;
  academicYear: string;
  name: string;
  fatherName: string;
  gender: Gender | "";
  aadhaar: string;
  dob: string; // YYYY-MM-DD
  age: number | "";
  className: string;
  schoolName: string;
  parentMobile: string;
}

const STORAGE_KEY = "tsr_students_v1";
const YEARS_KEY = "tsr_years_v1";
const ACTIVE_KEY = "tsr_active_year_v1";

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

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function seed(): Student[] {
  const sample: Omit<Student, "id">[] = [
    {
      academicYear: "2025-26",
      name: "Aarav Sharma",
      fatherName: "Rohit Sharma",
      gender: "Male",
      aadhaar: "1234 5678 9012",
      dob: "2014-05-12",
      age: calculateAge("2014-05-12"),
      className: "V",
      schoolName: "Govt. Primary School, Sector 12",
      parentMobile: "9876543210",
    },
    {
      academicYear: "2025-26",
      name: "Diya Verma",
      fatherName: "Anil Verma",
      gender: "Female",
      aadhaar: "2345 6789 0123",
      dob: "2013-09-03",
      age: calculateAge("2013-09-03"),
      className: "VI",
      schoolName: "Govt. Primary School, Sector 12",
      parentMobile: "9123456780",
    },
    {
      academicYear: "2024-25",
      name: "Karan Singh",
      fatherName: "Pritam Singh",
      gender: "Male",
      aadhaar: "3456 7890 1234",
      dob: "2012-01-20",
      age: calculateAge("2012-01-20"),
      className: "VII",
      schoolName: "Govt. Primary School, Sector 12",
      parentMobile: "9988776655",
    },
  ];
  return sample.map((s) => ({ ...s, id: uid() }));
}

export function useStudentsStore() {
  const [years, setYears] = useState<string[]>(DEFAULT_YEARS);
  const [activeYear, setActiveYearState] = useState<string>("2025-26");
  const [students, setStudents] = useState<Student[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const y = load<string[]>(YEARS_KEY, DEFAULT_YEARS);
    const a = load<string>(ACTIVE_KEY, "2025-26");
    let s = load<Student[] | null>(STORAGE_KEY, null);
    if (!s) {
      s = seed();
      save(STORAGE_KEY, s);
    }
    setYears(y);
    setActiveYearState(a);
    setStudents(s);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(STORAGE_KEY, students);
  }, [students, hydrated]);
  useEffect(() => {
    if (hydrated) save(YEARS_KEY, years);
  }, [years, hydrated]);
  useEffect(() => {
    if (hydrated) save(ACTIVE_KEY, activeYear);
  }, [activeYear, hydrated]);

  const setActiveYear = useCallback((y: string) => setActiveYearState(y), []);

  const addYear = useCallback((y: string) => {
    setYears((prev) => (prev.includes(y) ? prev : [...prev, y].sort()));
  }, []);

  const addStudent = useCallback((s: Omit<Student, "id">) => {
    setStudents((prev) => [...prev, { ...s, id: uid() }]);
  }, []);

  const addStudents = useCallback((arr: Omit<Student, "id">[]) => {
    setStudents((prev) => [...prev, ...arr.map((s) => ({ ...s, id: uid() }))]);
  }, []);

  const updateStudent = useCallback((id: string, patch: Partial<Student>) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        if (patch.dob !== undefined) next.age = calculateAge(next.dob);
        return next;
      }),
    );
  }, []);

  const deleteStudent = useCallback((id: string) => {
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
