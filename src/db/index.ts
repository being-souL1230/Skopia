import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ override: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlPoolUrl?: string;
};

if (
  globalForDb.__arenaNextJsPostgresqlPool &&
  globalForDb.__arenaNextJsPostgresqlPoolUrl !== databaseUrl
) {
  globalForDb.__arenaNextJsPostgresqlPool.end().catch(() => {});
  globalForDb.__arenaNextJsPostgresqlPool = undefined;
}

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
  globalForDb.__arenaNextJsPostgresqlPoolUrl = databaseUrl;
}

export const db = drizzle(pool);

