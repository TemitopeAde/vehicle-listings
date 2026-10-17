import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { contextForRequest } from "../../backend/dealer-request";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import { dealerDirectory } from "../../backend/services/public-dealer-service";
import {
  applyDealer,
  dealerSession,
  deleteDealer,
  listDealers,
  saveDealer,
  publicDealer,
} from "../../backend/services/dealer-service";
export const GET: APIRoute = ({ request }) =>
  respond(async () => {
    const p = new URL(request.url).searchParams;
    if (p.get("public") === "1")
      return p.get("id")
        ? publicDealer(await context(), z.string().min(1).parse(p.get("id")))
        : dealerDirectory(
            await context(),
            p.get("search") ?? "",
            z.coerce
              .number()
              .int()
              .min(0)
              .parse(p.get("cursor") ?? 0),
          );
    if (p.get("session") === "1")
      return dealerSession(await contextForRequest(request, false, true));
    return listDealers(
      await context(true),
      p.get("search") ?? "",
      z.coerce
        .number()
        .int()
        .min(0)
        .parse(p.get("cursor") ?? 0),
    );
  });
export const POST: APIRoute = ({ request }) =>
  respond(async () => {
    const body = await readJson(request);
    if (
      body &&
      typeof body === "object" &&
      "action" in body &&
      body.action === "apply"
    )
      return applyDealer(await context(), body);
    if (
      body &&
      typeof body === "object" &&
      "action" in body &&
      body.action === "delete"
    ) {
      const command = z
        .object({ action: z.literal("delete"), id: z.string().min(1) })
        .strict()
        .parse(body);
      return deleteDealer(await context(true), command.id);
    }
    const c = z
      .object({ id: z.string().optional(), payload: z.unknown() })
      .strict()
      .parse(body);
    return saveDealer(await context(true), c.payload, c.id);
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET", "POST"]);
