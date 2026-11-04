import { requireUser } from "@/lib/auth/guard";
import { route, uuid } from "@/lib/http";
import { applyTo } from "@/lib/services/applications";

export const POST = route(async (_req, ctx: RouteContext<"/api/v1/applications/[id]/submissions">) => {
  const user = await requireUser();
  return applyTo(user.id, uuid((await ctx.params).id));
}, 201);
