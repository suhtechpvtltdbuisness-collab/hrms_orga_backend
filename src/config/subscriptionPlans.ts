export type SubscriptionPlanType = "free_trial" | "starter_pack";

export interface SubscriptionPlanConfig {
  planType: SubscriptionPlanType;
  name: string;
  description: string;
  priceInr: number;
  durationDays: number;
  maxEmployees: number;
  module: "hrms";
  organizationType: "startup" | "sme" | "enterprise";
}

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanType,
  SubscriptionPlanConfig
> = {
  free_trial: {
    planType: "free_trial",
    name: "Free Trial",
    description: "7-day trial with up to 4 employees",
    priceInr: 0,
    durationDays: 7,
    maxEmployees: 4,
    module: "hrms",
    organizationType: "startup",
  },
  starter_pack: {
    planType: "starter_pack",
    name: "Starter Pack",
    description: "Full HRMS access for growing teams",
    priceInr: 999,
    durationDays: 30,
    maxEmployees: 25,
    module: "hrms",
    organizationType: "startup",
  },
};

export const getPlanConfig = (planType: string): SubscriptionPlanConfig | null => {
  if (planType in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[planType as SubscriptionPlanType];
  }
  return null;
};
