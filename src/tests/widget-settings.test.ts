import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyWidgetPatch,
  widgetKeyInfo,
  widgetReader,
  widgetSettingsPatch,
  withWidgetValues,
} from "../shared/widget-settings";

const valid = (patch: Record<string, string>) =>
  widgetSettingsPatch("marketplace").safeParse(patch).success;

test("widget settings accept valid text, layout, filters, colours and fonts", () => {
  assert.ok(
    valid({
      "display-name": "Our cars",
      layout: "list",
      columns: "2",
      "show-fuel": "false",
      accent: "#196947",
      "text-color": "rgba(25, 105, 71, 0.8)",
      "heading-font": JSON.stringify({ font: "normal 30px serif", textDecoration: "" }),
    }),
  );
  assert.ok(valid({ "display-name": "" }), "an empty value unsets a key");
});

test("widget settings reject unknown keys and invalid values", () => {
  assert.equal(valid({ "not-a-setting": "x" }), false);
  assert.equal(valid({ accent: "green; background: url(x)" }), false);
  assert.equal(valid({ columns: "9" }), false);
  assert.equal(valid({ layout: "carousel" }), false);
  assert.equal(valid({ "show-fuel": "no" }), false);
  assert.equal(valid({ "display-name": "x".repeat(201) }), false);
  assert.equal(
    widgetSettingsPatch("add-vehicle").safeParse({ columns: "2" }).success,
    false,
    "each widget only takes its own settings",
  );
});

test("an empty value removes a stored setting", () => {
  assert.deepEqual(
    applyWidgetPatch({ "display-name": "Old", layout: "list" }, { "display-name": "" }),
    { layout: "list" },
  );
});

test("the shared record wins on the live site and the panel wins in the Editor", () => {
  const attributes: Record<string, string> = { "display-name": "From Editor" };
  const attribute = (name: string) => attributes[name] ?? null;
  const shared = { "display-name": "From Wix AI", layout: "list" };
  assert.equal(widgetReader(shared, false, attribute)("display-name"), "From Wix AI");
  assert.equal(widgetReader(shared, true, attribute)("display-name"), "From Editor");
  assert.equal(widgetReader(shared, true, attribute)("layout"), "list");
  assert.equal(widgetReader({}, false, attribute)("display-name"), "From Editor");
});

test("Harmony props get typed shared values", () => {
  const props = withWidgetValues(
    "marketplace",
    { title: "Editor", columns: 3, showFuel: true, textColor: "" },
    { "display-name": "Shared", columns: "2", "show-fuel": "false", "text-color": "#000000" },
  );
  assert.deepEqual(props, {
    title: "Shared",
    columns: 2,
    showFuel: false,
    textColor: "#000000",
  });
  assert.ok(widgetKeyInfo("details").every((key) => key.key !== "display-name"));
});
