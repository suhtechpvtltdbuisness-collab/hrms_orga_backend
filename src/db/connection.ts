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
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 15_000,
  // Neon resolves to IPv6 first on some machines; those routes often fail here.
  // @ts-expect-error pg Pool supports family
  family: 4,
});

export const db = drizzle(pool, { schema });
