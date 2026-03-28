import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "./env";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __humanLayerPool?: Pool;
};

export const pool =
  globalForDb.__humanLayerPool ??
  new Pool({
    connectionString: env.DATABASE_URL
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__humanLayerPool = pool;
}

export const db = drizzle(pool, { schema });
