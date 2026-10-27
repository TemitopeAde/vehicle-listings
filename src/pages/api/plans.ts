import type { APIRoute } from "astro";
import { context } from "../../backend/context";
import {
  respond,
  readJson,
  methodNotAllowed,
  AppError,
} from "../../backend/errors";
import {
  planCheckoutUrl,
  planStatus,
} from "../../backend/services/plan-service";
import { isPlanKey, plans, planKeys } from "../../shared/plans";

export const GET: APIRoute = () =>
  respond(async () => ({
    ...(await planStatus(await context())),
    plans: planKeys.map((key) => ({ key, ...plans[key] })),
  }));

export const POST: APIRoute = ({ request }) =>
  respond(async () => {
    const body = (await readJson(request)) as { plan?: unknown };
    if (!isPlanKey(body.plan))
      throw new AppError("INVALID_PLAN", "Choose a valid plan.", 400);
    return planCheckoutUrl(await context(true), body.plan);
  });

export const ALL: APIRoute = () => methodNotAllowed(["GET", "POST"]);
