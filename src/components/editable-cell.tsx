import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value: string;
  onCommit: (v: string) => void;
  type?: "text" | "date" | "tel";
  options?: string[];
  multiline?: boolean;
  placeholder?: string;
}

export function EditableCell({ value, onCommit, type = "text", options, multiline, placeholder }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };

  if (options) {
    return (
      <Select value={value || undefined} onValueChange={(v) => onCommit(v)}>
        <SelectTrigger className="h-8 border-transparent bg-transparent hover:border-input focus:border-ring">
          <SelectValue placeholder={placeholder ?? "—"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (editing) {
    return (
      <Input
        ref={ref}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-8"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`w-full rounded px-2 py-1 text-left text-sm hover:bg-accent/60 ${
        multiline ? "whitespace-normal break-words" : "truncate"
      } ${!value ? "text-muted-foreground italic" : ""}`}
      title={value || "Click to edit"}
    >
      {value || placeholder || "—"}
    </button>
  );
}
