import type { Vehicle } from "./schemas";

export type PricePoint = {
  _id: string;
  vehicleId: string;
  price: number;
  currency: string;
  recordedAt: string;
};

/** Shown when a listing has no saved changes yet, including a dealer-entered original price. */
export function openingPriceHistory(
  vehicle: Pick<
    Vehicle,
    | "_id"
    | "price"
    | "currency"
    | "createdAt"
    | "updatedAt"
    | "originalPrice"
  >,
): PricePoint[] {
  const current: PricePoint = {
    _id: `${vehicle._id}-current`,
    vehicleId: vehicle._id,
    price: vehicle.price,
    currency: vehicle.currency,
    recordedAt: vehicle.updatedAt || vehicle.createdAt,
  };
  if (vehicle.originalPrice && vehicle.originalPrice !== vehicle.price)
    return [
      {
        _id: `${vehicle._id}-original`,
        vehicleId: vehicle._id,
        price: vehicle.originalPrice,
        currency: vehicle.currency,
        recordedAt: vehicle.createdAt,
      },
      current,
    ];
  return [{ ...current, recordedAt: vehicle.createdAt }];
}

/** Difference from the previous asking price. Null when the currency changed. */
export function priceDelta(
  previous: Pick<PricePoint, "price" | "currency">,
  next: Pick<PricePoint, "price" | "currency">,
) {
  if (previous.currency !== next.currency) return null;
  return {
    amount: next.price - previous.price,
    percent:
      previous.price > 0
        ? ((next.price - previous.price) / previous.price) * 100
        : null,
  };
}

export function formatPriceDate(iso: string) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(time);
}
