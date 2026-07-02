export type SubscriptionPlanType = string;

export type SubscriptionAddonType = "extra_employee" | "custom_feature";

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

export interface SubscriptionAddonConfig {
  itemType: SubscriptionAddonType;
  name: string;
  description: string;
  priceInr: number;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig> = {
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
    name: "Starter",
    description:
      "₹299/month flat — up to 6 employees for small teams getting started",
    priceInr: 299,
    pricePerEmployeeInr: 51,
    durationDays: 30,
    maxEmployees: 6,
    module: "hrms",
    organizationType: "sme",
  },
  premium: {
    planType: "premium",
    name: "Growth",
    description:
      "₹499/month flat — up to 16 employees with the full HRMS workflow",
    priceInr: 499,
    pricePerEmployeeInr: 51,
    durationDays: 30,
    maxEmployees: 16,
    module: "hrms",
    organizationType: "enterprise",
  },
  enterprise: {
    planType: "enterprise",
    name: "Enterprise",
    description:
      "₹799/month flat — up to 26 employees for larger HRMS teams",
    priceInr: 799,
    pricePerEmployeeInr: 51,
    durationDays: 30,
    maxEmployees: 26,
    module: "hrms",
    organizationType: "enterprise",
  },
};

export const SUBSCRIPTION_ADDONS: Record<
  SubscriptionAddonType,
  SubscriptionAddonConfig
> = {
  extra_employee: {
    itemType: "extra_employee",
    name: "Extra Employee Seat",
    description: "Add one extra employee seat beyond your current plan limit",
    priceInr: 51,
  },
  custom_feature: {
    itemType: "custom_feature",
    name: "Custom Feature",
    description: "Request a custom feature or instance enhancement for your setup",
    priceInr: 2500,
  },
};

export const getPlanConfig = (planType: string): SubscriptionPlanConfig | null => {
  if (planType in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[planType as SubscriptionPlanType];
  }
  return null;
};

export const getAddonConfig = (
  itemType: string,
): SubscriptionAddonConfig | null => {
  if (itemType in SUBSCRIPTION_ADDONS) {
    return SUBSCRIPTION_ADDONS[itemType as SubscriptionAddonType];
  }
  return null;
};
