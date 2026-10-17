import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { respond, methodNotAllowed } from "../../backend/errors";
import { analytics } from "../../backend/services/analytics-service";
export const GET: APIRoute = ({ request }) =>
  respond(async () => {
    const p = new URL(request.url).searchParams;
    return analytics(
      await context(true),
      z.coerce
        .number()
        .int()
        .min(1)
        .max(90)
        .parse(p.get("days") ?? 14),
    );
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET"]);
