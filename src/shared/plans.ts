// Plan catalog shared by the backend quota checks and the dashboard Billing page.
// `appPlanId` is the plan ID set in the app dashboard (basic, pro, business).
export const planKeys = ["basic", "pro", "business"] as const;
export type PlanKey = (typeof planKeys)[number];
export type PlanDefinition = {
  name: string;
  price: string;
  /** Maximum non-deleted, non-demo vehicles. `null` means unlimited. */
  vehicleLimit: number | null;
  appPlanId: string;
  features: string[];
};
export const plans: Record<PlanKey, PlanDefinition> = {
  basic: {
    name: "Basic",
    price: "$0",
    vehicleLimit: 1,
    appPlanId: "basic",
    features: ["Create 1 vehicle", "Site marketplace widget"],
  },
  pro: {
    name: "Pro",
    price: "$6.50 / month",
    vehicleLimit: 50,
    appPlanId: "pro",
    features: ["Up to 50 vehicles", "Import & export", "Expanded analytics"],
  },
  business: {
    name: "Business",
    price: "$12 / month",
    vehicleLimit: null,
    appPlanId: "business",
    features: [
      "Unlimited vehicles",
      "Multiple dealerships",
      "Seller self-service",
    ],
  },
};
export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (planKeys as readonly string[]).includes(value);
}
