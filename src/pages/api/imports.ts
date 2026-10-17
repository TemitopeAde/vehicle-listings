import type { APIRoute } from "astro";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import { importCSV } from "../../backend/services/import-service";
export const POST: APIRoute = ({ request }) =>
  respond(async () => importCSV(await context(true), await readJson(request)));

export const ALL: APIRoute = () => methodNotAllowed(["POST"]);
