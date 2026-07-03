import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Plus, BookOpen, LogOut, Shield, Copy, Columns3 } from "lucide-react";
import { YearSidebar } from "@/components/year-sidebar";
import { StudentsTable } from "@/components/students-table";
import { StudentFormDialog } from "@/components/student-form-dialog";
import { CopyYearDialog } from "@/components/copy-year-dialog";
import { ImportExport } from "@/components/import-export";
import { ManageColumnsDialog } from "@/components/manage-columns-dialog";
import { useStudentsStore } from "@/lib/students-store";
import { useCurrentUser } from "@/lib/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Teacher's Student Register Portal" },
      {
        name: "description",
        content:
          "Manage student records across academic years with inline editing, CSV import, and Excel export.",
      },
    ],
  }),
  component: Portal,
});

function Portal() {
  const store = useStudentsStore();
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const y of store.years) m[y] = 0;
    for (const s of store.students) m[s.academicYear] = (m[s.academicYear] ?? 0) + 1;
    return m;
  }, [store.students, store.years]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  if (!store.hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      <YearSidebar
        years={store.years}
        activeYear={store.activeYear}
        onSelect={store.setActiveYear}
        onAddYear={store.addYear}
        onDeleteYear={store.deleteYear}
        onRenameYear={store.renameYear}
        counts={counts}
      />

      <main className="flex-1 px-3 py-5 md:px-8 md:py-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              Register
            </div>
            <h2 className="truncate font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Students · {store.activeYear}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {user?.fullName ? `Signed in as ${user.fullName}` : user?.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="md:hidden">
              <Select value={store.activeYear} onValueChange={store.setActiveYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {store.years.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {user?.isAdmin && (
              <Button asChild variant="outline" size="sm" className="md:size-default">
                <Link to="/admin"><Shield className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span></Link>
              </Button>
            )}
            <Button variant="outline" size="sm" className="md:size-default" onClick={signOut}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="md:size-default"
              onClick={() => setColsOpen(true)}
              title="Add, rename, reorder, or delete columns"
            >
              <Columns3 className="h-4 w-4" /> <span className="hidden sm:inline">Columns</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="md:size-default"
              onClick={() => setCopyOpen(true)}
              disabled={store.years.length < 2}
              title="Copy a previous year's roster into the current year"
            >
              <Copy className="h-4 w-4" /> <span className="hidden sm:inline">Copy from year</span>
            </Button>
            <Button size="sm" className="md:size-default" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Student</span>
            </Button>
          </div>
        </header>

        <section className="mb-6">
          <ImportExport
            students={store.filtered}
            columns={store.columns}
            academicYear={store.activeYear}
            onImport={store.addStudents}
            onAddColumn={store.addColumn}
          />
        </section>

        <section>
          <StudentsTable
            students={store.filtered}
            columns={store.columns}
            academicYear={store.activeYear}
            onUpdate={store.updateStudent}
            onDelete={store.deleteStudent}
            onDeleteMany={store.deleteStudents}
            onClearYear={store.clearYear}
          />
        </section>
      </main>

      <StudentFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        academicYear={store.activeYear}
        columns={store.columns}
        onSubmit={store.addStudent}
      />
      <CopyYearDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        years={store.years}
        activeYear={store.activeYear}
        counts={counts}
        onCopy={store.copyYear}
      />
      <ManageColumnsDialog
        open={colsOpen}
        onOpenChange={setColsOpen}
        columns={store.allColumns}
        activeYear={store.activeYear}
        onAdd={store.addColumn}
        onUpdate={store.updateColumn}
        onDelete={store.deleteColumn}
        onMove={store.moveColumn}
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}
