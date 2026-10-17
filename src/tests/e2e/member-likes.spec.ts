import { test, expect } from "@playwright/test";

test("guest heart clicks show a login toast without saving the car", async ({
  page,
}) => {
  await page.goto("/preview/storefront");
  const heart = page.getByRole("button", { name: /^Save / }).first();
  await expect(heart).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("autohaus:saved-cars:v1"),
  );
  await heart.click();
  await expect(
    page.getByText("Please log in to like vehicles.", { exact: true }),
  ).toBeVisible();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(() => localStorage.getItem("autohaus:saved-cars:v1")),
  ).toBe(before);
  await heart.click();
  await expect(
    page.getByText("Please log in to like vehicles.", { exact: true }),
  ).toHaveCount(1);
});
