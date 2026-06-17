import { Request, Response } from "express";
import { subscriptionService } from "../services/subscriptionServices.js";
import { SubscriptionPlanType } from "../config/subscriptionPlans.js";

export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  try {
    const plans = await subscriptionService.getPlans();
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch plans",
    });
  }
};

export const getCurrentSubscription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const subscription = await subscriptionService.getCurrentSubscription(
      req.user.userId,
    );

    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch subscription",
    });
  }
};

export const createTrialSubscription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const checkout = await subscriptionService.createTrialSubscription(
      req.user.userId,
      req.user.email,
    );

    res.status(200).json({
      success: true,
      message: "Complete card authorization to start your free trial",
      data: checkout,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create trial subscription",
    });
  }
};

export const verifyTrialSubscription = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const {
      razorpayPaymentId,
      razorpaySubscriptionId,
      razorpaySignature,
    } = req.body;

    if (!razorpayPaymentId || !razorpaySubscriptionId || !razorpaySignature) {
      res.status(400).json({
        success: false,
        message: "Razorpay subscription payment details are required",
      });
      return;
    }

    const subscription = await subscriptionService.verifyTrialSubscription(
      req.user.userId,
      razorpayPaymentId,
      razorpaySubscriptionId,
      razorpaySignature,
    );

    res.status(200).json({
      success: true,
      message: "Free trial activated. Auto-pay enabled after trial period.",
      data: { subscription },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Trial subscription verification failed",
    });
  }
};

export const createPaymentOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { planType } = req.body;

    if (!planType) {
      res.status(400).json({ success: false, message: "planType is required" });
      return;
    }

    const order = await subscriptionService.createPaymentOrder(
      req.user.userId,
      planType as SubscriptionPlanType,
    );

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create payment order",
    });
  }
};

export const verifyPayment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const {
      planType,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (
      !planType ||
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature
    ) {
      res.status(400).json({
        success: false,
        message: "planType and Razorpay payment details are required",
      });
      return;
    }

    const subscription = await subscriptionService.verifyAndActivatePlan(
      req.user.userId,
      planType as SubscriptionPlanType,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );

    res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated",
      data: { subscription },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Payment verification failed",
    });
  }
};

export const handleRazorpayWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      res.status(400).json({ success: false, message: "Missing signature" });
      return;
    }

    const rawBody =
      typeof req.body === "string"
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString("utf8")
          : JSON.stringify(req.body);

    const result = await subscriptionService.handleRazorpayWebhook(
      rawBody,
      signature,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    res.status(400).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Webhook processing failed",
    });
  }
};
