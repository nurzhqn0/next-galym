import { requireAdmin } from "@/lib/auth/guard";
import { body, pagination, query, route } from "@/lib/http";
import { createUser, listUsers, userCreate, userFilter } from "@/lib/services/users";

export const GET = route(async (req) => {
  await requireAdmin();
  const { limit, offset, ...filter } = query(req, pagination.extend(userFilter.shape));
  return listUsers(limit, offset, filter);
});

export const POST = route(async (req) => {
  const admin = await requireAdmin();
  return createUser(admin, await body(req, userCreate));
}, 201);
