export type PricePoint = {
  _id: string;
  vehicleId: string;
  price: number;
  currency: string;
  recordedAt: string;
};

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
