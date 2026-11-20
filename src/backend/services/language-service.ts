import { isLanguage, languageSchema, type Language } from "../../shared/languages";
import type { Context } from "../context";
import { saveRow, getRow } from "../repositories/repository";
import { audit } from "./audit-service";
import { AppError } from "../errors";

export type LanguageSettings = {
  language: Language;
  code: Language;
};

export type LanguageDependencies = {
  getRow: typeof getRow;
  saveRow: typeof saveRow;
  audit: typeof audit;
};

const defaultDeps: LanguageDependencies = {
  getRow,
  saveRow,
  audit,
};

export async function getLanguageSettings(
  ctx: Context,
  deps: LanguageDependencies = defaultDeps,
): Promise<LanguageSettings> {
  const r = await deps.getRow(ctx, "languages", "global", true);
  if (r) {
    const code = (r.code ?? r.language) as unknown;
    if (isLanguage(code)) {
      return { language: code, code };
    }
  }

  // Fallback to settings collection if language was stored there
  const settingsRow = await deps.getRow(ctx, "settings", "global", true);
  const themeLang = (settingsRow?.theme as { language?: unknown } | undefined)?.language;
  if (isLanguage(themeLang)) {
    return { language: themeLang, code: themeLang };
  }

  return { language: "en", code: "en" };
}

export async function setLanguageSettings(
  ctx: Context,
  raw: unknown,
  deps: LanguageDependencies = defaultDeps,
): Promise<LanguageSettings> {
  if (!ctx.manager) {
    throw new AppError(
      "FORBIDDEN",
      "Settings management permission is required.",
      403,
    );
  }

  let targetCode: unknown;
  if (typeof raw === "string") {
    targetCode = raw;
  } else if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    targetCode = obj.code ?? obj.language;
  }

  const parsed = languageSchema.safeParse(targetCode);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid language code: ${String(targetCode)}`,
      400,
    );
  }

  const code = parsed.data;
  const old = await deps.getRow(ctx, "languages", "global", true);
  await deps.saveRow(
    ctx,
    "languages",
    { _id: "global", language: code, code },
    !old,
    true,
  );
  await deps.audit(ctx, "languages", "global", "update");

  // Keep settings collection in sync for backward compatibility
  try {
    const settingsOld = await deps.getRow(ctx, "settings", "global", true);
    if (
      settingsOld &&
      typeof settingsOld.theme === "object" &&
      settingsOld.theme !== null
    ) {
      const theme = {
        ...(settingsOld.theme as Record<string, unknown>),
        language: code,
      };
      await deps.saveRow(ctx, "settings", { ...settingsOld, theme }, false, true);
    }
  } catch {
    // Non-fatal if settings sync fails
  }

  return { language: code, code };
}
