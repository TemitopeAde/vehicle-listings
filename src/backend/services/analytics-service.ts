import { sha256Hex } from "../web-crypto";
import { z } from "zod";
import type { Context } from "../context";
import { getVehicle } from "./vehicle-service";
import {
  queryRows,
  saveRow,
  getRow,
  countRows,
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
export async function analytics(ctx: Context, days = 14, dealerId = "") {
  const counts = await Promise.all(
    ["draft", "published", "reserved", "sold", "archived"].map(
      async (status) => ({
        status,
        count: await countRows(ctx, "vehicles", {
          eq: { status, ...(dealerId ? { dealerId } : {}) },
          ne: { demo: true },
        }),
      }),
    ),
  );
  const trend = await Promise.all(
    Array.from({ length: days }, async (_, i) => {
      const day = new Date(Date.now() - (days - 1 - i) * 86400000)
        .toISOString()
        .slice(0, 10);
      const dayEnd = `${day}T23:59:59.999Z`,
        dayStart = `${day}T00:00:00.000Z`;
      const [views, clicks, leads] = await Promise.all([
        countRows(ctx, "events", { eq: { date: day, eventType: "view" } }),
        countRows(ctx, "events", {
          eq: { date: day },
          ne: { eventType: "view" },
        }),
        countRows(ctx, "inquiries", {
          ge: { createdAt: dayStart },
          le: { createdAt: dayEnd },
          eq: dealerId ? { dealerId } : {},
        }),
      ]);
      return { date: day, views, clicks, leads };
    }),
  );
  const views = trend.reduce((a, b) => a + b.views, 0),
    leads = trend.reduce((a, b) => a + b.leads, 0);
  const recent = await queryRows(ctx, "inquiries", {
    limit: 5,
    sort: "createdAt",
    descending: true,
    eq: dealerId ? { dealerId } : {},
  });
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
