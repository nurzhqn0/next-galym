import { parse } from "dotenv";
import { readFileSync } from "node:fs";
import { defineConfig } from "@playwright/test";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to a non-main Neon branch that has demo data (npm run db:seed-demo).");
const hostOf = (u: string) => new URL(u).hostname.replace("-pooler", "");
const main = parse(readFileSync(".env.local"));
if (main.DATABASE_URL && hostOf(main.DATABASE_URL) === hostOf(url)) {
  throw new Error("Refusing to run e2e against the main branch.");
}

const PORT = 3120;
export default defineConfig({
  testDir: "e2e",
  globalTeardown: "./e2e/teardown.ts",
  // Generous: this machine runs Node under Rosetta, so first loads and hydration are slow.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}/en`, reuseExistingServer: false, timeout: 60_000 },
});
