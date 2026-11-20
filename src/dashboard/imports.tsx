import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { api, download } from "./api";
import {
  csvColumnFor,
  csvColumns,
  parseCSV,
  requiredCsvColumns,
  sampleCSV,
  toCSV,
  validateRows,
  type CsvColumn,
  type CsvIssue,
} from "../shared/csv";
import { vehicleInput } from "../shared/schemas";
import { currencyOptions } from "../shared/currencies";
import {
  bodyStyles,
  bodyStylesByCategory,
  vehicleCategories,
  type VehicleCategory,
} from "../shared/vehicle-options";
import { useI18n } from "../shared/i18n-react";
import { Button, cn } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";

const MAX_ROWS = 1000;
const PAGE_SIZE = 25;
const shape = vehicleInput.shape;
/** Columns edited with a dropdown; the empty choice falls back to the field's default. */
const choices: Partial<Record<CsvColumn, readonly string[]>> = {
  condition: shape.condition.unwrap().options,
  mileageUnit: shape.mileageUnit.unwrap().options,
  category: vehicleCategories,
  bodyStyle: bodyStyles,
  transmission: shape.transmission.unwrap().options,
  fuel: shape.fuel.unwrap().options,
  currency: currencyOptions.map((c) => c.value),
};
const wide = new Set<string>(["title", "description", "features", "location"]);

type Row = { id: number; cells: string[] };
type Grid = { name: string; fields: string[]; headers: string[]; rows: Row[] };
let nextId = 1;
const newRow = (width: number): Row => ({
  id: nextId++,
  cells: Array(width).fill(""),
});
/** Matches dropdown values case-insensitively, so "automatic" becomes "Automatic". */
function tidy(field: string, value: string) {
  const options = choices[field as CsvColumn];
  const v = value.trim();
  if (!options || !v) return value;
  return options.find((o) => o.toLowerCase() === v.toLowerCase()) ?? value;
}

export function Imports() {
  const { t } = useI18n();
  const [grid, setGrid] = useState<Grid | null>(null),
    [page, setPage] = useState(0),
    [onlyIssues, setOnlyIssues] = useState(false),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [serverErrors, setServerErrors] = useState<Record<number, string[]>>({}),
    [imported, setImported] = useState<number | null>(null);

  const deferred = useDeferredValue(grid);
  const validation = useMemo(
    () =>
      deferred
        ? validateRows(
            deferred.fields,
            deferred.rows.map((r) => r.cells),
          )
        : null,
    [deferred],
  );
  const rowIssues = useMemo(() => {
    const map = new Map<number, CsvIssue[]>();
    deferred?.rows.forEach((r, i) => {
      const issues = [...(validation?.rows[i]?.issues ?? [])];
      for (const message of serverErrors[r.id] ?? [])
        issues.push({ field: "", message });
      map.set(r.id, issues);
    });
    return map;
  }, [deferred, validation, serverErrors]);

  const validCount = grid
    ? grid.rows.filter((r) => rowIssues.get(r.id)?.length === 0).length
    : 0;
  const issueCount = grid ? grid.rows.length - validCount : 0;
  const visible = grid
    ? onlyIssues
      ? grid.rows.filter((r) => rowIssues.get(r.id)?.length)
      : grid.rows
    : [];
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = visible.slice(
    current * PAGE_SIZE,
    current * PAGE_SIZE + PAGE_SIZE,
  );
  const missing = grid
    ? requiredCsvColumns.filter((c) => !grid.fields.includes(c))
    : [];
  const unused = grid ? csvColumns.filter((c) => !grid.fields.includes(c)) : [];

  async function load(file: File) {
    if (file.size > 2_000_000) {
      toast.error(t("Choose a file smaller than 2 MB"));
      return;
    }
    try {
      const { headers, rows } = parseCSV(await file.text());
      if (rows.length > MAX_ROWS)
        throw new Error("Import at most 1,000 rows at a time.");
      const used = new Set<string>();
      const fields = headers.map((h) => {
        const field = csvColumnFor(h);
        if (!field || used.has(field)) return "";
        used.add(field);
        return field;
      });
      setGrid({
        name: file.name,
        headers,
        fields,
        rows: rows.map((cells) => ({
          id: nextId++,
          cells: headers.map((_, j) => tidy(fields[j], cells[j] ?? "")),
        })),
      });
      setPage(0);
      setOnlyIssues(false);
      setServerErrors({});
      setImported(null);
    } catch (e) {
      toast.error(t((e as Error).message));
    }
  }

  function startBlank() {
    const fields = [...csvColumns];
    setGrid({
      name: "",
      headers: fields,
      fields,
      rows: [newRow(fields.length)],
    });
    setPage(0);
    setOnlyIssues(false);
    setServerErrors({});
    setImported(null);
  }

  const setCell = useCallback((id: number, col: number, value: string) => {
    setGrid((g) =>
      g && {
        ...g,
        rows: g.rows.map((r) =>
          r.id === id
            ? { ...r, cells: r.cells.map((c, j) => (j === col ? value : c)) }
            : r,
        ),
      },
    );
    setServerErrors((e) => {
      if (!e[id]) return e;
      const { [id]: _, ...rest } = e;
      return rest;
    });
  }, []);

  function setField(col: number, field: string) {
    setGrid(
      (g) =>
        g && {
          ...g,
          // One column per field: picking a field another column uses frees it there.
          fields: g.fields.map((f, j) =>
            j === col ? field : f === field ? "" : f,
          ),
          rows: g.rows.map((r) => ({
            ...r,
            cells: r.cells.map((c, j) => (j === col ? tidy(field, c) : c)),
          })),
        },
    );
  }

  function addColumns(fields: string[]) {
    setGrid(
      (g) =>
        g && {
          ...g,
          headers: [...g.headers, ...fields],
          fields: [...g.fields, ...fields],
          rows: g.rows.map((r) => ({
            ...r,
            cells: [...r.cells, ...fields.map(() => "")],
          })),
        },
    );
  }

  function addRow() {
    if (!grid || grid.rows.length >= MAX_ROWS) return;
    setGrid({ ...grid, rows: [...grid.rows, newRow(grid.fields.length)] });
    setOnlyIssues(false);
    setPage(Math.floor(grid.rows.length / PAGE_SIZE));
  }

  const removeRow = useCallback((id: number) => {
    setGrid((g) => g && { ...g, rows: g.rows.filter((r) => r.id !== id) });
  }, []);

  async function runImport() {
    if (!grid) return;
    const ready = grid.rows.filter((r) => rowIssues.get(r.id)?.length === 0);
    const cols = grid.fields
      .map((f, j) => (f ? j : -1))
      .filter((j) => j >= 0);
    const csv = toCSV(
      cols.map((j) => grid.fields[j]),
      ready.map((r) => cols.map((j) => r.cells[j])),
    );
    if (csv.length > 2_000_000) {
      toast.error(t("CSV must be smaller than 2 MB."));
      return;
    }
    setBusy(true);
    try {
      const r = await api<{
        results: { row: number; success: boolean; errors: string[] }[];
        imported: number;
        failed: number;
      }>("imports", { csv, mapping: {}, execute: true });
      // Server rows are numbered from 2, in the order they were sent.
      const done = new Set<number>();
      const failed: Record<number, string[]> = {};
      for (const res of r.results) {
        const row = ready[res.row - 2];
        if (!row) continue;
        if (res.success) done.add(row.id);
        else failed[row.id] = res.errors.length ? res.errors : ["Import failed"];
      }
      const remaining = grid.rows.filter((row) => !done.has(row.id));
      setGrid(remaining.length ? { ...grid, rows: remaining } : null);
      setServerErrors(failed);
      setImported((n) => (n ?? 0) + r.imported);
      setPage(0);
      setConfirm(false);
      if (r.imported)
        toast.success(t("{count} rows imported as drafts", { count: r.imported }));
      if (r.failed)
        toast.error(
          t("{count} rows could not be imported. Fix them and try again.", {
            count: r.failed,
          }),
        );
    } catch (e) {
      toast.error(t((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-heading">{t("Bring your inventory along")}</h2>
          <p className="hint mt-1">
            {t(
              "Upload a CSV, review and fix every row, then import. New vehicles are always drafts.",
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => download("vehicle-import-sample.csv", sampleCSV())}
        >
          <Download size={16} />
          {t("Download sample CSV")}
        </Button>
      </div>

      {imported !== null && (
        <section className="surface p-5 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {t("{count} vehicles imported as drafts", { count: imported })}
            </p>
            <p className="hint mt-1">
              {grid
                ? t(
                    "The rows below still need attention. Fix them and import again.",
                  )
                : t("Find them under Vehicles, ready to review and publish.")}
            </p>
          </div>
        </section>
      )}

      {!grid ? (
        <section className="surface p-7">
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center cursor-pointer border-2 border-dashed rounded-xl p-12 gap-3 bg-muted/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void load(file);
            }}
          >
            <FileSpreadsheet size={35} className="text-primary" />
            <span className="font-semibold">
              {t("Choose or drop a CSV file")}
            </span>
            <span className="hint">
              {t("Up to 1,000 rows · maximum 2 MB")}
            </span>
            <input
              id="csv-upload"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void load(file);
              }}
            />
          </label>
          <div className="mt-5 grid sm:grid-cols-3 gap-4 text-sm">
            <Step n={1} title={t("Download the sample")}>
              {t(
                "It lists every supported column with example cars, a lorry and a trailer.",
              )}
            </Step>
            <Step n={2} title={t("Fill in your vehicles")}>
              {t(
                "Title, make, model, year and price are required. Separate features with semicolons.",
              )}
            </Step>
            <Step n={3} title={t("Upload and review")}>
              {t("Edit any cell in the preview before importing.")}
            </Step>
          </div>
          <Button variant="ghost" className="mt-4" onClick={startBlank}>
            <Plus size={16} />
            {t("Or type vehicles in without a file")}
          </Button>
        </section>
      ) : (
        <section className="surface">
          <div className="flex justify-between gap-3 flex-wrap p-5 border-b">
            <div>
              <h3 className="section-heading">{t("Review and edit")}</h3>
              <p className="hint">
                {grid.name && <span className="font-medium">{grid.name} · </span>}
                {t("{valid} ready · {invalid} need attention", {
                  valid: validCount,
                  invalid: issueCount,
                })}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setGrid(null);
                  setServerErrors({});
                }}
              >
                <RotateCcw size={16} />
                {t("Start over")}
              </Button>
              <Button
                disabled={busy || !validCount || deferred !== grid}
                onClick={() => setConfirm(true)}
              >
                <Upload size={16} />
                {t("Import {count} ready rows", { count: validCount })}
              </Button>
            </div>
          </div>

          {missing.length > 0 && (
            <div className="mx-5 mt-5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm flex flex-wrap items-center gap-3">
              <AlertCircle size={16} className="text-amber-700" />
              <span className="flex-1">
                {t("Required columns are missing: {columns}", {
                  columns: missing.join(", "),
                })}
              </span>
              <Button size="sm" variant="outline" onClick={() => addColumns(missing)}>
                {t("Add missing columns")}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyIssues}
                onChange={(e) => {
                  setOnlyIssues(e.target.checked);
                  setPage(0);
                }}
              />
              {t("Show only rows that need attention")}
            </label>
            <div className="flex-1" />
            {unused.length > 0 && (
              <select
                className="field h-8 w-auto text-xs"
                value=""
                aria-label={t("Add column")}
                onChange={(e) => e.target.value && addColumns([e.target.value])}
              >
                <option value="">{t("+ Add column")}</option>
                {unused.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={grid.rows.length >= MAX_ROWS}
              onClick={addRow}
            >
              <Plus size={14} />
              {t("Add row")}
            </Button>
          </div>

          <div className="overflow-auto max-h-[70vh] m-5 border rounded-md">
            <table className="text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="sticky start-0 z-20 bg-muted px-2 py-2 border-b text-start font-medium">
                    #
                  </th>
                  {grid.fields.map((f, j) => (
                    <th key={j} className="px-1 py-2 border-b text-start align-top">
                      <select
                        className={cn(
                          "field h-8 text-xs font-medium",
                          wide.has(f) ? "min-w-56" : "min-w-32",
                          !f && "text-muted-foreground italic",
                        )}
                        value={f}
                        aria-label={t("Column {name}", { name: grid.headers[j] })}
                        onChange={(e) => setField(j, e.target.value)}
                      >
                        <option value="">{t("Don’t import")}</option>
                        {csvColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                            {requiredCsvColumns.includes(c) ? " *" : ""}
                          </option>
                        ))}
                      </select>
                      {grid.headers[j] !== f && (
                        <div className="text-[11px] text-muted-foreground mt-1 px-1 font-normal truncate max-w-40">
                          {t("CSV: {name}", { name: grid.headers[j] })}
                        </div>
                      )}
                    </th>
                  ))}
                  <th className="px-2 py-2 border-b text-start font-medium min-w-48">
                    {t("Status")}
                  </th>
                  <th className="border-b" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <GridRow
                    key={r.id}
                    row={r}
                    index={grid.rows.indexOf(r) + 1}
                    fields={grid.fields}
                    issues={rowIssues.get(r.id)}
                    onCell={setCell}
                    onRemove={removeRow}
                  />
                ))}
                {!pageRows.length && (
                  <tr>
                    <td
                      colSpan={grid.fields.length + 3}
                      className="p-6 text-center hint"
                    >
                      {onlyIssues
                        ? t("Every row is ready to import.")
                        : t("No rows yet. Add one to get started.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 px-5 pb-5">
              <span className="hint me-2">
                {t("Page {page} of {pages}", { page: current + 1, pages })}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={14} />
                {t("Previous")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
              >
                {t("Next")}
                <ChevronRight size={14} />
              </Button>
            </div>
          )}
        </section>
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle className="section-heading">
            {t("Import {count} ready rows?", { count: validCount })}
          </DialogTitle>
          <DialogDescription className="hint my-4">
            {issueCount
              ? t(
                  "They become drafts. {invalid} rows that need attention stay here so you can fix them. Your plan’s vehicle quota applies.",
                  { invalid: issueCount },
                )
              : t(
                  "They become drafts. Your plan’s vehicle quota applies.",
                )}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("Cancel")}
            </Button>
            <Button
              disabled={busy}
              pending={busy}
              onClick={() => void runImport()}
            >
              {t("Confirm import")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
        {n}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="hint mt-0.5">{children}</p>
      </div>
    </div>
  );
}

const GridRow = memo(function GridRow({
  row,
  index,
  fields,
  issues,
  onCell,
  onRemove,
}: {
  row: Row;
  index: number;
  fields: string[];
  issues: CsvIssue[] | undefined;
  onCell: (id: number, col: number, value: string) => void;
  onRemove: (id: number) => void;
}) {
  const { t } = useI18n();
  const byField = new Map<string, string>();
  for (const i of issues ?? [])
    if (i.field && !byField.has(i.field)) byField.set(i.field, i.message);
  const general = (issues ?? []).filter(
    (i) => !i.field || !fields.includes(i.field),
  );
  const categoryCol = fields.indexOf("category");
  const category = (
    categoryCol >= 0 ? row.cells[categoryCol] : ""
  ) as VehicleCategory;
  const ok = issues?.length === 0;
  return (
    <tr className={cn(!ok && issues && "bg-red-50/40")}>
      <td className="sticky start-0 bg-white px-2 py-1 border-b text-muted-foreground text-xs">
        {index}
      </td>
      {fields.map((f, j) => {
        const error = f ? byField.get(f) : undefined;
        const value = row.cells[j] ?? "";
        const className = cn(
          "field h-8 text-xs",
          wide.has(f) ? "min-w-56" : "min-w-32",
          !f && "opacity-50",
          error && "border-red-500 bg-red-50",
        );
        let options = choices[f as CsvColumn];
        if (f === "bodyStyle" && bodyStylesByCategory[category])
          options = bodyStylesByCategory[category];
        return (
          <td key={j} className="px-1 py-1 border-b align-top">
            {options ? (
              <select
                className={className}
                value={value}
                title={error ? t(error) : undefined}
                aria-invalid={!!error}
                aria-label={f}
                onChange={(e) => onCell(row.id, j, e.target.value)}
              >
                <option value="">{t("— default —")}</option>
                {value && !options.includes(value) && (
                  <option value={value}>{value}</option>
                )}
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={className}
                value={value}
                title={error ? t(error) : value}
                aria-invalid={!!error}
                aria-label={f || undefined}
                inputMode={
                  /^(year|price|mileage|horsepower|doors|seats|axles|grossWeight|payload|bodyLength)$/.test(
                    f,
                  )
                    ? "decimal"
                    : undefined
                }
                onChange={(e) => onCell(row.id, j, e.target.value)}
              />
            )}
            {error && (
              <div className="text-[11px] text-red-700 mt-0.5 px-1 max-w-56">
                {t(error)}
              </div>
            )}
          </td>
        );
      })}
      <td className="px-2 py-1 border-b align-top text-xs">
        {!issues ? null : ok ? (
          <span className="inline-flex items-center gap-1 text-primary font-medium mt-2">
            <CheckCircle2 size={14} />
            {t("Ready")}
          </span>
        ) : (
          <div className="text-red-700 mt-2 space-y-0.5">
            {general.map((i, k) => (
              <div key={k}>
                {i.field ? `${i.field}: ` : ""}
                {t(i.message)}
              </div>
            ))}
            {!general.length && (
              <div>
                {t("{count} fields to fix", { count: issues.length })}
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-1 py-1 border-b align-top">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          aria-label={t("Remove row {row}", { row: index })}
          onClick={() => onRemove(row.id)}
        >
          <Trash2 size={14} />
        </Button>
      </td>
    </tr>
  );
});
