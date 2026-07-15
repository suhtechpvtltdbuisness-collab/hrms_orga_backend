import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Creating Sales CRM tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "sales_record" (
        "id" serial PRIMARY KEY,
        "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
        "record_type" varchar(20) NOT NULL,
        "name" varchar(255) NOT NULL,
        "company" varchar(255),
        "status" varchar(50) DEFAULT 'New' NOT NULL,
        "owner" varchar(255),
        "value" numeric(14,2) DEFAULT 0 NOT NULL,
        "health" integer DEFAULT 50 NOT NULL,
        "source" varchar(100),
        "next_action" varchar(255),
        "follow_up_at" timestamp,
        "notes" text,
        "is_deleted" boolean DEFAULT false NOT NULL,
        "created_by" integer REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "sales_activity" (
        "id" serial PRIMARY KEY,
        "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
        "description" varchar(500) NOT NULL,
        "created_by" integer REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "sales_knowledge" (
        "id" serial PRIMARY KEY,
        "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
        "title" varchar(255) NOT NULL,
        "category" varchar(100) DEFAULT 'Services' NOT NULL,
        "owner" varchar(255),
        "content" text,
        "views" integer DEFAULT 0 NOT NULL,
        "confidence" integer DEFAULT 90 NOT NULL,
        "is_deleted" boolean DEFAULT false NOT NULL,
        "created_by" integer REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "sales_product" (
        "id" serial PRIMARY KEY,
        "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
        "name" varchar(255) NOT NULL,
        "category" varchar(100) DEFAULT 'Subscription' NOT NULL,
        "status" varchar(20) DEFAULT 'Active' NOT NULL,
        "team" varchar(100),
        "price_label" varchar(100),
        "note" varchar(255),
        "is_deleted" boolean DEFAULT false NOT NULL,
        "created_by" integer REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "sales_document" (
        "id" serial PRIMARY KEY,
        "organization_id" integer NOT NULL REFERENCES "organizations"("id"),
        "doc_type" varchar(50) NOT NULL,
        "title" varchar(255) NOT NULL,
        "client_name" varchar(255),
        "status" varchar(50) DEFAULT 'Draft' NOT NULL,
        "owner" varchar(255),
        "amount" numeric(14,2),
        "notes" text,
        "is_deleted" boolean DEFAULT false NOT NULL,
        "created_by" integer REFERENCES "users"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "sales_record_org_type_idx" ON "sales_record" ("organization_id", "record_type");
      CREATE INDEX IF NOT EXISTS "sales_activity_org_idx" ON "sales_activity" ("organization_id");
      CREATE INDEX IF NOT EXISTS "sales_knowledge_org_idx" ON "sales_knowledge" ("organization_id");
      CREATE INDEX IF NOT EXISTS "sales_product_org_idx" ON "sales_product" ("organization_id");
      CREATE INDEX IF NOT EXISTS "sales_document_org_type_idx" ON "sales_document" ("organization_id", "doc_type");
    `);

    console.log("Sales CRM tables created successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
