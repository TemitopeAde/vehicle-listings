import { test } from "node:test";
import assert from "node:assert/strict";
import { planForInstance, vehicleLimit } from "../backend/services/plan-service";
import { plans } from "../shared/plans";

test("a free install is Basic", () => {
  assert.equal(planForInstance(true, null), "basic");
  assert.equal(planForInstance(undefined, undefined), "basic");
});

test("a paid install without a matching plan falls back to Basic", () => {
  assert.equal(planForInstance(false, { packageName: "Unknown plan" }), "basic");
  assert.equal(planForInstance(false, null), "basic");
});

test("a paid install maps its billing package to a plan name", () => {
  assert.equal(planForInstance(false, { packageName: "pro" }), "pro");
  assert.equal(planForInstance(false, { packageName: "Business" }), "business");
});

test("a paid install maps its billing package to a plan GUID", () => {
  const original = plans.pro.appPlanId;
  plans.pro.appPlanId = "plan-guid-pro";
  try {
    assert.equal(planForInstance(false, { packageName: "plan-guid-pro" }), "pro");
  } finally {
    plans.pro.appPlanId = original;
  }
});

test("vehicle limits: Basic 1, Pro 50, Business unlimited", () => {
  assert.equal(vehicleLimit("basic"), 1);
  assert.equal(vehicleLimit("pro"), 50);
  assert.equal(vehicleLimit("business"), null);
});
