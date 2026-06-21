CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"organization_type" varchar(50) NOT NULL,
	"industry" varchar(50) NOT NULL,
	"company_size" varchar(50) NOT NULL,
	"country" varchar(100) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"organization_email" varchar(255) NOT NULL,
	"organization_phone" varchar(50) NOT NULL,
	"website" varchar(255),
	"currency" varchar(50) NOT NULL,
	"working_days" text[] NOT NULL,
	"office_start_time" varchar(50) NOT NULL,
	"office_end_time" varchar(50) NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_id" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;