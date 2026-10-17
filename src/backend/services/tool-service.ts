import { z } from "zod";
import {
  filtersSchema,
  vehicleInput,
  dealerInput,
  statusSchema,
} from "../../shared/schemas";
import type { Context } from "../context";
import { AppError } from "../errors";
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  setStatus,
} from "./vehicle-service";
import { listDealers, saveDealer } from "./dealer-service";
import { listInquiries } from "./inquiry-service";
import { analytics } from "./analytics-service";
const id = z.string().min(1).max(150);
export const toolSchemas = {
  listVehicles: filtersSchema,
  getVehicle: z.object({ vehicleId: id }).strict(),
  createVehicleDraft: z
    .object({ vehicle: vehicleInput, idempotencyKey: z.string().uuid() })
    .strict(),
  updateVehicle: z
    .object({
      vehicleId: id,
      patch: vehicleInput.partial(),
      version: z.number().int().optional(),
    })
    .strict(),
  publishVehicle: z
    .object({ vehicleId: id, confirmed: z.literal(true) })
    .strict(),
  setVehicleStatus: z
    .object({ vehicleId: id, status: statusSchema, confirmed: z.literal(true) })
    .strict(),
  bulkUpdateVehicles: z
    .object({
      ids: z.array(id).min(1).max(100),
      patch: z.object({ status: statusSchema }),
      confirmed: z.literal(true),
    })
    .strict(),
  listDealers: z
    .object({
      search: z.string().max(100).default(""),
      cursor: z.number().int().min(0).default(0),
    })
    .strict(),
  createDealer: z.object({ dealer: dealerInput }).strict(),
  updateDealer: z
    .object({ dealerId: id, patch: dealerInput.partial() })
    .strict(),
  getInventorySummary: z.object({}).strict(),
  getVehicleAnalytics: z
    .object({ days: z.number().int().min(1).max(90).default(14) })
    .strict(),
  getInquiries: z
    .object({
      status: z
        .enum(["", "new", "contacted", "qualified", "closed"])
        .default(""),
      cursor: z.number().int().min(0).default(0),
    })
    .strict(),
};
export type ToolName = keyof typeof toolSchemas;
export async function runTool(
  ctx: Context,
  name: string,
  raw: unknown,
): Promise<Record<string, unknown>> {
  if (!ctx.manager)
    throw new AppError(
      "FORBIDDEN",
      "Inventory management permission is required.",
      403,
    );
  switch (name) {
    case "listVehicles":
      return listVehicles(ctx, toolSchemas.listVehicles.parse(raw));
    case "getVehicle":
      return {
        vehicle: await getVehicle(
          ctx,
          toolSchemas.getVehicle.parse(raw).vehicleId,
          false,
        ),
      };
    case "createVehicleDraft": {
      const p = toolSchemas.createVehicleDraft.parse(raw);
      return { vehicle: await createVehicle(ctx, p.vehicle, p.idempotencyKey) };
    }
    case "updateVehicle": {
      const p = toolSchemas.updateVehicle.parse(raw);
      return {
        vehicle: await updateVehicle(ctx, p.vehicleId, p.patch, p.version),
      };
    }
    case "publishVehicle": {
      const p = toolSchemas.publishVehicle.parse(raw);
      return { vehicle: await setStatus(ctx, p.vehicleId, "published") };
    }
    case "setVehicleStatus": {
      const p = toolSchemas.setVehicleStatus.parse(raw);
      return { vehicle: await setStatus(ctx, p.vehicleId, p.status) };
    }
    case "bulkUpdateVehicles": {
      const p = toolSchemas.bulkUpdateVehicles.parse(raw);
      const results = [];
      for (const id of p.ids) {
        try {
          await setStatus(ctx, id, p.patch.status);
          results.push({ id, success: true });
        } catch (e) {
          results.push({
            id,
            success: false,
            message: e instanceof AppError ? e.message : "Update failed.",
          });
        }
      }
      return { results };
    }
    case "listDealers": {
      const p = toolSchemas.listDealers.parse(raw);
      return listDealers(ctx, p.search, p.cursor);
    }
    case "createDealer":
      return {
        dealer: await saveDealer(
          ctx,
          toolSchemas.createDealer.parse(raw).dealer,
        ),
      };
    case "updateDealer": {
      const p = toolSchemas.updateDealer.parse(raw);
      return { dealer: await saveDealer(ctx, p.patch, p.dealerId) };
    }
    case "getInventorySummary": {
      toolSchemas.getInventorySummary.parse(raw);
      const r = await analytics(ctx, 1);
      return { counts: r.counts };
    }
    case "getVehicleAnalytics": {
      const p = toolSchemas.getVehicleAnalytics.parse(raw);
      const r = await analytics(ctx, p.days);
      return {
        trend: r.trend,
        views: r.views,
        leads: r.leads,
        clicks: r.clicks,
        conversion: r.conversion,
      };
    }
    case "getInquiries": {
      const p = toolSchemas.getInquiries.parse(raw);
      const r = await listInquiries(ctx, p.status, p.cursor);
      return {
        ...r,
        items: r.items.map((i) => ({
          _id: i._id,
          vehicleId: i.vehicleId,
          dealerId: i.dealerId,
          status: i.status,
          kind: i.kind,
          createdAt: i.createdAt,
        })),
      };
    }
    default:
      throw new AppError("UNKNOWN_TOOL", "This tool is not available.");
  }
}
