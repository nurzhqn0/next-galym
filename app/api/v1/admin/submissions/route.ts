import { requireAdmin } from "@/lib/auth/guard";
import { pagination, query, route } from "@/lib/http";
import { listAllSubmissions, submissionFilter } from "@/lib/services/applications";

export const GET = route(async (req) => {
  await requireAdmin();
  const { limit, offset, ...filter } = query(req, pagination.extend(submissionFilter.shape));
  return listAllSubmissions(limit, offset, filter);
});
