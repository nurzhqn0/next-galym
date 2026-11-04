import { requireAdmin } from "@/lib/auth/guard";
import { body, route, uuid } from "@/lib/http";
import { deleteNews, newsUpdate, updateNews } from "@/lib/services/news";

type Ctx = RouteContext<"/api/v1/admin/news/[id]">;

export const PATCH = route(async (req, ctx: Ctx) => {
  await requireAdmin();
  return updateNews(uuid((await ctx.params).id), await body(req, newsUpdate));
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await requireAdmin();
  await deleteNews(uuid((await ctx.params).id));
  return { ok: true };
});
