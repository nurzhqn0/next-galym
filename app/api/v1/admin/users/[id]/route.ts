import { requireAdmin } from "@/lib/auth/guard";
import { body, route, uuid } from "@/lib/http";
import { deleteUser, getUser, updateUser, userUpdate } from "@/lib/services/users";

type Ctx = RouteContext<"/api/v1/admin/users/[id]">;

export const GET = route(async (_req, ctx: Ctx) => {
  await requireAdmin();
  return getUser(uuid((await ctx.params).id));
});

export const PATCH = route(async (req, ctx: Ctx) => {
  const admin = await requireAdmin();
  return updateUser(admin, uuid((await ctx.params).id), await body(req, userUpdate));
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  const admin = await requireAdmin();
  await deleteUser(admin, uuid((await ctx.params).id));
  return { ok: true };
});
