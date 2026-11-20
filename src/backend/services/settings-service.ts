import { defaultTheme, themeSchema } from "../../shared/schemas";
import { isLanguage } from "../../shared/languages";
import type { Context } from "../context";
import { saveRow, getRow } from "../repositories/repository";
import { audit } from "./audit-service";
import { AppError } from "../errors";
export async function getSettings(ctx: Context) {
  const r = await getRow(ctx, "settings", "global", !ctx.manager);
  const theme = r ? themeSchema.parse(r.theme) : { ...defaultTheme };
  try {
    const langRow = await getRow(ctx, "languages", "global", true);
    const code = (langRow?.code ?? langRow?.language) as unknown;
    if (isLanguage(code)) {
      theme.language = code;
    }
  } catch {
    // Keep theme.language
  }
  return theme;
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

  // Keep languages collection in sync
  try {
    const langOld = await getRow(ctx, "languages", "global", true);
    await saveRow(
      ctx,
      "languages",
      { _id: "global", language: theme.language, code: theme.language },
      !langOld,
      true,
    );
  } catch {
    // Non-fatal
  }

  return theme;
}
