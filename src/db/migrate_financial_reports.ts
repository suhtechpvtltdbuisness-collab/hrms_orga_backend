import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
    console.log("Creating financial reporting tables...");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const sqlPath = path.resolve(
      __dirname,
      "../../drizzle/0036_financial_reports.sql",
    );
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("Financial reporting tables ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
