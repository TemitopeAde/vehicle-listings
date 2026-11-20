import { z } from "zod";
import type { Context } from "../context";
import { queryRows, saveRow } from "../repositories/repository";
import { currencySchema } from "../../shared/currencies";
import type { Vehicle } from "../../shared/schemas";
import type { PricePoint } from "../../shared/price-history";

const pricePointSchema = z
  .object({
    _id: z.string(),
    vehicleId: z.string(),
    price: z.number(),
    currency: currencySchema,
    recordedAt: z.string(),
  })
  .strip();

async function insertPoint(
  ctx: Context,
  vehicleId: string,
  price: number,
  currency: Vehicle["currency"],
  recordedAt: string,
  elevated = false,
) {
  const row: PricePoint = {
    _id: `price-${crypto.randomUUID()}`,
    vehicleId,
    price,
    currency,
    recordedAt,
  };
  await saveRow(ctx, "price-history", row, true, elevated);
}

/** Appends a point when the asking price or its currency changes. */
export async function recordPriceChange(
  ctx: Context,
  vehicle: Vehicle,
  previous: {
    price: number;
    currency: Vehicle["currency"];
    recordedAt: string;
  },
  elevated = false,
) {
  if (
    previous.price === vehicle.price &&
    previous.currency === vehicle.currency
  )
    return;
  const { total } = await queryRows(
    ctx,
    "price-history",
    { eq: { vehicleId: vehicle._id }, limit: 1 },
    true,
  );
  if (total === 0)
    await insertPoint(
      ctx,
      vehicle._id,
      previous.price,
      previous.currency,
      previous.recordedAt,
      elevated,
    );
  await insertPoint(
    ctx,
    vehicle._id,
    vehicle.price,
    vehicle.currency,
    vehicle.updatedAt,
    elevated,
  );
}

export async function priceHistoryFor(ctx: Context, vehicle: Vehicle) {
  const { rows } = await queryRows(
    ctx,
    "price-history",
    {
      eq: { vehicleId: vehicle._id },
      sort: "recordedAt",
      limit: 100,
    },
    true,
  );
  const items = rows.flatMap((row) => {
    const parsed = pricePointSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  if (!items.length) return { items: [] };

  // Older versions wrote one or two synthetic points at listing time. Keep
  // them only as the baseline for a later real price change; never present
  // the opening price itself as price history.
  const createdAt = Date.parse(vehicle.createdAt);
  const openingCutoff = createdAt + 1000;
  const changes = items.filter((item) => {
    const recordedAt = Date.parse(item.recordedAt);
    return (
      recordedAt > openingCutoff || item.recordedAt === vehicle.updatedAt
    );
  });
  if (!changes.length) return { items: [] };
  const firstChangeAt = Date.parse(changes[0]!.recordedAt);
  const baseline = items
    .filter((item) => Date.parse(item.recordedAt) < firstChangeAt)
    .at(-1);
  return { items: baseline ? [baseline, ...changes] : changes };
}
