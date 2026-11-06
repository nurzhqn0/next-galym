import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { authAttempts, sessions, users } from "@/lib/db/schema";
import { HttpError, isUniqueViolation } from "@/lib/http";

export type Role = "superuser" | "admin" | "user";
export type SessionUser = { id: string; email: string; fullName: string; role: Role };

const SESSION_DAYS = 30;
const ARGON2ID = 2;
// Verified against when the email is unknown, so timing does not reveal which emails exist.
const dummyHash = hash("not-a-real-password", { algorithm: ARGON2ID });

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export const hashPassword = (password: string) => hash(password, { algorithm: ARGON2ID });

export const registerInput = z.object({
  email: z.email().max(320).transform((v) => v.trim().toLowerCase()),
  password: z.string().min(10).max(200),
  fullName: z.string().trim().min(1).max(200),
});
export const loginInput = z.object({
  email: z.email().max(320).transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

/** Fixed-window counter in Postgres. Throws 429 once `max` hits are reached in the window. */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const res = await db.execute<{ count: number }>(sql`
    insert into auth_attempts (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      window_start = case when auth_attempts.window_start < now() - make_interval(secs => ${windowSeconds})
                          then now() else auth_attempts.window_start end,
      count = case when auth_attempts.window_start < now() - make_interval(secs => ${windowSeconds})
                   then 1 else auth_attempts.count + 1 end
    returning count`);
  if (res.rows[0].count > max) throw new HttpError(429, "Too many attempts, try again later");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ userId, token: sha256(token), expiresAt });
  return { token, expiresAt };
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, sha256(token)), gt(sessions.expiresAt, sql`now()`), eq(users.isActive, true)));
  return row ?? null;
}

/** Housekeeping for the daily cron: expired sessions and rate-limit windows nobody will come back to. */
export async function purgeExpired() {
  const s = await db.delete(sessions).where(lt(sessions.expiresAt, sql`now()`)).returning({ id: sessions.id });
  const a = await db
    .delete(authAttempts)
    .where(lt(authAttempts.windowStart, sql`now() - interval '1 day'`))
    .returning({ key: authAttempts.key });
  return { sessions: s.length, authAttempts: a.length };
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, sha256(token)));
}

export async function register(input: z.infer<typeof registerInput>, ip: string) {
  await rateLimit(`register:ip:${ip}`, 5, 3600);
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db
      .insert(users)
      .values({ email: input.email, passwordHash, fullName: input.fullName })
      .returning({ id: users.id, email: users.email, fullName: users.fullName, role: users.role });
    return { user, ...(await createSession(user.id)) };
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "An account with this email already exists");
    throw e;
  }
}

export const passwordChangeInput = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
});

/** Changes the caller's own password and signs out every other session. */
export async function changePassword(userId: string, input: z.infer<typeof passwordChangeInput>, currentToken: string) {
  await rateLimit(`password:user:${userId}`, 10, 900);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await verify(user.passwordHash, input.currentPassword))) {
    throw new HttpError(403, "Current password is incorrect");
  }
  await db.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, userId));
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.token, sha256(currentToken))));
}

export async function login(input: z.infer<typeof loginInput>, ip: string) {
  await rateLimit(`login:ip:${ip}`, 30, 900);
  await rateLimit(`login:email:${input.email}`, 10, 900);
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${input.email}`);
  const ok = await verify(user?.passwordHash ?? (await dummyHash), input.password);
  if (!user || !ok || !user.isActive) throw new HttpError(401, "Invalid email or password");
  await db.delete(sessions).where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));
  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    ...(await createSession(user.id)),
  };
}
