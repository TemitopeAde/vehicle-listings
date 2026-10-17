import type { APIRoute } from "astro";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import { trackEvent } from "../../backend/services/analytics-service";
export const POST: APIRoute = ({ request }) =>
  respond(async () => trackEvent(await context(), await readJson(request)));

export const ALL: APIRoute = () => methodNotAllowed(["POST"]);
