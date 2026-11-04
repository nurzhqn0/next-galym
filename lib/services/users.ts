import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { HttpError } from "@/lib/http";
import type { SessionUser } from "./auth";

export const userUpdate = z.object({
  role: z.enum(["admin", "user"]).optional(),
  isActive: z.boolean().optional(),
});

const publicColumns = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

export const listUsers = (limit: number, offset: number) =>
  db.select(publicColumns).from(users).orderBy(asc(users.createdAt)).limit(limit).offset(offset);

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
  const [row] = await db.update(users).set(change).where(eq(users.id, id)).returning(publicColumns);
  if (change.isActive === false) await db.delete(sessions).where(eq(sessions.userId, id));
  return row;
}
