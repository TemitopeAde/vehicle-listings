import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultTheme, themeSchema } from "../shared/schemas";
import { localizeDefault, translate } from "../shared/i18n";
import { direction, languageOptions, localeFor } from "../shared/languages";
import { messages } from "../shared/i18n-messages";
import { catalogs } from "../shared/locales";

test("showroom settings default to English and accept each language", () => {
  const { language: _language, ...withoutLanguage } = defaultTheme;
  assert.equal(themeSchema.parse(withoutLanguage).language, "en");
  for (const { value } of languageOptions) {
    assert.equal(
      themeSchema.parse({ ...defaultTheme, language: value }).language,
      value,
    );
  }
  assert.equal(
    themeSchema.safeParse({ ...defaultTheme, language: "xx" }).success,
    false,
  );
});

test("translations keep placeholders and fall back to English", () => {
  assert.equal(translate("en", "Save settings"), "Save settings");
  assert.notEqual(translate("es", "Save settings"), "Save settings");
  assert.equal(
    translate("fr", "Showing {shown} of {total} vehicles", {
      shown: 3,
      total: 12,
    }),
    messages["Showing {shown} of {total} vehicles"].fr
      .replace("{shown}", "3")
      .replace("{total}", "12"),
  );
  assert.equal(translate("de", "A custom vehicle title"), "A custom vehicle title");
  assert.equal(direction("ar"), "rtl");
  assert.equal(direction("en"), "ltr");
  for (const [key, row] of Object.entries(messages)) {
    for (const language of ["es", "fr", "de", "pt", "ar"] as const) {
      assert.ok(row[language], `${language} missing ${key}`);
    }
  }
});

function placeholders(text: string) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

test("every language has a complete catalog with unchanged placeholders", () => {
  const expectedKeys = Object.keys(messages).sort();
  for (const [language, catalog] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), expectedKeys, `${language} catalog keys`);
    for (const [key, value] of Object.entries(catalog)) {
      assert.ok(value.trim(), `${language} missing ${key}`);
      assert.deepEqual(placeholders(value), placeholders(key), `${language}: ${key}`);
    }
  }
  for (const [key, row] of Object.entries(messages)) {
    for (const [language, value] of Object.entries(row)) {
      assert.deepEqual(placeholders(value), placeholders(key), `${language}: ${key}`);
    }
  }
});

test("every selectable language translates the UI and preserves merchant copy", () => {
  for (const { value: language, dir } of languageOptions) {
    assert.equal(direction(language), dir);
    assert.ok(new Intl.NumberFormat(localeFor(language)).format(12345.67));
    if (language !== "en") {
      assert.notEqual(translate(language, "Save changes"), "Save changes", language);
      assert.notEqual(localizeDefault(language, "Add a vehicle", "Add a vehicle"), "Add a vehicle", language);
    }
    assert.equal(translate(language, "A custom vehicle title"), "A custom vehicle title");
    assert.equal(translate(language, "constructor", { count: 1 }), "constructor");
    assert.equal(translate(language, "toString"), "toString");
    assert.equal(localizeDefault(language, "My showroom", "Showroom"), "My showroom");
    const translated = translate(language, "Showing {shown} of {total} vehicles", { shown: 3, total: 12 });
    assert.ok(translated.includes("3") && translated.includes("12"), language);
    assert.ok(!translated.includes("{"), language);
  }
  assert.equal(direction("he"), "rtl");
});
