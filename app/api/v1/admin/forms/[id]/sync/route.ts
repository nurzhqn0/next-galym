import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { route, uuid } from "@/lib/http";
import { syncForm } from "@/lib/services/sheets";

export const POST = route(async (_req, ctx: RouteContext<"/api/v1/admin/forms/[id]/sync">) => {
  await requireAdmin();
  const result = await syncForm(uuid((await ctx.params).id));
  revalidateTag("applications", "max");
  return result;
});
