export type SubscriptionPlanType = string;

export type SubscriptionAddonType = "extra_employee" | "custom_feature";

export interface SubscriptionPlanConfig {
  planType: SubscriptionPlanType;
  name: string;
  description: string;
  priceInr: number;
  pricePerEmployeeInr: number;
  priceUsd: number;
  pricePerEmployeeUsd: number;
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
  priceUsd: number;
}

const STARTER_FEATURES = [
  "Full employee management",
  "Leave & attendance",
  "Up to 10 employees",
  "Payroll basics",
  "$1 per employee",
];

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanConfig> = {
  free_trial: {
    planType: "free_trial",
    name: "Free Trial",
    description:
      "1-month ORGA HRMS trial with the same limits as Starter — $1 per employee, up to 10 employees. Converts to Starter when the trial ends.",
    priceInr: 0,
    pricePerEmployeeInr: 0,
    priceUsd: 0,
    pricePerEmployeeUsd: 1,
    durationDays: 30,
    maxEmployees: 10,
    module: "hrms",
    organizationType: "startup",
  },
  starter_pack: {
    planType: "starter_pack",
    name: "Starter",
    description: "$1 per employee / month — up to 10 employees",
    priceInr: 510,
    pricePerEmployeeInr: 51,
    priceUsd: 10,
    pricePerEmployeeUsd: 1,
    durationDays: 30,
    maxEmployees: 10,
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
    priceUsd: 19,
    pricePerEmployeeUsd: 1,
    durationDays: 30,
    maxEmployees: 16,
    module: "hrms",
    organizationType: "enterprise",
  },
  enterprise: {
    planType: "enterprise",
    name: "Enterprise",
    description: "₹799/month flat — up to 26 employees for larger HRMS teams",
    priceInr: 799,
    pricePerEmployeeInr: 51,
    priceUsd: 39,
    pricePerEmployeeUsd: 1,
    durationDays: 30,
    maxEmployees: 26,
    module: "hrms",
    organizationType: "enterprise",
  },
};

export const SUBSCRIPTION_PLAN_FEATURES: Record<string, string[]> = {
  free_trial: STARTER_FEATURES,
  starter_pack: STARTER_FEATURES,
  premium: [
    "Everything in Starter",
    "Advanced HR workflows",
    "Up to 16 employees",
    "Extra employees at $1/seat",
  ],
  enterprise: [
    "Everything in Growth",
    "Up to 26 employees",
    "Extra employees at $1/seat",
  ],
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
    priceUsd: 1,
  },
  custom_feature: {
    itemType: "custom_feature",
    name: "Custom Feature",
    description: "Request a custom feature or instance enhancement for your setup",
    priceInr: 2500,
    priceUsd: 30,
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
