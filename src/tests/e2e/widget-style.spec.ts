import { test, expect } from "@playwright/test";
import { filterTextSections } from "../../storefront/widget-style";

test("element font selections and colors override utilities without changing other text", async ({
  page,
}) => {
  const params = new URLSearchParams({
    "heading-font": JSON.stringify({
      font: 'italic 700 36px/1.2 "Courier New", monospace',
      textDecoration: "underline",
    }),
    "heading-color": "#123456",
    "price-color": "#654321",
    "card-background": "#fff1dd",
    "input-background": "#eafafa",
    "button-color": "#ffffaa",
    "button-background": "#112233",
  });
  await page.goto(`/preview/editor?${params}`);
  const heading = page.locator('[data-sf="heading"]');
  await expect(heading).toHaveCSS("font-family", '"Courier New", monospace');
  await expect(heading).toHaveCSS("font-size", "36px");
  await expect(heading).toHaveCSS("font-weight", "700");
  await expect(heading).toHaveCSS("font-style", "italic");
  await expect(heading).toHaveCSS("text-decoration-line", "underline");
  await expect(heading).toHaveCSS("color", "rgb(18, 52, 86)");
  await expect(page.locator('[data-sf="price"]').first()).toHaveCSS(
    "color",
    "rgb(101, 67, 33)",
  );
  await expect(page.locator('[data-sf="card"]').first()).toHaveCSS(
    "background-color",
    "rgb(255, 241, 221)",
  );
  await expect(page.getByLabel("Search", { exact: true })).toHaveCSS(
    "background-color",
    "rgb(234, 250, 250)",
  );
  await expect(page.locator('[data-sf="button"]').first()).toHaveCSS(
    "color",
    "rgb(255, 255, 170)",
  );
  await expect(page.locator('[data-sf="button"]').first()).toHaveCSS(
    "background-color",
    "rgb(17, 34, 51)",
  );
  await expect(page.locator('[data-sf="vehicle-title"]').first()).toHaveCSS(
    "font-size",
    "16px",
  );
  await page.reload();
  await expect(heading).toHaveCSS("font-family", '"Courier New", monospace');
});

test("every filter label and input has independent typography and color", async ({
  page,
}) => {
  const params = new URLSearchParams();
  for (const { sections } of filterTextSections) {
    for (const [key, , , parent] of sections) {
      params.set(
        `${key}-font`,
        JSON.stringify({
          font:
            parent === "label"
              ? "700 19px/1.5 Georgia, serif"
              : 'italic 400 16px/1.5 "Courier New", monospace',
        }),
      );
      params.set(`${key}-color`, parent === "label" ? "#123456" : "#654321");
    }
  }
  await page.goto(`/preview/editor?${params}`);
  const closed = page.locator(".sf-sidebar details:not([open]) > summary");
  while ((await closed.count()) > 0) await closed.first().click();
  for (const { sections } of filterTextSections) {
    for (const [key, , , parent] of sections) {
      const element = page.locator(`[data-sf-element="${key}"]`);
      await expect(element).toBeVisible();
      await expect(element).toHaveCSS(
        "font-family",
        parent === "label" ? "Georgia, serif" : '"Courier New", monospace',
      );
      await expect(element).toHaveCSS(
        "font-size",
        parent === "label" ? "19px" : "16px",
      );
      await expect(element).toHaveCSS(
        "color",
        parent === "label" ? "rgb(18, 52, 86)" : "rgb(101, 67, 33)",
      );
    }
  }
});

test("a label override leaves its input and neighboring filters unchanged and resets to shared styles", async ({
  page,
}) => {
  const params = new URLSearchParams({
    "label-font": JSON.stringify({ font: "400 14px/1.5 Arial, sans-serif" }),
    "label-color": "#112233",
    "filter-search-label-font": JSON.stringify({
      font: "700 22px/1.5 Georgia, serif",
    }),
    "filter-search-label-color": "#abcdef",
  });
  await page.goto(`/preview/editor?${params}`);
  const searchLabel = page.locator('[data-sf-element="filter-search-label"]');
  await expect(searchLabel).toHaveCSS("font-size", "22px");
  await expect(searchLabel).toHaveCSS("color", "rgb(171, 205, 239)");
  for (const key of [
    "filter-search-input",
    "filter-make-label",
    "filter-make-input",
  ]) {
    await expect(page.locator(`[data-sf-element="${key}"]`)).toHaveCSS(
      "font-size",
      "14px",
    );
    await expect(page.locator(`[data-sf-element="${key}"]`)).toHaveCSS(
      "color",
      "rgb(17, 34, 51)",
    );
  }
  params.delete("filter-search-label-font");
  params.delete("filter-search-label-color");
  await page.goto(`/preview/editor?${params}`);
  await expect(searchLabel).toHaveCSS("font-size", "14px");
  await expect(searchLabel).toHaveCSS("font-family", "Arial, sans-serif");
  await expect(searchLabel).toHaveCSS("color", "rgb(17, 34, 51)");
});

test("listing details, actions and pagination override shared styling independently", async ({
  page,
}) => {
  const params = new URLSearchParams({
    limit: "1",
    "vehicle-meta-font": JSON.stringify({
      font: "400 14px/1.5 Arial, sans-serif",
    }),
    "vehicle-meta-color": "#112233",
    "button-color": "#ffffaa",
    "vehicle-mileage-font": JSON.stringify({
      font: "700 20px/1.5 Georgia, serif",
    }),
    "vehicle-mileage-color": "#123456",
    "view-vehicle-font": JSON.stringify({
      font: "700 18px/1.5 Georgia, serif",
    }),
    "view-vehicle-color": "#abcdef",
    "compare-toggle-color": "#654321",
    "save-vehicle-color": "#246810",
    "results-count-color": "#135790",
    "previous-page-font": JSON.stringify({
      font: "400 15px/1.5 Georgia, serif",
    }),
    "previous-page-color": "#123456",
    "next-page-color": "#abcdef",
    "page-number-color": "#654321",
  });
  await page.goto(`/preview/editor?${params}`);
  await expect(page.locator('[data-sf-element="vehicle-mileage"]')).toHaveCSS(
    "font-size",
    "20px",
  );
  await expect(page.locator('[data-sf-element="vehicle-mileage"]')).toHaveCSS(
    "color",
    "rgb(18, 52, 86)",
  );
  await expect(page.locator('[data-sf-element="vehicle-fuel"]')).toHaveCSS(
    "font-size",
    "14px",
  );
  await expect(page.locator('[data-sf-element="vehicle-fuel"]')).toHaveCSS(
    "color",
    "rgb(17, 34, 51)",
  );
  await expect(page.locator('[data-sf-element="view-vehicle"]')).toHaveCSS(
    "font-size",
    "18px",
  );
  for (const [key, color] of [
    ["view-vehicle", "rgb(171, 205, 239)"],
    ["compare-toggle", "rgb(101, 67, 33)"],
    ["save-vehicle", "rgb(36, 104, 16)"],
    ["results-count", "rgb(19, 87, 144)"],
    ["previous-page", "rgb(18, 52, 86)"],
    ["next-page", "rgb(171, 205, 239)"],
    ["page-number", "rgb(101, 67, 33)"],
  ] as const)
    await expect(page.locator(`[data-sf-element="${key}"]`).first()).toHaveCSS(
      "color",
      color,
    );
  await page.reload();
  await expect(page.locator('[data-sf-element="view-vehicle"]')).toHaveCSS(
    "font-size",
    "18px",
  );
});

test("general font is inherited and individual fonts take precedence", async ({
  page,
}) => {
  const params = new URLSearchParams({
    "body-font": JSON.stringify({ font: "400 18px/1.5 Georgia, serif" }),
    "input-font": JSON.stringify({
      font: '600 15px/1.5 "Courier New", monospace',
    }),
    "vehicle-title-font": JSON.stringify({
      font: "700 22px/1.5 Arial, sans-serif",
    }),
  });
  await page.goto(`/preview/editor?${params}`);
  await expect(page.locator('[data-sf="description"]')).toHaveCSS(
    "font-family",
    "Georgia, serif",
  );
  await expect(page.getByLabel("Search", { exact: true })).toHaveCSS(
    "font-family",
    '"Courier New", monospace',
  );
  await expect(page.locator('[data-sf="vehicle-title"]').first()).toHaveCSS(
    "font-family",
    "Arial, sans-serif",
  );
  await expect(page.locator('[data-sf="vehicle-title"]').first()).toHaveCSS(
    "font-size",
    "22px",
  );
  await page.goto("/preview/editor");
  await expect(page.locator('[data-sf="heading"]')).toHaveCSS(
    "font-size",
    "30px",
  );
  await expect(page.locator('[data-sf="price"]').first()).toHaveCSS(
    "font-size",
    "20px",
  );
});
