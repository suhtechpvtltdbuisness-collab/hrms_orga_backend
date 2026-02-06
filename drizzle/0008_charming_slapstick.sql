ALTER TABLE "users" DROP COLUMN "marital_status";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marital_status" boolean NOT NULL DEFAULT false;