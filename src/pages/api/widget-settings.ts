import type { APIRoute } from "astro";
import { z } from "zod";
import { context } from "../../backend/context";
import { respond, readJson, methodNotAllowed } from "../../backend/errors";
import {
  getWidgetSettings,
  updateWidgetSettings,
} from "../../backend/services/widget-settings-service";
import { widgetTypes } from "../../shared/widget-settings";

export const GET: APIRoute = ({ request }) =>
  respond(async () =>
    getWidgetSettings(
      await context(),
      z
        .enum(widgetTypes)
        .parse(new URL(request.url).searchParams.get("widget")),
    ),
  );
export const PATCH: APIRoute = ({ request }) =>
  respond(async () => {
    const { widget, patch } = z
      .object({ widget: z.enum(widgetTypes), patch: z.unknown() })
      .strict()
      .parse(await readJson(request));
    return updateWidgetSettings(await context(true), widget, patch);
  });
export const ALL: APIRoute = () => methodNotAllowed(["GET", "PATCH"]);
