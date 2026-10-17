import { test, expect } from "@playwright/test";

test("every dashboard endpoint returns JSON for reads, invalid writes and unsupported methods", async ({
  request,
}) => {
  const routes = [
    "analytics",
    "vehicles",
    "dealers",
    "inquiries",
    "inquiry-emails",
    "settings",
    "imports",
    "onboarding",
    "events",
  ];
  for (const route of routes) {
    const response = await request.get(`/api/${route}`);
    expect(response.headers()["content-type"]).toContain("application/json");
    const result = await response.json();
    expect(typeof result.success).toBe("boolean");
    expect(response.status()).toBe(
      ["imports", "onboarding", "events"].includes(route) ? 405 : 200,
    );
    const unsupported = await request.delete(`/api/${route}`);
    expect(unsupported.status()).toBe(405);
    expect((await unsupported.json()).error.code).toBe("METHOD_NOT_ALLOWED");
  }
  for (const [route, method] of [
    ["vehicles", "POST"],
    ["dealers", "POST"],
    ["inquiries", "POST"],
    ["inquiries", "PATCH"],
    ["inquiry-emails", "POST"],
    ["inquiry-emails", "PATCH"],
    ["settings", "PATCH"],
    ["imports", "POST"],
    ["onboarding", "POST"],
    ["events", "POST"],
  ]) {
    const response = await request.fetch(`/api/${route}`, {
      method,
      headers: { "Content-Type": "application/json" },
      data: Buffer.from("{"),
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
  }
});
