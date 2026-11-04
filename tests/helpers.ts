import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationForms, authAttempts, news, users } from "@/lib/db/schema";
import { register } from "@/lib/services/auth";
import { createForm } from "@/lib/services/applications";

export const PREFIX = "t3st";
export const PASSWORD = "correct-horse-battery";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a test branch URL");

let ipCounter = 0;
export const freshIp = () => `${PREFIX}-ip-${randomUUID()}-${ipCounter++}`;

export async function makeUser(role: "user" | "admin" = "user") {
  const email = `${PREFIX}-${randomUUID()}@example.test`;
  const { user, token } = await register({ email, password: PASSWORD, fullName: "Test User" }, freshIp());
  if (role !== "user") await db.update(users).set({ role }).where(eq(users.id, user.id));
  return { ...user, role, email, token };
}

export const csv = (header: string[], rows: string[][]) =>
  [header, ...rows].map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");

export async function makeForm(admin: { id: string }, keyColumn = "id") {
  return createForm(
    { title: `${PREFIX} form`, googleSheetId: "x".repeat(30), sheetName: "Sheet1", keyColumn },
    admin.id,
  );
}

export async function cleanup() {
  // Users first: their submissions cascade, which unblocks deleting forms.
  await db.delete(users).where(like(users.email, `${PREFIX}-%`));
  await db.delete(applicationForms).where(like(applicationForms.title, `${PREFIX}%`));
  await db.delete(news).where(like(news.slug, `${PREFIX}-%`));
  await db.delete(authAttempts).where(like(authAttempts.key, `%${PREFIX}%`));
}
