import { test } from "node:test";
import assert from "node:assert/strict";
import {
  brandedEmail,
  emailKey,
  sanitizeEmailBody,
} from "../backend/services/inquiry-email-content";
import {
  confirmInquiry,
  replyToInquiry,
  type InquiryEmailDependencies,
} from "../backend/services/inquiry-email-service";
import type { Row } from "../backend/repositories/repository";

const ctx = { siteId: "site-a", actorId: "owner", manager: true, demo: false };
const input = {
  id: "inquiry-a",
  subject: "Your inquiry",
  html: "<p>Thanks <strong>Jane</strong>!</p>",
  idempotencyKey: "81108896-96f2-4f67-8b4e-57dc7a0ff8a8",
};
function fixture() {
  let row: Row = {
    _id: input.id,
    vehicleId: "vehicle-a",
    dealerId: "dealer-a",
    name: "Jane",
    email: "jane@example.com",
    message: "Please contact me about this vehicle.",
    consent: true,
    kind: "inquiry",
    createdAt: "2026-10-10",
    updatedAt: "2026-10-10",
  };
  const sent: {
    draft: Parameters<InquiryEmailDependencies["send"]>[0];
    key: string;
  }[] = [];
  const deps: InquiryEmailDependencies = {
    branding: async () => ({
      siteName: "Jane's Motors & Cars",
      enabled: true,
      replyTo: "team@example.com",
    }),
    getRow: async () => row,
    saveRow: async (_ctx, _collection, value) => {
      row = value;
      return value;
    },
    send: async (draft, key) => {
      sent.push({ draft, key });
      return { transmissionId: "transmission-a", status: "ACCEPTED" };
    },
  };
  return { deps, sent, row: () => row };
}

test("rich emails preserve formatting, strip active content and always include the full website name", () => {
  const name = "Website & <script>" + " Long name".repeat(25);
  const email = brandedEmail(
    name,
    "Question\r\nReply",
    '<p onclick="evil()">Hello <strong>buyer</strong><script>evil()</script><img src="x" onerror="evil()"><a href="javascript:evil()">link</a></p>',
  );
  assert.ok(
    email.emailHtmlContent.includes(
      "Website &amp; &lt;script&gt;" + " Long name".repeat(25),
    ),
  );
  assert.ok(email.emailHtmlContent.includes("<strong>buyer</strong>"));
  assert.doesNotMatch(
    email.emailHtmlContent,
    /onclick|onerror|javascript:|<script>|<img/,
  );
  assert.ok(email.emailSubject.length <= 200);
  assert.ok(email.senderName.length <= 50);
  assert.doesNotMatch(email.emailSubject, /[\r\n]/);
  assert.throws(
    () => brandedEmail(" ", "Question", "<p>Hello</p>"),
    /website name/,
  );
  assert.throws(() => sanitizeEmailBody("<p><br></p>"), /message/);
  assert.throws(() => sanitizeEmailBody("<p>&nbsp;</p>"), /message/);
});

test("dashboard replies use the stored recipient and enforce collaborator access and strict inputs", async () => {
  const f = fixture();
  const result = await replyToInquiry(ctx, input, f.deps);
  assert.equal(result.status, "ACCEPTED");
  assert.deepEqual(f.sent[0]?.draft.toRecipients, [
    { emailAddress: "jane@example.com", name: "Jane" },
  ]);
  assert.equal(f.sent[0]?.draft.type, "TRANSACTIONAL");
  assert.deepEqual(f.sent[0]?.draft.replyTo, {
    emailAddress: "team@example.com",
  });
  assert.ok(f.sent[0]?.draft.emailSubject.includes("Jane's Motors & Cars"));
  await assert.rejects(
    () => replyToInquiry({ ...ctx, manager: false }, input, f.deps),
    /collaborators/,
  );
  await assert.rejects(() =>
    replyToInquiry(ctx, { ...input, email: "other@example.com" }, f.deps),
  );
  await assert.rejects(
    () => replyToInquiry({ ...ctx, demo: true }, input, f.deps),
    /local demo/,
  );
  assert.equal(f.sent.length, 1);
});

test("automatic confirmations persist failures and retry with the same transmission key without losing the inquiry", async () => {
  const f = fixture();
  const send = f.deps.send;
  const failedKeys: string[] = [];
  f.deps.send = async (_draft, key) => {
    failedKeys.push(key);
    throw new Error("OUT_OF_QUOTA");
  };
  assert.equal(
    await confirmInquiry({ ...ctx, manager: false }, input.id, f.deps),
    "failed",
  );
  assert.equal(f.row().confirmationEmailStatus, "failed");
  assert.equal(f.row().email, "jane@example.com");
  f.deps.send = send;
  assert.equal(await confirmInquiry(ctx, input.id, f.deps), "queued");
  assert.equal(f.sent[0]?.key, failedKeys[0]);
  assert.equal(f.row().confirmationTransmissionId, "transmission-a");
  assert.equal(await confirmInquiry(ctx, input.id, f.deps), "queued");
  assert.equal(f.sent.length, 1);
  assert.ok(
    f.sent[0]?.draft.emailHtmlContent.includes("Jane&#39;s Motors &amp; Cars"),
  );
});

test("email retries preserve their UUID and keys are isolated by website and inquiry", () => {
  const key = emailKey(ctx.siteId, input.id, input.idempotencyKey);
  assert.match(
    key,
    /^[a-f\d]{8}-[a-f\d]{4}-5[a-f\d]{3}-a[a-f\d]{3}-[a-f\d]{12}$/,
  );
  assert.equal(key, emailKey(ctx.siteId, input.id, input.idempotencyKey));
  assert.notEqual(
    key,
    emailKey("another-site", input.id, input.idempotencyKey),
  );
  assert.notEqual(
    key,
    emailKey(ctx.siteId, "another-inquiry", input.idempotencyKey),
  );
});
