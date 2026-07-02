import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, Globe, CalendarClock } from "lucide-react";
import type { ColumnScope, ColumnType, StudentColumn } from "@/lib/students-store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  columns: StudentColumn[];
  activeYear: string;
  onAdd: (input: {
    label: string;
    type: ColumnType;
    options?: string[];
    scope?: ColumnScope;
  }) => Promise<StudentColumn | null>;
  onUpdate: (id: string, patch: Partial<Pick<StudentColumn, "label" | "type" | "options">>) => Promise<void>;
  onDelete: (id: string, scope?: ColumnScope) => Promise<void>;
  onMove: (id: string, dir: -1 | 1) => Promise<void>;
}

export function ManageColumnsDialog({
  open,
  onOpenChange,
  columns,
  activeYear,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
}: Props) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [optionsText, setOptionsText] = useState("");
  const [scope, setScope] = useState<ColumnScope>("all");

  const sorted = [...columns].sort((a, b) => a.position - b.position);

  const submit = async () => {
    if (!label.trim()) return;
    const options =
      type === "select"
        ? optionsText.split(/[\n,]/).map((o) => o.trim()).filter(Boolean)
        : undefined;
    const created = await onAdd({ label: label.trim(), type, options, scope });
    if (created) {
      setLabel("");
      setType("text");
      setOptionsText("");
      setScope("all");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage columns</DialogTitle>
          <DialogDescription>
            Add, rename, reorder, or delete columns. Choose whether a change applies to every
            academic year or only <span className="font-medium text-foreground">{activeYear}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add new column
            </p>
            <div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
              <Input
                placeholder="Column label (e.g. Blood Group)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Select value={type} onValueChange={(v) => setType(v as ColumnType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={submit} disabled={!label.trim()}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">Apply to</Label>
              <RadioGroup
                value={scope}
                onValueChange={(v) => setScope(v as ColumnScope)}
                className="mt-1 flex flex-wrap gap-4"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="all" id="scope-all" />
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  All academic years
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="year" id="scope-year" />
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  Only {activeYear}
                </label>
              </RadioGroup>
            </div>

            {type === "select" && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">
                  Dropdown options (one per line or comma-separated)
                </Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Option A, Option B, Option C"
                />
              </div>
            )}
          </div>

          <div className="max-h-[420px] space-y-1 overflow-y-auto rounded-md border">
            {sorted.map((c, i) => (
              <ColumnRow
                key={c.id}
                col={c}
                activeYear={activeYear}
                first={i === 0}
                last={i === sorted.length - 1}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onMove={onMove}
              />
            ))}
            {sorted.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No columns yet.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColumnRow({
  col,
  activeYear,
  first,
  last,
  onUpdate,
  onDelete,
  onMove,
}: {
  col: StudentColumn;
  activeYear: string;
  first: boolean;
  last: boolean;
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
  onMove: Props["onMove"];
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(col.label);
  const [type, setType] = useState<ColumnType>(col.type);
  const [optionsText, setOptionsText] = useState(col.options.join(", "));
  const [deleteScope, setDeleteScope] = useState<ColumnScope>(
    col.academicYear === null ? "all" : "year",
  );

  const isShared = col.academicYear === null;
  const scopeLabel = isShared ? "All years" : col.academicYear;

  const save = async () => {
    const options =
      type === "select"
        ? optionsText.split(/[\n,]/).map((o) => o.trim()).filter(Boolean)
        : [];
    await onUpdate(col.id, { label: label.trim() || col.label, type, options });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2 border-b p-3 last:border-b-0">
        <div className="grid gap-2 md:grid-cols-[1fr_140px_auto_auto]">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          <Select value={type} onValueChange={(v) => setType(v as ColumnType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={save}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
        {type === "select" && (
          <Textarea
            rows={2}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder="Comma-separated options"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b p-2 last:border-b-0">
      <div className="flex flex-col">
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={first} onClick={() => onMove(col.id, -1)}>
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={last} onClick={() => onMove(col.id, 1)}>
          <ArrowDown className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{col.label}</span>
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
              (isShared
                ? "bg-primary/10 text-primary"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400")
            }
            title={isShared ? "Shared across all years" : `Only in ${col.academicYear}`}
          >
            {isShared ? <Globe className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
            {scopeLabel}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {col.type}
          {col.type === "select" && col.options.length > 0 && ` · ${col.options.join(", ")}`}
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete column "{col.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose the scope of this deletion. Stored values remain in each student record until
              you remove the column from that year too.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isShared ? (
            <RadioGroup
              value={deleteScope}
              onValueChange={(v) => setDeleteScope(v as ColumnScope)}
              className="space-y-2 py-1"
            >
              <label className="flex items-start gap-2 rounded-md border p-2 text-sm">
                <RadioGroupItem value="all" className="mt-0.5" />
                <div>
                  <div className="font-medium">Remove from all academic years</div>
                  <div className="text-xs text-muted-foreground">
                    The column disappears everywhere.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded-md border p-2 text-sm">
                <RadioGroupItem value="year" className="mt-0.5" />
                <div>
                  <div className="font-medium">Remove only from {activeYear}</div>
                  <div className="text-xs text-muted-foreground">
                    Other academic years will keep this column.
                  </div>
                </div>
              </label>
            </RadioGroup>
          ) : (
            <p className="py-1 text-sm text-muted-foreground">
              This column exists only in <span className="font-medium text-foreground">{col.academicYear}</span> and
              will be removed from that year.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(col.id, isShared ? deleteScope : "all")}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
