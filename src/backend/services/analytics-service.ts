import { sha256Hex } from "../web-crypto";
import { z } from "zod";
import type { Context } from "../context";
import { getVehicle } from "./vehicle-service";
import {
  queryRows,
  saveRow,
  getRow,
  countGroups,
} from "../repositories/repository";
export async function trackEvent(ctx: Context, raw: unknown) {
  const input = z
    .object({
      vehicleId: z.string().min(1),
      eventType: z.enum(["view", "whatsapp", "email", "phone"]),
      consent: z.literal(true),
    })
    .strict()
    .parse(raw);
  await getVehicle(ctx, input.vehicleId, true);
  const date = new Date().toISOString().slice(0, 10),
    actorHash = await sha256Hex(`${ctx.siteId}:${ctx.actorId}:${date}`);
  const id = await sha256Hex(
    `${actorHash}:${input.vehicleId}:${input.eventType}`,
  );
  if (!(await getRow(ctx, "events", id, true)))
    await saveRow(
      ctx,
      "events",
      {
        _id: id,
        siteId: ctx.siteId,
        vehicleId: input.vehicleId,
        eventType: input.eventType,
        date,
        createdAt: new Date().toISOString(),
      },
      true,
      true,
    );
  return { recorded: true };
}
/** `createdAt` of every inquiry since `since`, a page of 1000 at a time. */
async function inquiryDates(
  ctx: Context,
  since: string,
  eq: Record<string, string>,
) {
  const dates: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await queryRows(ctx, "inquiries", {
      eq,
      ge: { createdAt: since },
      offset,
      limit: 1000,
    });
    dates.push(...page.rows.map((row) => String(row.createdAt)));
    if (offset + page.rows.length >= page.total || !page.rows.length)
      return dates;
  }
}
export async function analytics(ctx: Context, days = 14, dealerId = "") {
  const dealer: Record<string, string> = dealerId ? { dealerId } : {};
  const dates = Array.from({ length: days }, (_, i) =>
    new Date(Date.now() - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10),
  );
  const since = dates[0];
  // Grouped counts keep this to a few requests. A count per status and per day was dozens of
  // parallel queries, more than a Cloudflare Worker may send for one request. Wix refuses
  // aggregation to site collaborators, so the counts run elevated; the route requires a manager.
  const [statusGroups, eventGroups, inquiryDays, recent] = await Promise.all([
    countGroups(
      ctx,
      "vehicles",
      ["status"],
      { eq: dealer, ne: { demo: true } },
      true,
    ),
    countGroups(
      ctx,
      "events",
      ["date", "eventType"],
      { ge: { date: since } },
      true,
    ),
    inquiryDates(ctx, `${since}T00:00:00.000Z`, dealer),
    queryRows(ctx, "inquiries", {
      limit: 5,
      sort: "createdAt",
      descending: true,
      eq: dealer,
    }),
  ]);
  const counts = ["draft", "published", "reserved", "sold", "archived"].map(
    (status) => ({
      status,
      count: statusGroups
        .filter((group) => group.values.status === status)
        .reduce((sum, group) => sum + group.count, 0),
    }),
  );
  const trend = dates.map((date) => {
    const day = eventGroups.filter((group) => group.values.date === date);
    const views = day
      .filter((group) => group.values.eventType === "view")
      .reduce((sum, group) => sum + group.count, 0);
    const clicks = day
      .filter((group) => group.values.eventType !== "view")
      .reduce((sum, group) => sum + group.count, 0);
    return {
      date,
      views,
      clicks,
      leads: inquiryDays.filter((createdAt) => createdAt.startsWith(date))
        .length,
    };
  });
  const views = trend.reduce((a, b) => a + b.views, 0),
    leads = trend.reduce((a, b) => a + b.leads, 0);
  return {
    counts,
    trend,
    views,
    leads,
    clicks: trend.reduce((a, b) => a + b.clicks, 0),
    conversion: views ? Math.round((leads / views) * 1000) / 10 : 0,
    recent: recent.rows.map((r) => ({
      _id: r._id,
      name: r.name,
      vehicleId: r.vehicleId,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}
