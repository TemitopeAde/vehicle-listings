import { test, expect } from "@playwright/test";

test("inquiry email composer uses Quill, includes website branding and preserves its key after a failed response", async ({
  page,
}) => {
  const inquiry = {
    _id: "inquiry-ui",
    vehicleId: "vehicle-ui",
    dealerId: "dealer-ui",
    name: "Jane Buyer",
    email: "jane@example.com",
    phone: "",
    message: "Please contact me about this vehicle.",
    consent: true,
    kind: "inquiry",
    preferredDate: "",
    status: "new",
    notes: "",
    createdAt: "2026-10-10",
    updatedAt: "2026-10-10",
    confirmationEmailStatus: "queued",
    confirmationTransmissionId: "auto-email",
  };
  await page.route("**/api/inquiries?**", (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { items: [inquiry], total: 1, nextCursor: null },
      },
    }),
  );
  const requests: { html: string; idempotencyKey: string }[] = [];
  await page.route("**/api/inquiry-emails", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          success: true,
          data: {
            siteName: "Buyer Motors",
            enabled: true,
            replyTo: "team@example.com",
          },
        },
      });
    requests.push(route.request().postDataJSON());
    return route.fulfill(
      requests.length === 1
        ? {
            status: 502,
            json: {
              success: false,
              error: {
                code: "EMAIL_REQUEST_FAILED",
                message: "Email could not be queued. Try again.",
              },
            },
          }
        : {
            json: {
              success: true,
              data: { transmissionId: "email-ui", status: "ACCEPTED" },
            },
          },
    );
  });
  await page.goto("/preview#Inquiries");
  await page.getByRole("button", { name: /Jane Buyer/ }).click();
  await page.getByRole("button", { name: "Email buyer", exact: true }).click();
  await expect(
    page.getByText("Buyer Motors is automatically included", { exact: false }),
  ).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Email message" });
  await expect(editor).toBeVisible();
  await editor.fill("Thank you for your inquiry, Jane.");
  await page.locator(".ql-bold").click();
  await editor.press("End");
  await editor.press("Space");
  await editor.pressSequentially("Our team will contact you.");
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(
    page.getByText("Email could not be queued. Try again.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect(
    page.getByText("Email queued with Wix.", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]?.idempotencyKey).toBe(requests[1]?.idempotencyKey);
  expect(requests[1]?.html).toContain("<strong>");
  expect(requests[1]).not.toHaveProperty("email");
});
