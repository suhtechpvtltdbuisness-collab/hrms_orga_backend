import {
  SUBSCRIPTION_PLANS,
  getPlanConfig,
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

  async enrichPlan(userId: number, plan: typeof Plain.$inferSelect | null) {
    const employeeCount = await this.repo.countEmployeesByAdminId(userId);
    const active = this.isPlanActive(plan);
    const maxEmployees = plan?.maxEmployees ?? 0;

    return {
      ...plan,
      employeeCount,
      maxEmployees,
      canAddEmployee: active && employeeCount < maxEmployees,
      isExpired: plan ? !active : true,
    };
  }

  async getPlans() {
    return Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
      planType: plan.planType,
      name: plan.name,
      description: plan.description,
      priceInr: plan.priceInr,
      pricePerEmployeeInr: plan.pricePerEmployeeInr,
      durationDays: plan.durationDays,
      maxEmployees: plan.maxEmployees,
      module: plan.module,
      billingModel:
        plan.priceInr > 0
          ? `flat_${plan.priceInr}_inr_up_to_${plan.maxEmployees}_employees`
          : "trial",
    }));
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
      throw new Error(
        "Your subscription is inactive or expired. Please upgrade your plan.",
      );
    }

    const employeeCount = await this.repo.countEmployeesByAdminId(adminId);

    if (employeeCount >= (plan?.maxEmployees ?? 0)) {
      throw new Error(
        `Employee limit reached (${plan?.maxEmployees}). Upgrade your plan to add more employees.`,
      );
    }
  }

  async getOrCreateRazorpayStarterPlan(): Promise<string> {
    if (process.env.RAZORPAY_STARTER_PLAN_ID) {
      return process.env.RAZORPAY_STARTER_PLAN_ID;
    }

    const starterConfig = SUBSCRIPTION_PLANS.starter_pack;
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

    return plan.id;
  }

  private async activateTrialInDb(
    userId: number,
    razorpaySubscriptionId: string,
    razorpayPlanId: string,
  ) {
    const trialConfig = SUBSCRIPTION_PLANS.free_trial;
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
    const starterConfig = SUBSCRIPTION_PLANS.starter_pack;
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

    const trialConfig = SUBSCRIPTION_PLANS.free_trial;
    const starterConfig = SUBSCRIPTION_PLANS.starter_pack;
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
    const config = getPlanConfig(planType);

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

  async verifyAndActivatePlan(
    userId: number,
    planType: SubscriptionPlanType,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const config = getPlanConfig(planType);

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

  async getAllSubscriptions(page: number = 1, limit: number = 10, search?: string) {
    const { data: rawPlans, total } = await this.repo.getAllSubscriptionsWithUsers(page, limit, search);
    
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
      let planName = "Free Trial";
      if (plan.planType === "starter_pack") {
        planName = "Growth";
      } else if (plan.planType === "premium") {
        planName = "Business";
      } else if (plan.planType === "enterprise") {
        planName = "Enterprise";
      }

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
