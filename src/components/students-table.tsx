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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Search, ChevronLeft, ChevronRight, Lock, Pencil, Eraser } from "lucide-react";
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
import type { Student, StudentColumn } from "@/lib/students-store";
import { toast } from "sonner";

interface Props {
  students: Student[];
  columns: StudentColumn[];
  academicYear: string;
  onUpdate: (id: string, patch: Record<string, string>) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => Promise<number> | number;
  onClearYear: (year: string) => Promise<number> | number;
}

type PageSize = 10 | 20 | 50 | 100 | "all";
const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 50, 100, "all"];

function nameOf(s: Student, cols: StudentColumn[]) {
  if (s.data.name) return s.data.name;
  const first = cols[0];
  return first ? s.data[first.key] ?? "" : "";
}

export function StudentsTable({ students, columns, academicYear, onUpdate, onDelete, onDeleteMany, onClearYear }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sortedCols = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      Object.values(s.data).join(" ").toLowerCase().includes(q),
    );
  }, [students, query]);

  const effectiveSize = pageSize === "all" ? Math.max(filtered.length, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(filtered.length / effectiveSize));
  const safePage = Math.min(page, pageCount);
  const pageRows =
    pageSize === "all"
      ? filtered
      : filtered.slice((safePage - 1) * effectiveSize, safePage * effectiveSize);

  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const togglePageAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());
  const bulkDelete = async () => {
    const ids = Array.from(selected);
    const n = await onDeleteMany(ids);
    if (n > 0) clearSelection();
  };
  const clearAll = async () => {
    const n = await onClearYear(academicYear);
    if (n > 0) clearSelection();
  };

  const renderCell = (s: Student, col: StudentColumn) => {
    const value = s.data[col.key] ?? "";
    const commit = (v: string) => onUpdate(s.id, { [col.key]: v });
    if (!editMode) {
      return (
        <div className="whitespace-nowrap text-sm text-foreground">{value || "—"}</div>
      );
    }
    if (col.type === "select") {
      return <EditableCell value={value} onCommit={commit} options={col.options} />;
    }
    return (
      <EditableCell
        value={value}
        onCommit={commit}
        type={col.type === "date" ? "date" : "text"}
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
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
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-sm text-muted-foreground">
              Rows
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(v === "all" ? "all" : (Number(v) as PageSize));
                setPage(1);
              }}
            >
              <SelectTrigger id="page-size" className="h-9 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={String(opt)} value={String(opt)}>
                    {opt === "all" ? "All" : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
            {editMode ? (
              <Pencil className="h-4 w-4 text-primary" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="edit-mode" className="cursor-pointer text-sm">
              {editMode ? "Edit mode" : "Read-only"}
            </Label>
            <Switch
              id="edit-mode"
              checked={editMode}
              onCheckedChange={(v) => {
                setEditMode(v);
                toast.message(v ? "Edit mode on" : "Read-only mode on");
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {selected.size > 0
            ? `${selected.size} selected`
            : "Select rows to bulk delete, or clear the whole year"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                    Delete selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selected.size} student{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the selected records. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={bulkDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={students.length === 0}>
                <Eraser className="h-4 w-4" />
                Clear {academicYear}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all students from {academicYear}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all {students.length} record
                  {students.length === 1 ? "" : "s"} from {academicYear}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll}>Clear year</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
                <TableHead className="w-10 py-3 text-primary-foreground">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => togglePageAll(Boolean(v))}
                    aria-label="Select all rows on this page"
                    className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
                  S.No
                </TableHead>
                {sortedCols.map((c) => (
                  <TableHead
                    key={c.id}
                    className="whitespace-nowrap py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground"
                  >
                    {c.label}
                  </TableHead>
                ))}
                {editMode && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={sortedCols.length + 2 + (editMode ? 1 : 0)}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No students yet. Add one or import a CSV to get started.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((s, i) => (
                  <TableRow
                    key={s.id}
                    className={selected.has(s.id) ? "align-top bg-primary/5" : "align-top"}
                  >
                    <TableCell className="py-3">
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={(v) => toggleOne(s.id, Boolean(v))}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="py-3 text-sm font-medium text-muted-foreground">
                      {(safePage - 1) * effectiveSize + i + 1}
                    </TableCell>
                    {sortedCols.map((c) => (
                      <TableCell key={c.id} className="min-w-[140px] py-2">
                        {renderCell(s, c)}
                      </TableCell>
                    ))}
                    {editMode && (
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
                                Remove{" "}
                                <span className="font-semibold">
                                  {nameOf(s, sortedCols) || "this record"}
                                </span>
                                ? This action cannot be undone.
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
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pageSize !== "all" && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {safePage} of {pageCount} · showing {pageRows.length} of {filtered.length}
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
      )}
    </div>
  );
}
