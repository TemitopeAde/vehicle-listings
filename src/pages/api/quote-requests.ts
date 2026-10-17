import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import { quoteStatuses } from "../../shared/quote-requests";
import {
  listQuoteRequests,
  submitQuoteRequest,
  updateQuoteRequest,
} from "../../backend/services/quote-request-service";
export const GET: APIRoute = ({ request }) =>
  respond(async () => {
    const p = new URL(request.url).searchParams;
    return listQuoteRequests(
      await context(true),
      z.enum(["", ...quoteStatuses]).parse(p.get("status") ?? ""),
      z.coerce
        .number()
        .int()
        .min(0)
        .parse(p.get("cursor") ?? 0),
    );
  });
export const POST: APIRoute = ({ request }) =>
  respond(
    async () => submitQuoteRequest(await context(), await readJson(request)),
    201,
  );
export const PATCH: APIRoute = ({ request }) =>
  respond(async () => {
    const c = z
      .object({ id: z.string(), payload: z.unknown() })
      .strict()
      .parse(await readJson(request));
    return updateQuoteRequest(await context(true), c.id, c.payload);
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET", "POST", "PATCH"]);
