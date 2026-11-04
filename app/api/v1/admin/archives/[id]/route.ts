import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, route, uuid } from "@/lib/http";
import { archiveUpdate, deleteArchive, updateArchive } from "@/lib/services/archives";

type Ctx = RouteContext<"/api/v1/admin/archives/[id]">;

export const PATCH = route(async (req, ctx: Ctx) => {
  await requireAdmin();
  const updated = await updateArchive(uuid((await ctx.params).id), await body(req, archiveUpdate));
  revalidateTag("archives", "max");
  return updated;
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await requireAdmin();
  await deleteArchive(uuid((await ctx.params).id));
  revalidateTag("archives", "max");
  return { ok: true };
});
