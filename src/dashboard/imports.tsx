import { useState } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, download } from "./api";
import { csvColumns } from "../shared/csv";
import type { VehicleInput } from "../shared/schemas";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
type Preview = {
  headers: string[];
  rows: { row: number; data: VehicleInput | null; errors: string[] }[];
  valid: number;
  invalid: number;
};
export function Imports() {
  const [csv, setCsv] = useState(""),
    [name, setName] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [result, setResult] = useState<{
      results: { row: number; success: boolean; errors: string[] }[];
      imported: number;
      failed: number;
    } | null>(null);
  async function validate(execute = false) {
    setBusy(true);
    try {
      if (execute) {
        const r = await api<typeof result>("imports", {
          csv,
          mapping,
          execute: true,
        });
        setResult(r);
        setConfirm(false);
        toast.success(`${r?.imported ?? 0} rows imported as drafts`);
      } else
        setPreview(
          await api<Preview>("imports", { csv, mapping, execute: false }),
        );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-heading">Bring your inventory along</h2>
          <p className="hint mt-1">
            Preview every row before importing. New vehicles are always drafts.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            download(
              "vehicle-import-template.csv",
              csvColumns.join(",") + "\r\n",
            )
          }
        >
          <Download size={16} />
          CSV template
        </Button>
      </div>
      <section className="surface p-7">
        <label
          htmlFor="csv-upload"
          className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed rounded-xl p-12 gap-3 bg-muted/40"
        >
          <FileSpreadsheet size={35} className="text-primary" />
          <span className="font-semibold">{name || "Choose a CSV file"}</span>
          <span className="hint">Up to 1,000 rows · maximum 2 MB</span>
          <input
            id="csv-upload"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2000000) {
                toast.error("Choose a file smaller than 2 MB");
                return;
              }
              setCsv(await file.text());
              setName(file.name);
              setPreview(null);
              setResult(null);
              setMapping({});
            }}
          />
        </label>
        <Button
          className="mt-5"
          disabled={!csv || busy}
          pending={busy && !confirm}
          onClick={() => void validate()}
        >
          <Upload size={16} />
          Preview import
        </Button>
      </section>
      {preview && (
        <section className="surface p-6">
          <div className="flex justify-between gap-3 flex-wrap mb-5">
            <div>
              <h3 className="section-heading">Import preview</h3>
              <p className="hint">
                {preview.valid} valid rows · {preview.invalid} rows need
                attention
              </p>
            </div>
            <Button
              disabled={busy || !preview.valid}
              onClick={() => setConfirm(true)}
            >
              Import {preview.valid} valid rows
            </Button>
          </div>
          <details className="mb-5">
            <summary className="text-sm cursor-pointer font-medium">
              Map CSV headers
            </summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {preview.headers.map((h) => (
                <label key={h} className="text-sm">
                  {h}
                  <select
                    className="field mt-1"
                    value={mapping[h] ?? h}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [h]: e.target.value }))
                    }
                  >
                    <option value={h}>{h}</option>
                    {csvColumns
                      .filter((c) => c !== h)
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-4"
              disabled={busy}
              onClick={() => void validate()}
            >
              Revalidate mapping
            </Button>
          </details>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-3">CSV row</th>
                  <th>Vehicle</th>
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 100).map((r) => (
                  <tr className="border-b" key={r.row}>
                    <td className="py-3">{r.row}</td>
                    <td>{r.data?.title ?? "—"}</td>
                    <td
                      className={
                        r.errors.length ? "text-red-700" : "text-primary"
                      }
                    >
                      {r.errors.length
                        ? r.errors.join("; ")
                        : "Ready to import"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint mt-3">
            Showing the first 100 rows. All rows are validated and processed.
          </p>
        </section>
      )}
      {result && (
        <section className="surface p-6">
          <h3 className="section-heading flex items-center gap-2">
            <CheckCircle2 size={20} className="text-primary" />
            Import finished
          </h3>
          <p className="hint mt-2">
            {result.imported} imported · {result.failed} failed. Repeating this
            import uses the same record IDs.
          </p>
          {result.results
            .filter((r) => !r.success)
            .map((r) => (
              <p key={r.row} className="text-sm text-red-700 mt-3">
                Row {r.row}: {r.errors.join("; ")}
              </p>
            ))}
        </section>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle className="section-heading">
            Import verified rows?
          </DialogTitle>
          <DialogDescription className="hint my-4">
            Valid rows become drafts. Invalid or duplicate rows are reported
            individually. Your plan’s vehicle quota applies.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              pending={busy}
              onClick={() => void validate(true)}
            >
              Confirm import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
