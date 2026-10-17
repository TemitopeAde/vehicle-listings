import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import type { Context } from "../backend/context";
import { dealerSchema } from "../shared/schemas";

const dataPath = ".data/dealer-portal-tests.json";
process.env.CAR_LISTING_DEMO_DATA = dataPath;

const owner: Context = {
  siteId: "local-demo",
  actorId: "owner",
  manager: true,
  demo: true,
};
const visitor: Context = {
  siteId: "local-demo",
  actorId: "visitor",
  manager: false,
  demo: true,
};
const application = {
  action: "apply" as const,
  payload: {
    businessName: "Harbor Motors",
    email: "harbor@example.com",
    location: "Seattle, WA",
  },
};
const listing = {
  title: "2024 Honda Civic",
  stockId: "HARBOR-1",
  make: "Honda",
  model: "Civic",
  year: 2024,
  price: 26000,
  description: "Verified 2024 Honda Civic with a complete inspection report.",
  media: [
    {
      url: "https://static.wixstatic.com/media/test.jpg",
      alt: "Honda Civic",
    },
  ],
  dealerId: "someone-else",
};

test("only an approved dealer can add a vehicle from the application link", async () => {
  await fs.rm(dataPath, { force: true });
  const { applyDealer, dealerFromAccess, saveDealer } = await import(
    "../backend/services/dealer-service.ts"
  );
  const { createVehicle, getVehicle, listVehicles, setStatus } = await import(
    "../backend/services/vehicle-service.ts"
  );
  const applied = await applyDealer(visitor, application);
  assert.equal(applied.approvalState, "pending");
  assert.match(applied.accessToken, /^[a-f0-9]{64}$/);
  const pending = await dealerFromAccess(visitor, applied.accessToken);
  assert.ok(pending);
  const pendingCtx: Context = {
    ...visitor,
    dealer: { id: pending._id, approvalState: "pending", demo: false },
  };
  await assert.rejects(
    () => createVehicle(pendingCtx, listing),
    /approved dealership/,
  );
  await assert.rejects(
    () => listVehicles(pendingCtx, {}, false),
    /approved dealership/,
  );

  await saveDealer(owner, { approvalState: "approved" }, pending._id);
  const approved = await dealerFromAccess(visitor, applied.accessToken);
  assert.equal(approved?.approvalState, "approved");
  assert.equal(approved?.accessToken, applied.accessToken);
  const dealerCtx: Context = {
    ...visitor,
    dealer: { id: pending._id, approvalState: "approved", demo: false },
  };
  const vehicle = await createVehicle(dealerCtx, listing);
  assert.equal(vehicle.dealerId, pending._id);
  assert.equal(vehicle.status, "draft");
  const published = await setStatus(dealerCtx, vehicle._id, "published");
  assert.equal(published.status, "published");
  const own = await listVehicles(dealerCtx, {}, false);
  assert.deepEqual(
    own.items.map((item) => item._id),
    [vehicle._id],
  );

  const other = await saveDealer(owner, {
    businessName: "Other Motors",
    approvalState: "approved",
    email: "other@example.com",
  });
  const otherCtx: Context = {
    ...visitor,
    dealer: { id: other._id, approvalState: "approved", demo: false },
  };
  const otherList = await listVehicles(
    otherCtx,
    { dealerId: pending._id },
    false,
  );
  assert.equal(otherList.items.length, 0);
  await assert.rejects(
    () => getVehicle(otherCtx, vehicle._id, false),
    /not found/i,
  );
  await assert.rejects(
    () => createVehicle({ ...visitor }, listing, crypto.randomUUID()),
    /permission/,
  );
  assert.equal(await dealerFromAccess(visitor, "nope"), null);
});

test("a logged-in account matches its dealership without a listing link", async () => {
  await fs.rm(dataPath, { force: true });
  const { applyDealer, dealerMatchingLogin, saveDealer } = await import(
    "../backend/services/dealer-service.ts"
  );
  const { saveRow } = await import("../backend/repositories/repository.ts");
  const account = {
    ...application,
    payload: { ...application.payload, email: "member@example.com" },
  };
  const applied = await applyDealer(visitor, account);
  await saveDealer(owner, { approvalState: "approved" }, applied._id);
  await assert.rejects(
    () =>
      applyDealer(visitor, {
        ...account,
        payload: { ...account.payload, businessName: "Harbor Again" },
      }),
    /already has an application/i,
  );
  const match = await dealerMatchingLogin(visitor, {
    email: "member@example.com",
  });
  assert.equal(match?._id, applied._id);
  assert.equal(match?.approvalState, "approved");

  const linked = dealerSchema.parse({
    _id: "member-dealer",
    businessName: "Member Motors",
    email: "public@example.com",
    approvalState: "approved",
    memberId: "member-7",
    demo: false,
    createdAt: "2026-10-17T12:00:00.000Z",
    updatedAt: "2026-10-17T12:00:00.000Z",
  });
  await saveRow(owner, "dealers", linked, true);
  assert.equal(
    (
      await dealerMatchingLogin(visitor, {
        email: "someone-else@example.com",
        memberId: "member-7",
      })
    )?._id,
    "member-dealer",
  );
  assert.equal(
    await dealerMatchingLogin(visitor, {
      email: "public@example.com",
      memberId: "someone-else",
    }),
    null,
  );
});

test("a manager can delete a dealer application", async () => {
  await fs.rm(dataPath, { force: true });
  const { applyDealer, deleteDealer, saveDealer } = await import(
    "../backend/services/dealer-service.ts"
  );
  const { getRow, saveRow } = await import(
    "../backend/repositories/repository.ts"
  );
  const { createVehicle, getVehicle, setStatus } = await import(
    "../backend/services/vehicle-service.ts"
  );
  const applied = await applyDealer(visitor, {
    ...application,
    payload: { ...application.payload, email: "delete-me@example.com" },
  });
  await assert.rejects(() => deleteDealer(visitor, applied._id), /permission/i);
  await saveDealer(owner, { approvalState: "approved" }, applied._id);
  const dealerCtx: Context = {
    ...visitor,
    dealer: { id: applied._id, approvalState: "approved", demo: false },
  };
  const vehicle = await createVehicle(dealerCtx, {
    ...listing,
    stockId: "DELETE-1",
  });
  await setStatus(dealerCtx, vehicle._id, "published");
  await deleteDealer(owner, applied._id);
  assert.equal(await getRow(owner, "dealers", applied._id), null);
  assert.equal((await getVehicle(owner, vehicle._id, false)).status, "archived");
  await assert.rejects(() => deleteDealer(owner, applied._id), /not found/i);
  const again = await applyDealer(visitor, {
    ...application,
    payload: { ...application.payload, email: "delete-me@example.com" },
  });
  assert.equal(again.approvalState, "pending");
  const sample = dealerSchema.parse({
    _id: "sample-delete",
    businessName: "Sample Motors",
    email: "sample-delete@example.com",
    approvalState: "approved",
    demo: true,
    createdAt: "2026-10-17T12:00:00.000Z",
    updatedAt: "2026-10-17T12:00:00.000Z",
  });
  await saveRow(owner, "dealers", sample, true);
  await assert.rejects(
    () => deleteDealer(owner, sample._id),
    /sample dealerships/i,
  );
});

test("a visitor cannot apply without a logged-in member", async () => {
  const { applyDealer } = await import("../backend/services/dealer-service.ts");
  const guest: Context = {
    siteId: "live",
    actorId: "visitor",
    manager: false,
    demo: false,
    subjectType: "VISITOR",
  };
  await assert.rejects(
    () => applyDealer(guest, application),
    /log in before applying/i,
  );
});
