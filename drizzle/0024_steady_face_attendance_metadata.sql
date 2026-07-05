ALTER TABLE "attendance"
ADD COLUMN "check_in_verification_method" varchar(30);--> statement-breakpoint
ALTER TABLE "attendance"
ADD COLUMN "check_in_face_image" text;
