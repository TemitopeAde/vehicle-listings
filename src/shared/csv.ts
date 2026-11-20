import { vehicleInput, type Vehicle, type VehicleInput } from "./schemas";
import { csvCell } from "./utils";
import { bodyStyleError } from "./vehicle-options";
export const csvColumns = [
  "stockId",
  "title",
  "make",
  "model",
  "trim",
  "year",
  "price",
  "currency",
  "mileage",
  "mileageUnit",
  "condition",
  "category",
  "bodyStyle",
  "transmission",
  "fuel",
  "drivetrain",
  "engineSize",
  "horsepower",
  "doors",
  "seats",
  "exteriorColor",
  "interiorColor",
  "axles",
  "grossWeight",
  "payload",
  "bodyLength",
  "dealerId",
  "location",
  "features",
  "description",
  "vin",
] as const;
export type CsvColumn = (typeof csvColumns)[number];
/** Columns every row needs a value for; the rest have defaults. */
export const requiredCsvColumns: readonly CsvColumn[] = [
  "title",
  "make",
  "model",
  "year",
  "price",
];
const numberColumns = new Set<string>([
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
]);
/** List columns hold several values separated by semicolons. */
const listColumns = new Set<string>(["features"]);
const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** The column a CSV header most likely means, or "" when it matches none. */
export function csvColumnFor(header: string): CsvColumn | "" {
  const key = normalise(header);
  return csvColumns.find((c) => normalise(c) === key) ?? "";
}
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^﻿/, "");
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
/** Serialises a grid as CSV without altering any value, so it parses back exactly. */
export function toCSV(headers: string[], rows: string[][]) {
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
function cellValue(key: string, raw: string): unknown {
  if (numberColumns.has(key)) {
    const cleaned = raw.trim().replace(/[,\s]/g, "");
    return cleaned === "" ? undefined : Number(cleaned);
  }
  if (listColumns.has(key))
    return raw
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
  return raw;
}
export type CsvIssue = { field: string; message: string };
export type CsvRowResult = {
  row: number;
  data: VehicleInput | null;
  errors: string[];
  /** The same problems as `errors`, keyed by column; "" for whole-row problems. */
  issues: CsvIssue[];
};
/**
 * Validates already-parsed rows. `fields` gives the vehicle field for each
 * column; an empty string ignores that column.
 */
export function validateRows(fields: string[], rows: string[][]) {
  const seen = new Set<string>();
  const results: CsvRowResult[] = rows.map((cells, index) => {
    const data: Record<string, unknown> = {};
    fields.forEach((key, j) => {
      if (!key) return;
      const raw = cells[j];
      if (raw === undefined || raw.trim() === "") return;
      const value = cellValue(key, raw);
      if (value !== undefined) data[key] = value;
    });
    const result = vehicleInput.safeParse(data);
    const issues: CsvIssue[] =
      cells.length !== fields.length
        ? [{ field: "", message: "Column count does not match the header" }]
        : result.success
          ? []
          : result.error.issues.map((e) => {
              const field = String(e.path[0] ?? "");
              const value = field ? data[field] : null;
              return {
                field,
                message:
                  e.code !== "invalid_type"
                    ? e.message
                    : value === undefined
                      ? "Required"
                      : Number.isNaN(value)
                        ? "Enter a number"
                        : e.message,
              };
            });
    if (result.success && !issues.length) {
      const bodyError = bodyStyleError(
        result.data.category,
        result.data.bodyStyle,
      );
      if (bodyError) issues.push({ field: "bodyStyle", message: bodyError });
      const key = result.data.stockId.toLowerCase();
      if (key && seen.has(key))
        issues.push({
          field: "stockId",
          message: "Duplicate stock ID in this file",
        });
      if (key) seen.add(key);
    }
    return {
      row: index + 2,
      data: result.success && !issues.length ? result.data : null,
      errors: issues.map((i) =>
        i.field ? `${i.field}: ${i.message}` : i.message,
      ),
      issues,
    };
  });
  return {
    rows: results,
    valid: results.filter((r) => !r.errors.length).length,
    invalid: results.filter((r) => r.errors.length).length,
  };
}
export function previewCSV(text: string, mapping: Record<string, string> = {}) {
  if (text.length > 2_000_000)
    throw new Error("CSV must be smaller than 2 MB.");
  const parsed = parseCSV(text);
  if (parsed.rows.length > 1000)
    throw new Error("Import at most 1,000 rows at a time.");
  const fields = parsed.headers.map((h) => mapping[h] ?? (csvColumnFor(h) || h));
  return { headers: parsed.headers, ...validateRows(fields, parsed.rows) };
}
export function exportCSV(vehicles: Vehicle[]) {
  return [
    csvColumns.map(csvCell).join(","),
    ...vehicles.map((v) =>
      csvColumns
        .map((k) => {
          const value = v[k];
          return csvCell(Array.isArray(value) ? value.join("; ") : value);
        })
        .join(","),
    ),
  ].join("\r\n");
}
/** Example rows for the downloadable sample file; each one imports cleanly. */
export const sampleCsvRows: Partial<Record<CsvColumn, string>>[] = [
  {
    stockId: "STK-1001",
    title: "2021 Toyota Camry SE",
    make: "Toyota",
    model: "Camry",
    trim: "SE",
    year: "2021",
    price: "24500",
    currency: "USD",
    mileage: "32000",
    mileageUnit: "mi",
    condition: "used",
    category: "car",
    bodyStyle: "Sedan",
    transmission: "Automatic",
    fuel: "Petrol",
    drivetrain: "FWD",
    engineSize: "2.5L",
    horsepower: "203",
    doors: "4",
    seats: "5",
    exteriorColor: "Midnight Black",
    interiorColor: "Black",
    location: "Lagos",
    features: "Bluetooth; Backup camera; Lane keep assist",
    description: "One owner, full service history, accident free.",
    vin: "4T1G11AK5MU123456",
  },
  {
    stockId: "STK-1002",
    title: "2023 Honda CR-V EX-L AWD",
    make: "Honda",
    model: "CR-V",
    trim: "EX-L",
    year: "2023",
    price: "33900",
    currency: "USD",
    mileage: "12500",
    mileageUnit: "mi",
    condition: "certified",
    category: "car",
    bodyStyle: "SUV",
    transmission: "Automatic",
    fuel: "Hybrid",
    drivetrain: "AWD",
    engineSize: "2.0L",
    horsepower: "204",
    doors: "5",
    seats: "5",
    exteriorColor: "Platinum White",
    interiorColor: "Gray",
    location: "Abuja",
    features: "Leather seats; Sunroof; Apple CarPlay; Heated seats",
    description: "Certified pre-owned with remaining factory warranty.",
  },
  {
    stockId: "STK-1003",
    title: "2019 Mercedes-Benz Actros 1845 Tractor",
    make: "Mercedes-Benz",
    model: "Actros 1845",
    year: "2019",
    price: "68000",
    currency: "EUR",
    mileage: "410000",
    mileageUnit: "km",
    condition: "used",
    category: "lorry",
    bodyStyle: "Tractor unit",
    transmission: "Automated manual",
    fuel: "Diesel",
    horsepower: "449",
    doors: "2",
    seats: "2",
    axles: "2",
    grossWeight: "18000",
    payload: "0",
    location: "Hamburg",
    features: "Retarder; Air suspension; Sleeper cab",
    description: "Euro 6 tractor unit, well maintained fleet vehicle.",
  },
  {
    stockId: "STK-1004",
    title: "2020 Schmitz Cargobull Curtainsider Trailer",
    make: "Schmitz Cargobull",
    model: "S.CS",
    year: "2020",
    price: "21500",
    currency: "EUR",
    mileage: "0",
    mileageUnit: "km",
    condition: "used",
    category: "trailer",
    bodyStyle: "Curtainsider trailer",
    transmission: "None",
    fuel: "None",
    doors: "0",
    seats: "0",
    axles: "3",
    grossWeight: "39000",
    payload: "27000",
    bodyLength: "13.6",
    location: "Rotterdam",
    description: "Tri-axle curtainsider with disc brakes and lifting axle.",
  },
];
export function sampleCSV() {
  return (
    toCSV(
      [...csvColumns],
      sampleCsvRows.map((r) => csvColumns.map((c) => r[c] ?? "")),
    ) + "\r\n"
  );
}
