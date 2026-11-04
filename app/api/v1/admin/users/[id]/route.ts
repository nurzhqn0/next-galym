import { requireAdmin } from "@/lib/auth/guard";
import { body, route, uuid } from "@/lib/http";
import { updateUser, userUpdate } from "@/lib/services/users";

export const PATCH = route(async (req, ctx: RouteContext<"/api/v1/admin/users/[id]">) => {
  const admin = await requireAdmin();
  return updateUser(admin, uuid((await ctx.params).id), await body(req, userUpdate));
});
