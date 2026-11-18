import { requireAdmin } from "@/lib/auth/guard";
import { route } from "@/lib/http";
import { exportApplications } from "@/lib/services/applications";

export const GET = route(async () => {
  await requireAdmin();
  return new Response(await exportApplications(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="applications.csv"',
    },
  });
});
