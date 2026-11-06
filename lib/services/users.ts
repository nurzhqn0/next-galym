import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { HttpError, isUniqueViolation, likePattern } from "@/lib/http";
import { hashPassword, type SessionUser } from "./auth";

const email = z.email().max(320).transform((v) => v.trim().toLowerCase());
const password = z.string().min(10).max(200);
const fullName = z.string().trim().min(1).max(200);

export const userCreate = z.object({
  email,
  password,
  fullName,
  role: z.enum(["admin", "user"]).default("user"),
});
export const userUpdate = z.object({
  role: z.enum(["admin", "user"]).optional(),
  isActive: z.boolean().optional(),
  fullName: fullName.optional(),
  email: email.optional(),
  password: password.optional(),
});
export const userFilter = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["superuser", "admin", "user"]).optional(),
});

const publicColumns = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

export async function listUsers(limit: number, offset: number, filter: z.infer<typeof userFilter> = {}) {
  const where = and(
    filter.role ? eq(users.role, filter.role) : undefined,
    filter.q ? or(ilike(users.email, likePattern(filter.q)), ilike(users.fullName, likePattern(filter.q))) : undefined,
  );
  const [items, [{ n: total }]] = await Promise.all([
    db.select(publicColumns).from(users).where(where).orderBy(asc(users.createdAt)).limit(limit).offset(offset),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return { items, total };
}

export async function getUser(id: string) {
  const [row] = await db.select(publicColumns).from(users).where(eq(users.id, id));
  if (!row) throw new HttpError(404, "User not found");
  return row;
}

/** Throws unless `actor` may create an account with `role`. The superuser is only ever seeded. */
export function assertCanCreate(actor: SessionUser, role: "admin" | "user") {
  if (role === "admin" && actor.role !== "superuser") throw new HttpError(403, "Only the superuser can create admins");
}

export async function createUser(actor: SessionUser, input: z.infer<typeof userCreate>) {
  assertCanCreate(actor, input.role);
  try {
    const [row] = await db
      .insert(users)
      .values({ email: input.email, fullName: input.fullName, role: input.role, passwordHash: await hashPassword(input.password) })
      .returning(publicColumns);
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "An account with this email already exists");
    throw e;
  }
}

/** Throws unless `actor` may apply `change` to `target`. Pure, so it is easy to test. */
export function assertCanModify(actor: SessionUser, target: { id: string; role: string }, change: z.infer<typeof userUpdate>) {
  if (target.id === actor.id) throw new HttpError(403, "You cannot modify your own account");
  if (target.role === "superuser") throw new HttpError(403, "The superuser cannot be modified");
  if (change.role !== undefined && actor.role !== "superuser") {
    throw new HttpError(403, "Only the superuser can change roles");
  }
  if (actor.role === "admin" && target.role !== "user") {
    throw new HttpError(403, "Admins can only manage regular users");
  }
}

export async function updateUser(actor: SessionUser, id: string, change: z.infer<typeof userUpdate>) {
  const [target] = await db.select(publicColumns).from(users).where(eq(users.id, id));
  if (!target) throw new HttpError(404, "User not found");
  assertCanModify(actor, target, change);
  const { password: newPassword, ...fields } = change;
  try {
    const [row] = await db
      .update(users)
      .set({ ...fields, ...(newPassword && { passwordHash: await hashPassword(newPassword) }) })
      .where(eq(users.id, id))
      .returning(publicColumns);
    // Deactivating or resetting a password must end the sessions already open.
    if (change.isActive === false || newPassword) await db.delete(sessions).where(eq(sessions.userId, id));
    return row;
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "An account with this email already exists");
    throw e;
  }
}

/** Throws unless `actor` may delete `target`. Pure, so it is easy to test. */
export function assertCanDelete(actor: SessionUser, target: { id: string; role: string }) {
  if (actor.role !== "superuser") throw new HttpError(403, "Only the superuser can delete accounts");
  if (target.id === actor.id) throw new HttpError(403, "You cannot delete your own account");
  if (target.role === "superuser") throw new HttpError(403, "The superuser cannot be deleted");
}

/** Hard delete: the user's sessions and submissions cascade; news and archives stay with the author cleared. */
export async function deleteUser(actor: SessionUser, id: string) {
  const [target] = await db.select(publicColumns).from(users).where(eq(users.id, id));
  if (!target) throw new HttpError(404, "User not found");
  assertCanDelete(actor, target);
  await db.delete(users).where(eq(users.id, id));
}
