import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

export const getRazorpayInstance = (): Razorpay => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are not configured");
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayInstance;
};

export const getRazorpayKeyId = (): string => {
  if (!process.env.RAZORPAY_KEY_ID) {
    throw new Error("Razorpay key id is not configured");
  }
  return process.env.RAZORPAY_KEY_ID;
};

export const verifyRazorpayPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error("Razorpay credentials are not configured");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
};

export const verifyRazorpaySubscriptionSignature = (
  paymentId: string,
  subscriptionId: string,
  signature: string,
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error("Razorpay credentials are not configured");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  return expected === signature;
};

export const verifyRazorpayWebhookSignature = (
  rawBody: string,
  signature: string,
): boolean => {
  const secret =
    process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error("Razorpay webhook secret is not configured");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
};

export type RazorpayOrderEntity = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
};

export type RazorpayPaymentEntity = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
};

export const fetchRazorpayOrder = async (
  orderId: string,
): Promise<RazorpayOrderEntity> => {
  const razorpay = getRazorpayInstance();
  return (await razorpay.orders.fetch(orderId)) as RazorpayOrderEntity;
};

export const fetchRazorpayPayment = async (
  paymentId: string,
): Promise<RazorpayPaymentEntity> => {
  const razorpay = getRazorpayInstance();
  return (await razorpay.payments.fetch(paymentId)) as RazorpayPaymentEntity;
};
