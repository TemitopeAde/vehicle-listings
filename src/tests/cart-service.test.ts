import assert from "node:assert/strict";
import { test } from "node:test";
import { demoVehicles } from "../shared/demo";
import { vehicleSchema, type Vehicle } from "../shared/schemas";
import {
  assertPurchasable,
  vehicleCartItem,
  vehicleCatalogAppId,
  vehicleLineItemIds,
} from "../backend/services/cart-service";

const listed = (overrides: Partial<Vehicle> = {}): Vehicle =>
  vehicleSchema.parse({
    ...demoVehicles[0],
    _id: "vehicle-1",
    demo: false,
    status: "published",
    price: 24500,
    media: [],
    ...overrides,
  });

test("only published, priced, real vehicles can be bought", () => {
  assert.doesNotThrow(() => assertPurchasable(listed()));
  for (const overrides of [
    { status: "reserved" },
    { status: "sold" },
    { demo: true },
    { price: 0 },
    { price: 2_000_000_000 },
  ] as Partial<Vehicle>[])
    assert.throws(() => assertPurchasable(listed(overrides)), /bought online|available/);
});

test("the cart item carries the inventory price as a single, unshipped vehicle", () => {
  const item = vehicleCartItem(listed({ price: 24500.5 }));
  assert.equal(item.pricing.price.amount, "24500.50");
  assert.deepEqual(item.quantityInfo, { requestedQuantity: 1, fixedQuantity: true });
  assert.equal(item.attributes.physicalProperties.shippable, false);
  assert.equal(item.source.catalogReference.appId, vehicleCatalogAppId);
  assert.equal(item.source.catalogReference.catalogItemId, "vehicle-1");
  assert.equal("image" in item.attributes, false);
});

test("cart lines are matched to this app's vehicle only", () => {
  const ref = (appId: string, catalogItemId: string) => ({
    source: { catalogReference: { appId, catalogItemId } },
  });
  const cart = {
    lineItems: [
      { _id: "a", ...ref(vehicleCatalogAppId, "vehicle-1") },
      { _id: "b", ...ref("215238eb-22a5-4c36-9e7b-e7c08025e04e", "vehicle-1") },
      { _id: "c", ...ref(vehicleCatalogAppId, "vehicle-2") },
    ],
  };
  assert.deepEqual(vehicleLineItemIds(cart, "vehicle-1"), ["a"]);
  assert.deepEqual(vehicleLineItemIds(undefined, "vehicle-1"), []);
});
