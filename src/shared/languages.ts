import { z } from "zod";

export const languageOptions = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "es", label: "Español", dir: "ltr" },
  { value: "fr", label: "Français", dir: "ltr" },
  { value: "de", label: "Deutsch", dir: "ltr" },
  { value: "pt", label: "Português", dir: "ltr" },
  { value: "ar", label: "العربية", dir: "rtl" },
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

export function localeFor(language: Language) {
  return language === "en" ? "en-US" : language === "pt" ? "pt-PT" : language;
}

export function direction(language: Language): "ltr" | "rtl" {
  return (
    languageOptions.find((option) => option.value === language)?.dir ?? "ltr"
  );
}
