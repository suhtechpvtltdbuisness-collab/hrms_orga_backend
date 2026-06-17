ALTER TABLE "plain" ADD COLUMN IF NOT EXISTS "razorpay_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "plain" ADD COLUMN IF NOT EXISTS "razorpay_plan_id" varchar(255);
