import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 20_000,
  });
  // An idle client dropping must not crash the process.
  pool.on("error", (e) =>
    console.error("pg pool error", { code: (e as { code?: string }).code }),
  );

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
const bound = new Map<string | symbol, unknown>();
export const db = new Proxy({} as Db, {
  get(_t, prop) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop);
    if (typeof value !== "function") return value;
    let fn = bound.get(prop);
    if (!fn) bound.set(prop, (fn = value.bind(instance)));
    return fn;
  },
});
export { schema };
