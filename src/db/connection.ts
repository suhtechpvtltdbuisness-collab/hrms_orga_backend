import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from "dotenv";
import * as schema from "./schema.js";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL as string,
});

export const db = drizzle(pool, { schema });
