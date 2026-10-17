import type { Vehicle } from "./schemas";

type Comparable = Pick<
  Vehicle,
  | "_id"
  | "make"
  | "model"
  | "bodyStyle"
  | "category"
  | "price"
  | "currency"
  | "year"
  | "fuel"
  | "mileage"
  | "mileageUnit"
  | "transmission"
  | "condition"
>;

const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
/** 1 when equal, falling linearly to 0 at `range` apart. */
const closeness = (a: number, b: number, range: number) =>
  range > 0 ? Math.max(0, 1 - Math.abs(a - b) / range) : a === b ? 1 : 0;
const km = (v: Comparable) =>
  v.mileageUnit === "mi" ? v.mileage * 1.609 : v.mileage;

/** How much `other` resembles `base`; higher is more similar. */
export function similarityScore(base: Comparable, other: Comparable) {
  let score = 0;
  // A trailer is never a good suggestion for a car buyer, and vice versa.
  if (base.category === other.category) score += 6;
  const sameMake = same(base.make, other.make);
  if (sameMake) score += 3;
  if (sameMake && same(base.model, other.model)) score += 4;
  if (base.bodyStyle === other.bodyStyle) score += 2.5;
  // Prices in different currencies aren't comparable.
  if (base.currency === other.currency)
    score += 3 * closeness(base.price, other.price, base.price);
  score += 1.5 * closeness(base.year, other.year, 5);
  if (base.fuel === other.fuel) score += 1;
  score += closeness(km(base), km(other), Math.max(km(base), 50000));
  if (base.transmission === other.transmission) score += 0.5;
  if (base.condition === other.condition) score += 0.5;
  return score;
}

/** The `limit` candidates most similar to `base`, excluding `base` itself and duplicates. */
export function rankSimilar<T extends Comparable>(
  base: Comparable,
  candidates: T[],
  limit: number,
) {
  const unique = new Map<string, T>();
  for (const v of candidates)
    if (v._id !== base._id && !unique.has(v._id)) unique.set(v._id, v);
  return [...unique.values()]
    .map((v) => ({ v, score: similarityScore(base, v) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(a.v.price - base.price) - Math.abs(b.v.price - base.price),
    )
    .slice(0, limit)
    .map(({ v }) => v);
}
