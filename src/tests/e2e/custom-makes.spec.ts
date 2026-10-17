import { test, expect } from "@playwright/test";

test("a dealer's custom make is reusable and filters public cars beyond the current page", async ({
  page,
  request,
}) => {
  const unique = Date.now();
  const dealerResponse = await request.post("/api/dealers", {
    data: {
      payload: {
        businessName: `Custom Makes ${unique}`,
        approvalState: "approved",
        email: "dealer@example.com",
      },
    },
  });
  expect(dealerResponse.ok()).toBeTruthy();
  const dealer = (await dealerResponse.json()).data;
  const create = async (make: string, stockId: string) => {
    const response = await request.post("/api/vehicles", {
      data: {
        action: "create",
        payload: {
          title: `${make} custom make test ${stockId}`,
          stockId,
          make,
          model: "Test model",
          year: 2026,
          price: 45000,
          dealerId: dealer._id,
          description: "Inspected vehicle with a complete service history.",
          media: [
            {
              url: "https://static.wixstatic.com/media/test.jpg",
              alt: "Vehicle",
            },
          ],
        },
      },
    });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).data;
  };
  const vehicle = await create("Toyota", `CUSTOM-${unique}`);
  await page.goto("/preview#Vehicles");
  await page
    .getByRole("button", { name: `Edit ${vehicle.title}`, exact: true })
    .click();
  await page.getByLabel("Make *", { exact: true }).selectOption("__custom__");
  await page
    .getByLabel("Custom make", { exact: true })
    .fill("Aurora Test Motors");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByText("Vehicle published", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to inventory", exact: true })
    .click();
  await page.getByRole("button", { name: "Add vehicle", exact: true }).click();
  await expect(
    page
      .getByLabel("Make *", { exact: true })
      .locator('option[value="Aurora Test Motors"]'),
  ).toHaveCount(1);

  const newer = await create("Toyota", `NEWER-${unique}`);
  expect(
    (
      await request.post("/api/vehicles", {
        data: { action: "status", id: newer._id, status: "published" },
      })
    ).ok(),
  ).toBeTruthy();
  await create("Private Motors", `PRIVATE-${unique}`);
  await page.goto("/preview/storefront?limit=1");
  await expect(
    page.getByRole("heading", { name: newer.title, exact: true }),
  ).toBeVisible();
  const make = page.getByRole("combobox", { name: "Make", exact: true });
  await expect(
    make.locator("option").filter({ hasText: /^Aurora Test Motors$/ }),
  ).toHaveCount(1);
  await expect(
    make.locator("option").filter({ hasText: /^Private Motors$/ }),
  ).toHaveCount(0);
  await make.selectOption("Aurora Test Motors");
  await expect(
    page.getByRole("heading", { name: vehicle.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: newer.title, exact: true }),
  ).toHaveCount(0);
});
