import { test } from "node:test";
import assert from "node:assert/strict";
import type { Dealer } from "../shared/schemas";
import {
  notifyDealerApproved,
  notifyOwnerOfDealerApplication,
} from "../backend/services/dealer-email-service";
import type { InquiryEmailDependencies } from "../backend/services/inquiry-email-service";

const ctx = { siteId: "site-a", actorId: "owner", manager: true, demo: false };
const dealer = {
  _id: "dealer-a",
  businessName: "Harbor Motors",
  email: "harbor@example.com",
  phone: "+12065550100",
  location: "Seattle, WA",
  address: "1 Dock Street",
  website: "https://harbor.example",
  approvalState: "pending",
  demo: false,
  updatedAt: "2026-10-17T00:00:00.000Z",
} as Dealer;

function fixture() {
  const sent: {
    draft: Parameters<InquiryEmailDependencies["send"]>[0];
    key: string;
  }[] = [];
  const deps: InquiryEmailDependencies = {
    branding: async () => ({
      siteName: "Jane's Motors",
      enabled: true,
      replyTo: "owner@example.com",
    }),
    getRow: async () => null as never,
    saveRow: async (_ctx, _collection, value) => value,
    send: async (draft, key) => {
      sent.push({ draft, key });
      return { transmissionId: "transmission-a", status: "ACCEPTED" };
    },
  };
  return { deps, sent };
}

test("a dealer application emails the site owner and replies go to the applicant", async () => {
  const f = fixture();
  assert.equal(
    await notifyOwnerOfDealerApplication(ctx, dealer, f.deps),
    "queued",
  );
  assert.deepEqual(f.sent[0]?.draft.toRecipients, [
    { emailAddress: "owner@example.com", name: "Jane's Motors" },
  ]);
  assert.deepEqual(f.sent[0]?.draft.replyTo, {
    emailAddress: "harbor@example.com",
  });
  assert.equal(f.sent[0]?.draft.type, "TRANSACTIONAL");
  assert.match(f.sent[0]?.draft.emailSubject ?? "", /Harbor Motors/);
  assert.match(f.sent[0]?.draft.emailHtmlContent ?? "", /Seattle, WA/);
  assert.equal(
    await notifyOwnerOfDealerApplication({ ...ctx, demo: true }, dealer, f.deps),
    "demo",
  );
  assert.equal(f.sent.length, 1);
});

test("approval emails the dealership and a later approval can send again", async () => {
  const f = fixture();
  const approved = { ...dealer, approvalState: "approved" as const };
  assert.equal(await notifyDealerApproved(ctx, approved, f.deps), "queued");
  assert.deepEqual(f.sent[0]?.draft.toRecipients, [
    { emailAddress: "harbor@example.com", name: "Harbor Motors" },
  ]);
  assert.deepEqual(f.sent[0]?.draft.replyTo, {
    emailAddress: "owner@example.com",
  });
  assert.match(f.sent[0]?.draft.emailHtmlContent ?? "", /approved/);
  const again = { ...approved, updatedAt: "2026-10-18T00:00:00.000Z" };
  assert.equal(await notifyDealerApproved(ctx, again, f.deps), "queued");
  assert.notEqual(f.sent[0]?.key, f.sent[1]?.key);
  assert.equal(
    await notifyDealerApproved(ctx, { ...approved, email: "" }, f.deps),
    "no-recipient",
  );
  assert.equal(f.sent.length, 2);
});
