import { Pool } from "pg";

// Remove the accounts the e2e run created (submissions cascade).
export default async function teardown() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("delete from users where email like 'e2e-%@example.test'");
  await pool.end();
}
