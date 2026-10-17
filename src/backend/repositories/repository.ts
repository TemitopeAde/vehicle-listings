import { items } from "@wix/data";
import { auth } from "@wix/essentials";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Context } from "../context";
import { demoDealers, demoVehicles } from "../../shared/demo";
import { AppError } from "../errors";
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
const demoPath = path.resolve(
  process.env.CAR_LISTING_DEMO_DATA || ".data/local-demo.json",
);
let queue: Promise<unknown> = Promise.resolve();
async function load(): Promise<Record<string, Row[]>> {
  try {
    return JSON.parse(await fs.readFile(demoPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return {
      vehicles: demoVehicles,
      dealers: demoDealers,
      inquiries: [],
      "quote-requests": [],
      events: [],
      "audit-logs": [],
      settings: [],
    };
  }
}
function matches(row: Row, query: Query) {
  return (
    (!query.publicOnly ||
      (row.demo === false &&
        ["published", "reserved", "sold"].includes(String(row.status)) &&
        (!row.expiresAt || Date.parse(String(row.expiresAt)) > Date.now()))) &&
    (!query.samplesOnly || (row.demo === true && row.status !== "deleted")) &&
    Object.entries(query.eq ?? {}).every(([k, v]) => row[k] === v) &&
    Object.entries(query.ne ?? {}).every(([k, v]) => row[k] !== v) &&
    Object.entries(query.notIn ?? {}).every(
      ([k, v]) => !v.includes(String(row[k])),
    ) &&
    Object.entries(query.ge ?? {}).every(
      ([k, v]) =>
        row[k] != null &&
        String(row[k]).localeCompare(String(v), "en", { numeric: true }) >= 0,
    ) &&
    Object.entries(query.le ?? {}).every(
      ([k, v]) =>
        row[k] != null &&
        String(row[k]).localeCompare(String(v), "en", { numeric: true }) <= 0,
    ) &&
    (!query.search ||
      [row.title, row.businessName, row.make, row.model, row.trim, row.stockId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query.search.toLowerCase()))
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
    ctx.dealer?.approvalState === "approved" &&
    !ctx.dealer.demo;
  if (!publicOnly && !samplesOnly && !ctx.manager && !dealerInventory)
    throw new AppError(
      "FORBIDDEN",
      "Inventory management permission is required.",
      403,
    );
  const scope: Query = { publicOnly, samplesOnly, ne: { status: "deleted" } };
  if (ctx.demo) {
    const rows = (await load()).vehicles ?? [];
    return [
      ...new Set(
        rows
          .filter((row) => matches(row, scope))
          .map((row) => row.make)
          .filter(
            (make): make is string =>
              typeof make === "string" && Boolean(make.trim()),
          ),
      ),
    ].sort();
  }
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
  if (ctx.demo) {
    let rows = (await load())[collection] ?? [];
    rows = rows.filter((row) => matches(row, query));
    const total = rows.length;
    if (query.sort)
      rows.sort(
        (a, b) =>
          String(a[query.sort ?? ""]).localeCompare(
            String(b[query.sort ?? ""]),
            "en",
            { numeric: true },
          ) * (query.descending ? -1 : 1),
      );
    return {
      rows: rows.slice(
        query.offset ?? 0,
        (query.offset ?? 0) + (query.limit ?? 20),
      ),
      total,
    };
  }
  const createQuery = elevated ? auth.elevate(items.query) : items.query;
  let q = createQuery(`${namespace}/${collection}`);
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
  if (ctx.demo) {
    const operation = queue
      .catch(() => {})
      .then(async () => {
        const data = await load();
        const rows = data[collection] ?? [];
        const index = rows.findIndex((r) => r._id === row._id);
        if (
          expectedVersion !== undefined &&
          rows[index]?.version !== expectedVersion
        )
          throw new AppError(
            "CONFLICT",
            "This vehicle changed. Reload before saving.",
            409,
          );
        if (insert && index >= 0)
          throw new AppError(
            "CONFLICT",
            "This operation has already been recorded.",
            409,
          );
        if (index >= 0) rows[index] = row;
        else rows.push(row);
        data[collection] = rows;
        await fs.mkdir(path.dirname(demoPath), { recursive: true });
        const temp = `${demoPath}.tmp`;
        await fs.writeFile(temp, JSON.stringify(data));
        await fs.rename(temp, demoPath);
        return row;
      });
    queue = operation;
    return operation;
  }
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
export async function removeRow(
  ctx: Context,
  collection: string,
  id: string,
) {
  if (!ctx.manager)
    throw new AppError("FORBIDDEN", "Management permission is required.", 403);
  if (ctx.demo) {
    const operation = queue
      .catch(() => {})
      .then(async () => {
        const data = await load();
        const rows = data[collection] ?? [];
        const index = rows.findIndex((row) => row._id === id);
        if (index < 0)
          throw new AppError("NOT_FOUND", "Dealer not found.", 404);
        rows.splice(index, 1);
        data[collection] = rows;
        await fs.mkdir(path.dirname(demoPath), { recursive: true });
        const temp = `${demoPath}.tmp`;
        await fs.writeFile(temp, JSON.stringify(data));
        await fs.rename(temp, demoPath);
      });
    queue = operation;
    await operation;
    return;
  }
  // Same call the saved-cars store uses: collection id, then item id.
  await items.remove(`${namespace}/${collection}`, id);
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
