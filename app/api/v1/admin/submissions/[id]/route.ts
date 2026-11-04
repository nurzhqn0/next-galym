import { requireAdmin } from "@/lib/auth/guard";
import { body, route, uuid } from "@/lib/http";
import { setSubmissionStatus, submissionUpdate } from "@/lib/services/applications";

export const PATCH = route(async (req, ctx: RouteContext<"/api/v1/admin/submissions/[id]">) => {
  await requireAdmin();
  return setSubmissionStatus(uuid((await ctx.params).id), (await body(req, submissionUpdate)).status);
});
