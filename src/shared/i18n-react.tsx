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
import { api, cacheTtl, cachedApi, invalidateApiCache } from "./client";
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

export type LanguageApiResponse = {
  language: Language;
  code: Language;
  languages?: unknown;
};

export const LANGUAGE_CHANGED_EVENT = "wix:language-changed";

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    broadcastChannel = new BroadcastChannel("wix:language");
  }
} catch {
  // Ignored in non-browser or restricted environments
}

export function notifyLanguageChanged(code?: Language) {
  invalidateApiCache("languages");
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { code } }),
    );
    try {
      localStorage.setItem(
        "wix:language-changed",
        JSON.stringify({ code, timestamp: Date.now() }),
      );
    } catch {
      // Storage unavailable
    }
  }
  try {
    broadcastChannel?.postMessage({ code, timestamp: Date.now() });
  } catch {
    // Broadcast channel unavailable
  }
}

export function subscribeLanguageChange(callback: (code?: Language) => void) {
  if (typeof window === "undefined") return () => {};
  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ code?: Language }>).detail;
    callback(detail?.code);
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "wix:language-changed" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed?.code);
      } catch {
        callback();
      }
    }
  };
  const handleBroadcast = (e: MessageEvent) => {
    callback(e.data?.code);
  };

  window.addEventListener(LANGUAGE_CHANGED_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleBroadcast);
  }

  return () => {
    window.removeEventListener(LANGUAGE_CHANGED_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener("message", handleBroadcast);
    }
  };
}

export async function fetchLanguageFromApi(fresh = false): Promise<Language> {
  try {
    const data = fresh
      ? await api<LanguageApiResponse>("languages")
      : await cachedApi<LanguageApiResponse>("languages", cacheTtl.languages);
    const code = (data?.code ?? data?.language) as unknown;
    if (isLanguage(code)) return code;
  } catch {
    // Fallback to settings if languages endpoint fails
    try {
      const theme = fresh
        ? await api<Theme>("settings")
        : await cachedApi<Theme>("settings", cacheTtl.settings);
      if (isLanguage(theme.language)) return theme.language;
    } catch {
      // Return default
    }
  }
  return "en";
}

export async function updateLanguage(
  code: Language,
): Promise<LanguageApiResponse> {
  invalidateApiCache("languages");
  const result = await api<LanguageApiResponse>(
    "languages",
    { language: code, code },
    "PATCH",
  );
  notifyLanguageChanged(code);
  return result;
}

type I18nValue = {
  language: Language;
  dir: "ltr" | "rtl";
  setLanguage: (language: Language) => void;
  changeLanguage: (language: Language) => Promise<void>;
  t: (key: string, vars?: Vars) => string;
  money: (value: number, currency?: string) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function createValue(
  language: Language,
  setLanguage: (language: Language) => void,
  changeLanguage: (language: Language) => Promise<void> = async (next) => {
    setLanguage(next);
    await updateLanguage(next);
  },
): I18nValue {
  const locale = localeFor(language);
  return {
    language,
    dir: direction(language),
    setLanguage,
    changeLanguage,
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

/** Loads the language chosen in language collection / dashboard settings and provides it to this surface. */
export function LocaleProvider({
  children,
  fresh = false,
  defaultLanguage,
}: {
  children: ReactNode;
  fresh?: boolean;
  defaultLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage ?? "en");
  const chosen = useRef(false);

  const chooseLanguage = useCallback((next: Language) => {
    chosen.current = true;
    setLanguageState(next);
  }, []);

  const changeLanguage = useCallback(async (next: Language) => {
    chosen.current = true;
    setLanguageState(next);
    await updateLanguage(next);
  }, []);

  const loadLanguage = useCallback(
    async (isFresh = fresh) => {
      const code = await fetchLanguageFromApi(isFresh);
      if (!chosen.current) {
        setLanguageState(code);
      }
    },
    [fresh],
  );

  useEffect(() => {
    let active = true;
    // Initial fetch from the languages API (cached to prevent duplicate requests across widgets)
    loadLanguage(fresh);

    // When the language is changed, each widget and component calls the API for languages (cached so we don't call always)
    const unsubscribe = subscribeLanguageChange(async () => {
      if (active) {
        chosen.current = false;
        const code = await fetchLanguageFromApi(false);
        if (active) {
          setLanguageState(code);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [fresh, loadLanguage]);

  const value = useMemo(
    () => createValue(language, chooseLanguage, changeLanguage),
    [language, chooseLanguage, changeLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
