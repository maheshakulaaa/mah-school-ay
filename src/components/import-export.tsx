import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  calculateAge,
  slugifyKey,
  type ColumnType,
  type Student,
  type StudentColumn,
} from "@/lib/students-store";

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

function rowsFromSheet(ws: XLSX.WorkSheet): { headers: string[]; rows: string[][] } {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  if (!grid.length) return { headers: [], rows: [] };

  const KEYWORDS = [
    "name", "father", "gender", "aadhaar", "aadhar", "dob", "date of birth",
    "mobile", "class", "mandal", "habitation", "school", "caste",
  ];
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

  const headers = (grid[headerIdx] || []).map((c) =>
    String(c ?? "").replace(/\s+/g, " ").trim(),
  );
  const rows = grid.slice(headerIdx + 1).map((row) =>
    headers.map((_, i) => String((row as unknown[])[i] ?? "").trim()),
  );
  return { headers, rows };
}

const HEADER_ALIASES: Record<string, string> = {
  "name": "name",
  "student name": "name",
  "name of the student": "name",
  "name of the student (full name)": "name",
  "full name": "name",
  "father": "father_name",
  "father name": "father_name",
  "father's name": "father_name",
  "gender": "gender",
  "aadhaar": "aadhaar",
  "aadhar": "aadhaar",
  "dob": "dob",
  "date of birth": "dob",
  "age": "age",
  "caste": "caste",
  "parent mobile": "parent_mobile",
  "parent mobile no.": "parent_mobile",
  "mobile": "parent_mobile",
  "phone": "parent_mobile",
  "class": "class_name",
  "grade": "class_name",
  "school name": "school_name",
  "name of the studying school": "school_name",
  "mandal": "mandal",
  "habitation": "habitation",
  "name of the habitation": "habitation",
  "school located mandal": "school_mandal",
  "management": "management",
  "whether he / she regular or dropout": "regular_status",
  "reasons for dropout": "dropout_reason",
  "name of the habitation incharge teacher": "teacher_name",
  "teacher mobile no.": "teacher_mobile",
  "teacher mobile": "teacher_mobile",
  "deleted-update-new added": "record_status",
  "remarks": "remarks",
};

function normalizeGender(v: string): string {
  const g = v.trim().toLowerCase();
  if (!g) return "";
  if (g.startsWith("f") || g.startsWith("g")) return "Female";
  if (g.startsWith("m") || g.startsWith("b")) return "Male";
  return "Other";
}

function normalizeDate(v: string): string {
  if (!v) return "";
  if (/^\d+(\.\d+)?$/.test(v)) {
    const parsed = XLSX.SSF.parse_date_code(Number(v));
    if (parsed) {
      const mm = String(parsed.m).padStart(2, "0");
      const dd = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = (Number(yyyy) > 50 ? "19" : "20") + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return v;
}

interface Props {
  students: Student[];
  columns: StudentColumn[];
  academicYear: string;
  onImport: (rows: { data: Record<string, string>; academicYear?: string }[]) => void;
  onAddColumn: (input: {
    label: string;
    type: ColumnType;
    options?: string[];
  }) => Promise<StudentColumn | null>;
}

export function ImportExport({ students, columns, academicYear, onImport, onAddColumn }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const sortedCols = [...columns].sort((a, b) => a.position - b.position);

  const processGrid = async (headers: string[], rows: string[][]) => {
    if (!headers.length || !rows.length) {
      toast.error("No rows found");
      return;
    }

    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

    // Map each header to a column key (existing or newly created)
    const keyByHeader = new Map<number, string>();
    const existingByKey = new Map(columns.map((c) => [c.key, c]));
    const existingByLabel = new Map(columns.map((c) => [norm(c.label), c]));

    const newCols: { label: string; type: ColumnType }[] = [];

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (!h) continue;
      const nh = norm(h);
      const aliasKey = HEADER_ALIASES[nh];
      if (aliasKey && existingByKey.has(aliasKey)) {
        keyByHeader.set(i, aliasKey);
        continue;
      }
      const labelMatch = existingByLabel.get(nh);
      if (labelMatch) {
        keyByHeader.set(i, labelMatch.key);
        continue;
      }
      // Skip pure S No / index-style columns
      if (/^s\.?\s*no\.?$/.test(nh) || nh === "year") {
        continue;
      }
      // Need to create a new column
      const created = await onAddColumn({ label: h, type: "text" });
      if (created) {
        keyByHeader.set(i, created.key);
        existingByKey.set(created.key, created);
        newCols.push({ label: h, type: "text" });
      }
    }

    const dataRows = rows
      .map((row) => {
        const data: Record<string, string> = {};
        for (const [idx, key] of keyByHeader) {
          let val = String(row[idx] ?? "").trim();
          if (!val) continue;
          if (key === "gender") val = normalizeGender(val);
          if (key === "dob") val = normalizeDate(val);
          if (key === "aadhaar") val = val.replace(/\s+/g, "");
          data[key] = val;
        }
        if (data.dob && !data.age) {
          const a = calculateAge(data.dob);
          if (a !== "") data.age = String(a);
        }
        // Skip empty rows and rows without a name
        if (Object.keys(data).length === 0) return null;
        if (!data.name) return null;
        return data;
      })
      .filter((d): d is Record<string, string> => d !== null);

    if (!dataRows.length) {
      toast.error("No valid rows found");
      return;
    }

    onImport(dataRows.map((data) => ({ data })));
    toast.success(
      `Imported ${dataRows.length} student${dataRows.length === 1 ? "" : "s"}` +
        (newCols.length
          ? ` · added ${newCols.length} new column${newCols.length === 1 ? "" : "s"}`
          : ""),
    );
  };

  const handleFile = (file: File) => {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = new Uint8Array(e.target?.result as ArrayBuffer);
          const data = sanitizeXlsxBuffer(raw);
          const wb = XLSX.read(data, { type: "array", cellDates: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const { headers, rows } = rowsFromSheet(ws);
          void processGrid(headers, rows);
        } catch (err) {
          console.error(err);
          toast.error("Failed to parse Excel file");
        }
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsArrayBuffer(file);
      return;
    }

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const grid = result.data as string[][];
        if (!grid.length) return toast.error("Empty CSV");
        const headers = grid[0].map((h) => (h ?? "").toString().trim());
        const rows = grid.slice(1);
        void processGrid(headers, rows);
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  };

  const toRows = () =>
    students.map((s, i) => {
      const row: Record<string, string | number> = { "S.No": i + 1 };
      for (const c of sortedCols) row[c.label] = s.data[c.key] ?? "";
      return row;
    });

  const exportCSV = () => {
    const csv = Papa.unparse(toRows());
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${academicYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(toRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, academicYear);
    XLSX.writeFile(wb, `students-${academicYear}.xlsx`);
  };

  const downloadTemplate = () => {
    const headers = ["S.No", ...sortedCols.map((c) => c.label)];
    const csv = Papa.unparse([headers, []]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // touch to avoid unused lint
  void slugifyKey;

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
            Supports <span className="font-medium text-foreground">.csv, .xlsx, .xls</span> ·
            importing to <span className="font-semibold text-foreground">{academicYear}</span>.
            Unknown headers are added as new columns automatically.{" "}
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
