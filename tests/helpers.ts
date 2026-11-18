import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { applications, archives, authAttempts, news, users } from "@/lib/db/schema";
import { register } from "@/lib/services/auth";
import { createApplication } from "@/lib/services/applications";

export const PREFIX = "t3st";
export const PASSWORD = "correct-horse-battery";

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to a test branch URL");

let ipCounter = 0;
export const freshIp = () => `${PREFIX}-ip-${randomUUID()}-${ipCounter++}`;

export async function makeUser(role: "user" | "admin" | "superuser" = "user") {
  const email = `${PREFIX}-${randomUUID()}@example.test`;
  const { user, token } = await register({ email, password: PASSWORD, fullName: "Test User" }, freshIp());
  if (role !== "user") await db.update(users).set({ role }).where(eq(users.id, user.id));
  return { ...user, role, email, token };
}

export async function makeApplication(admin: { id: string }, extra: Partial<Parameters<typeof createApplication>[0]> = {}) {
  return createApplication({ title: `${PREFIX} application`, ...extra }, admin.id);
}

export async function cleanup() {
  // Users first: their submissions cascade, which unblocks deleting forms.
  await db.delete(users).where(like(users.email, `${PREFIX}-%`));
  await db.delete(applications).where(like(applications.title, `${PREFIX}%`));
  await db.delete(news).where(like(news.slug, `${PREFIX}-%`));
  await db.delete(archives).where(like(archives.fileUrl, `%${PREFIX}%`));
  await db.delete(authAttempts).where(like(authAttempts.key, `%${PREFIX}%`));
}
