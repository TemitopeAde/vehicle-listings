import { test } from "node:test";
import assert from "node:assert/strict";
import { inquiryForm } from "../shared/inquiries";
import { inquiryInput } from "../shared/schemas";

const valid = {
  name: "  Jane Buyer  ",
  email: "  jane@example.com  ",
  phone: "",
  message: "  Please send more details about this vehicle.  ",
  consent: true,
  kind: "test-drive",
  preferredDate: "",
};

test("inquiry form rejects invalid fields before an API request", () => {
  const result = inquiryForm.safeParse({
    ...valid,
    name: " ",
    email: "invalid",
    message: "short",
    consent: false,
    kind: "",
  });
  assert.equal(result.success, false);
  if (result.success) return;
  assert.deepEqual(result.error.issues.map((issue) => issue.path[0]).sort(), [
    "consent",
    "email",
    "kind",
    "message",
    "name",
  ]);
});

test("valid form data follows the API schema and trims contact details", () => {
  const values = inquiryForm.parse(valid);
  const input = inquiryInput.parse({
    ...values,
    vehicleId: "vehicle-1",
    honeypot: "",
    idempotencyKey: "81108896-96f2-4f67-8b4e-57dc7a0ff8a8",
  });
  assert.equal(input.name, "Jane Buyer");
  assert.equal(input.email, "jane@example.com");
  assert.equal(input.message, "Please send more details about this vehicle.");
  assert.equal(input.phone, "");
  assert.equal(input.consent, true);
  assert.equal(input.kind, "test-drive");
});

test("inquiry length limits are enforced by Zod", () => {
  for (const [field, maximum] of [
    ["name", 100],
    ["email", 150],
    ["phone", 40],
    ["message", 3000],
  ] as const) {
    const result = inquiryForm.safeParse({
      ...valid,
      [field]: "a".repeat(maximum + 1),
    });
    assert.equal(result.success, false, field);
    if (!result.success)
      assert.ok(result.error.issues.some((issue) => issue.path[0] === field));
  }
});
