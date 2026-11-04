import "server-only";
import { HttpError } from "@/lib/http";
import { getSessionUser, type Role } from "@/lib/services/auth";
import { readSessionToken } from "./cookie";

export async function currentUser() {
  const token = await readSessionToken();
  return token ? getSessionUser(token) : null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new HttpError(403, "Forbidden");
  return user;
}

export const requireAdmin = () => requireRole("admin", "superuser");
