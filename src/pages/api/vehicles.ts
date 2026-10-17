import type { APIRoute } from "astro";
import { z } from "zod";
import { contextForRequest } from "../../backend/dealer-request";
import {
  respond,
  AppError,
  readJson,
  methodNotAllowed,
} from "../../backend/errors";
import {
  listVehicles,
  listVehicleMakes,
  getVehicle,
  createVehicle,
  updateVehicle,
  setStatus,
  duplicateVehicle,
  similarVehicles,
} from "../../backend/services/vehicle-service";
import { priceHistoryFor } from "../../backend/services/price-history-service";
const command = z
  .object({
    action: z.enum(["create", "update", "status", "duplicate", "bulk"]),
    id: z.string().optional(),
    ids: z.array(z.string()).min(1).max(100).optional(),
    payload: z.unknown().optional(),
    status: z.string().optional(),
    version: z.number().optional(),
    idempotencyKey: z.string().uuid().optional(),
  })
  .strict();
export const GET: APIRoute = ({ request }) =>
  respond(async () => {
    const params = new URL(request.url).searchParams;
    const publicOnly = params.get("public") === "1";
    const ctx = await contextForRequest(request, !publicOnly);
    if (params.get("makes") === "1") return listVehicleMakes(ctx, publicOnly);
    const history = params.get("history");
    if (history)
      return priceHistoryFor(
        ctx,
        await getVehicle(ctx, history, publicOnly, publicOnly),
      );
    const id = params.get("id");
    if (id) return getVehicle(ctx, id, publicOnly, publicOnly);
    const slug = params.get("slug");
    if (slug) return getVehicle(ctx, slug, publicOnly, publicOnly, "slug");
    const similar = params.get("similar");
    if (similar)
      return similarVehicles(
        ctx,
        similar,
        z.coerce
          .number()
          .int()
          .min(1)
          .max(8)
          .catch(4)
          .parse(params.get("limit") ?? 4),
      );
    params.delete("public");
    return listVehicles(ctx, Object.fromEntries(params), publicOnly);
  });
export const POST: APIRoute = ({ request }) =>
  respond(async () => {
    const ctx = await contextForRequest(request, true);
    const c = command.parse(await readJson(request));
    if (c.action === "create")
      return createVehicle(ctx, c.payload, c.idempotencyKey);
    if (c.action === "bulk") {
      if (!c.ids) throw new AppError("VALIDATION", "Choose vehicles.");
      const results = [];
      for (const id of c.ids) {
        try {
          await setStatus(ctx, id, c.status);
          results.push({ id, success: true });
        } catch (e) {
          results.push({
            id,
            success: false,
            error: e instanceof AppError ? e.message : "Update failed.",
          });
        }
      }
      return { results };
    }
    if (!c.id) throw new AppError("VALIDATION", "A vehicle ID is required.");
    if (c.action === "update")
      return updateVehicle(ctx, c.id, c.payload, c.version);
    if (c.action === "duplicate")
      return duplicateVehicle(ctx, c.id, c.idempotencyKey);
    return setStatus(ctx, c.id, c.status);
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET", "POST"]);
