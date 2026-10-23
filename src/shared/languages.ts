import { z } from "zod";

export const languageOptions = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "es", label: "Español", dir: "ltr" },
  { value: "fr", label: "Français", dir: "ltr" },
  { value: "de", label: "Deutsch", dir: "ltr" },
  { value: "pt", label: "Português", dir: "ltr" },
  { value: "ar", label: "العربية", dir: "rtl" },
  { value: "it", label: "Italiano", dir: "ltr" },
  { value: "nl", label: "Nederlands", dir: "ltr" },
  { value: "pl", label: "Polski", dir: "ltr" },
  { value: "sv", label: "Svenska", dir: "ltr" },
  { value: "da", label: "Dansk", dir: "ltr" },
  { value: "nb", label: "Norsk", dir: "ltr" },
  { value: "fi", label: "Suomi", dir: "ltr" },
  { value: "cs", label: "Čeština", dir: "ltr" },
  { value: "ro", label: "Română", dir: "ltr" },
  { value: "hu", label: "Magyar", dir: "ltr" },
  { value: "el", label: "Ελληνικά", dir: "ltr" },
  { value: "tr", label: "Türkçe", dir: "ltr" },
  { value: "ru", label: "Русский", dir: "ltr" },
  { value: "uk", label: "Українська", dir: "ltr" },
  { value: "zh", label: "中文", dir: "ltr" },
  { value: "ja", label: "日本語", dir: "ltr" },
  { value: "ko", label: "한국어", dir: "ltr" },
  { value: "hi", label: "हिन्दी", dir: "ltr" },
  { value: "th", label: "ไทย", dir: "ltr" },
  { value: "he", label: "עברית", dir: "rtl" },
] as const;

export type Language = (typeof languageOptions)[number]["value"];

export const languages = languageOptions.map(({ value }) => value) as [
  Language,
  ...Language[],
];

export const languageSchema = z.enum(languages).default("en");

export function isLanguage(value: unknown): value is Language {
  return languages.includes(value as Language);
}

const locales: Partial<Record<Language, string>> = {
  en: "en-US",
  pt: "pt-PT",
  zh: "zh-CN",
  nb: "nb-NO",
};

export function localeFor(language: Language) {
  return locales[language] ?? language;
}

export function direction(language: Language): "ltr" | "rtl" {
  return (
    languageOptions.find((option) => option.value === language)?.dir ?? "ltr"
  );
}
