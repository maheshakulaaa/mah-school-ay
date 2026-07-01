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
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import type { ColumnType, StudentColumn } from "@/lib/students-store";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  columns: StudentColumn[];
  onAdd: (input: { label: string; type: ColumnType; options?: string[] }) => Promise<StudentColumn | null>;
  onUpdate: (id: string, patch: Partial<Pick<StudentColumn, "label" | "type" | "options">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMove: (id: string, dir: -1 | 1) => Promise<void>;
}

export function ManageColumnsDialog({ open, onOpenChange, columns, onAdd, onUpdate, onDelete, onMove }: Props) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ColumnType>("text");
  const [optionsText, setOptionsText] = useState("");

  const sorted = [...columns].sort((a, b) => a.position - b.position);

  const submit = async () => {
    if (!label.trim()) return;
    const options =
      type === "select"
        ? optionsText.split(/[\n,]/).map((o) => o.trim()).filter(Boolean)
        : undefined;
    const created = await onAdd({ label: label.trim(), type, options });
    if (created) {
      setLabel("");
      setType("text");
      setOptionsText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage columns</DialogTitle>
          <DialogDescription>
            Add, rename, reorder, or delete columns. Deleting a column removes its data from every student.
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
  first,
  last,
  onUpdate,
  onDelete,
  onMove,
}: {
  col: StudentColumn;
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
        <div className="font-medium text-sm">{col.label}</div>
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
              This removes the column and its stored values from every student record. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(col.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
