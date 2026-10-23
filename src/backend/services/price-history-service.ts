import { z } from "zod";
import type { Context } from "../context";
import { queryRows, saveRow } from "../repositories/repository";
import { currencySchema } from "../../shared/currencies";
import type { Vehicle } from "../../shared/schemas";
import { openingPriceHistory, type PricePoint } from "../../shared/price-history";

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

export async function recordOpeningPrice(
  ctx: Context,
  vehicle: Vehicle,
  elevated = false,
) {
  if (vehicle.originalPrice && vehicle.originalPrice !== vehicle.price) {
    const listedAt = vehicle.createdAt;
    const currentAt =
      vehicle.updatedAt > listedAt
        ? vehicle.updatedAt
        : new Date(Date.parse(listedAt) + 1000).toISOString();
    await insertPoint(
      ctx,
      vehicle._id,
      vehicle.originalPrice,
      vehicle.currency,
      listedAt,
      elevated,
    );
    await insertPoint(
      ctx,
      vehicle._id,
      vehicle.price,
      vehicle.currency,
      currentAt,
      elevated,
    );
    return;
  }
  await insertPoint(
    ctx,
    vehicle._id,
    vehicle.price,
    vehicle.currency,
    vehicle.createdAt,
    elevated,
  );
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
  return { items: items.length ? items : openingPriceHistory(vehicle) };
}
