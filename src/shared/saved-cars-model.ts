import { z } from "zod";
import { currencySchema } from "./currencies";

const webUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value));
export const savedCarSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(150),
  price: z.number().min(0).max(1e12),
  currency: currencySchema,
  image: z.union([webUrl, z.literal("")]),
  href: webUrl,
});
export type SavedCar = z.infer<typeof savedCarSchema>;
export const legacySavedCarsKey = "autohaus:saved-cars:v1";
export const legacyOwnerKey = "autohaus:saved-cars:migration-owner";
export const maxSavedCars = 50;

export function parseSavedCars(raw: unknown): SavedCar[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((value) => {
    const parsed = savedCarSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}
