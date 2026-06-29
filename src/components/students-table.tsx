import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
import { EditableCell } from "./editable-cell";
import type { Student } from "@/lib/students-store";
import { toast } from "sonner";

interface Props {
  students: Student[];
  onUpdate: (id: string, patch: Partial<Student>) => void;
  onDelete: (id: string) => void;
}

const PAGE_SIZE = 10;

export function StudentsTable({ students, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.name, s.fatherName, s.aadhaar, s.className, s.schoolName, s.parentMobile]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [students, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                {["S.No", "Name", "Father Name", "Gender", "Aadhaar", "DOB", "Age", "Class", "School Name", "Parent Mobile", ""].map(
                  (h) => (
                    <TableHead
                      key={h}
                      className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground"
                    >
                      {h}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                    No students yet. Add one or import a CSV to get started.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((s, i) => (
                  <TableRow key={s.id} className="align-top">
                    <TableCell className="py-3 text-sm font-medium text-muted-foreground">
                      {(safePage - 1) * PAGE_SIZE + i + 1}
                    </TableCell>
                    <TableCell className="min-w-[160px] py-2">
                      <EditableCell value={s.name} onCommit={(v) => onUpdate(s.id, { name: v })} multiline />
                    </TableCell>
                    <TableCell className="min-w-[160px] py-2">
                      <EditableCell
                        value={s.fatherName}
                        onCommit={(v) => onUpdate(s.id, { fatherName: v })}
                        multiline
                      />
                    </TableCell>
                    <TableCell className="min-w-[110px] py-2">
                      <EditableCell
                        value={s.gender}
                        onCommit={(v) => onUpdate(s.id, { gender: v as Student["gender"] })}
                        options={["Male", "Female", "Other"]}
                      />
                    </TableCell>
                    <TableCell className="min-w-[150px] py-2">
                      <EditableCell value={s.aadhaar} onCommit={(v) => onUpdate(s.id, { aadhaar: v })} />
                    </TableCell>
                    <TableCell className="min-w-[140px] py-2">
                      <EditableCell
                        value={s.dob}
                        type="date"
                        onCommit={(v) => onUpdate(s.id, { dob: v })}
                      />
                    </TableCell>
                    <TableCell className="py-3 text-sm font-medium">
                      {s.age === "" ? "—" : `${s.age} yrs`}
                    </TableCell>
                    <TableCell className="min-w-[80px] py-2">
                      <EditableCell value={s.className} onCommit={(v) => onUpdate(s.id, { className: v })} />
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[260px] py-2">
                      <EditableCell
                        value={s.schoolName}
                        onCommit={(v) => onUpdate(s.id, { schoolName: v })}
                        multiline
                      />
                    </TableCell>
                    <TableCell className="min-w-[140px] py-2">
                      <EditableCell
                        value={s.parentMobile}
                        type="tel"
                        onCommit={(v) => onUpdate(s.id, { parentMobile: v })}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete student?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <span className="font-semibold">{s.name || "this record"}</span>?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                onDelete(s.id);
                                toast.success("Student deleted");
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {safePage} of {pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
