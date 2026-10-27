import type { Context } from "../context";
import { countGroups } from "../repositories/repository";

export type VehicleStats = { views: number; clicks: number };

/**
 * All-time views and contact clicks for each vehicle. Views are recorded once per visitor,
 * vehicle and day; clicks are the WhatsApp, email and phone events. Callers must have already
 * limited `ids` to vehicles the viewer may manage.
 *
 * One grouped aggregate for the whole page: per-vehicle counts exceed the
 * production Worker's subrequest limit.
 */
export async function vehicleStats(ctx: Context, ids: string[]) {
  const stats: Record<string, VehicleStats> = Object.fromEntries(
    ids.map((id) => [id, { views: 0, clicks: 0 }]),
  );
  if (!ids.length) return stats;
  const groups = await countGroups(
    ctx,
    "events",
    ["vehicleId", "eventType"],
    { in: { vehicleId: ids } },
    true,
  );
  for (const { values, count } of groups) {
    const entry = stats[String(values.vehicleId)];
    if (!entry) continue;
    if (values.eventType === "view") entry.views += count;
    else entry.clicks += count;
  }
  return stats;
}
