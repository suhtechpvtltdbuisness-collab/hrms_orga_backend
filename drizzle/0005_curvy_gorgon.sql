ALTER TABLE "department" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "department" ADD COLUMN "admin_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;