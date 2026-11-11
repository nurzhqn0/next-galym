import { requireUser } from "@/lib/auth/guard";
import { route, uuid } from "@/lib/http";
import { applyTo, withdrawFrom } from "@/lib/services/applications";

type Ctx = RouteContext<"/api/v1/applications/[id]/submissions">;

export const POST = route(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  return applyTo(user.id, uuid((await ctx.params).id));
}, 201);

export const DELETE = route(async (_req, ctx: Ctx) => {
  const user = await requireUser();
  await withdrawFrom(user.id, uuid((await ctx.params).id));
  return new Response(null, { status: 204 });
});
