import { vehicleInput, type Vehicle } from "./schemas";
import { csvCell } from "./utils";
import { bodyStyleError } from "./vehicle-options";
export const csvColumns = [
  "stockId",
  "title",
  "make",
  "model",
  "year",
  "price",
  "currency",
  "mileage",
  "condition",
  "category",
  "bodyStyle",
  "transmission",
  "fuel",
  "axles",
  "grossWeight",
  "payload",
  "bodyLength",
  "dealerId",
  "location",
  "description",
  "vin",
] as const;
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') {
      if (cell) throw new Error("Unexpected quote in CSV");
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("A quoted CSV field is not closed.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((s) => s.trim()) ?? [];
  if (!headers.length || new Set(headers).size !== headers.length)
    throw new Error("CSV headers are missing or duplicated.");
  return { headers, rows };
}
export function previewCSV(text: string, mapping: Record<string, string> = {}) {
  if (text.length > 2_000_000)
    throw new Error("CSV must be smaller than 2 MB.");
  const parsed = parseCSV(text);
  if (parsed.rows.length > 1000)
    throw new Error("Import at most 1,000 rows at a time.");
  const seen = new Set<string>();
  const rows = parsed.rows.map((cells, index) => {
    const data: Record<string, unknown> = {};
    parsed.headers.forEach((header, j) => {
      const key = mapping[header] ?? header;
      if (cells[j] !== "" && cells[j] !== undefined)
        data[key] = [
          "year",
          "price",
          "mileage",
          "horsepower",
          "doors",
          "seats",
          "originalPrice",
          "axles",
          "grossWeight",
          "payload",
          "bodyLength",
        ].includes(key)
          ? Number(cells[j])
          : cells[j];
    });
    const result = vehicleInput.safeParse(data);
    let errors: string[] =
      cells.length !== parsed.headers.length
        ? ["Column count does not match the header"]
        : result.success
          ? []
          : result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    if (result.success) {
      const bodyError = bodyStyleError(
        result.data.category,
        result.data.bodyStyle,
      );
      if (bodyError) errors.push(`bodyStyle: ${bodyError}`);
      const key = result.data.stockId.toLowerCase();
      if (key && seen.has(key)) errors.push("Duplicate stock ID in this file");
      if (key) seen.add(key);
    }
    return {
      row: index + 2,
      data: result.success ? result.data : null,
      errors,
    };
  });
  return {
    headers: parsed.headers,
    rows,
    valid: rows.filter((r) => !r.errors.length).length,
    invalid: rows.filter((r) => r.errors.length).length,
  };
}
export function exportCSV(vehicles: Vehicle[]) {
  return [
    csvColumns.map(csvCell).join(","),
    ...vehicles.map((v) => csvColumns.map((k) => csvCell(v[k])).join(",")),
  ].join("\r\n");
}
