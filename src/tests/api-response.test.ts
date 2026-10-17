import assert from "node:assert/strict";
import { test } from "node:test";
import { readResult } from "../shared/api-response";
import { readJson, respond, AppError } from "../backend/errors";

test("API responses preserve successful data and structured errors", async () => {
  assert.deepEqual(
    await readResult(Response.json({ success: true, data: { items: [] } })),
    { items: [] },
  );
  assert.equal(
    await readResult(Response.json({ success: true, data: null })),
    null,
  );
  await assert.rejects(
    readResult(
      Response.json(
        { success: false, error: { message: "CMS access required." } },
        { status: 403 },
      ),
    ),
    /CMS access required/,
  );
});
test("empty, truncated, HTML and unexpected API responses report status without JSON exceptions", async () => {
  for (const body of [
    "",
    " ",
    "{",
    "<html>Server error</html>",
    "null",
    "[]",
    '{"success":"true"}',
    '{"success":true}',
  ]) {
    await assert.rejects(
      readResult(new Response(body, { status: 502 })),
      /HTTP 502/,
    );
  }
  await assert.rejects(
    readResult(new Response(null, { status: 204 })),
    /HTTP 204.*empty/,
  );
  await assert.rejects(
    readResult(new Response(null, { status: 401 })),
    /renew your session/,
  );
  await assert.rejects(
    readResult(new Response(null, { status: 403 })),
    /permissions/,
  );
  await assert.rejects(
    readResult(Response.json({ success: true, data: [] }, { status: 500 })),
    /HTTP 500/,
  );
});
test("server always emits a JSON envelope, including empty results and invalid request JSON", async () => {
  const empty = await respond(async () => undefined);
  assert.deepEqual(await empty.json(), { success: true, data: null });
  const invalid = await respond(() =>
    readJson(
      new Request("https://example.com/api/imports", {
        method: "POST",
        body: "{",
      }),
    ),
  );
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "INVALID_JSON");
  const forbidden = await respond(async () => {
    throw new AppError("FORBIDDEN", "Access required.", 403);
  });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get("Cache-Control"), "no-store");
});
