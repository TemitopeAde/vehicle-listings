import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultTheme, themeSchema } from "../shared/schemas";
import { translate } from "../shared/i18n";
import { direction, languageOptions } from "../shared/languages";
import { messages } from "../shared/i18n-messages";

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
  for (const key of Object.keys(messages)) {
    for (const language of ["es", "fr", "de", "pt", "ar"] as const) {
      assert.ok(messages[key]?.[language], `${language} missing ${key}`);
    }
  }
});
