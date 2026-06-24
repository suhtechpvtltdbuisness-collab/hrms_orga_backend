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
    console.log("Starting department table schema migration...");

    // 1. Drop old columns if they exist
    console.log("Dropping old columns...");
    await client.query(`
      ALTER TABLE "department" DROP COLUMN IF EXISTS "name" CASCADE;
      ALTER TABLE "department" DROP COLUMN IF EXISTS "code" CASCADE;
      ALTER TABLE "department" DROP COLUMN IF EXISTS "head" CASCADE;
      ALTER TABLE "department" DROP COLUMN IF EXISTS "location" CASCADE;
      ALTER TABLE "department" DROP COLUMN IF EXISTS "parent_id" CASCADE;
      ALTER TABLE "department" DROP COLUMN IF EXISTS "admin_id" CASCADE;
    `);

    // 2. Add new columns
    console.log("Adding new columns...");
    await client.query(`
      ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "organization_id" integer REFERENCES "organizations"("id") ON DELETE SET NULL;
      ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "department_name" varchar(100);
      ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "department_code" varchar(50);
      ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "manager_id" integer REFERENCES "employee"("user_id") ON DELETE SET NULL;
      ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'Active' NOT NULL;
      ALTER TABLE "department" ADD COLUMN IF NOT EXISTS "employee_count" integer DEFAULT 0 NOT NULL;
    `);

    // 3. Make name and code NOT NULL (handling existing rows if any, but since we dropped name/code columns we can just set NOT NULL)
    await client.query(`
      ALTER TABLE "department" ALTER COLUMN "department_name" SET NOT NULL;
      ALTER TABLE "department" ALTER COLUMN "department_code" SET NOT NULL;
    `);

    // 4. Add unique constraints
    console.log("Adding unique constraints...");
    await client.query(`
      ALTER TABLE "department" DROP CONSTRAINT IF EXISTS "department_organization_id_department_name_unique";
      ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_department_name_unique" UNIQUE("organization_id", "department_name");

      ALTER TABLE "department" DROP CONSTRAINT IF EXISTS "department_organization_id_department_code_unique";
      ALTER TABLE "department" ADD CONSTRAINT "department_organization_id_department_code_unique" UNIQUE("organization_id", "department_code");
    `);

    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
