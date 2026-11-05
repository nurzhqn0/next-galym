import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  attachDatabasePool(pool);
  return pool;
}

type Db = ReturnType<typeof createDb>;

function createDb() {
  const pool = globalForDb.pgPool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;
  return drizzle(pool, { schema });
}

// Lazy: the pool is created on first query, so `next build` works without DATABASE_URL.
let instance: Db | undefined;
export const db = new Proxy({} as Db, {
  get(_t, prop) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
export { schema };
