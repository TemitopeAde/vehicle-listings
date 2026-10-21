import { randomUUID } from "node:crypto";
import {
  vehicleInput,
  vehicleSchema,
  dealerSchema,
  filtersSchema,
  statusSchema,
  type Vehicle,
  type VehicleInput,
} from "../../shared/schemas";
import {
  bodyStyleError,
  isCommercial,
  isTrailer,
} from "../../shared/vehicle-options";
import { transitions, slugify } from "../../shared/utils";
import { descriptionText } from "../../shared/rich-text";
import { cleanDescription } from "../listing-html";
import { rankSimilar } from "../../shared/similarity";
import { demoVehicles, demoDealers } from "../../shared/demo";
import type { Context } from "../context";
import { AppError } from "../errors";
import {
  queryRows,
  getRow,
  saveRow,
  countRows,
  distinctVehicleMakes,
  type Query,
  type Row,
} from "../repositories/repository";
import { audit } from "./audit-service";
import { vehicleStats } from "./vehicle-stats-service";
import {
  recordOpeningPrice,
  recordPriceChange,
} from "./price-history-service";
function approvedDealer(ctx: Context) {
  return ctx.dealer?.approvalState === "approved" && !ctx.dealer.demo
    ? ctx.dealer
    : null;
}
function requireInventoryWrite(ctx: Context) {
  if (ctx.manager) return { elevated: false, dealerId: "" };
  if (approvedDealer(ctx))
    return { elevated: true, dealerId: ctx.dealer?.id ?? "" };
  throw new AppError(
    "FORBIDDEN",
    ctx.dealer
      ? "Only an approved dealership can add a vehicle."
      : "Inventory write permission is required.",
    403,
  );
}
/** Body type must belong to the category; specs that don't apply to it are cleared. */
export function applyCategoryRules(input: VehicleInput): VehicleInput {
  const error = bodyStyleError(input.category, input.bodyStyle);
  if (error) throw new AppError("VALIDATION", error);
  if (isTrailer(input.category))
    return {
      ...input,
      fuel: "None",
      transmission: "None",
      drivetrain: "",
      engineSize: "",
      horsepower: 0,
      doors: 0,
      seats: 0,
      interiorColor: "",
    };
  if (!isCommercial(input.category))
    return { ...input, axles: 0, grossWeight: 0, payload: 0, bodyLength: 0 };
  return input;
}
export async function listVehicles(
  ctx: Context,
  raw: unknown,
  publicOnly = !ctx.manager,
) {
  const ownInventory = !publicOnly && !ctx.manager;
  if (ownInventory && !approvedDealer(ctx))
    throw new AppError(
      "FORBIDDEN",
      ctx.dealer
        ? "Only an approved dealership can add a vehicle."
        : "Inventory management permission is required.",
      403,
    );
  const f = filtersSchema.parse(raw),
    eq: Record<string, unknown> = {},
    ge: Query["ge"] = {},
    le: Query["le"] = {},
    notIn: NonNullable<Query["notIn"]> = {};
  for (const key of [
    "status",
    "make",
    "model",
    "condition",
    "location",
    "bodyStyle",
    "fuel",
    "transmission",
    "dealerId",
  ] as const)
    if (f[key]) eq[key] = f[key];
  if (ownInventory && ctx.dealer) eq.dealerId = ctx.dealer.id;
  // Vehicles saved before categories existed have no `category` and count as cars.
  if (f.category === "car") notIn.category = ["lorry", "trailer"];
  else if (f.category) eq.category = f.category;
  if (f.featured !== undefined) eq.featured = f.featured;
  if (f.minPrice !== undefined) ge.price = f.minPrice;
  if (f.maxPrice !== undefined) le.price = f.maxPrice;
  if (f.minYear !== undefined) ge.year = f.minYear;
  if (f.maxYear !== undefined) le.year = f.maxYear;
  if (f.minMileage !== undefined) ge.mileage = f.minMileage;
  if (f.maxMileage !== undefined) le.mileage = f.maxMileage;
  const query: Query = {
    eq,
    notIn,
    ge,
    le,
    search: f.search,
    offset: f.cursor,
    limit: f.limit,
    sort: f.sort.startsWith("price")
      ? "price"
      : f.sort === "year-desc"
        ? "year"
        : "createdAt",
    descending: f.sort !== "price-asc",
    publicOnly,
  };
  let result = await queryRows(
    ctx,
    "vehicles",
    query,
    publicOnly || ownInventory,
  );
  const samples =
    publicOnly && result.total === 0 && !(await hasPublicInventory(ctx));
  if (samples) {
    const sampleQuery = { ...query, publicOnly: false, samplesOnly: true };
    result = await queryRows(ctx, "vehicles", sampleQuery, true);
    const unfiltered =
      !Object.keys(eq).length &&
      !Object.keys(ge).length &&
      !Object.keys(le).length &&
      !f.search;
    const stale =
      result.rows.some((row) => {
        const v = demoVehicles.find((d) => d._id === row._id);
        return !v || !sameDemoContent(row, v);
      }) ||
      (unfiltered && result.total < demoVehicles.length);
    if (stale) {
      await syncDemoInventory(ctx, { elevated: true });
      result = await queryRows(ctx, "vehicles", sampleQuery, true);
    }
  }
  const items = result.rows.map((row) => vehicleSchema.parse(row));
  return {
    items,
    total: result.total,
    nextCursor: f.cursor + f.limit < result.total ? f.cursor + f.limit : null,
    samples,
    // Views and clicks are for the dealer and admin dashboards only, never the public site.
    ...(publicOnly
      ? {}
      : { stats: await vehicleStats(ctx, items.map((item) => item._id)) }),
  };
}
export async function listVehicleMakes(
  ctx: Context,
  publicOnly = !ctx.manager,
) {
  let makes = await distinctVehicleMakes(ctx, publicOnly);
  if (publicOnly && makes.length === 0 && !(await hasPublicInventory(ctx)))
    makes = await distinctVehicleMakes(ctx, false, true);
  return { makes };
}
/** Sample vehicles stand in on the live site only until the first real listing goes public. */
async function hasPublicInventory(ctx: Context) {
  const { total } = await queryRows(
    ctx,
    "vehicles",
    { publicOnly: true, limit: 1 },
    true,
  );
  return total > 0;
}
export async function getVehicle(
  ctx: Context,
  id: string,
  publicOnly = !ctx.manager,
  allowSamples = false,
  by: "slug" | "_id" = id.includes("--") ? "slug" : "_id",
) {
  const ownInventory = !publicOnly && !ctx.manager;
  if (ownInventory && !approvedDealer(ctx))
    throw new AppError(
      "FORBIDDEN",
      ctx.dealer
        ? "Only an approved dealership can add a vehicle."
        : "Inventory management permission is required.",
      403,
    );
  const result = await queryRows(
    ctx,
    "vehicles",
    { eq: { [by]: id }, limit: 1, publicOnly },
    publicOnly || ownInventory,
  );
  let row = result.rows[0];
  if (!row && publicOnly && allowSamples && !(await hasPublicInventory(ctx)))
    row = (
      await queryRows(
        ctx,
        "vehicles",
        { eq: { [by]: id }, limit: 1, samplesOnly: true },
        true,
      )
    ).rows[0];
  if (!row) throw new AppError("NOT_FOUND", "Vehicle not found.", 404);
  const vehicle = vehicleSchema.parse(row);
  if (ownInventory && vehicle.dealerId !== ctx.dealer?.id)
    throw new AppError("NOT_FOUND", "Vehicle not found.", 404);
  return vehicle;
}
/** Public vehicles that most resemble `id`, from a small indexed candidate pool. */
export async function similarVehicles(ctx: Context, id: string, limit = 4) {
  const base = await getVehicle(ctx, id, true, true);
  // Sample cars are suggested alongside other samples; real listings only alongside public ones.
  const scope: Query = base.demo ? { samplesOnly: true } : { publicOnly: true };
  const band = {
    ge: { price: base.price * 0.7 },
    le: { price: base.price * 1.3 },
  };
  const pool = (query: Query) =>
    queryRows(
      ctx,
      "vehicles",
      {
        ...scope,
        ...query,
        ne: { _id: base._id },
        limit: 12,
        sort: "createdAt",
        descending: true,
      },
      true,
    ).then((r) => r.rows);
  const candidates = (
    await Promise.all([
      pool({ eq: { make: base.make, model: base.model } }),
      pool({ eq: { bodyStyle: base.bodyStyle }, ...band }),
      pool({ eq: { make: base.make } }),
      pool(band),
    ])
  ).flat();
  let items = rankSimilar(
    base,
    candidates.map((row) => vehicleSchema.parse(row)),
    limit,
  );
  if (items.length < limit) {
    const seen = new Set([base._id, ...items.map((v) => v._id)]);
    const recent = (await pool({})).map((row) => vehicleSchema.parse(row));
    items = [...items, ...recent.filter((v) => !seen.has(v._id))].slice(
      0,
      limit,
    );
  }
  return { items };
}
function assignedStockId(stockId: string, key: string) {
  const value = stockId.trim();
  if (value) return value.slice(0, 40);
  return key.replace(/-/g, "").slice(0, 32).toUpperCase();
}
async function assertUnique(
  ctx: Context,
  stockId: string,
  vin: string,
  except = "",
  elevated = false,
) {
  for (const [key, value] of [
    ["stockId", stockId],
    ["vin", vin],
  ])
    if (value) {
      const { rows } = await queryRows(
        ctx,
        "vehicles",
        {
          eq: { [String(key)]: value },
          limit: 2,
        },
        elevated,
      );
      if (rows.some((r) => r._id !== except))
        throw new AppError(
          "DUPLICATE",
          `${key === "vin" ? "VIN" : "Stock ID"} already exists.`,
          409,
        );
    }
}
export async function createVehicle(
  ctx: Context,
  raw: unknown,
  key: string = randomUUID(),
) {
  const access = requireInventoryWrite(ctx);
  const parsed = vehicleInput.parse(raw);
  const input = applyCategoryRules(
    access.dealerId ? { ...parsed, dealerId: access.dealerId } : parsed,
  );
  const id = `vehicle-${key}`;
  const existing = await getRow(ctx, "vehicles", id, access.elevated);
  if (existing) {
    const current = vehicleSchema.parse(existing);
    if (access.dealerId && current.dealerId !== access.dealerId)
      throw new AppError(
        "CONFLICT",
        "This operation has already been recorded.",
        409,
      );
    return current;
  }
  // Until billing entitlement integration is verified, every installation uses the Free quota.
  if (
    (await countRows(
      ctx,
      "vehicles",
      {
        ne: { demo: true, status: "deleted" },
      },
      access.elevated,
    )) >= 10
  )
    throw new AppError(
      "QUOTA",
      "The Free plan allows 10 vehicles. Remove an archived vehicle before adding more.",
      409,
    );
  const stockId = assignedStockId(input.stockId, key);
  await assertUnique(
    ctx,
    stockId,
    input.vin.toUpperCase(),
    "",
    access.elevated,
  );
  const now = new Date().toISOString();
  const v = vehicleSchema.parse({
    ...input,
    stockId,
    description: cleanDescription(input.description),
    vin: input.vin.toUpperCase(),
    _id: id,
    slug: `${slugify(input.title)}--${key}`,
    status: "draft",
    demo: false,
    createdAt: now,
    updatedAt: now,
  });
  await saveRow(ctx, "vehicles", v, true, access.elevated);
  await recordOpeningPrice(ctx, v, access.elevated);
  await audit(ctx, "vehicle", id, "create", access.elevated);
  return v;
}
export async function updateVehicle(
  ctx: Context,
  id: string,
  patch: unknown,
  version?: number,
) {
  const access = requireInventoryWrite(ctx);
  const current = await getVehicle(ctx, id, false);
  if (version !== undefined && version !== current.version)
    throw new AppError(
      "CONFLICT",
      "This vehicle changed. Reload before saving.",
      409,
    );
  const parsedPatch = vehicleInput.partial().parse(patch);
  // Zod defaults can populate omitted optional fields even in a partial schema.
  // Only explicitly submitted fields belong in an update (including media).
  const provided = new Set(
    patch && typeof patch === "object" ? Object.keys(patch) : [],
  );
  const safePatch = Object.fromEntries(
    Object.entries(parsedPatch).filter(([key]) => provided.has(key)),
  );
  const input = applyCategoryRules({
    ...vehicleInput.parse({
      ...Object.fromEntries(
        Object.keys(vehicleInput.shape).map((k) => [
          k,
          current[k as keyof Vehicle],
        ]),
      ),
      ...safePatch,
    }),
    ...(access.dealerId ? { dealerId: access.dealerId } : {}),
  });
  const stockId = input.stockId.trim() || current.stockId;
  await assertUnique(
    ctx,
    stockId,
    input.vin.toUpperCase(),
    id,
    access.elevated,
  );
  const v: Vehicle = {
    ...current,
    ...input,
    stockId,
    description: cleanDescription(input.description),
    vin: input.vin.toUpperCase(),
    updatedAt: new Date().toISOString(),
    version: current.version + 1,
  };
  if (v.status === "published" || v.status === "reserved")
    await validatePublication(ctx, v);
  await saveRow(ctx, "vehicles", v, false, access.elevated, current.version);
  await recordPriceChange(
    ctx,
    v,
    {
      price: current.price,
      currency: current.currency,
      recordedAt: current.createdAt,
    },
    access.elevated,
  );
  await audit(ctx, "vehicle", id, "update", access.elevated);
  return v;
}
async function validatePublication(ctx: Context, v: Vehicle) {
  if (v.demo)
    throw new AppError(
      "DEMO",
      "Demo vehicles cannot be published. Create your own verified listing.",
    );
  if (!v.media.length || descriptionText(v.description).length < 20 || v.price <= 0)
    throw new AppError(
      "PUBLISH_VALIDATION",
      "Add a photo, a description of at least 20 characters and a positive price before publishing.",
    );
  const dealer = await getRow(ctx, "dealers", v.dealerId, !ctx.manager);
  if (
    !dealer ||
    dealerSchema.parse(dealer).approvalState !== "approved" ||
    dealer.demo
  )
    throw new AppError(
      "SELLER_REQUIRED",
      "Assign an approved, real dealership before publishing.",
    );
  if (v.expiresAt && Date.parse(v.expiresAt) <= Date.now())
    throw new AppError("EXPIRED", "Choose an expiration date in the future.");
}
export async function setStatus(ctx: Context, id: string, raw: unknown) {
  const access = requireInventoryWrite(ctx);
  const status = statusSchema.parse(raw),
    v = await getVehicle(ctx, id, false);
  if (v.status === status) return v;
  if (!transitions[v.status].includes(status))
    throw new AppError(
      "INVALID_TRANSITION",
      `Cannot move ${v.status} to ${status}.`,
    );
  if (status === "published") await validatePublication(ctx, v);
  const updated: Vehicle = {
    ...v,
    status,
    publishedAt:
      status === "published" ? new Date().toISOString() : v.publishedAt,
    updatedAt: new Date().toISOString(),
    version: v.version + 1,
  };
  await saveRow(ctx, "vehicles", updated, false, access.elevated, v.version);
  await audit(ctx, "vehicle", id, `status:${status}`, access.elevated);
  return updated;
}
export async function duplicateVehicle(ctx: Context, id: string, key?: string) {
  const v = await getVehicle(ctx, id, false);
  const input = vehicleInput.parse(
    Object.fromEntries(
      Object.keys(vehicleInput.shape).map((k) => [k, v[k as keyof Vehicle]]),
    ),
  );
  return createVehicle(
    ctx,
    {
      ...input,
      stockId: input.stockId
        ? `${input.stockId.slice(0, 25)}-${randomUUID().slice(0, 6)}`
        : "",
      vin: "",
      title: `${input.title.slice(0, 140)} (copy)`,
    },
    key,
  );
}
export async function seedDemo(ctx: Context) {
  await syncDemoInventory(ctx, { restore: true });
  return { seeded: true };
}
const volatileKeys = [
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "version",
];
/** Compares sample content only, ignoring lifecycle fields the merchant may have changed. */
function sameDemoContent(row: Row, v: Vehicle) {
  const strip = (x: Vehicle) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(x).filter(([key]) => !volatileKeys.includes(key)),
      ),
    );
  const parsed = vehicleSchema.safeParse(row);
  return parsed.success && strip(parsed.data) === strip(v);
}
/**
 * Brings stored sample rows in line with the sample data shipped in code. Wix copies
 * `initialData` only when a collection is first created, so older installs keep stale samples.
 * `restore` also brings back samples the merchant removed; otherwise removed samples stay removed.
 */
async function syncDemoInventory(
  ctx: Context,
  { restore = false, elevated = false } = {},
) {
  const { rows } = await queryRows(
    ctx,
    "vehicles",
    { eq: { demo: true }, limit: 100 },
    elevated,
  );
  const stored = new Map(rows.map((row) => [row._id, row]));
  const active = restore || rows.some((row) => row.status !== "deleted");
  for (const v of demoVehicles) {
    const existing =
      stored.get(v._id) ?? (await getRow(ctx, "vehicles", v._id, elevated));
    if (!existing) {
      if (active) await saveRow(ctx, "vehicles", v, true, elevated);
      continue;
    }
    const status =
      restore && existing.status === "deleted" ? "draft" : existing.status;
    if (status !== existing.status || !sameDemoContent(existing, v))
      await saveRow(
        ctx,
        "vehicles",
        { ...v, status: statusSchema.parse(status) },
        false,
        elevated,
      );
  }
  if (!active) return;
  for (const d of demoDealers) {
    const existing = await getRow(ctx, "dealers", d._id, elevated);
    const parsed = existing && dealerSchema.safeParse(existing);
    const same =
      parsed?.success &&
      JSON.stringify({ ...parsed.data, createdAt: "", updatedAt: "" }) ===
        JSON.stringify({ ...d, createdAt: "", updatedAt: "" });
    if (!same) await saveRow(ctx, "dealers", d, !existing, elevated);
  }
}
export async function clearDemo(ctx: Context) {
  for (const v of demoVehicles) {
    const existing = await getRow(ctx, "vehicles", v._id);
    if (existing)
      await saveRow(ctx, "vehicles", { ...existing, status: "deleted" });
  }
  return { removed: true };
}
