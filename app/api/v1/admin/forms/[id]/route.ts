import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, route, uuid } from "@/lib/http";
import { deleteForm, formUpdate, updateForm } from "@/lib/services/applications";

type Ctx = RouteContext<"/api/v1/admin/forms/[id]">;

export const PATCH = route(async (req, ctx: Ctx) => {
  await requireAdmin();
  const updated = await updateForm(uuid((await ctx.params).id), await body(req, formUpdate));
  revalidateTag("applications", "max");
  return updated;
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await requireAdmin();
  await deleteForm(uuid((await ctx.params).id));
  revalidateTag("applications", "max");
  return { ok: true };
});
