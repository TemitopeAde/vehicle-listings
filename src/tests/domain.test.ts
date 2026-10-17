import { test } from "node:test";
import assert from "node:assert/strict";
import {
  vehicleInput,
  inquiryInput,
  mediaSchema,
  themeSchema,
  defaultTheme,
} from "../shared/schemas";
import { currencyOptions } from "../shared/currencies";
import {
  slugify,
  payment,
  transitions,
  csvCell,
  pageWindow,
} from "../shared/utils";
import { previewCSV, parseCSV, exportCSV } from "../shared/csv";
import { demoVehicles } from "../shared/demo";
import { rankSimilar, similarityScore } from "../shared/similarity";
const base = {
  title: "2022 Toyota Camry",
  stockId: "TEST-1",
  make: "Toyota",
  model: "Camry",
  year: 2022,
  price: 20000000,
};
test("validates vehicle facts and rejects unknown fields, invalid VIN and negative price", () => {
  assert.ok(vehicleInput.safeParse(base).success);
  assert.equal(
    vehicleInput.safeParse({ ...base, siteId: "other-site" }).success,
    false,
  );
  assert.equal(
    vehicleInput.safeParse({ ...base, vin: "INVALID" }).success,
    false,
  );
  assert.equal(vehicleInput.safeParse({ ...base, price: -10 }).success, false);
});
test("all agreed currencies validate and round trip through CSV without changing prices", () => {
  assert.deepEqual(
    currencyOptions.map(({ value }) => value),
    [
      "USD",
      "EUR",
      "GBP",
      "NGN",
      "CAD",
      "AUD",
      "INR",
      "ZAR",
      "GHS",
      "KES",
      "AED",
      "JPY",
      "CNY",
      "CHF",
      "SAR",
    ],
  );
  assert.equal(vehicleInput.parse(base).currency, "USD");
  assert.equal(defaultTheme.currency, "USD");
  for (const { value: currency } of currencyOptions) {
    assert.equal(vehicleInput.parse({ ...base, currency }).currency, currency);
    assert.equal(
      themeSchema.parse({ ...defaultTheme, currency }).currency,
      currency,
    );
    const vehicle = { ...demoVehicles[0], currency };
    const imported = previewCSV(exportCSV([vehicle]));
    assert.equal(imported.valid, 1);
    assert.equal(imported.rows[0].data?.currency, currency);
    assert.equal(imported.rows[0].data?.price, vehicle.price);
  }
  assert.equal(
    vehicleInput.safeParse({ ...base, currency: "XYZ" }).success,
    false,
  );
  assert.equal(
    themeSchema.safeParse({ ...defaultTheme, currency: "XYZ" }).success,
    false,
  );
});
test("rejects executable media URLs and requires consent on inquiries", () => {
  assert.equal(
    mediaSchema.safeParse({ url: "javascript:alert(1)" }).success,
    false,
  );
  assert.equal(
    inquiryInput.safeParse({
      vehicleId: "1",
      name: "Buyer",
      email: "buyer@example.com",
      message: "Please contact me",
      consent: false,
      idempotencyKey: crypto.randomUUID(),
    }).success,
    false,
  );
});
test("slug and payment math handle accents, punctuation and zero interest", () => {
  assert.equal(slugify("  Citroën C4 — 2023! "), "citroen-c4-2023");
  assert.equal(payment(120000, 0, 0, 12), 10000);
  assert.equal(payment(120000, 150000, 12, 48), 0);
  assert.equal(payment(120000, 0, 12, 0), 0);
});
test("lifecycle prevents selling drafts directly or republishing deleted listings", () => {
  assert.equal(transitions.draft.includes("sold"), false);
  assert.equal(transitions.deleted.includes("published"), false);
  assert.ok(transitions.archived.includes("draft"));
});
test("CSV parser handles quotes, multiline fields, BOM and duplicate stock IDs", () => {
  const r = parseCSV('\uFEFFa,b\r\n"one, two","line 1\nline 2"\r\n');
  assert.deepEqual(r.rows, [["one, two", "line 1\nline 2"]]);
  assert.throws(() => parseCSV("a,a\n1,2"));
  assert.throws(() => parseCSV('a\n"unclosed'));
  const csv =
    "stockId,title,make,model,year,price\n1,Toyota Camry,Toyota,Camry,2022,20\n1,Toyota Corolla,Toyota,Corolla,2021,15";
  const p = previewCSV(csv);
  assert.equal(p.valid, 1);
  assert.equal(p.invalid, 1);
});
test("export escapes quotes and spreadsheet formulas and round trips valid inventory", () => {
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  const csv = exportCSV(demoVehicles);
  assert.equal(previewCSV(csv).valid, demoVehicles.length);
});
test("page window collapses distant pages for large catalogs", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(2, 4), [1, 2, 3, 4]);
  assert.deepEqual(pageWindow(50, 290), [1, null, 49, 50, 51, null, 290]);
  assert.deepEqual(pageWindow(1, 290), [1, 2, null, 290]);
  assert.deepEqual(pageWindow(290, 290), [1, null, 289, 290]);
});
test("similar vehicles rank model, body/price and make matches above unrelated cars", () => {
  const car = (
    _id: string,
    extra: Partial<(typeof demoVehicles)[number]> = {},
  ) => ({ ...demoVehicles[0]!, _id, ...extra });
  const camry = car("base", {
    make: "Toyota",
    model: "Camry",
    bodyStyle: "Sedan",
    price: 20000,
    currency: "USD",
  });
  const sameModel = car("same-model", {
    make: "Toyota",
    model: "Camry",
    price: 30000,
  });
  const sameMake = car("same-make", {
    make: "Toyota",
    model: "Hilux",
    bodyStyle: "Truck",
    price: 30000,
  });
  const sameBody = car("same-body", {
    make: "Honda",
    model: "Accord",
    bodyStyle: "Sedan",
    price: 21000,
  });
  const unrelated = car("unrelated", {
    make: "Ford",
    model: "Transit",
    bodyStyle: "Van",
    price: 90000,
    fuel: "Diesel",
    year: camry.year - 10,
  });
  assert.deepEqual(
    rankSimilar(
      camry,
      [unrelated, sameBody, sameMake, camry, sameModel, sameModel],
      10,
    ).map((v) => v._id),
    // A same-size sedan at nearly the same price beats a same-brand pickup costing 50% more.
    ["same-model", "same-body", "same-make", "unrelated"],
  );
  assert.equal(
    rankSimilar(camry, [sameModel, unrelated], 1)[0]!._id,
    "same-model",
  );
  // A close price only counts in the same currency.
  assert.ok(
    similarityScore(camry, { ...sameBody, currency: "USD" }) >
      similarityScore(camry, { ...sameBody, currency: "EUR" }),
  );
});
test("every sample vehicle has a bundled real photo and the credit its licence requires", async () => {
  const { existsSync } = await import("node:fs");
  for (const v of demoVehicles) {
    const photo = v.media[0];
    assert.ok(photo, `${v.title} has no photo`);
    assert.match(photo.url, /^\/media\/samples\/[a-z0-9-]+\.jpg$/, v.title);
    assert.ok(existsSync(`public${photo.url}`), `${photo.url} is missing`);
    // Only the CC0 photo may omit a credit.
    if (!photo.credit) assert.equal(v.make + v.model, "ToyotaLand Cruiser");
    else
      assert.match(
        photo.creditUrl ?? "",
        /^https:\/\/commons\.wikimedia\.org\//,
      );
  }
});
