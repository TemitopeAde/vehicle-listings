import { defaultTheme, themeSchema } from "../../shared/schemas";
import type { Context } from "../context";
import { saveRow, getRow } from "../repositories/repository";
import { audit } from "./audit-service";
import { AppError } from "../errors";
export async function getSettings(ctx: Context) {
  const r = await getRow(ctx, "settings", "global", !ctx.manager);
  return r ? themeSchema.parse(r.theme) : defaultTheme;
}
export async function setSettings(ctx: Context, raw: unknown) {
  if (!ctx.manager)
    throw new AppError(
      "FORBIDDEN",
      "Settings management permission is required.",
      403,
    );
  const theme = themeSchema.parse(raw),
    old = await getRow(ctx, "settings", "global");
  await saveRow(
    ctx,
    "settings",
    { _id: "global", title: "Global appearance", theme },
    !old,
  );
  await audit(ctx, "settings", "global", "update");
  return theme;
}
