import { test, expect } from "@playwright/test";
test("dealer can create, publish and receive a consented vehicle inquiry", async ({
  page,
  request,
}) => {
  const unique = Date.now().toString();
  const dealerResponse = await request.post("/api/dealers", {
    data: {
      payload: {
        businessName: `Browser Motors ${unique}`,
        approvalState: "approved",
        email: "dealer@example.com",
        location: "Los Angeles, CA",
      },
    },
  });
  expect(dealerResponse.ok()).toBeTruthy();
  const dealer = (await dealerResponse.json()).data;
  await page.goto("/preview");
  await expect(
    page.getByRole("heading", { name: "Welcome to your showroom" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vehicles", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add vehicle", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add vehicle", exact: true }).click();
  await page.getByLabel("Listing title").fill("2024 Honda Civic Browser Test");
  await page.getByLabel("Make *", { exact: true }).fill("Honda");
  await page.getByLabel("Model *", { exact: true }).fill("Civic");
  await page.getByLabel("Vehicle category").selectOption("car");
  await page.getByLabel("Model year").selectOption("2024");
  await page.getByLabel("Condition", { exact: true }).selectOption("used");
  await page.getByLabel("Mileage unit", { exact: true }).selectOption("mi");
  await page.getByRole("button", { name: "02 Pricing" }).click();
  await page.getByLabel("Asking price").fill("26000");
  await page.getByRole("button", { name: "03 Specifications" }).click();
  await page.getByLabel("Body style", { exact: true }).selectOption("Sedan");
  await page.getByLabel("Transmission", { exact: true }).selectOption("Automatic");
  await page.getByLabel("Fuel", { exact: true }).selectOption("Petrol");
  await page.getByLabel("Doors", { exact: true }).selectOption("4");
  await page.getByLabel("Seats", { exact: true }).selectOption("5");
  await page.getByRole("button", { name: "05 Media" }).click();
  await page
    .getByLabel("Wix image URL")
    .fill(
      "https://static.wixstatic.com/media/11062b_2f97b87dcea2446fa48e9ad9c5457ae1~mv2.jpg",
    );
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "06 Seller" }).click();
  await page.getByLabel("Dealership", { exact: true }).selectOption(dealer._id);
  await page.getByLabel("Vehicle location").fill("Los Angeles, CA");
  await page.getByRole("button", { name: "07 Description & SEO" }).click();
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "Verified 2024 Honda Civic with a complete inspection report and one owner.",
    );
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await expect(page.getByText("Vehicle saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByText("Vehicle published", { exact: true }),
  ).toBeVisible();
  const vehicles = (
    await (await request.get(`/api/vehicles?search=Browser%20Test`)).json()
  ).data.items;
  const vehicle = vehicles[0];
  expect(vehicle.status).toBe("published");
  await page.goto(`/preview/storefront#car=${vehicle.slug}`);
  await expect(
    page.getByRole("heading", { name: "2024 Honda Civic Browser Test" }),
  ).toBeVisible();
  await page.getByLabel("Request type", { exact: true }).selectOption("inquiry");
  await page.getByLabel("Name", { exact: true }).fill("Browser Buyer");
  await page.getByLabel("Email", { exact: true }).fill("buyer@example.com");
  await page.getByLabel("I agree that the dealership").check();
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.getByText("Your request has been received.")).toBeVisible();
  await page.goto("/preview#Inquiries");
  await page.getByRole("button", { name: /Browser Buyer/ }).click();
  await expect(
    page.getByRole("heading", { name: "Browser Buyer", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Inquiry status").selectOption("contacted");
  await expect(
    page.getByText("Inquiry updated", { exact: true }),
  ).toBeVisible();
  const detail = await request.get(`/cars/${vehicle.slug}`);
  expect(detail.ok()).toBeTruthy();
  const html = await detail.text();
  expect(html).toContain("application/ld+json");
  expect(html).toContain('rel="canonical"');
  await request.post("/api/vehicles", {
    data: { action: "status", id: vehicle._id, status: "archived" },
  });
});
test("filters, CSV errors and mobile navigation work", async ({ page }) => {
  await page.goto("/preview#Vehicles");
  await page.getByLabel("Search vehicles").fill("Land Cruiser");
  await expect(
    page.getByRole("button", { name: /Toyota Land Cruiser/ }).first(),
  ).toBeVisible();
  await expect(page.getByText("Camry", { exact: false })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("button", { name: "Import / Export", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bring your inventory along" }),
  ).toBeVisible();
  const csv =
    "stockId,title,make,model,year,price\nCSV-BAD,Toyota Camry,Toyota,Camry,2022,-20";
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await expect(
    page.getByText("0 valid rows · 1 rows need attention"),
  ).toBeVisible();
});
