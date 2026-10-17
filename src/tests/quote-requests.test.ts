import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quoteRequestForm,
  quoteRequestInput,
  quoteRequestSchema,
} from "../shared/quote-requests";
import {
  confirmQuoteRequest,
  notifyQuoteOwner,
  replyToQuoteRequest,
} from "../backend/services/quote-request-email-service";
import {
  quoteContact,
  syncQuoteContact,
  type QuoteContactDependencies,
} from "../backend/services/quote-request-contact-service";
import type { InquiryEmailDependencies } from "../backend/services/inquiry-email-service";
import type { Row } from "../backend/repositories/repository";

const visitor = { siteId: "site-a", actorId: "visitor", manager: false, demo: false };
const owner = { ...visitor, actorId: "owner", manager: true };
const form = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "+1 555 123 4567",
  quantity: "2",
  paymentMethod: "finance",
  timeline: "this-month",
  tradeIn: false,
  consent: true,
};
const stored = () =>
  quoteRequestSchema.parse({
    ...quoteRequestForm.parse(form),
    _id: "quote-a",
    vehicleId: "vehicle-a",
    vehicleTitle: "2022 Toyota Camry <SE>",
    stockId: "C-1",
    dealerId: "dealer-a",
    currency: "USD",
    listedPrice: 25000,
    createdAt: "2026-10-16T10:00:00.000Z",
    updatedAt: "2026-10-16T10:00:00.000Z",
  }) as unknown as Row;

function emailFixture(rows: Record<string, Row | null>) {
  const sent: Parameters<InquiryEmailDependencies["send"]>[0][] = [];
  const keys: string[] = [];
  const saves: { row: Row; insert?: boolean; elevated?: boolean }[] = [];
  const deps: InquiryEmailDependencies = {
    branding: async () => ({
      siteName: "Jane's Motors",
      enabled: true,
      replyTo: "Team@Example.com",
    }),
    getRow: async (_ctx, collection, id) =>
      (rows[`${collection}/${id}`] ?? null) as Row,
    saveRow: async (_ctx, collection, row, insert, elevated) => {
      rows[`${collection}/${row._id}`] = row;
      saves.push({ row, insert, elevated });
      return row;
    },
    send: async (draft, key) => {
      sent.push(draft);
      keys.push(key);
      return { transmissionId: `t-${sent.length}`, status: "QUEUED" };
    },
  };
  return { deps, sent, keys, saves, rows };
}

test("the quote form schema requires the Wix customer contact fields", () => {
  const result = quoteRequestForm.safeParse({
    ...form,
    firstName: " ",
    email: "not-an-email",
    phone: "12",
    paymentMethod: "",
    consent: false,
  });
  assert.equal(result.success, false);
  const fields = new Set(result.error?.issues.map((i) => i.path.join(".")));
  for (const field of ["firstName", "email", "phone", "paymentMethod", "consent"])
    assert.ok(fields.has(field), `${field} should be invalid`);
  assert.equal(quoteRequestForm.parse(form).quantity, 2);
});

test("trade-in details are required only when trading in", () => {
  const result = quoteRequestForm.safeParse({ ...form, tradeIn: true });
  assert.equal(result.success, false);
  assert.deepEqual(result.error?.issues[0]?.path, ["tradeInDetails"]);
  assert.ok(
    quoteRequestForm.safeParse({
      ...form,
      tradeIn: true,
      tradeInDetails: "2015 Honda Civic, 90k miles",
    }).success,
  );
});

test("the API input rejects unknown fields and a filled honeypot", () => {
  const base = {
    ...form,
    vehicleId: "vehicle-a",
    idempotencyKey: "81108896-96f2-4f67-8b4e-57dc7a0ff8a8",
  };
  assert.ok(quoteRequestInput.safeParse(base).success);
  assert.equal(quoteRequestInput.safeParse({ ...base, admin: true }).success, false);
  assert.equal(
    quoteRequestInput.safeParse({ ...base, honeypot: "spam" }).success,
    false,
  );
});

test("the owner is notified at the site and dealer emails, with replies to the requester", async () => {
  const f = emailFixture({
    "quote-requests/quote-a": stored(),
    "dealers/dealer-a": { _id: "dealer-a", email: "team@example.com" },
  });
  assert.equal(await notifyQuoteOwner(visitor, "quote-a", f.deps), "queued");
  assert.equal(f.sent.length, 1);
  // The site and dealer email are the same address, so it is sent once.
  assert.deepEqual(
    f.sent[0]?.toRecipients.map((r) => r.emailAddress),
    ["team@example.com"],
  );
  assert.deepEqual(f.sent[0]?.replyTo, { emailAddress: "jane@example.com" });
  assert.match(f.sent[0]?.emailHtmlContent ?? "", /Camry &lt;SE&gt;/);
  assert.equal(f.rows["quote-requests/quote-a"]?.ownerEmailStatus, "queued");
  // Status is saved as an elevated update, because the submitter is a visitor.
  assert.deepEqual(
    f.saves.map((s) => [s.insert, s.elevated]),
    [[false, true]],
  );
  assert.equal(await notifyQuoteOwner(visitor, "quote-a", f.deps), "queued");
  assert.equal(f.sent.length, 1);
});

test("the requester gets a confirmation once, and a failure is recorded", async () => {
  const f = emailFixture({ "quote-requests/quote-a": stored() });
  assert.equal(await confirmQuoteRequest(visitor, "quote-a", f.deps), "queued");
  assert.equal(await confirmQuoteRequest(visitor, "quote-a", f.deps), "queued");
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.sent[0]?.toRecipients, [
    { emailAddress: "jane@example.com", name: "Jane Doe" },
  ]);
  const failing = emailFixture({ "quote-requests/quote-a": stored() });
  failing.deps.send = async () => {
    throw new Error("quota");
  };
  assert.equal(
    await confirmQuoteRequest(visitor, "quote-a", failing.deps),
    "failed",
  );
  assert.equal(
    failing.rows["quote-requests/quote-a"]?.confirmationEmailStatus,
    "failed",
  );
});

test("only collaborators can email a requester, and only at the stored address", async () => {
  const f = emailFixture({ "quote-requests/quote-a": stored() });
  const reply = {
    id: "quote-a",
    subject: "Your quote",
    html: "<p>Here is your <strong>price</strong>.</p><script>x</script>",
    idempotencyKey: "81108896-96f2-4f67-8b4e-57dc7a0ff8a8",
  };
  await assert.rejects(replyToQuoteRequest(visitor, reply, f.deps), {
    code: "FORBIDDEN",
  });
  await replyToQuoteRequest(owner, reply, f.deps);
  assert.equal(f.sent[0]?.toRecipients[0]?.emailAddress, "jane@example.com");
  assert.doesNotMatch(f.sent[0]?.emailHtmlContent ?? "", /script/);
  await assert.rejects(
    replyToQuoteRequest(owner, { ...reply, email: "x@example.com" }, f.deps),
  );
});

test("requesters become Wix contacts without overwriting a stored contact", async () => {
  const row = stored();
  row.country = "us";
  row.city = "Austin";
  const contact = quoteContact(quoteRequestSchema.parse(row));
  assert.deepEqual(contact.name, { first: "Jane", last: "Doe" });
  assert.deepEqual(contact.addresses, [
    { tag: "BILLING", address: { city: "Austin", country: "US" } },
  ]);
  // A free-text country is not a Wix country code, so it is left off the contact.
  assert.equal(
    quoteContact(quoteRequestSchema.parse({ ...row, country: "Nigeria" }))
      .addresses?.[0]?.address.country,
    undefined,
  );

  const rows: Record<string, Row> = { "quote-a": row };
  const upserts: unknown[] = [];
  const deps: QuoteContactDependencies = {
    getRow: async (_ctx, _collection, id) => rows[id] ?? null,
    saveRow: async (_ctx, _collection, value) => (rows[value._id] = value),
    upsert: async (c) => {
      upserts.push(c);
      return "contact-1";
    },
  };
  assert.equal(await syncQuoteContact(visitor, "quote-a", deps), "added");
  assert.equal(rows["quote-a"]?.contactId, "contact-1");
  assert.equal(await syncQuoteContact(visitor, "quote-a", deps), "added");
  assert.equal(upserts.length, 1);
  deps.upsert = async () => {
    throw new Error("permission");
  };
  rows["quote-a"] = { ...row, contactId: "" };
  assert.equal(await syncQuoteContact(visitor, "quote-a", deps), "failed");
});
