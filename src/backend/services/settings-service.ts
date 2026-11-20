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
    const langRow = await getRow(ctx, "settings", "language", !ctx.manager);
    const code = (langRow?.code ?? langRow?.language) as unknown;
    if (isLanguage(code)) {
      theme.language = code;
    } else if (r && isLanguage((r as { code?: unknown; language?: unknown }).code ?? (r as { code?: unknown; language?: unknown }).language)) {
      theme.language = ((r as { code?: unknown; language?: unknown }).code ?? (r as { code?: unknown; language?: unknown }).language) as any;
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
    {
      _id: "global",
      title: "Global appearance",
      theme,
      language: theme.language,
      code: theme.language,
    },
    !old,
  );
  await audit(ctx, "settings", "global", "update");

  // Keep language settings row in settings collection in sync
  try {
    const langOld = await getRow(ctx, "settings", "language", true);
    await saveRow(
      ctx,
      "settings",
      {
        _id: "language",
        title: "Language settings",
        language: theme.language,
        code: theme.language,
      },
      !langOld,
      true,
    );
  } catch {
    // Non-fatal
  }

  return theme;
}
