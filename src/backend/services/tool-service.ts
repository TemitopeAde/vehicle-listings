import { z } from "zod";
import {
  filtersSchema,
  vehicleInput,
  dealerInput,
  statusSchema,
  themeSchema,
} from "../../shared/schemas";
import { quoteStatuses, type QuoteRequest } from "../../shared/quote-requests";
import { planKeys, plans } from "../../shared/plans";
import type { Context } from "../context";
import { AppError } from "../errors";
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  setStatus,
  duplicateVehicle,
  seedDemo,
  clearDemo,
} from "./vehicle-service";
import { listDealers, saveDealer, deleteDealer } from "./dealer-service";
import { listInquiries, updateInquiry } from "./inquiry-service";
import { analytics } from "./analytics-service";
import {
  deleteQuoteRequest,
  getQuoteRequest,
  listQuoteRequests,
  retryQuoteRequestEmails,
  updateQuoteRequest,
} from "./quote-request-service";
import { replyToQuoteRequest } from "./quote-request-email-service";
import { createQuoteInvoice } from "./quote-request-invoice-service";
import { confirmInquiry, replyToInquiry } from "./inquiry-email-service";
import { getSettings, setSettings } from "./settings-service";
import { planCheckoutUrl, planStatus } from "./plan-service";
import { priceHistoryFor } from "./price-history-service";
import { importCSV } from "./import-service";
import {
  getWidgetSettings,
  resetWidgetSettings,
  updateWidgetSettings,
} from "./widget-settings-service";
import { widgetKeyInfo, widgetTypes } from "../../shared/widget-settings";
const id = z.string().min(1).max(150);
const confirmed = z.literal(true);
const email = {
  subject: z.string().trim().min(1).max(150),
  html: z.string().min(1).max(30000),
  idempotencyKey: z.string().uuid(),
  confirmed,
};

/** What Aria may see of a buyer: name and message, never contact details or address. */
export function buyerView(q: QuoteRequest) {
  const {
    email: _email,
    phone: _phone,
    company: _company,
    addressLine: _addressLine,
    city: _city,
    subdivision: _subdivision,
    postalCode: _postalCode,
    country: _country,
    contactId: _contactId,
    consent: _consent,
    ...visible
  } = q;
  return visible;
}
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
  updateInquiry: z
    .object({
      inquiryId: id,
      status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
      notes: z.string().max(3000).optional(),
    })
    .strict(),
  emailInquiryBuyer: z.object({ inquiryId: id, ...email }).strict(),
  retryInquiryConfirmation: z.object({ inquiryId: id }).strict(),
  listQuoteRequests: z
    .object({
      status: z.enum(["", ...quoteStatuses]).default(""),
      cursor: z.number().int().min(0).default(0),
    })
    .strict(),
  getQuoteRequest: z.object({ quoteRequestId: id }).strict(),
  updateQuoteRequest: z
    .object({
      quoteRequestId: id,
      notes: z.string().max(3000).optional(),
      quotedPrice: z.number().min(0).max(1e12).nullable().optional(),
    })
    .strict(),
  emailQuoteRequester: z.object({ quoteRequestId: id, ...email }).strict(),
  createQuoteInvoice: z.object({ quoteRequestId: id, confirmed }).strict(),
  deleteQuoteRequest: z.object({ quoteRequestId: id, confirmed }).strict(),
  retryQuoteFollowUp: z.object({ quoteRequestId: id }).strict(),
  getSettings: z.object({}).strict(),
  updateSettings: z
    .object({ patch: themeSchema.partial(), confirmed })
    .strict(),
  getPlan: z.object({}).strict(),
  getUpgradeLink: z
    .object({ plan: z.enum(planKeys).exclude(["basic"]) })
    .strict(),
  duplicateVehicle: z
    .object({ vehicleId: id, idempotencyKey: z.string().uuid() })
    .strict(),
  getPriceHistory: z.object({ vehicleId: id }).strict(),
  importVehiclesCsv: z
    .object({
      csv: z.string().min(1).max(2_000_000),
      mapping: z.record(z.string(), z.string()).default({}),
      execute: z.boolean().default(false),
      confirmed: confirmed.optional(),
    })
    .strict()
    .refine((value) => !value.execute || value.confirmed === true, {
      message: "Confirm with the user before importing.",
      path: ["confirmed"],
    }),
  loadDemoInventory: z.object({ confirmed }).strict(),
  clearDemoInventory: z.object({ confirmed }).strict(),
  deleteDealer: z.object({ dealerId: id, confirmed }).strict(),
  getWidgetSettings: z.object({ widget: z.enum(widgetTypes) }).strict(),
  updateWidgetSettings: z
    .object({
      widget: z.enum(widgetTypes),
      patch: z.record(z.string(), z.string()),
      confirmed,
    })
    .strict(),
  resetWidgetSettings: z
    .object({
      widget: z.enum(widgetTypes),
      keys: z.array(z.string().max(100)).max(200).optional(),
      confirmed,
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
          name: i.name,
          message: i.message,
          notes: i.notes,
          vehicleId: i.vehicleId,
          dealerId: i.dealerId,
          status: i.status,
          kind: i.kind,
          preferredDate: i.preferredDate,
          createdAt: i.createdAt,
        })),
      };
    }
    case "updateInquiry": {
      const { inquiryId, ...patch } = toolSchemas.updateInquiry.parse(raw);
      await updateInquiry(ctx, inquiryId, patch);
      return { updated: true };
    }
    case "emailInquiryBuyer": {
      const p = toolSchemas.emailInquiryBuyer.parse(raw);
      return replyToInquiry(ctx, {
        id: p.inquiryId,
        subject: p.subject,
        html: p.html,
        idempotencyKey: p.idempotencyKey,
      });
    }
    case "retryInquiryConfirmation": {
      const p = toolSchemas.retryInquiryConfirmation.parse(raw);
      return { status: await confirmInquiry(ctx, p.inquiryId) };
    }
    case "listQuoteRequests": {
      const p = toolSchemas.listQuoteRequests.parse(raw);
      const r = await listQuoteRequests(ctx, p.status, p.cursor);
      return {
        items: r.items.map(buyerView),
        total: r.total,
        counts: r.counts,
        nextCursor: r.nextCursor,
      };
    }
    case "getQuoteRequest": {
      const p = toolSchemas.getQuoteRequest.parse(raw);
      return {
        quoteRequest: buyerView(await getQuoteRequest(ctx, p.quoteRequestId)),
      };
    }
    case "updateQuoteRequest": {
      const { quoteRequestId, ...patch } =
        toolSchemas.updateQuoteRequest.parse(raw);
      return {
        quoteRequest: buyerView(
          await updateQuoteRequest(ctx, quoteRequestId, patch),
        ),
      };
    }
    case "emailQuoteRequester": {
      const p = toolSchemas.emailQuoteRequester.parse(raw);
      return replyToQuoteRequest(ctx, {
        id: p.quoteRequestId,
        subject: p.subject,
        html: p.html,
        idempotencyKey: p.idempotencyKey,
      });
    }
    case "createQuoteInvoice": {
      const p = toolSchemas.createQuoteInvoice.parse(raw);
      return createQuoteInvoice(ctx, p.quoteRequestId);
    }
    case "deleteQuoteRequest": {
      const p = toolSchemas.deleteQuoteRequest.parse(raw);
      return deleteQuoteRequest(ctx, p.quoteRequestId);
    }
    case "retryQuoteFollowUp": {
      const p = toolSchemas.retryQuoteFollowUp.parse(raw);
      return retryQuoteRequestEmails(ctx, p.quoteRequestId);
    }
    case "getSettings":
      toolSchemas.getSettings.parse(raw);
      return { settings: await getSettings(ctx) };
    case "updateSettings": {
      const p = toolSchemas.updateSettings.parse(raw);
      // Settings are saved whole, so the patch is merged onto what's stored.
      return {
        settings: await setSettings(ctx, {
          ...(await getSettings(ctx)),
          ...p.patch,
        }),
      };
    }
    case "getPlan": {
      toolSchemas.getPlan.parse(raw);
      return {
        ...(await planStatus(ctx)),
        plans: planKeys.map((key) => ({ key, ...plans[key] })),
      };
    }
    case "getUpgradeLink": {
      const p = toolSchemas.getUpgradeLink.parse(raw);
      return planCheckoutUrl(ctx, p.plan);
    }
    case "duplicateVehicle": {
      const p = toolSchemas.duplicateVehicle.parse(raw);
      return {
        vehicle: await duplicateVehicle(ctx, p.vehicleId, p.idempotencyKey),
      };
    }
    case "getPriceHistory": {
      const p = toolSchemas.getPriceHistory.parse(raw);
      return {
        history: await priceHistoryFor(
          ctx,
          await getVehicle(ctx, p.vehicleId, false),
        ),
      };
    }
    case "importVehiclesCsv": {
      const { confirmed: _confirmed, ...input } =
        toolSchemas.importVehiclesCsv.parse(raw);
      return { result: await importCSV(ctx, input) };
    }
    case "loadDemoInventory":
      toolSchemas.loadDemoInventory.parse(raw);
      return seedDemo(ctx);
    case "clearDemoInventory":
      toolSchemas.clearDemoInventory.parse(raw);
      return { result: await clearDemo(ctx) };
    case "getWidgetSettings": {
      const p = toolSchemas.getWidgetSettings.parse(raw);
      const values = await getWidgetSettings(ctx, p.widget);
      return {
        values,
        // What can be set, so Wix AI picks valid keys and values.
        settings: widgetKeyInfo(p.widget).map(({ prop: _prop, ...key }) => key),
      };
    }
    case "updateWidgetSettings": {
      const p = toolSchemas.updateWidgetSettings.parse(raw);
      return { values: await updateWidgetSettings(ctx, p.widget, p.patch) };
    }
    case "resetWidgetSettings": {
      const p = toolSchemas.resetWidgetSettings.parse(raw);
      return { values: await resetWidgetSettings(ctx, p.widget, p.keys) };
    }
    case "deleteDealer": {
      const p = toolSchemas.deleteDealer.parse(raw);
      return { result: await deleteDealer(ctx, p.dealerId) };
    }
    default:
      throw new AppError("UNKNOWN_TOOL", "This tool is not available.");
  }
}
