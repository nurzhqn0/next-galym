import { Pool } from "pg";
import { parseCountries } from "../lib/countries";

const apply = process.argv.includes("--apply");
// No .env.local fallback: this writes in bulk, so the target database must be loaded explicitly.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED or DATABASE_URL in the environment");
const pool = new Pool({ connectionString: url });

type Row = { id: string; title: string; fields: { label: string; value: string }[]; countries: string[] };

async function main() {
  const { rows } = await pool.query<Row>("select id, title, fields, countries from applications order by created_at, title");
  const table = [];
  for (const row of rows) {
    const location = row.fields.find((f) => f.label.trim().toLowerCase() === "location")?.value ?? "";
    const { codes, unknown } = parseCountries(location);
    table.push({ title: row.title, location, codes: codes.join(", "), unknown: unknown.join(", ") });
    if (apply && !row.countries.length && codes.length) {
      await pool.query("update applications set countries = $1 where id = $2 and cardinality(countries) = 0", [codes, row.id]);
    }
  }
  console.table(table);
  console.log(apply ? "Applied." : "Dry run. Pass --apply to write.");
}

main().finally(() => pool.end());
