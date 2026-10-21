import { appInstances, billing } from "@wix/app-management";
import { auth } from "@wix/essentials";
import { plans, planKeys, type PlanKey } from "../../shared/plans";
import type { Context } from "../context";
import { AppError } from "../errors";

type InstanceBilling = { packageName?: string | null } | null | undefined;

// Local demo sites are not billed, so they stay unrestricted.
export async function currentPlanKey(ctx: Context): Promise<PlanKey> {
  if (ctx.demo) return "business";
  const { instance } = await auth.elevate(appInstances.getAppInstance)();
  return planForInstance(instance?.isFree, instance?.billing);
}

// Wix reports the purchased plan in `billing.packageName`. A paid instance that matches no
// configured plan falls back to Basic, so an unknown plan never grants unlimited inventory.
export function planForInstance(
  isFree: boolean | null | undefined,
  instanceBilling: InstanceBilling,
): PlanKey {
  if (isFree !== false) return "basic";
  const packageName = instanceBilling?.packageName?.trim();
  if (!packageName) return "basic";
  const match = planKeys.find(
    (key) =>
      plans[key].appPlanId === packageName ||
      plans[key].name.toLowerCase() === packageName.toLowerCase(),
  );
  return match ?? "basic";
}

export function vehicleLimit(plan: PlanKey): number | null {
  return plans[plan].vehicleLimit;
}

export async function planCheckoutUrl(ctx: Context, plan: PlanKey) {
  if (plan === "basic")
    throw new AppError("INVALID_PLAN", "Choose a paid plan to start a trial.", 400);
  if (ctx.demo)
    throw new AppError("UNAVAILABLE", "Checkout is not available on demo sites.", 409);
  const productId = plans[plan].appPlanId;
  if (!productId)
    throw new AppError(
      "UNAVAILABLE",
      `The ${plans[plan].name} plan is not set up for purchase yet.`,
      409,
    );
  const { checkoutUrl } = await auth.elevate(billing.getUrl)(productId);
  return { checkoutUrl };
}
