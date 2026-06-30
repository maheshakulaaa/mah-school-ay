import { useState } from "react";
import { GraduationCap, Calendar, Plus, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  years: string[];
  activeYear: string;
  onSelect: (y: string) => void;
  onAddYear: (y: string) => void;
  counts: Record<string, number>;
}

export function YearSidebar({ years, activeYear, onSelect, onAddYear, counts }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const v = draft.trim();
    if (!/^\d{4}-\d{2}$/.test(v)) {
      toast.error("Format must be YYYY-YY (e.g. 2027-28)");
      return;
    }
    onAddYear(v);
    onSelect(v);
    setDraft("");
    setOpen(false);
    toast.success(`Added ${v}`);
  };

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:w-72 md:min-h-screen">
      <div className="border-b border-sidebar-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sidebar-primary/20 p-2 text-sidebar-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold leading-tight">Student Register</h1>
            <p className="text-xs text-sidebar-foreground/70">Teacher's Portal</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className="mb-3 flex items-center justify-between px-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            <Calendar className="h-3.5 w-3.5" />
            Academic Year
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Academic Year</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="e.g. 2027-28"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <nav className="space-y-1">
          {years.map((y) => {
            const active = y === activeYear;
            return (
              <button
                key={y}
                onClick={() => onSelect(y)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <span className="font-medium">{y}</span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    active
                      ? "bg-white/20 text-sidebar-primary-foreground"
                      : "bg-sidebar-accent text-sidebar-foreground/70"
                  }`}
                >
                  <Users className="h-3 w-3" />
                  {counts[y] ?? 0}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/60">
        Data is saved locally on this device.
      </div>
    </aside>
  );
}
