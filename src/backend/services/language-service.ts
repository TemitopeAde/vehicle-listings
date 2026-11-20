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
  // Check language-specific row in settings collection
  const langRow = await deps.getRow(ctx, "settings", "language", true);
  if (langRow) {
    const code = (langRow.code ?? langRow.language) as unknown;
    if (isLanguage(code)) {
      return { language: code, code };
    }
  }

  // Fallback to global row in settings collection
  const globalRow = await deps.getRow(ctx, "settings", "global", true);
  if (globalRow) {
    const code = (globalRow.code ??
      globalRow.language ??
      (globalRow.theme as { language?: unknown } | undefined)?.language) as unknown;
    if (isLanguage(code)) {
      return { language: code, code };
    }
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

  // Save language settings row in settings collection
  const old = await deps.getRow(ctx, "settings", "language", true);
  await deps.saveRow(
    ctx,
    "settings",
    { _id: "language", title: "Language settings", language: code, code },
    !old,
    true,
  );
  await deps.audit(ctx, "settings", "language", "update");

  // Keep global appearance row in settings collection in sync
  try {
    const globalOld = await deps.getRow(ctx, "settings", "global", true);
    if (
      globalOld &&
      typeof globalOld.theme === "object" &&
      globalOld.theme !== null
    ) {
      const theme = {
        ...(globalOld.theme as Record<string, unknown>),
        language: code,
      };
      await deps.saveRow(
        ctx,
        "settings",
        { ...globalOld, language: code, code, theme },
        false,
        true,
      );
    }
  } catch {
    // Non-fatal if global row sync fails
  }

  return { language: code, code };
}
