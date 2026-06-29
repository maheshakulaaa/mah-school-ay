import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { calculateAge, type Student } from "@/lib/students-store";

interface Props {
  students: Student[];
  academicYear: string;
  onImport: (rows: Omit<Student, "id">[]) => void;
}

const HEADERS = [
  "Name",
  "Father Name",
  "Gender",
  "Aadhaar",
  "DOB",
  "Age",
  "Class",
  "School Name",
  "Parent Mobile",
];

function toRows(students: Student[]) {
  return students.map((s, i) => ({
    "S.No": i + 1,
    Name: s.name,
    "Father Name": s.fatherName,
    Gender: s.gender,
    Aadhaar: s.aadhaar,
    DOB: s.dob,
    Age: s.age,
    Class: s.className,
    "School Name": s.schoolName,
    "Parent Mobile": s.parentMobile,
  }));
}

export function ImportExport({ students, academicYear, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data
          .map((r) => {
            const dob = (r["DOB"] || r["dob"] || "").trim();
            const name = (r["Name"] || r["name"] || "").trim();
            if (!name) return null;
            return {
              academicYear,
              name,
              fatherName: (r["Father Name"] || r["fatherName"] || "").trim(),
              gender: ((r["Gender"] || r["gender"] || "Male").trim() as Student["gender"]) || "Male",
              aadhaar: (r["Aadhaar"] || r["aadhaar"] || "").trim(),
              dob,
              age: dob ? calculateAge(dob) : "",
              className: (r["Class"] || r["className"] || "").trim(),
              schoolName: (r["School Name"] || r["schoolName"] || "").trim(),
              parentMobile: (r["Parent Mobile"] || r["parentMobile"] || "").trim(),
            } satisfies Omit<Student, "id">;
          })
          .filter((r) => r !== null) as Omit<Student, "id">[];

        if (!rows.length) {
          toast.error("No valid rows found");
          return;
        }
        onImport(rows);
        toast.success(`Imported ${rows.length} student${rows.length === 1 ? "" : "s"}`);
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  };

  const exportCSV = () => {
    const csv = Papa.unparse(toRows(students));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(toRows(students));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, academicYear);
    XLSX.writeFile(wb, `students-${academicYear}.xlsx`);
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([HEADERS, []]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileRef.current?.click()}
        className={`flex cursor-pointer items-center gap-4 border-2 border-dashed p-5 transition ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Drop a CSV here or click to upload</p>
          <p className="text-sm text-muted-foreground">
            Bulk import to <span className="font-semibold text-foreground">{academicYear}</span>.{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadTemplate();
              }}
              className="text-primary underline-offset-2 hover:underline"
            >
              Download template
            </button>
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </Card>
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={exportCSV} disabled={!students.length}>
          <FileText className="h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" onClick={exportXLSX} disabled={!students.length}>
          <FileSpreadsheet className="h-4 w-4" />
          Export Excel
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4" />
          Template
        </Button>
      </div>
    </div>
  );
}
