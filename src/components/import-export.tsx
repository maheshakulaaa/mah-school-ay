import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { calculateAge, type Student } from "@/lib/students-store";

// SheetJS 0.18.5 has a regex bug where <si > / </si > (with whitespace)
// in sharedStrings.xml don't match, leaving all strings undefined.
// Pre-clean the zip so string cells parse correctly.
function sanitizeXlsxBuffer(buf: Uint8Array): Uint8Array {
  try {
    const files = unzipSync(buf);
    let touched = false;
    for (const path of Object.keys(files)) {
      if (!/sharedStrings\.xml$|sheet\d+\.xml$/i.test(path)) continue;
      const xml = strFromU8(files[path]);
      const fixed = xml
        .replace(/<si(\s+[^>]*)?\s*>/g, "<si>")
        .replace(/<\/si\s*>/g, "</si>")
        .replace(/<t(\s+[^>]*)?\s*>/g, (m, attrs) => (attrs ? `<t${attrs}>` : "<t>"))
        .replace(/<\/t\s*>/g, "</t>");
      if (fixed !== xml) {
        files[path] = strToU8(fixed);
        touched = true;
      }
    }
    return touched ? zipSync(files) : buf;
  } catch {
    return buf;
  }
}

// Detect the header row by scanning the first ~10 rows for known field keywords,
// then return objects keyed by those detected headers.
function rowsFromSheet(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  if (!grid.length) return [];

  const KEYWORDS = ["name", "father", "gender", "aadhaar", "aadhar", "dob", "date of birth", "mobile", "class"];
  let headerIdx = 0;
  let bestScore = 0;
  const scan = Math.min(grid.length, 10);
  for (let i = 0; i < scan; i++) {
    const row = grid[i] || [];
    const score = row.reduce<number>((acc, cell) => {
      const s = String(cell ?? "").toLowerCase().trim();
      if (!s) return acc;
      return acc + (KEYWORDS.some((k) => s.includes(k)) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  const headerRow = (grid[headerIdx] || []).map((c) => String(c ?? "").replace(/\s+/g, " ").trim());
  const seen = new Map<string, number>();
  const headers = headerRow.map((h, i) => {
    if (!h) return `__col_${i}`;
    const key = h;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    return n === 0 ? key : `${key} (${n + 1})`;
  });

  return grid.slice(headerIdx + 1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

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

  const processRows = (raw: Record<string, unknown>[]) => {
    const rows = raw
      .map((r) => {
        const get = (...keys: string[]) => {
          for (const k of keys) {
            const v = r[k];
            if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
          }
          return "";
        };
        let dob = get("DOB", "dob", "Date of Birth", "date_of_birth");
        // Excel may give a serial number or a Date object
        if (dob && /^\d+(\.\d+)?$/.test(dob)) {
          const serial = Number(dob);
          const parsed = XLSX.SSF.parse_date_code(serial);
          if (parsed) {
            const mm = String(parsed.m).padStart(2, "0");
            const dd = String(parsed.d).padStart(2, "0");
            dob = `${parsed.y}-${mm}-${dd}`;
          }
        } else if (dob) {
          const d = new Date(dob);
          if (!isNaN(d.getTime())) dob = d.toISOString().slice(0, 10);
        }
        const name = get("Name", "name", "Student Name");
        if (!name) return null;
        return {
          academicYear,
          name,
          fatherName: get("Father Name", "fatherName", "Father's Name"),
          gender: (get("Gender", "gender") || "Male") as Student["gender"],
          aadhaar: get("Aadhaar", "aadhaar", "Aadhar"),
          dob,
          age: dob ? calculateAge(dob) : "",
          className: get("Class", "className", "Grade"),
          schoolName: get("School Name", "schoolName", "School"),
          parentMobile: get("Parent Mobile", "parentMobile", "Mobile", "Phone"),
        } satisfies Omit<Student, "id">;
      })
      .filter((r) => r !== null) as Omit<Student, "id">[];

    if (!rows.length) {
      toast.error("No valid rows found");
      return;
    }
    onImport(rows);
    toast.success(`Imported ${rows.length} student${rows.length === 1 ? "" : "s"}`);
  };

  const handleFile = (file: File) => {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
          processRows(json);
        } catch {
          toast.error("Failed to parse Excel file");
        }
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsArrayBuffer(file);
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => processRows(result.data),
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
          <p className="font-medium">Drop a CSV or Excel file here, or click to upload</p>
          <p className="text-sm text-muted-foreground">
            Supports <span className="font-medium text-foreground">.csv, .xlsx, .xls</span> · importing to{" "}
            <span className="font-semibold text-foreground">{academicYear}</span>.{" "}
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
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
