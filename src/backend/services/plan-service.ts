import { appInstances, billing } from "@wix/app-management";
import { auth } from "@wix/essentials";
import { plans, planKeys, type PlanKey } from "../../shared/plans";
import type { Context } from "../context";
import { AppError } from "../errors";
import wixConfig from "../../../wix.config.json";

type InstanceBilling = { packageName?: string | null } | null | undefined;

export async function currentPlanKey(ctx: Context): Promise<PlanKey> {
  return (await planStatus(ctx)).current;
}

/** The current plan, plus Wix's upgrade page while the site can still start its one free trial. */
export async function planStatus(ctx: Context) {
  const { instance } = await auth.elevate(appInstances.getAppInstance)();
  return {
    current: planForInstance(instance?.isFree, instance?.billing),
    // The link carries the app instance ID, so only site collaborators get it.
    trialUrl: ctx.subjectType === "USER" ? freeTrialUrl(instance) : null,
  };
}

type TrialInstance = {
  isFree?: boolean | null;
  freeTrialAvailable?: boolean | null;
  instanceId?: string | null;
} | null | undefined;

// Wix runs the trial itself; the app only links to its upgrade page, which offers it.
export function freeTrialUrl(instance: TrialInstance) {
  if (instance?.isFree === false || !instance?.freeTrialAvailable) return null;
  if (!instance.instanceId) return null;
  return `https://www.wix.com/apps/upgrade/${wixConfig.appId}?appInstanceId=${encodeURIComponent(instance.instanceId)}`;
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

export async function planCheckoutUrl(_ctx: Context, plan: PlanKey) {
  if (plan === "basic")
    throw new AppError("INVALID_PLAN", "Choose a paid plan to start a trial.", 400);
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
