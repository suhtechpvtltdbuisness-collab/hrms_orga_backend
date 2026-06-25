ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address_line" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "postal_code" varchar(20);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "send_invite" boolean DEFAULT true NOT NULL;

ALTER TABLE "employment" ADD COLUMN IF NOT EXISTS "designation_id" integer;

DO $$ BEGIN
 ALTER TABLE "employment"
 ADD CONSTRAINT "employment_designation_id_designation_id_fk"
 FOREIGN KEY ("designation_id") REFERENCES "public"."designation"("id")
 ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "file_name" varchar(255);
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "mime_type" varchar(100);
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "file_size" integer;

ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'INR' NOT NULL;
ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "bank_name" varchar(255);
ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "account_number" varchar(100);
ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "ifsc_code" varchar(50);
