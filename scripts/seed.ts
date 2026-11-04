import { config } from "dotenv";
import { hash } from "@node-rs/argon2";
import { Pool } from "pg";

config({ path: ".env.local" });

const email = process.env.SUPERUSER_EMAIL?.trim().toLowerCase();
const password = process.env.SUPERUSER_PASSWORD;
if (!email || !password) throw new Error("Set SUPERUSER_EMAIL and SUPERUSER_PASSWORD");
if (password.length < 12) throw new Error("SUPERUSER_PASSWORD must be at least 12 characters");

const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL });

async function main() {
  const passwordHash = await hash(password!, { algorithm: 2 }); // argon2id
  // Idempotent: never overwrites an existing account's password or role.
  const res = await pool.query(
    `insert into users (email, password_hash, full_name, role)
     values ($1, $2, 'Superuser', 'superuser')
     on conflict (lower(email)) do nothing returning id`,
    [email, passwordHash],
  );
  console.log(res.rowCount ? `Created superuser ${email}` : `User ${email} already exists, left unchanged`);
}

main().finally(() => pool.end());
