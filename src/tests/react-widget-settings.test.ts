import assert from "node:assert/strict";
import { test } from "node:test";
import { styleKeys } from "../storefront/widget-style";
import { filterSettings } from "../storefront/filter-visibility";
import {
  appearanceData,
  appearanceFields,
  filterData,
  inventoryFilterVisibility,
  widgetAppearance,
} from "../extensions/site/components/widget-props";

test("React widgets expose and forward every existing appearance setting", () => {
  assert.equal(appearanceFields.length, styleKeys.length);
  const settings = widgetAppearance({
    accent: "#123456",
    headingFont: '{"font":"normal 600 24px Arial"}',
    vehicleMileageColor: "#112233",
  });
  assert.equal(settings.accent, "#123456");
  assert.equal(settings["heading-font"], '{"font":"normal 600 24px Arial"}');
  assert.equal(settings["vehicle-mileage-color"], "#112233");
  for (const [key, prop] of appearanceFields) {
    assert.equal(appearanceData[prop].dataType, "text");
    assert.ok(Object.hasOwn(settings, key));
  }
});
test("React inventory filter controls retain defaults and disable chosen filters", () => {
  const visibility = inventoryFilterVisibility({
    showMake: false,
    showMaxPrice: false,
    showSearch: true,
  });
  assert.equal(visibility.make, false);
  assert.equal(visibility.maxPrice, false);
  assert.equal(visibility.search, true);
  assert.equal(visibility.category, true);
  assert.equal(Object.keys(filterData).length, filterSettings.length);
});
