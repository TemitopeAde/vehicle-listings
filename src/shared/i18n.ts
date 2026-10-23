import { messages, type MessageKey, type Translation } from "./i18n-messages";
import { catalogs, type CatalogLanguage } from "./locales";

export {
  direction,
  isLanguage,
  languageOptions,
  languageSchema,
  languages,
  localeFor,
  type Language,
} from "./languages";
import { type Language } from "./languages";

export type Vars = Record<string, string | number>;

function applyVars(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] === undefined ? "" : String(vars[name]),
  );
}

const bundled = new Set<string>(["es", "fr", "de", "pt", "ar"]);
const bundledMessages: Readonly<Record<string, Translation>> = messages;

/** Looks up interface copy. Unknown text, including vehicle titles, is returned unchanged. */
export function translate(language: Language, key: string, vars?: Vars) {
  const row = Object.hasOwn(bundledMessages, key) ? bundledMessages[key] : undefined;
  let template = key;
  if (language !== "en" && row && bundled.has(language)) {
    template = row[language as keyof Translation] || key;
  } else if (language !== "en" && language in catalogs) {
    const catalog = catalogs[language as CatalogLanguage];
    template = Object.hasOwn(catalog, key) ? catalog[key] || key : key;
  }
  return applyVars(template, vars);
}

/**
 * Merchant-written copy stays as entered. Stock English defaults follow the selected language.
 */
export function localizeDefault(
  language: Language,
  value: string | null | undefined,
  fallback: string,
) {
  const text = value?.trim() ?? "";
  if (!text || text === fallback) return translate(language, fallback);
  return text;
}

export const statusLabel: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
  deleted: "Deleted",
  pending: "Pending",
  approved: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
  new: "New",
  "in-progress": "In progress",
  quoted: "Quote sent",
  won: "Won",
  lost: "Lost",
};

export const conditionLabel: Record<string, string> = {
  used: "Used",
  new: "New",
  certified: "Certified",
};

export type { MessageKey };
