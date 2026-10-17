import { test, expect, type Page } from "@playwright/test";
import {
  filterSettings,
  primaryFilterCount,
} from "../../storefront/filter-visibility";

const selectLabels = new Set([
  "Make",
  "Min. year",
  "Body",
  "Sort",
  "Max. year",
]);
const checkboxLabels = new Set([
  "Category",
  "Fuel",
  "Condition",
  "Transmission",
]);
function field(page: Page, label: string) {
  if (checkboxLabels.has(label))
    return page.getByRole("group", { name: label, exact: true });
  return selectLabels.has(label)
    ? page.getByRole("combobox", { name: label, exact: true })
    : page.getByLabel(label, { exact: true });
}
async function expandFilterSections(page: Page) {
  const closed = page.locator(".sf-sidebar details:not([open]) > summary");
  while ((await closed.count()) > 0) await closed.first().click();
}

test("every filter can be hidden independently and restored", async ({
  page,
}) => {
  for (const [, label, attribute] of filterSettings) {
    await page.goto(`/preview/editor?${attribute}=false`);
    await expandFilterSections(page);
    await expect(field(page, label)).toHaveCount(0);
    for (const [, otherLabel, otherAttribute] of filterSettings) {
      if (otherAttribute !== attribute)
        await expect(field(page, otherLabel)).toHaveCount(1);
    }
    await page.reload();
    await expandFilterSections(page);
    await expect(field(page, label)).toHaveCount(0);
  }
  await page.goto("/preview/editor");
  await expandFilterSections(page);
  for (const [, label] of filterSettings)
    await expect(field(page, label)).toBeVisible();
});

test("empty filter groups disappear while inventory stays visible", async ({
  page,
}) => {
  const extraHidden = new URLSearchParams(
    filterSettings
      .slice(primaryFilterCount)
      .map(([, , attribute]) => [attribute, "false"]),
  );
  await page.goto(`/preview/editor?${extraHidden}`);
  await expect(page.getByText("More filters", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Search", { exact: true })).toBeVisible();

  const allHidden = new URLSearchParams(
    filterSettings.map(([, , attribute]) => [attribute, "false"]),
  );
  await page.goto(`/preview/editor?${allHidden}`);
  await expect(page.getByText("More filters", { exact: true })).toHaveCount(0);
  await expect(
    page.locator('.autohaus input:not([type="checkbox"]), .autohaus select'),
  ).toHaveCount(0);
  await expect(page.locator('[data-sf="card"]').first()).toBeVisible();
});
