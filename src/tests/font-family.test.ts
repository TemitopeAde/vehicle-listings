import { test } from "node:test";
import assert from "node:assert/strict";
import { fontFamilyName } from "../storefront/font-family";

test("panel font labels show the selected family without CSS sizing or fallbacks", () => {
  for (const [font, family] of [
    ['italic 700 36px/1.2 "Courier New", monospace', "Courier New"],
    ["normal normal 400 14px/1.5 system-ui", "system-ui"],
    ["400 18px / 24px Georgia, serif", "Georgia"],
    ["bold 1.5rem Arial, sans-serif", "Arial"],
    ["italic large/normal 'Open Sans', sans-serif", "Open Sans"],
    ['600 18px "Custom, Uploaded Font", sans-serif', "Custom, Uploaded Font"],
    ["Trebuchet MS, sans-serif", "Trebuchet MS"],
  ] as const)
    assert.equal(fontFamilyName(font), family);
});
