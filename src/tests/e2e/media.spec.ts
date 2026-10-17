import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Fakes the Wix Media TUS upload endpoints and media CDN; returns uploaded file names. */
async function mockUploads(page: Page) {
  const transfers: string[] = [];
  await page.route("https://upload.wixmp.com/**", async (route) => {
    const request = route.request();
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Location, Upload-Offset, Tus-Resumable",
      "Tus-Resumable": "1.0.0",
    };
    if (request.method() === "POST") {
      const metadata = Object.fromEntries(
        (request.headers()["upload-metadata"] ?? "").split(",").map((part) => {
          const [key, value] = part.trim().split(" ");
          return [key, Buffer.from(value ?? "", "base64").toString()];
        }),
      );
      expect(metadata.contentType).toMatch(/^(image|video)\//);
      transfers.push(metadata.filename);
      await route.fulfill({
        status: 201,
        headers: {
          ...headers,
          Location: `https://upload.wixmp.com/transfer/${encodeURIComponent(metadata.token)}`,
        },
      });
    } else if (request.method() === "PATCH") {
      expect(request.postDataBuffer()?.length).toBeGreaterThan(0);
      await route.fulfill({
        status: 204,
        headers: {
          ...headers,
          "Upload-Offset": String(request.postDataBuffer()?.length),
        },
      });
    } else if (request.method() === "PUT") {
      const token = decodeURIComponent(
        new URL(request.url()).pathname.split("/").pop() ?? "",
      );
      await route.fulfill({ headers, json: { file: { id: token } } });
    } else await route.fulfill({ status: 204, headers });
  });
  await page.route("https://static.wixstatic.com/media/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"><rect width="100" height="80" fill="green"/></svg>',
    }),
  );
  await page.route("https://video.wixstatic.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "video/mp4", body: "" }),
  );
  return transfers;
}

test("dropdowns preserve custom values; multiple photos and videos transfer using TUS and attach after processing", async ({
  page,
}) => {
  const transfers = await mockUploads(page);
  await page.goto("/preview");
  await page.evaluate(async () => {
    const path = "/src/tests/e2e/media-fixture.tsx";
    (await import(/* @vite-ignore */ path)).mount();
  });
  await page.getByLabel("Make *", { exact: true }).selectOption("Honda");
  await page.getByLabel("Make *", { exact: true }).selectOption("__custom__");
  await page.getByLabel("Custom make", { exact: true }).fill("Rare make");
  await page
    .getByRole("button", { name: "Specifications", exact: true })
    .click();
  await page.getByLabel("Doors", { exact: true }).selectOption("2");
  await page.getByLabel("Seats", { exact: true }).selectOption("5");
  await page.getByLabel("Drivetrain", { exact: true }).selectOption("AWD");
  await page.getByRole("button", { name: "Media", exact: true }).click();
  await page.getByLabel(/Upload photos/).setInputFiles([
    {
      name: "front.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("front-photo"),
    },
    {
      name: "back.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("back-photo"),
    },
  ]);
  await expect(page.getByLabel(/Image 2/)).toBeVisible();
  await expect(page.getByLabel(/Image 1 · Cover/)).toHaveValue("front");
  await page
    .getByRole("button", { name: "Move photo 2 up", exact: true })
    .click();
  await page.getByLabel(/Upload videos/).setInputFiles({
    name: "walkaround.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("video-content"),
  });
  await expect(
    page.getByRole("button", { name: "Save fixture" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Video 1 — title")).toBeVisible();
  await page.getByLabel("Video 1 — title").fill("Vehicle walkaround");
  await page.getByRole("button", { name: "Save fixture" }).click();
  const values = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("media-test-values") ?? "{}"),
  );
  expect(values.make).toBe("Rare make");
  expect(values.doors).toBe(2);
  expect(values.seats).toBe(5);
  expect(values.drivetrain).toBe("AWD");
  expect(values.media).toHaveLength(2);
  expect(values.media[0].fileId).toBe("image-back.jpg");
  expect(values.videos[0].title).toBe("Vehicle walkaround");
  expect(values.videos[0].url).toContain("video.wixstatic.com");
  expect(transfers).toEqual(["front.jpg", "back.jpg", "walkaround.mp4"]);
  await page.getByRole("button", { name: "Remove video 1" }).click();
  await expect(page.getByLabel("Video 1 — title")).toHaveCount(0);
  await page.getByLabel(/Upload photos/).setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("unsafe"),
  });
  await expect(page.getByRole("alert")).toContainText("Choose a JPG");
});

test("saved photos and videos reload on a public vehicle detail page", async ({
  page,
  request,
}) => {
  const dealerResponse = await request.post("/api/dealers", {
    data: {
      payload: { businessName: "Video Test Motors", approvalState: "approved" },
    },
  });
  expect(dealerResponse.ok()).toBeTruthy();
  const dealer = (await dealerResponse.json()).data;
  const vehicleResponse = await request.post("/api/vehicles", {
    data: {
      action: "create",
      payload: {
        title: "Video Test Toyota",
        stockId: `VIDEO-${Date.now()}`,
        make: "Toyota",
        model: "Camry",
        year: 2024,
        price: 20000000,
        description: "A verified vehicle with a detailed walkaround video.",
        dealerId: dealer._id,
        media: [
          { url: "https://static.wixstatic.com/media/front.jpg", alt: "Front" },
          { url: "https://static.wixstatic.com/media/back.jpg", alt: "Back" },
        ],
        videos: [
          {
            url: "https://video.wixstatic.com/video/walkaround/file.mp4",
            title: "Exterior walkaround",
            fileId: "walkaround",
          },
        ],
      },
    },
  });
  expect(vehicleResponse.ok()).toBeTruthy();
  const vehicle = (await vehicleResponse.json()).data;
  expect(
    (
      await request.post("/api/vehicles", {
        data: { action: "status", id: vehicle._id, status: "published" },
      })
    ).ok(),
  ).toBeTruthy();
  await page.route("https://static.wixstatic.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80"/>',
    }),
  );
  await page.route("https://video.wixstatic.com/**", (route) =>
    route.fulfill({ contentType: "video/mp4", body: "" }),
  );
  await page.goto(`/cars/${vehicle.slug}`);
  const player = page.getByLabel("Exterior walkaround", { exact: true });
  await expect(player).toHaveAttribute("controls", "");
  await expect(player).toHaveAttribute(
    "src",
    "https://video.wixstatic.com/video/walkaround/file.mp4",
  );
  await page.reload();
  await expect(player).toBeVisible();
  await expect(
    page.getByRole("button", { name: "View image 2: Back" }),
  ).toBeVisible();
});

test("photos dropped onto the drop zone upload and attach", async ({
  page,
}) => {
  const transfers = await mockUploads(page);
  await page.goto("/preview");
  await page.evaluate(async () => {
    const path = "/src/tests/e2e/media-fixture.tsx";
    (await import(/* @vite-ignore */ path)).mount();
  });
  await page.getByRole("button", { name: "Media", exact: true }).click();
  const zone = page.locator('label[for="upload-image"]');
  const files = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(
      new File(["drop-1"], "dropped-1.jpg", { type: "image/jpeg" }),
    );
    data.items.add(
      new File(["drop-2"], "dropped-2.png", { type: "image/png" }),
    );
    return data;
  });
  await zone.dispatchEvent("dragenter", { dataTransfer: files });
  await expect(zone).toContainText("Drop to upload");
  await zone.dispatchEvent("drop", { dataTransfer: files });
  await expect(page.getByLabel(/Image 2/)).toBeVisible();
  await expect(zone).toContainText("Drag photos here");
  await expect(page.getByLabel(/Image 2 —/)).toBeVisible();
  expect(transfers).toEqual(["dropped-1.jpg", "dropped-2.png"]);
});
