import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, cacheTtl, cachedApi } from "./client";
import {
  direction,
  isLanguage,
  localeFor,
  translate,
  type Language,
  type Vars,
} from "./i18n";
import type { Theme } from "./schemas";
import { money } from "./utils";

type I18nValue = {
  language: Language;
  dir: "ltr" | "rtl";
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Vars) => string;
  money: (value: number, currency?: string) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function createValue(
  language: Language,
  setLanguage: (language: Language) => void,
): I18nValue {
  const locale = localeFor(language);
  return {
    language,
    dir: direction(language),
    setLanguage,
    t: (key, vars) => translate(language, key, vars),
    money: (value, currency = "USD") => money(value, currency, locale),
    number: (value, options) => value.toLocaleString(locale, options),
  };
}

export function useI18n() {
  const value = useContext(I18nContext);
  return value ?? createValue("en", () => {});
}

export function localeProps(language: Language) {
  return { lang: language, dir: direction(language) };
}

/** Loads the language chosen in dashboard settings and provides it to this surface. */
export function LocaleProvider({
  children,
  fresh = false,
}: {
  children: ReactNode;
  fresh?: boolean;
}) {
  const [language, setLanguage] = useState<Language>("en");
  const chosen = useRef(false);
  const chooseLanguage = useCallback((next: Language) => {
    chosen.current = true;
    setLanguage(next);
  }, []);
  useEffect(() => {
    let active = true;
    const load = fresh
      ? api<Theme>("settings")
      : cachedApi<Theme>("settings", cacheTtl.settings);
    load
      .then((theme) => {
        if (active && !chosen.current && isLanguage(theme.language))
          setLanguage(theme.language);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fresh]);
  const value = useMemo(
    () => createValue(language, chooseLanguage),
    [language, chooseLanguage],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
