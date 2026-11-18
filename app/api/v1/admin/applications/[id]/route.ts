import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { body, route, uuid } from "@/lib/http";
import {
  applicationUpdate,
  deleteApplication,
  getAdminApplication,
  updateApplication,
} from "@/lib/services/applications";

type Ctx = RouteContext<"/api/v1/admin/applications/[id]">;

export const GET = route(async (_req, ctx: Ctx) => {
  await requireAdmin();
  return getAdminApplication(uuid((await ctx.params).id));
});

export const PATCH = route(async (req, ctx: Ctx) => {
  await requireAdmin();
  const updated = await updateApplication(uuid((await ctx.params).id), await body(req, applicationUpdate));
  revalidateTag("applications", { expire: 0 });
  return updated;
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await requireAdmin();
  await deleteApplication(uuid((await ctx.params).id));
  revalidateTag("applications", { expire: 0 });
  return { ok: true };
});
