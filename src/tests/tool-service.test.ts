import { test } from "node:test";
import assert from "node:assert/strict";
import tools, {
  descriptions,
} from "../extensions/backend/app-tools/inventory-tools/inventory-tools.extension";
import {
  buyerView,
  toolSchemas,
  type ToolName,
} from "../backend/services/tool-service";
import { quoteRequestSchema } from "../shared/quote-requests";

const names = Object.keys(toolSchemas) as ToolName[];

test("every tool fits Wix's App Tools limits", () => {
  assert.ok(names.length <= 100);
  for (const name of names) {
    const description = descriptions[name];
    assert.ok(name.length <= 50, name);
    assert.ok(
      description && description.length >= 10 && description.length <= 1000,
      `${name} needs a description of 10 to 1000 characters`,
    );
    const displayName = name.replace(/([A-Z])/g, " $1");
    assert.ok(displayName.length >= 2 && displayName.length <= 50, name);
  }
  assert.ok(tools);
});

test("Aria sees a requester's name and message but not their contact details", () => {
  const visible = buyerView(
    quoteRequestSchema.parse({
      _id: "q1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+1 555 123 4567",
      company: "Analytical Engines",
      addressLine: "1 Main St",
      city: "London",
      country: "GB",
      contactId: "contact-1",
      quantity: 1,
      paymentMethod: "cash",
      timeline: "now",
      consent: true,
      message: "Is it still available?",
      vehicleId: "v1",
      createdAt: "",
      updatedAt: "",
    }),
  );
  assert.equal(visible.firstName, "Ada");
  assert.equal(visible.message, "Is it still available?");
  for (const hidden of [
    "email",
    "phone",
    "company",
    "addressLine",
    "city",
    "country",
    "contactId",
  ])
    assert.equal(hidden in visible, false, hidden);
});

test("outward-facing and destructive tools need the user's confirmation", () => {
  const key = "7d1f6b0e-6a8f-4c43-9a43-3f1b7b5c2d10";
  const unconfirmed: [ToolName, Record<string, unknown>][] = [
    ["emailQuoteRequester", { quoteRequestId: "q1", subject: "Hi", html: "<p>Hi</p>", idempotencyKey: key }],
    ["emailInquiryBuyer", { inquiryId: "i1", subject: "Hi", html: "<p>Hi</p>", idempotencyKey: key }],
    ["createQuoteInvoice", { quoteRequestId: "q1" }],
    ["deleteQuoteRequest", { quoteRequestId: "q1" }],
    ["updateSettings", { patch: { brandName: "Cars" } }],
    ["loadDemoInventory", {}],
    ["clearDemoInventory", {}],
    ["deleteDealer", { dealerId: "d1" }],
    ["importVehiclesCsv", { csv: "make\nToyota", execute: true }],
  ];
  for (const [name, input] of unconfirmed)
    assert.equal(toolSchemas[name].safeParse(input).success, false, name);
  assert.equal(
    toolSchemas.importVehiclesCsv.safeParse({ csv: "make\nToyota" }).success,
    true,
    "a preview needs no confirmation",
  );
  assert.equal(
    toolSchemas.deleteDealer.safeParse({ dealerId: "d1", confirmed: true })
      .success,
    true,
  );
});
