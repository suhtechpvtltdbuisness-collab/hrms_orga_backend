import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_ADDONS,
  getAddonConfig,
  getPlanConfig,
  SubscriptionAddonType,
  SubscriptionPlanConfig,
  SubscriptionPlanType,
} from "../config/subscriptionPlans.js";
import { SubscriptionRepository } from "../repository/subscription.repo.js";
import {
  getRazorpayInstance,
  getRazorpayKeyId,
  verifyRazorpayPaymentSignature,
  verifyRazorpaySubscriptionSignature,
  verifyRazorpayWebhookSignature,
} from "../utils/razorpay.js";
import { Plain } from "../db/schema.js";

type ManagedPlanInput = {
  planType?: unknown;
  name?: unknown;
  description?: unknown;
  priceInr?: unknown;
  pricePerEmployeeInr?: unknown;
  durationDays?: unknown;
  maxEmployees?: unknown;
  module?: unknown;
  organizationType?: unknown;
  features?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

export class SubscriptionService {
  private repo: SubscriptionRepository;

  constructor() {
    this.repo = new SubscriptionRepository();
  }

  isPlanActive(plan: typeof Plain.$inferSelect | null): boolean {
    if (!plan || !plan.active) return false;
    if (!plan.expired) return true;
    return new Date(plan.expired) > new Date();
  }

  private async getRuntimePlanConfig(
    planType: string,
  ): Promise<(SubscriptionPlanConfig & { features: string[] }) | null> {
    const managed = await this.repo.getAnyPlanDefinitionByType(planType);
    if (managed) {
      if (managed.isDeleted || !managed.active) return null;
      return {
        planType: managed.planType,
        name: managed.name,
        description: managed.description,
        priceInr: managed.priceInr,
        pricePerEmployeeInr: managed.pricePerEmployeeInr,
        durationDays: managed.durationDays,
        maxEmployees: managed.maxEmployees,
        module: "hrms",
        organizationType: managed.organizationType as "startup" | "sme" | "enterprise",
        features: managed.features,
      };
    }
    const fallback = getPlanConfig(planType);
    return fallback ? { ...fallback, features: [] } : null;
  }

  private async getBasePlanMaxEmployees(plan: typeof Plain.$inferSelect | null) {
    if (!plan) {
      return 0;
    }

    const config = await this.getRuntimePlanConfig(plan.planType);
    return config?.maxEmployees ?? plan.maxEmployees ?? 0;
  }

  async enrichPlan(userId: number, plan: typeof Plain.$inferSelect | null) {
    const employeeCount = await this.repo.countEmployeesByAdminId(userId);
    const active = this.isPlanActive(plan);
    const maxEmployees = plan?.maxEmployees ?? 0;
    const config = plan ? await this.getRuntimePlanConfig(plan.planType) : null;
    const includedEmployees = await this.getBasePlanMaxEmployees(plan);
    const extraEmployeesPurchased = Math.max(maxEmployees - includedEmployees, 0);

    return {
      ...plan,
      employeeCount,
      includedEmployees,
      extraEmployeesPurchased,
      extraEmployeePriceInr:
        config?.pricePerEmployeeInr ?? SUBSCRIPTION_ADDONS.extra_employee.priceInr,
      features: config?.features ?? [],
      maxEmployees,
      seatsRemaining: Math.max(maxEmployees - employeeCount, 0),
      hasActivePlan: active,
      canPurchaseExtraEmployees: active,
      canAddEmployee: active && employeeCount < maxEmployees,
      isExpired: plan ? !active : true,
    };
  }

  async getPlans() {
    const managedPlans = await this.repo.getPlanDefinitions();
    return managedPlans.map((plan) => ({
      planType: plan.planType,
      name: plan.name,
      description: plan.description,
      priceInr: plan.priceInr,
      pricePerEmployeeInr: plan.pricePerEmployeeInr,
      durationDays: plan.durationDays,
      maxEmployees: plan.maxEmployees,
      module: plan.module,
      organizationType: plan.organizationType,
      features: "features" in plan ? plan.features : [],
      active: "active" in plan ? plan.active : true,
      extraEmployeePriceInr: SUBSCRIPTION_ADDONS.extra_employee.priceInr,
      customFeaturePriceInr: SUBSCRIPTION_ADDONS.custom_feature.priceInr,
      billingModel:
        plan.priceInr > 0
          ? `flat_${plan.priceInr}_inr_up_to_${plan.maxEmployees}_employees`
          : "trial",
    }));
  }

  async getManagedPlans() {
    const plans = await this.repo.getPlanDefinitions(true);
    return Promise.all(
      plans.map(async (plan) => ({
        ...plan,
        subscriptionCount: await this.repo.countSubscriptionsByPlanType(plan.planType),
      })),
    );
  }

  private normalizeManagedPlan(input: ManagedPlanInput, partial = false) {
    const result: Record<string, unknown> = {};
    const requireText = (key: keyof ManagedPlanInput, label: string) => {
      if (input[key] === undefined && partial) return;
      if (typeof input[key] !== "string" || !input[key]!.toString().trim()) {
        throw new Error(`${label} is required`);
      }
      result[key] = input[key]!.toString().trim();
    };
    const requireNumber = (key: keyof ManagedPlanInput, label: string, minimum: number) => {
      if (input[key] === undefined && partial) return;
      const value = Number(input[key]);
      if (!Number.isInteger(value) || value < minimum) {
        throw new Error(`${label} must be an integer of at least ${minimum}`);
      }
      result[key] = value;
    };

    requireText("name", "Plan name");
    requireText("description", "Description");
    requireNumber("priceInr", "Price", 0);
    requireNumber("pricePerEmployeeInr", "Per-employee price", 0);
    requireNumber("durationDays", "Duration", 1);
    requireNumber("maxEmployees", "Employee limit", 1);
    requireNumber("sortOrder", "Sort order", 0);

    if (!partial || input.planType !== undefined) {
      const planType = String(input.planType ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (!planType) throw new Error("Plan key is required");
      result.planType = planType;
    }
    if (!partial || input.module !== undefined) result.module = String(input.module || "hrms").trim();
    if (!partial || input.organizationType !== undefined) {
      const organizationType = String(input.organizationType || "sme");
      if (!["startup", "sme", "enterprise"].includes(organizationType)) {
        throw new Error("Organization type must be startup, sme, or enterprise");
      }
      result.organizationType = organizationType;
    }
    if (!partial || input.features !== undefined) {
      if (!Array.isArray(input.features)) throw new Error("Features must be an array");
      result.features = [...new Set(input.features.map((item) => String(item).trim()).filter(Boolean))];
    }
    if (!partial || input.active !== undefined) result.active = input.active !== false;
    return result;
  }

  async createManagedPlan(input: ManagedPlanInput, superAdminId: number) {
    const data = this.normalizeManagedPlan(input);
    if (await this.repo.getAnyPlanDefinitionByType(String(data.planType))) {
      throw new Error("A plan with this key already exists");
    }
    return this.repo.createPlanDefinition({
      ...(data as any),
      createdBy: superAdminId,
      isDeleted: false,
    });
  }

  async updateManagedPlan(id: number, input: ManagedPlanInput) {
    if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid plan ID");
    const existingPlans = await this.repo.getPlanDefinitions(true);
    const existing = existingPlans.find((plan) => plan.id === id);
    if (!existing) throw new Error("Plan not found");
    const data = this.normalizeManagedPlan(input, true);
    if (data.planType) {
      if (data.planType !== existing.planType) {
        throw new Error("Plan key cannot be changed after creation");
      }
      delete data.planType;
    }
    if (data.priceInr !== undefined || data.name !== undefined || data.description !== undefined) {
      data.razorpayPlanId = null;
    }
    const plan = await this.repo.updatePlanDefinition(id, data as any);
    if (!plan) throw new Error("Plan not found");
    if (data.maxEmployees !== undefined) {
      await this.repo.adjustSubscriptionEmployeeLimits(
        existing.planType,
        Number(data.maxEmployees) - existing.maxEmployees,
      );
    }
    return plan;
  }

  async deleteManagedPlan(id: number) {
    if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid plan ID");
    const plan = await this.repo.deletePlanDefinition(id);
    if (!plan) throw new Error("Plan not found");
    return plan;
  }

  async resolveSubscriptionOwner(userId: number) {
    const organizationAdminId =
      await this.repo.getAdminIdByEmployeeUserId(userId);

    if (organizationAdminId) {
      return {
        ownerId: organizationAdminId,
        organizationAdminId,
      };
    }

    return {
      ownerId: userId,
      organizationAdminId: null as number | null,
    };
  }

  async getCurrentSubscription(userId: number) {
    const { ownerId, organizationAdminId } =
      await this.resolveSubscriptionOwner(userId);
    const plan = await this.repo.getActivePlanByUserId(ownerId);

    if (organizationAdminId) {
      const admin = await this.repo.getAdminBasicDetails(organizationAdminId);
      return {
        planType: plan?.planType ?? null,
        expired: plan?.expired ?? null,
        adminName: admin?.name ?? null,
      };
    }

    return this.enrichPlan(ownerId, plan);
  }

  async getSubscriptionSummary(userId: number) {
    const { ownerId, organizationAdminId } =
      await this.resolveSubscriptionOwner(userId);
    const plan = await this.repo.getActivePlanByUserId(ownerId);
    const isSubscribed = this.isPlanActive(plan);

    if (organizationAdminId) {
      const admin = await this.repo.getAdminBasicDetails(organizationAdminId);
      return {
        isSubscribed,
        planType: plan?.planType ?? null,
        expired: plan?.expired ?? null,
        adminName: admin?.name ?? null,
      };
    }

    const enrichedPlan = plan ? await this.enrichPlan(ownerId, plan) : null;
    return {
      isSubscribed,
      plan: enrichedPlan,
    };
  }

  async assertCanAddEmployee(adminId: number) {
    const plan = await this.repo.getActivePlanByUserId(adminId);

    if (!this.isPlanActive(plan)) {
      const error = new Error(
        "Your subscription is inactive or expired. Please upgrade your plan.",
      ) as Error & { statusCode?: number; code?: string };
      error.statusCode = 403;
      error.code = "SUBSCRIPTION_INACTIVE";
      throw error;
    }

    const employeeCount = await this.repo.countEmployeesByAdminId(adminId);

    if (employeeCount >= (plan?.maxEmployees ?? 0)) {
      const error = new Error(
        `You have reached your plan limit. You can only have ${plan?.maxEmployees} users. If you want to add more users you have to purchase an additional seat.`,
      ) as Error & {
        statusCode?: number;
        code?: string;
        details?: Record<string, number>;
      };
      error.statusCode = 409;
      error.code = "EMPLOYEE_LIMIT_REACHED";
      error.details = {
        employeeCount,
        maxEmployees: plan?.maxEmployees ?? 0,
        extraEmployeePriceInr:
          (await this.getRuntimePlanConfig(plan!.planType))?.pricePerEmployeeInr ??
          SUBSCRIPTION_ADDONS.extra_employee.priceInr,
      };
      throw error;
    }
  }

  async getOrCreateRazorpayStarterPlan(): Promise<string> {
    const managedStarter = await this.repo.getAnyPlanDefinitionByType("starter_pack");
    if (managedStarter?.razorpayPlanId && managedStarter.active && !managedStarter.isDeleted) {
      return managedStarter.razorpayPlanId;
    }
    if (!managedStarter && process.env.RAZORPAY_STARTER_PLAN_ID) {
      return process.env.RAZORPAY_STARTER_PLAN_ID;
    }

    const starterConfig = await this.getRuntimePlanConfig("starter_pack");
    if (!starterConfig) throw new Error("Starter plan is not available");
    const razorpay = getRazorpayInstance();

    const plan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: starterConfig.name,
        amount: starterConfig.priceInr * 100,
        currency: "INR",
        description: starterConfig.description,
      },
    });

    if (managedStarter) {
      await this.repo.updatePlanDefinition(managedStarter.id, { razorpayPlanId: plan.id });
    }

    return plan.id;
  }

  private async activateTrialInDb(
    userId: number,
    razorpaySubscriptionId: string,
    razorpayPlanId: string,
  ) {
    const trialConfig = await this.getRuntimePlanConfig("free_trial");
    if (!trialConfig) throw new Error("Free trial plan is not available");
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + trialConfig.durationDays);

    const existing = await this.repo.getActivePlanByUserId(userId);
    const planData = {
      planType: trialConfig.planType as "free_trial",
      maxEmployees: trialConfig.maxEmployees,
      price: trialConfig.priceInr,
      type: trialConfig.organizationType,
      module: trialConfig.module,
      active: true,
      expired: expiry.toISOString(),
      purchaseDate: new Date().toISOString(),
      razorpaySubscriptionId,
      razorpayPlanId,
    };

    if (existing) {
      const updated = await this.repo.updatePlan(existing.id, planData);
      const plan = await this.enrichPlan(userId, updated);
      return { isSubscribed: true, plan };
    }

    const created = await this.repo.createPlan({
      userId,
      ...planData,
      isDeleted: false,
    });

    const plan = await this.enrichPlan(userId, created);
    return { isSubscribed: true, plan };
  }

  private async upgradeToStarterPack(
    userId: number,
    razorpaySubscriptionId: string,
    paymentId?: string,
  ) {
    const starterConfig = await this.getRuntimePlanConfig("starter_pack");
    if (!starterConfig) throw new Error("Starter plan is not available");
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + starterConfig.durationDays);

    const existing = await this.repo.getActivePlanByUserId(userId);
    const planData = {
      planType: starterConfig.planType as "starter_pack",
      maxEmployees: starterConfig.maxEmployees,
      price: starterConfig.priceInr,
      type: starterConfig.organizationType,
      module: starterConfig.module,
      active: true,
      expired: expiry.toISOString(),
      purchaseDate: new Date().toISOString(),
      razorpaySubscriptionId,
    };

    let plan;
    if (existing) {
      plan = await this.repo.updatePlan(existing.id, planData);
    } else {
      plan = await this.repo.createPlan({
        userId,
        ...planData,
        isDeleted: false,
      });
    }

    if (paymentId) {
      await this.repo.createPayment({
        plainId: plan.id,
        status: "paid",
        transactionId: razorpaySubscriptionId,
        paymentMode: "online",
        totalAmount: String(starterConfig.priceInr),
        paymentId,
      });
    }

    return this.enrichPlan(userId, plan);
  }

  async createTrialSubscription(userId: number, userEmail: string) {
    const existing = await this.repo.getActivePlanByUserId(userId);

    if (existing && this.isPlanActive(existing)) {
      throw new Error("You already have an active subscription");
    }

    const trialConfig = await this.getRuntimePlanConfig("free_trial");
    const starterConfig = await this.getRuntimePlanConfig("starter_pack");
    if (!trialConfig || !starterConfig) throw new Error("Trial or starter plan is not available");
    const razorpay = getRazorpayInstance();
    const planId = await this.getOrCreateRazorpayStarterPlan();

    const startAt =
      Math.floor(Date.now() / 1000) + trialConfig.durationDays * 24 * 60 * 60;

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      start_at: startAt,
      notify_info: {
        notify_email: userEmail,
      },
      notes: {
        userId: String(userId),
        planType: "free_trial",
      },
    });

    return {
      keyId: getRazorpayKeyId(),
      subscriptionId: subscription.id,
      planName: trialConfig.name,
      trialDays: trialConfig.durationDays,
      autoPayAmount: starterConfig.priceInr,
      autoPayCurrency: "INR",
    };
  }

  async verifyTrialSubscription(
    userId: number,
    razorpayPaymentId: string,
    razorpaySubscriptionId: string,
    razorpaySignature: string,
  ) {
    const isValid = verifyRazorpaySubscriptionSignature(
      razorpayPaymentId,
      razorpaySubscriptionId,
      razorpaySignature,
    );

    if (!isValid) {
      throw new Error("Subscription verification failed");
    }

    const razorpay = getRazorpayInstance();
    const rzSubscription = (await razorpay.subscriptions.fetch(
      razorpaySubscriptionId,
    )) as { status?: string; plan_id?: string };

    const validStatuses = ["authenticated", "active", "created"];
    if (!rzSubscription.status || !validStatuses.includes(rzSubscription.status)) {
      throw new Error(
        `Subscription is not authorized. Status: ${rzSubscription.status}`,
      );
    }

    return this.activateTrialInDb(
      userId,
      razorpaySubscriptionId,
      rzSubscription.plan_id || "",
    );
  }

  async handleRazorpayWebhook(rawBody: string, signature: string) {
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      throw new Error("Invalid webhook signature");
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload: {
        subscription?: { entity: { id: string; notes?: { userId?: string } } };
        payment?: { entity: { id: string } };
      };
    };

    const subscriptionId = event.payload.subscription?.entity.id;
    if (!subscriptionId) {
      return { handled: false };
    }

    const plan = await this.repo.getPlanByRazorpaySubscriptionId(subscriptionId);
    if (!plan) {
      return { handled: false };
    }

    const paymentId = event.payload.payment?.entity.id;

    if (event.event === "subscription.charged") {
      await this.upgradeToStarterPack(
        plan.userId,
        subscriptionId,
        paymentId,
      );
      return { handled: true, event: event.event };
    }

    if (
      event.event === "subscription.cancelled" ||
      event.event === "subscription.halted"
    ) {
      await this.repo.updatePlan(plan.id, { active: false });
      return { handled: true, event: event.event };
    }

    return { handled: true, event: event.event };
  }

  async createPaymentOrder(userId: number, planType: SubscriptionPlanType) {
    const config = await this.getRuntimePlanConfig(planType);

    if (!config) {
      throw new Error("Invalid subscription plan");
    }

    if (config.priceInr <= 0) {
      throw new Error("This plan does not require payment");
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = config.priceInr * 100;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        planType: config.planType,
      },
    });

    return {
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      planType: config.planType,
      planName: config.name,
    };
  }

  async createAddonOrder(
    userId: number,
    itemType: SubscriptionAddonType,
    quantity: number = 1,
  ) {
    const config = getAddonConfig(itemType);

    if (!config) {
      throw new Error("Invalid add-on type");
    }

    const activePlan = await this.repo.getActivePlanByUserId(userId);
    if (!this.isPlanActive(activePlan)) {
      throw new Error(
        "Please activate a base subscription before purchasing add-ons.",
      );
    }

    const normalizedQuantity =
      itemType === "extra_employee" ? Math.max(1, Math.floor(quantity || 1)) : 1;
    const planConfig = await this.getRuntimePlanConfig(activePlan!.planType);
    const unitPriceInr = itemType === "extra_employee"
      ? (planConfig?.pricePerEmployeeInr ?? config.priceInr)
      : config.priceInr;
    const amountInPaise = unitPriceInr * normalizedQuantity * 100;
    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `addon_${itemType}_${userId}_${Date.now()}`,
      notes: {
        userId: String(userId),
        itemType,
        quantity: String(normalizedQuantity),
      },
    });

    return {
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      itemType,
      quantity: normalizedQuantity,
      planName: config.name,
      unitPriceInr,
    };
  }

  async verifyAndActivatePlan(
    userId: number,
    planType: SubscriptionPlanType,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const config = await this.getRuntimePlanConfig(planType);

    if (!config) {
      throw new Error("Invalid subscription plan");
    }

    const isValid = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValid) {
      throw new Error("Payment verification failed");
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + config.durationDays);

    const existing = await this.repo.getActivePlanByUserId(userId);
    let plan;

    if (existing) {
      plan = await this.repo.updatePlan(existing.id, {
        planType: config.planType,
        maxEmployees: config.maxEmployees,
        price: config.priceInr,
        type: config.organizationType,
        module: config.module,
        active: true,
        expired: expiry.toISOString(),
        purchaseDate: new Date().toISOString(),
      });
    } else {
      plan = await this.repo.createPlan({
        userId,
        planType: config.planType,
        maxEmployees: config.maxEmployees,
        price: config.priceInr,
        type: config.organizationType,
        module: config.module,
        active: true,
        isDeleted: false,
        expired: expiry.toISOString(),
        purchaseDate: new Date().toISOString(),
      });
    }

    await this.repo.createPayment({
      plainId: plan.id,
      status: "paid",
      transactionId: razorpayOrderId,
      paymentMode: "online",
      totalAmount: String(config.priceInr),
      paymentId: razorpayPaymentId,
    });

    const enrichedPlan = await this.enrichPlan(userId, plan);
    return { isSubscribed: true, plan: enrichedPlan };
  }

  async verifyAddonPayment(
    userId: number,
    itemType: SubscriptionAddonType,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    quantity: number = 1,
  ) {
    const config = getAddonConfig(itemType);

    if (!config) {
      throw new Error("Invalid add-on type");
    }

    const isValid = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    if (!isValid) {
      throw new Error("Payment verification failed");
    }

    const activePlan = await this.repo.getActivePlanByUserId(userId);
    if (!activePlan || !this.isPlanActive(activePlan)) {
      throw new Error(
        "Please activate a base subscription before purchasing add-ons.",
      );
    }

    const normalizedQuantity =
      itemType === "extra_employee" ? Math.max(1, Math.floor(quantity || 1)) : 1;
    const planConfig = await this.getRuntimePlanConfig(activePlan.planType);
    const unitPriceInr = itemType === "extra_employee"
      ? (planConfig?.pricePerEmployeeInr ?? config.priceInr)
      : config.priceInr;

    let updatedPlan = activePlan;
    if (itemType === "extra_employee") {
      updatedPlan = await this.repo.updatePlan(activePlan.id, {
        maxEmployees: (activePlan.maxEmployees ?? 0) + normalizedQuantity,
      });
    }

    await this.repo.createPayment({
      plainId: updatedPlan.id,
      status: "paid",
      transactionId: `${itemType}:${razorpayOrderId}`,
      paymentMode: "online",
      totalAmount: String(unitPriceInr * normalizedQuantity),
      paymentId: razorpayPaymentId,
    });

    const plan = await this.enrichPlan(userId, updatedPlan);

    return {
      itemType,
      quantity: normalizedQuantity,
      plan,
      message:
        itemType === "extra_employee"
          ? `${normalizedQuantity} extra employee seat${normalizedQuantity > 1 ? "s were" : " was"} added successfully.`
          : "Custom feature payment recorded successfully.",
    };
  }

  async getAllSubscriptions(page: number = 1, limit: number = 10, search?: string) {
    const [{ data: rawPlans, total }, definitions] = await Promise.all([
      this.repo.getAllSubscriptionsWithUsers(page, limit, search),
      this.repo.getAllPlanDefinitionRecords(),
    ]);
    const planNames = new Map(definitions.map((definition) => [definition.planType, definition.name]));
    
    const formattedData = rawPlans.map(({ plan, user }) => {
      const active = plan.active;
      const expired = plan.expired ? new Date(plan.expired) : null;
      const now = new Date();
      
      let status: "Active" | "Past Due" | "Canceled" = "Active";
      if (!active) {
        status = "Canceled";
      } else if (expired && expired < now) {
        status = "Past Due";
      }

      // Format next billing date
      let nextBilling = "-";
      if (expired && status !== "Canceled") {
        nextBilling = expired.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }

      // Format plan name
      const planName = planNames.get(plan.planType) ?? plan.planType.replace(/_/g, " ");

      // Billing frequency
      const billing = plan.planType === "free_trial" ? "Trial" : "Monthly";

      return {
        id: `SUB-${1000 + plan.id}`,
        orgName: user.name,
        plan: planName,
        status,
        billing,
        nextBilling,
        amount: `₹${Number(plan.price).toLocaleString("en-IN")}`,
        dbPlanId: plan.id,
      };
    });

    return {
      subscriptions: formattedData,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    };
  }
}

export const subscriptionService = new SubscriptionService();
