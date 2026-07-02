import { useState } from "react";
import { GraduationCap, Calendar, Plus, Users, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
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
import { toast } from "sonner";

interface Props {
  years: string[];
  activeYear: string;
  onSelect: (y: string) => void;
  onAddYear: (y: string) => void;
  onDeleteYear: (y: string) => void;
  counts: Record<string, number>;
}

export function YearSidebar({ years, activeYear, onSelect, onAddYear, onDeleteYear, counts }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);

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
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:min-h-screen",
        collapsed ? "md:w-16" : "md:w-72"
      )}
    >
      <div className="border-b border-sidebar-border px-6 py-5 md:px-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sidebar-primary/20 p-2 text-sidebar-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className={cn("flex-1", collapsed && "hidden md:hidden")}>
            <h1 className="font-display text-lg font-semibold leading-tight">Student Register</h1>
            <p className="text-xs text-sidebar-foreground/70">Teacher's Portal</p>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:block",
              collapsed && "mt-2"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className={cn("mb-3 flex items-center justify-between px-2", collapsed && "md:justify-center")}>
          <p className={cn(
            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60",
            collapsed && "hidden md:hidden"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            Academic Year
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
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
            const canDelete = years.length > 1;
            return (
              <div
                key={y}
                className={cn(
                  "group flex items-center gap-1 rounded-md pr-1 transition",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <button
                  onClick={() => onSelect(y)}
                  className={cn(
                    "flex flex-1 items-center py-2.5 text-sm",
                    collapsed ? "md:justify-center md:px-2" : "justify-between px-3"
                  )}
                >
                  <span className="font-medium">{y}</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      collapsed && "hidden md:hidden",
                      active
                        ? "bg-white/20 text-sidebar-primary-foreground"
                        : "bg-sidebar-accent text-sidebar-foreground/70"
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {counts[y] ?? 0}
                  </span>
                </button>
                {canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className={cn(
                          "rounded p-1 opacity-0 transition hover:bg-black/10 group-hover:opacity-100",
                          active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 hover:text-destructive",
                          collapsed && "hidden md:hidden"
                        )}
                        aria-label={`Delete academic year ${y}`}
                        title="Delete academic year"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete academic year {y}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes {counts[y] ?? 0} student record
                          {(counts[y] ?? 0) === 1 ? "" : "s"} from {y}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDeleteYear(y)}>
                          Delete year
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className={cn("border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/60", collapsed && "hidden md:hidden")}>
        Data is saved locally on this device.
      </div>
    </aside>
  );
}
