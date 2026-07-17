import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Applying Sales CRM PRD migration...");

    await client.query(`
      ALTER TABLE "sales_record"
        ADD COLUMN IF NOT EXISTS "conversion_status" varchar(30),
        ADD COLUMN IF NOT EXISTS "converted_at" timestamp,
        ADD COLUMN IF NOT EXISTS "close_lost_at" timestamp,
        ADD COLUMN IF NOT EXISTS "won_at" timestamp,
        ADD COLUMN IF NOT EXISTS "activated_at" timestamp,
        ADD COLUMN IF NOT EXISTS "churned_at" timestamp,
        ADD COLUMN IF NOT EXISTS "source_lead_id" integer,
        ADD COLUMN IF NOT EXISTS "source_opportunity_id" integer,
        ADD COLUMN IF NOT EXISTS "linked_opportunity_id" integer,
        ADD COLUMN IF NOT EXISTS "loss_reason" varchar(100),
        ADD COLUMN IF NOT EXISTS "ai_lead_score" integer,
        ADD COLUMN IF NOT EXISTS "is_read_only" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "client_lifecycle" varchar(30),
        ADD COLUMN IF NOT EXISTS "renewal_status" varchar(30),
        ADD COLUMN IF NOT EXISTS "client_source" varchar(20);
    `);

    await client.query(`
      ALTER TABLE "sales_activity"
        ADD COLUMN IF NOT EXISTS "record_id" integer;
    `);

    await client.query(`
      ALTER TABLE "sales_document"
        ADD COLUMN IF NOT EXISTS "opportunity_id" integer;
    `);

    // Normalize legacy deal records → opportunity
    await client.query(`
      UPDATE "sales_record"
      SET "record_type" = 'opportunity'
      WHERE "record_type" = 'deal' AND "is_deleted" = false;
    `);

    // Normalize legacy Won/Lost → Closed Won / Closed Lost
    await client.query(`
      UPDATE "sales_record"
      SET "status" = 'Closed Won'
      WHERE "record_type" = 'opportunity' AND "status" = 'Won';
    `);
    await client.query(`
      UPDATE "sales_record"
      SET "status" = 'Closed Lost'
      WHERE "record_type" = 'opportunity' AND "status" = 'Lost';
    `);

    // Default lead conversion status
    await client.query(`
      UPDATE "sales_record"
      SET "conversion_status" = 'Not Converted'
      WHERE "record_type" = 'lead' AND "conversion_status" IS NULL;
    `);

    // Map legacy client statuses to PRD renewal + lifecycle
    await client.query(`
      UPDATE "sales_record"
      SET
        "client_lifecycle" = COALESCE("client_lifecycle", 'Active'),
        "renewal_status" = CASE
          WHEN "renewal_status" IS NOT NULL THEN "renewal_status"
          WHEN "status" = 'At Risk' THEN 'At Risk'
          WHEN "status" = 'Renewal Due' THEN 'Renewal Due'
          WHEN "status" IN ('Closed', 'Churned') THEN 'Churned'
          ELSE 'On Track'
        END,
        "client_source" = COALESCE("client_source", 'direct')
      WHERE "record_type" = 'client';
    `);

    console.log("Sales CRM PRD migration completed!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
