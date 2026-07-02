import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ColumnType = "text" | "number" | "date" | "select";

export interface StudentColumn {
  id: string;
  key: string;
  label: string;
  position: number;
  type: ColumnType;
  options: string[];
  academicYear: string | null;
}

export type ColumnScope = "all" | "year";

export interface Student {
  id: string;
  academicYear: string;
  data: Record<string, string>;
}

export const DEFAULT_YEARS = ["2024-25", "2025-26", "2026-27"];

export const DEFAULT_COLUMN_SEEDS: Omit<StudentColumn, "id" | "academicYear">[] = [
  { key: "name", label: "Name", position: 1, type: "text", options: [] },
  { key: "father_name", label: "Father Name", position: 2, type: "text", options: [] },
  { key: "gender", label: "Gender", position: 3, type: "select", options: ["Male", "Female", "Other"] },
  { key: "aadhaar", label: "Aadhaar", position: 4, type: "text", options: [] },
  { key: "dob", label: "DOB", position: 5, type: "date", options: [] },
  { key: "age", label: "Age", position: 6, type: "number", options: [] },
  { key: "caste", label: "Caste", position: 7, type: "text", options: [] },
  { key: "parent_mobile", label: "Parent Mobile", position: 8, type: "text", options: [] },
  { key: "class_name", label: "Class", position: 9, type: "text", options: [] },
  { key: "school_name", label: "School Name", position: 10, type: "text", options: [] },
  { key: "mandal", label: "Mandal", position: 11, type: "text", options: [] },
  { key: "habitation", label: "Habitation", position: 12, type: "text", options: [] },
  { key: "school_mandal", label: "School Located Mandal", position: 13, type: "text", options: [] },
  {
    key: "management",
    label: "Management",
    position: 14,
    type: "select",
    options: ["Govt", "PVT", "AHS", "Society School", "ICDS"],
  },
  {
    key: "regular_status",
    label: "Regular / Dropout",
    position: 15,
    type: "select",
    options: ["Regular", "Dropout"],
  },
  { key: "dropout_reason", label: "Reasons for Dropout", position: 16, type: "text", options: [] },
  { key: "teacher_name", label: "Habitation Incharge Teacher", position: 17, type: "text", options: [] },
  { key: "teacher_mobile", label: "Teacher Mobile", position: 18, type: "text", options: [] },
  {
    key: "record_status",
    label: "Status",
    position: 19,
    type: "select",
    options: ["NEW", "UPDATED", "DELETED"],
  },
  { key: "remarks", label: "Remarks", position: 20, type: "text", options: [] },
];

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

export function slugifyKey(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || `col_${Math.random().toString(36).slice(2, 8)}`;
}

interface DbStudent {
  id: string;
  academic_year: string;
  data: Record<string, unknown> | null;
}

interface DbColumn {
  id: string;
  key: string;
  label: string;
  position: number;
  type: string;
  options: unknown;
  academic_year: string | null;
}

function fromDbStudent(r: DbStudent): Student {
  const raw = r.data ?? {};
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) continue;
    data[k] = String(v);
  }
  return { id: r.id, academicYear: r.academic_year, data };
}

function fromDbColumn(r: DbColumn): StudentColumn {
  const opts = Array.isArray(r.options) ? r.options.map(String) : [];
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    position: r.position,
    type: (["text", "number", "date", "select"].includes(r.type) ? r.type : "text") as ColumnType,
    options: opts,
    academicYear: r.academic_year ?? null,
  };
}

export function useStudentsStore() {
  const [userId, setUserId] = useState<string | null>(null);
  const [years, setYears] = useState<string[]>(DEFAULT_YEARS);
  const [activeYear, setActiveYearState] = useState<string>("2025-26");
  const [students, setStudents] = useState<Student[]>([]);
  const [columns, setColumns] = useState<StudentColumn[]>([]);
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

      // Years
      const { data: yearRows } = await supabase.from("academic_years").select("year").order("year");
      let ylist = (yearRows ?? []).map((r: { year: string }) => r.year);
      if (ylist.length === 0) {
        await supabase
          .from("academic_years")
          .insert(DEFAULT_YEARS.map((year) => ({ user_id: uid, year })));
        ylist = [...DEFAULT_YEARS];
      }

      // Columns — seed defaults if empty
      let { data: colRows } = await supabase
        .from("student_columns")
        .select("*")
        .order("position");
      if (!colRows || colRows.length === 0) {
        await supabase
          .from("student_columns")
          .insert(DEFAULT_COLUMN_SEEDS.map((c) => ({ ...c, user_id: uid })));
        const refresh = await supabase.from("student_columns").select("*").order("position");
        colRows = refresh.data ?? [];
      }

      const { data: studentRows } = await supabase
        .from("students")
        .select("id, academic_year, data")
        .order("created_at", { ascending: true });

      if (!mounted) return;
      setYears(ylist);
      setActiveYearState(ylist.includes("2025-26") ? "2025-26" : ylist[0]);
      setColumns((colRows ?? []).map((r) => fromDbColumn(r as DbColumn)));
      setStudents((studentRows ?? []).map((r) => fromDbStudent(r as DbStudent)));
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
    async (data: Record<string, string>) => {
      if (!userId) return;
      const { data: row, error } = await supabase
        .from("students")
        .insert({ user_id: userId, academic_year: activeYear, data })
        .select("id, academic_year, data")
        .single();
      if (error) return toast.error(error.message);
      setStudents((prev) => [...prev, fromDbStudent(row as DbStudent)]);
    },
    [userId, activeYear],
  );

  const addStudents = useCallback(
    async (rows: { data: Record<string, string>; academicYear?: string }[]) => {
      if (!userId || !rows.length) return;
      const payload = rows.map((r) => ({
        user_id: userId,
        academic_year: r.academicYear ?? activeYear,
        data: r.data,
      }));
      const { data, error } = await supabase
        .from("students")
        .insert(payload)
        .select("id, academic_year, data");
      if (error) return toast.error(error.message);
      setStudents((prev) => [...prev, ...((data ?? []) as DbStudent[]).map(fromDbStudent)]);
    },
    [userId, activeYear],
  );

  const updateStudent = useCallback(
    async (id: string, cellPatch: Record<string, string>) => {
      const prevSnap = students;
      let nextData: Record<string, string> | null = null;
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          nextData = { ...s.data, ...cellPatch };
          // auto-age if dob provided
          if ("dob" in cellPatch) {
            const a = calculateAge(cellPatch.dob);
            if (a !== "") nextData.age = String(a);
          }
          return { ...s, data: nextData };
        }),
      );
      if (!nextData) return;
      const { error } = await supabase.from("students").update({ data: nextData }).eq("id", id);
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

  const deleteStudents = useCallback(async (ids: string[]) => {
    if (!ids.length) return 0;
    const { error } = await supabase.from("students").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return 0;
    }
    const set = new Set(ids);
    setStudents((prev) => prev.filter((s) => !set.has(s.id)));
    toast.success(`Deleted ${ids.length} student${ids.length === 1 ? "" : "s"}`);
    return ids.length;
  }, []);

  const clearYear = useCallback(
    async (year: string) => {
      if (!userId) return 0;
      const target = students.filter((s) => s.academicYear === year);
      if (!target.length) {
        toast.info(`No students in ${year}`);
        return 0;
      }
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("user_id", userId)
        .eq("academic_year", year);
      if (error) {
        toast.error(error.message);
        return 0;
      }
      setStudents((prev) => prev.filter((s) => s.academicYear !== year));
      toast.success(`Cleared ${target.length} record${target.length === 1 ? "" : "s"} from ${year}`);
      return target.length;
    },
    [userId, students],
  );

  const deleteYear = useCallback(
    async (year: string) => {
      if (!userId) return;
      if (years.length <= 1) {
        toast.error("At least one academic year is required");
        return;
      }
      const { error: sErr } = await supabase
        .from("students")
        .delete()
        .eq("user_id", userId)
        .eq("academic_year", year);
      if (sErr) return toast.error(sErr.message);
      const { error: yErr } = await supabase
        .from("academic_years")
        .delete()
        .eq("user_id", userId)
        .eq("year", year);
      if (yErr) return toast.error(yErr.message);
      setStudents((prev) => prev.filter((s) => s.academicYear !== year));
      const nextYears = years.filter((y) => y !== year);
      setYears(nextYears);
      setActiveYearState((cur) => (cur === year ? nextYears[0] ?? "" : cur));
      toast.success(`Removed academic year ${year}`);
    },
    [userId, years],
  );

  const copyYear = useCallback(
    async (fromYear: string, toYear: string) => {
      if (!userId) return 0;
      if (fromYear === toYear) {
        toast.error("Source and target years are the same");
        return 0;
      }
      const source = students.filter((s) => s.academicYear === fromYear);
      if (!source.length) {
        toast.error(`No students in ${fromYear} to copy`);
        return 0;
      }
      const existingAadhaars = new Set(
        students
          .filter((s) => s.academicYear === toYear && s.data.aadhaar)
          .map((s) => s.data.aadhaar),
      );
      const existingNames = new Set(
        students
          .filter((s) => s.academicYear === toYear)
          .map((s) => `${s.data.name ?? ""}|${s.data.dob ?? ""}`.toLowerCase()),
      );
      const toInsert = source
        .filter((s) => {
          if (s.data.aadhaar && existingAadhaars.has(s.data.aadhaar)) return false;
          if (existingNames.has(`${s.data.name ?? ""}|${s.data.dob ?? ""}`.toLowerCase())) return false;
          return true;
        })
        .map((s) => ({
          user_id: userId,
          academic_year: toYear,
          data: s.data,
        }));

      if (!toInsert.length) {
        toast.info("Every student from that year already exists in the target year");
        return 0;
      }
      const { data, error } = await supabase
        .from("students")
        .insert(toInsert)
        .select("id, academic_year, data");
      if (error) {
        toast.error(error.message);
        return 0;
      }
      setStudents((prev) => [...prev, ...((data ?? []) as DbStudent[]).map(fromDbStudent)]);
      const skipped = source.length - toInsert.length;
      toast.success(
        `Copied ${toInsert.length} student${toInsert.length === 1 ? "" : "s"} to ${toYear}` +
          (skipped ? ` (skipped ${skipped} duplicate${skipped === 1 ? "" : "s"})` : ""),
      );
      return toInsert.length;
    },
    [userId, students],
  );

  // --- Column management ---
  const addColumn = useCallback(
    async (
      input: { label: string; type: ColumnType; options?: string[] },
    ): Promise<StudentColumn | null> => {
      if (!userId) return null;
      const label = input.label.trim();
      if (!label) {
        toast.error("Column label required");
        return null;
      }
      const existingKeys = new Set(columns.map((c) => c.key));
      let key = slugifyKey(label);
      let n = 2;
      while (existingKeys.has(key)) key = `${slugifyKey(label)}_${n++}`;
      const position = Math.max(0, ...columns.map((c) => c.position)) + 1;
      const { data, error } = await supabase
        .from("student_columns")
        .insert({
          user_id: userId,
          key,
          label,
          position,
          type: input.type,
          options: input.type === "select" ? (input.options ?? []) : [],
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return null;
      }
      const col = fromDbColumn(data as DbColumn);
      setColumns((prev) => [...prev, col].sort((a, b) => a.position - b.position));
      toast.success(`Column "${label}" added`);
      return col;
    },
    [userId, columns],
  );

  const updateColumn = useCallback(
    async (id: string, patch: Partial<Pick<StudentColumn, "label" | "type" | "options" | "position">>) => {
      const dbPatch: {
        label?: string;
        type?: string;
        options?: string[];
        position?: number;
      } = {};
      if (patch.label !== undefined) dbPatch.label = patch.label;
      if (patch.type !== undefined) dbPatch.type = patch.type;
      if (patch.options !== undefined) dbPatch.options = patch.options;
      if (patch.position !== undefined) dbPatch.position = patch.position;
      const { error } = await supabase.from("student_columns").update(dbPatch).eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setColumns((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, ...patch } : c))
          .sort((a, b) => a.position - b.position),
      );
    },
    [],
  );

  const deleteColumn = useCallback(
    async (id: string) => {
      const col = columns.find((c) => c.id === id);
      if (!col) return;
      const { error } = await supabase.from("student_columns").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      setColumns((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Column "${col.label}" removed`);
    },
    [columns],
  );

  const moveColumn = useCallback(
    async (id: string, direction: -1 | 1) => {
      const sorted = [...columns].sort((a, b) => a.position - b.position);
      const idx = sorted.findIndex((c) => c.id === id);
      if (idx < 0) return;
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx];
      const b = sorted[swapIdx];
      await Promise.all([
        supabase.from("student_columns").update({ position: b.position }).eq("id", a.id),
        supabase.from("student_columns").update({ position: a.position }).eq("id", b.id),
      ]);
      setColumns((prev) =>
        prev
          .map((c) => {
            if (c.id === a.id) return { ...c, position: b.position };
            if (c.id === b.id) return { ...c, position: a.position };
            return c;
          })
          .sort((x, y) => x.position - y.position),
      );
    },
    [columns],
  );

  const filtered = students.filter((s) => s.academicYear === activeYear);

  return {
    hydrated,
    years,
    activeYear,
    setActiveYear,
    addYear,
    students,
    filtered,
    columns,
    addStudent,
    addStudents,
    updateStudent,
    deleteStudent,
    copyYear,
    deleteStudents,
    clearYear,
    deleteYear,
    addColumn,
    updateColumn,
    deleteColumn,
    moveColumn,
  };
}
