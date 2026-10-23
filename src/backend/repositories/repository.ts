import { items } from "@wix/data";
import { auth } from "@wix/essentials";
import type { Context } from "../context";
import { AppError } from "../errors";
import { runInBackground } from "../run-in-background";
export type Row = Record<string, unknown> & { _id: string };
export type Query = {
  eq?: Record<string, unknown>;
  ne?: Record<string, unknown>;
  /** Field is missing or not any of the values. */
  notIn?: Record<string, string[]>;
  ge?: Record<string, number | string>;
  le?: Record<string, number | string>;
  search?: string;
  sort?: string;
  descending?: boolean;
  offset?: number;
  limit?: number;
  publicOnly?: boolean;
  /** Sample (demo) vehicles that the merchant has not removed. */
  samplesOnly?: boolean;
};
const namespace = "@admin14744/vehicle-listings";
/** Sample dealers that earlier versions seeded. Wix keeps them on installed sites until removed. */
const retiredSampleDealers = ["demo-dealer", "demo-dealer-austin"];
let retiredSampleDealersRemoved = false;
function removeRetiredSampleDealers() {
  if (retiredSampleDealersRemoved) return;
  retiredSampleDealersRemoved = true;
  runInBackground("Removing retired sample dealers", () =>
    Promise.allSettled(
      retiredSampleDealers.map((id) =>
        auth.elevate(items.remove)(`${namespace}/dealers`, id),
      ),
    ),
  );
}
function vehicleVisibility(query: Query) {
  if (query.publicOnly)
    return items
      .filter()
      .eq("demo", false)
      .hasSome("status", ["published", "reserved", "sold"])
      .and(
        items
          .filter()
          .isEmpty("expiresAt")
          .or(items.filter().gt("expiresAt", new Date().toISOString())),
      );
  return items.filter().eq("demo", true).ne("status", "deleted");
}

export async function distinctVehicleMakes(
  ctx: Context,
  publicOnly: boolean,
  samplesOnly = false,
): Promise<string[]> {
  const dealerInventory =
    !publicOnly &&
    !samplesOnly &&
    !ctx.manager &&
    ctx.dealer?.approvalState === "approved";
  if (!publicOnly && !samplesOnly && !ctx.manager && !dealerInventory)
    throw new AppError(
      "FORBIDDEN",
      "Inventory management permission is required.",
      403,
    );
  const scope: Query = { publicOnly, samplesOnly };
  const createQuery =
    publicOnly || samplesOnly || dealerInventory
      ? auth.elevate(items.query)
      : items.query;
  let q = createQuery(`${namespace}/vehicles`).ne("status", "deleted");
  if (publicOnly || samplesOnly) q = q.and(vehicleVisibility(scope));
  let result = await q.limit(1000).distinct("make", { consistentRead: true });
  const makes = new Set<string>();
  for (;;) {
    for (const make of result.items as unknown[])
      if (typeof make === "string" && make.trim()) makes.add(make.trim());
    if (!result.hasNext()) break;
    result = await result.next();
  }
  return [...makes].sort();
}

export async function queryRows(
  ctx: Context,
  collection: string,
  query: Query = {},
  elevated = false,
): Promise<{ rows: Row[]; total: number }> {
  if (!ctx.manager && !elevated)
    throw new AppError("FORBIDDEN", "Management permission is required.", 403);
  const createQuery = elevated ? auth.elevate(items.query) : items.query;
  let q = createQuery(`${namespace}/${collection}`);
  if (collection === "dealers") {
    removeRetiredSampleDealers();
    q = q.not(items.filter().hasSome("_id", retiredSampleDealers));
  }
  for (const [key, value] of Object.entries(query.eq ?? {}))
    q = q.eq(key, value);
  for (const [key, value] of Object.entries(query.ne ?? {}))
    q = q.ne(key, value);
  for (const [key, values] of Object.entries(query.notIn ?? {}))
    q = q.not(items.filter().hasSome(key, values));
  for (const [key, value] of Object.entries(query.ge ?? {}))
    q = q.ge(key, value);
  for (const [key, value] of Object.entries(query.le ?? {}))
    q = q.le(key, value);
  if (query.publicOnly || query.samplesOnly)
    q = q.and(vehicleVisibility(query));
  if (query.search) {
    if (collection === "vehicles") {
      let search = items.filter().contains("title", query.search);
      for (const field of ["make", "model", "trim", "stockId"])
        search = search.or(items.filter().contains(field, query.search));
      q = q.and(search);
    } else q = q.contains("businessName", query.search);
  }
  if (query.sort)
    q = query.descending
      ? q.descending(query.sort, "_id")
      : q.ascending(query.sort, "_id");
  const result = await q
    .skip(query.offset ?? 0)
    .limit(query.limit ?? 20)
    // Public storefront reads tolerate brief replication lag; management reads must not.
    .find({ returnTotalCount: true, consistentRead: !query.publicOnly });
  return {
    rows: result.items.map((row) => ({ ...row, _id: String(row._id) })),
    total: result.totalCount ?? 0,
  };
}
export async function getRow(
  ctx: Context,
  collection: string,
  id: string,
  elevated = false,
) {
  const result = await queryRows(
    ctx,
    collection,
    { eq: { _id: id }, limit: 1 },
    elevated,
  );
  return result.rows[0] ?? null;
}
export async function saveRow(
  ctx: Context,
  collection: string,
  row: Row,
  insert = false,
  elevated = false,
  expectedVersion?: number,
): Promise<Row> {
  if (!ctx.manager && !elevated)
    throw new AppError("FORBIDDEN", "Management permission is required.", 403);
  const result = insert
    ? await (elevated ? auth.elevate(items.insert) : items.insert)(
        `${namespace}/${collection}`,
        row,
      )
    : await (elevated ? auth.elevate(items.update) : items.update)(
        `${namespace}/${collection}`,
        row,
        expectedVersion === undefined
          ? undefined
          : { condition: items.filter().eq("version", expectedVersion) },
      );
  return { ...result, _id: String(result._id) };
}
export async function removeRow(ctx: Context, collection: string, id: string) {
  if (!ctx.manager)
    throw new AppError("FORBIDDEN", "Management permission is required.", 403);
  // Same call the saved-cars store uses: collection id, then item id.
  await items.remove(`${namespace}/${collection}`, id);
}
/** Row counts per distinct value of `fields`, in one request instead of one count per value. */
export async function countGroups(
  ctx: Context,
  collection: string,
  fields: string[],
  query: Pick<Query, "eq" | "ne" | "ge"> = {},
  elevated = false,
) {
  if (!ctx.manager && !elevated)
    throw new AppError("FORBIDDEN", "Management permission is required.", 403);
  let filter = items.filter();
  for (const [key, value] of Object.entries(query.eq ?? {}))
    filter = filter.eq(key, value);
  for (const [key, value] of Object.entries(query.ne ?? {}))
    filter = filter.ne(key, value);
  for (const [key, value] of Object.entries(query.ge ?? {}))
    filter = filter.ge(key, value);
  const createAggregate = elevated
    ? auth.elevate(items.aggregate)
    : items.aggregate;
  let result = await createAggregate(`${namespace}/${collection}`)
    .filter(filter)
    .group(...fields)
    .count()
    .limit(1000)
    .run();
  const groups: { values: Record<string, unknown>; count: number }[] = [];
  for (;;) {
    for (const item of result.items) {
      // Grouped values come back as top-level fields, and inside `_id` for several fields.
      const id = item._id && typeof item._id === "object" ? item._id : {};
      groups.push({
        values: Object.fromEntries(
          fields.map((field) => [field, item[field] ?? id[field]]),
        ),
        count: Number(item.count) || 0,
      });
    }
    if (!result.hasNext()) break;
    result = await result.next();
  }
  return groups;
}
export async function countRows(
  ctx: Context,
  collection: string,
  query: Query = {},
  elevated = false,
) {
  return (await queryRows(ctx, collection, { ...query, limit: 1 }, elevated))
    .total;
}
