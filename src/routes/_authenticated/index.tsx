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
import { Plus, BookOpen, LogOut, Shield, Copy } from "lucide-react";
import { YearSidebar } from "@/components/year-sidebar";
import { StudentsTable } from "@/components/students-table";
import { StudentFormDialog } from "@/components/student-form-dialog";
import { CopyYearDialog } from "@/components/copy-year-dialog";
import { ImportExport } from "@/components/import-export";
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
        counts={counts}
      />

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              Register
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Students · {store.activeYear}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.fullName ? `Signed in as ${user.fullName}` : user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Select value={store.activeYear} onValueChange={store.setActiveYear}>
                <SelectTrigger className="w-36">
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
              <Button asChild variant="outline">
                <Link to="/admin"><Shield className="h-4 w-4" /> Admin</Link>
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
            <Button
              variant="outline"
              onClick={() => setCopyOpen(true)}
              disabled={store.years.length < 2}
              title="Copy a previous year's roster into the current year"
            >
              <Copy className="h-4 w-4" /> Copy from year
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          </div>
        </header>

        <section className="mb-6">
          <ImportExport
            students={store.filtered}
            academicYear={store.activeYear}
            onImport={store.addStudents}
          />
        </section>

        <section>
          <StudentsTable
            students={store.filtered}
            onUpdate={store.updateStudent}
            onDelete={store.deleteStudent}
          />
        </section>
      </main>

      <StudentFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        academicYear={store.activeYear}
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
      <Toaster richColors position="top-right" />
    </div>
  );
}
