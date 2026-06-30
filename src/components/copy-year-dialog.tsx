import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  years: string[];
  activeYear: string;
  counts: Record<string, number>;
  onCopy: (fromYear: string, toYear: string) => Promise<number> | number;
}

export function CopyYearDialog({ open, onOpenChange, years, activeYear, counts, onCopy }: Props) {
  const candidates = years.filter((y) => y !== activeYear);
  const [from, setFrom] = useState<string>(candidates[0] ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setFrom(candidates[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeYear]);

  const sourceCount = from ? (counts[from] ?? 0) : 0;

  const handleCopy = async () => {
    if (!from) return;
    setBusy(true);
    try {
      const n = await onCopy(from, activeYear);
      if (n > 0) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy students to {activeYear}</DialogTitle>
          <DialogDescription>
            Bring forward the roster from a previous academic year. Duplicates (matching Aadhaar, or
            same name + DOB) are skipped. You can edit or delete any record afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">Copy from</label>
          <Select value={from} onValueChange={setFrom} disabled={!candidates.length}>
            <SelectTrigger>
              <SelectValue placeholder="Select a year" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((y) => (
                <SelectItem key={y} value={y}>
                  {y} · {counts[y] ?? 0} student{(counts[y] ?? 0) === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {from && (
            <p className="text-sm text-muted-foreground">
              Will attempt to copy <span className="font-medium text-foreground">{sourceCount}</span>{" "}
              record{sourceCount === 1 ? "" : "s"} from{" "}
              <span className="font-medium text-foreground">{from}</span> into{" "}
              <span className="font-medium text-foreground">{activeYear}</span>.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={!from || busy || sourceCount === 0}>
            <Copy className="h-4 w-4" />
            {busy ? "Copying…" : "Copy students"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
