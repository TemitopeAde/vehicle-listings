import countries from "./countries.json";

/** ISO 3166 alpha-2 codes, the form Wix contacts and invoices store countries in. */
export const countryCodes = new Set(countries.map((c) => c.code));

/** The country's name in the given locale when the browser knows it, else its English name. */
export function countryName(code: string, locale: string) {
  const english = countries.find((c) => c.code === code)?.name;
  if (!english) return code;
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? english
    );
  } catch {
    return english;
  }
}

/** Every country as a select option, sorted by its name in the given locale. */
export function countryOptions(locale: string) {
  return countries
    .map((c) => ({ ...c, name: countryName(c.code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

/**
 * The number as one international string, like `+234 803 123 4567`. A number typed with its own
 * `+` is kept as typed; otherwise the national trunk 0 is dropped, as dialling from abroad does.
 */
export function internationalPhone(dial: string, local: string) {
  const number = local.trim();
  if (!number || number.startsWith("+") || !dial) return number;
  return `+${dial} ${number.replace(/^0+/, "")}`;
}

/** The visitor's country from the browser language, like `NG` for `en-NG`, when it is known. */
export function visitorCountry() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    return region && countryCodes.has(region) ? region : "";
  } catch {
    return "";
  }
}
