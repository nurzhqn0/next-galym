import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// Demo accounts come from scripts/seed-demo.ts.
const DEMO_PASSWORD = "demo-password-123";
const octet = () => Math.floor(Math.random() * 250);
// Login and register are rate limited per IP; give each context its own.
const ip = () => `10.${octet()}.${octet()}.3`;

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": ip() });
});

/** Logs in a demo admin or superuser; both land on the admin page. */
async function login(page: Page, email: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/news$/);
}

async function register(page: Page) {
  const email = `e2e-${randomUUID()}@example.test`;
  const name = `E2E ${randomUUID().slice(0, 8)}`;
  await page.goto("/en/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/applications/);
  return { email, name };
}

const adminLink = (page: Page) => page.getByRole("link", { name: "Admin", exact: true });

test("an admin publishes a news post, it reaches the site, then deletes it", async ({ page }) => {
  await login(page, "demo-admin@example.test");
  await adminLink(page).click();
  await expect(page).toHaveURL(/\/en\/admin\/news$/);

  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  const title = `[DEMO] E2E post ${slug}`;
  await page.getByRole("link", { name: "New post", exact: true }).click();
  await page.getByLabel("Address").fill(slug);
  await page.getByLabel("Status").selectOption("published");
  const english = page.getByRole("group", { name: /English/ });
  await english.getByLabel("Title").fill(title);
  await english.getByLabel("Text").fill("First paragraph.\n\nSecond paragraph.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/news$/);
  await expect(page.getByRole("link").filter({ hasText: title })).toBeVisible();

  // The public list revalidates stale-while-revalidate: the first visit after a save may still be the old one.
  await expect(async () => {
    await page.goto("/en/news");
    await expect(page.getByText(title)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  await page.goto("/en/admin/news");
  await page.getByRole("link").filter({ hasText: title }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page).toHaveURL(/\/en\/admin\/news$/);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("an admin has no Admins tab and cannot open it", async ({ page }) => {
  await login(page, "demo-admin@example.test");
  await page.goto("/en/admin/news");
  const tabs = page.getByRole("navigation", { name: "Admin", exact: true });
  await expect(tabs.getByRole("link", { name: "Archives" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Admins" })).toHaveCount(0);
  await page.goto("/en/admin/admins");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("signed out goes to log in; a student gets a 404 and no Admin link", async ({ page }) => {
  await page.goto("/en/admin/news");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fadmin%2Fnews/);
  await register(page);
  await expect(adminLink(page)).toHaveCount(0);
  await page.goto("/en/admin");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("the superuser makes a user an admin and takes it back", async ({ page, browser, baseURL }) => {
  const student = await register(page);
  const root = await browser.newContext({ baseURL, extraHTTPHeaders: { "x-forwarded-for": ip() } });
  const rootPage = await root.newPage();
  await login(rootPage, "demo-root@example.test");

  await rootPage.goto(`/en/admin/admins?q=${encodeURIComponent(student.email)}`);
  await rootPage.getByRole("button", { name: `Make admin: ${student.name}` }).click();
  const current = rootPage.getByRole("region", { name: "Current admins" });
  await expect(current.getByText(student.email)).toBeVisible();
  await page.reload();
  await expect(adminLink(page)).toBeVisible();

  await current.getByRole("button", { name: `Remove admin: ${student.name}` }).click();
  await expect(current.getByText(student.email)).toHaveCount(0);
  await page.reload();
  await expect(adminLink(page)).toHaveCount(0);
  await root.close();
});
