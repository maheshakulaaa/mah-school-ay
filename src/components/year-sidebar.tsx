import { useState } from "react";
import { GraduationCap, Calendar, Plus, Users, ChevronLeft, ChevronRight, Trash2, Pencil } from "lucide-react";
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
  onRenameYear: (oldY: string, newY: string) => void;
  counts: Record<string, number>;
}

export function YearSidebar({ years, activeYear, onSelect, onAddYear, onDeleteYear, onRenameYear, counts }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [editingYear, setEditingYear] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

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

  const startEdit = (y: string) => {
    setEditingYear(y);
    setEditDraft(y);
  };

  const submitEdit = () => {
    if (!editingYear) return;
    onRenameYear(editingYear, editDraft.trim());
    setEditingYear(null);
  };

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:min-h-screen md:border-b-0 md:border-r",
        collapsed ? "md:w-16" : "md:w-72"
      )}
    >
      <div className="border-b border-sidebar-border px-4 py-4 md:px-4 md:py-5">
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-lg bg-sidebar-primary/20 p-2 text-sidebar-primary">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
            <h1 className="truncate font-display text-base font-semibold leading-tight md:text-lg">Student Register</h1>
            <p className="truncate text-xs text-sidebar-foreground/70">Teacher's Portal</p>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden shrink-0 rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 md:px-4 md:py-5">
        <div className={cn("mb-3 flex items-center justify-between px-1 md:px-2", collapsed && "md:justify-center")}>
          <p className={cn(
            "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60",
            collapsed && "md:hidden"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            Academic Year
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label="Add academic year"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Academic Year</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="e.g. 2027-28"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <DialogFooter className="gap-2 sm:gap-2">
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
                    "flex min-w-0 flex-1 items-center py-2.5 text-sm",
                    collapsed ? "md:justify-center md:px-2" : "justify-between px-3"
                  )}
                >
                  <span className="truncate font-medium">{y}</span>
                  <span
                    className={cn(
                      "ml-2 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      collapsed && "md:hidden",
                      active
                        ? "bg-white/20 text-sidebar-primary-foreground"
                        : "bg-sidebar-accent text-sidebar-foreground/70"
                    )}
                  >
                    <Users className="h-3 w-3" />
                    {counts[y] ?? 0}
                  </span>
                </button>
                <div className={cn("flex shrink-0 items-center", collapsed && "md:hidden")}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(y);
                    }}
                    className={cn(
                      "rounded p-1 transition hover:bg-black/10 md:opacity-0 md:group-hover:opacity-100",
                      active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                    )}
                    aria-label={`Edit academic year ${y}`}
                    title="Edit academic year"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className={cn(
                            "rounded p-1 transition hover:bg-black/10 md:opacity-0 md:group-hover:opacity-100",
                            active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 hover:text-destructive"
                          )}
                          aria-label={`Delete academic year ${y}`}
                          title="Delete academic year"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete academic year {y}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes {counts[y] ?? 0} student record
                            {(counts[y] ?? 0) === 1 ? "" : "s"} from {y}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 sm:gap-2">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteYear(y)}>
                            Delete year
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      <Dialog open={editingYear !== null} onOpenChange={(o) => !o && setEditingYear(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename academic year</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="e.g. 2027-28"
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitEdit()}
          />
          <p className="text-xs text-muted-foreground">
            All {editingYear ? counts[editingYear] ?? 0 : 0} student records and year-specific columns will move to the new year.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditingYear(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={cn("border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/60", collapsed && "md:hidden")}>
        Data is saved locally on this device.
      </div>
    </aside>
  );
}
