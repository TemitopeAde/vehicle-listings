import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanDescription } from "../backend/listing-html.ts";
import { descriptionText } from "../shared/rich-text.ts";

test("a vehicle description keeps editor formatting and drops scripts", () => {
  const clean = cleanDescription(
    '<p>This <strong>Civic</strong> is ready.</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">site</a>',
  );
  assert.equal(clean.includes("script"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.match(clean, /<strong>Civic<\/strong>/);
  assert.match(clean, /href="https:\/\/example.com"/);
  assert.equal(
    descriptionText("<p><br></p>"),
    "",
  );
  assert.equal(
    descriptionText("<p>A verified car with service history.</p>").length > 20,
    true,
  );
});
