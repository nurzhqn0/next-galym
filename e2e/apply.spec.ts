import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("a student signs up, applies, and sees the answer on their account", async ({ page, context }) => {
  // The register endpoint is rate limited per IP; give each run its own.
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.1` });

  await page.goto("/en/register");
  await page.getByLabel("Full name").fill("E2E Student");
  await page.getByLabel("Email").fill(`e2e-${randomUUID()}@example.test`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/applications/);

  const row = page.getByRole("listitem").filter({ hasText: "[DEMO] Young scientists research grant" });
  await row.getByRole("button", { name: /^Apply/ }).click();
  await expect(row.getByRole("button", { name: /^Applied/ })).toBeVisible();

  await page.goto("/en/account");
  const answer = page.getByRole("listitem").filter({ hasText: "[DEMO] Young scientists research grant" });
  await expect(answer).toBeVisible();
  await expect(answer.getByText("Pending")).toBeVisible();
});

test("signed out, Apply sends the visitor to log in", async ({ page }) => {
  await page.goto("/en/applications");
  await page.getByRole("button", { name: /^Apply/ }).first().click();
  await expect(page).toHaveURL(/\/en\/login\?next=/);
});

test("kk and ru pages render their own language and the demo news fallback", async ({ page }) => {
  await page.goto("/kk");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ғалымдарға");
  await page.goto("/ru/news");
  await expect(page.getByText("Итоги семинара")).toBeVisible();
  await expect(page.getByText("[DEMO] A post that exists only in English")).toBeVisible();
  await expect(page.getByText("[DEMO] Draft, must stay hidden")).toHaveCount(0);
});
