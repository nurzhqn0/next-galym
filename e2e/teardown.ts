import { Pool } from "pg";

// Remove the accounts (submissions cascade) and any news post the e2e run left behind.
export default async function teardown() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("delete from users where email like 'e2e-%@example.test'");
  await pool.query("delete from news where slug like 'e2e-%'");
  await pool.end();
}
