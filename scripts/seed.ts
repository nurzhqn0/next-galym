import { config } from "dotenv";
import { hash } from "@node-rs/argon2";
import { Pool } from "pg";
import { parseSheetId } from "../lib/sheet-url";

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
  await seedForm();
}

// The Internships sheet. Created once; after that the form is edited through the admin API,
// so an existing form is never touched. Public columns are listed here because a column the
// admin has not marked public stays private after a sync.
const PUBLIC = ["Name", "Location", "Coverage", "Duration", "Deadline", "Year of study", "For whom", "Notes"];
const HEADERS = ["Status", "Name", "Location", "Coverage", "Duration", "Deadline", "Link", "Year of study", "For whom", "Notes"];

async function seedForm() {
  const url = process.env.GOOGLE_SHEET_URL;
  if (!url) return void console.log("GOOGLE_SHEET_URL not set, no form created");
  const sheetId = parseSheetId(url);
  if (!sheetId) throw new Error("GOOGLE_SHEET_URL is not a Google Sheets URL");
  const sheetName = process.env.GOOGLE_SHEET_NAME?.trim() || "Sheet1";
  const existing = await pool.query("select id from application_forms where google_sheet_id = $1 and sheet_name = $2", [sheetId, sheetName]);
  if (existing.rowCount) return void console.log(`Form for "${sheetName}" already exists, left unchanged`);
  const columns = HEADERS.map((header) => ({ header, public: PUBLIC.includes(header) }));
  await pool.query(
    `insert into application_forms
       (title, google_sheet_id, sheet_name, key_column, link_column, status_column, deadline_column, schema_definition, created_by)
     values ($1, $2, $3, 'Name', 'Link', 'Status', 'Deadline', $4, (select id from users where lower(email) = $5))`,
    [sheetName, sheetId, sheetName, JSON.stringify({ columns }), email],
  );
  console.log(`Created form "${sheetName}". Run a sync to load it (POST /api/v1/admin/forms/<id>/sync or the cron).`);
}

main().finally(() => pool.end());
