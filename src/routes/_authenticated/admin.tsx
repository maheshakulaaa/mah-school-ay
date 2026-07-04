import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  createUserAsAdmin,
  listUsersAsAdmin,
  deleteUserAsAdmin,
  updateUserPasswordAsAdmin,
  setUserActiveAsAdmin,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ArrowLeft, Trash2, UserPlus, Shield, KeyRound, UserCheck, UserX } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Manage Users" }] }),
  component: AdminPage,
});

interface UserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
  roles: string[];
  banned: boolean;
  emailConfirmed: boolean;
}

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: meLoading } = useCurrentUser();
  const listFn = useServerFn(listUsersAsAdmin);
  const createFn = useServerFn(createUserAsAdmin);
  const deleteFn = useServerFn(deleteUserAsAdmin);
  const passwordFn = useServerFn(updateUserPasswordAsAdmin);
  const activeFn = useServerFn(setUserActiveAsAdmin);

  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (meLoading) return;
    if (user && !user.isAdmin) {
      toast.error("Admin access required");
      navigate({ to: "/" });
    }
  }, [user, meLoading, navigate]);

  const refresh = async () => {
    try {
      setLoading(true);
      const rows = (await listFn()) as UserRow[];
      setUsers(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isAdmin]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFn({ data: { email, password, fullName, role } });
      toast.success("User created");
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("user");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteFn({ data: { userId: id } });
      toast.success("User deleted");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const toggleActive = async (u: UserRow) => {
    try {
      await activeFn({ data: { userId: u.id, active: u.banned } });
      toast.success(u.banned ? "User activated" : "User deactivated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const submitPassword = async () => {
    if (!pwUser) return;
    setPwSubmitting(true);
    try {
      await passwordFn({ data: { userId: pwUser.id, password: pwValue } });
      toast.success("Password updated");
      setPwUser(null);
      setPwValue("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPwSubmitting(false);
    }
  };

  if (meLoading || !user?.isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Shield className="h-3.5 w-3.5" /> Admin
            </div>
            <h1 className="font-display text-2xl font-semibold">Manage Users</h1>
          </div>
          <Button asChild variant="outline">
            <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to register</Link>
          </Button>
        </div>

        <Card className="mb-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-medium">
            <UserPlus className="h-4 w-4" /> Create user
          </h2>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fn">Full name</Label>
              <Input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="text" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create user"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No users yet</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {u.id !== user.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {u.email}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the user and all their student records.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(u.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
