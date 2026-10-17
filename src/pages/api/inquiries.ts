import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import {
  listInquiries,
  submitInquiry,
  updateInquiry,
} from "../../backend/services/inquiry-service";
export const GET: APIRoute = ({ request }) =>
  respond(async () => {
    const p = new URL(request.url).searchParams;
    return listInquiries(
      await context(true),
      z
        .enum(["", "new", "contacted", "qualified", "closed"])
        .parse(p.get("status") ?? ""),
      z.coerce
        .number()
        .int()
        .min(0)
        .parse(p.get("cursor") ?? 0),
    );
  });
export const POST: APIRoute = ({ request }) =>
  respond(
    async () => submitInquiry(await context(), await readJson(request)),
    201,
  );
export const PATCH: APIRoute = ({ request }) =>
  respond(async () => {
    const c = z
      .object({ id: z.string(), payload: z.unknown() })
      .strict()
      .parse(await readJson(request));
    return updateInquiry(await context(true), c.id, c.payload);
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET", "POST", "PATCH"]);
