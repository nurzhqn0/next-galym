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
  pool.on("error", (e) => console.error("pg pool error", { code: (e as { code?: string }).code }));
  // TEMP timing: remove after measuring.
  pool.on("connect", () => console.log("[db] opened a new connection"));
  const query = pool.query.bind(pool) as (...a: unknown[]) => Promise<unknown>;
  pool.query = (async (...args: unknown[]) => {
    const t = performance.now();
    try {
      return await query(...args);
    } finally {
      const first = args[0] as string | { text: string };
      const text = typeof first === "string" ? first : first.text;
      console.log(`[db] ${Math.round(performance.now() - t)}ms  ${text.replace(/\s+/g, " ").slice(0, 70)}`);
    }
  }) as unknown as typeof pool.query;
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
