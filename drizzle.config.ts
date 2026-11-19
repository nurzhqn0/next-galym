import { defineConfig } from "drizzle-kit";

// No .env.local fallback: load the target env explicitly (e.g. `node --env-file=.env.local`)
// so a failed env load can never silently migrate production.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  // Migrations need a direct (non-pooled) connection.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL! },
});
