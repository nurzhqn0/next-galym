// Dev only: gives every news post and archive without a photo a random placeholder from picsum.photos.
// Seeded by row id, so each row keeps the same photo. Rows that already have a photo are left alone.
// Pages show these only under `next dev` (isShownImageUrl in lib/images.ts).
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL });
const photo = `'https://picsum.photos/seed/' || id || '/1200/675'`;

async function main() {
  const news = await pool.query(`update news set cover_image_url = ${photo} where cover_image_url is null`);
  const archives = await pool.query(`update archives set image_url = ${photo} where image_url is null`);
  console.log(`news: ${news.rowCount} rows got a photo, archives: ${archives.rowCount} rows got a photo`);
}

main().finally(() => pool.end());
