import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { HttpError } from "@/lib/http";
import { getSessionUser, type Role } from "@/lib/services/auth";
import { readSessionToken } from "./cookie";

/** Once per request: the header and the page share one session lookup. Never cached across requests. */
export const currentUser = cache(async () => {
  const token = await readSessionToken();
  return token ? getSessionUser(token) : null;
});

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

/** For admin pages: signed out goes to login and back; a signed-in account without the role gets a 404. */
export async function adminPage(lang: string, path: string, superuserOnly = false) {
  const user = await currentUser();
  if (!user) redirect(`/${lang}/login?next=${encodeURIComponent(path)}`);
  if (superuserOnly ? user.role !== "superuser" : user.role === "user") notFound();
  return user;
}
