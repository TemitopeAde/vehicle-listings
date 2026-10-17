import { test } from "node:test";
import assert from "node:assert/strict";
import { demoVehicles } from "../shared/demo";
import {
  formatPriceDate,
  openingPriceHistory,
  priceDelta,
} from "../shared/price-history";

test("a listing with an original price shows that drop before any saved changes", () => {
  const camry = demoVehicles[0];
  assert.ok(camry);
  const points = openingPriceHistory(camry);
  assert.deepEqual(
    points.map((point) => point.price),
    [camry.originalPrice, camry.price],
  );
  assert.equal(points[0]?.recordedAt, camry.createdAt);
  const listed = points[0];
  const current = points[1];
  assert.ok(listed && current);
  const change = priceDelta(listed, current);
  assert.equal(change?.amount, camry.price - (camry.originalPrice ?? 0));
});

test("a listing without an original price has a single listed point", () => {
  const vehicle = demoVehicles.find((item) => item.originalPrice === undefined);
  assert.ok(vehicle);
  const points = openingPriceHistory(vehicle);
  assert.equal(points.length, 1);
  assert.equal(points[0]?.price, vehicle.price);
  assert.equal(points[0]?.recordedAt, vehicle.createdAt);
});

test("a currency change is not described as a price increase", () => {
  assert.equal(
    priceDelta(
      { price: 100, currency: "USD" },
      { price: 100, currency: "EUR" },
    ),
    null,
  );
});

test("price dates are formatted in UTC", () => {
  assert.equal(formatPriceDate("2026-10-10T08:00:00.000Z"), "Oct 10, 2026");
});
