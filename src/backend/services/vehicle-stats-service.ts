import type { Context } from "../context";
import { countRows } from "../repositories/repository";

export type VehicleStats = { views: number; clicks: number };

/**
 * All-time views and contact clicks for each vehicle. Views are recorded once per visitor,
 * vehicle and day; clicks are the WhatsApp, email and phone events. Callers must have already
 * limited `ids` to vehicles the viewer may manage.
 */
export async function vehicleStats(ctx: Context, ids: string[]) {
  const pairs = await Promise.all(
    ids.map(async (id): Promise<[string, VehicleStats]> => {
      const [views, clicks] = await Promise.all([
        countRows(ctx, "events", { eq: { vehicleId: id, eventType: "view" } }, true),
        countRows(
          ctx,
          "events",
          { eq: { vehicleId: id }, ne: { eventType: "view" } },
          true,
        ),
      ]);
      return [id, { views, clicks }];
    }),
  );
  return Object.fromEntries(pairs) as Record<string, VehicleStats>;
}
