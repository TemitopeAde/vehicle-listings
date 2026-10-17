import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import {
  emailBranding,
  replyToInquiry,
  confirmInquiry,
} from "../../backend/services/inquiry-email-service";

export const GET: APIRoute = () =>
  respond(async () => emailBranding(await context(true)));
export const POST: APIRoute = ({ request }) =>
  respond(async () =>
    replyToInquiry(await context(true), await readJson(request)),
  );
export const PATCH: APIRoute = ({ request }) =>
  respond(async () => {
    const ctx = await context(true);
    const { id } = z
      .object({ id: z.string().min(1).max(100) })
      .strict()
      .parse(await readJson(request));
    return { status: await confirmInquiry(ctx, id) };
  });
export const ALL: APIRoute = () => methodNotAllowed(["GET", "POST", "PATCH"]);
