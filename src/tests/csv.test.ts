import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvColumnFor,
  parseCSV,
  previewCSV,
  sampleCSV,
  toCSV,
  validateRows,
} from "../shared/csv";

test("the downloadable sample CSV imports without errors", () => {
  const preview = previewCSV(sampleCSV());
  assert.equal(preview.invalid, 0);
  assert.ok(preview.valid >= 4);
  assert.deepEqual(preview.rows[0].data?.features, [
    "Bluetooth",
    "Backup camera",
    "Lane keep assist",
  ]);
});

test("friendly headers map to vehicle fields", () => {
  assert.equal(csvColumnFor("Stock ID"), "stockId");
  assert.equal(csvColumnFor("body_style"), "bodyStyle");
  assert.equal(csvColumnFor("Colour"), "");
});

test("issues point at the column that needs fixing", () => {
  const { rows } = validateRows(
    ["title", "make", "year", "price"],
    [["2020 Ford Focus", "Ford", "twenty", "9,500"]],
  );
  const fields = rows[0].issues.map((i) => i.field).sort();
  assert.deepEqual(fields, ["model", "year"]);
  assert.equal(
    rows[0].issues.find((i) => i.field === "year")?.message,
    "Enter a number",
  );
});

test("edited grids round-trip through CSV unchanged", () => {
  const headers = ["title", "description"];
  const rows = [["Quote \"test\", ok", "-leading dash\nnew line"]];
  assert.deepEqual(parseCSV(toCSV(headers, rows)), { headers, rows });
});
