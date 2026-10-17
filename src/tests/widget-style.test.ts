import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFont,
  selectedFonts,
  widgetStyleVariables,
} from "../storefront/widget-style";

test("preload list retains every selected font, deduplicates and removes reset selections", () => {
  const font = 'normal 600 20px/1.5 "Uploaded Font", sans-serif';
  const heading = "italic 700 32px/1.2 Georgia, serif";
  const settings = {
    "body-font": JSON.stringify({ font }),
    "price-font": JSON.stringify({ font }),
    "heading-font": JSON.stringify({ font: heading }),
  };
  assert.deepEqual(selectedFonts(settings), [font, heading]);
  assert.deepEqual(selectedFonts({ ...settings, "heading-font": "" }), [font]);
  assert.deepEqual(
    readFont(JSON.stringify({ font, textDecoration: "underline" })),
    { font, textDecoration: "underline" },
  );
  assert.deepEqual(
    widgetStyleVariables({
      "heading-font": JSON.stringify({ font: heading }),
      "heading-color": "#123456",
      "input-background": "#fefefe",
    }),
    {
      "--sf-input-bg": "#fefefe",
      "--sf-heading-font": heading,
      "--sf-heading-decoration": "none",
      "--sf-heading-color": "#123456",
    },
  );
});

test("individual element fonts are preloaded alongside shared fonts and released on reset", () => {
  const shared = "400 14px/1.5 Arial, sans-serif";
  const individual = "700 20px/1.5 Georgia, serif";
  const settings = {
    "body-font": JSON.stringify({ font: shared }),
    "filter-make-label-font": JSON.stringify({ font: individual }),
    "view-vehicle-font": JSON.stringify({ font: individual }),
  };
  assert.deepEqual(selectedFonts(settings), [shared, individual]);
  assert.deepEqual(
    selectedFonts({
      ...settings,
      "filter-make-label-font": "",
      "view-vehicle-font": "",
    }),
    [shared],
  );
});
