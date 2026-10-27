import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createQuoteInvoice,
  quoteInvoice,
  type QuoteInvoiceDependencies,
} from "../backend/services/quote-request-invoice-service";
import { quoteRequestSchema } from "../shared/quote-requests";
import type { Context } from "../backend/context";
import type { PlanKey } from "../shared/plans";

const ctx: Context = { siteId: "site-1", actorId: "user-1", manager: true };
const now = new Date("2026-10-27T00:00:00.000Z");
const row = {
  _id: "q1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+1 555 123 4567",
  quantity: 2,
  paymentMethod: "cash",
  timeline: "now",
  consent: true,
  vehicleId: "v1",
  vehicleTitle: "2024 Toyota Hilux",
  stockId: "HX-1",
  currency: "USD",
  listedPrice: 42000,
  contactId: "contact-1",
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

function stub(stored: Record<string, unknown>, plan: PlanKey = "business") {
  const calls = { create: 0, saved: [] as Record<string, unknown>[] };
  const found = { _id: "q1", ...stored };
  const deps: QuoteInvoiceDependencies = {
    getRow: async () => found,
    saveRow: async (_ctx, _collection, value) => {
      calls.saved.push(value);
      return value;
    },
    syncContact: async () => "added",
    audit: async () => {},
    plan: async () => plan,
    create: async () => {
      calls.create++;
      return "invoice-1";
    },
  };
  return { deps, calls };
}

test("an invoice uses the listed price when no quote was saved", () => {
  const invoice = quoteInvoice(quoteRequestSchema.parse(row), now);
  assert.deepEqual(invoice.lineItems[0].customItem, {
    name: "2024 Toyota Hilux",
    description: "Stock HX-1",
    quantity: "2",
    price: "42000",
  });
  assert.equal(invoice.currency, "USD");
  assert.equal(invoice.customerInfo.contactId, "contact-1");
  assert.equal("billingAddress" in invoice.customerInfo, false);
});

test("an invoice uses the quoted price and sends only ISO country codes", () => {
  const priced = quoteInvoice(
    quoteRequestSchema.parse({ ...row, quotedPrice: 39500.5, country: "ng" }),
    now,
  );
  assert.equal(priced.lineItems[0].customItem.price, "39500.5");
  assert.deepEqual(priced.customerInfo.billingAddress, { country: "NG" });
  const named = quoteInvoice(
    quoteRequestSchema.parse({ ...row, city: "Lagos", country: "Nigeria" }),
    now,
  );
  assert.deepEqual(named.customerInfo.billingAddress, { city: "Lagos" });
});

test("an invoice sends states as ISO 3166-2 codes", () => {
  const address = (subdivision: string, country = "NG") =>
    quoteInvoice(
      quoteRequestSchema.parse({ ...row, subdivision, country }),
      now,
    ).customerInfo.billingAddress;
  assert.deepEqual(address("la"), { subdivision: "NG-LA", country: "NG" });
  assert.deepEqual(address("NG-FC"), { subdivision: "NG-FC", country: "NG" });
  assert.deepEqual(address("Lagos State"), { country: "NG" });
  assert.deepEqual(address("LA", "Nigeria"), undefined);
});

test("a quote request is invoiced once", async () => {
  const { deps, calls } = stub({ ...row, invoiceId: "existing" });
  const result = await createQuoteInvoice(ctx, "q1", deps);
  assert.equal(result.invoiceId, "existing");
  assert.equal(calls.create, 0);
  assert.equal(calls.saved.length, 0);
});

test("a new invoice ID is saved on the quote request", async () => {
  const { deps, calls } = stub(row);
  const result = await createQuoteInvoice(ctx, "q1", deps);
  assert.equal(result.invoiceId, "invoice-1");
  assert.equal(
    result.invoicesUrl,
    "https://manage.wix.com/dashboard/site-1/wix-invoices",
  );
  assert.equal(calls.create, 1);
  assert.equal(calls.saved[0].invoiceId, "invoice-1");
  assert.equal(calls.saved[0].status, "quoted");
});

test("an invoice needs a currency", async () => {
  const { deps, calls } = stub({ ...row, currency: "" });
  await assert.rejects(createQuoteInvoice(ctx, "q1", deps), /currency/);
  assert.equal(calls.create, 0);
});

test("only the Business plan can create invoices", async () => {
  for (const plan of ["basic", "pro"] as const) {
    const { deps, calls } = stub(row, plan);
    await assert.rejects(createQuoteInvoice(ctx, "q1", deps), /Business plan/);
    assert.equal(calls.create, 0);
  }
});

test("an existing invoice stays reachable after a downgrade", async () => {
  const { deps } = stub({ ...row, invoiceId: "existing" }, "basic");
  assert.equal(
    (await createQuoteInvoice(ctx, "q1", deps)).invoiceId,
    "existing",
  );
});
