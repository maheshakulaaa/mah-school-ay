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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Search, ChevronLeft, ChevronRight, Lock, Pencil } from "lucide-react";
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
  onUpdate: (id: string, patch: Record<string, string>) => void;
  onDelete: (id: string) => void;
}

type PageSize = 10 | 20 | 50 | 100 | "all";
const PAGE_SIZE_OPTIONS: PageSize[] = [10, 20, 50, 100, "all"];

function nameOf(s: Student, cols: StudentColumn[]) {
  if (s.data.name) return s.data.name;
  const first = cols[0];
  return first ? s.data[first.key] ?? "" : "";
}

export function StudentsTable({ students, columns, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [editMode, setEditMode] = useState(false);

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

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary hover:bg-primary">
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
                    colSpan={sortedCols.length + 1 + (editMode ? 1 : 0)}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No students yet. Add one or import a CSV to get started.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((s, i) => (
                  <TableRow key={s.id} className="align-top">
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
