import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceQuoteStatus,
  quoteRequestSchema,
} from "../shared/quote-requests";

test("a quote request status only moves forward", () => {
  assert.equal(advanceQuoteStatus("new", "in-progress"), "in-progress");
  assert.equal(advanceQuoteStatus("in-progress", "quoted"), "quoted");
  assert.equal(advanceQuoteStatus("quoted", "in-progress"), "quoted");
  assert.equal(advanceQuoteStatus("in-progress", "in-progress"), "in-progress");
});

test("requests stored as Won or Lost read as Quote sent", () => {
  const row = {
    _id: "q1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+1 555 123 4567",
    quantity: 1,
    paymentMethod: "cash",
    timeline: "now",
    consent: true,
    vehicleId: "v1",
    createdAt: "",
    updatedAt: "",
  };
  assert.equal(quoteRequestSchema.parse({ ...row, status: "won" }).status, "quoted");
  assert.equal(quoteRequestSchema.parse({ ...row, status: "lost" }).status, "quoted");
  assert.equal(quoteRequestSchema.parse(row).status, "new");
});
