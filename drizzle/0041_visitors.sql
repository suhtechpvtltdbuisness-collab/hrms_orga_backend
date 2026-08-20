DO $$ BEGIN
  CREATE TYPE "public"."identity_status" AS ENUM('anonymous', 'company_identified', 'person_identified', 'authenticated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "visitors" (
  "id" serial PRIMARY KEY NOT NULL,
  "visitor_id" varchar(128) NOT NULL,
  "known_user_id" integer,
  "first_seen_at" timestamp DEFAULT now() NOT NULL,
  "last_seen_at" timestamp DEFAULT now() NOT NULL,
  "first_page" text,
  "last_page" text,
  "first_referrer" text,
  "last_referrer" text,
  "utm_source" varchar(256),
  "utm_medium" varchar(256),
  "utm_campaign" varchar(256),
  "utm_term" varchar(256),
  "utm_content" varchar(256),
  "ip_address" varchar(64),
  "country" varchar(128),
  "region" varchar(128),
  "city" varchar(128),
  "company_name" varchar(256),
  "company_domain" varchar(256),
  "person_name" varchar(256),
  "work_email" varchar(256),
  "phone" varchar(64),
  "job_title" varchar(256),
  "linkedin_url" text,
  "identity_status" "identity_status" DEFAULT 'anonymous' NOT NULL,
  "identity_provider" varchar(64),
  "match_confidence" double precision,
  "lead_score" integer DEFAULT 0 NOT NULL,
  "page_view_count" integer DEFAULT 0 NOT NULL,
  "session_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "visitors_visitor_id_unique" UNIQUE("visitor_id")
);

CREATE TABLE IF NOT EXISTS "visitor_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "visitor_id" varchar(128) NOT NULL,
  "session_id" varchar(128) NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "last_activity_at" timestamp DEFAULT now() NOT NULL,
  "ended_at" timestamp,
  "landing_page" text,
  "exit_page" text,
  "referrer" text,
  "duration_seconds" integer,
  "device" varchar(64),
  "browser" varchar(64),
  "os" varchar(64),
  CONSTRAINT "visitor_sessions_session_id_unique" UNIQUE("session_id")
);

CREATE TABLE IF NOT EXISTS "visitor_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "visitor_id" varchar(128) NOT NULL,
  "session_id" varchar(128) NOT NULL,
  "event_name" varchar(128) NOT NULL,
  "page_url" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "visitors"
    ADD CONSTRAINT "visitors_known_user_id_users_id_fk"
    FOREIGN KEY ("known_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "visitor_sessions"
    ADD CONSTRAINT "visitor_sessions_visitor_id_visitors_visitor_id_fk"
    FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("visitor_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "visitors_visitor_id_idx" ON "visitors" ("visitor_id");
CREATE INDEX IF NOT EXISTS "visitors_known_user_id_idx" ON "visitors" ("known_user_id");
CREATE INDEX IF NOT EXISTS "visitors_work_email_idx" ON "visitors" ("work_email");
CREATE INDEX IF NOT EXISTS "visitors_company_domain_idx" ON "visitors" ("company_domain");
CREATE INDEX IF NOT EXISTS "visitors_last_seen_at_idx" ON "visitors" ("last_seen_at");
CREATE INDEX IF NOT EXISTS "visitors_created_at_idx" ON "visitors" ("created_at");
CREATE INDEX IF NOT EXISTS "visitor_events_visitor_id_idx" ON "visitor_events" ("visitor_id");
CREATE INDEX IF NOT EXISTS "visitor_events_session_id_idx" ON "visitor_events" ("session_id");
CREATE INDEX IF NOT EXISTS "visitor_sessions_visitor_id_idx" ON "visitor_sessions" ("visitor_id");
CREATE INDEX IF NOT EXISTS "visitor_sessions_session_id_idx" ON "visitor_sessions" ("session_id");
