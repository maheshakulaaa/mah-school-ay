import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
  Settings2,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/students/$studentId/activities")({
  head: () => ({
    meta: [
      { title: "Student Daily Activities" },
      { name: "description", content: "Track daily activities per student." },
    ],
  }),
  component: ActivitiesPage,
});

type Status = "done" | "not_done" | "absent";
const STATUS_LABEL: Record<Status, string> = {
  done: "Done",
  not_done: "Not done",
  absent: "Absent",
};
const STATUS_BADGE: Record<Status, string> = {
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  not_done: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  absent: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

interface ActivityType {
  id: string;
  name: string;
  position: number;
}

interface ActivityEntry {
  id: string;
  student_id: string;
  activity_date: string; // yyyy-mm-dd
  activity_type_id: string | null;
  status: Status;
  score: number | null;
  notes: string | null;
}

interface StudentInfo {
  id: string;
  academic_year: string;
  name: string;
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ActivitiesPage() {
  const { studentId } = Route.useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11

  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ActivityEntry | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>(toDateStr(today));
  const [typesOpen, setTypesOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: sRow }, { data: tRows }, { data: eRows }] = await Promise.all([
        supabase
          .from("students")
          .select("id, academic_year, data")
          .eq("id", studentId)
          .maybeSingle(),
        supabase.from("activity_types").select("*").order("position"),
        supabase
          .from("student_activities")
          .select("*")
          .eq("student_id", studentId)
          .order("activity_date", { ascending: false }),
      ]);
      if (!mounted) return;
      if (!sRow) {
        toast.error("Student not found");
        navigate({ to: "/" });
        return;
      }
      const dataObj = (sRow.data ?? {}) as Record<string, unknown>;
      const name = String(dataObj.name ?? dataObj.full_name ?? "Student");
      setStudent({ id: sRow.id, academic_year: sRow.academic_year, name });
      setTypes((tRows ?? []) as ActivityType[]);
      setEntries((eRows ?? []) as ActivityEntry[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [studentId, navigate]);

  const monthEntries = useMemo(
    () =>
      entries.filter((e) => {
        const d = new Date(e.activity_date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [entries, year, month],
  );

  const entriesByDate = useMemo(() => {
    const m: Record<string, ActivityEntry[]> = {};
    for (const e of monthEntries) {
      (m[e.activity_date] ??= []).push(e);
    }
    return m;
  }, [monthEntries]);

  const typeById = useMemo(() => {
    const m: Record<string, ActivityType> = {};
    for (const t of types) m[t.id] = t;
    return m;
  }, [types]);

  const openNew = (dateStr?: string) => {
    setEditingEntry(null);
    setDefaultDate(dateStr ?? toDateStr(new Date()));
    setEntryOpen(true);
  };

  const openEdit = (e: ActivityEntry) => {
    setEditingEntry(e);
    setDefaultDate(e.activity_date);
    setEntryOpen(true);
  };

  const saveEntry = async (payload: {
    id?: string;
    activity_date: string;
    activity_type_id: string | null;
    status: Status;
    score: number | null;
    notes: string | null;
  }) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    if (payload.id) {
      const { data, error } = await supabase
        .from("student_activities")
        .update({
          activity_date: payload.activity_date,
          activity_type_id: payload.activity_type_id,
          status: payload.status,
          score: payload.score,
          notes: payload.notes,
        })
        .eq("id", payload.id)
        .select()
        .single();
      if (error) return toast.error(error.message);
      setEntries((prev) => prev.map((e) => (e.id === payload.id ? (data as ActivityEntry) : e)));
      toast.success("Activity updated");
    } else {
      const { data, error } = await supabase
        .from("student_activities")
        .insert({
          user_id: uid,
          student_id: studentId,
          activity_date: payload.activity_date,
          activity_type_id: payload.activity_type_id,
          status: payload.status,
          score: payload.score,
          notes: payload.notes,
        })
        .select()
        .single();
      if (error) return toast.error(error.message);
      setEntries((prev) => [data as ActivityEntry, ...prev]);
      toast.success("Activity added");
    }
    setEntryOpen(false);
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("student_activities").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success("Activity deleted");
  };

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
  };

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 px-3 py-4 md:px-8 md:py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Daily Activities
              </p>
              <h1 className="truncate font-display text-xl font-semibold md:text-2xl">
                {loading ? "Loading…" : student?.name}
              </h1>
              {student && (
                <p className="truncate text-xs text-muted-foreground">
                  Academic year {student.academic_year}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="md:size-default" onClick={() => setTypesOpen(true)}>
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Activity Types</span>
            </Button>
            <Button size="sm" className="md:size-default" onClick={() => openNew()}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Activity</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-3 py-5 md:px-8 md:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[9rem] text-center font-medium">{monthLabel}</div>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const n = new Date();
                setYear(n.getFullYear());
                setMonth(n.getMonth());
              }}
            >
              Today
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {monthEntries.length} entr{monthEntries.length === 1 ? "y" : "ies"} this month
          </p>
        </div>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList>
            <TabsTrigger value="calendar">
              <CalendarIcon className="mr-1 h-4 w-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-1 h-4 w-4" /> List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <CalendarGrid
              year={year}
              month={month}
              entriesByDate={entriesByDate}
              typeById={typeById}
              onNew={openNew}
              onEdit={openEdit}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <ListView
              entries={monthEntries}
              typeById={typeById}
              onEdit={openEdit}
              onDelete={deleteEntry}
              onNew={() => openNew()}
            />
          </TabsContent>
        </Tabs>
      </main>

      <EntryDialog
        open={entryOpen}
        onOpenChange={setEntryOpen}
        types={types}
        defaultDate={defaultDate}
        editing={editingEntry}
        onSave={saveEntry}
        onDelete={deleteEntry}
      />

      <ManageTypesDialog
        open={typesOpen}
        onOpenChange={setTypesOpen}
        types={types}
        setTypes={setTypes}
      />

      <Toaster richColors position="top-right" />
    </div>
  );
}

/* ------------------------------- Calendar ------------------------------- */

function CalendarGrid({
  year,
  month,
  entriesByDate,
  typeById,
  onNew,
  onEdit,
}: {
  year: number;
  month: number;
  entriesByDate: Record<string, ActivityEntry[]>;
  typeById: Record<string, ActivityType>;
  onNew: (d: string) => void;
  onEdit: (e: ActivityEntry) => void;
}) {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = toDateStr(new Date());
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {weekdays.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="min-h-24 border-b border-r bg-muted/10 last:border-r-0" />;
          const ds = toDateStr(c);
          const dayEntries = entriesByDate[ds] ?? [];
          const isToday = ds === todayStr;
          return (
            <div
              key={i}
              className={cn(
                "group relative min-h-24 border-b border-r p-1.5 last:border-r-0 md:min-h-32 md:p-2",
                (i + 1) % 7 === 0 && "border-r-0",
                isToday && "bg-primary/5",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground/80",
                  )}
                >
                  {c.getDate()}
                </span>
                <button
                  onClick={() => onNew(ds)}
                  className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                  aria-label="Add activity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEdit(e)}
                    className={cn(
                      "block w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium",
                      STATUS_BADGE[e.status],
                    )}
                    title={e.notes ?? ""}
                  >
                    {e.activity_type_id ? typeById[e.activity_type_id]?.name ?? "Activity" : "Activity"}
                  </button>
                ))}
                {dayEntries.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">+{dayEntries.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------- List --------------------------------- */

function ListView({
  entries,
  typeById,
  onEdit,
  onDelete,
  onNew,
}: {
  entries: ActivityEntry[];
  typeById: Record<string, ActivityType>;
  onEdit: (e: ActivityEntry) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="mb-3 text-sm text-muted-foreground">No activities recorded for this month.</p>
        <Button size="sm" onClick={onNew}>
          <Plus className="h-4 w-4" /> Add first activity
        </Button>
      </div>
    );
  }
  const grouped: Record<string, ActivityEntry[]> = {};
  for (const e of entries) (grouped[e.activity_date] ??= []).push(e);
  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="space-y-3">
      {dates.map((d) => {
        const dt = new Date(d + "T00:00:00");
        return (
          <div key={d} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">
                  {dt.toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {grouped[d].length} entr{grouped[d].length === 1 ? "y" : "ies"}
                </p>
              </div>
            </div>
            <ul className="divide-y">
              {grouped[d].map((e) => (
                <li key={e.id} className="flex flex-wrap items-start gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {e.activity_type_id ? typeById[e.activity_type_id]?.name ?? "Activity" : "Activity"}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_BADGE[e.status])}>
                        {STATUS_LABEL[e.status]}
                      </Badge>
                      {e.score != null && (
                        <Badge variant="outline" className="text-[10px]">
                          Score: {e.score}
                        </Badge>
                      )}
                    </div>
                    {e.notes && <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(e)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete activity?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:gap-2">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(e.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ Entry Dialog ---------------------------- */

function EntryDialog({
  open,
  onOpenChange,
  types,
  defaultDate,
  editing,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  types: ActivityType[];
  defaultDate: string;
  editing: ActivityEntry | null;
  onSave: (p: {
    id?: string;
    activity_date: string;
    activity_type_id: string | null;
    status: Status;
    score: number | null;
    notes: string | null;
  }) => void;
  onDelete: (id: string) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [typeId, setTypeId] = useState<string>("");
  const [status, setStatus] = useState<Status>("done");
  const [score, setScore] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.activity_date);
      setTypeId(editing.activity_type_id ?? "");
      setStatus(editing.status);
      setScore(editing.score != null ? String(editing.score) : "");
      setNotes(editing.notes ?? "");
    } else {
      setDate(defaultDate);
      setTypeId(types[0]?.id ?? "");
      setStatus("done");
      setScore("");
      setNotes("");
    }
  }, [open, editing, defaultDate, types]);

  const submit = () => {
    if (!date) {
      toast.error("Date required");
      return;
    }
    onSave({
      id: editing?.id,
      activity_date: date,
      activity_type_id: typeId || null,
      status,
      score: score.trim() ? Number(score) : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Activity" : "Add Activity"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="a-date">Date</Label>
            <Input id="a-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Activity</Label>
            {types.length === 0 ? (
              <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                No activity types yet — add some from “Activity Types”.
              </p>
            ) : (
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an activity" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="not_done">Not done</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-score">Score</Label>
              <Input
                id="a-score"
                type="number"
                inputMode="decimal"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-notes">Notes</Label>
            <Textarea
              id="a-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-2">
          {editing ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete(editing.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save" : "Add"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Manage Types Dialog ------------------------ */

function ManageTypesDialog({
  open,
  onOpenChange,
  types,
  setTypes,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  types: ActivityType[];
  setTypes: (updater: (prev: ActivityType[]) => ActivityType[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    const position = types.length > 0 ? Math.max(...types.map((t) => t.position)) + 1 : 0;
    const { data, error } = await supabase
      .from("activity_types")
      .insert({ user_id: uid, name, position })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setTypes((prev) => [...prev, data as ActivityType]);
    setDraft("");
    toast.success(`Added "${name}"`);
  };

  const save = async (id: string) => {
    const name = editDraft.trim();
    if (!name) return;
    const { error } = await supabase.from("activity_types").update({ name }).eq("id", id);
    if (error) return toast.error(error.message);
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
    setEditingId(null);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("activity_types").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTypes((prev) => prev.filter((t) => t.id !== id));
    toast.success("Removed");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activity Types</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Homework, Reading, Sports"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {types.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity types yet.
            </p>
          )}
          {types.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5"
            >
              {editingId === t.id ? (
                <>
                  <Input
                    autoFocus
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save(t.id)}
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => save(t.id)}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{t.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(t.id);
                      setEditDraft(t.name);
                    }}
                    aria-label="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(t.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
