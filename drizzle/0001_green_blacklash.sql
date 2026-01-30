ALTER TABLE "org_order" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "org_order" CASCADE;--> statement-breakpoint
ALTER TABLE "organization" RENAME TO "plain";--> statement-breakpoint
ALTER TABLE "org_payment" RENAME TO "plain_payment";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "plain_payment" ADD COLUMN "plain_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "plain_payment" ADD COLUMN "transaction_id" varchar(255);--> statement-breakpoint
ALTER TABLE "plain_payment" ADD COLUMN "payment_mode" "payment_mode" NOT NULL;--> statement-breakpoint
ALTER TABLE "plain" ADD COLUMN "user_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "plain" ADD COLUMN "price" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "plain_payment" ADD CONSTRAINT "plain_payment_plain_id_plain_id_fk" FOREIGN KEY ("plain_id") REFERENCES "public"."plain"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plain" ADD CONSTRAINT "plain_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plain_payment" DROP COLUMN "org_order_id";--> statement-breakpoint
ALTER TABLE "plain" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "organization_id";