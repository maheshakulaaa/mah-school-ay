import { useEffect, useState } from "react";
import { z } from "zod";
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
import { calculateAge, type Student } from "@/lib/students-store";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  fatherName: z.string().trim().min(1, "Father's name required").max(100),
  gender: z.enum(["Male", "Female", "Other"]),
  aadhaar: z
    .string()
    .trim()
    .regex(/^[0-9 ]{0,20}$/, "Digits only")
    .max(20),
  dob: z.string().min(1, "DOB required"),
  className: z.string().trim().min(1, "Class required").max(20),
  schoolName: z.string().trim().min(1, "School required").max(150),
  parentMobile: z
    .string()
    .trim()
    .regex(/^[0-9+\- ]{7,20}$/, "Invalid mobile"),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  academicYear: string;
  onSubmit: (s: Omit<Student, "id">) => void;
}

const empty = {
  name: "",
  fatherName: "",
  gender: "Male" as const,
  aadhaar: "",
  dob: "",
  className: "",
  schoolName: "",
  parentMobile: "",
};

export function StudentFormDialog({ open, onOpenChange, academicYear, onSubmit }: Props) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) setForm(empty);
  }, [open]);

  const age = calculateAge(form.dob);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    onSubmit({ ...parsed.data, age, academicYear });
    toast.success("Student added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
          <DialogDescription>
            Adding to academic year <span className="font-semibold">{academicYear}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fatherName">Father's Name</Label>
            <Input
              id="fatherName"
              value={form.fatherName}
              onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as "Male" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aadhaar">Aadhaar</Label>
            <Input
              id="aadhaar"
              value={form.aadhaar}
              onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
              placeholder="XXXX XXXX XXXX"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Age (auto)</Label>
            <Input value={age === "" ? "" : `${age} yrs`} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="className">Class</Label>
            <Input
              id="className"
              value={form.className}
              onChange={(e) => setForm({ ...form, className: e.target.value })}
              placeholder="e.g. V"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parentMobile">Parent Mobile</Label>
            <Input
              id="parentMobile"
              value={form.parentMobile}
              onChange={(e) => setForm({ ...form, parentMobile: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
            />
          </div>
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
