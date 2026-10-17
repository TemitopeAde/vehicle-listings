import { before, test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import {
  createVehicle,
  setStatus,
  updateVehicle,
  listVehicles,
  listVehicleMakes,
  getVehicle,
  similarVehicles,
  applyCategoryRules,
} from "../backend/services/vehicle-service";
import { priceHistoryFor } from "../backend/services/price-history-service";
import { saveDealer } from "../backend/services/dealer-service";
import {
  submitInquiry,
  listInquiries,
} from "../backend/services/inquiry-service";
import { runTool } from "../backend/services/tool-service";
import { importCSV } from "../backend/services/import-service";
import { defaultTheme, vehicleInput } from "../shared/schemas";
import { demoVehicles } from "../shared/demo";
import { setSettings, getSettings } from "../backend/services/settings-service";
const ctx = {
  siteId: "local-demo",
  actorId: "owner",
  manager: true,
  demo: true,
};
const data = {
  title: "2022 Toyota Camry",
  stockId: "UNIT-1",
  make: "Toyota",
  model: "Camry",
  year: 2022,
  price: 20000000,
  description: "Verified stock with a complete inspection report.",
  media: [
    { url: "https://static.wixstatic.com/media/test.jpg", alt: "Toyota Camry" },
  ],
};
before(async () => {
  await fs.rm(".data/service-tests.json", { force: true });
});
test("inventory, publications, inquiry privacy and imports share the service rules", async () => {
  await assert.rejects(
    () => createVehicle({ ...ctx, manager: false }, data),
    /permission/,
  );
  const dealer = await saveDealer(ctx, {
    businessName: "Test Dealership",
    approvalState: "approved",
    email: "dealer@example.com",
  });
  const key = crypto.randomUUID(),
    v = await createVehicle(ctx, { ...data, dealerId: dealer._id }, key);
  assert.equal(
    (await createVehicle(ctx, { ...data, dealerId: dealer._id }, key))._id,
    v._id,
  );
  // Until a real vehicle is public, visitors see the sample cars instead of an empty showroom.
  const beforePublish = await listVehicles(
    { ...ctx, manager: false },
    {},
    true,
  );
  assert.equal(beforePublish.samples, true);
  assert.ok(beforePublish.items.length > 0);
  assert.ok(beforePublish.items.every((item) => item.demo));
  await assert.rejects(() => setStatus(ctx, "demo-1", "published"), /Demo/);
  // Category filters: cars exclude lorries and trailers (and match rows saved before categories).
  const visitor = { ...ctx, manager: false };
  const trailers = await listVehicles(visitor, { category: "trailer" }, true);
  assert.ok(trailers.items.length > 0);
  assert.ok(trailers.items.every((item) => item.category === "trailer"));
  const lorries = await listVehicles(visitor, { category: "lorry" }, true);
  assert.ok(lorries.items.every((item) => item.category === "lorry"));
  const cars = await listVehicles(
    visitor,
    { category: "car", limit: 100 },
    true,
  );
  assert.ok(cars.items.length > 0);
  assert.ok(cars.items.every((item) => item.category === "car"));
  assert.equal(
    cars.total + lorries.total + trailers.total,
    (await listVehicles(visitor, { limit: 100 }, true)).total,
  );
  // The Vehicle Details widget opens sample cars by slug while the showroom is empty.
  const sampleSlug = beforePublish.items[0].slug;
  assert.equal(
    (
      await getVehicle(
        { ...ctx, manager: false },
        sampleSlug,
        true,
        true,
        "slug",
      )
    ).slug,
    sampleSlug,
  );
  await assert.rejects(
    () => createVehicle(ctx, { ...data, dealerId: dealer._id }),
    /already exists/,
  );
  await setStatus(ctx, v._id, "published");
  assert.equal(
    (await getVehicle({ ...ctx, manager: false }, v.slug, true, false, "slug"))
      ._id,
    v._id,
  );
  await updateVehicle(ctx, v._id, {
    media: [
      ...data.media,
      { url: "https://static.wixstatic.com/media/rear.jpg", alt: "Rear view" },
    ],
    videos: [
      {
        url: "https://video.wixstatic.com/video/walkaround/file.mp4",
        title: "Walkaround",
        fileId: "walkaround",
      },
    ],
  });
  const publicInventory = await listVehicles(
    { ...ctx, manager: false },
    {},
    true,
  );
  assert.equal(publicInventory.items[0].media.length, 2);
  assert.equal(publicInventory.items[0].description, data.description);
  assert.equal(publicInventory.items[0].price, data.price);
  assert.equal(publicInventory.items[0].videos[0].title, "Walkaround");
  assert.equal(
    (await listVehicles({ ...ctx, manager: false }, {}, true)).total,
    1,
  );
  await assert.rejects(
    () => updateVehicle(ctx, v._id, { price: 25 }, 99),
    /changed/,
  );
  const beforePrice = await getVehicle(ctx, v._id, false);
  assert.equal((await priceHistoryFor(ctx, beforePrice)).items.length, 1);
  assert.equal(
    (await priceHistoryFor(ctx, beforePrice)).items[0]?.price,
    data.price,
  );
  const reduced = await updateVehicle(
    ctx,
    v._id,
    { price: data.price - 1_000_000 },
    beforePrice.version,
  );
  const history = await priceHistoryFor(ctx, reduced);
  assert.deepEqual(
    history.items.map((point) => point.price),
    [data.price, data.price - 1_000_000],
  );
  const unchanged = await updateVehicle(
    ctx,
    reduced._id,
    { description: `${data.description} Updated.` },
    reduced.version,
  );
  assert.equal((await priceHistoryFor(ctx, unchanged)).items.length, 2);
  const visible = await getVehicle(visitor, v._id, true, false);
  assert.deepEqual(
    (await priceHistoryFor(visitor, visible)).items.map((point) => point.price),
    [data.price, data.price - 1_000_000],
  );
  const publicCtx = { ...ctx, manager: false, actorId: "buyer" };
  const input = {
    vehicleId: v._id,
    name: "Private Buyer",
    email: "private@example.com",
    message: "Please book a test drive for me.",
    consent: true,
    idempotencyKey: crypto.randomUUID(),
  };
  const inquiry = await submitInquiry(publicCtx, input);
  assert.equal((await submitInquiry(publicCtx, input)).id, inquiry.id);
  assert.equal((await listInquiries(ctx)).total, 1);
  const redacted = await runTool(ctx, "getInquiries", {});
  assert.equal(JSON.stringify(redacted).includes("private@example.com"), false);
  assert.equal(JSON.stringify(redacted).includes("Private Buyer"), false);
  await assert.rejects(() =>
    runTool(ctx, "publishVehicle", { vehicleId: v._id, confirmed: false }),
  );
  await setStatus(ctx, v._id, "sold");
  await assert.rejects(
    () =>
      submitInquiry(publicCtx, {
        ...input,
        idempotencyKey: crypto.randomUUID(),
      }),
    /sold/,
  );
  const csv =
    "stockId,title,make,model,year,price\nIMPORT-1,Honda Accord,Honda,Accord,2023,22000000";
  const first = await importCSV(ctx, { csv, execute: true }),
    second = await importCSV(ctx, { csv, execute: true });
  assert.equal("imported" in first && first.imported, 1);
  assert.equal("imported" in second && second.imported, 1);
  await setSettings(ctx, { ...defaultTheme, brandName: "Test Autos" });
  assert.equal((await getSettings(ctx)).brandName, "Test Autos");
});
test("similar vehicles come from public listings only and top up when nothing matches", async () => {
  const listing = (
    _id: string,
    extra: Partial<(typeof demoVehicles)[number]> = {},
  ) => ({
    ...demoVehicles[0]!,
    _id,
    stockId: _id,
    slug: `car--${_id}`,
    demo: false,
    status: "published",
    expiresAt: null,
    ...extra,
  });
  const vehicles = [
    listing("base", {
      make: "Toyota",
      model: "Camry",
      bodyStyle: "Sedan",
      price: 20000,
    }),
    listing("camry", {
      make: "Toyota",
      model: "Camry",
      bodyStyle: "Sedan",
      price: 22000,
    }),
    listing("accord", {
      make: "Honda",
      model: "Accord",
      bodyStyle: "Sedan",
      price: 21000,
    }),
    listing("transit", {
      make: "Ford",
      model: "Transit",
      bodyStyle: "Van",
      price: 90000,
    }),
    listing("draft", { make: "Toyota", model: "Camry", status: "draft" }),
    listing("deleted", { make: "Toyota", model: "Camry", status: "deleted" }),
    listing("sample", { make: "Toyota", model: "Camry", demo: true }),
  ];
  await fs.writeFile(
    ".data/service-tests.json",
    JSON.stringify({
      vehicles,
      dealers: [],
      inquiries: [],
      events: [],
      "audit-logs": [],
      settings: [],
    }),
  );
  const visitor = { ...ctx, manager: false };
  const { items } = await similarVehicles(visitor, "base", 2);
  assert.deepEqual(
    items.map((v) => v._id),
    ["camry", "accord"],
  );
  // Asking for more than match tops up with the remaining public cars, never drafts or samples.
  const all = (await similarVehicles(visitor, "base", 8)).items.map(
    (v) => v._id,
  );
  assert.deepEqual(all.sort(), ["accord", "camry", "transit"]);
  await assert.rejects(() => similarVehicles(visitor, "draft"), /not found/i);
});

test("custom makes span public inventory and follow listing visibility", async () => {
  const listing = (_id: string, make: string, extra = {}) => ({
    ...demoVehicles[0]!,
    _id,
    stockId: _id,
    slug: `car--${_id}`,
    make,
    demo: false,
    status: "published",
    expiresAt: null,
    ...extra,
  });
  const vehicles = [
    listing("custom", "Rivian"),
    listing("second", "Toyota"),
    listing("duplicate", "Rivian", { status: "reserved" }),
    listing("sold", "Lucid", { status: "sold" }),
    listing("draft", "Draft Motors", { status: "draft" }),
    listing("archived", "Archived Motors", { status: "archived" }),
    listing("deleted", "Deleted Motors", { status: "deleted" }),
    listing("expired", "Expired Motors", {
      expiresAt: "2020-01-01T00:00:00.000Z",
    }),
    listing("sample", "Sample Motors", { demo: true }),
  ];
  const write = (rows: typeof vehicles) =>
    fs.writeFile(
      ".data/service-tests.json",
      JSON.stringify({ vehicles: rows }),
    );
  await write(vehicles);
  const visitor = { ...ctx, manager: false };
  assert.equal(
    (await listVehicles(visitor, { limit: 1 }, true)).items.length,
    1,
  );
  assert.deepEqual((await listVehicleMakes(visitor)).makes, [
    "Lucid",
    "Rivian",
    "Toyota",
  ]);
  const management = (await listVehicleMakes(ctx)).makes;
  assert.ok(management.includes("Draft Motors"));
  assert.ok(!management.includes("Deleted Motors"));
  await assert.rejects(() => listVehicleMakes(visitor, false), /permission/i);
  await write(vehicles.filter((row) => row.demo || row.status === "draft"));
  assert.deepEqual((await listVehicleMakes(visitor)).makes, ["Sample Motors"]);
});
test("creating a vehicle keeps its original price as the first history point", async () => {
  const created = await createVehicle(ctx, {
    ...data,
    stockId: "HIST-1",
    title: "2022 Toyota Camry History",
    originalPrice: 22_000_000,
  });
  assert.deepEqual(
    (await priceHistoryFor(ctx, created)).items.map((point) => point.price),
    [22_000_000, data.price],
  );
});
test("category rules match body types and clear specs that don't apply", () => {
  const trailer = applyCategoryRules(
    vehicleInput.parse({
      ...data,
      category: "trailer",
      bodyStyle: "Flatbed trailer",
      axles: 3,
    }),
  );
  assert.equal(trailer.fuel, "None");
  assert.equal(trailer.transmission, "None");
  assert.equal(trailer.seats, 0);
  assert.equal(trailer.axles, 3);
  const car = applyCategoryRules(
    vehicleInput.parse({ ...data, category: "car", axles: 3 }),
  );
  assert.equal(car.axles, 0);
  assert.throws(
    () =>
      applyCategoryRules(
        vehicleInput.parse({ ...data, category: "lorry", bodyStyle: "Sedan" }),
      ),
    /not a heavy duty lorry body type/,
  );
});
