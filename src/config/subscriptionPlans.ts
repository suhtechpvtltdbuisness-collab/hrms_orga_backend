export type SubscriptionPlanType = "free_trial" | "starter_pack" | "premium";

export interface SubscriptionPlanConfig {
  planType: SubscriptionPlanType;
  name: string;
  description: string;
  priceInr: number;
  pricePerEmployeeInr: number;
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
    description: "7-day ORGA HRMS trial with up to 4 employees",
    priceInr: 0,
    pricePerEmployeeInr: 0,
    durationDays: 7,
    maxEmployees: 4,
    module: "hrms",
    organizationType: "startup",
  },
  starter_pack: {
    planType: "starter_pack",
    name: "Growth",
    description:
      "₹2,999/month flat — up to 20 employees (~₹150/employee at full capacity)",
    priceInr: 2999,
    pricePerEmployeeInr: 150,
    durationDays: 30,
    maxEmployees: 20,
    module: "hrms",
    organizationType: "sme",
  },
  premium: {
    planType: "premium",
    name: "Business",
    description:
      "₹4,999/month flat — up to 20 employees with full ORGA HRMS suite",
    priceInr: 4999,
    pricePerEmployeeInr: 250,
    durationDays: 30,
    maxEmployees: 20,
    module: "hrms",
    organizationType: "enterprise",
  },
};

export const getPlanConfig = (planType: string): SubscriptionPlanConfig | null => {
  if (planType in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[planType as SubscriptionPlanType];
  }
  return null;
};
