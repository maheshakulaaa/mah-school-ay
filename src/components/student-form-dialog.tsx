import { useEffect, useMemo, useState } from "react";
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
import { calculateAge, type StudentColumn } from "@/lib/students-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  academicYear: string;
  columns: StudentColumn[];
  onSubmit: (data: Record<string, string>) => void;
}

export function StudentFormDialog({ open, onOpenChange, academicYear, columns, onSubmit }: Props) {
  const sorted = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  );

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const empty: Record<string, string> = {};
      for (const c of sorted) empty[c.key] = "";
      setForm(empty);
    }
  }, [open, sorted]);

  const setField = (key: string, val: string) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === "dob") {
        const a = calculateAge(val);
        if (a !== "" && "age" in next) next.age = String(a);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameCol = sorted.find((c) => c.key === "name") ?? sorted[0];
    if (nameCol && !(form[nameCol.key] ?? "").trim()) {
      toast.error(`${nameCol.label} is required`);
      return;
    }
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(form)) {
      const trimmed = (v ?? "").trim();
      if (trimmed) clean[k] = trimmed;
    }
    onSubmit(clean);
    toast.success("Student added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
          <DialogDescription>
            Adding to academic year <span className="font-semibold">{academicYear}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sorted.map((c) => (
            <FieldControl
              key={c.id}
              col={c}
              value={form[c.key] ?? ""}
              onChange={(v) => setField(c.key, v)}
            />
          ))}
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Student</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldControl({
  col,
  value,
  onChange,
}: {
  col: StudentColumn;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{col.label}</Label>
      {col.type === "select" ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {col.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={col.type === "date" ? "date" : col.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
