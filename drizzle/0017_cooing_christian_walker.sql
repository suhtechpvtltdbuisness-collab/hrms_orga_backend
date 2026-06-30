ALTER TABLE "compensatory_leave_request" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_block" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_encashment_request" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_holiday" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_period" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_policy" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_policy_assignment" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_type_config" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "compensatory_leave_request" ADD CONSTRAINT "compensatory_leave_request_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_block" ADD CONSTRAINT "leave_block_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_encashment_request" ADD CONSTRAINT "leave_encashment_request_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_holiday" ADD CONSTRAINT "leave_holiday_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_period" ADD CONSTRAINT "leave_period_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policy" ADD CONSTRAINT "leave_policy_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policy_assignment" ADD CONSTRAINT "leave_policy_assignment_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_type_config" ADD CONSTRAINT "leave_type_config_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;