import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import { createQuoteInvoice } from "../../backend/services/quote-request-invoice-service";

export const POST: APIRoute = ({ request }) =>
  respond(async () => {
    const ctx = await context(true);
    const { id } = z
      .object({ id: z.string().min(1).max(100) })
      .strict()
      .parse(await readJson(request));
    return createQuoteInvoice(ctx, id);
  });
export const ALL: APIRoute = () => methodNotAllowed(["POST"]);
